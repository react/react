/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {
  BasicBlock,
  BlockId,
  GeneratedSource,
  GotoVariant,
  HIR,
  InstructionId,
  Place,
  ReactiveBlock,
  SourceLocation,
} from '../HIR';
import {
  HIRFunction,
  ReactiveBreakTerminal,
  ReactiveContinueTerminal,
  ReactiveFunction,
  ReactiveInstruction,
  ReactiveLogicalValue,
  ReactiveSequenceValue,
  ReactiveTerminalStatement,
  ReactiveTerminalTargetKind,
  ReactiveTernaryValue,
  ReactiveValue,
  Terminal,
} from '../HIR/HIR';
import {assertExhaustive} from '../Utils/utils';

/*
 * Converts from HIR (lower-level CFG) to ReactiveFunction, a tree representation
 * that is closer to an AST. This pass restores the original control flow constructs,
 * including break/continue to labeled statements. Note that this pass naively emits
 * labels for *all* terminals: see PruneUnusedLabels which removes unnecessary labels.
 */
export function buildReactiveFunction(fn: HIRFunction): ReactiveFunction {
  const cx = new Context(fn.body);
  const driver = new Driver(cx);
  const body = driver.traverseBlock(cx.block(fn.body.entry));
  return {
    loc: fn.loc,
    id: fn.id,
    nameHint: fn.nameHint,
    params: fn.params,
    generator: fn.generator,
    async: fn.async,
    body,
    env: fn.env,
    directives: fn.directives,
  };
}

class Driver {
  cx: Context;

  constructor(cx: Context) {
    this.cx = cx;
  }

  /*
   * Wraps a continuation result with preceding instructions. If there are no
   * instructions, returns the continuation as-is. Otherwise, wraps the continuation's
   * value in a SequenceExpression with the instructions prepended.
   */
  wrapWithSequence(
    instructions: Array<ReactiveInstruction>,
    continuation: {
      block: BlockId;
      value: ReactiveValue;
      place: Place;
      id: InstructionId;
    },
    loc: SourceLocation,
  ): {block: BlockId; value: ReactiveValue; place: Place; id: InstructionId} {
    if (instructions.length === 0) {
      return continuation;
    }
    const sequence: ReactiveSequenceValue = {
      kind: 'SequenceExpression',
      instructions,
      id: continuation.id,
      value: continuation.value,
      loc,
    };
    return {
      block: continuation.block,
      value: sequence,
      place: continuation.place,
      id: continuation.id,
    };
  }

  /*
   * Extracts the result value from instructions at the end of a value block.
   * Value blocks generally end in a StoreLocal to assign the value of the
   * expression. These StoreLocal instructions can be pruned since we represent
   * value blocks as compound values in ReactiveFunction (no phis). However,
   * it's also possible to have a value block that ends in an AssignmentExpression,
   * which we need to keep. So we only prune StoreLocal for temporaries.
   */
  extractValueBlockResult(
    instructions: BasicBlock['instructions'],
    blockId: BlockId,
    loc: SourceLocation,
  ): {block: BlockId; place: Place; value: ReactiveValue; id: InstructionId} {
    CompilerError.invariant(instructions.length !== 0, {
      reason: `Expected non-empty instructions in extractValueBlockResult`,
      description: null,
      loc,
    });
    const instr = instructions.at(-1)!;
    let place: Place = instr.lvalue;
    let value: ReactiveValue = instr.value;
    if (
      value.kind === 'StoreLocal' &&
      value.lvalue.place.identifier.name === null
    ) {
      place = value.lvalue.place;
      value = {
        kind: 'LoadLocal',
        place: value.value,
        loc: value.value.loc,
      };
    }
    if (instructions.length === 1) {
      return {block: blockId, place, value, id: instr.id};
    }
    const sequence: ReactiveSequenceValue = {
      kind: 'SequenceExpression',
      instructions: instructions.slice(0, -1),
      id: instr.id,
      value,
      loc,
    };
    return {block: blockId, place, value: sequence, id: instr.id};
  }

  /*
   * Converts the result of visitValueBlock into a SequenceExpression that includes
   * the instruction with its lvalue. This is needed for for/for-of/for-in init/test
   * blocks where the instruction's lvalue assignment must be preserved.
   *
   * This also flattens nested SequenceExpressions that can occur from MaybeThrow
   * handling in try-catch blocks.
   */
  valueBlockResultToSequence(
    result: {
      block: BlockId;
      value: ReactiveValue;
      place: Place;
      id: InstructionId;
    },
    loc: SourceLocation,
  ): ReactiveSequenceValue {
    // Collect all instructions from potentially nested SequenceExpressions
    const instructions: Array<ReactiveInstruction> = [];
    let innerValue: ReactiveValue = result.value;

    // Flatten nested SequenceExpressions
    while (innerValue.kind === 'SequenceExpression') {
      instructions.push(...innerValue.instructions);
      innerValue = innerValue.value;
    }

    /*
     * Only add the final instruction if the innermost value is not just a LoadLocal
     * of the same place we're storing to (which would be a no-op).
     * This happens when MaybeThrow blocks cause the sequence to already contain
     * all the necessary instructions.
     */
    const isLoadOfSamePlace =
      innerValue.kind === 'LoadLocal' &&
      innerValue.place.identifier.id === result.place.identifier.id;

    if (!isLoadOfSamePlace) {
      instructions.push({
        id: result.id,
        lvalue: result.place,
        value: innerValue,
        loc,
      });
    }

    return {
      kind: 'SequenceExpression',
      instructions,
      id: result.id,
      value: {kind: 'Primitive', value: undefined, loc},
      loc,
    };
  }

  traverseBlock(block: BasicBlock): ReactiveBlock {
    const blockValue: ReactiveBlock = [];
    this.visitBlock(block, blockValue);
    return blockValue;
  }

  visitBlock(block: BasicBlock, blockValue: ReactiveBlock): void {
    CompilerError.invariant(!this.cx.emitted.has(block.id), {
      reason: `Cannot emit the same block twice: bb${block.id}`,
      loc: GeneratedSource,
    });
    this.cx.emitted.add(block.id);
    for (const instruction of block.instructions) {
      blockValue.push({
        kind: 'instruction',
        instruction,
      });
    }

    const terminal = block.terminal;
    const scheduleIds = [];
    switch (terminal.kind) {
      case 'return': {
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'return',
            loc: terminal.loc,
            value: terminal.value,
            id: terminal.id,
          },
          label: null,
        });
        break;
      }
      case 'throw': {
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'throw',
            loc: terminal.loc,
            value: terminal.value,
            id: terminal.id,
          },
          label: null,
        });
        break;
      }
      case 'if': {
        const fallthroughId =
          this.cx.reachable(terminal.fallthrough) &&
          !this.cx.isScheduled(terminal.fallthrough)
            ? terminal.fallthrough
            : null;
        const alternateId =
          terminal.alternate !== terminal.fallthrough
            ? terminal.alternate
            : null;

        if (fallthroughId !== null) {
          const scheduleId = this.cx.schedule(fallthroughId, 'if');
          scheduleIds.push(scheduleId);
        }

        let consequent: ReactiveBlock | null = null;
        if (this.cx.isScheduled(terminal.consequent)) {
          CompilerError.invariant(false, {
            reason: `Unexpected 'if' where the consequent is already scheduled`,
            loc: terminal.loc,
          });
        } else {
          consequent = this.traverseBlock(
            this.cx.ir.blocks.get(terminal.consequent)!,
          );
        }

        let alternate: ReactiveBlock | null = null;
        if (alternateId !== null) {
          if (this.cx.isScheduled(alternateId)) {
            CompilerError.invariant(false, {
              reason: `Unexpected 'if' where the alternate is already scheduled`,
              loc: terminal.loc,
            });
          } else {
            alternate = this.traverseBlock(this.cx.ir.blocks.get(alternateId)!);
          }
        }

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'if',
            loc: terminal.loc,
            test: terminal.test,
            consequent: consequent ?? this.emptyBlock(),
            alternate: alternate,
            id: terminal.id,
          },
          label:
            fallthroughId == null
              ? null
              : {
                  id: fallthroughId,
                  implicit: false,
                },
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'switch': {
        const fallthroughId =
          this.cx.reachable(terminal.fallthrough) &&
          !this.cx.isScheduled(terminal.fallthrough)
            ? terminal.fallthrough
            : null;
        if (fallthroughId !== null) {
          const scheduleId = this.cx.schedule(fallthroughId, 'switch');
          scheduleIds.push(scheduleId);
        }

        const cases: Array<{
          test: Place | null;
          block: ReactiveBlock;
        }> = [];
        [...terminal.cases].reverse().forEach((case_, _index) => {
          const test = case_.test;

          let consequent: ReactiveBlock;
          if (this.cx.isScheduled(case_.block)) {
            CompilerError.invariant(case_.block === terminal.fallthrough, {
              reason: `Unexpected 'switch' where a case is already scheduled and block is not the fallthrough`,
              loc: terminal.loc,
            });
            return;
          } else {
            consequent = this.traverseBlock(
              this.cx.ir.blocks.get(case_.block)!,
            );
            const scheduleId = this.cx.schedule(case_.block, 'case');
            scheduleIds.push(scheduleId);
          }
          cases.push({test, block: consequent});
        });
        cases.reverse();

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'switch',
            loc: terminal.loc,
            test: terminal.test,
            cases,
            id: terminal.id,
          },
          label:
            fallthroughId == null
              ? null
              : {
                  id: fallthroughId,
                  implicit: false,
                },
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'do-while': {
        const fallthroughId = !this.cx.isScheduled(terminal.fallthrough)
          ? terminal.fallthrough
          : null;
        const loopId =
          !this.cx.isScheduled(terminal.loop) &&
          terminal.loop !== terminal.fallthrough
            ? terminal.loop
            : null;
        const scheduleId = this.cx.scheduleLoop(
          terminal.fallthrough,
          terminal.test,
          terminal.loop,
        );
        scheduleIds.push(scheduleId);

        let loopBody: ReactiveBlock;
        if (loopId) {
          loopBody = this.traverseBlock(this.cx.ir.blocks.get(loopId)!);
        } else {
          CompilerError.invariant(false, {
            reason: `Unexpected 'do-while' where the loop is already scheduled`,
            loc: terminal.loc,
          });
        }

        const testValue = this.visitValueBlock(
          terminal.test,
          terminal.loc,
        ).value;

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'do-while',
            loc: terminal.loc,
            test: testValue,
            loop: loopBody,
            id: terminal.id,
          },
          label:
            fallthroughId == null
              ? null
              : {
                  id: fallthroughId,
                  implicit: false,
                },
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'while': {
        const fallthroughId =
          this.cx.reachable(terminal.fallthrough) &&
          !this.cx.isScheduled(terminal.fallthrough)
            ? terminal.fallthrough
            : null;
        const loopId =
          !this.cx.isScheduled(terminal.loop) &&
          terminal.loop !== terminal.fallthrough
            ? terminal.loop
            : null;
        const scheduleId = this.cx.scheduleLoop(
          terminal.fallthrough,
          terminal.test,
          terminal.loop,
        );
        scheduleIds.push(scheduleId);

        const testValue = this.visitValueBlock(
          terminal.test,
          terminal.loc,
        ).value;

        let loopBody: ReactiveBlock;
        if (loopId) {
          loopBody = this.traverseBlock(this.cx.ir.blocks.get(loopId)!);
        } else {
          CompilerError.invariant(false, {
            reason: `Unexpected 'while' where the loop is already scheduled`,
            loc: terminal.loc,
          });
        }

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'while',
            loc: terminal.loc,
            test: testValue,
            loop: loopBody,
            id: terminal.id,
          },
          label:
            fallthroughId == null
              ? null
              : {
                  id: fallthroughId,
                  implicit: false,
                },
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'for': {
        const loopId =
          !this.cx.isScheduled(terminal.loop) &&
          terminal.loop !== terminal.fallthrough
            ? terminal.loop
            : null;

        const fallthroughId = !this.cx.isScheduled(terminal.fallthrough)
          ? terminal.fallthrough
          : null;

        const scheduleId = this.cx.scheduleLoop(
          terminal.fallthrough,
          terminal.update ?? terminal.test,
          terminal.loop,
        );
        scheduleIds.push(scheduleId);

        const init = this.visitValueBlock(terminal.init, terminal.loc);
        const initValue = this.valueBlockResultToSequence(init, terminal.loc);

        const testValue = this.visitValueBlock(
          terminal.test,
          terminal.loc,
        ).value;

        const updateValue =
          terminal.update !== null
            ? this.visitValueBlock(terminal.update, terminal.loc).value
            : null;

        let loopBody: ReactiveBlock;
        if (loopId) {
          loopBody = this.traverseBlock(this.cx.ir.blocks.get(loopId)!);
        } else {
          CompilerError.invariant(false, {
            reason: `Unexpected 'for' where the loop is already scheduled`,
            loc: terminal.loc,
          });
        }

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'for',
            loc: terminal.loc,
            init: initValue,
            test: testValue,
            update: updateValue,
            loop: loopBody,
            id: terminal.id,
          },
          label:
            fallthroughId == null ? null : {id: fallthroughId, implicit: false},
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'for-of': {
        const loopId =
          !this.cx.isScheduled(terminal.loop) &&
          terminal.loop !== terminal.fallthrough
            ? terminal.loop
            : null;

        const fallthroughId = !this.cx.isScheduled(terminal.fallthrough)
          ? terminal.fallthrough
          : null;

        const scheduleId = this.cx.scheduleLoop(
          terminal.fallthrough,
          terminal.init,
          terminal.loop,
        );
        scheduleIds.push(scheduleId);

        const init = this.visitValueBlock(terminal.init, terminal.loc);
        const initValue = this.valueBlockResultToSequence(init, terminal.loc);

        const test = this.visitValueBlock(terminal.test, terminal.loc);
        const testValue = this.valueBlockResultToSequence(test, terminal.loc);

        let loopBody: ReactiveBlock;
        if (loopId) {
          loopBody = this.traverseBlock(this.cx.ir.blocks.get(loopId)!);
        } else {
          CompilerError.invariant(false, {
            reason: `Unexpected 'for-of' where the loop is already scheduled`,
            loc: terminal.loc,
          });
        }

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'for-of',
            loc: terminal.loc,
            init: initValue,
            test: testValue,
            loop: loopBody,
            id: terminal.id,
          },
          label:
            fallthroughId == null ? null : {id: fallthroughId, implicit: false},
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'for-in': {
        const loopId =
          !this.cx.isScheduled(terminal.loop) &&
          terminal.loop !== terminal.fallthrough
            ? terminal.loop
            : null;

        const fallthroughId = !this.cx.isScheduled(terminal.fallthrough)
          ? terminal.fallthrough
          : null;

        const scheduleId = this.cx.scheduleLoop(
          terminal.fallthrough,
          terminal.init,
          terminal.loop,
        );
        scheduleIds.push(scheduleId);

        const init = this.visitValueBlock(terminal.init, terminal.loc);
        const initValue = this.valueBlockResultToSequence(init, terminal.loc);

        let loopBody: ReactiveBlock;
        if (loopId) {
          loopBody = this.traverseBlock(this.cx.ir.blocks.get(loopId)!);
        } else {
          CompilerError.invariant(false, {
            reason: `Unexpected 'for-in' where the loop is already scheduled`,
            loc: terminal.loc,
          });
        }

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'for-in',
            loc: terminal.loc,
            init: initValue,
            loop: loopBody,
            id: terminal.id,
          },
          label:
            fallthroughId == null ? null : {id: fallthroughId, implicit: false},
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'branch': {
        let consequent: ReactiveBlock | null = null;
        if (this.cx.isScheduled(terminal.consequent)) {
          const break_ = this.visitBreak(
            terminal.consequent,
            terminal.id,
            terminal.loc,
          );
          if (break_ !== null) {
            consequent = [break_];
          }
        } else {
          consequent = this.traverseBlock(
            this.cx.ir.blocks.get(terminal.consequent)!,
          );
        }

        let alternate: ReactiveBlock | null = null;
        if (this.cx.isScheduled(terminal.alternate)) {
          CompilerError.invariant(false, {
            reason: `Unexpected 'branch' where the alternate is already scheduled`,
            loc: terminal.loc,
          });
        } else {
          alternate = this.traverseBlock(
            this.cx.ir.blocks.get(terminal.alternate)!,
          );
        }

        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'if',
            loc: terminal.loc,
            test: terminal.test,
            consequent: consequent ?? this.emptyBlock(),
            alternate: alternate,
            id: terminal.id,
          },
          label: null,
        });

        break;
      }
      case 'label': {
        const fallthroughId =
          this.cx.reachable(terminal.fallthrough) &&
          !this.cx.isScheduled(terminal.fallthrough)
            ? terminal.fallthrough
            : null;
        if (fallthroughId !== null) {
          const scheduleId = this.cx.schedule(fallthroughId, 'if');
          scheduleIds.push(scheduleId);
        }

        let block: ReactiveBlock;
        if (this.cx.isScheduled(terminal.block)) {
          CompilerError.invariant(false, {
            reason: `Unexpected 'label' where the block is already scheduled`,
            loc: terminal.loc,
          });
        } else {
          block = this.traverseBlock(this.cx.ir.blocks.get(terminal.block)!);
        }

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          terminal: {
            kind: 'label',
            loc: terminal.loc,
            block,
            id: terminal.id,
          },
          label:
            fallthroughId == null ? null : {id: fallthroughId, implicit: false},
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }

        break;
      }
      case 'sequence':
      case 'optional':
      case 'ternary':
      case 'logical': {
        const fallthroughId =
          terminal.fallthrough !== null &&
          !this.cx.isScheduled(terminal.fallthrough)
            ? terminal.fallthrough
            : null;
        if (fallthroughId !== null) {
          const scheduleId = this.cx.schedule(fallthroughId, 'if');
          scheduleIds.push(scheduleId);
        }

        const {place, value} = this.visitValueBlockTerminal(terminal);
        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'instruction',
          instruction: {
            id: terminal.id,
            lvalue: place,
            value,
            loc: terminal.loc,
          },
        });

        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'goto': {
        switch (terminal.variant) {
          case GotoVariant.Break: {
            const break_ = this.visitBreak(
              terminal.block,
              terminal.id,
              terminal.loc,
            );
            if (break_ !== null) {
              blockValue.push(break_);
            }
            break;
          }
          case GotoVariant.Continue: {
            const continue_ = this.visitContinue(
              terminal.block,
              terminal.id,
              terminal.loc,
            );
            if (continue_ !== null) {
              blockValue.push(continue_);
            }
            break;
          }
          case GotoVariant.Try: {
            break;
          }
          default: {
            assertExhaustive(
              terminal.variant,
              `Unexpected goto variant \`${terminal.variant}\``,
            );
          }
        }
        break;
      }
      case 'maybe-throw': {
        /*
         * ReactiveFunction does not explicit model maybe-throw semantics,
         * so these terminals flatten away
         */
        if (!this.cx.isScheduled(terminal.continuation)) {
          this.visitBlock(
            this.cx.ir.blocks.get(terminal.continuation)!,
            blockValue,
          );
        }
        break;
      }
      case 'try': {
        const fallthroughId =
          this.cx.reachable(terminal.fallthrough) &&
          !this.cx.isScheduled(terminal.fallthrough)
            ? terminal.fallthrough
            : null;
        if (fallthroughId !== null) {
          const scheduleId = this.cx.schedule(fallthroughId, 'if');
          scheduleIds.push(scheduleId);
        }
        this.cx.scheduleCatchHandler(terminal.handler);

        const block = this.traverseBlock(
          this.cx.ir.blocks.get(terminal.block)!,
        );
        const handler = this.traverseBlock(
          this.cx.ir.blocks.get(terminal.handler)!,
        );

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: 'terminal',
          label:
            fallthroughId == null ? null : {id: fallthroughId, implicit: false},
          terminal: {
            kind: 'try',
            loc: terminal.loc,
            block,
            handlerBinding: terminal.handlerBinding,
            handler,
            id: terminal.id,
          },
        });

        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }
        break;
      }
      case 'pruned-scope':
      case 'scope': {
        const fallthroughId = !this.cx.isScheduled(terminal.fallthrough)
          ? terminal.fallthrough
          : null;
        if (fallthroughId !== null) {
          const scheduleId = this.cx.schedule(fallthroughId, 'if');
          scheduleIds.push(scheduleId);
          this.cx.scopeFallthroughs.add(fallthroughId);
        }

        let block: ReactiveBlock;
        if (this.cx.isScheduled(terminal.block)) {
          CompilerError.invariant(false, {
            reason: `Unexpected 'scope' where the block is already scheduled`,
            loc: terminal.loc,
          });
        } else {
          block = this.traverseBlock(this.cx.ir.blocks.get(terminal.block)!);
        }

        this.cx.unscheduleAll(scheduleIds);
        blockValue.push({
          kind: terminal.kind,
          instructions: block,
          scope: terminal.scope,
        });
        if (fallthroughId !== null) {
          this.visitBlock(this.cx.ir.blocks.get(fallthroughId)!, blockValue);
        }

        break;
      }
      case 'unreachable': {
        // noop
        break;
      }
      case 'unsupported': {
        CompilerError.invariant(false, {
          reason: 'Unexpected unsupported terminal',
          loc: terminal.loc,
        });
      }
      default: {
        assertExhaustive(terminal, 'Unexpected terminal');
      }
    }
  }

  visitValueBlock(
    blockId: BlockId,
    loc: SourceLocation,
    fallthrough: BlockId | null = null,
  ): {block: BlockId; value: ReactiveValue; place: Place; id: InstructionId} {
    const block = this.cx.ir.blocks.get(blockId)!;
    // If we've reached the fallthrough block, stop recursing
    if (fallthrough !== null && blockId === fallthrough) {
      CompilerError.invariant(false, {
        reason: 'Did not expect to reach the fallthrough of a value block',
        description: `Reached bb${blockId}, which is the fallthrough for this value block`,
        loc,
      });
    }
    if (block.terminal.kind === 'branch') {
      if (block.instructions.length === 0) {
        return {
          block: block.id,
          place: block.terminal.test,
          value: {
            kind: 'LoadLocal',
            place: block.terminal.test,
            loc: block.terminal.test.loc,
          },
          id: block.terminal.id,
        };
      }
      return this.extractValueBlockResult(block.instructions, block.id, loc);
    } else if (block.terminal.kind === 'goto') {
      if (block.instructions.length === 0) {
        CompilerError.invariant(false, {
          reason: 'Unexpected empty block with `goto` terminal',
          description: `Block bb${block.id} is empty`,
          loc,
        });
      }
      return this.extractValueBlockResult(block.instructions, block.id, loc);
    } else if (block.terminal.kind === 'maybe-throw') {
      /*
       * ReactiveFunction does not explicitly model maybe-throw semantics,
       * so maybe-throw terminals in value blocks flatten away. In general
       * we recurse to the continuation block.
       *
       * However, if the last portion
       * of the value block is a potentially throwing expression, then the
       * value block could be of the form
       * ```
       * bb1:
       *   ...StoreLocal for the value block...
       *   maybe-throw continuation=bb2
       * bb2:
       *   goto (exit the value block)
       * ```
       *
       * Ie what would have been a StoreLocal+goto is split up because of
       * the maybe-throw. We detect this case and return the value of the
       * current block as the result of the value block
       */
      const continuationId = block.terminal.continuation;
      const continuationBlock = this.cx.ir.blocks.get(continuationId)!;
      if (
        continuationBlock.instructions.length === 0 &&
        continuationBlock.terminal.kind === 'goto'
      ) {
        return this.extractValueBlockResult(
          block.instructions,
          continuationBlock.id,
          loc,
        );
      }

      const continuation = this.visitValueBlock(
        continuationId,
        loc,
        fallthrough,
      );
      return this.wrapWithSequence(block.instructions, continuation, loc);
    } else {
      /*
       * The value block ended in a value terminal, recurse to get the value
       * of that terminal and stitch them together in a sequence.
       */
      const init = this.visitValueBlockTerminal(block.terminal);
      const final = this.visitValueBlock(init.fallthrough, loc);
      return this.wrapWithSequence(
        [
          ...block.instructions,
          {id: init.id, loc, lvalue: init.place, value: init.value},
        ],
        final,
        loc,
      );
    }
  }

  /*
   * Visits the test block of a value terminal (optional, logical, ternary) and
   * returns the result along with the branch terminal. Throws a todo error if
   * the test block does not end in a branch terminal.
   */
  visitTestBlock(
    testBlockId: BlockId,
    loc: SourceLocation,
    terminalKind: string,
  ): {
    test: {
      block: BlockId;
      value: ReactiveValue;
      place: Place;
      id: InstructionId;
    };
    branch: {consequent: BlockId; alternate: BlockId; loc: SourceLocation};
  } {
    const test = this.visitValueBlock(testBlockId, loc);
    const testBlock = this.cx.ir.blocks.get(test.block)!;
    if (testBlock.terminal.kind !== 'branch') {
      CompilerError.invariant(false, {
        reason: `Expected a branch terminal for ${terminalKind} test block`,
        description: `Got \`${testBlock.terminal.kind}\``,
        loc: testBlock.terminal.loc,
      });
    }
    return {
      test,
      branch: {
        consequent: testBlock.terminal.consequent,
        alternate: testBlock.terminal.alternate,
        loc: testBlock.terminal.loc,
      },
    };
  }

  visitValueBlockTerminal(terminal: Terminal): {
    value: ReactiveValue;
    place: Place;
    fallthrough: BlockId;
    id: InstructionId;
  } {
    switch (terminal.kind) {
      case 'sequence': {
        const block = this.visitValueBlock(
          terminal.block,
          terminal.loc,
          terminal.fallthrough,
        );
        return {
          value: block.value,
          place: block.place,
          fallthrough: terminal.fallthrough,
          id: terminal.id,
        };
      }
      case 'optional': {
        const {test, branch} = this.visitTestBlock(
          terminal.test,
          terminal.loc,
          'optional',
        );
        const consequent = this.visitValueBlock(
          branch.consequent,
          terminal.loc,
          terminal.fallthrough,
        );
        const call: ReactiveSequenceValue = {
          kind: 'SequenceExpression',
          instructions: [
            {
              id: test.id,
              loc: branch.loc,
              lvalue: test.place,
              value: test.value,
            },
          ],
          id: consequent.id,
          value: consequent.value,
          loc: terminal.loc,
        };
        return {
          place: {...consequent.place},
          value: {
            kind: 'OptionalExpression',
            optional: terminal.optional,
            value: call,
            id: terminal.id,
            loc: terminal.loc,
          },
          fallthrough: terminal.fallthrough,
          id: terminal.id,
        };
      }
      case 'logical': {
        const {test, branch} = this.visitTestBlock(
          terminal.test,
          terminal.loc,
          'logical',
        );
        const leftFinal = this.visitValueBlock(
          branch.consequent,
          terminal.loc,
          terminal.fallthrough,
        );
        const left: ReactiveSequenceValue = {
          kind: 'SequenceExpression',
          instructions: [
            {
              id: test.id,
              loc: terminal.loc,
              lvalue: test.place,
              value: test.value,
            },
          ],
          id: leftFinal.id,
          value: leftFinal.value,
          loc: terminal.loc,
        };
        const right = this.visitValueBlock(
          branch.alternate,
          terminal.loc,
          terminal.fallthrough,
        );
        const value: ReactiveLogicalValue = {
          kind: 'LogicalExpression',
          operator: terminal.operator,
          left: left,
          right: right.value,
          loc: terminal.loc,
        };
        return {
          place: {...leftFinal.place},
          value,
          fallthrough: terminal.fallthrough,
          id: terminal.id,
        };
      }
      case 'ternary': {
        const {test, branch} = this.visitTestBlock(
          terminal.test,
          terminal.loc,
          'ternary',
        );
        const consequent = this.visitValueBlock(
          branch.consequent,
          terminal.loc,
          terminal.fallthrough,
        );
        const alternate = this.visitValueBlock(
          branch.alternate,
          terminal.loc,
          terminal.fallthrough,
        );
        const value: ReactiveTernaryValue = {
          kind: 'ConditionalExpression',
          test: test.value,
          consequent: consequent.value,
          alternate: alternate.value,
          loc: terminal.loc,
        };

        return {
          place: {...consequent.place},
          value,
          fallthrough: terminal.fallthrough,
          id: terminal.id,
        };
      }
      case 'maybe-throw': {
        CompilerError.invariant(false, {
          reason: `Unexpected maybe-throw in visitValueBlockTerminal - should be handled in visitValueBlock`,
          description: null,
          loc: terminal.loc,
        });
      }
      case 'label': {
        CompilerError.throwTodo({
          reason: `Support labeled statements combined with value blocks (conditional, logical, optional chaining, etc)`,
          description: null,
          loc: terminal.loc,
          suggestions: null,
        });
      }
      default: {
        CompilerError.throwTodo({
          reason: `Support \`${terminal.kind}\` as a value block terminal (conditional, logical, optional chaining, etc)`,
          description: null,
          loc: terminal.loc,
          suggestions: null,
        });
      }
    }
  }

  emptyBlock(): ReactiveBlock {
    return [];
  }

  visitBreak(
    block: BlockId,
    id: InstructionId,
    loc: SourceLocation,
  ): ReactiveTerminalStatement<ReactiveBreakTerminal> | null {
    const target = this.cx.getBreakTarget(block);
    if (target === null) {
      CompilerError.invariant(false, {
        reason: 'Expected a break target',
        loc: GeneratedSource,
      });
    }
    if (this.cx.scopeFallthroughs.has(target.block)) {
      CompilerError.invariant(target.type === 'implicit', {
        reason: 'Expected reactive scope to implicitly break to fallthrough',
        loc,
      });
      return null;
    }
    return {
      kind: 'terminal',
      terminal: {
        kind: 'break',
        loc,
        target: target.block,
        id,
        targetKind: target.type,
      },
      label: null,
    };
  }

  visitContinue(
    block: BlockId,
    id: InstructionId,
    loc: SourceLocation,
  ): ReactiveTerminalStatement<ReactiveContinueTerminal> {
    const target = this.cx.getContinueTarget(block);
    CompilerError.invariant(target !== null, {
      reason: `Expected continue target to be scheduled for bb${block}`,
      loc: GeneratedSource,
    });

    return {
      kind: 'terminal',
      terminal: {
        kind: 'continue',
        loc,
        target: target.block,
        id,
        targetKind: target.type,
      },
      label: null,
    };
  }
}

class Context {
  ir: HIR;
  #nextScheduleId: number = 0;

  /*
   * Used to track which blocks *have been* generated already in order to
   * abort if a block is generated a second time. This is an error catching
   * mechanism for debugging purposes, and is not used by the codegen algorithm
   * to drive decisions about how to emit blocks.
   */
  emitted: Set<BlockId> = new Set();

  scopeFallthroughs: Set<BlockId> = new Set();
  /*
   * A set of blocks that are already scheduled to be emitted by eg a parent.
   * This allows child nodes to avoid re-emitting the same block and emit eg
   * a break instead.
   */
  #scheduled: Set<BlockId> = new Set();

  #catchHandlers: Set<BlockId> = new Set();

  /*
   * Represents which control flow operations are currently in scope, with the innermost
   * scope last. Roughly speaking, the last ControlFlowTarget on the stack indicates where
   * control will implicitly transfer, such that gotos to that block can be elided. Gotos
   * targeting items higher up the stack may need labeled break or continue; see
   * getBreakTarget() and getContinueTarget() for more details.
   */
  #controlFlowStack: Array<ControlFlowTarget> = [];

  constructor(ir: HIR) {
    this.ir = ir;
  }

  block(id: BlockId): BasicBlock {
    return this.ir.blocks.get(id)!;
  }

  scheduleCatchHandler(block: BlockId): void {
    this.#catchHandlers.add(block);
  }

  reachable(id: BlockId): boolean {
    const block = this.ir.blocks.get(id)!;
    return block.terminal.kind !== 'unreachable';
  }

  /*
   * Record that the given block will be emitted (eg by the codegen of a parent node)
   * so that child nodes can avoid re-emitting it.
   */
  schedule(block: BlockId, type: 'if' | 'switch' | 'case'): number {
    const id = this.#nextScheduleId++;
    CompilerError.invariant(!this.#scheduled.has(block), {
      reason: `Break block is already scheduled: bb${block}`,
      loc: GeneratedSource,
    });
    this.#scheduled.add(block);
    this.#controlFlowStack.push({block, id, type});
    return id;
  }

  scheduleLoop(
    fallthroughBlock: BlockId,
    continueBlock: BlockId,
    loopBlock: BlockId | null,
  ): number {
    const id = this.#nextScheduleId++;
    const ownsBlock = !this.#scheduled.has(fallthroughBlock);
    this.#scheduled.add(fallthroughBlock);
    CompilerError.invariant(!this.#scheduled.has(continueBlock), {
      reason: `Continue block is already scheduled: bb${continueBlock}`,
      loc: GeneratedSource,
    });
    this.#scheduled.add(continueBlock);
    let ownsLoop = false;
    if (loopBlock !== null) {
      ownsLoop = !this.#scheduled.has(loopBlock);
      this.#scheduled.add(loopBlock);
    }

    this.#controlFlowStack.push({
      block: fallthroughBlock,
      ownsBlock,
      id,
      type: 'loop',
      continueBlock,
      loopBlock,
      ownsLoop,
    });
    return id;
  }

  // Removes a block that was scheduled; must be called after that block is emitted.
  unschedule(scheduleId: number): void {
    const last = this.#controlFlowStack.pop();
    CompilerError.invariant(last !== undefined && last.id === scheduleId, {
      reason: 'Can only unschedule the last target',
      loc: GeneratedSource,
    });
    if (last.type !== 'loop' || last.ownsBlock !== null) {
      this.#scheduled.delete(last.block);
    }
    if (last.type === 'loop') {
      this.#scheduled.delete(last.continueBlock);
      if (last.ownsLoop && last.loopBlock !== null) {
        this.#scheduled.delete(last.loopBlock);
      }
    }
  }

  /*
   * Helper to unschedule multiple scheduled blocks. The ids should be in
   * the order in which they were scheduled, ie most recently scheduled last.
   */
  unscheduleAll(scheduleIds: Array<number>): void {
    for (let i = scheduleIds.length - 1; i >= 0; i--) {
      this.unschedule(scheduleIds[i]!);
    }
  }

  // Check if the given @param block is scheduled or not.
  isScheduled(block: BlockId): boolean {
    return this.#scheduled.has(block) || this.#catchHandlers.has(block);
  }

  /*
   * Given the current control flow stack, determines how a `break` to the given @param block
   * must be emitted. Returns as follows:
   * - 'implicit' if control would implicitly transfer to that block
   * - 'labeled' if a labeled break is required to transfer control to that block
   * - 'unlabeled' if an unlabeled break would transfer to that block
   * - null if there is no information for this block
   *
   * The returned 'block' value should be used as the label if necessary.
   */
  getBreakTarget(block: BlockId): {
    block: BlockId;
    type: ReactiveTerminalTargetKind;
  } {
    let hasPrecedingLoop = false;
    for (let i = this.#controlFlowStack.length - 1; i >= 0; i--) {
      const target = this.#controlFlowStack[i]!;
      if (target.block === block) {
        let type: ReactiveTerminalTargetKind;
        if (target.type === 'loop') {
          /*
           * breaking out of a loop requires an explicit break,
           * but only requires a label if breaking past the innermost loop.
           */
          type = hasPrecedingLoop ? 'labeled' : 'unlabeled';
        } else if (i === this.#controlFlowStack.length - 1) {
          /*
           * breaking to the last break point, which is where control will transfer
           * implicitly
           */
          type = 'implicit';
        } else {
          // breaking somewhere else requires an explicit break
          type = 'labeled';
        }
        return {
          block: target.block,
          type,
        };
      }
      hasPrecedingLoop ||= target.type === 'loop';
    }

    CompilerError.invariant(false, {
      reason: 'Expected a break target',
      loc: GeneratedSource,
    });
  }

  /*
   * Given the current control flow stack, determines how a `continue` to the given @param block
   * must be emitted. Returns as follows:
   * - 'implicit' if control would implicitly continue to that block
   * - 'labeled' if a labeled continue is required to continue to that block
   * - 'unlabeled' if an unlabeled continue would transfer to that block
   * - null if there is no information for this block
   *
   * The returned 'block' value should be used as the label if necessary.
   */
  getContinueTarget(
    block: BlockId,
  ): {block: BlockId; type: ReactiveTerminalTargetKind} | null {
    let hasPrecedingLoop = false;
    for (let i = this.#controlFlowStack.length - 1; i >= 0; i--) {
      const target = this.#controlFlowStack[i]!;
      if (target.type == 'loop' && target.continueBlock === block) {
        let type: ReactiveTerminalTargetKind;
        if (hasPrecedingLoop) {
          /*
           * continuing to a loop that is not the innermost loop always requires
           * a label
           */
          type = 'labeled';
        } else if (i === this.#controlFlowStack.length - 1) {
          /*
           * continuing to the last break point, which is where control will
           * transfer to naturally
           */
          type = 'implicit';
        } else {
          /*
           * the continue is inside some conditional logic, requires an explicit
           * continue
           */
          type = 'unlabeled';
        }
        return {
          block: target.block,
          type,
        };
      }
      hasPrecedingLoop ||= target.type === 'loop';
    }
    return null;
  }

  debugBreakTargets(): Array<ControlFlowTarget> {
    return this.#controlFlowStack.map(target => ({...target}));
  }
}

type ControlFlowTarget =
  | {type: 'if'; block: BlockId; id: number}
  | {type: 'switch'; block: BlockId; id: number}
  | {type: 'case'; block: BlockId; id: number}
  | {
      type: 'loop';
      block: BlockId;
      ownsBlock: boolean;
      continueBlock: BlockId;
      loopBlock: BlockId | null;
      ownsLoop: boolean;
      id: number;
    };

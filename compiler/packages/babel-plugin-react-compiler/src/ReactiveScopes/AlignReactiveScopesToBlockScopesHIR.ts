/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {
  BlockId,
  HIRFunction,
  InstructionId,
  MutableRange,
  Place,
  ReactiveScope,
  getPlaceScope,
  makeInstructionId,
} from '../HIR/HIR';
import {
  eachInstructionLValue,
  eachInstructionValueOperand,
  eachTerminalOperand,
  mapTerminalSuccessors,
  terminalFallthrough,
} from '../HIR/visitors';
import {retainWhere_Set} from '../Utils/utils';

type InstructionRange = MutableRange;
/*
 * Note: this is the 2nd of 4 passes that determine how to break a function into discrete
 * reactive scopes (independently memoizeable units of code):
 * 1. InferReactiveScopeVariables (on HIR) determines operands that mutate together and assigns
 *     them a unique reactive scope.
 * 2. AlignReactiveScopesToBlockScopes (this pass, on ReactiveFunction) aligns reactive scopes
 *     to block scopes.
 * 3. MergeOverlappingReactiveScopes (on ReactiveFunction) ensures that reactive scopes do not
 *     overlap, merging any such scopes.
 * 4. BuildReactiveBlocks (on ReactiveFunction) groups the statements for each scope into
 *     a ReactiveScopeBlock.
 *
 * Prior inference passes assign a reactive scope to each operand, but the ranges of these
 * scopes are based on specific instructions at arbitrary points in the control-flow graph.
 * However, to codegen blocks around the instructions in each scope, the scopes must be
 * aligned to block-scope boundaries - we can't memoize half of a loop!
 *
 * This pass updates reactive scope boundaries to align to control flow boundaries, for
 * example:
 *
 * ```javascript
 * function foo(cond, a) {
 *                     ⌵ original scope
 *                          ⌵ expanded scope
 *    const x = [];    ⌝    ⌝
 *    if (cond) {      ⎮    ⎮
 *      ...            ⎮    ⎮
 *      x.push(a);     ⌟    ⎮
 *      ...                 ⎮
 *    }                     ⌟
 * }
 * ```
 *
 * Here the original scope for `x` ended partway through the if consequent, but we can't
 * memoize part of that block. This pass would align the scope to the end of the consequent.
 *
 * The more general rule is that a reactive scope may only end at the same block scope as it
 * began: this pass therefore finds, for each scope, the block where that scope started and
 * finds the first instruction after the scope's mutable range in that same block scope (which
 * will be the updated end for that scope).
 */
export function alignReactiveScopesToBlockScopesHIR(fn: HIRFunction): void {
  const activeBlockFallthroughRanges: Array<{
    range: InstructionRange;
    fallthrough: BlockId;
  }> = [];
  const activeScopes = new Set<ReactiveScope>();
  const seen = new Set<ReactiveScope>();
  const valueBlockNodes = new Map<BlockId, ValueBlockNode>();
  const placeScopes = new Map<Place, ReactiveScope>();

  function recordPlace(
    id: InstructionId,
    place: Place,
    node: ValueBlockNode | null,
  ): void {
    if (place.identifier.scope !== null) {
      placeScopes.set(place, place.identifier.scope);
    }

    const scope = getPlaceScope(id, place);
    if (scope == null) {
      return;
    }
    activeScopes.add(scope);
    node?.children.push({kind: 'scope', scope, id});

    if (seen.has(scope)) {
      return;
    }
    seen.add(scope);
    if (node != null && node.valueRange !== null) {
      scope.range.start = makeInstructionId(
        Math.min(node.valueRange.start, scope.range.start),
      );
      scope.range.end = makeInstructionId(
        Math.max(node.valueRange.end, scope.range.end),
      );
    }
  }

  for (const [, block] of fn.body.blocks) {
    const startingId = block.instructions[0]?.id ?? block.terminal.id;
    retainWhere_Set(activeScopes, scope => scope.range.end > startingId);
    const top = activeBlockFallthroughRanges.at(-1);
    if (top?.fallthrough === block.id) {
      activeBlockFallthroughRanges.pop();
      /*
       * All active scopes must have either started before or within the last
       * block-fallthrough range. In either case, they overlap this block-
       * fallthrough range and can have their ranges extended.
       */
      for (const scope of activeScopes) {
        scope.range.start = makeInstructionId(
          Math.min(scope.range.start, top.range.start),
        );
      }
    }

    const {instructions, terminal} = block;
    const node = valueBlockNodes.get(block.id) ?? null;
    for (const instr of instructions) {
      for (const lvalue of eachInstructionLValue(instr)) {
        recordPlace(instr.id, lvalue, node);
      }
      for (const operand of eachInstructionValueOperand(instr.value)) {
        recordPlace(instr.id, operand, node);
      }
    }
    for (const operand of eachTerminalOperand(terminal)) {
      recordPlace(terminal.id, operand, node);
    }

    const fallthrough = terminalFallthrough(terminal);
    if (fallthrough !== null && terminal.kind !== 'branch') {
      /*
       * Any currently active scopes that overlaps the block-fallthrough range
       * need their range extended to at least the first instruction of the
       * fallthrough
       */
      const fallthroughBlock = fn.body.blocks.get(fallthrough)!;
      const nextId =
        fallthroughBlock.instructions[0]?.id ?? fallthroughBlock.terminal.id;
      for (const scope of activeScopes) {
        if (scope.range.end > terminal.id) {
          scope.range.end = makeInstructionId(
            Math.max(scope.range.end, nextId),
          );
        }
      }
      /**
       * We also record the block-fallthrough range for future scopes that begin
       * within the range (and overlap with the range end).
       */
      activeBlockFallthroughRanges.push({
        fallthrough,
        range: {
          start: terminal.id,
          end: nextId,
        },
      });

      CompilerError.invariant(!valueBlockNodes.has(fallthrough), {
        reason: 'Expect hir blocks to have unique fallthroughs',
        loc: terminal.loc,
      });
      if (node != null) {
        valueBlockNodes.set(fallthrough, node);
      }
    } else if (terminal.kind === 'goto') {
      /**
       * If we encounter a goto that is not to the natural fallthrough of the current
       * block (not the topmost fallthrough on the stack), then this is a goto to a
       * label. Any scopes that extend beyond the goto must be extended to include
       * the labeled range, so that the break statement doesn't accidentally jump
       * out of the scope. We do this by extending the start and end of the scope's
       * range to the label and its fallthrough respectively.
       */
      const start = activeBlockFallthroughRanges.find(
        range => range.fallthrough === terminal.block,
      );
      if (start != null && start !== activeBlockFallthroughRanges.at(-1)) {
        const fallthroughBlock = fn.body.blocks.get(start.fallthrough)!;
        const firstId =
          fallthroughBlock.instructions[0]?.id ?? fallthroughBlock.terminal.id;
        for (const scope of activeScopes) {
          /**
           * activeScopes is only filtered at block start points, so some of the
           * scopes may not actually be active anymore, ie we've past their end
           * instruction. Only extend ranges for scopes that are actually active.
           *
           * TODO: consider pruning activeScopes per instruction
           */
          if (scope.range.end <= terminal.id) {
            continue;
          }
          scope.range.start = makeInstructionId(
            Math.min(start.range.start, scope.range.start),
          );
          scope.range.end = makeInstructionId(
            Math.max(firstId, scope.range.end),
          );
        }
      }
    }

    /*
     * Visit all successors (not just direct successors for control-flow ordering) to
     * set a value block node where necessary to align the value block start/end
     * back to the outer block scope.
     *
     * TODO: add a variant of eachTerminalSuccessor() that visits _all_ successors, not
     * just those that are direct successors for normal control-flow ordering.
     */
    mapTerminalSuccessors(terminal, successor => {
      if (valueBlockNodes.has(successor)) {
        return successor;
      }

      const successorBlock = fn.body.blocks.get(successor)!;
      if (successorBlock.kind === 'block' || successorBlock.kind === 'catch') {
        /*
         * we need the block kind check here because the do..while terminal's
         * successor is a block, and try's successor is a catch block
         */
      } else if (
        node == null ||
        terminal.kind === 'ternary' ||
        terminal.kind === 'logical' ||
        terminal.kind === 'optional'
      ) {
        /**
         * Create a new node whenever we transition from non-value -> value block.
         *
         * For compatibility with the previous ReactiveFunction-based scope merging logic,
         * we also create new scope nodes for ternary, logical, and optional terminals.
         * Inside value blocks we always store a range (valueRange) that is the
         * start/end instruction ids at the nearest parent block scope level, so that
         * scopes inside the value blocks can be extended to align with block scope
         * instructions.
         */
        let valueRange: MutableRange;
        if (node == null) {
          // Transition from block->value block, derive the outer block range
          CompilerError.invariant(fallthrough !== null, {
            reason: `Expected a fallthrough for value block`,
            loc: terminal.loc,
          });
          const fallthroughBlock = fn.body.blocks.get(fallthrough)!;
          const nextId =
            fallthroughBlock.instructions[0]?.id ??
            fallthroughBlock.terminal.id;
          valueRange = {
            start: terminal.id,
            end: nextId,
          };
        } else {
          // else value->value transition, reuse the range
          valueRange = node.valueRange;
        }
        const childNode: ValueBlockNode = {
          kind: 'node',
          id: terminal.id,
          children: [],
          valueRange,
        };
        node?.children.push(childNode);
        valueBlockNodes.set(successor, childNode);
      } else {
        // this is a value -> value block transition, reuse the node
        valueBlockNodes.set(successor, node);
      }
      return successor;
    });
  }
}

type ValueBlockNode = {
  kind: 'node';
  id: InstructionId;
  valueRange: MutableRange;
  children: Array<ValueBlockNode | ReactiveScopeNode>;
};
type ReactiveScopeNode = {
  kind: 'scope';
  id: InstructionId;
  scope: ReactiveScope;
};

function _debug(node: ValueBlockNode): string {
  const buf: Array<string> = [];
  _printNode(node, buf, 0);
  return buf.join('\n');
}
function _printNode(
  node: ValueBlockNode | ReactiveScopeNode,
  out: Array<string>,
  depth: number = 0,
): void {
  let prefix = '  '.repeat(depth);
  if (node.kind === 'scope') {
    out.push(
      `${prefix}[${node.id}] @${node.scope.id} [${node.scope.range.start}:${node.scope.range.end}]`,
    );
  } else {
    let range = ` (range=[${node.valueRange.start}:${node.valueRange.end}])`;
    out.push(`${prefix}[${node.id}] node${range} [`);
    for (const child of node.children) {
      _printNode(child, out, depth + 1);
    }
    out.push(`${prefix}]`);
  }
}

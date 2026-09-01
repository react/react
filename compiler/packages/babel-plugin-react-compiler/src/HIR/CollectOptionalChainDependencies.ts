/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError, SourceLocation} from '..';
import {assertNonNull} from './CollectHoistablePropertyLoads';
import {
  BlockId,
  BasicBlock,
  IdentifierId,
  ReactiveScopeDependency,
  BranchTerminal,
  TInstruction,
  PropertyLoad,
  StoreLocal,
  GotoVariant,
  TBasicBlock,
  OptionalTerminal,
  HIRFunction,
  DependencyPathEntry,
  Instruction,
  Terminal,
  PropertyLiteral,
} from './HIR';
import {printIdentifier} from './PrintHIR';

export function collectOptionalChainSidemap(
  fn: HIRFunction,
): OptionalChainSidemap {
  const context: OptionalTraversalContext = {
    currFn: fn,
    blocks: fn.body.blocks,
    seenOptionals: new Set(),
    processedInstrsInOptional: new Set(),
    temporariesReadInOptional: new Map(),
    hoistableObjects: new Map(),
  };
  traverseFunction(fn, context);
  return {
    temporariesReadInOptional: context.temporariesReadInOptional,
    processedInstrsInOptional: context.processedInstrsInOptional,
    hoistableObjects: context.hoistableObjects,
  };
}
export type OptionalChainSidemap = {
  /**
   * Stores the correct property mapping (e.g. `a?.b` instead of `a.b`) for
   * dependency calculation. Note that we currently do not store anything on
   * outer phi nodes.
   */
  temporariesReadInOptional: ReadonlyMap<IdentifierId, ReactiveScopeDependency>;
  /**
   * Records instructions (PropertyLoads, StoreLocals, and test terminals)
   * processed in this pass. When extracting dependencies in
   * PropagateScopeDependencies, these instructions are skipped.
   *
   * E.g. given a?.b
   * ```
   * bb0
   *   $0 = LoadLocal 'a'
   *   test $0 then=bb1         <- Avoid adding dependencies from these instructions, as
   * bb1                           the sidemap produced by readOptionalBlock already maps
   *   $1 = PropertyLoad $0.'b' <- $1 and $2 back to a?.b. Instead, we want to add a?.b
   *   StoreLocal $2 = $1       <- as a dependency when $1 or $2 are later used in either
   *                                 - an unhoistable expression within an outer optional
   *                                   block e.g. MethodCall
   *                                 - a phi node (if the entire optional value is hoistable)
   * ```
   *
   * Note that mapping blockIds to their evaluated dependency path does not
   * work, since values produced by inner optional chains may be referenced in
   * outer ones
   * ```
   * a?.b.c()
   *  ->
   * bb0
   *   $0 = LoadLocal 'a'
   *   test $0 then=bb1
   * bb1
   *   $1 = PropertyLoad $0.'b'
   *   StoreLocal $2 = $1
   *   goto bb2
   * bb2
   *   test $2 then=bb3
   * bb3:
   *   $3 = PropertyLoad $2.'c'
   *   StoreLocal $4 = $3
   *   goto bb4
   * bb4
   *   test $4 then=bb5
   * bb5:
   *   $5 = MethodCall $2.$4() <--- here, we want to take a dep on $2 and $4!
   * ```
   *
   * Also note that InstructionIds are not unique across inner functions.
   */
  processedInstrsInOptional: ReadonlySet<Instruction | Terminal>;
  /**
   * Records optional chains for which we can safely evaluate non-optional
   * PropertyLoads. e.g. given `a?.b.c`, we can evaluate any load from `a?.b` at
   * the optional terminal in bb1.
   * ```js
   * bb1:
   *   ...
   *   Optional optional=false test=bb2 fallth=...
   * bb2:
   *   Optional optional=true test=bb3 fallth=...
   * ...
   * ```
   */
  hoistableObjects: ReadonlyMap<BlockId, ReactiveScopeDependency>;
};

type OptionalTraversalContext = {
  currFn: HIRFunction;
  blocks: ReadonlyMap<BlockId, BasicBlock>;

  // Track optional blocks to avoid outer calls into nested optionals
  seenOptionals: Set<BlockId>;

  processedInstrsInOptional: Set<Instruction | Terminal>;
  temporariesReadInOptional: Map<IdentifierId, ReactiveScopeDependency>;
  hoistableObjects: Map<BlockId, ReactiveScopeDependency>;
};

function traverseFunction(
  fn: HIRFunction,
  context: OptionalTraversalContext,
): void {
  for (const [_, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      if (
        instr.value.kind === 'FunctionExpression' ||
        instr.value.kind === 'ObjectMethod'
      ) {
        traverseFunction(instr.value.loweredFunc.func, {
          ...context,
          currFn: instr.value.loweredFunc.func,
          blocks: instr.value.loweredFunc.func.body.blocks,
        });
      }
    }
    if (
      block.terminal.kind === 'optional' &&
      !context.seenOptionals.has(block.id)
    ) {
      traverseOptionalBlock(
        block as TBasicBlock<OptionalTerminal>,
        context,
        null,
      );
    }
  }
}
/**
 * Match the consequent and alternate blocks of an optional.
 * @returns propertyload computed by the consequent block, or null if the
 * consequent block is not a simple PropertyLoad.
 */
function matchOptionalTestBlock(
  terminal: BranchTerminal,
  blocks: ReadonlyMap<BlockId, BasicBlock>,
): {
  consequentId: IdentifierId;
  property: PropertyLiteral;
  propertyId: IdentifierId;
  storeLocalInstr: Instruction;
  consequentGoto: BlockId;
  propertyLoadLoc: SourceLocation;
} | null {
  const consequentBlock = assertNonNull(blocks.get(terminal.consequent));
  if (
    consequentBlock.instructions.length === 2 &&
    consequentBlock.instructions[0].value.kind === 'PropertyLoad' &&
    consequentBlock.instructions[1].value.kind === 'StoreLocal'
  ) {
    const propertyLoad: TInstruction<PropertyLoad> = consequentBlock
      .instructions[0] as TInstruction<PropertyLoad>;
    const storeLocal: StoreLocal = consequentBlock.instructions[1].value;
    const storeLocalInstr = consequentBlock.instructions[1];
    CompilerError.invariant(
      propertyLoad.value.object.identifier.id === terminal.test.identifier.id,
      {
        reason:
          '[OptionalChainDeps] Inconsistent optional chaining property load',
        description: `Test=${printIdentifier(terminal.test.identifier)} PropertyLoad base=${printIdentifier(propertyLoad.value.object.identifier)}`,
        loc: propertyLoad.loc,
      },
    );

    CompilerError.invariant(
      storeLocal.value.identifier.id === propertyLoad.lvalue.identifier.id,
      {
        reason: '[OptionalChainDeps] Unexpected storeLocal',
        loc: propertyLoad.loc,
      },
    );
    if (
      consequentBlock.terminal.kind !== 'goto' ||
      consequentBlock.terminal.variant !== GotoVariant.Break
    ) {
      return null;
    }
    const alternate = assertNonNull(blocks.get(terminal.alternate));

    CompilerError.invariant(
      alternate.instructions.length === 2 &&
        alternate.instructions[0].value.kind === 'Primitive' &&
        alternate.instructions[1].value.kind === 'StoreLocal',
      {
        reason: 'Unexpected alternate structure',
        loc: terminal.loc,
      },
    );

    return {
      consequentId: storeLocal.lvalue.place.identifier.id,
      property: propertyLoad.value.property,
      propertyId: propertyLoad.lvalue.identifier.id,
      storeLocalInstr,
      consequentGoto: consequentBlock.terminal.block,
      propertyLoadLoc: propertyLoad.loc,
    };
  }
  return null;
}

/**
 * Traverse into the optional block and all transitively referenced blocks to
 * collect sidemaps of optional chain dependencies.
 *
 * @returns the IdentifierId representing the optional block if the block and
 * all transitively referenced optional blocks precisely represent a chain of
 * property loads. If any part of the optional chain is not hoistable, returns
 * null.
 */
function traverseOptionalBlock(
  optional: TBasicBlock<OptionalTerminal>,
  context: OptionalTraversalContext,
  outerAlternate: BlockId | null,
): IdentifierId | null {
  context.seenOptionals.add(optional.id);
  const maybeTest = context.blocks.get(optional.terminal.test)!;
  let test: BranchTerminal;
  let baseObject: ReactiveScopeDependency;
  if (maybeTest.terminal.kind === 'branch') {
    CompilerError.invariant(optional.terminal.optional, {
      reason: '[OptionalChainDeps] Expect base case to be always optional',
      loc: optional.terminal.loc,
    });
    /**
     * Optional base expressions are currently within value blocks which cannot
     * be interrupted by scope boundaries. As such, the only dependencies we can
     * hoist out of optional chains are property load chains with no intervening
     * instructions.
     *
     * Ideally, we would be able to flatten base instructions out of optional
     * blocks, but this would require changes to HIR.
     *
     * For now, only match base expressions that are straightforward
     * PropertyLoad chains
     */
    if (
      maybeTest.instructions.length === 0 ||
      maybeTest.instructions[0].value.kind !== 'LoadLocal'
    ) {
      return null;
    }
    const path: Array<DependencyPathEntry> = [];
    for (let i = 1; i < maybeTest.instructions.length; i++) {
      const instrVal = maybeTest.instructions[i].value;
      const prevInstr = maybeTest.instructions[i - 1];
      if (
        instrVal.kind === 'PropertyLoad' &&
        instrVal.object.identifier.id === prevInstr.lvalue.identifier.id
      ) {
        path.push({
          property: instrVal.property,
          optional: false,
          loc: instrVal.loc,
        });
      } else {
        return null;
      }
    }
    CompilerError.invariant(
      maybeTest.terminal.test.identifier.id ===
        maybeTest.instructions.at(-1)!.lvalue.identifier.id,
      {
        reason: '[OptionalChainDeps] Unexpected test expression',
        loc: maybeTest.terminal.loc,
      },
    );
    baseObject = {
      identifier: maybeTest.instructions[0].value.place.identifier,
      reactive: maybeTest.instructions[0].value.place.reactive,
      path,
      loc: maybeTest.instructions[0].value.place.loc,
    };
    test = maybeTest.terminal;
  } else if (maybeTest.terminal.kind === 'optional') {
    /**
     * This is either
     * - <inner_optional>?.property (optional=true)
     * - <inner_optional>.property  (optional=false)
     * - <inner_optional> <other operation>
     * - a optional base block with a separate nested optional-chain (e.g. a(c?.d)?.d)
     */
    const testBlock = context.blocks.get(maybeTest.terminal.fallthrough)!;
    /**
     * Fallthrough of the inner optional should be a block with no
     * instructions, terminating with Test($<temporary written to from
     * StoreLocal>)
     */
    if (testBlock.terminal.kind !== 'branch') {
      return null;
    }
    /**
     * Recurse into inner optional blocks to collect inner optional-chain
     * expressions, regardless of whether we can match the outer one to a
     * PropertyLoad.
     */
    const innerOptional = traverseOptionalBlock(
      maybeTest as TBasicBlock<OptionalTerminal>,
      context,
      testBlock.terminal.alternate,
    );
    if (innerOptional == null) {
      return null;
    }

    /**
     * Check that the inner optional is part of the same optional-chain as the
     * outer one. This is not guaranteed, e.g. given a(c?.d)?.d
     * ```
     * bb0:
     *   Optional test=bb1
     * bb1:
     *   $0 = LoadLocal a               <-- part 1 of the outer optional-chaining base
     *   Optional test=bb2 fallth=bb5   <-- start of optional chain for c?.d
     * bb2:
     *   ... (optional chain for c?.d)
     * ...
     * bb5:
     *   $1 = phi(c.d, undefined)       <-- part 2 (continuation) of the outer optional-base
     *   $2 = Call $0($1)
     *   Branch $2 ...
     * ```
     */
    if (testBlock.terminal.test.identifier.id !== innerOptional) {
      return null;
    }

    if (!optional.terminal.optional) {
      /**
       * If this is an non-optional load participating in an optional chain
       * (e.g. loading the `c` property in `a?.b.c`), record that PropertyLoads
       * from the inner optional value are hoistable.
       */
      context.hoistableObjects.set(
        optional.id,
        assertNonNull(context.temporariesReadInOptional.get(innerOptional)),
      );
    }
    baseObject = assertNonNull(
      context.temporariesReadInOptional.get(innerOptional),
    );
    test = testBlock.terminal;
  } else {
    return null;
  }

  if (test.alternate === outerAlternate) {
    CompilerError.invariant(optional.instructions.length === 0, {
      reason:
        '[OptionalChainDeps] Unexpected instructions an inner optional block. ' +
        'This indicates that the compiler may be incorrectly concatenating two unrelated optional chains',
      loc: optional.terminal.loc,
    });
  }
  const matchConsequentResult = matchOptionalTestBlock(test, context.blocks);
  if (!matchConsequentResult) {
    // Optional chain consequent is not hoistable e.g. a?.[computed()]
    return null;
  }
  CompilerError.invariant(
    matchConsequentResult.consequentGoto === optional.terminal.fallthrough,
    {
      reason: '[OptionalChainDeps] Unexpected optional goto-fallthrough',
      description: `${matchConsequentResult.consequentGoto} != ${optional.terminal.fallthrough}`,
      loc: optional.terminal.loc,
    },
  );
  const load: ReactiveScopeDependency = {
    identifier: baseObject.identifier,
    reactive: baseObject.reactive,
    path: [
      ...baseObject.path,
      {
        property: matchConsequentResult.property,
        optional: optional.terminal.optional,
        loc: matchConsequentResult.propertyLoadLoc,
      },
    ],
    loc: matchConsequentResult.propertyLoadLoc,
  };
  context.processedInstrsInOptional.add(matchConsequentResult.storeLocalInstr);
  context.processedInstrsInOptional.add(test);
  context.temporariesReadInOptional.set(
    matchConsequentResult.consequentId,
    load,
  );
  context.temporariesReadInOptional.set(matchConsequentResult.propertyId, load);
  return matchConsequentResult.consequentId;
}

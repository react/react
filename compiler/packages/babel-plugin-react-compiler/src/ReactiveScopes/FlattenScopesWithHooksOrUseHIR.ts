/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {
  BlockId,
  BasicBlock,
  HIRFunction,
  LabelTerminal,
  PrunedScopeTerminal,
  getHookKind,
  isUseOperator,
} from '../HIR';
import {eachTerminalSuccessor} from '../HIR/visitors';
import {retainWhere} from '../Utils/utils';

/**
 * For simplicity the majority of compiler passes do not treat hooks specially. However, hooks are different
 * from regular functions in two key ways:
 * - They can introduce reactivity even when their arguments are non-reactive (accounted for in InferReactivePlaces)
 * - They cannot be called conditionally
 *
 * The `use` operator is similar:
 * - It can access context, and therefore introduce reactivity
 * - It can be called conditionally, but _it must be called if the component needs the return value_. This is because
 *   React uses the fact that use was called to remember that the component needs the value, and that changes to the
 *   input should invalidate the component itself.
 *
 * This pass accounts for the "can't call conditionally" aspect of both hooks and use. Though the reasoning is slightly
 * different for reach, the result is that we can't memoize scopes that call hooks or use since this would make them
 * called conditionally in the output.
 *
 * The pass finds and removes any scopes that transitively contain a hook or use call. By running all
 * the reactive scope inference first, agnostic of hooks, we know that the reactive scopes accurately
 * describe the set of values which "construct together", and remove _all_ that memoization in order
 * to ensure the hook call does not inadvertently become conditional.
 */
export function flattenScopesWithHooksOrUseHIR(fn: HIRFunction): void {
  const activeScopes: Array<{block: BlockId; fallthrough: BlockId}> = [];
  const prune: Array<BlockId> = [];
  const blocksWithHooks = new Set<BlockId>();

  // First pass: identify blocks that contain hooks
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'MethodCall':
        case 'CallExpression': {
          const callee =
            value.kind === 'MethodCall' ? value.property : value.callee;
          if (
            getHookKind(fn.env, callee.identifier) != null ||
            isUseOperator(callee.identifier)
          ) {
            blocksWithHooks.add(block.id);
          }
        }
      }
    }
  }

  // Helper to find all blocks reachable within the scope's boundary
  function getBlocksInScope(
    blocks: Map<BlockId, BasicBlock>,
    startBlockId: BlockId,
    fallthroughBlockId: BlockId,
  ): Set<BlockId> {
    const visited = new Set<BlockId>();
    const queue = [startBlockId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === fallthroughBlockId || visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);
      const block = blocks.get(currentId);
      if (block != null) {
        for (const succId of eachTerminalSuccessor(block.terminal)) {
          queue.push(succId);
        }
      }
    }
    return visited;
  }

  // Helper function to check if a scope contains hooks
  function scopeContainsHook(startBlockId: BlockId, fallthroughBlockId: BlockId): boolean {
    const scopeBlocks = getBlocksInScope(fn.body.blocks, startBlockId, fallthroughBlockId);
    for (const blockId of scopeBlocks) {
      if (blocksWithHooks.has(blockId)) {
        return true;
      }
    }
    return false;
  }

  // Second pass: prune only scopes that contain hooks
  for (const [, block] of fn.body.blocks) {
    retainWhere(activeScopes, current => current.fallthrough !== block.id);

    if (block.terminal.kind === 'scope') {
      const scopeBodyBlockId = block.terminal.block;
      const fallthroughBlockId = block.terminal.fallthrough;
      // Only prune scopes whose body blocks contain hooks
      if (scopeContainsHook(scopeBodyBlockId, fallthroughBlockId)) {
        prune.push(block.id);
      } else {
        // Scope doesn't contain hooks, so track it (it can be memoized)
        activeScopes.push({
          block: block.id,
          fallthrough: block.terminal.fallthrough,
        });
      }
    }
  }

  for (const id of prune) {
    const block = fn.body.blocks.get(id)!;
    const terminal = block.terminal;
    CompilerError.invariant(terminal.kind === 'scope', {
      reason: `Expected block to have a scope terminal`,
      description: `Expected block bb${block.id} to end in a scope terminal`,
      loc: terminal.loc,
    });
    const body = fn.body.blocks.get(terminal.block)!;
    if (
      body.instructions.length === 1 &&
      body.terminal.kind === 'goto' &&
      body.terminal.block === terminal.fallthrough
    ) {
      /*
       * This was a scope just for a hook call, which doesn't need memoization.
       * flatten it away. We rely on the PrunedUnusedLabel step to do the actual
       * flattening
       */
      block.terminal = {
        kind: 'label',
        block: terminal.block,
        fallthrough: terminal.fallthrough,
        id: terminal.id,
        loc: terminal.loc,
      } as LabelTerminal;
      continue;
    }

    block.terminal = {
      kind: 'pruned-scope',
      block: terminal.block,
      fallthrough: terminal.fallthrough,
      id: terminal.id,
      loc: terminal.loc,
      scope: terminal.scope,
    } as PrunedScopeTerminal;
  }
}

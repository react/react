/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {getScopes, recursivelyTraverseItems} from './AssertValidBlockNesting';
import {Environment} from './Environment';
import {
  BasicBlock,
  BlockId,
  GeneratedSource,
  GotoTerminal,
  GotoVariant,
  HIRFunction,
  InstructionId,
  ReactiveScope,
  ReactiveScopeTerminal,
  ScopeId,
} from './HIR';
import {
  fixScopeAndIdentifierRanges,
  markInstructionIds,
  markPredecessors,
  reversePostorderBlocks,
} from './HIRBuilder';

/**
 * This pass assumes that all program blocks are properly nested with respect to fallthroughs
 * (e.g. a valid javascript AST).
 * Given a function whose reactive scope ranges have been correctly aligned and merged,
 * this pass rewrites blocks to introduce ReactiveScopeTerminals and their fallthrough blocks.
 * e.g.
 * ```js
 * // source
 * [0] ...
 * [1] const x = [];  ⌝ scope range
 * [2] if (cond) {    |
 * [3]  x.push(a);    |
 *     }              |
 * [4] x.push(b);     ⌟
 * [5] ...
 *
 * // before this pass
 * bb0:
 *  [0]
 *  [1]
 *  [2]
 *  If ($2) then bb1 else bb2 (fallthrough=bb2)
 * bb1:
 *  [3]
 *  Goto bb2
 * bb2:
 *  [4]
 *  [5]
 *
 * // after this pass
 * bb0:
 *  [0]
 *  ScopeTerminal goto=bb3 (fallthrough=bb4)    <-- new
 * bb3:                                         <-- new
 *  [1]
 *  [2]
 *  If ($2) then bb1 else bb2 (fallthrough=bb2)
 * bb1:
 *  [3]
 *  Goto bb2
 * bb2:
 *  [4]
 *  Goto bb4                                    <-- new
 * bb4:                                         <-- new
 *  [5]
 * ```
 */

export function buildReactiveScopeTerminalsHIR(fn: HIRFunction): void {
  /**
   * Step 1:
   * Traverse all blocks to build up a list of rewrites. We also pre-allocate the
   * fallthrough ID here as scope start terminals and scope end terminals both
   * require a fallthrough block.
   */
  const queuedRewrites: Array<TerminalRewriteInfo> = [];
  recursivelyTraverseItems(
    [...getScopes(fn)],
    scope => scope.range,
    {
      fallthroughs: new Map(),
      rewrites: queuedRewrites,
      env: fn.env,
    },
    pushStartScopeTerminal,
    pushEndScopeTerminal,
  );

  /**
   * Step 2:
   * Traverse all blocks to apply rewrites. Here, we split blocks as described at
   * the top of this file to add scope terminals and fallthroughs.
   */
  const rewrittenFinalBlocks = new Map<BlockId, BlockId>();
  const nextBlocks = new Map<BlockId, BasicBlock>();
  /**
   * reverse queuedRewrites to pop off the end as we traverse instructions in
   * ascending order
   */
  queuedRewrites.reverse();
  for (const [, block] of fn.body.blocks) {
    const context: RewriteContext = {
      nextBlockId: block.id,
      rewrites: [],
      nextPreds: block.preds,
      instrSliceIdx: 0,
      source: block,
    };
    /**
     * Handle queued terminal rewrites at their nearest instruction ID.
     * Note that multiple terminal rewrites may map to the same instruction ID.
     */
    for (let i = 0; i < block.instructions.length + 1; i++) {
      const instrId =
        i < block.instructions.length
          ? block.instructions[i].id
          : block.terminal.id;
      let rewrite = queuedRewrites.at(-1);
      while (rewrite != null && rewrite.instrId <= instrId) {
        handleRewrite(rewrite, i, context);
        queuedRewrites.pop();
        rewrite = queuedRewrites.at(-1);
      }
    }

    if (context.rewrites.length > 0) {
      const finalBlock: BasicBlock = {
        id: context.nextBlockId,
        kind: block.kind,
        preds: context.nextPreds,
        terminal: block.terminal,
        instructions: block.instructions.slice(context.instrSliceIdx),
        phis: new Set(),
      };
      context.rewrites.push(finalBlock);
      for (const b of context.rewrites) {
        nextBlocks.set(b.id, b);
      }
      rewrittenFinalBlocks.set(block.id, finalBlock.id);
    } else {
      nextBlocks.set(block.id, block);
    }
  }
  const originalBlocks = fn.body.blocks;
  fn.body.blocks = nextBlocks;

  /**
   * Step 3:
   * Repoint phis when they refer to a rewritten block.
   */
  for (const [, block] of originalBlocks) {
    for (const phi of block.phis) {
      for (const [originalId, value] of phi.operands) {
        const newId = rewrittenFinalBlocks.get(originalId);
        if (newId != null) {
          phi.operands.delete(originalId);
          phi.operands.set(newId, value);
        }
      }
    }
  }

  /**
   * Step 4:
   * Fixup the HIR to restore RPO, ensure correct predecessors, and
   * renumber instructions. Note that the renumbering instructions
   * invalidates scope and identifier ranges, so we fix them in the
   * next step.
   */
  reversePostorderBlocks(fn.body);
  markPredecessors(fn.body);
  markInstructionIds(fn.body);

  /**
   * Step 5:
   * Fix scope and identifier ranges to account for renumbered instructions
   */
  fixScopeAndIdentifierRanges(fn.body);
}

type TerminalRewriteInfo =
  | {
      kind: 'StartScope';
      blockId: BlockId;
      fallthroughId: BlockId;
      instrId: InstructionId;
      scope: ReactiveScope;
    }
  | {
      kind: 'EndScope';
      instrId: InstructionId;
      fallthroughId: BlockId;
    };

/**
 * Helpers for reversing scope ranges to gather terminal rewrite information
 */
type ScopeTraversalContext = {
  // cache allocated fallthroughs for start/end scope terminal pairs
  fallthroughs: Map<ScopeId, BlockId>;
  rewrites: Array<TerminalRewriteInfo>;
  env: Environment;
};

function pushStartScopeTerminal(
  scope: ReactiveScope,
  context: ScopeTraversalContext,
): void {
  const blockId = context.env.nextBlockId;
  const fallthroughId = context.env.nextBlockId;
  context.rewrites.push({
    kind: 'StartScope',
    blockId,
    fallthroughId,
    instrId: scope.range.start,
    scope,
  });
  context.fallthroughs.set(scope.id, fallthroughId);
}

function pushEndScopeTerminal(
  scope: ReactiveScope,
  context: ScopeTraversalContext,
): void {
  const fallthroughId = context.fallthroughs.get(scope.id);
  CompilerError.invariant(fallthroughId != null, {
    reason: 'Expected scope to exist',
    loc: GeneratedSource,
  });
  context.rewrites.push({
    kind: 'EndScope',
    fallthroughId,
    instrId: scope.range.end,
  });
}

type RewriteContext = {
  source: BasicBlock;
  instrSliceIdx: number;
  nextPreds: Set<BlockId>;
  nextBlockId: BlockId;
  rewrites: Array<BasicBlock>;
};

/**
 * Create a block rewrite by slicing a set of instructions from source.
 * Since scope start-ends always end with a GOTO to the next instruction
 * from the source block, we directly connect rewritten blocks using state
 * from `context`.
 *
 * Source:
 *   bb0:
 *     instr1, instr2, instr3, instr4, [[ original terminal ]]
 * Rewritten:
 *   bb0:
 *     instr1, [[ scope start block=bb1]]
 *   bb1:
 *     instr2, instr3, [[ scope end goto=bb2 ]]
 *   bb2:
 *     instr4, [[ original terminal ]]
 */
function handleRewrite(
  terminalInfo: TerminalRewriteInfo,
  idx: number,
  context: RewriteContext,
): void {
  // TODO make consistent instruction IDs instead of reusing
  const terminal: ReactiveScopeTerminal | GotoTerminal =
    terminalInfo.kind === 'StartScope'
      ? {
          kind: 'scope',
          fallthrough: terminalInfo.fallthroughId,
          block: terminalInfo.blockId,
          scope: terminalInfo.scope,
          id: terminalInfo.instrId,
          loc: GeneratedSource,
        }
      : {
          kind: 'goto',
          variant: GotoVariant.Break,
          block: terminalInfo.fallthroughId,
          id: terminalInfo.instrId,
          loc: GeneratedSource,
        };

  const currBlockId = context.nextBlockId;
  context.rewrites.push({
    kind: context.source.kind,
    id: currBlockId,
    instructions: context.source.instructions.slice(context.instrSliceIdx, idx),
    preds: context.nextPreds,
    // Only the first rewrite should reuse source block phis
    phis: context.rewrites.length === 0 ? context.source.phis : new Set(),
    terminal,
  });
  context.nextPreds = new Set([currBlockId]);
  context.nextBlockId =
    terminalInfo.kind === 'StartScope'
      ? terminalInfo.blockId
      : terminalInfo.fallthroughId;
  context.instrSliceIdx = idx;
}

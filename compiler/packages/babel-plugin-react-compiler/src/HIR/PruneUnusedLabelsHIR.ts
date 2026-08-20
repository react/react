/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {BlockId, GotoVariant, HIRFunction} from './HIR';

export function pruneUnusedLabelsHIR(fn: HIRFunction): void {
  const merged: Array<{
    label: BlockId;
    next: BlockId;
    fallthrough: BlockId;
  }> = [];
  const rewrites: Map<BlockId, BlockId> = new Map();
  for (const [blockId, block] of fn.body.blocks) {
    const terminal = block.terminal;
    if (terminal.kind === 'label') {
      const {block: nextId, fallthrough: fallthroughId} = terminal;
      const next = fn.body.blocks.get(nextId)!;
      const fallthrough = fn.body.blocks.get(fallthroughId)!;
      if (
        next.terminal.kind === 'goto' &&
        next.terminal.variant === GotoVariant.Break &&
        next.terminal.block === fallthroughId
      ) {
        if (next.kind === 'block' && fallthrough.kind === 'block') {
          // Only merge normal block types
          merged.push({
            label: blockId,
            next: nextId,
            fallthrough: fallthroughId,
          });
        }
      }
    }
  }

  for (const {
    label: originalLabelId,
    next: nextId,
    fallthrough: fallthroughId,
  } of merged) {
    const labelId = rewrites.get(originalLabelId) ?? originalLabelId;
    const label = fn.body.blocks.get(labelId)!;
    const next = fn.body.blocks.get(nextId)!;
    const fallthrough = fn.body.blocks.get(fallthroughId)!;

    // Merge block and fallthrough
    CompilerError.invariant(
      next.phis.size === 0 && fallthrough.phis.size === 0,
      {
        reason: 'Unexpected phis when merging label blocks',
        loc: label.terminal.loc,
      },
    );

    CompilerError.invariant(
      next.preds.size === 1 &&
        fallthrough.preds.size === 1 &&
        next.preds.has(originalLabelId) &&
        fallthrough.preds.has(nextId),
      {
        reason: 'Unexpected block predecessors when merging label blocks',
        loc: label.terminal.loc,
      },
    );

    label.instructions.push(...next.instructions, ...fallthrough.instructions);
    label.terminal = fallthrough.terminal;
    fn.body.blocks.delete(nextId);
    fn.body.blocks.delete(fallthroughId);
    rewrites.set(fallthroughId, labelId);
  }

  for (const [_, block] of fn.body.blocks) {
    for (const pred of block.preds) {
      const rewritten = rewrites.get(pred);
      if (rewritten != null) {
        block.preds.delete(pred);
        block.preds.add(rewritten);
      }
    }
  }
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Merges sequences of blocks that will always execute consecutively —
//! i.e., where the predecessor always transfers control to the successor
//! (ends in a goto) and where the predecessor is the only predecessor
//! for that successor (no other way to reach the successor).
//!
//! Value/loop blocks are left alone because they cannot be merged without
//! breaking the structure of the high-level terminals that reference them.
//!
//! Analogous to TS `HIR/MergeConsecutiveBlocks.ts`.

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_hir::visitors;
use react_compiler_hir::{
    AliasingEffect, BlockId, BlockKind, Effect, GENERATED_SOURCE, HirFunction, Instruction,
    InstructionId, InstructionValue, Place, Terminal,
};
use react_compiler_lowering::mark_predecessors;
use react_compiler_ssa::enter_ssa::placeholder_function;

/// Merge consecutive blocks in the function's CFG, including inner functions.
pub fn merge_consecutive_blocks(func: &mut HirFunction, functions: &mut [HirFunction]) {
    // Collect inner function IDs for recursive processing
    let inner_func_ids: Vec<usize> = func
        .body
        .blocks
        .values()
        .flat_map(|block| block.instructions.iter())
        .filter_map(|instr_id| {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    Some(lowered_func.func.0 as usize)
                }
                _ => None,
            }
        })
        .collect();

    // Recursively merge consecutive blocks in inner functions
    for func_id in inner_func_ids {
        // Use std::mem::replace to temporarily take the inner function out,
        // process it, then put it back (standard borrow checker workaround)
        let mut inner_func = std::mem::replace(&mut functions[func_id], placeholder_function());
        merge_consecutive_blocks(&mut inner_func, functions);
        functions[func_id] = inner_func;
    }

    // Build fallthrough set
    let mut fallthrough_blocks: FxHashSet<BlockId> = FxHashSet::default();
    for block in func.body.blocks.values() {
        if let Some(ft) = visitors::terminal_fallthrough(&block.terminal) {
            fallthrough_blocks.insert(ft);
        }
    }

    let mut merged = MergedBlocks::new();

    // Collect block IDs for iteration (since we modify during iteration)
    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();

    for block_id in &block_ids {
        let block = match func.body.blocks.get(block_id) {
            Some(b) => b,
            None => continue, // already removed
        };

        if block.preds.len() != 1
            || block.kind != BlockKind::Block
            || fallthrough_blocks.contains(block_id)
        {
            continue;
        }

        let original_pred_id = *block.preds.iter().next().unwrap();
        let pred_id = merged.get(original_pred_id);

        // Check predecessor exists and ends in goto with block kind
        let pred_is_mergeable = func
            .body
            .blocks
            .get(&pred_id)
            .map(|p| matches!(p.terminal, Terminal::Goto { .. }) && p.kind == BlockKind::Block)
            .unwrap_or(false);

        if !pred_is_mergeable {
            continue;
        }

        // Get evaluation order from predecessor's terminal (for phi instructions)
        let eval_order = func.body.blocks[&pred_id].terminal.evaluation_order();

        // Collect phi data from the block being merged
        let phis: Vec<_> = block
            .phis
            .iter()
            .map(|phi| {
                assert_eq!(
                    phi.operands.len(),
                    1,
                    "Found a block with a single predecessor but where a phi has multiple ({}) operands",
                    phi.operands.len()
                );
                let operand = phi.operands.values().next().unwrap().clone();
                (phi.place.identifier, operand)
            })
            .collect();
        let block_instr_ids = block.instructions.clone();
        let block_terminal = block.terminal.clone();

        // Create phi instructions and add to instruction table
        let mut new_instr_ids = Vec::new();
        for (identifier, operand) in phis {
            let lvalue = Place {
                identifier,
                effect: Effect::ConditionallyMutate,
                reactive: false,
                loc: GENERATED_SOURCE,
            };
            let instr = Instruction {
                id: eval_order,
                lvalue: lvalue.clone(),
                value: InstructionValue::LoadLocal {
                    place: operand.clone(),
                    loc: GENERATED_SOURCE,
                },
                loc: GENERATED_SOURCE,
                effects: Some(vec![AliasingEffect::Alias {
                    from: operand,
                    into: lvalue,
                }]),
            };
            let instr_id = InstructionId(func.instructions.len() as u32);
            func.instructions.push(instr);
            new_instr_ids.push(instr_id);
        }

        // Apply merge to predecessor
        let pred = func.body.blocks.get_mut(&pred_id).unwrap();
        pred.instructions.extend(new_instr_ids);
        pred.instructions.extend(block_instr_ids);
        pred.terminal = block_terminal;

        // Record merge and remove block
        merged.merge(*block_id, pred_id);
        func.body.blocks.shift_remove(block_id);
    }

    // Update phi operands for merged blocks
    for block in func.body.blocks.values_mut() {
        for phi in &mut block.phis {
            let updates: Vec<_> = phi
                .operands
                .iter()
                .filter_map(|(pred_id, operand)| {
                    let mapped = merged.get(*pred_id);
                    if mapped != *pred_id {
                        Some((*pred_id, mapped, operand.clone()))
                    } else {
                        None
                    }
                })
                .collect();
            for (old_id, new_id, operand) in updates {
                phi.operands.shift_remove(&old_id);
                phi.operands.insert(new_id, operand);
            }
        }
    }

    mark_predecessors(&mut func.body);

    // Update terminal successors (including fallthroughs) for merged blocks
    for block in func.body.blocks.values_mut() {
        visitors::map_terminal_successors(&mut block.terminal, &mut |block_id| {
            merged.get(block_id)
        });
    }
}

/// Tracks which blocks have been merged and into which target.
struct MergedBlocks {
    map: FxHashMap<BlockId, BlockId>,
}

impl MergedBlocks {
    fn new() -> Self {
        Self {
            map: FxHashMap::default(),
        }
    }

    /// Record that `block` was merged into `into`.
    fn merge(&mut self, block: BlockId, into: BlockId) {
        let target = self.get(into);
        self.map.insert(block, target);
    }

    /// Get the id of the block that `block` has been merged into.
    /// Transitive: if A merged into B which merged into C, get(A) returns C.
    fn get(&self, block: BlockId) -> BlockId {
        let mut current = block;
        while let Some(&target) = self.map.get(&current) {
            current = target;
        }
        current
    }
}

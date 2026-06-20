// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Prunes `MaybeThrow` terminals for blocks that can provably never throw.
//!
//! Currently very conservative: only affects blocks with primitives or
//! array/object literals. Even a variable reference could throw due to TDZ.
//!
//! Analogous to TS `Optimization/PruneMaybeThrows.ts`.

use std::collections::HashMap;

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory, GENERATED_SOURCE,
};
use react_compiler_hir::{BlockId, HirFunction, Instruction, InstructionValue, Terminal};
use react_compiler_lowering::{
    get_reverse_postordered_blocks, mark_instruction_ids, remove_dead_do_while_statements,
    remove_unnecessary_try_catch, remove_unreachable_for_updates,
};

use crate::merge_consecutive_blocks::merge_consecutive_blocks;

/// Prune `MaybeThrow` terminals for blocks that cannot throw, then clean up the CFG.
pub fn prune_maybe_throws(
    func: &mut HirFunction,
    functions: &mut [HirFunction],
) -> Result<(), CompilerDiagnostic> {
    let terminal_mapping = prune_maybe_throws_impl(func);
    if let Some(terminal_mapping) = terminal_mapping {
        // If terminals have changed then blocks may have become newly unreachable.
        // Re-run minification of the graph (incl reordering instruction ids).
        func.body.blocks = get_reverse_postordered_blocks(&func.body, &func.instructions);
        remove_unreachable_for_updates(&mut func.body);
        remove_dead_do_while_statements(&mut func.body);
        remove_unnecessary_try_catch(&mut func.body);
        mark_instruction_ids(&mut func.body, &mut func.instructions);
        merge_consecutive_blocks(func, functions);

        // Rewrite phi operands to reference the updated predecessor blocks
        for block in func.body.blocks.values_mut() {
            let preds = &block.preds;
            let mut phi_updates: Vec<(usize, Vec<(BlockId, BlockId)>)> = Vec::new();

            for (phi_idx, phi) in block.phis.iter().enumerate() {
                let mut updates = Vec::new();
                for (predecessor, _) in &phi.operands {
                    if !preds.contains(predecessor) {
                        let mapped_terminal =
                            terminal_mapping.get(predecessor).copied().ok_or_else(|| {
                                CompilerDiagnostic::new(
                                    ErrorCategory::Invariant,
                                    "Expected non-existing phi operand's predecessor to have been mapped to a new terminal",
                                    Some(format!(
                                        "Could not find mapping for predecessor bb{} in block bb{}",
                                        predecessor.0, block.id.0,
                                    )),
                                )
                                .with_detail(CompilerDiagnosticDetail::Error {
                                    loc: GENERATED_SOURCE,
                                    message: None,
                                    identifier_name: None,
                                })
                            })?;
                        updates.push((*predecessor, mapped_terminal));
                    }
                }
                if !updates.is_empty() {
                    phi_updates.push((phi_idx, updates));
                }
            }

            for (phi_idx, updates) in phi_updates {
                for (old_pred, new_pred) in updates {
                    let operand = block.phis[phi_idx]
                        .operands
                        .shift_remove(&old_pred)
                        .unwrap();
                    block.phis[phi_idx].operands.insert(new_pred, operand);
                }
            }
        }
    }
    Ok(())
}

fn prune_maybe_throws_impl(func: &mut HirFunction) -> Option<HashMap<BlockId, BlockId>> {
    let mut terminal_mapping: HashMap<BlockId, BlockId> = HashMap::new();
    let instructions = &func.instructions;

    for block in func.body.blocks.values_mut() {
        let continuation = match &block.terminal {
            Terminal::MaybeThrow { continuation, .. } => *continuation,
            _ => continue,
        };

        let can_throw = block
            .instructions
            .iter()
            .any(|instr_id| instruction_may_throw(&instructions[instr_id.0 as usize]));

        if !can_throw {
            let source = terminal_mapping.get(&block.id).copied().unwrap_or(block.id);
            terminal_mapping.insert(continuation, source);
            // Null out the handler rather than replacing with Goto.
            // Preserving the MaybeThrow makes the continuations clear for
            // BuildReactiveFunction, while nulling out the handler tells us
            // that control cannot flow to the handler.
            if let Terminal::MaybeThrow { handler, .. } = &mut block.terminal {
                *handler = None;
            }
        }
    }

    if terminal_mapping.is_empty() {
        None
    } else {
        Some(terminal_mapping)
    }
}

fn instruction_may_throw(instr: &Instruction) -> bool {
    match &instr.value {
        InstructionValue::Primitive { .. }
        | InstructionValue::ArrayExpression { .. }
        | InstructionValue::ObjectExpression { .. } => false,
        _ => true,
    }
}

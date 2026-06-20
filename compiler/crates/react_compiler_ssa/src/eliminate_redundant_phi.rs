use std::collections::{HashMap, HashSet};

use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors;
use react_compiler_hir::*;

use crate::enter_ssa::placeholder_function;

// =============================================================================
// Helper: rewrite_place
// =============================================================================

fn rewrite_place(place: &mut Place, rewrites: &HashMap<IdentifierId, IdentifierId>) {
    if let Some(&rewrite) = rewrites.get(&place.identifier) {
        place.identifier = rewrite;
    }
}

// =============================================================================
// Public entry point
// =============================================================================

pub fn eliminate_redundant_phi(func: &mut HirFunction, env: &mut Environment) {
    let mut rewrites: HashMap<IdentifierId, IdentifierId> = HashMap::new();
    eliminate_redundant_phi_impl(func, env, &mut rewrites);
}

// =============================================================================
// Inner implementation
// =============================================================================

fn eliminate_redundant_phi_impl(
    func: &mut HirFunction,
    env: &mut Environment,
    rewrites: &mut HashMap<IdentifierId, IdentifierId>,
) {
    let ir = &mut func.body;

    let mut has_back_edge = false;
    let mut visited: HashSet<BlockId> = HashSet::new();

    let mut size;
    loop {
        size = rewrites.len();

        let block_ids: Vec<BlockId> = ir.blocks.keys().copied().collect();
        for block_id in &block_ids {
            let block_id = *block_id;

            if !has_back_edge {
                let block = ir.blocks.get(&block_id).unwrap();
                for pred_id in &block.preds {
                    if !visited.contains(pred_id) {
                        has_back_edge = true;
                    }
                }
            }
            visited.insert(block_id);

            // Find any redundant phis: rewrite operands, identify redundant phis, remove them.
            // Matches TS behavior: each phi's operands are rewritten before checking redundancy,
            // so that rewrites from earlier phis in the same block are visible to later phis.
            let block = ir.blocks.get_mut(&block_id).unwrap();
            block.phis.retain_mut(|phi| {
                // Remap phis in case operands are from eliminated phis
                for (_, operand) in phi.operands.iter_mut() {
                    rewrite_place(operand, rewrites);
                }

                // Find if the phi can be eliminated
                let mut same: Option<IdentifierId> = None;
                let mut is_redundant = true;
                for (_, operand) in &phi.operands {
                    if (same.is_some() && operand.identifier == same.unwrap())
                        || operand.identifier == phi.place.identifier
                    {
                        continue;
                    } else if same.is_some() {
                        is_redundant = false;
                        break;
                    } else {
                        same = Some(operand.identifier);
                    }
                }
                if is_redundant {
                    let same = same.expect("Expected phis to be non-empty");
                    rewrites.insert(phi.place.identifier, same);
                    false // remove this phi
                } else {
                    true // keep this phi
                }
            });

            // Rewrite instructions
            let instruction_ids: Vec<InstructionId> =
                ir.blocks.get(&block_id).unwrap().instructions.clone();

            for instr_id in &instruction_ids {
                let instr_idx = instr_id.0 as usize;
                let instr = &mut func.instructions[instr_idx];

                // Rewrite all lvalues (matches TS eachInstructionLValue)
                rewrite_place(&mut instr.lvalue, rewrites);
                visitors::for_each_instruction_value_lvalue_mut(&mut instr.value, &mut |place| {
                    rewrite_place(place, rewrites);
                });

                // Rewrite operands using canonical visitor
                visitors::for_each_instruction_value_operand_mut(
                    &mut func.instructions[instr_idx].value,
                    &mut |place| {
                        rewrite_place(place, rewrites);
                    },
                );

                // Handle FunctionExpression/ObjectMethod context and recursion
                let instr = &func.instructions[instr_idx];
                let func_expr_id = match &instr.value {
                    InstructionValue::FunctionExpression { lowered_func, .. }
                    | InstructionValue::ObjectMethod { lowered_func, .. } => {
                        Some(lowered_func.func)
                    }
                    _ => None,
                };

                if let Some(fid) = func_expr_id {
                    // Rewrite context places
                    let context = &mut env.functions[fid.0 as usize].context;
                    for place in context.iter_mut() {
                        rewrite_place(place, rewrites);
                    }

                    // Take inner function out, process it, put it back
                    let mut inner_func = std::mem::replace(
                        &mut env.functions[fid.0 as usize],
                        placeholder_function(),
                    );

                    eliminate_redundant_phi_impl(&mut inner_func, env, rewrites);

                    env.functions[fid.0 as usize] = inner_func;
                }
            }

            // Rewrite terminal operands using canonical visitor
            let terminal = &mut ir.blocks.get_mut(&block_id).unwrap().terminal;
            visitors::for_each_terminal_operand_mut(terminal, &mut |place| {
                rewrite_place(place, rewrites);
            });
        }

        if !(rewrites.len() > size && has_back_edge) {
            break;
        }
    }
}

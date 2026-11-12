// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Port of OutlineFunctions from TypeScript (`Optimization/OutlineFunctions.ts`).
//!
//! Extracts anonymous function expressions that do not close over any local
//! variables into top-level outlined functions. The original instruction is
//! replaced with a `LoadGlobal` referencing the outlined function's generated name.
//!
//! Outlining hoists the function to module scope, where it is created exactly
//! once, so every evaluation of the original function expression yields the same
//! object. That is only unobservable when the expression is evaluated at most
//! once per render: otherwise two distinct calls return a shared function, eg
//! `function makeHandler() { return () => 1 }` would compile the arrow to a
//! single `_temp` and `makeHandler() === makeHandler()` would become true.
//!
//! We therefore only outline functions declared in the body of the function
//! being compiled, which runs at most once per render, and skip functions
//! declared inside a loop, which run once per iteration. We intentionally do
//! not recurse into nested functions, since their bodies may run any number of
//! times both per render and across renders.
//!
//! Conditional on `env.config.enable_function_outlining`.

use rustc_hash::FxHashSet;

use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::each_terminal_all_successors;
use react_compiler_hir::{
    BlockId, HIR, HirFunction, IdentifierId, InstructionValue, NonLocalBinding,
};

/// Outline anonymous function expressions that have no captured context variables.
///
/// Ported from TS `outlineFunctions` in `Optimization/OutlineFunctions.ts`.
pub fn outline_functions(
    func: &mut HirFunction,
    env: &mut Environment,
    fbt_operands: &FxHashSet<IdentifierId>,
) {
    let blocks_in_cycles = find_blocks_in_cycles(&func.body);

    // Collect the instructions to outline first, in block/instruction order, so
    // that generated names are allocated in the same order as the TS port.
    let mut to_outline: Vec<usize> = Vec::new();
    for (block_id, block) in &func.body.blocks {
        if blocks_in_cycles.contains(block_id) {
            continue;
        }
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            if let InstructionValue::FunctionExpression { lowered_func, .. } = &instr.value {
                let inner_func = &env.functions[lowered_func.func.0 as usize];

                // Check outlining conditions (TS only checks func.id === null, not name):
                // 1. No captured context variables
                // 2. Anonymous (no explicit id on the inner function)
                // 3. Not an fbt operand
                if inner_func.context.is_empty()
                    && inner_func.id.is_none()
                    && !fbt_operands.contains(&instr.lvalue.identifier)
                {
                    to_outline.push(instr_id.0 as usize);
                }
            }
        }
    }

    for instr_idx in to_outline {
        let function_id = match &func.instructions[instr_idx].value {
            InstructionValue::FunctionExpression { lowered_func, .. } => lowered_func.func,
            _ => continue,
        };

        let hint: Option<String> = env.functions[function_id.0 as usize]
            .id
            .clone()
            .or_else(|| env.functions[function_id.0 as usize].name_hint.clone());
        let generated_name = env.generate_globally_unique_identifier_name(hint.as_deref());

        // Set the id on the inner function
        env.functions[function_id.0 as usize].id = Some(generated_name.clone());

        // Outline the function
        let outlined_func = env.functions[function_id.0 as usize].clone();
        env.outline_function(outlined_func, None);

        // Replace the instruction value with LoadGlobal
        let loc = func.instructions[instr_idx].value.loc().cloned();
        func.instructions[instr_idx].value = InstructionValue::LoadGlobal {
            binding: NonLocalBinding::Global {
                name: generated_name,
            },
            loc,
        };
    }
}

/// Returns the blocks that can execute more than once, ie the blocks that are
/// part of a cycle in the control-flow graph.
fn find_blocks_in_cycles(body: &HIR) -> FxHashSet<BlockId> {
    let mut blocks_in_cycles: FxHashSet<BlockId> = FxHashSet::default();

    for (block_id, block) in &body.blocks {
        // A block executes more than once if and only if it can reach itself.
        let mut visited: FxHashSet<BlockId> = FxHashSet::default();
        let mut stack: Vec<BlockId> = each_terminal_all_successors(&block.terminal);
        while let Some(next) = stack.pop() {
            if next == *block_id {
                blocks_in_cycles.insert(*block_id);
                break;
            }
            if !visited.insert(next) {
                continue;
            }
            if let Some(successor) = body.blocks.get(&next) {
                stack.extend(each_terminal_all_successors(&successor.terminal));
            }
        }
    }

    blocks_in_cycles
}

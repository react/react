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
//! Conditional on `env.config.enable_function_outlining`.

use std::collections::HashSet;

use react_compiler_hir::environment::Environment;
use react_compiler_hir::{
    FunctionId, HirFunction, IdentifierId, InstructionValue, NonLocalBinding,
};
use react_compiler_ssa::enter_ssa::placeholder_function;

/// Outline anonymous function expressions that have no captured context variables.
///
/// Ported from TS `outlineFunctions` in `Optimization/OutlineFunctions.ts`.
pub fn outline_functions(
    func: &mut HirFunction,
    env: &mut Environment,
    fbt_operands: &HashSet<IdentifierId>,
) {
    // Collect per-instruction actions to maintain depth-first name allocation order.
    // Each entry: (instr index, function_id to recurse into, should_outline)
    enum Action {
        /// Recurse into an inner function (FunctionExpression or ObjectMethod)
        Recurse(FunctionId),
        /// Recurse then outline a FunctionExpression
        RecurseAndOutline {
            instr_idx: usize,
            function_id: FunctionId,
        },
    }

    let mut actions: Vec<Action> = Vec::new();

    for block in func.body.blocks.values() {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let lvalue_id = instr.lvalue.identifier;

            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. } => {
                    let inner_func = &env.functions[lowered_func.func.0 as usize];

                    // Check outlining conditions (TS only checks func.id === null, not name):
                    // 1. No captured context variables
                    // 2. Anonymous (no explicit id on the inner function)
                    // 3. Not an fbt operand
                    // 4. Only references names that are in scope at module level
                    if inner_func.context.is_empty()
                        && inner_func.id.is_none()
                        && !fbt_operands.contains(&lvalue_id)
                        && !references_non_module_scope_bindings(inner_func, env)
                    {
                        actions.push(Action::RecurseAndOutline {
                            instr_idx: instr_id.0 as usize,
                            function_id: lowered_func.func,
                        });
                    } else {
                        actions.push(Action::Recurse(lowered_func.func));
                    }
                }
                InstructionValue::ObjectMethod { lowered_func, .. } => {
                    // Recurse into object methods (but don't outline them)
                    actions.push(Action::Recurse(lowered_func.func));
                }
                _ => {}
            }
        }
    }

    // Process actions sequentially: for each instruction, recurse first (depth-first),
    // then generate name and outline. This matches TS ordering where inner functions
    // get names allocated before outer ones.
    for action in actions {
        match action {
            Action::Recurse(function_id) => {
                let mut inner_func = std::mem::replace(
                    &mut env.functions[function_id.0 as usize],
                    placeholder_function(),
                );
                outline_functions(&mut inner_func, env, fbt_operands);
                env.functions[function_id.0 as usize] = inner_func;
            }
            Action::RecurseAndOutline {
                instr_idx,
                function_id,
            } => {
                // First recurse into the inner function (depth-first)
                let mut inner_func = std::mem::replace(
                    &mut env.functions[function_id.0 as usize],
                    placeholder_function(),
                );
                outline_functions(&mut inner_func, env, fbt_operands);
                env.functions[function_id.0 as usize] = inner_func;

                // Then generate the name and outline (after recursion, matching TS order)
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
    }
}

/// Returns true if `func` (or a function nested within it) references a
/// binding that would not be in scope at module level, in which case the
/// function cannot be outlined.
///
/// Ported from TS `referencesNonModuleScopeBindings` in
/// `Optimization/OutlineFunctions.ts`. The TS implementation re-resolves
/// each `LoadGlobal(ModuleLocal)`/`StoreGlobal` name against Babel scope
/// data; the Rust lowering instead records the misclassified names in
/// `env.non_module_scope_names` as it resolves identifiers (see
/// `HirBuilder::resolve_identifier`), which encodes the same fact: the name
/// resolves to a binding *between* module scope and the compiled function
/// (e.g. a local of an enclosing factory function). Hoisting a function that
/// references such a name would move the reference out of the enclosing
/// function's scope and throw a ReferenceError at runtime.
fn references_non_module_scope_bindings(func: &HirFunction, env: &Environment) -> bool {
    for block in func.body.blocks.values() {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::LoadGlobal {
                    binding: NonLocalBinding::ModuleLocal { name },
                    ..
                }
                | InstructionValue::StoreGlobal { name, .. } => {
                    if env.non_module_scope_names.contains(name) {
                        return true;
                    }
                }
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let inner = &env.functions[lowered_func.func.0 as usize];
                    if references_non_module_scope_bindings(inner, env) {
                        return true;
                    }
                }
                _ => {}
            }
        }
    }
    false
}

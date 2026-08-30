/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_diagnostics::{CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::{
    each_instruction_lvalue_ids, each_instruction_value_operand, each_terminal_operand,
};
use react_compiler_hir::{
    Effect, HirFunction, Identifier, IdentifierId, IdentifierName, InstructionValue, Place, Type,
};

/// Validates that local variables cannot be reassigned after render.
/// This prevents a category of bugs in which a closure captures a
/// binding from one render but does not update.
pub fn validate_locals_not_reassigned_after_render(func: &HirFunction, env: &mut Environment) {
    let mut context_variables: FxHashSet<IdentifierId> = FxHashSet::default();
    let mut diagnostics: Vec<CompilerDiagnostic> = Vec::new();

    let reassignment = get_context_reassignment(
        func,
        &env.identifiers,
        &env.types,
        &env.functions,
        env,
        &mut context_variables,
        false,
        false,
        &mut diagnostics,
    );

    // Record accumulated errors (from async function checks in inner functions) first
    for diagnostic in diagnostics {
        env.record_diagnostic(diagnostic);
    }

    // Then record the top-level reassignment error if any
    if let Some(reassignment_place) = reassignment {
        let variable_name = format_variable_name(&reassignment_place, &env.identifiers);
        env.record_diagnostic(
            CompilerDiagnostic::new(
                ErrorCategory::Immutability,
                "Cannot reassign variable after render completes",
                Some(format!(
                    "Reassigning {} after render has completed can cause inconsistent \
                     behavior on subsequent renders. Consider using state instead",
                    variable_name
                )),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: reassignment_place.loc,
                message: Some(format!(
                    "Cannot reassign {} after render completes",
                    variable_name
                )),
                identifier_name: None,
            }),
        );
    }
}

/// Format a variable name for error messages. Uses the named identifier if
/// available, otherwise falls back to "variable".
fn format_variable_name(place: &Place, identifiers: &[Identifier]) -> String {
    let identifier = &identifiers[place.identifier.0 as usize];
    match &identifier.name {
        Some(IdentifierName::Named(name)) => format!("`{}`", name),
        _ => "variable".to_string(),
    }
}

/// Recursively checks whether a function (or its dependencies) reassigns a
/// context variable. Returns the reassigned place if found, or None.
///
/// Side effects: accumulates async-function reassignment diagnostics into `diagnostics`.
fn get_context_reassignment(
    func: &HirFunction,
    identifiers: &[Identifier],
    types: &[Type],
    functions: &[HirFunction],
    env: &Environment,
    context_variables: &mut FxHashSet<IdentifierId>,
    is_function_expression: bool,
    is_async: bool,
    diagnostics: &mut Vec<CompilerDiagnostic>,
) -> Option<Place> {
    // Maps identifiers to the place that they reassign
    let mut reassigning_functions: FxHashMap<IdentifierId, Place> = FxHashMap::default();

    for (_block_id, block) in &func.body.blocks {
        for &instruction_id in &block.instructions {
            let instr = &func.instructions[instruction_id.0 as usize];

            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let inner_function = &functions[lowered_func.func.0 as usize];
                    let inner_is_async = is_async || inner_function.is_async;

                    // Recursively check the inner function
                    let mut reassignment = get_context_reassignment(
                        inner_function,
                        identifiers,
                        types,
                        functions,
                        env,
                        context_variables,
                        true,
                        inner_is_async,
                        diagnostics,
                    );

                    // If the function itself doesn't reassign, check if one of its
                    // dependencies (operands) is a reassigning function
                    if reassignment.is_none() {
                        for context_place in &inner_function.context {
                            if let Some(reassignment_place) =
                                reassigning_functions.get(&context_place.identifier)
                            {
                                reassignment = Some(reassignment_place.clone());
                                break;
                            }
                        }
                    }

                    // If the function or its dependencies reassign, handle it
                    if let Some(ref reassignment_place) = reassignment {
                        if inner_is_async {
                            // Async functions that reassign get an immediate error
                            let variable_name =
                                format_variable_name(reassignment_place, identifiers);
                            diagnostics.push(
                                CompilerDiagnostic::new(
                                    ErrorCategory::Immutability,
                                    "Cannot reassign variable in async function",
                                    Some(
                                        "Reassigning a variable in an async function can cause \
                                         inconsistent behavior on subsequent renders. \
                                         Consider using state instead"
                                            .to_string(),
                                    ),
                                )
                                .with_detail(
                                    CompilerDiagnosticDetail::Error {
                                        loc: reassignment_place.loc,
                                        message: Some(format!("Cannot reassign {}", variable_name)),
                                        identifier_name: None,
                                    },
                                ),
                            );
                            // Return null (don't propagate further) — matches TS behavior
                            return None;
                        } else {
                            // Propagate reassignment info on the lvalue
                            reassigning_functions
                                .insert(instr.lvalue.identifier, reassignment_place.clone());
                        }
                    }
                }

                InstructionValue::StoreLocal { lvalue, value, .. } => {
                    if let Some(reassignment_place) = reassigning_functions.get(&value.identifier) {
                        let reassignment_place = reassignment_place.clone();
                        reassigning_functions
                            .insert(lvalue.place.identifier, reassignment_place.clone());
                        reassigning_functions.insert(instr.lvalue.identifier, reassignment_place);
                    }
                }

                InstructionValue::LoadLocal { place, .. } => {
                    if let Some(reassignment_place) = reassigning_functions.get(&place.identifier) {
                        reassigning_functions
                            .insert(instr.lvalue.identifier, reassignment_place.clone());
                    }
                }

                InstructionValue::DeclareContext { lvalue, .. } => {
                    if !is_function_expression {
                        context_variables.insert(lvalue.place.identifier);
                    }
                }

                InstructionValue::StoreContext { lvalue, value, .. } => {
                    // If we're inside a function expression and the target is a
                    // context variable from the outer scope, this is a reassignment
                    if is_function_expression
                        && context_variables.contains(&lvalue.place.identifier)
                    {
                        return Some(lvalue.place.clone());
                    }

                    // In the outer function, track context variables
                    if !is_function_expression {
                        context_variables.insert(lvalue.place.identifier);
                    }

                    // Propagate reassigning function info through StoreContext
                    if let Some(reassignment_place) = reassigning_functions.get(&value.identifier) {
                        let reassignment_place = reassignment_place.clone();
                        reassigning_functions
                            .insert(lvalue.place.identifier, reassignment_place.clone());
                        reassigning_functions.insert(instr.lvalue.identifier, reassignment_place);
                    }
                }

                _ => {
                    // For calls with noAlias signatures, only check the callee/receiver
                    // (not args) to avoid false positives from callbacks that reassign
                    // context variables.
                    let operands: Vec<Place> = match &instr.value {
                        InstructionValue::CallExpression { callee, .. } => {
                            if env.has_no_alias_signature(callee.identifier) {
                                vec![callee.clone()]
                            } else {
                                each_instruction_value_operand(&instr.value, env)
                            }
                        }
                        InstructionValue::MethodCall {
                            receiver, property, ..
                        } => {
                            if env.has_no_alias_signature(property.identifier) {
                                vec![receiver.clone(), property.clone()]
                            } else {
                                each_instruction_value_operand(&instr.value, env)
                            }
                        }
                        InstructionValue::TaggedTemplateExpression { tag, .. } => {
                            if env.has_no_alias_signature(tag.identifier) {
                                vec![tag.clone()]
                            } else {
                                each_instruction_value_operand(&instr.value, env)
                            }
                        }
                        _ => each_instruction_value_operand(&instr.value, env),
                    };

                    for operand in &operands {
                        // Invariant: effects must be inferred before this pass runs
                        assert!(
                            operand.effect != Effect::Unknown,
                            "Expected effects to be inferred prior to \
                             ValidateLocalsNotReassignedAfterRender"
                        );

                        if let Some(reassignment_place) =
                            reassigning_functions.get(&operand.identifier).cloned()
                        {
                            if operand.effect == Effect::Freeze {
                                // Functions that reassign local variables are inherently
                                // mutable and unsafe to pass where a frozen value is expected.
                                return Some(reassignment_place);
                            } else {
                                // If the operand is not frozen but does reassign, then the
                                // lvalues of the instruction could also be reassigning
                                for lvalue_id in each_instruction_lvalue_ids(instr) {
                                    reassigning_functions
                                        .insert(lvalue_id, reassignment_place.clone());
                                }
                            }
                        }
                    }
                }
            }
        }

        // Check terminal operands for reassigning functions
        for operand in each_terminal_operand(&block.terminal) {
            if let Some(reassignment_place) = reassigning_functions.get(&operand.identifier) {
                return Some(reassignment_place.clone());
            }
        }
    }

    None
}

/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use std::collections::{HashMap, HashSet};

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory, SourceLocation,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::{each_instruction_value_operand, each_terminal_operand};
use react_compiler_hir::{
    AliasingEffect, Effect, HirFunction, Identifier, IdentifierId, IdentifierName,
    InstructionValue, Place, Type,
};

/// Information about a known mutation effect: which identifier is mutated, and
/// the source location of the mutation.
#[derive(Debug, Clone)]
struct MutationInfo {
    value_identifier: IdentifierId,
    value_loc: Option<SourceLocation>,
}

/// Validates that functions with known mutations (ie due to types) cannot be passed
/// where a frozen value is expected.
///
/// Because a function that mutates a captured variable is equivalent to a mutable value,
/// and the receiver has no way to avoid calling the function, this pass detects functions
/// with *known* mutations (Mutate or MutateTransitive, not conditional) that are passed
/// where a frozen value is expected and reports an error.
pub fn validate_no_freezing_known_mutable_functions(func: &HirFunction, env: &mut Environment) {
    let diagnostics = check_no_freezing_known_mutable_functions(
        func,
        &env.identifiers,
        &env.types,
        &env.functions,
        env,
    );
    for diagnostic in diagnostics {
        env.record_diagnostic(diagnostic);
    }
}

fn check_no_freezing_known_mutable_functions(
    func: &HirFunction,
    identifiers: &[Identifier],
    types: &[Type],
    functions: &[HirFunction],
    env: &Environment,
) -> Vec<CompilerDiagnostic> {
    // Maps an identifier to the mutation effect that makes it "known mutable"
    let mut context_mutation_effects: HashMap<IdentifierId, MutationInfo> = HashMap::new();
    let mut diagnostics: Vec<CompilerDiagnostic> = Vec::new();

    for (_block_id, block) in &func.body.blocks {
        for &instruction_id in &block.instructions {
            let instr = &func.instructions[instruction_id.0 as usize];

            match &instr.value {
                InstructionValue::LoadLocal { place, .. } => {
                    // Propagate known mutation from the loaded place to the lvalue
                    if let Some(mutation_info) = context_mutation_effects.get(&place.identifier) {
                        context_mutation_effects
                            .insert(instr.lvalue.identifier, mutation_info.clone());
                    }
                }

                InstructionValue::StoreLocal { lvalue, value, .. } => {
                    // Propagate known mutation from the stored value to both the
                    // instruction lvalue and the StoreLocal's target lvalue
                    if let Some(mutation_info) = context_mutation_effects.get(&value.identifier) {
                        let mutation_info = mutation_info.clone();
                        context_mutation_effects
                            .insert(instr.lvalue.identifier, mutation_info.clone());
                        context_mutation_effects.insert(lvalue.place.identifier, mutation_info);
                    }
                }

                InstructionValue::FunctionExpression { lowered_func, .. } => {
                    let inner_function = &functions[lowered_func.func.0 as usize];
                    if let Some(ref aliasing_effects) = inner_function.aliasing_effects {
                        let context_ids: HashSet<IdentifierId> = inner_function
                            .context
                            .iter()
                            .map(|place| place.identifier)
                            .collect();

                        'effects: for effect in aliasing_effects {
                            match effect {
                                AliasingEffect::Mutate { value, .. }
                                | AliasingEffect::MutateTransitive { value, .. } => {
                                    // If the mutated value is already known-mutable, propagate
                                    if let Some(known_mutation) =
                                        context_mutation_effects.get(&value.identifier)
                                    {
                                        context_mutation_effects.insert(
                                            instr.lvalue.identifier,
                                            known_mutation.clone(),
                                        );
                                    } else if context_ids.contains(&value.identifier)
                                        && !is_ref_or_ref_like_mutable_type(
                                            value.identifier,
                                            identifiers,
                                            types,
                                        )
                                    {
                                        // New known mutation of a context variable
                                        context_mutation_effects.insert(
                                            instr.lvalue.identifier,
                                            MutationInfo {
                                                value_identifier: value.identifier,
                                                value_loc: value.loc,
                                            },
                                        );
                                        break 'effects;
                                    }
                                }

                                AliasingEffect::MutateConditionally { value, .. }
                                | AliasingEffect::MutateTransitiveConditionally { value, .. } => {
                                    // Only propagate existing known mutations for conditional effects
                                    if let Some(known_mutation) =
                                        context_mutation_effects.get(&value.identifier)
                                    {
                                        context_mutation_effects.insert(
                                            instr.lvalue.identifier,
                                            known_mutation.clone(),
                                        );
                                    }
                                }

                                _ => {}
                            }
                        }
                    }
                }

                _ => {
                    // For all other instruction kinds, check operands for freeze violations
                    for operand in each_instruction_value_operand(&instr.value, env) {
                        check_operand_for_freeze_violation(
                            &operand,
                            &context_mutation_effects,
                            identifiers,
                            &mut diagnostics,
                        );
                    }
                }
            }
        }

        // Also check terminal operands
        for operand in each_terminal_operand(&block.terminal) {
            check_operand_for_freeze_violation(
                &operand,
                &context_mutation_effects,
                identifiers,
                &mut diagnostics,
            );
        }
    }

    diagnostics
}

/// If an operand with Effect::Freeze is a known-mutable function, emit a diagnostic.
fn check_operand_for_freeze_violation(
    operand: &Place,
    context_mutation_effects: &HashMap<IdentifierId, MutationInfo>,
    identifiers: &[Identifier],
    diagnostics: &mut Vec<CompilerDiagnostic>,
) {
    if operand.effect == Effect::Freeze {
        if let Some(mutation_info) = context_mutation_effects.get(&operand.identifier) {
            let identifier = &identifiers[mutation_info.value_identifier.0 as usize];
            let variable_name = match &identifier.name {
                Some(IdentifierName::Named(name)) => format!("`{}`", name),
                _ => "a local variable".to_string(),
            };

            diagnostics.push(
                CompilerDiagnostic::new(
                    ErrorCategory::Immutability,
                    "Cannot modify local variables after render completes",
                    Some(format!(
                        "This argument is a function which may reassign or mutate {} after render, \
                         which can cause inconsistent behavior on subsequent renders. \
                         Consider using state instead",
                        variable_name
                    )),
                )
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc: operand.loc,
                    message: Some(format!(
                        "This function may (indirectly) reassign or modify {} after render",
                        variable_name
                    )),
                    identifier_name: None,
                })
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc: mutation_info.value_loc,
                    message: Some(format!("This modifies {}", variable_name)),
                    identifier_name: None,
                }),
            );
        }
    }
}

/// Check if an identifier's type is a ref or ref-like mutable type.
fn is_ref_or_ref_like_mutable_type(
    identifier_id: IdentifierId,
    identifiers: &[Identifier],
    types: &[Type],
) -> bool {
    let identifier = &identifiers[identifier_id.0 as usize];
    react_compiler_hir::is_ref_or_ref_like_mutable_type(&types[identifier.type_.0 as usize])
}

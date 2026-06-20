// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Validates that the function does not unconditionally call setState during render.
//!
//! Port of ValidateNoSetStateInRender.ts.

use std::collections::HashSet;

use react_compiler_diagnostics::{CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory};
use react_compiler_hir::dominator::compute_unconditional_blocks;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{BlockId, HirFunction, Identifier, IdentifierId, InstructionValue, Type};

pub fn validate_no_set_state_in_render(
    func: &HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerDiagnostic> {
    let mut unconditional_set_state_functions: HashSet<IdentifierId> = HashSet::new();
    let next_block_id = env.next_block_id().0;
    let diagnostics = validate_impl(
        func,
        &env.identifiers,
        &env.types,
        &env.functions,
        next_block_id,
        env.config.enable_use_keyed_state,
        &mut unconditional_set_state_functions,
    )?;
    for diag in diagnostics {
        env.record_diagnostic(diag);
    }
    Ok(())
}

fn is_set_state_id(
    identifier_id: IdentifierId,
    identifiers: &[Identifier],
    types: &[Type],
) -> bool {
    let ident = &identifiers[identifier_id.0 as usize];
    let ty = &types[ident.type_.0 as usize];
    react_compiler_hir::is_set_state_type(ty)
}

fn validate_impl(
    func: &HirFunction,
    identifiers: &[Identifier],
    types: &[Type],
    functions: &[HirFunction],
    next_block_id_counter: u32,
    enable_use_keyed_state: bool,
    unconditional_set_state_functions: &mut HashSet<IdentifierId>,
) -> Result<Vec<CompilerDiagnostic>, CompilerDiagnostic> {
    let unconditional_blocks: HashSet<BlockId> =
        compute_unconditional_blocks(func, next_block_id_counter)?;
    let mut active_manual_memo_id: Option<u32> = None;
    let mut errors: Vec<CompilerDiagnostic> = Vec::new();

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::LoadLocal { place, .. } => {
                    if unconditional_set_state_functions.contains(&place.identifier) {
                        unconditional_set_state_functions.insert(instr.lvalue.identifier);
                    }
                }
                InstructionValue::StoreLocal { lvalue, value, .. } => {
                    if unconditional_set_state_functions.contains(&value.identifier) {
                        unconditional_set_state_functions.insert(lvalue.place.identifier);
                        unconditional_set_state_functions.insert(instr.lvalue.identifier);
                    }
                }
                InstructionValue::ObjectMethod { lowered_func, .. }
                | InstructionValue::FunctionExpression { lowered_func, .. } => {
                    let inner_func = &functions[lowered_func.func.0 as usize];

                    // Check if any operand references a setState.
                    // For FunctionExpression/ObjectMethod, operands are the context captures.
                    let has_set_state_operand = inner_func.context.iter().any(|ctx_place| {
                        is_set_state_id(ctx_place.identifier, identifiers, types)
                            || unconditional_set_state_functions.contains(&ctx_place.identifier)
                    });

                    if has_set_state_operand {
                        let inner_errors = validate_impl(
                            inner_func,
                            identifiers,
                            types,
                            functions,
                            next_block_id_counter,
                            enable_use_keyed_state,
                            unconditional_set_state_functions,
                        )?;
                        if !inner_errors.is_empty() {
                            unconditional_set_state_functions.insert(instr.lvalue.identifier);
                        }
                    }
                }
                InstructionValue::StartMemoize { manual_memo_id, .. } => {
                    assert!(
                        active_manual_memo_id.is_none(),
                        "Unexpected nested StartMemoize instructions"
                    );
                    active_manual_memo_id = Some(*manual_memo_id);
                }
                InstructionValue::FinishMemoize { manual_memo_id, .. } => {
                    assert!(
                        active_manual_memo_id == Some(*manual_memo_id),
                        "Expected FinishMemoize to align with previous StartMemoize instruction"
                    );
                    active_manual_memo_id = None;
                }
                InstructionValue::CallExpression { callee, .. } => {
                    if is_set_state_id(callee.identifier, identifiers, types)
                        || unconditional_set_state_functions.contains(&callee.identifier)
                    {
                        if active_manual_memo_id.is_some() {
                            errors.push(
                                CompilerDiagnostic::new(
                                    ErrorCategory::RenderSetState,
                                    "Calling setState from useMemo may trigger an infinite loop",
                                    Some(
                                        "Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render. (https://react.dev/reference/react/useState)".to_string(),
                                    ),
                                )
                                .with_detail(CompilerDiagnosticDetail::Error {
                                    loc: callee.loc,
                                    message: Some("Found setState() within useMemo()".to_string()),
                                    identifier_name: None,
                                }),
                            );
                        } else if unconditional_blocks.contains(&block.id) {
                            if enable_use_keyed_state {
                                errors.push(
                                    CompilerDiagnostic::new(
                                        ErrorCategory::RenderSetState,
                                        "Cannot call setState during render",
                                        Some(
                                            "Calling setState during render may trigger an infinite loop.\n\
                                            * To reset state when other state/props change, use `const [state, setState] = useKeyedState(initialState, key)` to reset `state` when `key` changes.\n\
                                            * To derive data from other state/props, compute the derived data during render without using state".to_string(),
                                        ),
                                    )
                                    .with_detail(CompilerDiagnosticDetail::Error {
                                        loc: callee.loc,
                                        message: Some("Found setState() in render".to_string()),
                                        identifier_name: None,
                                    }),
                                );
                            } else {
                                errors.push(
                                    CompilerDiagnostic::new(
                                        ErrorCategory::RenderSetState,
                                        "Cannot call setState during render",
                                        Some(
                                            "Calling setState during render may trigger an infinite loop.\n\
                                            * To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders\n\
                                            * To derive data from other state/props, compute the derived data during render without using state".to_string(),
                                        ),
                                    )
                                    .with_detail(CompilerDiagnosticDetail::Error {
                                        loc: callee.loc,
                                        message: Some("Found setState() in render".to_string()),
                                        identifier_name: None,
                                    }),
                                );
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    Ok(errors)
}

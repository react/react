// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! PruneHoistedContexts — removes hoisted context variable declarations
//! and transforms references to their original instruction kinds.
//!
//! Corresponds to `src/ReactiveScopes/PruneHoistedContexts.ts`.

use rustc_hash::FxHashMap;

use react_compiler_diagnostics::{CompilerError, CompilerErrorDetail, ErrorCategory};
use react_compiler_hir::{
    EvaluationOrder, IdentifierId, InstructionKind, InstructionValue, Place, ReactiveFunction,
    ReactiveInstruction, ReactiveScopeBlock, ReactiveStatement, ReactiveValue,
    environment::Environment,
};

use crate::visitors::{ReactiveFunctionTransform, Transformed, transform_reactive_function};

// =============================================================================
// Public entry point
// =============================================================================

/// Prunes DeclareContexts lowered for HoistedConsts and transforms any
/// references back to their original instruction kind.
/// TS: `pruneHoistedContexts`
pub fn prune_hoisted_contexts(
    func: &mut ReactiveFunction,
    env: &Environment,
) -> Result<(), CompilerError> {
    let mut transform = Transform { env };
    let mut state = VisitorState {
        active_scopes: Vec::new(),
        uninitialized: FxHashMap::default(),
    };
    transform_reactive_function(func, &mut transform, &mut state)
}

// =============================================================================
// State
// =============================================================================

#[derive(Debug, Clone)]
enum UninitializedKind {
    UnknownKind,
    Func { definition: Option<IdentifierId> },
}

struct VisitorState {
    active_scopes: Vec<rustc_hash::FxHashSet<IdentifierId>>,
    uninitialized: FxHashMap<IdentifierId, UninitializedKind>,
}

impl VisitorState {
    fn find_in_active_scopes(&self, id: IdentifierId) -> bool {
        for scope in &self.active_scopes {
            if scope.contains(&id) {
                return true;
            }
        }
        false
    }
}

struct Transform<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionTransform for Transform<'a> {
    type State = VisitorState;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut VisitorState,
    ) -> Result<(), CompilerError> {
        let scope_data = &self.env.scopes[scope.scope.0 as usize];
        let decl_ids: rustc_hash::FxHashSet<IdentifierId> =
            scope_data.declarations.iter().map(|(id, _)| *id).collect();

        // Add declared but not initialized variables
        for (_, decl) in &scope_data.declarations {
            state
                .uninitialized
                .insert(decl.identifier, UninitializedKind::UnknownKind);
        }

        state.active_scopes.push(decl_ids);
        self.traverse_scope(scope, state)?;
        state.active_scopes.pop();

        // Clean up uninitialized after scope
        let scope_data = &self.env.scopes[scope.scope.0 as usize];
        for (_, decl) in &scope_data.declarations {
            state.uninitialized.remove(&decl.identifier);
        }
        Ok(())
    }

    fn visit_place(
        &mut self,
        _id: EvaluationOrder,
        place: &Place,
        state: &mut VisitorState,
    ) -> Result<(), CompilerError> {
        if let Some(kind) = state.uninitialized.get(&place.identifier) {
            if let UninitializedKind::Func { definition } = kind {
                if *definition != Some(place.identifier) {
                    let mut err = CompilerError::new();
                    err.push_error_detail(
                        CompilerErrorDetail::new(
                            ErrorCategory::Todo,
                            "[PruneHoistedContexts] Rewrite hoisted function references"
                                .to_string(),
                        )
                        .with_loc(place.loc),
                    );
                    return Err(err);
                }
            }
        }
        Ok(())
    }

    fn transform_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        state: &mut VisitorState,
    ) -> Result<Transformed<ReactiveStatement>, CompilerError> {
        // Remove hoisted declarations to preserve TDZ
        if let ReactiveValue::Instruction(InstructionValue::DeclareContext { lvalue, .. }) =
            &instruction.value
        {
            let maybe_non_hoisted = convert_hoisted_lvalue_kind(lvalue.kind);
            if let Some(non_hoisted) = maybe_non_hoisted {
                if non_hoisted == InstructionKind::Function
                    && state.uninitialized.contains_key(&lvalue.place.identifier)
                {
                    state.uninitialized.insert(
                        lvalue.place.identifier,
                        UninitializedKind::Func { definition: None },
                    );
                }
                return Ok(Transformed::Remove);
            }
        }

        if let ReactiveValue::Instruction(InstructionValue::StoreContext { lvalue, .. }) =
            &mut instruction.value
        {
            if lvalue.kind != InstructionKind::Reassign {
                let lvalue_id = lvalue.place.identifier;
                let is_declared_by_scope = state.find_in_active_scopes(lvalue_id);
                if is_declared_by_scope {
                    if lvalue.kind == InstructionKind::Let || lvalue.kind == InstructionKind::Const
                    {
                        lvalue.kind = InstructionKind::Reassign;
                    } else if lvalue.kind == InstructionKind::Function {
                        if let Some(kind) = state.uninitialized.get(&lvalue_id) {
                            if !matches!(kind, UninitializedKind::Func { .. }) {
                                let mut err = CompilerError::new();
                                err.push_error_detail(
                                    CompilerErrorDetail::new(
                                        ErrorCategory::Invariant,
                                        "[PruneHoistedContexts] Unexpected hoisted function"
                                            .to_string(),
                                    )
                                    .with_loc(instruction.loc),
                                );
                                return Err(err);
                            }
                            // References to hoisted functions are now "safe" as
                            // variable assignments have finished.
                            state.uninitialized.remove(&lvalue_id);
                        }
                    } else {
                        let mut err = CompilerError::new();
                        err.push_error_detail(
                            CompilerErrorDetail::new(
                                ErrorCategory::Todo,
                                "[PruneHoistedContexts] Unexpected kind".to_string(),
                            )
                            .with_loc(instruction.loc),
                        );
                        return Err(err);
                    }
                }
            }
        }

        self.visit_instruction(instruction, state)?;
        Ok(Transformed::Keep)
    }
}

/// Corresponds to TS `convertHoistedLValueKind` — returns None for non-hoisted kinds.
fn convert_hoisted_lvalue_kind(kind: InstructionKind) -> Option<InstructionKind> {
    match kind {
        InstructionKind::HoistedLet => Some(InstructionKind::Let),
        InstructionKind::HoistedConst => Some(InstructionKind::Const),
        InstructionKind::HoistedFunction => Some(InstructionKind::Function),
        _ => None,
    }
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Assert that all instructions involved in creating values for a given scope
//! are within the corresponding ReactiveScopeBlock.
//!
//! Corresponds to `src/ReactiveScopes/AssertScopeInstructionsWithinScope.ts`.

use rustc_hash::FxHashSet;

use react_compiler_diagnostics::{CompilerDiagnostic, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{EvaluationOrder, Place, ReactiveFunction, ReactiveScopeBlock, ScopeId};

use crate::visitors::{ReactiveFunctionVisitor, visit_reactive_function};

/// Assert that scope instructions are within their scopes.
/// Two-pass visitor:
/// 1. Collect all scope IDs
/// 2. Check that places referencing those scopes are within active scope blocks
pub fn assert_scope_instructions_within_scopes(
    func: &ReactiveFunction,
    env: &Environment,
) -> Result<(), CompilerDiagnostic> {
    // Pass 1: Collect all scope IDs
    let mut existing_scopes: FxHashSet<ScopeId> = FxHashSet::default();
    let find_visitor = FindAllScopesVisitor { env };
    visit_reactive_function(func, &find_visitor, &mut existing_scopes);

    // Pass 2: Check instructions against scopes
    let check_visitor = CheckInstructionsAgainstScopesVisitor { env };
    let mut check_state = CheckState {
        existing_scopes,
        active_scopes: FxHashSet::default(),
        error: None,
    };
    visit_reactive_function(func, &check_visitor, &mut check_state);
    if let Some(err) = check_state.error {
        return Err(err);
    }
    Ok(())
}

// =============================================================================
// Pass 1: Find all scopes
// =============================================================================

struct FindAllScopesVisitor<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionVisitor for FindAllScopesVisitor<'a> {
    type State = FxHashSet<ScopeId>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_scope(&self, scope: &ReactiveScopeBlock, state: &mut FxHashSet<ScopeId>) {
        self.traverse_scope(scope, state);
        state.insert(scope.scope);
    }
}

// =============================================================================
// Pass 2: Check instructions against scopes
// =============================================================================

struct CheckState {
    existing_scopes: FxHashSet<ScopeId>,
    active_scopes: FxHashSet<ScopeId>,
    error: Option<CompilerDiagnostic>,
}

struct CheckInstructionsAgainstScopesVisitor<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionVisitor for CheckInstructionsAgainstScopesVisitor<'a> {
    type State = CheckState;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_place(&self, id: EvaluationOrder, place: &Place, state: &mut CheckState) {
        // getPlaceScope: check if the place's identifier has a scope that is active at this id
        let identifier = &self.env.identifiers[place.identifier.0 as usize];
        if let Some(scope_id) = identifier.scope {
            let scope = &self.env.scopes[scope_id.0 as usize];
            // isScopeActive: id >= scope.range.start && id < scope.range.end
            let is_active_at_id = id >= scope.range.start && id < scope.range.end;
            if is_active_at_id
                && state.existing_scopes.contains(&scope_id)
                && !state.active_scopes.contains(&scope_id)
            {
                state.error = Some(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Encountered an instruction that should be part of a scope, \
                     but where that scope has already completed",
                    Some(format!(
                        "Instruction [{:?}] is part of scope @{:?}, \
                         but that scope has already completed",
                        id, scope_id
                    )),
                ));
            }
        }
    }

    fn visit_scope(&self, scope: &ReactiveScopeBlock, state: &mut CheckState) {
        state.active_scopes.insert(scope.scope);
        self.traverse_scope(scope, state);
        state.active_scopes.remove(&scope.scope);
    }
}

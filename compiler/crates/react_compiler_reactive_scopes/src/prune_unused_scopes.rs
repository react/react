// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! PruneUnusedScopes — converts scopes without outputs into regular blocks.
//!
//! Corresponds to `src/ReactiveScopes/PruneUnusedScopes.ts`.

use react_compiler_hir::{
    PrunedReactiveScopeBlock, ReactiveFunction, ReactiveScopeBlock, ReactiveStatement,
    ReactiveTerminal, ReactiveTerminalStatement, environment::Environment,
};

use crate::visitors::{ReactiveFunctionTransform, Transformed, transform_reactive_function};

struct State {
    has_return_statement: bool,
}

/// Converts scopes without outputs into pruned-scopes (regular blocks).
/// TS: `pruneUnusedScopes`
pub fn prune_unused_scopes(
    func: &mut ReactiveFunction,
    env: &Environment,
) -> Result<(), react_compiler_diagnostics::CompilerError> {
    let mut transform = Transform { env };
    let mut state = State {
        has_return_statement: false,
    };
    transform_reactive_function(func, &mut transform, &mut state)
}

struct Transform<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionTransform for Transform<'a> {
    type State = State;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_terminal(
        &mut self,
        stmt: &mut ReactiveTerminalStatement,
        state: &mut State,
    ) -> Result<(), react_compiler_diagnostics::CompilerError> {
        self.traverse_terminal(stmt, state)?;
        if matches!(stmt.terminal, ReactiveTerminal::Return { .. }) {
            state.has_return_statement = true;
        }
        Ok(())
    }

    fn transform_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        _state: &mut State,
    ) -> Result<Transformed<ReactiveStatement>, react_compiler_diagnostics::CompilerError> {
        let mut scope_state = State {
            has_return_statement: false,
        };
        self.visit_scope(scope, &mut scope_state)?;

        let scope_id = scope.scope;
        let scope_data = &self.env.scopes[scope_id.0 as usize];

        if !scope_state.has_return_statement
            && scope_data.reassignments.is_empty()
            && (scope_data.declarations.is_empty() || !has_own_declaration(scope_data, scope_id))
        {
            // Replace with pruned scope
            Ok(Transformed::Replace(ReactiveStatement::PrunedScope(
                PrunedReactiveScopeBlock {
                    scope: scope.scope,
                    instructions: std::mem::take(&mut scope.instructions),
                },
            )))
        } else {
            Ok(Transformed::Keep)
        }
    }
}

/// Does the scope block declare any values of its own?
/// Returns false if all declarations are propagated from nested scopes.
/// TS: `hasOwnDeclaration`
fn has_own_declaration(
    scope_data: &react_compiler_hir::ReactiveScope,
    scope_id: react_compiler_hir::ScopeId,
) -> bool {
    for (_, decl) in &scope_data.declarations {
        if decl.scope == scope_id {
            return true;
        }
    }
    false
}

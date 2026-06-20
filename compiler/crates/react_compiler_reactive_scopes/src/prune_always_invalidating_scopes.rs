// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! PruneAlwaysInvalidatingScopes
//!
//! Some instructions will *always* produce a new value, and unless memoized will *always*
//! invalidate downstream reactive scopes. This pass finds such values and prunes downstream
//! memoization.
//!
//! Corresponds to `src/ReactiveScopes/PruneAlwaysInvalidatingScopes.ts`.

use std::collections::HashSet;

use react_compiler_hir::{
    IdentifierId, InstructionValue, PrunedReactiveScopeBlock, ReactiveFunction,
    ReactiveInstruction, ReactiveScopeBlock, ReactiveStatement, ReactiveValue,
    environment::Environment,
};

use crate::visitors::{ReactiveFunctionTransform, Transformed, transform_reactive_function};

/// Prunes scopes that always invalidate because they depend on unmemoized
/// always-invalidating values.
/// TS: `pruneAlwaysInvalidatingScopes`
pub fn prune_always_invalidating_scopes(
    func: &mut ReactiveFunction,
    env: &Environment,
) -> Result<(), react_compiler_diagnostics::CompilerError> {
    let mut transform = Transform {
        env,
        always_invalidating_values: HashSet::new(),
        unmemoized_values: HashSet::new(),
    };
    let mut state = false; // withinScope
    transform_reactive_function(func, &mut transform, &mut state)
}

struct Transform<'a> {
    env: &'a Environment,
    always_invalidating_values: HashSet<IdentifierId>,
    unmemoized_values: HashSet<IdentifierId>,
}

impl<'a> ReactiveFunctionTransform for Transform<'a> {
    type State = bool; // withinScope

    fn env(&self) -> &Environment {
        self.env
    }

    fn transform_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        within_scope: &mut bool,
    ) -> Result<Transformed<ReactiveStatement>, react_compiler_diagnostics::CompilerError> {
        self.visit_instruction(instruction, within_scope)?;

        let lvalue = &instruction.lvalue;
        match &instruction.value {
            ReactiveValue::Instruction(
                InstructionValue::ArrayExpression { .. }
                | InstructionValue::ObjectExpression { .. }
                | InstructionValue::JsxExpression { .. }
                | InstructionValue::JsxFragment { .. }
                | InstructionValue::NewExpression { .. },
            ) => {
                if let Some(lv) = lvalue {
                    self.always_invalidating_values.insert(lv.identifier);
                    if !*within_scope {
                        self.unmemoized_values.insert(lv.identifier);
                    }
                }
            }
            ReactiveValue::Instruction(InstructionValue::StoreLocal {
                value: store_value,
                lvalue: store_lvalue,
                ..
            }) => {
                if self
                    .always_invalidating_values
                    .contains(&store_value.identifier)
                {
                    self.always_invalidating_values
                        .insert(store_lvalue.place.identifier);
                }
                if self.unmemoized_values.contains(&store_value.identifier) {
                    self.unmemoized_values.insert(store_lvalue.place.identifier);
                }
            }
            ReactiveValue::Instruction(InstructionValue::LoadLocal { place, .. }) => {
                if let Some(lv) = lvalue {
                    if self.always_invalidating_values.contains(&place.identifier) {
                        self.always_invalidating_values.insert(lv.identifier);
                    }
                    if self.unmemoized_values.contains(&place.identifier) {
                        self.unmemoized_values.insert(lv.identifier);
                    }
                }
            }
            _ => {}
        }
        Ok(Transformed::Keep)
    }

    fn transform_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        _within_scope: &mut bool,
    ) -> Result<Transformed<ReactiveStatement>, react_compiler_diagnostics::CompilerError> {
        let mut within_scope = true;
        self.visit_scope(scope, &mut within_scope)?;

        let scope_id = scope.scope;
        let scope_data = &self.env.scopes[scope_id.0 as usize];

        for dep in &scope_data.dependencies {
            if self.unmemoized_values.contains(&dep.identifier) {
                // This scope depends on an always-invalidating value, prune it
                // Propagate always-invalidating and unmemoized to declarations/reassignments
                let decl_ids: Vec<IdentifierId> = scope_data
                    .declarations
                    .iter()
                    .map(|(_, decl)| decl.identifier)
                    .collect();
                let reassign_ids: Vec<IdentifierId> = scope_data.reassignments.clone();

                for id in &decl_ids {
                    if self.always_invalidating_values.contains(id) {
                        self.unmemoized_values.insert(*id);
                    }
                }
                for id in &reassign_ids {
                    if self.always_invalidating_values.contains(id) {
                        self.unmemoized_values.insert(*id);
                    }
                }

                return Ok(Transformed::Replace(ReactiveStatement::PrunedScope(
                    PrunedReactiveScopeBlock {
                        scope: scope.scope,
                        instructions: std::mem::take(&mut scope.instructions),
                    },
                )));
            }
        }
        Ok(Transformed::Keep)
    }
}

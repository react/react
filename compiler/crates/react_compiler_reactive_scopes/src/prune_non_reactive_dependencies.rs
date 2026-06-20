// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! PruneNonReactiveDependencies + CollectReactiveIdentifiers
//!
//! Corresponds to `src/ReactiveScopes/PruneNonReactiveDependencies.ts`
//! and `src/ReactiveScopes/CollectReactiveIdentifiers.ts`.

use std::collections::HashSet;

use react_compiler_hir::{
    EvaluationOrder, IdentifierId, InstructionValue, Place, PrunedReactiveScopeBlock,
    ReactiveFunction, ReactiveInstruction, ReactiveScopeBlock, ReactiveValue,
    environment::Environment, is_primitive_type, is_use_ref_type, object_shape,
    visitors as hir_visitors,
};

use crate::visitors::{self, ReactiveFunctionTransform, ReactiveFunctionVisitor};

// =============================================================================
// CollectReactiveIdentifiers
// =============================================================================

/// Collects identifiers that are reactive.
/// TS: `collectReactiveIdentifiers`
pub fn collect_reactive_identifiers(
    func: &ReactiveFunction,
    env: &Environment,
) -> HashSet<IdentifierId> {
    let visitor = CollectVisitor { env };
    let mut state = HashSet::new();
    crate::visitors::visit_reactive_function(func, &visitor, &mut state);
    state
}

struct CollectVisitor<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionVisitor for CollectVisitor<'a> {
    type State = HashSet<IdentifierId>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_lvalue(&self, id: EvaluationOrder, lvalue: &Place, state: &mut Self::State) {
        // Visitors don't visit lvalues as places by default, but we want to visit all places
        self.visit_place(id, lvalue, state);
    }

    fn visit_place(&self, _id: EvaluationOrder, place: &Place, state: &mut Self::State) {
        if place.reactive {
            state.insert(place.identifier);
        }
    }

    fn visit_pruned_scope(&self, scope: &PrunedReactiveScopeBlock, state: &mut Self::State) {
        self.traverse_pruned_scope(scope, state);

        let scope_data = &self.env.scopes[scope.scope.0 as usize];
        for (_id, decl) in &scope_data.declarations {
            let identifier = &self.env.identifiers[decl.identifier.0 as usize];
            let ty = &self.env.types[identifier.type_.0 as usize];
            if !is_primitive_type(ty) && !is_stable_ref_type(ty, state, identifier.id) {
                state.insert(*_id);
            }
        }
    }
}

/// TS: `isStableRefType`
fn is_stable_ref_type(
    ty: &react_compiler_hir::Type,
    reactive_identifiers: &HashSet<IdentifierId>,
    id: IdentifierId,
) -> bool {
    is_use_ref_type(ty) && !reactive_identifiers.contains(&id)
}

// =============================================================================
// isStableType (ported from HIR.ts)
// =============================================================================

/// TS: `isStableType`
fn is_stable_type(ty: &react_compiler_hir::Type) -> bool {
    is_set_state_type(ty)
        || is_set_action_state_type(ty)
        || is_dispatcher_type(ty)
        || is_use_ref_type(ty)
        || is_start_transition_type(ty)
        || is_set_optimistic_type(ty)
}

fn is_set_state_type(ty: &react_compiler_hir::Type) -> bool {
    matches!(ty, react_compiler_hir::Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_SET_STATE_ID)
}

fn is_set_action_state_type(ty: &react_compiler_hir::Type) -> bool {
    matches!(ty, react_compiler_hir::Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_SET_ACTION_STATE_ID)
}

fn is_dispatcher_type(ty: &react_compiler_hir::Type) -> bool {
    matches!(ty, react_compiler_hir::Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_DISPATCH_ID)
}

fn is_start_transition_type(ty: &react_compiler_hir::Type) -> bool {
    matches!(ty, react_compiler_hir::Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_START_TRANSITION_ID)
}

fn is_set_optimistic_type(ty: &react_compiler_hir::Type) -> bool {
    matches!(ty, react_compiler_hir::Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_SET_OPTIMISTIC_ID)
}

// =============================================================================
// PruneNonReactiveDependencies
// =============================================================================

/// Prunes dependencies that are guaranteed to be non-reactive.
/// TS: `pruneNonReactiveDependencies`
pub fn prune_non_reactive_dependencies(func: &mut ReactiveFunction, env: &mut Environment) {
    let reactive_ids = collect_reactive_identifiers(func, env);
    let mut visitor = PruneVisitor { env };
    let mut state = reactive_ids;
    visitors::transform_reactive_function(func, &mut visitor, &mut state)
        .expect("PruneNonReactiveDependencies should not fail");
}

struct PruneVisitor<'a> {
    env: &'a mut Environment,
}

impl<'a> ReactiveFunctionTransform for PruneVisitor<'a> {
    type State = HashSet<IdentifierId>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        state: &mut Self::State,
    ) -> Result<(), react_compiler_diagnostics::CompilerError> {
        self.traverse_instruction(instruction, state)?;

        let lvalue = &instruction.lvalue;
        match &instruction.value {
            ReactiveValue::Instruction(InstructionValue::LoadLocal { place, .. }) => {
                if let Some(lv) = lvalue {
                    if state.contains(&place.identifier) {
                        state.insert(lv.identifier);
                    }
                }
            }
            ReactiveValue::Instruction(InstructionValue::StoreLocal {
                value: store_value,
                lvalue: store_lvalue,
                ..
            }) => {
                if state.contains(&store_value.identifier) {
                    state.insert(store_lvalue.place.identifier);
                    if let Some(lv) = lvalue {
                        state.insert(lv.identifier);
                    }
                }
            }
            ReactiveValue::Instruction(InstructionValue::Destructure {
                value: destr_value,
                lvalue: destr_lvalue,
                ..
            }) => {
                if state.contains(&destr_value.identifier) {
                    for operand in hir_visitors::each_pattern_operand(&destr_lvalue.pattern) {
                        let ident = &self.env.identifiers[operand.identifier.0 as usize];
                        let ty = &self.env.types[ident.type_.0 as usize];
                        if is_stable_type(ty) {
                            continue;
                        }
                        state.insert(operand.identifier);
                    }
                    if let Some(lv) = lvalue {
                        state.insert(lv.identifier);
                    }
                }
            }
            ReactiveValue::Instruction(InstructionValue::PropertyLoad { object, .. }) => {
                if let Some(lv) = lvalue {
                    let ident = &self.env.identifiers[lv.identifier.0 as usize];
                    let ty = &self.env.types[ident.type_.0 as usize];
                    if state.contains(&object.identifier) && !is_stable_type(ty) {
                        state.insert(lv.identifier);
                    }
                }
            }
            ReactiveValue::Instruction(InstructionValue::ComputedLoad {
                object, property, ..
            }) => {
                if let Some(lv) = lvalue {
                    if state.contains(&object.identifier) || state.contains(&property.identifier) {
                        state.insert(lv.identifier);
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }

    fn visit_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<(), react_compiler_diagnostics::CompilerError> {
        self.traverse_scope(scope, state)?;

        let scope_id = scope.scope;
        let scope_data = &mut self.env.scopes[scope_id.0 as usize];

        // Remove non-reactive dependencies
        scope_data
            .dependencies
            .retain(|dep| state.contains(&dep.identifier));

        // If any deps remain, mark all declarations and reassignments as reactive
        if !scope_data.dependencies.is_empty() {
            let decl_ids: Vec<IdentifierId> = scope_data
                .declarations
                .iter()
                .map(|(_, decl)| decl.identifier)
                .collect();
            for id in decl_ids {
                state.insert(id);
            }
            let reassign_ids: Vec<IdentifierId> = scope_data.reassignments.clone();
            for id in reassign_ids {
                state.insert(id);
            }
        }
        Ok(())
    }
}

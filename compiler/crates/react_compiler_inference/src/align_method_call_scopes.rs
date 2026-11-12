// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Ensures that method call instructions have scopes such that either:
//! - Both the MethodCall and its property have the same scope
//! - OR neither has a scope
//!
//! Ported from TypeScript `src/ReactiveScopes/AlignMethodCallScopes.ts`.

use rustc_hash::FxHashMap;

use react_compiler_hir::environment::Environment;
use react_compiler_hir::{EvaluationOrder, HirFunction, IdentifierId, InstructionValue, ScopeId};
use react_compiler_utils::DisjointSet;

// =============================================================================
// Public API
// =============================================================================

/// Aligns method call scopes so that either both the MethodCall result and its
/// property operand share the same scope, or neither has a scope.
///
/// Corresponds to TS `alignMethodCallScopes(fn: HIRFunction): void`.
pub fn align_method_call_scopes(func: &mut HirFunction, env: &mut Environment) {
    // Maps an identifier to the scope it should be assigned to (or None to remove scope)
    let mut scope_mapping: FxHashMap<IdentifierId, Option<ScopeId>> = FxHashMap::default();
    let mut merged_scopes = DisjointSet::<ScopeId>::new();

    // Phase 1: Walk instructions and collect scope relationships
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::MethodCall { property, .. } => {
                    let lvalue_scope = env.identifiers[instr.lvalue.identifier.0 as usize].scope;
                    let property_scope = env.identifiers[property.identifier.0 as usize].scope;

                    match (lvalue_scope, property_scope) {
                        (Some(lvalue_sid), Some(property_sid)) => {
                            // Both have a scope: merge the scopes
                            merged_scopes.union(&[lvalue_sid, property_sid]);
                        }
                        (Some(lvalue_sid), None) => {
                            // Call has a scope but not the property:
                            // record that this property should be in this scope
                            scope_mapping.insert(property.identifier, Some(lvalue_sid));
                        }
                        (None, Some(_)) => {
                            // Property has a scope but call doesn't:
                            // this property does not need a scope
                            scope_mapping.insert(property.identifier, None);
                        }
                        (None, None) => {
                            // Neither has a scope, nothing to do
                        }
                    }
                }
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    // Recurse into inner functions
                    let func_id = lowered_func.func;
                    let mut inner_func = std::mem::replace(
                        &mut env.functions[func_id.0 as usize],
                        react_compiler_ssa::enter_ssa::placeholder_function(),
                    );
                    align_method_call_scopes(&mut inner_func, env);
                    env.functions[func_id.0 as usize] = inner_func;
                }
                _ => {}
            }
        }
    }

    // Phase 2: Merge scope ranges for unioned scopes.
    // Use a FxHashMap to accumulate min/max across all scopes mapping to the same root,
    // matching TS behavior where root.range is updated in-place during iteration.
    let mut range_updates: FxHashMap<ScopeId, (EvaluationOrder, EvaluationOrder)> =
        FxHashMap::default();

    merged_scopes.for_each(|scope_id, root_id| {
        if scope_id == root_id {
            return;
        }
        let scope_range = env.scopes[scope_id.0 as usize].range.clone();
        let root_range = env.scopes[root_id.0 as usize].range.clone();

        let entry = range_updates
            .entry(root_id)
            .or_insert_with(|| (root_range.start, root_range.end));
        entry.0 = EvaluationOrder(std::cmp::min(entry.0.0, scope_range.start.0));
        entry.1 = EvaluationOrder(std::cmp::max(entry.1.0, scope_range.end.0));
    });

    // Save original scope range IDs before updating
    let original_range_ids: FxHashMap<ScopeId, react_compiler_hir::MutableRangeId> = range_updates
        .keys()
        .map(|&root_id| {
            let range_id = env.scopes[root_id.0 as usize].range.id;
            (root_id, range_id)
        })
        .collect();

    for (root_id, (new_start, new_end)) in &range_updates {
        env.scopes[root_id.0 as usize].range.start = *new_start;
        env.scopes[root_id.0 as usize].range.end = *new_end;
    }

    // Sync identifier mutable_ranges that shared the old scope range.
    // Uses MutableRangeId for exact identity matching instead of value comparison.
    for ident in &mut env.identifiers {
        if let Some(scope_id) = ident.scope {
            if let Some(&orig_range_id) = original_range_ids.get(&scope_id) {
                if ident.mutable_range.id == orig_range_id {
                    let new_range = &env.scopes[scope_id.0 as usize].range;
                    ident.mutable_range.start = new_range.start;
                    ident.mutable_range.end = new_range.end;
                }
            }
        }
    }

    // Phase 3: Apply scope mappings and merged scope reassignments
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let lvalue_id = func.instructions[instr_id.0 as usize].lvalue.identifier;

            if let Some(mapped_scope) = scope_mapping.get(&lvalue_id) {
                env.identifiers[lvalue_id.0 as usize].scope = *mapped_scope;
            } else if let Some(current_scope) = env.identifiers[lvalue_id.0 as usize].scope {
                // TS: mergedScopes.find() returns null if not in the set
                if let Some(merged) = merged_scopes.find_opt(current_scope) {
                    env.identifiers[lvalue_id.0 as usize].scope = Some(merged);
                }
            }
        }
    }
}

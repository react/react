// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Aligns scopes of object method values to that of their enclosing object expressions.
//! To produce a well-formed JS program in Codegen, object methods and object expressions
//! must be in the same ReactiveBlock as object method definitions must be inlined.
//!
//! Ported from TypeScript `src/ReactiveScopes/AlignObjectMethodScopes.ts`.

use rustc_hash::{FxHashMap, FxHashSet};
use std::cmp;

use react_compiler_hir::environment::Environment;
use react_compiler_hir::{
    EvaluationOrder, HirFunction, IdentifierId, InstructionValue, ObjectPropertyOrSpread, ScopeId,
};
use react_compiler_utils::DisjointSet;

// =============================================================================
// findScopesToMerge
// =============================================================================

/// Identifies ObjectMethod lvalue identifiers and then finds ObjectExpression
/// instructions whose operands reference those methods. Returns a disjoint set
/// of scopes that must be merged.
fn find_scopes_to_merge(func: &HirFunction, env: &Environment) -> DisjointSet<ScopeId> {
    let mut object_method_decls: FxHashSet<IdentifierId> = FxHashSet::default();
    let mut merged_scopes = DisjointSet::<ScopeId>::new();

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::ObjectMethod { .. } => {
                    object_method_decls.insert(instr.lvalue.identifier);
                }
                InstructionValue::ObjectExpression { properties, .. } => {
                    for prop_or_spread in properties {
                        let operand_place = match prop_or_spread {
                            ObjectPropertyOrSpread::Property(prop) => &prop.place,
                            ObjectPropertyOrSpread::Spread(spread) => &spread.place,
                        };
                        if object_method_decls.contains(&operand_place.identifier) {
                            let operand_scope =
                                env.identifiers[operand_place.identifier.0 as usize].scope;
                            let lvalue_scope =
                                env.identifiers[instr.lvalue.identifier.0 as usize].scope;

                            // TS: CompilerError.invariant(operandScope != null && lvalueScope != null, ...)
                            let operand_sid = operand_scope.expect(
                                "Internal error: Expected all ObjectExpressions and ObjectMethods to have non-null scope.",
                            );
                            let lvalue_sid = lvalue_scope.expect(
                                "Internal error: Expected all ObjectExpressions and ObjectMethods to have non-null scope.",
                            );
                            merged_scopes.union(&[operand_sid, lvalue_sid]);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    merged_scopes
}

// =============================================================================
// Public API
// =============================================================================

/// Aligns object method scopes so that ObjectMethod values and their enclosing
/// ObjectExpression share the same scope.
///
/// Corresponds to TS `alignObjectMethodScopes(fn: HIRFunction): void`.
pub fn align_object_method_scopes(func: &mut HirFunction, env: &mut Environment) {
    // Handle inner functions first (TS recurses before processing the outer function)
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let func_id = lowered_func.func;
                    let mut inner_func = std::mem::replace(
                        &mut env.functions[func_id.0 as usize],
                        react_compiler_ssa::enter_ssa::placeholder_function(),
                    );
                    align_object_method_scopes(&mut inner_func, env);
                    env.functions[func_id.0 as usize] = inner_func;
                }
                _ => {}
            }
        }
    }

    let mut merged_scopes = find_scopes_to_merge(func, env);

    // Step 1: Merge affected scopes to their canonical root.
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
        entry.0 = EvaluationOrder(cmp::min(entry.0.0, scope_range.start.0));
        entry.1 = EvaluationOrder(cmp::max(entry.1.0, scope_range.end.0));
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

    // Step 2: Repoint identifiers whose scopes were merged
    // Build a map from old scope -> root scope for quick lookup
    let mut scope_remap: FxHashMap<ScopeId, ScopeId> = FxHashMap::default();
    merged_scopes.for_each(|scope_id, root_id| {
        if scope_id != root_id {
            scope_remap.insert(scope_id, root_id);
        }
    });

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let lvalue_id = func.instructions[instr_id.0 as usize].lvalue.identifier;

            if let Some(current_scope) = env.identifiers[lvalue_id.0 as usize].scope {
                if let Some(&root) = scope_remap.get(&current_scope) {
                    env.identifiers[lvalue_id.0 as usize].scope = Some(root);
                }
            }
        }
    }
}

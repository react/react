// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Merges reactive scopes that have overlapping ranges.
//!
//! While previous passes ensure that reactive scopes span valid sets of program
//! blocks, pairs of reactive scopes may still be inconsistent with respect to
//! each other. Two scopes must either be entirely disjoint or one must be nested
//! within the other. This pass detects overlapping scopes and merges them.
//!
//! Additionally, if an instruction mutates an outer scope while a different
//! scope is active, those scopes are merged.
//!
//! Ported from TypeScript `src/HIR/MergeOverlappingReactiveScopesHIR.ts`.

use rustc_hash::FxHashMap;
use std::cmp;

use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors;
use react_compiler_hir::visitors::{each_instruction_lvalue_ids, each_terminal_operand_ids};
use react_compiler_hir::{
    EvaluationOrder, HirFunction, IdentifierId, InstructionValue, ScopeId, Type,
};
use react_compiler_utils::DisjointSet;

// =============================================================================
// ScopeInfo
// =============================================================================

struct ScopeStartEntry {
    id: EvaluationOrder,
    scopes: Vec<ScopeId>,
}

struct ScopeEndEntry {
    id: EvaluationOrder,
    scopes: Vec<ScopeId>,
}

struct ScopeInfo {
    /// Sorted descending by id (so we can pop from the end for smallest)
    scope_starts: Vec<ScopeStartEntry>,
    /// Sorted descending by id (so we can pop from the end for smallest)
    scope_ends: Vec<ScopeEndEntry>,
    /// Maps IdentifierId -> ScopeId for all places that have a scope
    place_scopes: FxHashMap<IdentifierId, ScopeId>,
}

// =============================================================================
// TraversalState
// =============================================================================

struct TraversalState {
    joined: DisjointSet<ScopeId>,
    active_scopes: Vec<ScopeId>,
}

// =============================================================================
// Helper functions
// =============================================================================

/// Check if a scope is active at the given instruction id.
/// Corresponds to TS `isScopeActive(scope, id)`.
fn is_scope_active(env: &Environment, scope_id: ScopeId, id: EvaluationOrder) -> bool {
    env.scopes[scope_id.0 as usize].range.contains(id)
}

/// Get the scope for a place if it's active at the given instruction.
/// Corresponds to TS `getPlaceScope(id, place)`.
fn get_place_scope(
    env: &Environment,
    id: EvaluationOrder,
    identifier_id: IdentifierId,
) -> Option<ScopeId> {
    let scope_id = env.identifiers[identifier_id.0 as usize].scope?;
    if is_scope_active(env, scope_id, id) {
        Some(scope_id)
    } else {
        None
    }
}

/// Check if a place is mutable at the given instruction.
/// Corresponds to TS `isMutable({id}, place)`.
fn is_mutable(env: &Environment, id: EvaluationOrder, identifier_id: IdentifierId) -> bool {
    let range = &env.identifiers[identifier_id.0 as usize].mutable_range;
    range.contains(id)
}

// =============================================================================
// collectScopeInfo
// =============================================================================

fn collect_scope_info(func: &HirFunction, env: &Environment) -> ScopeInfo {
    let mut scope_starts_map: FxHashMap<EvaluationOrder, Vec<ScopeId>> = FxHashMap::default();
    let mut scope_ends_map: FxHashMap<EvaluationOrder, Vec<ScopeId>> = FxHashMap::default();
    let mut place_scopes: FxHashMap<IdentifierId, ScopeId> = FxHashMap::default();

    let mut collect_place_scope = |identifier_id: IdentifierId, env: &Environment| {
        let scope_id = match env.identifiers[identifier_id.0 as usize].scope {
            Some(s) => s,
            None => return,
        };
        place_scopes.insert(identifier_id, scope_id);
        let range = &env.scopes[scope_id.0 as usize].range;
        if range.start != range.end {
            scope_starts_map
                .entry(range.start)
                .or_default()
                .push(scope_id);
            scope_ends_map.entry(range.end).or_default().push(scope_id);
        }
    };

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            // lvalues
            let lvalue_ids = each_instruction_lvalue_ids(instr);
            for id in lvalue_ids {
                collect_place_scope(id, env);
            }
            // operands
            let operand_ids: Vec<IdentifierId> = visitors::each_instruction_operand(instr, env)
                .into_iter()
                .map(|p| p.identifier)
                .collect();
            for id in operand_ids {
                collect_place_scope(id, env);
            }
        }
        // terminal operands
        let terminal_op_ids = each_terminal_operand_ids(&block.terminal);
        for id in terminal_op_ids {
            collect_place_scope(id, env);
        }
    }

    // Deduplicate scope IDs in each entry, preserving insertion order.
    // The TS uses Set<ReactiveScope> which preserves insertion order and deduplicates.
    // We must NOT sort by ScopeId here — the insertion order determines which scope
    // becomes the root in the disjoint set union.
    fn dedup_preserve_order(scopes: &mut Vec<ScopeId>) {
        let mut seen = rustc_hash::FxHashSet::default();
        scopes.retain(|s| seen.insert(*s));
    }
    for scopes in scope_starts_map.values_mut() {
        dedup_preserve_order(scopes);
    }
    for scopes in scope_ends_map.values_mut() {
        dedup_preserve_order(scopes);
    }

    // Convert to sorted vecs (descending by id for pop-from-end)
    let mut scope_starts: Vec<ScopeStartEntry> = scope_starts_map
        .into_iter()
        .map(|(id, scopes)| ScopeStartEntry { id, scopes })
        .collect();
    scope_starts.sort_by(|a, b| b.id.cmp(&a.id));

    let mut scope_ends: Vec<ScopeEndEntry> = scope_ends_map
        .into_iter()
        .map(|(id, scopes)| ScopeEndEntry { id, scopes })
        .collect();
    scope_ends.sort_by(|a, b| b.id.cmp(&a.id));

    ScopeInfo {
        scope_starts,
        scope_ends,
        place_scopes,
    }
}

// =============================================================================
// visitInstructionId
// =============================================================================

fn visit_instruction_id(
    id: EvaluationOrder,
    scope_info: &mut ScopeInfo,
    state: &mut TraversalState,
    env: &Environment,
) {
    // Handle all scopes that end at this instruction
    if let Some(top) = scope_info.scope_ends.last() {
        if top.id <= id {
            let scope_end_entry = scope_info.scope_ends.pop().unwrap();

            // Sort scopes by start descending (matching active_scopes order)
            let mut scopes_sorted = scope_end_entry.scopes;
            scopes_sorted.sort_by(|a, b| {
                let a_start = env.scopes[a.0 as usize].range.start;
                let b_start = env.scopes[b.0 as usize].range.start;
                b_start.cmp(&a_start)
            });

            for scope in &scopes_sorted {
                let idx = state.active_scopes.iter().position(|s| s == scope);
                if let Some(idx) = idx {
                    // Detect and merge all overlapping scopes
                    if idx != state.active_scopes.len() - 1 {
                        let mut to_union: Vec<ScopeId> = vec![*scope];
                        to_union.extend_from_slice(&state.active_scopes[idx + 1..]);
                        state.joined.union(&to_union);
                    }
                    state.active_scopes.remove(idx);
                }
            }
        }
    }

    // Handle all scopes that begin at this instruction
    if let Some(top) = scope_info.scope_starts.last() {
        if top.id <= id {
            let scope_start_entry = scope_info.scope_starts.pop().unwrap();

            // Sort by end descending
            let mut scopes_sorted = scope_start_entry.scopes;
            scopes_sorted.sort_by(|a, b| {
                let a_end = env.scopes[a.0 as usize].range.end;
                let b_end = env.scopes[b.0 as usize].range.end;
                b_end.cmp(&a_end)
            });

            state.active_scopes.extend_from_slice(&scopes_sorted);

            // Merge all identical scopes (same start and end)
            for i in 1..scopes_sorted.len() {
                let prev = scopes_sorted[i - 1];
                let curr = scopes_sorted[i];
                if env.scopes[prev.0 as usize].range.end == env.scopes[curr.0 as usize].range.end {
                    state.joined.union(&[prev, curr]);
                }
            }
        }
    }
}

// =============================================================================
// visitPlace
// =============================================================================

fn visit_place(
    id: EvaluationOrder,
    identifier_id: IdentifierId,
    state: &mut TraversalState,
    env: &Environment,
) {
    // If an instruction mutates an outer scope, flatten all scopes from top
    // of the stack to the mutated outer scope
    let place_scope = get_place_scope(env, id, identifier_id);
    if let Some(scope_id) = place_scope {
        if is_mutable(env, id, identifier_id) {
            let place_scope_idx = state.active_scopes.iter().position(|s| *s == scope_id);
            if let Some(idx) = place_scope_idx {
                if idx != state.active_scopes.len() - 1 {
                    let mut to_union: Vec<ScopeId> = vec![scope_id];
                    to_union.extend_from_slice(&state.active_scopes[idx + 1..]);
                    state.joined.union(&to_union);
                }
            }
        }
    }
}

// =============================================================================
// getOverlappingReactiveScopes
// =============================================================================

fn get_overlapping_reactive_scopes(
    func: &HirFunction,
    env: &Environment,
    mut scope_info: ScopeInfo,
) -> DisjointSet<ScopeId> {
    let mut state = TraversalState {
        joined: DisjointSet::<ScopeId>::new(),
        active_scopes: Vec::new(),
    };

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            visit_instruction_id(instr.id, &mut scope_info, &mut state, env);

            // Visit operands
            let is_func_or_method = matches!(
                &instr.value,
                InstructionValue::FunctionExpression { .. } | InstructionValue::ObjectMethod { .. }
            );
            let operand_ids = each_instruction_operand_ids_with_types(instr, env);
            for (op_id, type_) in &operand_ids {
                if is_func_or_method && matches!(type_, Type::Primitive) {
                    continue;
                }
                visit_place(instr.id, *op_id, &mut state, env);
            }

            // Visit lvalues
            let lvalue_ids = each_instruction_lvalue_ids(instr);
            for lvalue_id in lvalue_ids {
                visit_place(instr.id, lvalue_id, &mut state, env);
            }
        }

        let terminal_id = block.terminal.evaluation_order();
        visit_instruction_id(terminal_id, &mut scope_info, &mut state, env);

        let terminal_op_ids = each_terminal_operand_ids(&block.terminal);
        for op_id in terminal_op_ids {
            visit_place(terminal_id, op_id, &mut state, env);
        }
    }

    state.joined
}

// =============================================================================
// Public API
// =============================================================================

/// Merges reactive scopes that have overlapping ranges.
///
/// Corresponds to TS `mergeOverlappingReactiveScopesHIR(fn: HIRFunction): void`.
pub fn merge_overlapping_reactive_scopes_hir(func: &mut HirFunction, env: &mut Environment) {
    // Collect scope info
    let scope_info = collect_scope_info(func, env);

    // Save place_scopes before moving scope_info
    let place_scopes = scope_info.place_scopes.clone();

    // Find overlapping scopes
    let mut joined_scopes = get_overlapping_reactive_scopes(func, env, scope_info);

    // Merge scope ranges: collect all (scope, root) pairs, then update root ranges
    // by accumulating min start / max end from all members of each group.
    // This matches TS behavior where groupScope.range is updated in-place during iteration.
    let mut scope_groups: Vec<(ScopeId, ScopeId)> = Vec::new();
    joined_scopes.for_each(|scope_id, root_id| {
        if scope_id != root_id {
            scope_groups.push((scope_id, root_id));
        }
    });
    // Collect root scopes' ORIGINAL range IDs BEFORE updating them.
    // In TS, identifier.mutableRange shares the same object reference as scope.range.
    // When scope.range is updated, ALL identifiers referencing that range object
    // automatically see the new values. We use MutableRangeId to identify which
    // identifiers share the same logical range as a root scope.
    let mut original_root_range_ids: FxHashMap<ScopeId, react_compiler_hir::MutableRangeId> =
        FxHashMap::default();
    for (_, root_id) in &scope_groups {
        if !original_root_range_ids.contains_key(root_id) {
            let range_id = env.scopes[root_id.0 as usize].range.id;
            original_root_range_ids.insert(*root_id, range_id);
        }
    }

    // Update root scope ranges
    for (scope_id, root_id) in &scope_groups {
        let scope_start = env.scopes[scope_id.0 as usize].range.start;
        let scope_end = env.scopes[scope_id.0 as usize].range.end;
        let root_range = &mut env.scopes[root_id.0 as usize].range;
        root_range.start = EvaluationOrder(cmp::min(root_range.start.0, scope_start.0));
        root_range.end = EvaluationOrder(cmp::max(root_range.end.0, scope_end.0));
    }
    // Sync mutable_range for ALL identifiers whose mutable_range has the same
    // identity as a root scope's original range. In TS, identifier.mutableRange
    // shares the same object reference as scope.range, so when scope.range is
    // updated, all identifiers referencing that range object automatically see
    // the new values. We use MutableRangeId for exact identity matching.
    for ident in &mut env.identifiers {
        for (root_id, orig_range_id) in &original_root_range_ids {
            if ident.mutable_range.id == *orig_range_id {
                let new_range = &env.scopes[root_id.0 as usize].range;
                ident.mutable_range.start = new_range.start;
                ident.mutable_range.end = new_range.end;
                break;
            }
        }
    }

    // Rewrite all references: for each place that had a scope, point to the merged root.
    // Note: we intentionally do NOT update mutable_range for repointed identifiers,
    // matching TS behavior where identifier.mutableRange still references the old scope's
    // range object after scope repointing.
    for (identifier_id, original_scope) in &place_scopes {
        let next_scope = joined_scopes.find(*original_scope);
        if next_scope != *original_scope {
            env.identifiers[identifier_id.0 as usize].scope = Some(next_scope);
        }
    }
}

// =============================================================================
// Instruction visitor helpers (delegating to canonical visitors)
// =============================================================================

/// Collect operand IdentifierIds with their types from an instruction value.
/// Used to check for Primitive type on FunctionExpression/ObjectMethod operands.
fn each_instruction_operand_ids_with_types(
    instr: &react_compiler_hir::Instruction,
    env: &Environment,
) -> Vec<(IdentifierId, Type)> {
    visitors::each_instruction_operand(instr, env)
        .into_iter()
        .map(|p| {
            let type_ =
                env.types[env.identifiers[p.identifier.0 as usize].type_.0 as usize].clone();
            (p.identifier, type_)
        })
        .collect()
}

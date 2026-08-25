// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! MergeReactiveScopesThatInvalidateTogether — merges adjacent or nested scopes
//! that share dependencies (and thus invalidate together) to reduce memoization overhead.
//!
//! Corresponds to `src/ReactiveScopes/MergeReactiveScopesThatInvalidateTogether.ts`.

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_diagnostics::CompilerError;
use react_compiler_hir::{
    DeclarationId, DependencyPathEntry, EvaluationOrder, InstructionKind, InstructionValue, Place,
    ReactiveBlock, ReactiveFunction, ReactiveScopeBlock, ReactiveScopeDependency,
    ReactiveStatement, ReactiveValue, ScopeId, Type,
    environment::Environment,
    object_shape::{BUILT_IN_ARRAY_ID, BUILT_IN_FUNCTION_ID, BUILT_IN_JSX_ID, BUILT_IN_OBJECT_ID},
};

use crate::visitors::{
    ReactiveFunctionTransform, ReactiveFunctionVisitor, Transformed, transform_reactive_function,
    visit_reactive_function,
};

// =============================================================================
// Public entry point
// =============================================================================

/// Merges adjacent reactive scopes that share dependencies (invalidate together).
/// TS: `mergeReactiveScopesThatInvalidateTogether`
pub fn merge_reactive_scopes_that_invalidate_together(
    func: &mut ReactiveFunction,
    env: &mut Environment,
) -> Result<(), CompilerError> {
    // Pass 1: find last usage of each declaration
    let visitor = FindLastUsageVisitor { env: &*env };
    let mut last_usage: FxHashMap<DeclarationId, EvaluationOrder> = FxHashMap::default();
    visit_reactive_function(func, &visitor, &mut last_usage);

    // Pass 2+3: merge scopes
    let mut transform = MergeTransform {
        env,
        last_usage,
        temporaries: FxHashMap::default(),
    };
    let mut state: Option<Vec<ReactiveScopeDependency>> = None;
    transform_reactive_function(func, &mut transform, &mut state)
}

// =============================================================================
// Pass 1: FindLastUsageVisitor
// =============================================================================

/// TS: `class FindLastUsageVisitor extends ReactiveFunctionVisitor<void>`
struct FindLastUsageVisitor<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionVisitor for FindLastUsageVisitor<'a> {
    type State = FxHashMap<DeclarationId, EvaluationOrder>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_place(&self, id: EvaluationOrder, place: &Place, state: &mut Self::State) {
        let decl_id = self.env.identifiers[place.identifier.0 as usize].declaration_id;
        let entry = state.entry(decl_id).or_insert(id);
        if id > *entry {
            *entry = id;
        }
    }
}

// =============================================================================
// Pass 2+3: MergeTransform
// =============================================================================

/// TS: `class Transform extends ReactiveFunctionTransform<ReactiveScopeDependencies | null>`
struct MergeTransform<'a> {
    env: &'a mut Environment,
    last_usage: FxHashMap<DeclarationId, EvaluationOrder>,
    temporaries: FxHashMap<DeclarationId, DeclarationId>,
}

impl<'a> ReactiveFunctionTransform for MergeTransform<'a> {
    type State = Option<Vec<ReactiveScopeDependency>>;

    fn env(&self) -> &Environment {
        self.env
    }

    /// TS: `override transformScope(scopeBlock, state)`
    fn transform_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<Transformed<ReactiveStatement>, CompilerError> {
        let scope_deps = self.env.scopes[scope.scope.0 as usize].dependencies.clone();
        // Save parent state and recurse with this scope's deps as state
        let parent_state = state.take();
        *state = Some(scope_deps.clone());
        self.visit_scope(scope, state)?;
        // Restore parent state
        *state = parent_state;

        // If parent has deps and they match, flatten the inner scope
        if let Some(parent_deps) = state.as_ref() {
            if are_equal_dependencies(parent_deps, &scope_deps, self.env) {
                let instructions = std::mem::take(&mut scope.instructions);
                return Ok(Transformed::ReplaceMany(instructions));
            }
        }
        Ok(Transformed::Keep)
    }

    /// TS: `override visitBlock(block, state)`
    fn visit_block(
        &mut self,
        block: &mut ReactiveBlock,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        // Pass 1: traverse nested (scope flattening handled by transform_scope)
        self.traverse_block(block, state)?;
        // Pass 2+3: merge consecutive scopes in this block
        self.merge_scopes_in_block(block)?;
        Ok(())
    }
}

impl<'a> MergeTransform<'a> {
    /// Identify and merge consecutive scopes that invalidate together.
    fn merge_scopes_in_block(&mut self, block: &mut ReactiveBlock) -> Result<(), CompilerError> {
        // Pass 2: identify scopes for merging
        struct MergedScope {
            scope_id: ScopeId,
            from: usize,
            to: usize,
            lvalues: FxHashSet<DeclarationId>,
        }

        let mut current: Option<MergedScope> = None;
        let mut merged: Vec<MergedScope> = Vec::new();

        let block_len = block.len();
        for i in 0..block_len {
            match &block[i] {
                ReactiveStatement::Terminal(_) => {
                    // Don't merge across terminals
                    if let Some(c) = current.take() {
                        if c.to > c.from + 1 {
                            merged.push(c);
                        }
                    }
                }
                ReactiveStatement::PrunedScope(_) => {
                    // Don't merge across pruned scopes
                    if let Some(c) = current.take() {
                        if c.to > c.from + 1 {
                            merged.push(c);
                        }
                    }
                }
                ReactiveStatement::Instruction(instr) => {
                    match &instr.value {
                        ReactiveValue::Instruction(iv) => {
                            match iv {
                                InstructionValue::BinaryExpression { .. }
                                | InstructionValue::ComputedLoad { .. }
                                | InstructionValue::JSXText { .. }
                                | InstructionValue::LoadGlobal { .. }
                                | InstructionValue::LoadLocal { .. }
                                | InstructionValue::Primitive { .. }
                                | InstructionValue::PropertyLoad { .. }
                                | InstructionValue::TemplateLiteral { .. }
                                | InstructionValue::UnaryExpression { .. } => {
                                    if let Some(ref mut c) = current {
                                        if let Some(lvalue) = &instr.lvalue {
                                            let decl_id = self.env.identifiers
                                                [lvalue.identifier.0 as usize]
                                                .declaration_id;
                                            c.lvalues.insert(decl_id);
                                            if let InstructionValue::LoadLocal { place, .. } = iv {
                                                let src_decl = self.env.identifiers
                                                    [place.identifier.0 as usize]
                                                    .declaration_id;
                                                self.temporaries.insert(decl_id, src_decl);
                                            }
                                        }
                                    }
                                }
                                InstructionValue::StoreLocal { lvalue, value, .. } => {
                                    if let Some(ref mut c) = current {
                                        if lvalue.kind == InstructionKind::Const {
                                            // Add the instruction lvalue (if any)
                                            if let Some(instr_lvalue) = &instr.lvalue {
                                                let decl_id = self.env.identifiers
                                                    [instr_lvalue.identifier.0 as usize]
                                                    .declaration_id;
                                                c.lvalues.insert(decl_id);
                                            }
                                            // Add the StoreLocal's lvalue place
                                            let store_decl = self.env.identifiers
                                                [lvalue.place.identifier.0 as usize]
                                                .declaration_id;
                                            c.lvalues.insert(store_decl);
                                            // Track temporary mapping
                                            let value_decl = self.env.identifiers
                                                [value.identifier.0 as usize]
                                                .declaration_id;
                                            let mapped = self
                                                .temporaries
                                                .get(&value_decl)
                                                .copied()
                                                .unwrap_or(value_decl);
                                            self.temporaries.insert(store_decl, mapped);
                                        } else {
                                            // Non-const StoreLocal — reset
                                            let c = current.take().unwrap();
                                            if c.to > c.from + 1 {
                                                merged.push(c);
                                            }
                                        }
                                    }
                                }
                                _ => {
                                    // Other instructions prevent merging
                                    if let Some(c) = current.take() {
                                        if c.to > c.from + 1 {
                                            merged.push(c);
                                        }
                                    }
                                }
                            }
                        }
                        _ => {
                            // Non-Instruction reactive values prevent merging
                            if let Some(c) = current.take() {
                                if c.to > c.from + 1 {
                                    merged.push(c);
                                }
                            }
                        }
                    }
                }
                ReactiveStatement::Scope(scope_block) => {
                    let next_scope_id = scope_block.scope;
                    if let Some(ref mut c) = current {
                        let current_scope_id = c.scope_id;
                        if can_merge_scopes(
                            current_scope_id,
                            next_scope_id,
                            self.env,
                            &self.temporaries,
                        ) && are_lvalues_last_used_by_scope(
                            next_scope_id,
                            &c.lvalues,
                            &self.last_usage,
                            self.env,
                        ) {
                            // Merge: extend the current scope's range
                            let next_range_end =
                                self.env.scopes[next_scope_id.0 as usize].range.end;
                            let current_range_end =
                                self.env.scopes[current_scope_id.0 as usize].range.end;
                            self.env.scopes[current_scope_id.0 as usize].range.end =
                                EvaluationOrder(current_range_end.0.max(next_range_end.0));

                            // Merge declarations from next into current
                            let next_decls = self.env.scopes[next_scope_id.0 as usize]
                                .declarations
                                .clone();
                            for (key, value) in next_decls {
                                let current_decls =
                                    &mut self.env.scopes[current_scope_id.0 as usize].declarations;
                                if let Some(existing) =
                                    current_decls.iter_mut().find(|(k, _)| *k == key)
                                {
                                    existing.1 = value;
                                } else {
                                    current_decls.push((key, value));
                                }
                            }

                            // Prune declarations that are no longer used after the merged scope
                            update_scope_declarations(current_scope_id, &self.last_usage, self.env);

                            c.to = i + 1;
                            c.lvalues.clear();

                            if !scope_is_eligible_for_merging(next_scope_id, self.env) {
                                let c = current.take().unwrap();
                                if c.to > c.from + 1 {
                                    merged.push(c);
                                }
                            }
                        } else {
                            // Cannot merge — reset
                            let c = current.take().unwrap();
                            if c.to > c.from + 1 {
                                merged.push(c);
                            }
                            // Start new candidate if eligible
                            if scope_is_eligible_for_merging(next_scope_id, self.env) {
                                current = Some(MergedScope {
                                    scope_id: next_scope_id,
                                    from: i,
                                    to: i + 1,
                                    lvalues: FxHashSet::default(),
                                });
                            }
                        }
                    } else {
                        // No current — start new candidate if eligible
                        if scope_is_eligible_for_merging(next_scope_id, self.env) {
                            current = Some(MergedScope {
                                scope_id: next_scope_id,
                                from: i,
                                to: i + 1,
                                lvalues: FxHashSet::default(),
                            });
                        }
                    }
                }
            }
        }
        // Flush remaining
        if let Some(c) = current.take() {
            if c.to > c.from + 1 {
                merged.push(c);
            }
        }

        // Pass 3: apply merges
        if merged.is_empty() {
            return Ok(());
        }

        let mut next_instructions: Vec<ReactiveStatement> = Vec::new();
        let mut index = 0;
        let all_stmts: Vec<ReactiveStatement> = std::mem::take(block);

        for entry in &merged {
            // Push everything before the merge range
            while index < entry.from {
                next_instructions.push(all_stmts[index].clone());
                index += 1;
            }
            // The first item in the merge range must be a scope
            let mut merged_scope = match &all_stmts[entry.from] {
                ReactiveStatement::Scope(s) => s.clone(),
                _ => {
                    return Err(react_compiler_diagnostics::CompilerDiagnostic::new(
                        react_compiler_diagnostics::ErrorCategory::Invariant,
                        "MergeConsecutiveScopes: Expected scope at starting index",
                        None,
                    )
                    .into());
                }
            };
            index += 1;
            while index < entry.to {
                let stmt = &all_stmts[index];
                index += 1;
                match stmt {
                    ReactiveStatement::Scope(inner_scope) => {
                        merged_scope
                            .instructions
                            .extend(inner_scope.instructions.clone());
                        self.env.scopes[merged_scope.scope.0 as usize]
                            .merged
                            .push(inner_scope.scope);
                    }
                    _ => {
                        merged_scope.instructions.push(stmt.clone());
                    }
                }
            }
            next_instructions.push(ReactiveStatement::Scope(merged_scope));
        }
        // Push remaining
        while index < all_stmts.len() {
            next_instructions.push(all_stmts[index].clone());
            index += 1;
        }

        *block = next_instructions;
        Ok(())
    }
}

// =============================================================================
// Helper functions
// =============================================================================

/// Updates scope declarations to remove any that are not used after the scope.
fn update_scope_declarations(
    scope_id: ScopeId,
    last_usage: &FxHashMap<DeclarationId, EvaluationOrder>,
    env: &mut Environment,
) {
    let range_end = env.scopes[scope_id.0 as usize].range.end;
    env.scopes[scope_id.0 as usize]
        .declarations
        .retain(|(_id, decl)| {
            let decl_declaration_id = env.identifiers[decl.identifier.0 as usize].declaration_id;
            match last_usage.get(&decl_declaration_id) {
                Some(last_used_at) => *last_used_at >= range_end,
                // If not tracked, keep the declaration (conservative)
                None => true,
            }
        });
}

/// Returns whether all lvalues are last used at or before the given scope.
fn are_lvalues_last_used_by_scope(
    scope_id: ScopeId,
    lvalues: &FxHashSet<DeclarationId>,
    last_usage: &FxHashMap<DeclarationId, EvaluationOrder>,
    env: &Environment,
) -> bool {
    let range_end = env.scopes[scope_id.0 as usize].range.end;
    for lvalue in lvalues {
        if let Some(&last_used_at) = last_usage.get(lvalue) {
            if last_used_at >= range_end {
                return false;
            }
        }
    }
    true
}

/// Check if two scopes can be merged.
fn can_merge_scopes(
    current_id: ScopeId,
    next_id: ScopeId,
    env: &Environment,
    temporaries: &FxHashMap<DeclarationId, DeclarationId>,
) -> bool {
    let current = &env.scopes[current_id.0 as usize];
    let next = &env.scopes[next_id.0 as usize];

    // Don't merge scopes with reassignments
    if !current.reassignments.is_empty() || !next.reassignments.is_empty() {
        return false;
    }

    // Merge scopes whose dependencies are identical
    if are_equal_dependencies(&current.dependencies, &next.dependencies, env) {
        return true;
    }

    // Merge scopes where outputs of current are inputs of next
    // Build synthetic dependencies from current's declarations
    let current_decl_deps: Vec<ReactiveScopeDependency> = current
        .declarations
        .iter()
        .map(|(_key, decl)| ReactiveScopeDependency {
            identifier: decl.identifier,
            reactive: true,
            path: Vec::new(),
            loc: None,
        })
        .collect();

    if are_equal_dependencies(&current_decl_deps, &next.dependencies, env) {
        return true;
    }

    // Check if all next deps have empty paths, always-invalidating types,
    // and correspond to current declarations (possibly through temporaries)
    if !next.dependencies.is_empty()
        && next.dependencies.iter().all(|dep| {
            if !dep.path.is_empty() {
                return false;
            }
            let dep_type = &env.types[env.identifiers[dep.identifier.0 as usize].type_.0 as usize];
            if !is_always_invalidating_type(dep_type) {
                return false;
            }
            let dep_decl = env.identifiers[dep.identifier.0 as usize].declaration_id;
            current.declarations.iter().any(|(_key, decl)| {
                let decl_decl_id = env.identifiers[decl.identifier.0 as usize].declaration_id;
                decl_decl_id == dep_decl
                    || temporaries.get(&dep_decl).copied() == Some(decl_decl_id)
            })
        })
    {
        return true;
    }

    false
}

/// Check if a type is always invalidating (guaranteed to change when inputs change).
pub fn is_always_invalidating_type(ty: &Type) -> bool {
    match ty {
        Type::Object { shape_id } => {
            if let Some(id) = shape_id {
                matches!(
                    id.as_str(),
                    s if s == BUILT_IN_ARRAY_ID
                        || s == BUILT_IN_OBJECT_ID
                        || s == BUILT_IN_FUNCTION_ID
                        || s == BUILT_IN_JSX_ID
                )
            } else {
                false
            }
        }
        Type::Function { .. } => true,
        _ => false,
    }
}

/// Check if two dependency lists are equal.
fn are_equal_dependencies(
    a: &[ReactiveScopeDependency],
    b: &[ReactiveScopeDependency],
    env: &Environment,
) -> bool {
    if a.len() != b.len() {
        return false;
    }
    for a_val in a {
        let a_decl = env.identifiers[a_val.identifier.0 as usize].declaration_id;
        let found = b.iter().any(|b_val| {
            let b_decl = env.identifiers[b_val.identifier.0 as usize].declaration_id;
            a_decl == b_decl && are_equal_paths(&a_val.path, &b_val.path)
        });
        if !found {
            return false;
        }
    }
    true
}

/// Check if two dependency paths are equal.
fn are_equal_paths(a: &[DependencyPathEntry], b: &[DependencyPathEntry]) -> bool {
    a.len() == b.len()
        && a.iter()
            .zip(b.iter())
            .all(|(ai, bi)| ai.property == bi.property && ai.optional == bi.optional)
}

/// Check if a scope is eligible for merging with subsequent scopes.
fn scope_is_eligible_for_merging(scope_id: ScopeId, env: &Environment) -> bool {
    let scope = &env.scopes[scope_id.0 as usize];
    if scope.dependencies.is_empty() {
        // No dependencies means output never changes — eligible
        return true;
    }
    scope.declarations.iter().any(|(_key, decl)| {
        let ty = &env.types[env.identifiers[decl.identifier.0 as usize].type_.0 as usize];
        is_always_invalidating_type(ty)
    })
}

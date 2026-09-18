// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! StabilizeBlockIds
//!
//! Rewrites block IDs to sequential values so that the output is deterministic
//! regardless of the order in which blocks were created.
//!
//! Corresponds to `src/ReactiveScopes/StabilizeBlockIds.ts`.

use rustc_hash::{FxBuildHasher, FxHashMap};

use indexmap::IndexSet;
use react_compiler_hir::{
    BlockId, ReactiveFunction, ReactiveScopeBlock, ReactiveTerminal, ReactiveTerminalStatement,
    environment::Environment,
};

use crate::visitors::{
    ReactiveFunctionTransform, ReactiveFunctionVisitor, transform_reactive_function,
    visit_reactive_function,
};

/// Rewrites block IDs to sequential values.
/// TS: `stabilizeBlockIds`
pub fn stabilize_block_ids(func: &mut ReactiveFunction, env: &mut Environment) {
    // Pass 1: Collect referenced labels (preserving insertion order to match TS Set behavior)
    let mut referenced: IndexSet<BlockId, FxBuildHasher> = IndexSet::default();
    let collector = CollectReferencedLabels { env: &*env };
    visit_reactive_function(func, &collector, &mut referenced);

    // Build mappings: referenced block IDs -> sequential IDs (insertion-order deterministic)
    let mut mappings: FxHashMap<BlockId, BlockId> = FxHashMap::default();
    for block_id in &referenced {
        let len = mappings.len() as u32;
        mappings.entry(*block_id).or_insert(BlockId(len));
    }

    // Pass 2: Rewrite block IDs using ReactiveFunctionTransform
    let mut rewriter = RewriteBlockIds { env };
    let _ = transform_reactive_function(func, &mut rewriter, &mut mappings);
}

// =============================================================================
// Pass 1: CollectReferencedLabels
// =============================================================================

struct CollectReferencedLabels<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionVisitor for CollectReferencedLabels<'a> {
    type State = IndexSet<BlockId, FxBuildHasher>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_scope(&self, scope: &ReactiveScopeBlock, state: &mut Self::State) {
        let scope_data = &self.env.scopes[scope.scope.0 as usize];
        if let Some(ref early_return) = scope_data.early_return_value {
            state.insert(early_return.label);
        }
        self.traverse_scope(scope, state);
    }

    fn visit_terminal(&self, stmt: &ReactiveTerminalStatement, state: &mut Self::State) {
        if let Some(ref label) = stmt.label {
            if !label.implicit {
                state.insert(label.id);
            }
        }
        self.traverse_terminal(stmt, state);
    }
}

// =============================================================================
// Pass 2: RewriteBlockIds
// =============================================================================

fn get_or_insert_mapping(mappings: &mut FxHashMap<BlockId, BlockId>, id: BlockId) -> BlockId {
    let len = mappings.len() as u32;
    *mappings.entry(id).or_insert(BlockId(len))
}

/// TS: `class RewriteBlockIds extends ReactiveFunctionVisitor<Map<BlockId, BlockId>>`
struct RewriteBlockIds<'a> {
    env: &'a mut Environment,
}

impl<'a> ReactiveFunctionTransform for RewriteBlockIds<'a> {
    type State = FxHashMap<BlockId, BlockId>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<(), react_compiler_diagnostics::CompilerError> {
        let scope_data = &mut self.env.scopes[scope.scope.0 as usize];
        if let Some(ref mut early_return) = scope_data.early_return_value {
            early_return.label = get_or_insert_mapping(state, early_return.label);
        }
        self.traverse_scope(scope, state)
    }

    fn visit_terminal(
        &mut self,
        stmt: &mut ReactiveTerminalStatement,
        state: &mut Self::State,
    ) -> Result<(), react_compiler_diagnostics::CompilerError> {
        if let Some(ref mut label) = stmt.label {
            label.id = get_or_insert_mapping(state, label.id);
        }

        match &mut stmt.terminal {
            ReactiveTerminal::Break { target, .. } | ReactiveTerminal::Continue { target, .. } => {
                *target = get_or_insert_mapping(state, *target);
            }
            _ => {}
        }

        self.traverse_terminal(stmt, state)
    }
}

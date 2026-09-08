// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Assert that all break/continue targets reference existent labels.
//!
//! Corresponds to `src/ReactiveScopes/AssertWellFormedBreakTargets.ts`.

use rustc_hash::FxHashSet;

use react_compiler_hir::{
    BlockId, ReactiveFunction, ReactiveTerminal, ReactiveTerminalStatement,
    environment::Environment,
};

use crate::visitors::{ReactiveFunctionVisitor, visit_reactive_function};

/// Assert that all break/continue targets reference existent labels.
pub fn assert_well_formed_break_targets(func: &ReactiveFunction, env: &Environment) {
    let visitor = Visitor { env };
    let mut state: FxHashSet<BlockId> = FxHashSet::default();
    visit_reactive_function(func, &visitor, &mut state);
}

struct Visitor<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionVisitor for Visitor<'a> {
    type State = FxHashSet<BlockId>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_terminal(
        &self,
        stmt: &ReactiveTerminalStatement,
        seen_labels: &mut FxHashSet<BlockId>,
    ) {
        if let Some(label) = &stmt.label {
            seen_labels.insert(label.id);
        }
        let terminal = &stmt.terminal;
        match terminal {
            ReactiveTerminal::Break { target, .. } | ReactiveTerminal::Continue { target, .. } => {
                assert!(
                    seen_labels.contains(target),
                    "Unexpected break/continue to invalid label: {:?}",
                    target
                );
            }
            _ => {}
        }
        // Note: intentionally NOT calling self.traverse_terminal() here,
        // matching TS behavior where visitTerminal override does not call traverseTerminal.
        // Recursion into child blocks happens via traverseBlock→visitTerminal for nested blocks.
        // The TS visitor only checks break/continue at the block level, not terminal child blocks.
    }
}

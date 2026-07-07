// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Flattens labeled terminals where the label is not reachable, and
//! nulls out labels for other terminals where the label is unused.
//!
//! Corresponds to `src/ReactiveScopes/PruneUnusedLabels.ts`.

use rustc_hash::FxHashSet;

use react_compiler_hir::{
    BlockId, ReactiveFunction, ReactiveStatement, ReactiveTerminal, ReactiveTerminalStatement,
    ReactiveTerminalTargetKind, environment::Environment,
};

use crate::visitors::{ReactiveFunctionTransform, Transformed, transform_reactive_function};

/// Prune unused labels from a reactive function.
pub fn prune_unused_labels(
    func: &mut ReactiveFunction,
    env: &Environment,
) -> Result<(), react_compiler_diagnostics::CompilerError> {
    let mut transform = Transform { env };
    let mut labels: FxHashSet<BlockId> = FxHashSet::default();
    transform_reactive_function(func, &mut transform, &mut labels)
}

struct Transform<'a> {
    env: &'a Environment,
}

impl<'a> ReactiveFunctionTransform for Transform<'a> {
    type State = FxHashSet<BlockId>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn transform_terminal(
        &mut self,
        stmt: &mut ReactiveTerminalStatement,
        state: &mut FxHashSet<BlockId>,
    ) -> Result<Transformed<ReactiveStatement>, react_compiler_diagnostics::CompilerError> {
        // Traverse children first
        self.traverse_terminal(stmt, state)?;

        // Collect labeled break/continue targets
        match &stmt.terminal {
            ReactiveTerminal::Break {
                target,
                target_kind: ReactiveTerminalTargetKind::Labeled,
                ..
            }
            | ReactiveTerminal::Continue {
                target,
                target_kind: ReactiveTerminalTargetKind::Labeled,
                ..
            } => {
                state.insert(*target);
            }
            _ => {}
        }

        // Is this terminal reachable via a break/continue to its label?
        let is_reachable_label = stmt
            .label
            .as_ref()
            .map_or(false, |label| state.contains(&label.id));

        if let ReactiveTerminal::Label { block, .. } = &mut stmt.terminal {
            if !is_reachable_label {
                // Flatten labeled terminals where the label isn't necessary.
                // Note: In TS, there's a check for `last.terminal.target === null`
                // to pop a trailing break, but since target is always a BlockId (number),
                // that check is always false, so the trailing break is never removed.
                let flattened = std::mem::take(block);
                return Ok(Transformed::ReplaceMany(flattened));
            }
        }

        if !is_reachable_label {
            if let Some(label) = &mut stmt.label {
                label.implicit = true;
            }
        }

        Ok(Transformed::Keep)
    }
}

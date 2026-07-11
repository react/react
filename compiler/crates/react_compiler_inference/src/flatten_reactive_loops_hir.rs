// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Prunes any reactive scopes that are within a loop (for, while, etc). We don't yet
//! support memoization within loops because this would require an extra layer of reconciliation
//! (plus a way to identify values across runs, similar to how we use `key` in JSX for lists).
//! Eventually we may integrate more deeply into the runtime so that we can do a single level
//! of reconciliation, but for now we've found it's sufficient to memoize *around* the loop.
//!
//! Analogous to TS `ReactiveScopes/FlattenReactiveLoopsHIR.ts`.

use react_compiler_hir::{BlockId, HirFunction, Terminal};

/// Flattens reactive scopes that are inside loops by converting `Scope` terminals
/// to `PrunedScope` terminals.
pub fn flatten_reactive_loops_hir(func: &mut HirFunction) {
    let mut active_loops: Vec<BlockId> = Vec::new();

    // Collect block ids in iteration order so we can iterate while mutating terminals
    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();

    for block_id in block_ids {
        // Remove this block from active loops (matching TS retainWhere)
        active_loops.retain(|id| *id != block_id);

        let block = &func.body.blocks[&block_id];
        let terminal = &block.terminal;

        match terminal {
            Terminal::DoWhile { fallthrough, .. }
            | Terminal::For { fallthrough, .. }
            | Terminal::ForIn { fallthrough, .. }
            | Terminal::ForOf { fallthrough, .. }
            | Terminal::While { fallthrough, .. } => {
                active_loops.push(*fallthrough);
            }
            Terminal::Scope {
                block,
                fallthrough,
                scope,
                id,
                loc,
            } => {
                if !active_loops.is_empty() {
                    let new_terminal = Terminal::PrunedScope {
                        block: *block,
                        fallthrough: *fallthrough,
                        scope: *scope,
                        id: *id,
                        loc: *loc,
                    };
                    // We need to drop the borrow and reborrow mutably
                    let block_mut = func.body.blocks.get_mut(&block_id).unwrap();
                    block_mut.terminal = new_terminal;
                }
            }
            // All other terminal kinds: no action needed
            _ => {}
        }
    }
}

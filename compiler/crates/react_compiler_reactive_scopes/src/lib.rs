// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Reactive scope passes for the React Compiler.
//!
//! Converts the HIR CFG into a tree-structured `ReactiveFunction` and runs
//! scope-related transformation passes (pruning, merging, renaming, etc.).
//!
//! Corresponds to `src/ReactiveScopes/` in the TypeScript compiler.

mod assert_scope_instructions_within_scopes;
mod assert_well_formed_break_targets;
mod build_reactive_function;
pub mod codegen_reactive_function;
mod extract_scope_declarations_from_destructuring;
mod merge_reactive_scopes_that_invalidate_together;
pub mod print_reactive_function;
mod promote_used_temporaries;
mod propagate_early_returns;
mod prune_always_invalidating_scopes;
mod prune_hoisted_contexts;
mod prune_non_escaping_scopes;
mod prune_non_reactive_dependencies;
mod prune_unused_labels;
mod prune_unused_lvalues;
mod prune_unused_scopes;
mod rename_variables;
mod stabilize_block_ids;
pub mod visitors;

pub use assert_scope_instructions_within_scopes::assert_scope_instructions_within_scopes;
pub use assert_well_formed_break_targets::assert_well_formed_break_targets;
pub use build_reactive_function::build_reactive_function;
pub use codegen_reactive_function::codegen_function;
pub use extract_scope_declarations_from_destructuring::extract_scope_declarations_from_destructuring;
pub use merge_reactive_scopes_that_invalidate_together::merge_reactive_scopes_that_invalidate_together;
pub use print_reactive_function::debug_reactive_function;
pub use promote_used_temporaries::promote_used_temporaries;
pub use propagate_early_returns::propagate_early_returns;
pub use prune_always_invalidating_scopes::prune_always_invalidating_scopes;
pub use prune_hoisted_contexts::prune_hoisted_contexts;
pub use prune_non_escaping_scopes::prune_non_escaping_scopes;
pub use prune_non_reactive_dependencies::prune_non_reactive_dependencies;
pub use prune_unused_labels::prune_unused_labels;
pub use prune_unused_lvalues::prune_unused_lvalues;
pub use prune_unused_scopes::prune_unused_scopes;
pub use rename_variables::rename_variables;
pub use stabilize_block_ids::stabilize_block_ids;

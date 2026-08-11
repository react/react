// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! For simplicity the majority of compiler passes do not treat hooks specially. However, hooks are
//! different from regular functions in two key ways:
//! - They can introduce reactivity even when their arguments are non-reactive (accounted for in
//!   InferReactivePlaces)
//! - They cannot be called conditionally
//!
//! The `use` operator is similar:
//! - It can access context, and therefore introduce reactivity
//! - It can be called conditionally, but _it must be called if the component needs the return value_.
//!   This is because React uses the fact that use was called to remember that the component needs the
//!   value, and that changes to the input should invalidate the component itself.
//!
//! This pass accounts for the "can't call conditionally" aspect of both hooks and use. Though the
//! reasoning is slightly different for each, the result is that we can't memoize scopes that call
//! hooks or use since this would make them called conditionally in the output.
//!
//! The pass finds and removes any scopes that transitively contain a hook or use call. By running all
//! the reactive scope inference first, agnostic of hooks, we know that the reactive scopes accurately
//! describe the set of values which "construct together", and remove _all_ that memoization in order
//! to ensure the hook call does not inadvertently become conditional.
//!
//! Analogous to TS `ReactiveScopes/FlattenScopesWithHooksOrUseHIR.ts`.

use react_compiler_diagnostics::{CompilerDiagnostic, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{BlockId, HirFunction, InstructionValue, Terminal, Type};

/// Flattens reactive scopes that contain hook calls or `use()` calls.
///
/// Hooks and `use` must be called unconditionally, so any reactive scope containing
/// such a call must be flattened to avoid making the call conditional.
pub fn flatten_scopes_with_hooks_or_use_hir(
    func: &mut HirFunction,
    env: &Environment,
) -> Result<(), CompilerDiagnostic> {
    let mut active_scopes: Vec<ActiveScope> = Vec::new();
    let mut prune: Vec<BlockId> = Vec::new();

    // Collect block ids to allow mutation during iteration
    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();

    for block_id in &block_ids {
        // Remove scopes whose fallthrough matches this block
        active_scopes.retain(|scope| scope.fallthrough != *block_id);

        let block = &func.body.blocks[block_id];

        // Check instructions for hook or use calls
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::CallExpression { callee, .. } => {
                    let callee_ty =
                        &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                    if is_hook_or_use(env, callee_ty)? {
                        // All active scopes must be pruned
                        prune.extend(active_scopes.iter().map(|s| s.block));
                        active_scopes.clear();
                    }
                }
                InstructionValue::MethodCall { property, .. } => {
                    let property_ty = &env.types
                        [env.identifiers[property.identifier.0 as usize].type_.0 as usize];
                    if is_hook_or_use(env, property_ty)? {
                        prune.extend(active_scopes.iter().map(|s| s.block));
                        active_scopes.clear();
                    }
                }
                _ => {}
            }
        }

        // Track scope terminals
        if let Terminal::Scope { fallthrough, .. } = &block.terminal {
            active_scopes.push(ActiveScope {
                block: *block_id,
                fallthrough: *fallthrough,
            });
        }
    }

    // Apply pruning: convert Scope terminals to Label or PrunedScope
    for id in prune {
        let block = &func.body.blocks[&id];
        let terminal = &block.terminal;

        let (scope_block, fallthrough, eval_id, loc, scope) = match terminal {
            Terminal::Scope {
                block,
                fallthrough,
                id,
                loc,
                scope,
            } => (*block, *fallthrough, *id, *loc, *scope),
            _ => {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    format!("Expected block bb{} to end in a scope terminal", id.0),
                    None,
                ));
            }
        };

        // Check if the scope body is a single-instruction block that goes directly
        // to fallthrough — if so, use Label instead of PrunedScope
        let body = &func.body.blocks[&scope_block];
        let new_terminal = if body.instructions.len() == 1
            && matches!(&body.terminal, Terminal::Goto { block, .. } if *block == fallthrough)
        {
            // This was a scope just for a hook call, which doesn't need memoization.
            // Flatten it away. We rely on PruneUnusedLabels to do the actual flattening.
            Terminal::Label {
                block: scope_block,
                fallthrough,
                id: eval_id,
                loc,
            }
        } else {
            Terminal::PrunedScope {
                block: scope_block,
                fallthrough,
                scope,
                id: eval_id,
                loc,
            }
        };

        let block_mut = func.body.blocks.get_mut(&id).unwrap();
        block_mut.terminal = new_terminal;
    }
    Ok(())
}

struct ActiveScope {
    block: BlockId,
    fallthrough: BlockId,
}

fn is_hook_or_use(env: &Environment, ty: &Type) -> Result<bool, CompilerDiagnostic> {
    Ok(env.get_hook_kind_for_type(ty)?.is_some() || react_compiler_hir::is_use_operator_type(ty))
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Aligns reactive scope boundaries to block scope boundaries in the HIR.
//!
//! Ported from TypeScript `src/ReactiveScopes/AlignReactiveScopesToBlockScopesHIR.ts`.
//!
//! This is the 2nd of 4 passes that determine how to break a function into
//! discrete reactive scopes (independently memoizable units of code):
//! 1. InferReactiveScopeVariables (on HIR) determines operands that mutate
//!    together and assigns them a unique reactive scope.
//! 2. AlignReactiveScopesToBlockScopes (this pass) aligns reactive scopes
//!    to block scopes.
//! 3. MergeOverlappingReactiveScopes ensures scopes do not overlap.
//! 4. BuildReactiveBlocks groups the statements for each scope.
//!
//! Prior inference passes assign a reactive scope to each operand, but the
//! ranges of these scopes are based on specific instructions at arbitrary
//! points in the control-flow graph. However, to codegen blocks around the
//! instructions in each scope, the scopes must be aligned to block-scope
//! boundaries — we can't memoize half of a loop!

use std::collections::HashMap;
use std::collections::HashSet;

use react_compiler_hir::BlockId;
use react_compiler_hir::BlockKind;
use react_compiler_hir::EvaluationOrder;
use react_compiler_hir::HirFunction;
use react_compiler_hir::IdentifierId;
use react_compiler_hir::MutableRange;
use react_compiler_hir::ScopeId;
use react_compiler_hir::Terminal;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors;
use react_compiler_hir::visitors::each_instruction_lvalue_ids;
use react_compiler_hir::visitors::each_instruction_value_operand_ids;
use react_compiler_hir::visitors::each_terminal_operand_ids;

// =============================================================================
// ValueBlockNode — stores the valueRange for scope alignment in value blocks
// =============================================================================

/// Tracks the value range for a value block. The `children` field from the TS
/// implementation is only used for debug output and is omitted here.
#[derive(Clone)]
struct ValueBlockNode {
    value_range: MutableRange,
}

/// Returns all block IDs referenced by a terminal, including both direct
/// successors and fallthrough.
fn all_terminal_block_ids(terminal: &Terminal) -> Vec<BlockId> {
    visitors::each_terminal_all_successors(terminal)
}

// =============================================================================
// Helper: get the first EvaluationOrder in a block
// =============================================================================

fn block_first_id(func: &HirFunction, block_id: BlockId) -> EvaluationOrder {
    let block = func.body.blocks.get(&block_id).unwrap();
    if !block.instructions.is_empty() {
        func.instructions[block.instructions[0].0 as usize].id
    } else {
        block.terminal.evaluation_order()
    }
}

// =============================================================================
// BlockFallthroughRange
// =============================================================================

#[derive(Clone)]
struct BlockFallthroughRange {
    fallthrough: BlockId,
    range: MutableRange,
}

// =============================================================================
// Public API
// =============================================================================

/// Aligns reactive scope boundaries to block scope boundaries in the HIR.
///
/// This pass updates reactive scope boundaries to align to control flow
/// boundaries. For example, if a scope ends partway through an if consequent,
/// the scope is extended to the end of the consequent block.
pub fn align_reactive_scopes_to_block_scopes_hir(func: &mut HirFunction, env: &mut Environment) {
    // Save original scope ranges BEFORE this pass modifies them.
    // In TS, identifier.mutableRange and scope.range may or may not be the same
    // JS object. Only identifiers whose mutableRange IS the scope's range object
    // (same reference) automatically see scope range modifications. In Rust, we
    // simulate this by recording original ranges and only syncing identifiers
    // whose mutableRange matches the original.
    let original_scope_ranges: Vec<MutableRange> =
        env.scopes.iter().map(|s| s.range.clone()).collect();

    let mut active_block_fallthrough_ranges: Vec<BlockFallthroughRange> = Vec::new();
    let mut active_scopes: HashSet<ScopeId> = HashSet::new();
    let mut seen: HashSet<ScopeId> = HashSet::new();
    let mut value_block_nodes: HashMap<BlockId, ValueBlockNode> = HashMap::new();

    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();

    for &block_id in &block_ids {
        let starting_id = block_first_id(func, block_id);

        // Retain only active scopes whose range.end > startingId
        active_scopes.retain(|&scope_id| env.scopes[scope_id.0 as usize].range.end > starting_id);

        // Check if we've reached a fallthrough block
        if let Some(top) = active_block_fallthrough_ranges.last().cloned() {
            if top.fallthrough == block_id {
                active_block_fallthrough_ranges.pop();
                // All active scopes overlap this block-fallthrough range;
                // extend their start to include the range start.
                for &scope_id in &active_scopes {
                    let scope = &mut env.scopes[scope_id.0 as usize];
                    scope.range.start = std::cmp::min(scope.range.start, top.range.start);
                }
            }
        }

        let node = value_block_nodes.get(&block_id).cloned();

        // Visit instruction lvalues and operands
        let block = func.body.blocks.get(&block_id).unwrap();
        let instr_ids: Vec<react_compiler_hir::InstructionId> =
            block.instructions.iter().copied().collect();
        for &instr_id in &instr_ids {
            let instr = &func.instructions[instr_id.0 as usize];
            let eval_order = instr.id;

            let lvalue_ids = each_instruction_lvalue_ids(instr);
            for lvalue_id in lvalue_ids {
                record_place_id(
                    eval_order,
                    lvalue_id,
                    &node,
                    env,
                    &mut active_scopes,
                    &mut seen,
                );
            }

            let operand_ids = each_instruction_value_operand_ids(&instr.value, env);
            for operand_id in operand_ids {
                record_place_id(
                    eval_order,
                    operand_id,
                    &node,
                    env,
                    &mut active_scopes,
                    &mut seen,
                );
            }
        }

        // Visit terminal operands
        let block = func.body.blocks.get(&block_id).unwrap();
        let terminal_eval_order = block.terminal.evaluation_order();
        let terminal_operand_ids = each_terminal_operand_ids(&block.terminal);
        for operand_id in terminal_operand_ids {
            record_place_id(
                terminal_eval_order,
                operand_id,
                &node,
                env,
                &mut active_scopes,
                &mut seen,
            );
        }

        let block = func.body.blocks.get(&block_id).unwrap();
        let terminal = &block.terminal;
        let fallthrough = visitors::terminal_fallthrough(terminal);
        let is_branch = matches!(terminal, Terminal::Branch { .. });
        let is_goto = match terminal {
            Terminal::Goto { block, .. } => Some(*block),
            _ => None,
        };
        let is_ternary_logical_optional = matches!(
            terminal,
            Terminal::Ternary { .. } | Terminal::Logical { .. } | Terminal::Optional { .. }
        );
        let all_successors = all_terminal_block_ids(terminal);

        // Handle fallthrough logic
        if let Some(ft) = fallthrough {
            if !is_branch {
                let next_id = block_first_id(func, ft);

                for &scope_id in &active_scopes {
                    let scope = &mut env.scopes[scope_id.0 as usize];
                    if scope.range.end > terminal_eval_order {
                        scope.range.end = std::cmp::max(scope.range.end, next_id);
                    }
                }

                active_block_fallthrough_ranges.push(BlockFallthroughRange {
                    fallthrough: ft,
                    range: env.new_mutable_range(terminal_eval_order, next_id),
                });

                assert!(
                    !value_block_nodes.contains_key(&ft),
                    "Expect hir blocks to have unique fallthroughs"
                );
                if let Some(n) = &node {
                    value_block_nodes.insert(ft, n.clone());
                }
            }
        } else if let Some(goto_block) = is_goto {
            // Handle goto to label
            let start_pos = active_block_fallthrough_ranges
                .iter()
                .position(|r| r.fallthrough == goto_block);
            let top_idx = if active_block_fallthrough_ranges.is_empty() {
                None
            } else {
                Some(active_block_fallthrough_ranges.len() - 1)
            };
            if let Some(pos) = start_pos {
                if top_idx != Some(pos) {
                    let start_range = active_block_fallthrough_ranges[pos].clone();
                    let first_id = block_first_id(func, start_range.fallthrough);

                    for &scope_id in &active_scopes {
                        let scope = &mut env.scopes[scope_id.0 as usize];
                        if scope.range.end <= terminal_eval_order {
                            continue;
                        }
                        scope.range.start =
                            std::cmp::min(start_range.range.start, scope.range.start);
                        scope.range.end = std::cmp::max(first_id, scope.range.end);
                    }
                }
            }
        }

        // Visit all successors to set up value block nodes
        for successor in all_successors {
            if value_block_nodes.contains_key(&successor) {
                continue;
            }

            let successor_block = func.body.blocks.get(&successor).unwrap();
            if successor_block.kind == BlockKind::Block || successor_block.kind == BlockKind::Catch
            {
                // Block or catch kind: don't create a value block node
            } else if node.is_none() || is_ternary_logical_optional {
                // Create a new node when transitioning non-value -> value,
                // or for ternary/logical/optional terminals.
                let value_range = if node.is_none() {
                    // Transition from block -> value block
                    let ft = fallthrough.expect("Expected a fallthrough for value block");
                    let next_id = block_first_id(func, ft);
                    env.new_mutable_range(terminal_eval_order, next_id)
                } else {
                    // Value -> value transition (ternary/logical/optional): reuse range
                    node.as_ref().unwrap().value_range.clone()
                };

                value_block_nodes.insert(successor, ValueBlockNode { value_range });
            } else {
                // Value -> value block transition: reuse the node
                if let Some(n) = &node {
                    value_block_nodes.insert(successor, n.clone());
                }
            }
        }
    }

    // Sync identifier mutable_range with their scope's range, but ONLY for
    // identifiers whose mutable_range matched their scope's ORIGINAL range
    // (before this pass modified it). In TS, identifier.mutableRange and
    // scope.range are only the same JS object for identifiers that were the
    // "canonical" representative when the scope was created. Other identifiers
    // in the same scope have independent mutableRange objects that should NOT
    // be updated when the scope's range changes.
    for ident in &mut env.identifiers {
        if let Some(scope_id) = ident.scope {
            let original = &original_scope_ranges[scope_id.0 as usize];
            if ident.mutable_range.same_range(original) {
                let scope_range = &env.scopes[scope_id.0 as usize].range;
                ident.mutable_range.start = scope_range.start;
                ident.mutable_range.end = scope_range.end;
            }
        }
    }
}

/// Records a place's scope as active and adjusts scope ranges for value blocks.
///
/// Mirrors TS `recordPlace(id, place, node)`.
fn record_place_id(
    id: EvaluationOrder,
    identifier_id: IdentifierId,
    node: &Option<ValueBlockNode>,
    env: &mut Environment,
    active_scopes: &mut HashSet<ScopeId>,
    seen: &mut HashSet<ScopeId>,
) {
    // Get the scope for this identifier, if active at this instruction
    let scope_id = match env.identifiers[identifier_id.0 as usize].scope {
        Some(scope_id) => {
            let scope = &env.scopes[scope_id.0 as usize];
            if id >= scope.range.start && id < scope.range.end {
                Some(scope_id)
            } else {
                None
            }
        }
        None => None,
    };

    if let Some(scope_id) = scope_id {
        active_scopes.insert(scope_id);

        if seen.contains(&scope_id) {
            return;
        }
        seen.insert(scope_id);

        if let Some(n) = node {
            let scope = &mut env.scopes[scope_id.0 as usize];
            scope.range.start = std::cmp::min(n.value_range.start, scope.range.start);
            scope.range.end = std::cmp::max(n.value_range.end, scope.range.end);
        }
    }
}

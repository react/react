// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Builds reactive scope terminals in the HIR.
//!
//! Given a function whose reactive scope ranges have been correctly aligned and
//! merged, this pass rewrites blocks to introduce ReactiveScopeTerminals and
//! their fallthrough blocks.
//!
//! Ported from TypeScript `src/HIR/BuildReactiveScopeTerminalsHIR.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use indexmap::IndexMap;
use react_compiler_hir::BasicBlock;
use react_compiler_hir::BlockId;
use react_compiler_hir::EvaluationOrder;
use react_compiler_hir::GotoVariant;
use react_compiler_hir::HirFunction;
use react_compiler_hir::IdentifierId;
use react_compiler_hir::ScopeId;
use react_compiler_hir::Terminal;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::each_instruction_lvalue_ids;
use react_compiler_hir::visitors::each_instruction_operand_ids;
use react_compiler_hir::visitors::each_terminal_operand_ids;
use react_compiler_lowering::get_reverse_postordered_blocks;
use react_compiler_lowering::mark_instruction_ids;
use react_compiler_lowering::mark_predecessors;

// =============================================================================
// getScopes
// =============================================================================

/// Collect all unique scopes from places in the function that have non-empty ranges.
/// Corresponds to TS `getScopes(fn)`.
fn get_scopes(func: &HirFunction, env: &Environment) -> Vec<ScopeId> {
    let mut scope_ids: HashSet<ScopeId> = HashSet::new();

    let mut visit_place = |identifier_id: IdentifierId| {
        if let Some(scope_id) = env.identifiers[identifier_id.0 as usize].scope {
            let range = &env.scopes[scope_id.0 as usize].range;
            if range.start != range.end {
                scope_ids.insert(scope_id);
            }
        }
    };

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            // lvalues
            for id in each_instruction_lvalue_ids(instr) {
                visit_place(id);
            }
            // operands
            for id in each_instruction_operand_ids(instr, env) {
                visit_place(id);
            }
        }
        // terminal operands
        for id in each_terminal_operand_ids(&block.terminal) {
            visit_place(id);
        }
    }

    scope_ids.into_iter().collect()
}

// =============================================================================
// TerminalRewriteInfo
// =============================================================================

enum TerminalRewriteInfo {
    StartScope {
        block_id: BlockId,
        fallthrough_id: BlockId,
        instr_id: EvaluationOrder,
        scope_id: ScopeId,
    },
    EndScope {
        instr_id: EvaluationOrder,
        fallthrough_id: BlockId,
    },
}

impl TerminalRewriteInfo {
    fn instr_id(&self) -> EvaluationOrder {
        match self {
            TerminalRewriteInfo::StartScope { instr_id, .. } => *instr_id,
            TerminalRewriteInfo::EndScope { instr_id, .. } => *instr_id,
        }
    }
}

// =============================================================================
// collectScopeRewrites
// =============================================================================

/// Collect all scope rewrites by traversing scopes in pre-order.
fn collect_scope_rewrites(func: &HirFunction, env: &mut Environment) -> Vec<TerminalRewriteInfo> {
    let scope_ids = get_scopes(func, env);

    // Sort: ascending by start, descending by end for ties
    let mut items: Vec<ScopeId> = scope_ids;
    items.sort_by(|a, b| {
        let a_range = &env.scopes[a.0 as usize].range;
        let b_range = &env.scopes[b.0 as usize].range;
        let start_diff = a_range.start.0.cmp(&b_range.start.0);
        if start_diff != std::cmp::Ordering::Equal {
            return start_diff;
        }
        b_range.end.0.cmp(&a_range.end.0)
    });

    let mut rewrites: Vec<TerminalRewriteInfo> = Vec::new();
    let mut fallthroughs: HashMap<ScopeId, BlockId> = HashMap::new();
    let mut active_items: Vec<ScopeId> = Vec::new();

    for i in 0..items.len() {
        let curr = items[i];
        let curr_start = env.scopes[curr.0 as usize].range.start;
        let curr_end = env.scopes[curr.0 as usize].range.end;

        // Pop active items that are disjoint with current
        let mut j = active_items.len();
        while j > 0 {
            j -= 1;
            let maybe_parent = active_items[j];
            let parent_end = env.scopes[maybe_parent.0 as usize].range.end;
            let disjoint = curr_start >= parent_end;
            let nested = curr_end <= parent_end;
            assert!(
                disjoint || nested,
                "Invalid nesting in program blocks or scopes"
            );
            if disjoint {
                // Exit this scope
                let fallthrough_id = *fallthroughs
                    .get(&maybe_parent)
                    .expect("Expected scope to exist");
                let end_instr_id = env.scopes[maybe_parent.0 as usize].range.end;
                rewrites.push(TerminalRewriteInfo::EndScope {
                    instr_id: end_instr_id,
                    fallthrough_id,
                });
                active_items.truncate(j);
            } else {
                break;
            }
        }

        // Enter scope
        let block_id = env.next_block_id();
        let fallthrough_id = env.next_block_id();
        let start_instr_id = env.scopes[curr.0 as usize].range.start;
        rewrites.push(TerminalRewriteInfo::StartScope {
            block_id,
            fallthrough_id,
            instr_id: start_instr_id,
            scope_id: curr,
        });
        fallthroughs.insert(curr, fallthrough_id);
        active_items.push(curr);
    }

    // Exit remaining active items
    while let Some(curr) = active_items.pop() {
        let fallthrough_id = *fallthroughs.get(&curr).expect("Expected scope to exist");
        let end_instr_id = env.scopes[curr.0 as usize].range.end;
        rewrites.push(TerminalRewriteInfo::EndScope {
            instr_id: end_instr_id,
            fallthrough_id,
        });
    }

    rewrites
}

// =============================================================================
// handleRewrite
// =============================================================================

struct RewriteContext {
    next_block_id: BlockId,
    next_preds: Vec<BlockId>,
    instr_slice_idx: usize,
    rewrites: Vec<BasicBlock>,
}

fn handle_rewrite(
    terminal_info: &TerminalRewriteInfo,
    idx: usize,
    source_block: &BasicBlock,
    context: &mut RewriteContext,
) {
    let terminal: Terminal = match terminal_info {
        TerminalRewriteInfo::StartScope {
            block_id,
            fallthrough_id,
            instr_id,
            scope_id,
        } => Terminal::Scope {
            fallthrough: *fallthrough_id,
            block: *block_id,
            scope: *scope_id,
            id: *instr_id,
            loc: None,
        },
        TerminalRewriteInfo::EndScope {
            instr_id,
            fallthrough_id,
        } => Terminal::Goto {
            variant: GotoVariant::Break,
            block: *fallthrough_id,
            id: *instr_id,
            loc: None,
        },
    };

    let curr_block_id = context.next_block_id;
    let mut preds = indexmap::IndexSet::new();
    for &p in &context.next_preds {
        preds.insert(p);
    }

    context.rewrites.push(BasicBlock {
        kind: source_block.kind,
        id: curr_block_id,
        instructions: source_block.instructions[context.instr_slice_idx..idx].to_vec(),
        preds,
        // Only the first rewrite should reuse source block phis
        phis: if context.rewrites.is_empty() {
            source_block.phis.clone()
        } else {
            Vec::new()
        },
        terminal,
    });

    context.next_preds = vec![curr_block_id];
    context.next_block_id = match terminal_info {
        TerminalRewriteInfo::StartScope { block_id, .. } => *block_id,
        TerminalRewriteInfo::EndScope { fallthrough_id, .. } => *fallthrough_id,
    };
    context.instr_slice_idx = idx;
}

// =============================================================================
// Public API
// =============================================================================

/// Builds reactive scope terminals in the HIR.
///
/// This pass assumes that all program blocks are properly nested with respect
/// to fallthroughs. Given a function whose reactive scope ranges have been
/// correctly aligned and merged, this pass rewrites blocks to introduce
/// ReactiveScopeTerminals and their fallthrough blocks.
pub fn build_reactive_scope_terminals_hir(func: &mut HirFunction, env: &mut Environment) {
    // Step 1: Collect rewrites
    let mut queued_rewrites = collect_scope_rewrites(func, env);

    // Step 2: Apply rewrites by splitting blocks
    let mut rewritten_final_blocks: HashMap<BlockId, BlockId> = HashMap::new();
    let mut next_blocks: IndexMap<BlockId, BasicBlock> = IndexMap::new();

    // Reverse so we can pop from the end while traversing in ascending order
    queued_rewrites.reverse();

    for (_block_id, block) in &func.body.blocks {
        let preds_vec: Vec<BlockId> = block.preds.iter().copied().collect();
        let mut context = RewriteContext {
            next_block_id: block.id,
            rewrites: Vec::new(),
            next_preds: preds_vec,
            instr_slice_idx: 0,
        };

        // Handle queued terminal rewrites at their nearest instruction ID
        for i in 0..block.instructions.len() + 1 {
            let instr_id = if i < block.instructions.len() {
                let instr_idx = block.instructions[i];
                func.instructions[instr_idx.0 as usize].id
            } else {
                block.terminal.evaluation_order()
            };

            while let Some(rewrite) = queued_rewrites.last() {
                if rewrite.instr_id() <= instr_id {
                    // Need to pop before calling handle_rewrite
                    let rewrite = queued_rewrites.pop().unwrap();
                    handle_rewrite(&rewrite, i, block, &mut context);
                } else {
                    break;
                }
            }
        }

        if !context.rewrites.is_empty() {
            let mut final_preds = indexmap::IndexSet::new();
            for &p in &context.next_preds {
                final_preds.insert(p);
            }
            let final_block = BasicBlock {
                id: context.next_block_id,
                kind: block.kind,
                preds: final_preds,
                terminal: block.terminal.clone(),
                instructions: block.instructions[context.instr_slice_idx..].to_vec(),
                phis: Vec::new(),
            };
            let final_block_id = final_block.id;
            context.rewrites.push(final_block);
            for b in context.rewrites {
                next_blocks.insert(b.id, b);
            }
            rewritten_final_blocks.insert(block.id, final_block_id);
        } else {
            next_blocks.insert(block.id, block.clone());
        }
    }

    func.body.blocks = next_blocks;

    // Step 3: Repoint phis when they refer to a rewritten block
    for block in func.body.blocks.values_mut() {
        for phi in &mut block.phis {
            let updates: Vec<(BlockId, BlockId)> = phi
                .operands
                .keys()
                .filter_map(|original_id| {
                    rewritten_final_blocks
                        .get(original_id)
                        .map(|new_id| (*original_id, *new_id))
                })
                .collect();
            for (old_id, new_id) in updates {
                if let Some(value) = phi.operands.shift_remove(&old_id) {
                    phi.operands.insert(new_id, value);
                }
            }
        }
    }

    // Step 4: Fixup HIR to restore RPO, correct predecessors, renumber instructions
    func.body.blocks = get_reverse_postordered_blocks(&func.body, &func.instructions);
    mark_predecessors(&mut func.body);
    mark_instruction_ids(&mut func.body, &mut func.instructions);

    // Step 5: Fix scope and identifier ranges to account for renumbered instructions
    fix_scope_and_identifier_ranges(func, env);
}

/// Fix scope ranges after instruction renumbering.
/// Scope ranges should always align to start at the 'scope' terminal
/// and end at the first instruction of the fallthrough block.
///
/// In TS, `identifier.mutableRange` and `scope.range` are the same object
/// reference (after InferReactiveScopeVariables). When scope.range is updated,
/// all identifiers with that scope automatically see the new range.
/// BUT: after MergeOverlappingReactiveScopesHIR, repointed identifiers have
/// mutableRange pointing to the OLD scope's range, NOT the root scope's range.
/// So only identifiers whose mutableRange matches their scope's pre-renumbering
/// range should be updated.
///
/// Corresponds to TS `fixScopeAndIdentifierRanges`.
fn fix_scope_and_identifier_ranges(func: &HirFunction, env: &mut Environment) {
    // Save original scope ranges before updating them. In TS,
    // identifier.mutableRange and scope.range may or may not be the same
    // JS object. Only identifiers whose mutableRange shares the same object
    // reference as scope.range see the update automatically. We simulate
    // this by only syncing identifiers whose mutableRange matches the
    // scope's pre-update range.
    let original_scope_ranges: Vec<react_compiler_hir::MutableRange> =
        env.scopes.iter().map(|s| s.range.clone()).collect();

    for (_block_id, block) in &func.body.blocks {
        match &block.terminal {
            Terminal::Scope {
                fallthrough,
                scope,
                id,
                ..
            }
            | Terminal::PrunedScope {
                fallthrough,
                scope,
                id,
                ..
            } => {
                let fallthrough_block = func.body.blocks.get(fallthrough).unwrap();
                let first_id = if !fallthrough_block.instructions.is_empty() {
                    func.instructions[fallthrough_block.instructions[0].0 as usize].id
                } else {
                    fallthrough_block.terminal.evaluation_order()
                };
                env.scopes[scope.0 as usize].range.start = *id;
                env.scopes[scope.0 as usize].range.end = first_id;
            }
            _ => {}
        }
    }

    // Sync identifier mutable ranges with their scope ranges, but ONLY
    // for identifiers whose mutableRange has the same identity as their
    // scope's ORIGINAL range (before the updates above). In TS,
    // identifier.mutableRange and scope.range are only the same JS object
    // for identifiers that were the canonical representative when the scope
    // was created. After MergeOverlappingReactiveScopesHIR, repointed
    // identifiers have mutableRange pointing to the OLD scope's range,
    // not the root scope's range — so they should NOT be synced here.
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

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Inlines immediately invoked function expressions (IIFEs) to allow more
//! fine-grained memoization of the values they produce.
//!
//! Example:
//! ```text
//! const x = (() => {
//!    const x = [];
//!    x.push(foo());
//!    return x;
//! })();
//!
//! =>
//!
//! bb0:
//!     // placeholder for the result, all return statements will assign here
//!    let t0;
//!    // Label allows using a goto (break) to exit out of the body
//!    Label block=bb1 fallthrough=bb2
//! bb1:
//!    // code within the function expression
//!    const x0 = [];
//!    x0.push(foo());
//!    // return is replaced by assignment to the result variable...
//!    t0 = x0;
//!    // ...and a goto to the code after the function expression invocation
//!    Goto bb2
//! bb2:
//!    // code after the IIFE call
//!    const x = t0;
//! ```
//!
//! If the inlined function has only one return, we avoid the labeled block
//! and fully inline the code. The original return is replaced with an assignment
//! to the IIFE's call expression lvalue.
//!
//! Analogous to TS `Inference/InlineImmediatelyInvokedFunctionExpressions.ts`.

use std::collections::{HashMap, HashSet};

use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors;
use react_compiler_hir::{
    BasicBlock, BlockId, BlockKind, EvaluationOrder, FunctionId, GENERATED_SOURCE, GotoVariant,
    HirFunction, IdentifierId, IdentifierName, Instruction, InstructionId, InstructionKind,
    InstructionValue, LValue, Place, Terminal,
};
use react_compiler_lowering::{
    create_temporary_place, get_reverse_postordered_blocks, mark_instruction_ids, mark_predecessors,
};

use crate::merge_consecutive_blocks::merge_consecutive_blocks;

/// Inline immediately invoked function expressions into the enclosing function's
/// control flow graph.
pub fn inline_immediately_invoked_function_expressions(
    func: &mut HirFunction,
    env: &mut Environment,
) {
    // Track all function expressions that are assigned to a temporary
    let mut functions: HashMap<IdentifierId, FunctionId> = HashMap::new();
    // Functions that are inlined (by identifier id of the callee)
    let mut inlined_functions: HashSet<IdentifierId> = HashSet::new();

    // Iterate the *existing* blocks from the outer component to find IIFEs
    // and inline them. During iteration we will modify `func` (by inlining the CFG
    // of IIFEs) so we explicitly copy references to just the original
    // function's block IDs first. As blocks are split to make room for IIFE calls,
    // the split portions of the blocks will be added to this queue.
    let mut queue: Vec<BlockId> = func.body.blocks.keys().copied().collect();
    let mut queue_idx = 0;

    'queue: while queue_idx < queue.len() {
        let block_id = queue[queue_idx];
        queue_idx += 1;

        let block = match func.body.blocks.get(&block_id) {
            Some(b) => b,
            None => continue,
        };

        // We can't handle labels inside expressions yet, so we don't inline IIFEs
        // if they are in an expression block.
        if !is_statement_block_kind(block.kind) {
            continue;
        }

        let num_instructions = block.instructions.len();
        for ii in 0..num_instructions {
            let instr_id = func.body.blocks[&block_id].instructions[ii];
            let instr = &func.instructions[instr_id.0 as usize];

            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. } => {
                    let identifier_id = instr.lvalue.identifier;
                    if env.identifiers[identifier_id.0 as usize].name.is_none() {
                        functions.insert(identifier_id, lowered_func.func);
                    }
                    continue;
                }
                InstructionValue::CallExpression { callee, args, .. } => {
                    if !args.is_empty() {
                        // We don't support inlining when there are arguments
                        continue;
                    }

                    let callee_id = callee.identifier;
                    let inner_func_id = match functions.get(&callee_id) {
                        Some(id) => *id,
                        None => continue, // Not invoking a local function expression
                    };

                    let inner_func = &env.functions[inner_func_id.0 as usize];
                    if !inner_func.params.is_empty() || inner_func.is_async || inner_func.generator
                    {
                        // Can't inline functions with params, or async/generator functions
                        continue;
                    }

                    // We know this function is used for an IIFE and can prune it later
                    inlined_functions.insert(callee_id);

                    // Capture the lvalue from the call instruction
                    let call_lvalue = func.instructions[instr_id.0 as usize].lvalue.clone();
                    let block_terminal_id = func.body.blocks[&block_id].terminal.evaluation_order();
                    let block_terminal_loc = func.body.blocks[&block_id].terminal.loc().cloned();
                    let block_kind = func.body.blocks[&block_id].kind;

                    // Create a new block which will contain code following the IIFE call
                    let continuation_block_id = env.next_block_id();
                    let continuation_instructions: Vec<InstructionId> =
                        func.body.blocks[&block_id].instructions[ii + 1..].to_vec();
                    let continuation_terminal = func.body.blocks[&block_id].terminal.clone();
                    let continuation_block = BasicBlock {
                        id: continuation_block_id,
                        instructions: continuation_instructions,
                        kind: block_kind,
                        phis: Vec::new(),
                        preds: indexmap::IndexSet::new(),
                        terminal: continuation_terminal,
                    };
                    func.body
                        .blocks
                        .insert(continuation_block_id, continuation_block);

                    // Trim the original block to contain instructions up to (but not including)
                    // the IIFE
                    func.body
                        .blocks
                        .get_mut(&block_id)
                        .unwrap()
                        .instructions
                        .truncate(ii);

                    let has_single_return =
                        has_single_exit_return_terminal(&env.functions[inner_func_id.0 as usize]);
                    let inner_entry = env.functions[inner_func_id.0 as usize].body.entry;

                    if has_single_return {
                        // Single-return path: simple goto replacement
                        func.body.blocks.get_mut(&block_id).unwrap().terminal = Terminal::Goto {
                            block: inner_entry,
                            id: block_terminal_id,
                            loc: block_terminal_loc,
                            variant: GotoVariant::Break,
                        };

                        // Take blocks and instructions from inner function
                        let inner_func = &mut env.functions[inner_func_id.0 as usize];
                        let inner_blocks: Vec<(BlockId, BasicBlock)> =
                            inner_func.body.blocks.drain(..).collect();
                        let inner_instructions: Vec<Instruction> =
                            inner_func.instructions.drain(..).collect();

                        // Append inner instructions first, then remap block instruction IDs
                        let instr_offset = func.instructions.len() as u32;
                        func.instructions.extend(inner_instructions);

                        for (_, mut inner_block) in inner_blocks {
                            // Remap instruction IDs in the block
                            for iid in &mut inner_block.instructions {
                                *iid = InstructionId(iid.0 + instr_offset);
                            }
                            inner_block.preds.clear();

                            if let Terminal::Return {
                                value,
                                id: ret_id,
                                loc: ret_loc,
                                ..
                            } = &inner_block.terminal
                            {
                                // Replace return with LoadLocal + goto
                                let load_instr = Instruction {
                                    id: EvaluationOrder(0),
                                    loc: ret_loc.clone(),
                                    lvalue: call_lvalue.clone(),
                                    value: InstructionValue::LoadLocal {
                                        place: value.clone(),
                                        loc: ret_loc.clone(),
                                    },
                                    effects: None,
                                };
                                let load_instr_id = InstructionId(func.instructions.len() as u32);
                                func.instructions.push(load_instr);
                                inner_block.instructions.push(load_instr_id);

                                let ret_id = *ret_id;
                                let ret_loc = ret_loc.clone();
                                inner_block.terminal = Terminal::Goto {
                                    block: continuation_block_id,
                                    id: ret_id,
                                    loc: ret_loc,
                                    variant: GotoVariant::Break,
                                };
                            }

                            func.body.blocks.insert(inner_block.id, inner_block);
                        }
                    } else {
                        // Multi-return path: uses LabelTerminal
                        let result = call_lvalue.clone();

                        // Set block terminal to Label
                        func.body.blocks.get_mut(&block_id).unwrap().terminal = Terminal::Label {
                            block: inner_entry,
                            id: EvaluationOrder(0),
                            fallthrough: continuation_block_id,
                            loc: block_terminal_loc,
                        };

                        // Declare the IIFE temporary
                        declare_temporary(env, func, block_id, &result);

                        // Promote the temporary with a name as we require this to persist
                        let identifier_id = result.identifier;
                        if env.identifiers[identifier_id.0 as usize].name.is_none() {
                            promote_temporary(env, identifier_id);
                        }

                        // Take blocks and instructions from inner function
                        let inner_func = &mut env.functions[inner_func_id.0 as usize];
                        let inner_blocks: Vec<(BlockId, BasicBlock)> =
                            inner_func.body.blocks.drain(..).collect();
                        let inner_instructions: Vec<Instruction> =
                            inner_func.instructions.drain(..).collect();

                        // Append inner instructions first, then remap block instruction IDs
                        let instr_offset = func.instructions.len() as u32;
                        func.instructions.extend(inner_instructions);

                        for (_, mut inner_block) in inner_blocks {
                            for iid in &mut inner_block.instructions {
                                *iid = InstructionId(iid.0 + instr_offset);
                            }
                            inner_block.preds.clear();

                            // Rewrite return terminals to StoreLocal + goto
                            if matches!(inner_block.terminal, Terminal::Return { .. }) {
                                rewrite_block(
                                    env,
                                    &mut func.instructions,
                                    &mut inner_block,
                                    continuation_block_id,
                                    &result,
                                );
                            }

                            func.body.blocks.insert(inner_block.id, inner_block);
                        }
                    }

                    // Ensure we visit the continuation block, since there may have been
                    // sequential IIFEs that need to be visited.
                    queue.push(continuation_block_id);
                    continue 'queue;
                }
                _ => {
                    // Any other use of a function expression means it isn't an IIFE
                    for id in visitors::each_instruction_value_operand_ids(&instr.value, env) {
                        functions.remove(&id);
                    }
                }
            }
        }
    }

    if !inlined_functions.is_empty() {
        // Remove instructions that define lambdas which we inlined
        for block in func.body.blocks.values_mut() {
            block.instructions.retain(|instr_id| {
                let instr = &func.instructions[instr_id.0 as usize];
                !inlined_functions.contains(&instr.lvalue.identifier)
            });
        }

        // If terminals have changed then blocks may have become newly unreachable.
        // Re-run minification of the graph (incl reordering instruction ids).
        func.body.blocks = get_reverse_postordered_blocks(&func.body, &func.instructions);
        mark_instruction_ids(&mut func.body, &mut func.instructions);
        mark_predecessors(&mut func.body);
        merge_consecutive_blocks(func, &mut env.functions);
    }
}

/// Returns true for "block" and "catch" block kinds which correspond to statements
/// in the source.
fn is_statement_block_kind(kind: BlockKind) -> bool {
    matches!(kind, BlockKind::Block | BlockKind::Catch)
}

/// Returns true if the function has a single exit terminal (throw/return) which is a return.
fn has_single_exit_return_terminal(func: &HirFunction) -> bool {
    let mut has_return = false;
    let mut exit_count = 0;
    for block in func.body.blocks.values() {
        match &block.terminal {
            Terminal::Return { .. } => {
                has_return = true;
                exit_count += 1;
            }
            Terminal::Throw { .. } => {
                exit_count += 1;
            }
            _ => {}
        }
    }
    exit_count == 1 && has_return
}

/// Rewrites the block so that all `return` terminals are replaced:
/// * Add a StoreLocal <return_value> = <terminal.value>
/// * Replace the terminal with a Goto to <return_target>
fn rewrite_block(
    env: &mut Environment,
    instructions: &mut Vec<Instruction>,
    block: &mut BasicBlock,
    return_target: BlockId,
    return_value: &Place,
) {
    if let Terminal::Return {
        value,
        loc: ret_loc,
        ..
    } = &block.terminal
    {
        let store_lvalue = create_temporary_place(env, ret_loc.clone());
        let store_instr = Instruction {
            id: EvaluationOrder(0),
            loc: ret_loc.clone(),
            lvalue: store_lvalue,
            value: InstructionValue::StoreLocal {
                lvalue: LValue {
                    kind: InstructionKind::Reassign,
                    place: return_value.clone(),
                },
                value: value.clone(),
                type_annotation: None,
                loc: ret_loc.clone(),
            },
            effects: None,
        };
        let store_instr_id = InstructionId(instructions.len() as u32);
        instructions.push(store_instr);
        block.instructions.push(store_instr_id);

        let ret_loc = ret_loc.clone();
        block.terminal = Terminal::Goto {
            block: return_target,
            id: EvaluationOrder(0),
            variant: GotoVariant::Break,
            loc: ret_loc,
        };
    }
}

/// Emits a DeclareLocal instruction for the result temporary.
fn declare_temporary(
    env: &mut Environment,
    func: &mut HirFunction,
    block_id: BlockId,
    result: &Place,
) {
    let declare_lvalue = create_temporary_place(env, result.loc.clone());
    let declare_instr = Instruction {
        id: EvaluationOrder(0),
        loc: GENERATED_SOURCE,
        lvalue: declare_lvalue,
        value: InstructionValue::DeclareLocal {
            lvalue: LValue {
                place: result.clone(),
                kind: InstructionKind::Let,
            },
            type_annotation: None,
            loc: result.loc.clone(),
        },
        effects: None,
    };
    let instr_id = InstructionId(func.instructions.len() as u32);
    func.instructions.push(declare_instr);
    func.body
        .blocks
        .get_mut(&block_id)
        .unwrap()
        .instructions
        .push(instr_id);
}

/// Promote a temporary identifier to a named identifier.
fn promote_temporary(env: &mut Environment, identifier_id: IdentifierId) {
    let decl_id = env.identifiers[identifier_id.0 as usize].declaration_id;
    env.identifiers[identifier_id.0 as usize].name =
        Some(IdentifierName::Promoted(format!("#t{}", decl_id.0)));
}

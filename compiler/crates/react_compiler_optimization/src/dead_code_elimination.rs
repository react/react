// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Dead code elimination pass.
//!
//! Eliminates instructions whose values are unused, reducing generated code size.
//! Performs mark-and-sweep analysis to identify and remove dead code while
//! preserving side effects and program semantics.
//!
//! Ported from TypeScript `src/Optimization/DeadCodeElimination.ts`.

use rustc_hash::FxHashSet;

use react_compiler_hir::environment::{Environment, OutputMode};
use react_compiler_hir::object_shape::HookKind;
use react_compiler_hir::visitors;
use react_compiler_hir::{
    ArrayPatternElement, BlockId, BlockKind, HirFunction, IdentifierId, InstructionKind,
    InstructionValue, ObjectPropertyOrSpread, Pattern,
};

/// Implements dead-code elimination, eliminating instructions whose values are unused.
///
/// Note that unreachable blocks are already pruned during HIR construction.
///
/// Corresponds to TS `deadCodeElimination(fn: HIRFunction): void`.
pub fn dead_code_elimination(func: &mut HirFunction, env: &Environment) {
    // Phase 1: Find/mark all referenced identifiers
    let state = find_referenced_identifiers(func, env);

    // Phase 2: Prune / sweep unreferenced identifiers and instructions
    // Collect instructions to rewrite (two-phase: collect then apply to avoid borrow conflicts)
    let mut instructions_to_rewrite: Vec<react_compiler_hir::InstructionId> = Vec::new();

    for (_block_id, block) in &mut func.body.blocks {
        // Remove unused phi nodes
        block
            .phis
            .retain(|phi| is_id_or_name_used(&state, &env.identifiers, phi.place.identifier));

        // Remove instructions with unused lvalues
        block.instructions.retain(|instr_id| {
            let instr = &func.instructions[instr_id.0 as usize];
            is_id_or_name_used(&state, &env.identifiers, instr.lvalue.identifier)
        });

        // Collect instructions that need rewriting (not the block value)
        let retained_count = block.instructions.len();
        for i in 0..retained_count {
            let is_block_value = block.kind != BlockKind::Block && i == retained_count - 1;
            if !is_block_value {
                instructions_to_rewrite.push(block.instructions[i]);
            }
        }
    }

    // Apply rewrites
    for instr_id in instructions_to_rewrite {
        rewrite_instruction(func, instr_id, &state, env);
    }

    // Remove unused context variables
    func.context
        .retain(|ctx_var| is_id_or_name_used(&state, &env.identifiers, ctx_var.identifier));
}

/// State for tracking referenced identifiers during mark phase.
struct State {
    /// SSA-specific usages (by IdentifierId)
    identifiers: FxHashSet<IdentifierId>,
    /// Named variable usages (any version)
    named: FxHashSet<String>,
}

impl State {
    fn new() -> Self {
        State {
            identifiers: FxHashSet::default(),
            named: FxHashSet::default(),
        }
    }

    fn count(&self) -> usize {
        self.identifiers.len()
    }
}

/// Mark an identifier as being referenced (not dead code).
fn reference(
    state: &mut State,
    identifiers: &[react_compiler_hir::Identifier],
    identifier_id: IdentifierId,
) {
    state.identifiers.insert(identifier_id);
    let ident = &identifiers[identifier_id.0 as usize];
    if let Some(ref name) = ident.name {
        state.named.insert(name.value().to_string());
    }
}

/// Check if any version of the given identifier is used somewhere.
/// Checks both the specific SSA id and (for named identifiers) any usage of that name.
fn is_id_or_name_used(
    state: &State,
    identifiers: &[react_compiler_hir::Identifier],
    identifier_id: IdentifierId,
) -> bool {
    if state.identifiers.contains(&identifier_id) {
        return true;
    }
    let ident = &identifiers[identifier_id.0 as usize];
    if let Some(ref name) = ident.name {
        state.named.contains(name.value())
    } else {
        false
    }
}

/// Check if this specific SSA id is used.
fn is_id_used(state: &State, identifier_id: IdentifierId) -> bool {
    state.identifiers.contains(&identifier_id)
}

/// Phase 1: Find all referenced identifiers via fixed-point iteration.
fn find_referenced_identifiers(func: &HirFunction, env: &Environment) -> State {
    let has_loop = has_back_edge(func);
    // Collect block ids in reverse order (postorder - successors before predecessors)
    let reversed_block_ids: Vec<BlockId> = func.body.blocks.keys().rev().copied().collect();

    let mut state = State::new();
    let mut size;

    loop {
        size = state.count();

        for &block_id in &reversed_block_ids {
            let block = &func.body.blocks[&block_id];

            // Mark terminal operands
            for place in visitors::each_terminal_operand(&block.terminal) {
                reference(&mut state, &env.identifiers, place.identifier);
            }

            // Process instructions in reverse order
            let instr_count = block.instructions.len();
            for i in (0..instr_count).rev() {
                let instr_id = block.instructions[i];
                let instr = &func.instructions[instr_id.0 as usize];

                let is_block_value = block.kind != BlockKind::Block && i == instr_count - 1;

                if is_block_value {
                    // Last instr of a value block is never eligible for pruning
                    reference(&mut state, &env.identifiers, instr.lvalue.identifier);
                    for place in visitors::each_instruction_value_operand(&instr.value, env) {
                        reference(&mut state, &env.identifiers, place.identifier);
                    }
                } else if is_id_or_name_used(&state, &env.identifiers, instr.lvalue.identifier)
                    || !pruneable_value(&instr.value, &state, env)
                {
                    reference(&mut state, &env.identifiers, instr.lvalue.identifier);

                    if let InstructionValue::StoreLocal { lvalue, value, .. } = &instr.value {
                        // If this is a Let/Const declaration, mark the initializer as referenced
                        // only if the SSA'd lval is also referenced
                        if lvalue.kind == InstructionKind::Reassign
                            || is_id_used(&state, lvalue.place.identifier)
                        {
                            reference(&mut state, &env.identifiers, value.identifier);
                        }
                    } else {
                        for place in visitors::each_instruction_value_operand(&instr.value, env) {
                            reference(&mut state, &env.identifiers, place.identifier);
                        }
                    }
                }
            }

            // Mark phi operands if phi result is used
            for phi in &block.phis {
                if is_id_or_name_used(&state, &env.identifiers, phi.place.identifier) {
                    for (_pred, operand) in &phi.operands {
                        reference(&mut state, &env.identifiers, operand.identifier);
                    }
                }
            }
        }

        if !(state.count() > size && has_loop) {
            break;
        }
    }

    state
}

/// Rewrite a retained instruction (destructuring cleanup, StoreLocal -> DeclareLocal).
fn rewrite_instruction(
    func: &mut HirFunction,
    instr_id: react_compiler_hir::InstructionId,
    state: &State,
    env: &Environment,
) {
    let instr = &mut func.instructions[instr_id.0 as usize];

    match &mut instr.value {
        InstructionValue::Destructure { lvalue, .. } => {
            match &mut lvalue.pattern {
                Pattern::Array(arr) => {
                    // For arrays, replace unused items with holes, truncate trailing holes
                    let mut last_entry_index = 0;
                    for i in 0..arr.items.len() {
                        match &arr.items[i] {
                            ArrayPatternElement::Place(p) => {
                                if !is_id_or_name_used(state, &env.identifiers, p.identifier) {
                                    arr.items[i] = ArrayPatternElement::Hole;
                                } else {
                                    last_entry_index = i;
                                }
                            }
                            ArrayPatternElement::Spread(s) => {
                                if !is_id_or_name_used(state, &env.identifiers, s.place.identifier)
                                {
                                    arr.items[i] = ArrayPatternElement::Hole;
                                } else {
                                    last_entry_index = i;
                                }
                            }
                            ArrayPatternElement::Hole => {}
                        }
                    }
                    arr.items.truncate(last_entry_index + 1);
                }
                Pattern::Object(obj) => {
                    // For objects, prune unused properties if rest element is unused or absent
                    let mut next_properties: Option<Vec<ObjectPropertyOrSpread>> = None;
                    for prop in &obj.properties {
                        match prop {
                            ObjectPropertyOrSpread::Property(p) => {
                                if is_id_or_name_used(state, &env.identifiers, p.place.identifier) {
                                    next_properties
                                        .get_or_insert_with(Vec::new)
                                        .push(prop.clone());
                                }
                            }
                            ObjectPropertyOrSpread::Spread(s) => {
                                if is_id_or_name_used(state, &env.identifiers, s.place.identifier) {
                                    // Rest element is used, can't prune anything
                                    next_properties = None;
                                    break;
                                }
                            }
                        }
                    }
                    if let Some(props) = next_properties {
                        obj.properties = props;
                    }
                }
            }
        }
        InstructionValue::StoreLocal {
            lvalue,
            type_annotation,
            loc,
            ..
        } => {
            if lvalue.kind != InstructionKind::Reassign
                && !is_id_used(state, lvalue.place.identifier)
            {
                // This is a const/let declaration where the variable is accessed later,
                // but where the value is always overwritten before being read.
                // Rewrite to DeclareLocal so the initializer value can be DCE'd.
                let new_lvalue = lvalue.clone();
                let new_type_annotation = type_annotation.clone();
                let new_loc = *loc;
                instr.value = InstructionValue::DeclareLocal {
                    lvalue: new_lvalue,
                    type_annotation: new_type_annotation,
                    loc: new_loc,
                };
            }
        }
        _ => {}
    }
}

/// Returns true if it is safe to prune an instruction with the given value.
fn pruneable_value(value: &InstructionValue, state: &State, env: &Environment) -> bool {
    match value {
        InstructionValue::DeclareLocal { lvalue, .. } => {
            // Declarations are pruneable only if the named variable is never read later
            !is_id_or_name_used(state, &env.identifiers, lvalue.place.identifier)
        }
        InstructionValue::StoreLocal { lvalue, .. } => {
            if lvalue.kind == InstructionKind::Reassign {
                // Reassignments can be pruned if the specific instance being assigned is never read
                !is_id_used(state, lvalue.place.identifier)
            } else {
                // Declarations are pruneable only if the named variable is never read later
                !is_id_or_name_used(state, &env.identifiers, lvalue.place.identifier)
            }
        }
        InstructionValue::Destructure { lvalue, .. } => {
            let mut is_id_or_name_used_flag = false;
            let mut is_id_used_flag = false;
            for place in visitors::each_pattern_operand(&lvalue.pattern) {
                if is_id_used(state, place.identifier) {
                    is_id_or_name_used_flag = true;
                    is_id_used_flag = true;
                } else if is_id_or_name_used(state, &env.identifiers, place.identifier) {
                    is_id_or_name_used_flag = true;
                }
            }
            if lvalue.kind == InstructionKind::Reassign {
                !is_id_used_flag
            } else {
                !is_id_or_name_used_flag
            }
        }
        InstructionValue::PostfixUpdate { lvalue, .. }
        | InstructionValue::PrefixUpdate { lvalue, .. } => {
            // Updates are pruneable if the specific instance being assigned is never read
            !is_id_used(state, lvalue.identifier)
        }
        InstructionValue::Debugger { .. } => {
            // explicitly retain debugger statements
            false
        }
        InstructionValue::CallExpression { callee, .. } => {
            if env.output_mode == OutputMode::Ssr {
                let callee_ty =
                    &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                if let Some(hook_kind) = env.get_hook_kind_for_type(callee_ty).ok().flatten() {
                    match hook_kind {
                        HookKind::UseState | HookKind::UseReducer | HookKind::UseRef => {
                            return true;
                        }
                        _ => {}
                    }
                }
            }
            false
        }
        InstructionValue::MethodCall { property, .. } => {
            if env.output_mode == OutputMode::Ssr {
                let callee_ty =
                    &env.types[env.identifiers[property.identifier.0 as usize].type_.0 as usize];
                if let Some(hook_kind) = env.get_hook_kind_for_type(callee_ty).ok().flatten() {
                    match hook_kind {
                        HookKind::UseState | HookKind::UseReducer | HookKind::UseRef => {
                            return true;
                        }
                        _ => {}
                    }
                }
            }
            false
        }
        InstructionValue::Await { .. }
        | InstructionValue::ComputedDelete { .. }
        | InstructionValue::ComputedStore { .. }
        | InstructionValue::PropertyDelete { .. }
        | InstructionValue::PropertyStore { .. }
        | InstructionValue::StoreGlobal { .. } => {
            // Mutating instructions are not safe to prune
            false
        }
        InstructionValue::NewExpression { .. }
        | InstructionValue::UnsupportedNode { .. }
        | InstructionValue::TaggedTemplateExpression { .. } => {
            // Potentially safe to prune, but we conservatively keep them
            false
        }
        InstructionValue::GetIterator { .. }
        | InstructionValue::NextPropertyOf { .. }
        | InstructionValue::IteratorNext { .. } => {
            // Iterator operations are always used downstream
            false
        }
        InstructionValue::LoadContext { .. }
        | InstructionValue::DeclareContext { .. }
        | InstructionValue::StoreContext { .. } => false,
        InstructionValue::StartMemoize { .. } | InstructionValue::FinishMemoize { .. } => false,
        InstructionValue::RegExpLiteral { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::LoadGlobal { .. }
        | InstructionValue::ArrayExpression { .. }
        | InstructionValue::BinaryExpression { .. }
        | InstructionValue::ComputedLoad { .. }
        | InstructionValue::ObjectMethod { .. }
        | InstructionValue::FunctionExpression { .. }
        | InstructionValue::LoadLocal { .. }
        | InstructionValue::JsxExpression { .. }
        | InstructionValue::JsxFragment { .. }
        | InstructionValue::JSXText { .. }
        | InstructionValue::ObjectExpression { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::PropertyLoad { .. }
        | InstructionValue::TemplateLiteral { .. }
        | InstructionValue::TypeCastExpression { .. }
        | InstructionValue::UnaryExpression { .. } => {
            // Definitely safe to prune since they are read-only
            true
        }
    }
}

/// Check if the CFG has any back edges (indicating loops).
fn has_back_edge(func: &HirFunction) -> bool {
    let mut visited: FxHashSet<BlockId> = FxHashSet::default();
    for (block_id, block) in &func.body.blocks {
        for pred_id in &block.preds {
            if !visited.contains(pred_id) {
                return true;
            }
        }
        visited.insert(*block_id);
    }
    false
}

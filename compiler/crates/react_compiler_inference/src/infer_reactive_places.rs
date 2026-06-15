// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Infers which `Place`s are reactive.
//!
//! Ported from TypeScript `src/Inference/InferReactivePlaces.ts`.
//!
//! A place is reactive if it derives from any source of reactivity:
//! 1. Props (component parameters may change between renders)
//! 2. Hooks (can access state or context)
//! 3. `use` operator (can access context)
//! 4. Mutation with reactive operands
//! 5. Conditional assignment based on reactive control flow

use std::collections::{HashMap, HashSet};

use react_compiler_diagnostics::{CompilerDiagnostic, ErrorCategory};
use react_compiler_hir::dominator::post_dominator_frontier;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::object_shape::HookKind;
use react_compiler_hir::visitors;
use react_compiler_hir::{
    BlockId, Effect, FunctionId, HirFunction, IdentifierId, InstructionValue, ParamPattern,
    Terminal, Type,
};

use react_compiler_utils::DisjointSet;

use crate::infer_reactive_scope_variables::find_disjoint_mutable_values;

// =============================================================================
// Public API
// =============================================================================

/// Infer which places in a function are reactive.
///
/// Corresponds to TS `inferReactivePlaces(fn: HIRFunction): void`.
pub fn infer_reactive_places(
    func: &mut HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerDiagnostic> {
    let mut aliased_identifiers = find_disjoint_mutable_values(func, env);
    let mut reactive_map = ReactivityMap::new(&mut aliased_identifiers);
    let mut stable_sidemap = StableSidemap::new();

    // Mark all function parameters as reactive
    for param in &func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(s) => &s.place,
        };
        reactive_map.mark_reactive(place.identifier);
    }

    // Compute control dominators
    let post_dominators = react_compiler_hir::dominator::compute_post_dominator_tree(
        func,
        env.next_block_id().0,
        false,
    )?;

    // Collect block IDs for iteration
    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();

    // Track phi operand reactive flags during fixpoint.
    // In TS, isReactive() sets place.reactive as a side effect. But when a phi
    // is already reactive, the TS `continue`s and skips operand processing.
    // We track which phi operand Places should be marked reactive.
    // Key: (block_id, phi_idx, operand_idx), Value: should be reactive
    let mut phi_operand_reactive: HashMap<(BlockId, usize, usize), bool> = HashMap::new();

    // Fixpoint iteration — compute reactive set
    loop {
        for block_id in &block_ids {
            let block = func.body.blocks.get(block_id).unwrap();
            let has_reactive_control =
                is_reactive_controlled_block(block.id, func, &post_dominators, &mut reactive_map);

            // Process phi nodes
            let block = func.body.blocks.get(block_id).unwrap();
            for (phi_idx, phi) in block.phis.iter().enumerate() {
                if reactive_map.is_reactive(phi.place.identifier) {
                    // TS does `continue` here — skips operand isReactive calls.
                    // phi operand reactive flags stay as they were from last visit.
                    continue;
                }
                let mut is_phi_reactive = false;
                for (op_idx, (_pred, operand)) in phi.operands.iter().enumerate() {
                    let op_reactive = reactive_map.is_reactive(operand.identifier);
                    // Record the reactive state for this operand at this point
                    phi_operand_reactive.insert((*block_id, phi_idx, op_idx), op_reactive);
                    if op_reactive {
                        is_phi_reactive = true;
                        break; // TS breaks here — remaining operands NOT visited
                    }
                }
                if is_phi_reactive {
                    reactive_map.mark_reactive(phi.place.identifier);
                } else {
                    for (pred, _operand) in &phi.operands {
                        if is_reactive_controlled_block(
                            *pred,
                            func,
                            &post_dominators,
                            &mut reactive_map,
                        ) {
                            reactive_map.mark_reactive(phi.place.identifier);
                            break;
                        }
                    }
                }
            }

            // Process instructions
            let block = func.body.blocks.get(block_id).unwrap();
            for instr_id in &block.instructions {
                let instr = &func.instructions[instr_id.0 as usize];

                // Handle stable identifier sources
                stable_sidemap.handle_instruction(instr, env);

                let value = &instr.value;

                // Check if any operand is reactive
                let mut has_reactive_input = false;
                let operands: Vec<IdentifierId> =
                    visitors::each_instruction_value_operand(value, env)
                        .into_iter()
                        .map(|p| p.identifier)
                        .collect();
                for &op_id in &operands {
                    let reactive = reactive_map.is_reactive(op_id);
                    has_reactive_input = has_reactive_input || reactive;
                }

                // Hooks and `use` operator are sources of reactivity
                match value {
                    InstructionValue::CallExpression { callee, .. } => {
                        let callee_ty = &env.types
                            [env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                        if get_hook_kind_for_type(env, callee_ty)?.is_some()
                            || is_use_operator_type(callee_ty)
                        {
                            has_reactive_input = true;
                        }
                    }
                    InstructionValue::MethodCall { property, .. } => {
                        let property_ty = &env.types
                            [env.identifiers[property.identifier.0 as usize].type_.0 as usize];
                        if get_hook_kind_for_type(env, property_ty)?.is_some()
                            || is_use_operator_type(property_ty)
                        {
                            has_reactive_input = true;
                        }
                    }
                    _ => {}
                }

                if has_reactive_input {
                    // Mark lvalues reactive (unless stable)
                    let lvalue_ids: Vec<IdentifierId> = visitors::each_instruction_lvalue(instr)
                        .into_iter()
                        .map(|p| p.identifier)
                        .collect();
                    for lvalue_id in lvalue_ids {
                        if stable_sidemap.is_stable(lvalue_id) {
                            continue;
                        }
                        reactive_map.mark_reactive(lvalue_id);
                    }
                }

                if has_reactive_input || has_reactive_control {
                    // Mark mutable operands reactive
                    let operand_places = visitors::each_instruction_value_operand(value, env);
                    for op_place in &operand_places {
                        match op_place.effect {
                            Effect::Capture
                            | Effect::Store
                            | Effect::ConditionallyMutate
                            | Effect::ConditionallyMutateIterator
                            | Effect::Mutate => {
                                let op_range =
                                    &env.identifiers[op_place.identifier.0 as usize].mutable_range;
                                if op_range.contains(instr.id) {
                                    reactive_map.mark_reactive(op_place.identifier);
                                }
                            }
                            Effect::Freeze | Effect::Read => {
                                // no-op
                            }
                            Effect::Unknown => {
                                return Err(CompilerDiagnostic::new(
                                    ErrorCategory::Invariant,
                                    &format!("Unexpected unknown effect at {:?}", op_place.loc),
                                    None,
                                ));
                            }
                        }
                    }
                }
            }

            // Process terminal operands (just to mark them reactive for output)
            for op in visitors::each_terminal_operand(&block.terminal) {
                reactive_map.is_reactive(op.identifier);
            }
        }

        if !reactive_map.snapshot() {
            break;
        }
    }

    // Propagate reactivity to inner functions (read-only phase, just queries reactive_map)
    propagate_reactivity_to_inner_functions_outer(func, env, &mut reactive_map);

    // Now apply reactive flags by replaying the traversal pattern.
    apply_reactive_flags_replay(
        func,
        env,
        &mut reactive_map,
        &mut stable_sidemap,
        &phi_operand_reactive,
    );

    Ok(())
}

// =============================================================================
// ReactivityMap
// =============================================================================

struct ReactivityMap<'a> {
    has_changes: bool,
    reactive: HashSet<IdentifierId>,
    aliased_identifiers: &'a mut DisjointSet<IdentifierId>,
}

impl<'a> ReactivityMap<'a> {
    fn new(aliased_identifiers: &'a mut DisjointSet<IdentifierId>) -> Self {
        ReactivityMap {
            has_changes: false,
            reactive: HashSet::new(),
            aliased_identifiers,
        }
    }

    fn is_reactive(&mut self, id: IdentifierId) -> bool {
        let canonical = self.aliased_identifiers.find_opt(id).unwrap_or(id);
        self.reactive.contains(&canonical)
    }

    fn mark_reactive(&mut self, id: IdentifierId) {
        let canonical = self.aliased_identifiers.find_opt(id).unwrap_or(id);
        if self.reactive.insert(canonical) {
            self.has_changes = true;
        }
    }

    /// Reset change tracking, returns true if there were changes.
    fn snapshot(&mut self) -> bool {
        let had_changes = self.has_changes;
        self.has_changes = false;
        had_changes
    }
}

// =============================================================================
// StableSidemap
// =============================================================================

struct StableSidemap {
    map: HashMap<IdentifierId, bool>,
}

impl StableSidemap {
    fn new() -> Self {
        StableSidemap {
            map: HashMap::new(),
        }
    }

    fn handle_instruction(&mut self, instr: &react_compiler_hir::Instruction, env: &Environment) {
        let lvalue_id = instr.lvalue.identifier;
        let value = &instr.value;

        match value {
            InstructionValue::CallExpression { callee, .. } => {
                let callee_ty =
                    &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                if evaluates_to_stable_type_or_container(env, callee_ty) {
                    let lvalue_ty =
                        &env.types[env.identifiers[lvalue_id.0 as usize].type_.0 as usize];
                    if is_stable_type(lvalue_ty) {
                        self.map.insert(lvalue_id, true);
                    } else {
                        self.map.insert(lvalue_id, false);
                    }
                }
            }
            InstructionValue::MethodCall { property, .. } => {
                let property_ty =
                    &env.types[env.identifiers[property.identifier.0 as usize].type_.0 as usize];
                if evaluates_to_stable_type_or_container(env, property_ty) {
                    let lvalue_ty =
                        &env.types[env.identifiers[lvalue_id.0 as usize].type_.0 as usize];
                    if is_stable_type(lvalue_ty) {
                        self.map.insert(lvalue_id, true);
                    } else {
                        self.map.insert(lvalue_id, false);
                    }
                }
            }
            InstructionValue::PropertyLoad { object, .. } => {
                let source_id = object.identifier;
                if self.map.contains_key(&source_id) {
                    let lvalue_ty =
                        &env.types[env.identifiers[lvalue_id.0 as usize].type_.0 as usize];
                    if is_stable_type_container(lvalue_ty) {
                        self.map.insert(lvalue_id, false);
                    } else if is_stable_type(lvalue_ty) {
                        self.map.insert(lvalue_id, true);
                    }
                }
            }
            InstructionValue::Destructure { value: val, .. } => {
                let source_id = val.identifier;
                if self.map.contains_key(&source_id) {
                    let lvalue_ids: Vec<IdentifierId> = visitors::each_instruction_lvalue(instr)
                        .into_iter()
                        .map(|p| p.identifier)
                        .collect();
                    for lid in lvalue_ids {
                        let lid_ty = &env.types[env.identifiers[lid.0 as usize].type_.0 as usize];
                        if is_stable_type_container(lid_ty) {
                            self.map.insert(lid, false);
                        } else if is_stable_type(lid_ty) {
                            self.map.insert(lid, true);
                        }
                    }
                }
            }
            InstructionValue::StoreLocal {
                lvalue, value: val, ..
            } => {
                if let Some(&entry) = self.map.get(&val.identifier) {
                    self.map.insert(lvalue_id, entry);
                    self.map.insert(lvalue.place.identifier, entry);
                }
            }
            InstructionValue::LoadLocal { place, .. } => {
                if let Some(&entry) = self.map.get(&place.identifier) {
                    self.map.insert(lvalue_id, entry);
                }
            }
            _ => {}
        }
    }

    fn is_stable(&self, id: IdentifierId) -> bool {
        self.map.get(&id).copied().unwrap_or(false)
    }
}

// =============================================================================
// Control dominators (ported from ControlDominators.ts)
// =============================================================================

fn is_reactive_controlled_block(
    block_id: BlockId,
    func: &HirFunction,
    post_dominators: &react_compiler_hir::dominator::PostDominator,
    reactive_map: &mut ReactivityMap,
) -> bool {
    let frontier = post_dominator_frontier(func, post_dominators, block_id);
    for frontier_block_id in &frontier {
        let control_block = func.body.blocks.get(frontier_block_id).unwrap();
        match &control_block.terminal {
            Terminal::If { test, .. } | Terminal::Branch { test, .. } => {
                if reactive_map.is_reactive(test.identifier) {
                    return true;
                }
            }
            Terminal::Switch { test, cases, .. } => {
                if reactive_map.is_reactive(test.identifier) {
                    return true;
                }
                for case in cases {
                    if let Some(ref case_test) = case.test {
                        if reactive_map.is_reactive(case_test.identifier) {
                            return true;
                        }
                    }
                }
            }
            _ => {}
        }
    }
    false
}

// =============================================================================
// Type helpers (ported from HIR.ts)
// =============================================================================

use react_compiler_hir::is_use_operator_type;

fn get_hook_kind_for_type<'a>(
    env: &'a Environment,
    ty: &Type,
) -> Result<Option<&'a HookKind>, CompilerDiagnostic> {
    env.get_hook_kind_for_type(ty)
}

fn is_stable_type(ty: &Type) -> bool {
    match ty {
        Type::Function {
            shape_id: Some(id), ..
        } => {
            matches!(
                id.as_str(),
                "BuiltInSetState"
                    | "BuiltInSetActionState"
                    | "BuiltInDispatch"
                    | "BuiltInStartTransition"
                    | "BuiltInSetOptimistic"
            )
        }
        Type::Object { shape_id: Some(id) } => {
            matches!(id.as_str(), "BuiltInUseRefId")
        }
        _ => false,
    }
}

fn is_stable_type_container(ty: &Type) -> bool {
    match ty {
        Type::Object { shape_id: Some(id) } => {
            matches!(
                id.as_str(),
                "BuiltInUseState"
                    | "BuiltInUseActionState"
                    | "BuiltInUseReducer"
                    | "BuiltInUseOptimistic"
                    | "BuiltInUseTransition"
            )
        }
        _ => false,
    }
}

fn evaluates_to_stable_type_or_container(env: &Environment, callee_ty: &Type) -> bool {
    if let Some(hook_kind) = get_hook_kind_for_type(env, callee_ty).ok().flatten() {
        matches!(
            hook_kind,
            HookKind::UseState
                | HookKind::UseReducer
                | HookKind::UseActionState
                | HookKind::UseRef
                | HookKind::UseTransition
                | HookKind::UseOptimistic
        )
    } else {
        false
    }
}

// =============================================================================
// Propagate reactivity to inner functions
// =============================================================================

fn propagate_reactivity_to_inner_functions_outer(
    func: &HirFunction,
    env: &Environment,
    reactive_map: &mut ReactivityMap,
) {
    for (_block_id, block) in &func.body.blocks {
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    propagate_reactivity_to_inner_functions_inner(
                        lowered_func.func,
                        env,
                        reactive_map,
                    );
                }
                _ => {}
            }
        }
    }
}

fn propagate_reactivity_to_inner_functions_inner(
    func_id: FunctionId,
    env: &Environment,
    reactive_map: &mut ReactivityMap,
) {
    let inner_func = &env.functions[func_id.0 as usize];

    for (_block_id, block) in &inner_func.body.blocks {
        for instr_id in &block.instructions {
            let instr = &inner_func.instructions[instr_id.0 as usize];

            for op in visitors::each_instruction_value_operand(&instr.value, env) {
                reactive_map.is_reactive(op.identifier);
            }

            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    propagate_reactivity_to_inner_functions_inner(
                        lowered_func.func,
                        env,
                        reactive_map,
                    );
                }
                _ => {}
            }
        }

        for op in visitors::each_terminal_operand(&block.terminal) {
            reactive_map.is_reactive(op.identifier);
        }
    }
}

// =============================================================================
// Apply reactive flags to the HIR (replay pass)
// =============================================================================

fn apply_reactive_flags_replay(
    func: &mut HirFunction,
    env: &mut Environment,
    reactive_map: &mut ReactivityMap,
    stable_sidemap: &mut StableSidemap,
    phi_operand_reactive: &HashMap<(BlockId, usize, usize), bool>,
) {
    let reactive_ids = build_reactive_id_set(reactive_map);

    // 1. Mark params
    for param in &mut func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(s) => &mut s.place,
        };
        place.reactive = true;
    }

    // 2. Walk blocks
    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();

    for block_id in &block_ids {
        let block = func.body.blocks.get(block_id).unwrap();

        // 2a. Phi nodes
        let phi_count = block.phis.len();
        for phi_idx in 0..phi_count {
            let block = func.body.blocks.get_mut(block_id).unwrap();
            let phi = &mut block.phis[phi_idx];

            if reactive_ids.contains(&phi.place.identifier) {
                phi.place.reactive = true;
            }

            for (op_idx, (_pred, operand)) in phi.operands.iter_mut().enumerate() {
                if let Some(&is_reactive) = phi_operand_reactive.get(&(*block_id, phi_idx, op_idx))
                {
                    if is_reactive {
                        operand.reactive = true;
                    }
                }
            }
        }

        // 2b. Instructions
        let block = func.body.blocks.get(block_id).unwrap();
        let instr_ids: Vec<react_compiler_hir::InstructionId> = block.instructions.clone();

        for instr_id in &instr_ids {
            let instr = &func.instructions[instr_id.0 as usize];

            // Compute hasReactiveInput by checking value operands
            let value_operand_ids: Vec<IdentifierId> =
                visitors::each_instruction_value_operand(&instr.value, env)
                    .into_iter()
                    .map(|p| p.identifier)
                    .collect();
            let mut has_reactive_input = false;
            for &op_id in &value_operand_ids {
                if reactive_ids.contains(&op_id) {
                    has_reactive_input = true;
                }
            }

            // Check hooks/use
            match &instr.value {
                InstructionValue::CallExpression { callee, .. } => {
                    let callee_ty =
                        &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                    if get_hook_kind_for_type(env, callee_ty)
                        .ok()
                        .flatten()
                        .is_some()
                        || is_use_operator_type(callee_ty)
                    {
                        has_reactive_input = true;
                    }
                }
                InstructionValue::MethodCall { property, .. } => {
                    let property_ty = &env.types
                        [env.identifiers[property.identifier.0 as usize].type_.0 as usize];
                    if get_hook_kind_for_type(env, property_ty)
                        .ok()
                        .flatten()
                        .is_some()
                        || is_use_operator_type(property_ty)
                    {
                        has_reactive_input = true;
                    }
                }
                _ => {}
            }

            // Value operands: set reactive flag using canonical visitor
            let instr = &mut func.instructions[instr_id.0 as usize];
            visitors::for_each_instruction_value_operand_mut(&mut instr.value, &mut |place| {
                if reactive_ids.contains(&place.identifier) {
                    place.reactive = true;
                }
            });
            // FunctionExpression/ObjectMethod context variables require env access
            if let InstructionValue::FunctionExpression { lowered_func, .. }
            | InstructionValue::ObjectMethod { lowered_func, .. } = &mut instr.value
            {
                let inner_func = &mut env.functions[lowered_func.func.0 as usize];
                for ctx in &mut inner_func.context {
                    if reactive_ids.contains(&ctx.identifier) {
                        ctx.reactive = true;
                    }
                }
            }

            // Lvalues: markReactive is called only when hasReactiveInput
            if has_reactive_input {
                let lvalue_id = instr.lvalue.identifier;
                if !stable_sidemap.is_stable(lvalue_id) && reactive_ids.contains(&lvalue_id) {
                    instr.lvalue.reactive = true;
                }
                // Handle value lvalues — includes DeclareContext/StoreContext which
                // for_each_instruction_lvalue_mut skips, so we use a direct match.
                match &mut instr.value {
                    InstructionValue::DeclareLocal { lvalue, .. }
                    | InstructionValue::DeclareContext { lvalue, .. }
                    | InstructionValue::StoreLocal { lvalue, .. }
                    | InstructionValue::StoreContext { lvalue, .. } => {
                        let id = lvalue.place.identifier;
                        if !stable_sidemap.is_stable(id) && reactive_ids.contains(&id) {
                            lvalue.place.reactive = true;
                        }
                    }
                    InstructionValue::Destructure { lvalue, .. } => {
                        visitors::for_each_pattern_operand_mut(&mut lvalue.pattern, &mut |place| {
                            if !stable_sidemap.is_stable(place.identifier)
                                && reactive_ids.contains(&place.identifier)
                            {
                                place.reactive = true;
                            }
                        });
                    }
                    InstructionValue::PrefixUpdate { lvalue, .. }
                    | InstructionValue::PostfixUpdate { lvalue, .. } => {
                        let id = lvalue.identifier;
                        if !stable_sidemap.is_stable(id) && reactive_ids.contains(&id) {
                            lvalue.reactive = true;
                        }
                    }
                    _ => {}
                }
            }
        }

        // 2c. Terminal operands
        let block = func.body.blocks.get_mut(block_id).unwrap();
        visitors::for_each_terminal_operand_mut(&mut block.terminal, &mut |place| {
            if reactive_ids.contains(&place.identifier) {
                place.reactive = true;
            }
        });
    }

    // 3. Apply to inner functions
    apply_reactive_flags_to_inner_functions(func, env, &reactive_ids);
}

fn build_reactive_id_set(reactive_map: &mut ReactivityMap) -> HashSet<IdentifierId> {
    let mut result = HashSet::new();
    for &id in &reactive_map.reactive {
        result.insert(id);
    }
    let reactive = &reactive_map.reactive;
    reactive_map.aliased_identifiers.for_each(|id, canonical| {
        if reactive.contains(&canonical) {
            result.insert(id);
        }
    });
    result
}

fn apply_reactive_flags_to_inner_functions(
    func: &HirFunction,
    env: &mut Environment,
    reactive_ids: &HashSet<IdentifierId>,
) {
    for (_block_id, block) in &func.body.blocks {
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    apply_reactive_flags_to_inner_func(lowered_func.func, env, reactive_ids);
                }
                _ => {}
            }
        }
    }
}

fn apply_reactive_flags_to_inner_func(
    func_id: FunctionId,
    env: &mut Environment,
    reactive_ids: &HashSet<IdentifierId>,
) {
    // Collect nested function IDs first to avoid borrow issues
    let nested_func_ids: Vec<FunctionId> = {
        let func = &env.functions[func_id.0 as usize];
        let mut ids = Vec::new();
        for (_block_id, block) in &func.body.blocks {
            for instr_id in &block.instructions {
                let instr = &func.instructions[instr_id.0 as usize];
                match &instr.value {
                    InstructionValue::FunctionExpression { lowered_func, .. }
                    | InstructionValue::ObjectMethod { lowered_func, .. } => {
                        ids.push(lowered_func.func);
                    }
                    _ => {}
                }
            }
        }
        ids
    };

    // Apply reactive flags using canonical visitors
    let inner_func = &mut env.functions[func_id.0 as usize];
    for (_block_id, block) in &mut inner_func.body.blocks {
        for instr_id in &block.instructions {
            let instr = &mut inner_func.instructions[instr_id.0 as usize];
            visitors::for_each_instruction_value_operand_mut(&mut instr.value, &mut |place| {
                if reactive_ids.contains(&place.identifier) {
                    place.reactive = true;
                }
            });
        }
        visitors::for_each_terminal_operand_mut(&mut block.terminal, &mut |place| {
            if reactive_ids.contains(&place.identifier) {
                place.reactive = true;
            }
        });
    }

    // Recurse into nested functions, and set reactive on their context variables
    for nested_id in nested_func_ids {
        let nested_func = &mut env.functions[nested_id.0 as usize];
        for ctx in &mut nested_func.context {
            if reactive_ids.contains(&ctx.identifier) {
                ctx.reactive = true;
            }
        }
        apply_reactive_flags_to_inner_func(nested_id, env, reactive_ids);
    }
}

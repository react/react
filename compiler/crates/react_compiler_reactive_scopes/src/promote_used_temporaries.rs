// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! PromoteUsedTemporaries — promotes temporary variables to named variables
//! if they're used by scopes.
//!
//! Corresponds to `src/ReactiveScopes/PromoteUsedTemporaries.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use react_compiler_hir::DeclarationId;
use react_compiler_hir::FunctionId;
use react_compiler_hir::IdentifierId;
use react_compiler_hir::IdentifierName;
use react_compiler_hir::InstructionKind;
use react_compiler_hir::InstructionValue;
use react_compiler_hir::JsxTag;
use react_compiler_hir::ParamPattern;
use react_compiler_hir::Place;
use react_compiler_hir::ReactiveBlock;
use react_compiler_hir::ReactiveFunction;
use react_compiler_hir::ReactiveInstruction;
use react_compiler_hir::ReactiveStatement;
use react_compiler_hir::ReactiveTerminal;
use react_compiler_hir::ReactiveTerminalStatement;
use react_compiler_hir::ReactiveValue;
use react_compiler_hir::ScopeId;
use react_compiler_hir::environment::Environment;

// =============================================================================
// State
// =============================================================================

struct State {
    tags: HashSet<DeclarationId>,
    promoted: HashSet<DeclarationId>,
    pruned: HashMap<DeclarationId, PrunedInfo>,
}

struct PrunedInfo {
    active_scopes: Vec<ScopeId>,
    used_outside_scope: bool,
}

// =============================================================================
// Public entry point
// =============================================================================

/// Promotes temporary (unnamed) identifiers used in scopes to named identifiers.
/// TS: `promoteUsedTemporaries`
pub fn promote_used_temporaries(func: &mut ReactiveFunction, env: &mut Environment) {
    let mut state = State {
        tags: HashSet::new(),
        promoted: HashSet::new(),
        pruned: HashMap::new(),
    };

    // Phase 1: collect promotable temporaries (jsx tags, pruned scope usage)
    let mut active_scopes: Vec<ScopeId> = Vec::new();
    collect_promotable_block(&func.body, &mut state, &mut active_scopes, env);

    // Promote params
    for param in &func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(s) => &s.place,
        };
        let identifier = &env.identifiers[place.identifier.0 as usize];
        if identifier.name.is_none() {
            promote_identifier(place.identifier, &mut state, env);
        }
    }

    // Phase 2: promote identifiers used in scopes
    promote_temporaries_block(&func.body, &mut state, env);

    // Phase 3: promote interposed temporaries
    let mut consts: HashSet<IdentifierId> = HashSet::new();
    let mut globals: HashSet<IdentifierId> = HashSet::new();
    for param in &func.params {
        match param {
            ParamPattern::Place(p) => {
                consts.insert(p.identifier);
            }
            ParamPattern::Spread(s) => {
                consts.insert(s.place.identifier);
            }
        }
    }
    let mut inter_state: HashMap<IdentifierId, (IdentifierId, bool)> = HashMap::new();
    promote_interposed_block(
        &func.body,
        &mut state,
        &mut inter_state,
        &mut consts,
        &mut globals,
        env,
    );

    // Phase 4: promote all instances of promoted declaration IDs
    promote_all_instances_params(func, &mut state, env);
    promote_all_instances_block(&func.body, &mut state, env);
}

// =============================================================================
// Phase 1: CollectPromotableTemporaries
// =============================================================================

fn collect_promotable_block(
    block: &ReactiveBlock,
    state: &mut State,
    active_scopes: &mut Vec<ScopeId>,
    env: &Environment,
) {
    for stmt in block {
        match stmt {
            ReactiveStatement::Instruction(instr) => {
                collect_promotable_instruction(instr, state, active_scopes, env);
            }
            ReactiveStatement::Scope(scope) => {
                let scope_id = scope.scope;
                active_scopes.push(scope_id);
                collect_promotable_block(&scope.instructions, state, active_scopes, env);
                active_scopes.pop();
            }
            ReactiveStatement::PrunedScope(scope) => {
                let scope_data = &env.scopes[scope.scope.0 as usize];
                for (_id, decl) in &scope_data.declarations {
                    let identifier = &env.identifiers[decl.identifier.0 as usize];
                    state.pruned.insert(
                        identifier.declaration_id,
                        PrunedInfo {
                            active_scopes: active_scopes.clone(),
                            used_outside_scope: false,
                        },
                    );
                }
                collect_promotable_block(&scope.instructions, state, active_scopes, env);
            }
            ReactiveStatement::Terminal(terminal) => {
                collect_promotable_terminal(terminal, state, active_scopes, env);
            }
        }
    }
}

fn collect_promotable_place(
    place: &Place,
    state: &mut State,
    active_scopes: &[ScopeId],
    env: &Environment,
) {
    if !active_scopes.is_empty() {
        let identifier = &env.identifiers[place.identifier.0 as usize];
        if let Some(pruned) = state.pruned.get_mut(&identifier.declaration_id) {
            if let Some(last) = active_scopes.last() {
                if !pruned.active_scopes.contains(last) {
                    pruned.used_outside_scope = true;
                }
            }
        }
    }
}

fn collect_promotable_instruction(
    instr: &ReactiveInstruction,
    state: &mut State,
    active_scopes: &mut Vec<ScopeId>,
    env: &Environment,
) {
    collect_promotable_value(&instr.value, state, active_scopes, env);
}

fn collect_promotable_value(
    value: &ReactiveValue,
    state: &mut State,
    active_scopes: &mut Vec<ScopeId>,
    env: &Environment,
) {
    match value {
        ReactiveValue::Instruction(instr_value) => {
            // Visit operands
            for place in
                react_compiler_hir::visitors::each_instruction_value_operand(instr_value, env)
            {
                collect_promotable_place(&place, state, active_scopes, env);
            }
            // Check for JSX tag
            if let InstructionValue::JsxExpression {
                tag: JsxTag::Place(place),
                ..
            } = instr_value
            {
                let identifier = &env.identifiers[place.identifier.0 as usize];
                state.tags.insert(identifier.declaration_id);
            }
        }
        ReactiveValue::SequenceExpression {
            instructions,
            value: inner,
            ..
        } => {
            for instr in instructions {
                collect_promotable_instruction(instr, state, active_scopes, env);
            }
            collect_promotable_value(inner, state, active_scopes, env);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            collect_promotable_value(test, state, active_scopes, env);
            collect_promotable_value(consequent, state, active_scopes, env);
            collect_promotable_value(alternate, state, active_scopes, env);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            collect_promotable_value(left, state, active_scopes, env);
            collect_promotable_value(right, state, active_scopes, env);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            collect_promotable_value(inner, state, active_scopes, env);
        }
    }
}

fn collect_promotable_terminal(
    stmt: &ReactiveTerminalStatement,
    state: &mut State,
    active_scopes: &mut Vec<ScopeId>,
    env: &Environment,
) {
    match &stmt.terminal {
        ReactiveTerminal::Break { .. } | ReactiveTerminal::Continue { .. } => {}
        ReactiveTerminal::Return { value, .. } | ReactiveTerminal::Throw { value, .. } => {
            collect_promotable_place(value, state, active_scopes, env);
        }
        ReactiveTerminal::For {
            init,
            test,
            update,
            loop_block,
            ..
        } => {
            collect_promotable_value(init, state, active_scopes, env);
            collect_promotable_value(test, state, active_scopes, env);
            collect_promotable_block(loop_block, state, active_scopes, env);
            if let Some(update) = update {
                collect_promotable_value(update, state, active_scopes, env);
            }
        }
        ReactiveTerminal::ForOf {
            init,
            test,
            loop_block,
            ..
        } => {
            collect_promotable_value(init, state, active_scopes, env);
            collect_promotable_value(test, state, active_scopes, env);
            collect_promotable_block(loop_block, state, active_scopes, env);
        }
        ReactiveTerminal::ForIn {
            init, loop_block, ..
        } => {
            collect_promotable_value(init, state, active_scopes, env);
            collect_promotable_block(loop_block, state, active_scopes, env);
        }
        ReactiveTerminal::DoWhile {
            loop_block, test, ..
        } => {
            collect_promotable_block(loop_block, state, active_scopes, env);
            collect_promotable_value(test, state, active_scopes, env);
        }
        ReactiveTerminal::While {
            test, loop_block, ..
        } => {
            collect_promotable_value(test, state, active_scopes, env);
            collect_promotable_block(loop_block, state, active_scopes, env);
        }
        ReactiveTerminal::If {
            test,
            consequent,
            alternate,
            ..
        } => {
            collect_promotable_place(test, state, active_scopes, env);
            collect_promotable_block(consequent, state, active_scopes, env);
            if let Some(alt) = alternate {
                collect_promotable_block(alt, state, active_scopes, env);
            }
        }
        ReactiveTerminal::Switch { test, cases, .. } => {
            collect_promotable_place(test, state, active_scopes, env);
            for case in cases {
                if let Some(t) = &case.test {
                    collect_promotable_place(t, state, active_scopes, env);
                }
                if let Some(block) = &case.block {
                    collect_promotable_block(block, state, active_scopes, env);
                }
            }
        }
        ReactiveTerminal::Label { block, .. } => {
            collect_promotable_block(block, state, active_scopes, env);
        }
        ReactiveTerminal::Try {
            block,
            handler_binding,
            handler,
            ..
        } => {
            collect_promotable_block(block, state, active_scopes, env);
            if let Some(binding) = handler_binding {
                collect_promotable_place(binding, state, active_scopes, env);
            }
            collect_promotable_block(handler, state, active_scopes, env);
        }
    }
}

// =============================================================================
// Phase 2: PromoteTemporaries
// =============================================================================

fn promote_temporaries_block(block: &ReactiveBlock, state: &mut State, env: &mut Environment) {
    for stmt in block {
        match stmt {
            ReactiveStatement::Instruction(instr) => {
                promote_temporaries_value(&instr.value, state, env);
            }
            ReactiveStatement::Scope(scope) => {
                let scope_id = scope.scope;
                let scope_data = &env.scopes[scope_id.0 as usize];
                // Collect all IDs to promote first
                let mut ids_to_check: Vec<IdentifierId> = Vec::new();
                ids_to_check.extend(scope_data.dependencies.iter().map(|d| d.identifier));
                ids_to_check.extend(scope_data.declarations.iter().map(|(_, d)| d.identifier));
                for id in ids_to_check {
                    let identifier = &env.identifiers[id.0 as usize];
                    if identifier.name.is_none() {
                        promote_identifier(id, state, env);
                    }
                }
                promote_temporaries_block(&scope.instructions, state, env);
            }
            ReactiveStatement::PrunedScope(scope) => {
                let scope_id = scope.scope;
                let scope_data = &env.scopes[scope_id.0 as usize];
                let decls: Vec<(IdentifierId, DeclarationId)> = scope_data
                    .declarations
                    .iter()
                    .map(|(_, d)| {
                        let identifier = &env.identifiers[d.identifier.0 as usize];
                        (d.identifier, identifier.declaration_id)
                    })
                    .collect();
                for (id, decl_id) in decls {
                    let identifier = &env.identifiers[id.0 as usize];
                    if identifier.name.is_none() {
                        if let Some(pruned) = state.pruned.get(&decl_id) {
                            if pruned.used_outside_scope {
                                promote_identifier(id, state, env);
                            }
                        }
                    }
                }
                promote_temporaries_block(&scope.instructions, state, env);
            }
            ReactiveStatement::Terminal(terminal) => {
                promote_temporaries_terminal(terminal, state, env);
            }
        }
    }
}

fn promote_temporaries_value(value: &ReactiveValue, state: &mut State, env: &mut Environment) {
    match value {
        ReactiveValue::Instruction(instr_value) => {
            // Visit inner functions: promote params and recurse into nested functions
            // TS: visitHirFunction(value.loweredFunc.func, state)
            match instr_value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    visit_hir_function_for_promotion(lowered_func.func, state, env);
                }
                _ => {}
            }
        }
        ReactiveValue::SequenceExpression {
            instructions,
            value: inner,
            ..
        } => {
            for instr in instructions {
                promote_temporaries_value(&instr.value, state, env);
            }
            promote_temporaries_value(inner, state, env);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            promote_temporaries_value(test, state, env);
            promote_temporaries_value(consequent, state, env);
            promote_temporaries_value(alternate, state, env);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            promote_temporaries_value(left, state, env);
            promote_temporaries_value(right, state, env);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            promote_temporaries_value(inner, state, env);
        }
    }
}

fn promote_temporaries_terminal(
    stmt: &ReactiveTerminalStatement,
    state: &mut State,
    env: &mut Environment,
) {
    match &stmt.terminal {
        ReactiveTerminal::Break { .. } | ReactiveTerminal::Continue { .. } => {}
        ReactiveTerminal::Return { .. } | ReactiveTerminal::Throw { .. } => {}
        ReactiveTerminal::For {
            init,
            test,
            update,
            loop_block,
            ..
        } => {
            promote_temporaries_value(init, state, env);
            promote_temporaries_value(test, state, env);
            promote_temporaries_block(loop_block, state, env);
            if let Some(update) = update {
                promote_temporaries_value(update, state, env);
            }
        }
        ReactiveTerminal::ForOf {
            init,
            test,
            loop_block,
            ..
        } => {
            promote_temporaries_value(init, state, env);
            promote_temporaries_value(test, state, env);
            promote_temporaries_block(loop_block, state, env);
        }
        ReactiveTerminal::ForIn {
            init, loop_block, ..
        } => {
            promote_temporaries_value(init, state, env);
            promote_temporaries_block(loop_block, state, env);
        }
        ReactiveTerminal::DoWhile {
            loop_block, test, ..
        } => {
            promote_temporaries_block(loop_block, state, env);
            promote_temporaries_value(test, state, env);
        }
        ReactiveTerminal::While {
            test, loop_block, ..
        } => {
            promote_temporaries_value(test, state, env);
            promote_temporaries_block(loop_block, state, env);
        }
        ReactiveTerminal::If {
            consequent,
            alternate,
            ..
        } => {
            promote_temporaries_block(consequent, state, env);
            if let Some(alt) = alternate {
                promote_temporaries_block(alt, state, env);
            }
        }
        ReactiveTerminal::Switch { cases, .. } => {
            for case in cases {
                if let Some(block) = &case.block {
                    promote_temporaries_block(block, state, env);
                }
            }
        }
        ReactiveTerminal::Label { block, .. } => {
            promote_temporaries_block(block, state, env);
        }
        ReactiveTerminal::Try { block, handler, .. } => {
            promote_temporaries_block(block, state, env);
            promote_temporaries_block(handler, state, env);
        }
    }
}

// =============================================================================
// Helper: visit inner HIR function for promotion (mirrors TS visitHirFunction)
// =============================================================================

/// Promotes params and recursively visits nested functions for param promotion.
/// Specialized version of the TS `visitHirFunction` pattern for the PromoteTemporaries
/// phase — only promotes unnamed params and recurses into nested functions.
/// Other `visitHirFunction` behaviors (visitPlace on terminal operands, visitInstruction
/// on all instructions) are no-ops for this phase and are intentionally omitted.
fn visit_hir_function_for_promotion(func_id: FunctionId, state: &mut State, env: &mut Environment) {
    // Promote params of this function
    let param_ids: Vec<IdentifierId> = {
        let func = &env.functions[func_id.0 as usize];
        func.params
            .iter()
            .map(|param| match param {
                ParamPattern::Place(p) => p.identifier,
                ParamPattern::Spread(s) => s.place.identifier,
            })
            .collect()
    };
    for id in param_ids {
        let identifier = &env.identifiers[id.0 as usize];
        if identifier.name.is_none() {
            promote_identifier(id, state, env);
        }
    }

    // Find nested FunctionExpression/ObjectMethod in body instructions
    let nested_func_ids: Vec<FunctionId> = {
        let func = &env.functions[func_id.0 as usize];
        let mut nested = Vec::new();
        for (_, block) in &func.body.blocks {
            for &instr_id in &block.instructions {
                let instr = &func.instructions[instr_id.0 as usize];
                match &instr.value {
                    InstructionValue::FunctionExpression { lowered_func, .. }
                    | InstructionValue::ObjectMethod { lowered_func, .. } => {
                        nested.push(lowered_func.func);
                    }
                    _ => {}
                }
            }
        }
        nested
    };
    for nested_id in nested_func_ids {
        visit_hir_function_for_promotion(nested_id, state, env);
    }
}

// =============================================================================
// Phase 3: PromoteInterposedTemporaries
// =============================================================================

fn promote_interposed_block(
    block: &ReactiveBlock,
    state: &mut State,
    inter_state: &mut HashMap<IdentifierId, (IdentifierId, bool)>,
    consts: &mut HashSet<IdentifierId>,
    globals: &mut HashSet<IdentifierId>,
    env: &mut Environment,
) {
    for stmt in block {
        match stmt {
            ReactiveStatement::Instruction(instr) => {
                promote_interposed_instruction(instr, state, inter_state, consts, globals, env);
            }
            ReactiveStatement::Scope(scope) => {
                promote_interposed_block(
                    &scope.instructions,
                    state,
                    inter_state,
                    consts,
                    globals,
                    env,
                );
            }
            ReactiveStatement::PrunedScope(scope) => {
                promote_interposed_block(
                    &scope.instructions,
                    state,
                    inter_state,
                    consts,
                    globals,
                    env,
                );
            }
            ReactiveStatement::Terminal(terminal) => {
                promote_interposed_terminal(terminal, state, inter_state, consts, globals, env);
            }
        }
    }
}

fn promote_interposed_place(
    place: &Place,
    state: &mut State,
    inter_state: &mut HashMap<IdentifierId, (IdentifierId, bool)>,
    consts: &HashSet<IdentifierId>,
    env: &mut Environment,
) {
    if let Some(&(id, needs_promotion)) = inter_state.get(&place.identifier) {
        let identifier = &env.identifiers[id.0 as usize];
        if needs_promotion && identifier.name.is_none() && !consts.contains(&id) {
            promote_identifier(id, state, env);
        }
    }
}

fn promote_interposed_instruction(
    instr: &ReactiveInstruction,
    state: &mut State,
    inter_state: &mut HashMap<IdentifierId, (IdentifierId, bool)>,
    consts: &mut HashSet<IdentifierId>,
    globals: &mut HashSet<IdentifierId>,
    env: &mut Environment,
) {
    // Check instruction value lvalues (assignment targets)
    match &instr.value {
        ReactiveValue::Instruction(iv) => {
            // Check eachInstructionValueLValue: these should all be named
            // (the TS pass asserts this but we just skip in Rust)

            match iv {
                InstructionValue::CallExpression { .. }
                | InstructionValue::MethodCall { .. }
                | InstructionValue::Await { .. }
                | InstructionValue::PropertyStore { .. }
                | InstructionValue::PropertyDelete { .. }
                | InstructionValue::ComputedStore { .. }
                | InstructionValue::ComputedDelete { .. }
                | InstructionValue::PostfixUpdate { .. }
                | InstructionValue::PrefixUpdate { .. }
                | InstructionValue::StoreLocal { .. }
                | InstructionValue::StoreContext { .. }
                | InstructionValue::StoreGlobal { .. }
                | InstructionValue::Destructure { .. } => {
                    let mut const_store = false;

                    match iv {
                        InstructionValue::StoreContext { lvalue, .. }
                        | InstructionValue::StoreLocal { lvalue, .. } => {
                            if lvalue.kind == InstructionKind::Const
                                || lvalue.kind == InstructionKind::HoistedConst
                            {
                                consts.insert(lvalue.place.identifier);
                                const_store = true;
                            }
                        }
                        _ => {}
                    }
                    if let InstructionValue::Destructure { lvalue, .. } = iv {
                        if lvalue.kind == InstructionKind::Const
                            || lvalue.kind == InstructionKind::HoistedConst
                        {
                            for operand in
                                react_compiler_hir::visitors::each_pattern_operand(&lvalue.pattern)
                            {
                                consts.insert(operand.identifier);
                            }
                            const_store = true;
                        }
                    }
                    if let InstructionValue::MethodCall { property, .. } = iv {
                        consts.insert(property.identifier);
                    }

                    // Visit operands
                    for place in
                        react_compiler_hir::visitors::each_instruction_value_operand(iv, env)
                    {
                        promote_interposed_place(&place, state, inter_state, consts, env);
                    }

                    if !const_store
                        && (instr.lvalue.is_none()
                            || env.identifiers
                                [instr.lvalue.as_ref().unwrap().identifier.0 as usize]
                                .name
                                .is_some())
                    {
                        // Mark all tracked temporaries as needing promotion
                        let keys: Vec<IdentifierId> = inter_state.keys().cloned().collect();
                        for key in keys {
                            if let Some(entry) = inter_state.get_mut(&key) {
                                entry.1 = true;
                            }
                        }
                    }
                    if let Some(lvalue) = &instr.lvalue {
                        let identifier = &env.identifiers[lvalue.identifier.0 as usize];
                        if identifier.name.is_none() {
                            inter_state.insert(lvalue.identifier, (lvalue.identifier, false));
                        }
                    }
                }
                InstructionValue::DeclareContext { lvalue, .. }
                | InstructionValue::DeclareLocal { lvalue, .. } => {
                    if lvalue.kind == InstructionKind::Const
                        || lvalue.kind == InstructionKind::HoistedConst
                    {
                        consts.insert(lvalue.place.identifier);
                    }
                    // Visit operands
                    for place in
                        react_compiler_hir::visitors::each_instruction_value_operand(iv, env)
                    {
                        promote_interposed_place(&place, state, inter_state, consts, env);
                    }
                }
                InstructionValue::LoadContext {
                    place: load_place, ..
                }
                | InstructionValue::LoadLocal {
                    place: load_place, ..
                } => {
                    if let Some(lvalue) = &instr.lvalue {
                        let identifier = &env.identifiers[lvalue.identifier.0 as usize];
                        if identifier.name.is_none() {
                            if consts.contains(&load_place.identifier) {
                                consts.insert(lvalue.identifier);
                            }
                            inter_state.insert(lvalue.identifier, (lvalue.identifier, false));
                        }
                    }
                    // Visit operands
                    for place in
                        react_compiler_hir::visitors::each_instruction_value_operand(iv, env)
                    {
                        promote_interposed_place(&place, state, inter_state, consts, env);
                    }
                }
                InstructionValue::PropertyLoad { object, .. }
                | InstructionValue::ComputedLoad { object, .. } => {
                    if let Some(lvalue) = &instr.lvalue {
                        if globals.contains(&object.identifier) {
                            globals.insert(lvalue.identifier);
                            consts.insert(lvalue.identifier);
                        }
                        let identifier = &env.identifiers[lvalue.identifier.0 as usize];
                        if identifier.name.is_none() {
                            inter_state.insert(lvalue.identifier, (lvalue.identifier, false));
                        }
                    }
                    // Visit operands
                    for place in
                        react_compiler_hir::visitors::each_instruction_value_operand(iv, env)
                    {
                        promote_interposed_place(&place, state, inter_state, consts, env);
                    }
                }
                InstructionValue::LoadGlobal { .. } => {
                    if let Some(lvalue) = &instr.lvalue {
                        globals.insert(lvalue.identifier);
                    }
                    // Visit operands
                    for place in
                        react_compiler_hir::visitors::each_instruction_value_operand(iv, env)
                    {
                        promote_interposed_place(&place, state, inter_state, consts, env);
                    }
                }
                _ => {
                    // Default: visit operands
                    for place in
                        react_compiler_hir::visitors::each_instruction_value_operand(iv, env)
                    {
                        promote_interposed_place(&place, state, inter_state, consts, env);
                    }
                }
            }
        }
        ReactiveValue::SequenceExpression {
            instructions,
            value: inner,
            ..
        } => {
            for sub_instr in instructions {
                promote_interposed_instruction(sub_instr, state, inter_state, consts, globals, env);
            }
            promote_interposed_value(inner, state, inter_state, consts, globals, env);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            promote_interposed_value(test, state, inter_state, consts, globals, env);
            promote_interposed_value(consequent, state, inter_state, consts, globals, env);
            promote_interposed_value(alternate, state, inter_state, consts, globals, env);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            promote_interposed_value(left, state, inter_state, consts, globals, env);
            promote_interposed_value(right, state, inter_state, consts, globals, env);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            promote_interposed_value(inner, state, inter_state, consts, globals, env);
        }
    }
}

fn promote_interposed_value(
    value: &ReactiveValue,
    state: &mut State,
    inter_state: &mut HashMap<IdentifierId, (IdentifierId, bool)>,
    consts: &mut HashSet<IdentifierId>,
    globals: &mut HashSet<IdentifierId>,
    env: &mut Environment,
) {
    match value {
        ReactiveValue::Instruction(iv) => {
            for place in react_compiler_hir::visitors::each_instruction_value_operand(iv, env) {
                promote_interposed_place(&place, state, inter_state, consts, env);
            }
        }
        ReactiveValue::SequenceExpression {
            instructions,
            value: inner,
            ..
        } => {
            for instr in instructions {
                promote_interposed_instruction(instr, state, inter_state, consts, globals, env);
            }
            promote_interposed_value(inner, state, inter_state, consts, globals, env);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            promote_interposed_value(test, state, inter_state, consts, globals, env);
            promote_interposed_value(consequent, state, inter_state, consts, globals, env);
            promote_interposed_value(alternate, state, inter_state, consts, globals, env);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            promote_interposed_value(left, state, inter_state, consts, globals, env);
            promote_interposed_value(right, state, inter_state, consts, globals, env);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            promote_interposed_value(inner, state, inter_state, consts, globals, env);
        }
    }
}

fn promote_interposed_terminal(
    stmt: &ReactiveTerminalStatement,
    state: &mut State,
    inter_state: &mut HashMap<IdentifierId, (IdentifierId, bool)>,
    consts: &mut HashSet<IdentifierId>,
    globals: &mut HashSet<IdentifierId>,
    env: &mut Environment,
) {
    match &stmt.terminal {
        ReactiveTerminal::Break { .. } | ReactiveTerminal::Continue { .. } => {}
        ReactiveTerminal::Return { value, .. } | ReactiveTerminal::Throw { value, .. } => {
            promote_interposed_place(value, state, inter_state, consts, env);
        }
        ReactiveTerminal::For {
            init,
            test,
            update,
            loop_block,
            ..
        } => {
            promote_interposed_value(init, state, inter_state, consts, globals, env);
            promote_interposed_value(test, state, inter_state, consts, globals, env);
            promote_interposed_block(loop_block, state, inter_state, consts, globals, env);
            if let Some(update) = update {
                promote_interposed_value(update, state, inter_state, consts, globals, env);
            }
        }
        ReactiveTerminal::ForOf {
            init,
            test,
            loop_block,
            ..
        } => {
            promote_interposed_value(init, state, inter_state, consts, globals, env);
            promote_interposed_value(test, state, inter_state, consts, globals, env);
            promote_interposed_block(loop_block, state, inter_state, consts, globals, env);
        }
        ReactiveTerminal::ForIn {
            init, loop_block, ..
        } => {
            promote_interposed_value(init, state, inter_state, consts, globals, env);
            promote_interposed_block(loop_block, state, inter_state, consts, globals, env);
        }
        ReactiveTerminal::DoWhile {
            loop_block, test, ..
        } => {
            promote_interposed_block(loop_block, state, inter_state, consts, globals, env);
            promote_interposed_value(test, state, inter_state, consts, globals, env);
        }
        ReactiveTerminal::While {
            test, loop_block, ..
        } => {
            promote_interposed_value(test, state, inter_state, consts, globals, env);
            promote_interposed_block(loop_block, state, inter_state, consts, globals, env);
        }
        ReactiveTerminal::If {
            test,
            consequent,
            alternate,
            ..
        } => {
            promote_interposed_place(test, state, inter_state, consts, env);
            promote_interposed_block(consequent, state, inter_state, consts, globals, env);
            if let Some(alt) = alternate {
                promote_interposed_block(alt, state, inter_state, consts, globals, env);
            }
        }
        ReactiveTerminal::Switch { test, cases, .. } => {
            promote_interposed_place(test, state, inter_state, consts, env);
            for case in cases {
                if let Some(t) = &case.test {
                    promote_interposed_place(t, state, inter_state, consts, env);
                }
                if let Some(block) = &case.block {
                    promote_interposed_block(block, state, inter_state, consts, globals, env);
                }
            }
        }
        ReactiveTerminal::Label { block, .. } => {
            promote_interposed_block(block, state, inter_state, consts, globals, env);
        }
        ReactiveTerminal::Try {
            block,
            handler_binding,
            handler,
            ..
        } => {
            promote_interposed_block(block, state, inter_state, consts, globals, env);
            if let Some(binding) = handler_binding {
                promote_interposed_place(binding, state, inter_state, consts, env);
            }
            promote_interposed_block(handler, state, inter_state, consts, globals, env);
        }
    }
}

// =============================================================================
// Phase 4: PromoteAllInstancesOfPromotedTemporaries
// =============================================================================

fn promote_all_instances_params(func: &ReactiveFunction, state: &mut State, env: &mut Environment) {
    for param in &func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(s) => &s.place,
        };
        let identifier = &env.identifiers[place.identifier.0 as usize];
        if identifier.name.is_none() && state.promoted.contains(&identifier.declaration_id) {
            promote_identifier(place.identifier, state, env);
        }
    }
}

fn promote_all_instances_block(block: &ReactiveBlock, state: &mut State, env: &mut Environment) {
    for stmt in block {
        match stmt {
            ReactiveStatement::Instruction(instr) => {
                promote_all_instances_instruction(instr, state, env);
            }
            ReactiveStatement::Scope(scope) => {
                promote_all_instances_block(&scope.instructions, state, env);
                promote_all_instances_scope_identifiers(scope.scope, state, env);
            }
            ReactiveStatement::PrunedScope(scope) => {
                promote_all_instances_block(&scope.instructions, state, env);
                promote_all_instances_scope_identifiers(scope.scope, state, env);
            }
            ReactiveStatement::Terminal(terminal) => {
                promote_all_instances_terminal(terminal, state, env);
            }
        }
    }
}

fn promote_all_instances_scope_identifiers(
    scope_id: ScopeId,
    state: &mut State,
    env: &mut Environment,
) {
    let scope_data = &env.scopes[scope_id.0 as usize];

    // Collect identifiers to promote
    let decl_ids: Vec<IdentifierId> = scope_data
        .declarations
        .iter()
        .map(|(_, d)| d.identifier)
        .collect();
    let dep_ids: Vec<IdentifierId> = scope_data
        .dependencies
        .iter()
        .map(|d| d.identifier)
        .collect();
    let reassign_ids: Vec<IdentifierId> = scope_data.reassignments.clone();

    for id in decl_ids {
        let identifier = &env.identifiers[id.0 as usize];
        if identifier.name.is_none() && state.promoted.contains(&identifier.declaration_id) {
            promote_identifier(id, state, env);
        }
    }
    for id in dep_ids {
        let identifier = &env.identifiers[id.0 as usize];
        if identifier.name.is_none() && state.promoted.contains(&identifier.declaration_id) {
            promote_identifier(id, state, env);
        }
    }
    for id in reassign_ids {
        let identifier = &env.identifiers[id.0 as usize];
        if identifier.name.is_none() && state.promoted.contains(&identifier.declaration_id) {
            promote_identifier(id, state, env);
        }
    }
}

fn promote_all_instances_place(place: &Place, state: &mut State, env: &mut Environment) {
    let identifier = &env.identifiers[place.identifier.0 as usize];
    if identifier.name.is_none() && state.promoted.contains(&identifier.declaration_id) {
        promote_identifier(place.identifier, state, env);
    }
}

fn promote_all_instances_instruction(
    instr: &ReactiveInstruction,
    state: &mut State,
    env: &mut Environment,
) {
    if let Some(lvalue) = &instr.lvalue {
        promote_all_instances_place(lvalue, state, env);
    }
    promote_all_instances_value(&instr.value, state, env);
}

fn promote_all_instances_value(value: &ReactiveValue, state: &mut State, env: &mut Environment) {
    match value {
        ReactiveValue::Instruction(iv) => {
            for place in react_compiler_hir::visitors::each_instruction_value_operand(iv, env) {
                promote_all_instances_place(&place, state, env);
            }
            // Visit inner functions
            match iv {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let func_id = lowered_func.func;
                    let inner_func = &env.functions[func_id.0 as usize];
                    let param_ids: Vec<IdentifierId> = inner_func
                        .params
                        .iter()
                        .map(|p| match p {
                            ParamPattern::Place(p) => p.identifier,
                            ParamPattern::Spread(s) => s.place.identifier,
                        })
                        .collect();
                    for id in param_ids {
                        let identifier = &env.identifiers[id.0 as usize];
                        if identifier.name.is_none()
                            && state.promoted.contains(&identifier.declaration_id)
                        {
                            promote_identifier(id, state, env);
                        }
                    }
                }
                _ => {}
            }
        }
        ReactiveValue::SequenceExpression {
            instructions,
            value: inner,
            ..
        } => {
            for instr in instructions {
                promote_all_instances_instruction(instr, state, env);
            }
            promote_all_instances_value(inner, state, env);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            promote_all_instances_value(test, state, env);
            promote_all_instances_value(consequent, state, env);
            promote_all_instances_value(alternate, state, env);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            promote_all_instances_value(left, state, env);
            promote_all_instances_value(right, state, env);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            promote_all_instances_value(inner, state, env);
        }
    }
}

fn promote_all_instances_terminal(
    stmt: &ReactiveTerminalStatement,
    state: &mut State,
    env: &mut Environment,
) {
    match &stmt.terminal {
        ReactiveTerminal::Break { .. } | ReactiveTerminal::Continue { .. } => {}
        ReactiveTerminal::Return { value, .. } | ReactiveTerminal::Throw { value, .. } => {
            promote_all_instances_place(value, state, env);
        }
        ReactiveTerminal::For {
            init,
            test,
            update,
            loop_block,
            ..
        } => {
            promote_all_instances_value(init, state, env);
            promote_all_instances_value(test, state, env);
            promote_all_instances_block(loop_block, state, env);
            if let Some(update) = update {
                promote_all_instances_value(update, state, env);
            }
        }
        ReactiveTerminal::ForOf {
            init,
            test,
            loop_block,
            ..
        } => {
            promote_all_instances_value(init, state, env);
            promote_all_instances_value(test, state, env);
            promote_all_instances_block(loop_block, state, env);
        }
        ReactiveTerminal::ForIn {
            init, loop_block, ..
        } => {
            promote_all_instances_value(init, state, env);
            promote_all_instances_block(loop_block, state, env);
        }
        ReactiveTerminal::DoWhile {
            loop_block, test, ..
        } => {
            promote_all_instances_block(loop_block, state, env);
            promote_all_instances_value(test, state, env);
        }
        ReactiveTerminal::While {
            test, loop_block, ..
        } => {
            promote_all_instances_value(test, state, env);
            promote_all_instances_block(loop_block, state, env);
        }
        ReactiveTerminal::If {
            test,
            consequent,
            alternate,
            ..
        } => {
            promote_all_instances_place(test, state, env);
            promote_all_instances_block(consequent, state, env);
            if let Some(alt) = alternate {
                promote_all_instances_block(alt, state, env);
            }
        }
        ReactiveTerminal::Switch { test, cases, .. } => {
            promote_all_instances_place(test, state, env);
            for case in cases {
                if let Some(t) = &case.test {
                    promote_all_instances_place(t, state, env);
                }
                if let Some(block) = &case.block {
                    promote_all_instances_block(block, state, env);
                }
            }
        }
        ReactiveTerminal::Label { block, .. } => {
            promote_all_instances_block(block, state, env);
        }
        ReactiveTerminal::Try {
            block,
            handler_binding,
            handler,
            ..
        } => {
            promote_all_instances_block(block, state, env);
            if let Some(binding) = handler_binding {
                promote_all_instances_place(binding, state, env);
            }
            promote_all_instances_block(handler, state, env);
        }
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn promote_identifier(identifier_id: IdentifierId, state: &mut State, env: &mut Environment) {
    let identifier = &env.identifiers[identifier_id.0 as usize];
    assert!(
        identifier.name.is_none(),
        "promoteTemporary: Expected to be called only for temporary variables"
    );
    let decl_id = identifier.declaration_id;
    if state.tags.contains(&decl_id) {
        // JSX tag temporary: use capitalized name
        env.identifiers[identifier_id.0 as usize].name =
            Some(IdentifierName::Promoted(format!("#T{}", decl_id.0)));
    } else {
        env.identifiers[identifier_id.0 as usize].name =
            Some(IdentifierName::Promoted(format!("#t{}", decl_id.0)));
    }
    state.promoted.insert(decl_id);
}

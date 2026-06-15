// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! RenameVariables — renames variables for output, assigns unique names,
//! handles SSA renames.
//!
//! Corresponds to `src/ReactiveScopes/RenameVariables.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use react_compiler_hir::DeclarationId;
use react_compiler_hir::EvaluationOrder;
use react_compiler_hir::FunctionId;
use react_compiler_hir::IdentifierName;
use react_compiler_hir::InstructionValue;
use react_compiler_hir::ParamPattern;
use react_compiler_hir::Place;
use react_compiler_hir::PrunedReactiveScopeBlock;
use react_compiler_hir::ReactiveBlock;
use react_compiler_hir::ReactiveFunction;
use react_compiler_hir::ReactiveScopeBlock;
use react_compiler_hir::ReactiveValue;
use react_compiler_hir::environment::Environment;

use crate::visitors::ReactiveFunctionVisitor;
use crate::visitors::{self};

// =============================================================================
// Scopes
// =============================================================================

struct Scopes {
    seen: HashMap<DeclarationId, IdentifierName>,
    stack: Vec<HashMap<String, DeclarationId>>,
    globals: HashSet<String>,
    names: HashSet<String>,
}

impl Scopes {
    fn new(globals: HashSet<String>) -> Self {
        Self {
            seen: HashMap::new(),
            stack: vec![HashMap::new()],
            globals,
            names: HashSet::new(),
        }
    }

    fn visit_identifier(
        &mut self,
        identifier_id: react_compiler_hir::IdentifierId,
        env: &Environment,
    ) {
        let identifier = &env.identifiers[identifier_id.0 as usize];
        let original_name = match &identifier.name {
            Some(name) => name.clone(),
            None => return,
        };
        let declaration_id = identifier.declaration_id;

        if self.seen.contains_key(&declaration_id) {
            return;
        }

        let original_value = original_name.value().to_string();
        let is_promoted = matches!(original_name, IdentifierName::Promoted(_));
        let is_promoted_temp = is_promoted && original_value.starts_with("#t");
        let is_promoted_jsx = is_promoted && original_value.starts_with("#T");

        let mut name: String;
        let mut id: u32 = 0;
        if is_promoted_temp {
            name = format!("t{}", id);
            id += 1;
        } else if is_promoted_jsx {
            name = format!("T{}", id);
            id += 1;
        } else {
            name = original_value.clone();
        }

        while self.lookup(&name).is_some() || self.globals.contains(&name) {
            if is_promoted_temp {
                name = format!("t{}", id);
                id += 1;
            } else if is_promoted_jsx {
                name = format!("T{}", id);
                id += 1;
            } else {
                name = format!("{}${}", original_value, id);
                id += 1;
            }
        }

        let identifier_name = IdentifierName::Named(name.clone());
        self.seen.insert(declaration_id, identifier_name);
        self.stack
            .last_mut()
            .unwrap()
            .insert(name.clone(), declaration_id);
        self.names.insert(name);
    }

    fn lookup(&self, name: &str) -> Option<DeclarationId> {
        for scope in self.stack.iter().rev() {
            if let Some(id) = scope.get(name) {
                return Some(*id);
            }
        }
        None
    }

    fn enter(&mut self) {
        self.stack.push(HashMap::new());
    }

    fn leave(&mut self) {
        self.stack.pop();
    }
}

// =============================================================================
// Visitor — TS: `class Visitor extends ReactiveFunctionVisitor<Scopes>`
// =============================================================================

struct Visitor<'a> {
    env: &'a Environment,
}

impl ReactiveFunctionVisitor for Visitor<'_> {
    type State = Scopes;

    fn env(&self) -> &Environment {
        self.env
    }

    /// TS: `visitParam(place, state) { state.visit(place.identifier) }`
    fn visit_param(&self, place: &Place, state: &mut Scopes) {
        state.visit_identifier(place.identifier, self.env);
    }

    /// TS: `visitLValue(_id, lvalue, state) { state.visit(lvalue.identifier) }`
    fn visit_lvalue(&self, _id: EvaluationOrder, lvalue: &Place, state: &mut Scopes) {
        state.visit_identifier(lvalue.identifier, self.env);
    }

    /// TS: `visitPlace(_id, place, state) { state.visit(place.identifier) }`
    fn visit_place(&self, _id: EvaluationOrder, place: &Place, state: &mut Scopes) {
        state.visit_identifier(place.identifier, self.env);
    }

    /// TS: `visitBlock(block, state) { state.enter(() => { this.traverseBlock(block, state) }) }`
    fn visit_block(&self, block: &ReactiveBlock, state: &mut Scopes) {
        state.enter();
        self.traverse_block(block, state);
        state.leave();
    }

    /// TS: `visitPrunedScope(scopeBlock, state) { this.traverseBlock(scopeBlock.instructions, state) }`
    /// No enter/leave — names assigned inside pruned scopes remain visible in
    /// the enclosing scope, preventing name reuse.
    fn visit_pruned_scope(&self, scope: &PrunedReactiveScopeBlock, state: &mut Scopes) {
        self.traverse_block(&scope.instructions, state);
    }

    /// TS: `visitScope(scope, state) { for (const [_, decl] of scope.scope.declarations) state.visit(decl.identifier); this.traverseScope(scope, state) }`
    fn visit_scope(&self, scope: &ReactiveScopeBlock, state: &mut Scopes) {
        let scope_data = &self.env.scopes[scope.scope.0 as usize];
        let decl_ids: Vec<react_compiler_hir::IdentifierId> = scope_data
            .declarations
            .iter()
            .map(|(_, d)| d.identifier)
            .collect();
        for id in decl_ids {
            state.visit_identifier(id, self.env);
        }
        self.traverse_scope(scope, state);
    }

    /// TS: `visitValue(id, value, state) { this.traverseValue(id, value, state); if (value.kind === 'FunctionExpression' || value.kind === 'ObjectMethod') this.visitHirFunction(value.loweredFunc.func, state) }`
    fn visit_value(&self, id: EvaluationOrder, value: &ReactiveValue, state: &mut Scopes) {
        self.traverse_value(id, value, state);
        if let ReactiveValue::Instruction(iv) = value {
            match iv {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    self.visit_hir_function(lowered_func.func, state);
                }
                _ => {}
            }
        }
    }
}

// =============================================================================
// Public entry point
// =============================================================================

/// Renames variables for output — assigns unique names, handles SSA renames.
/// Returns a Set of all unique variable names used.
/// TS: `renameVariables`
pub fn rename_variables(func: &mut ReactiveFunction, env: &mut Environment) -> HashSet<String> {
    rename_variables_with_parent(func, env, None)
}

fn rename_variables_with_parent(
    func: &mut ReactiveFunction,
    env: &mut Environment,
    parent_names: Option<&HashSet<String>>,
) -> HashSet<String> {
    let globals = collect_referenced_globals(&func.body, env);

    // Phase 1: Use ReactiveFunctionVisitor to compute the rename mapping.
    // This collects DeclarationId -> IdentifierName without mutating env.
    let mut scopes = Scopes::new(globals.clone());
    // If parent names are provided (for outlined functions), pre-populate
    // the scope stack so that parameter names don't collide with parent
    // variables. In the TS compiler, outlined functions are placed in the
    // parent function body and processed within the parent's scope context.
    if let Some(parent) = parent_names {
        scopes.enter();
        for name in parent {
            scopes
                .stack
                .last_mut()
                .unwrap()
                .insert(name.clone(), DeclarationId(u32::MAX));
            scopes.names.insert(name.clone());
        }
    }
    rename_variables_impl(func, &Visitor { env }, &mut scopes);

    // Phase 2: Apply the computed renames to all identifiers in env.
    for identifier in env.identifiers.iter_mut() {
        if let Some(mapped_name) = scopes.seen.get(&identifier.declaration_id) {
            if identifier.name.is_some() {
                identifier.name = Some(mapped_name.clone());
            }
        }
    }

    let mut result: HashSet<String> = scopes.names;
    result.extend(globals);
    result
}

/// TS: `renameVariablesImpl`
fn rename_variables_impl(func: &ReactiveFunction, visitor: &Visitor, scopes: &mut Scopes) {
    scopes.enter();
    for param in &func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(s) => &s.place,
        };
        visitor.visit_param(place, scopes);
    }
    visitors::visit_reactive_function(func, visitor, scopes);
    scopes.leave();
}

// =============================================================================
// CollectReferencedGlobals
// =============================================================================

/// Collects all globally referenced names from the reactive function.
/// TS: `collectReferencedGlobals`
fn collect_referenced_globals(block: &ReactiveBlock, env: &Environment) -> HashSet<String> {
    let mut globals = HashSet::new();
    collect_globals_block(block, &mut globals, env);
    globals
}

fn collect_globals_block(block: &ReactiveBlock, globals: &mut HashSet<String>, env: &Environment) {
    for stmt in block {
        match stmt {
            react_compiler_hir::ReactiveStatement::Instruction(instr) => {
                collect_globals_value(&instr.value, globals, env);
            }
            react_compiler_hir::ReactiveStatement::Scope(scope) => {
                collect_globals_block(&scope.instructions, globals, env);
            }
            react_compiler_hir::ReactiveStatement::PrunedScope(scope) => {
                collect_globals_block(&scope.instructions, globals, env);
            }
            react_compiler_hir::ReactiveStatement::Terminal(terminal) => {
                collect_globals_terminal(terminal, globals, env);
            }
        }
    }
}

fn collect_globals_value(value: &ReactiveValue, globals: &mut HashSet<String>, env: &Environment) {
    match value {
        ReactiveValue::Instruction(iv) => {
            if let InstructionValue::LoadGlobal { binding, .. } = iv {
                globals.insert(binding.name().to_string());
            }
            // Visit inner functions
            match iv {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    collect_globals_hir_function(lowered_func.func, globals, env);
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
                collect_globals_value(&instr.value, globals, env);
            }
            collect_globals_value(inner, globals, env);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            collect_globals_value(test, globals, env);
            collect_globals_value(consequent, globals, env);
            collect_globals_value(alternate, globals, env);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            collect_globals_value(left, globals, env);
            collect_globals_value(right, globals, env);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            collect_globals_value(inner, globals, env);
        }
    }
}

/// Recursively collects LoadGlobal names from an inner HIR function.
fn collect_globals_hir_function(
    func_id: FunctionId,
    globals: &mut HashSet<String>,
    env: &Environment,
) {
    let inner_func = &env.functions[func_id.0 as usize];
    let block_ids: Vec<_> = inner_func.body.blocks.keys().copied().collect();
    for block_id in block_ids {
        let inner_func = &env.functions[func_id.0 as usize];
        let block = &inner_func.body.blocks[&block_id];
        for instr_id in &block.instructions {
            let instr = &inner_func.instructions[instr_id.0 as usize];
            if let InstructionValue::LoadGlobal { binding, .. } = &instr.value {
                globals.insert(binding.name().to_string());
            }
            // Recurse into nested function expressions
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    collect_globals_hir_function(lowered_func.func, globals, env);
                }
                _ => {}
            }
        }
    }
}

fn collect_globals_terminal(
    stmt: &react_compiler_hir::ReactiveTerminalStatement,
    globals: &mut HashSet<String>,
    env: &Environment,
) {
    match &stmt.terminal {
        react_compiler_hir::ReactiveTerminal::Break { .. }
        | react_compiler_hir::ReactiveTerminal::Continue { .. } => {}
        react_compiler_hir::ReactiveTerminal::Return { .. }
        | react_compiler_hir::ReactiveTerminal::Throw { .. } => {}
        react_compiler_hir::ReactiveTerminal::For {
            init,
            test,
            update,
            loop_block,
            ..
        } => {
            collect_globals_value(init, globals, env);
            collect_globals_value(test, globals, env);
            collect_globals_block(loop_block, globals, env);
            if let Some(update) = update {
                collect_globals_value(update, globals, env);
            }
        }
        react_compiler_hir::ReactiveTerminal::ForOf {
            init,
            test,
            loop_block,
            ..
        } => {
            collect_globals_value(init, globals, env);
            collect_globals_value(test, globals, env);
            collect_globals_block(loop_block, globals, env);
        }
        react_compiler_hir::ReactiveTerminal::ForIn {
            init, loop_block, ..
        } => {
            collect_globals_value(init, globals, env);
            collect_globals_block(loop_block, globals, env);
        }
        react_compiler_hir::ReactiveTerminal::DoWhile {
            loop_block, test, ..
        } => {
            collect_globals_block(loop_block, globals, env);
            collect_globals_value(test, globals, env);
        }
        react_compiler_hir::ReactiveTerminal::While {
            test, loop_block, ..
        } => {
            collect_globals_value(test, globals, env);
            collect_globals_block(loop_block, globals, env);
        }
        react_compiler_hir::ReactiveTerminal::If {
            consequent,
            alternate,
            ..
        } => {
            collect_globals_block(consequent, globals, env);
            if let Some(alt) = alternate {
                collect_globals_block(alt, globals, env);
            }
        }
        react_compiler_hir::ReactiveTerminal::Switch { cases, .. } => {
            for case in cases {
                if let Some(block) = &case.block {
                    collect_globals_block(block, globals, env);
                }
            }
        }
        react_compiler_hir::ReactiveTerminal::Label { block, .. } => {
            collect_globals_block(block, globals, env);
        }
        react_compiler_hir::ReactiveTerminal::Try { block, handler, .. } => {
            collect_globals_block(block, globals, env);
            collect_globals_block(handler, globals, env);
        }
    }
}

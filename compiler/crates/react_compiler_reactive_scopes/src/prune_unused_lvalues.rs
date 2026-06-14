// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! PruneUnusedLValues (PruneTemporaryLValues)
//!
//! Nulls out lvalues for temporary variables that are never accessed later.
//!
//! Corresponds to `src/ReactiveScopes/PruneTemporaryLValues.ts`.

use std::collections::HashSet;

use react_compiler_hir::{
    DeclarationId, EvaluationOrder, Place, ReactiveFunction, ReactiveInstruction,
    ReactiveStatement, ReactiveValue, environment::Environment,
};

use crate::visitors::{self, ReactiveFunctionVisitor};

/// Nulls out lvalues for unnamed temporaries that are never used.
/// TS: `pruneUnusedLValues`
///
/// Uses ReactiveFunctionVisitor to collect unnamed lvalue DeclarationIds,
/// removing them when referenced as operands. After the visitor pass,
/// a second pass nulls out the remaining unused lvalues.
///
/// This uses a two-phase approach because Rust's ReactiveFunctionVisitor
/// takes immutable references, so we cannot modify lvalues during the visit.
/// The TS version stores mutable instruction references and modifies them
/// after the visitor completes.
pub fn prune_unused_lvalues(func: &mut ReactiveFunction, env: &Environment) {
    // Phase 1: Use ReactiveFunctionVisitor to identify unused unnamed lvalues.
    // When we see an unnamed lvalue on an instruction, we add its DeclarationId.
    // When we see a place reference (operand), we remove its DeclarationId.
    let visitor = Visitor { env };
    let mut lvalues: HashSet<DeclarationId> = HashSet::new();
    visitors::visit_reactive_function(func, &visitor, &mut lvalues);

    // Phase 2: Null out lvalues whose DeclarationId remains in the map.
    // In the TS, this is done by iterating the stored instruction references.
    // In Rust, we walk the tree to find instructions with matching DeclarationIds.
    if !lvalues.is_empty() {
        null_unused_lvalues(&mut func.body, env, &lvalues);
    }
}

/// TS: `type LValues = Map<DeclarationId, ReactiveInstruction>`
/// In Rust, we only need the set of DeclarationIds (not the instruction refs)
/// because we apply changes in a separate pass.
type LValues = HashSet<DeclarationId>;

/// TS: `class Visitor extends ReactiveFunctionVisitor<LValues>`
struct Visitor<'a> {
    env: &'a Environment,
}

impl ReactiveFunctionVisitor for Visitor<'_> {
    type State = LValues;

    fn env(&self) -> &Environment {
        self.env
    }

    /// TS: `visitPlace(_id, place, state) { state.delete(place.identifier.declarationId) }`
    fn visit_place(&self, _id: EvaluationOrder, place: &Place, state: &mut LValues) {
        let ident = &self.env.identifiers[place.identifier.0 as usize];
        state.remove(&ident.declaration_id);
    }

    /// TS: `visitInstruction(instruction, state)`
    /// Calls traverseInstruction first (visits operands via visitPlace),
    /// then checks if the lvalue is unnamed and adds to map.
    fn visit_instruction(&self, instruction: &ReactiveInstruction, state: &mut LValues) {
        self.traverse_instruction(instruction, state);
        if let Some(lv) = &instruction.lvalue {
            let ident = &self.env.identifiers[lv.identifier.0 as usize];
            if ident.name.is_none() {
                state.insert(ident.declaration_id);
            }
        }
    }
}

/// Phase 2: Walk the tree and null out lvalues whose DeclarationId is unused.
/// This is necessary because Rust's visitor takes immutable references.
fn null_unused_lvalues(
    block: &mut Vec<ReactiveStatement>,
    env: &Environment,
    unused: &HashSet<DeclarationId>,
) {
    for stmt in block.iter_mut() {
        match stmt {
            ReactiveStatement::Instruction(instr) => {
                null_unused_in_instruction(instr, env, unused);
            }
            ReactiveStatement::Scope(scope) => {
                null_unused_lvalues(&mut scope.instructions, env, unused);
            }
            ReactiveStatement::PrunedScope(scope) => {
                null_unused_lvalues(&mut scope.instructions, env, unused);
            }
            ReactiveStatement::Terminal(stmt) => {
                null_unused_in_terminal(&mut stmt.terminal, env, unused);
            }
        }
    }
}

fn null_unused_in_instruction(
    instr: &mut ReactiveInstruction,
    env: &Environment,
    unused: &HashSet<DeclarationId>,
) {
    if let Some(lv) = &instr.lvalue {
        let ident = &env.identifiers[lv.identifier.0 as usize];
        if unused.contains(&ident.declaration_id) {
            instr.lvalue = None;
        }
    }
    null_unused_in_value(&mut instr.value, env, unused);
}

fn null_unused_in_value(
    value: &mut ReactiveValue,
    env: &Environment,
    unused: &HashSet<DeclarationId>,
) {
    match value {
        ReactiveValue::SequenceExpression {
            instructions,
            value: inner,
            ..
        } => {
            for instr in instructions.iter_mut() {
                null_unused_in_instruction(instr, env, unused);
            }
            null_unused_in_value(inner, env, unused);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            null_unused_in_value(left, env, unused);
            null_unused_in_value(right, env, unused);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            null_unused_in_value(test, env, unused);
            null_unused_in_value(consequent, env, unused);
            null_unused_in_value(alternate, env, unused);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            null_unused_in_value(inner, env, unused);
        }
        ReactiveValue::Instruction(_) => {}
    }
}

fn null_unused_in_terminal(
    terminal: &mut react_compiler_hir::ReactiveTerminal,
    env: &Environment,
    unused: &HashSet<DeclarationId>,
) {
    use react_compiler_hir::ReactiveTerminal;
    match terminal {
        ReactiveTerminal::Break { .. } | ReactiveTerminal::Continue { .. } => {}
        ReactiveTerminal::Return { .. } | ReactiveTerminal::Throw { .. } => {}
        ReactiveTerminal::For {
            init,
            test,
            update,
            loop_block,
            ..
        } => {
            null_unused_in_value(init, env, unused);
            null_unused_in_value(test, env, unused);
            null_unused_lvalues(loop_block, env, unused);
            if let Some(update) = update {
                null_unused_in_value(update, env, unused);
            }
        }
        ReactiveTerminal::ForOf {
            init,
            test,
            loop_block,
            ..
        } => {
            null_unused_in_value(init, env, unused);
            null_unused_in_value(test, env, unused);
            null_unused_lvalues(loop_block, env, unused);
        }
        ReactiveTerminal::ForIn {
            init, loop_block, ..
        } => {
            null_unused_in_value(init, env, unused);
            null_unused_lvalues(loop_block, env, unused);
        }
        ReactiveTerminal::DoWhile {
            loop_block, test, ..
        } => {
            null_unused_lvalues(loop_block, env, unused);
            null_unused_in_value(test, env, unused);
        }
        ReactiveTerminal::While {
            test, loop_block, ..
        } => {
            null_unused_in_value(test, env, unused);
            null_unused_lvalues(loop_block, env, unused);
        }
        ReactiveTerminal::If {
            consequent,
            alternate,
            ..
        } => {
            null_unused_lvalues(consequent, env, unused);
            if let Some(alt) = alternate {
                null_unused_lvalues(alt, env, unused);
            }
        }
        ReactiveTerminal::Switch { cases, .. } => {
            for case in cases.iter_mut() {
                if let Some(block) = &mut case.block {
                    null_unused_lvalues(block, env, unused);
                }
            }
        }
        ReactiveTerminal::Label { block, .. } => {
            null_unused_lvalues(block, env, unused);
        }
        ReactiveTerminal::Try { block, handler, .. } => {
            null_unused_lvalues(block, env, unused);
            null_unused_lvalues(handler, env, unused);
        }
    }
}

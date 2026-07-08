// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Visitor and transform traits for ReactiveFunction.
//!
//! Corresponds to `src/ReactiveScopes/visitors.ts` in the TypeScript compiler.

use react_compiler_diagnostics::CompilerError;
use react_compiler_hir::{
    EvaluationOrder, FunctionId, InstructionValue, ParamPattern, Place, PrunedReactiveScopeBlock,
    ReactiveBlock, ReactiveFunction, ReactiveInstruction, ReactiveScopeBlock, ReactiveStatement,
    ReactiveTerminal, ReactiveTerminalStatement, ReactiveValue, environment::Environment,
};

// =============================================================================
// ReactiveFunctionVisitor trait
// =============================================================================

/// Visitor trait for walking a ReactiveFunction tree.
///
/// Override individual `visit_*` methods to customize behavior; call the
/// corresponding `traverse_*` to continue the default recursion.
///
/// TS: `class ReactiveFunctionVisitor<TState>`
pub trait ReactiveFunctionVisitor {
    type State;

    /// Provide Environment access. The default traversal uses this to include
    /// FunctionExpression/ObjectMethod context places as operands (matching the
    /// TS `eachInstructionValueOperand` behavior).
    fn env(&self) -> &Environment;

    fn visit_id(&self, _id: EvaluationOrder, _state: &mut Self::State) {}

    fn visit_place(&self, _id: EvaluationOrder, _place: &Place, _state: &mut Self::State) {}

    fn visit_lvalue(&self, _id: EvaluationOrder, _lvalue: &Place, _state: &mut Self::State) {}

    fn visit_param(&self, _place: &Place, _state: &mut Self::State) {}

    /// Walk an inner HIR function, visiting params, instructions (with lvalues,
    /// value-lvalues, operands, and nested functions), and terminal operands.
    /// TS: `visitHirFunction`
    fn visit_hir_function(&self, func_id: FunctionId, state: &mut Self::State) {
        let inner_func = &self.env().functions[func_id.0 as usize];
        for param in &inner_func.params {
            let place = match param {
                ParamPattern::Place(p) => p,
                ParamPattern::Spread(s) => &s.place,
            };
            self.visit_param(place, state);
        }
        let block_ids: Vec<_> = inner_func.body.blocks.keys().copied().collect();
        for block_id in block_ids {
            let inner_func = &self.env().functions[func_id.0 as usize];
            let block = &inner_func.body.blocks[&block_id];
            let instr_ids: Vec<_> = block.instructions.clone();
            let terminal_operands: Vec<Place> =
                react_compiler_hir::visitors::each_terminal_operand(&block.terminal);
            let terminal_id = block.terminal.evaluation_order();

            for instr_id in &instr_ids {
                let inner_func = &self.env().functions[func_id.0 as usize];
                let instr = &inner_func.instructions[instr_id.0 as usize];
                // Build a temporary ReactiveInstruction for the visitor
                let reactive_instr = ReactiveInstruction {
                    id: instr.id,
                    lvalue: Some(instr.lvalue.clone()),
                    value: ReactiveValue::Instruction(instr.value.clone()),
                    effects: None,
                    loc: instr.loc,
                };
                self.visit_instruction(&reactive_instr, state);
                // Recurse into nested functions
                match &instr.value {
                    InstructionValue::FunctionExpression { lowered_func, .. }
                    | InstructionValue::ObjectMethod { lowered_func, .. } => {
                        self.visit_hir_function(lowered_func.func, state);
                    }
                    _ => {}
                }
            }
            for operand in &terminal_operands {
                self.visit_place(terminal_id, operand, state);
            }
        }
    }

    fn visit_value(&self, id: EvaluationOrder, value: &ReactiveValue, state: &mut Self::State) {
        self.traverse_value(id, value, state);
    }

    fn traverse_value(&self, id: EvaluationOrder, value: &ReactiveValue, state: &mut Self::State) {
        match value {
            ReactiveValue::OptionalExpression { value: inner, .. } => {
                self.visit_value(id, inner, state);
            }
            ReactiveValue::LogicalExpression { left, right, .. } => {
                self.visit_value(id, left, state);
                self.visit_value(id, right, state);
            }
            ReactiveValue::ConditionalExpression {
                test,
                consequent,
                alternate,
                ..
            } => {
                self.visit_value(id, test, state);
                self.visit_value(id, consequent, state);
                self.visit_value(id, alternate, state);
            }
            ReactiveValue::SequenceExpression {
                instructions,
                id: seq_id,
                value: inner,
                ..
            } => {
                for instr in instructions {
                    self.visit_instruction(instr, state);
                }
                self.visit_value(*seq_id, inner, state);
            }
            ReactiveValue::Instruction(instr_value) => {
                let operands = react_compiler_hir::visitors::each_instruction_value_operand(
                    instr_value,
                    self.env(),
                );
                for place in &operands {
                    self.visit_place(id, place, state);
                }
            }
        }
    }

    fn visit_instruction(&self, instruction: &ReactiveInstruction, state: &mut Self::State) {
        self.traverse_instruction(instruction, state);
    }

    fn traverse_instruction(&self, instruction: &ReactiveInstruction, state: &mut Self::State) {
        self.visit_id(instruction.id, state);
        // Visit instruction-level lvalue
        if let Some(lvalue) = &instruction.lvalue {
            self.visit_lvalue(instruction.id, lvalue, state);
        }
        // Visit value-level lvalues (TS: eachInstructionValueLValue)
        if let ReactiveValue::Instruction(iv) = &instruction.value {
            for place in react_compiler_hir::visitors::each_instruction_value_lvalue(iv) {
                self.visit_lvalue(instruction.id, &place, state);
            }
        }
        self.visit_value(instruction.id, &instruction.value, state);
    }

    fn visit_terminal(&self, stmt: &ReactiveTerminalStatement, state: &mut Self::State) {
        self.traverse_terminal(stmt, state);
    }

    fn traverse_terminal(&self, stmt: &ReactiveTerminalStatement, state: &mut Self::State) {
        let terminal = &stmt.terminal;
        let id = terminal_id(terminal);
        self.visit_id(id, state);
        match terminal {
            ReactiveTerminal::Break { .. } | ReactiveTerminal::Continue { .. } => {}
            ReactiveTerminal::Return { value, id, .. } => {
                self.visit_place(*id, value, state);
            }
            ReactiveTerminal::Throw { value, id, .. } => {
                self.visit_place(*id, value, state);
            }
            ReactiveTerminal::For {
                init,
                test,
                update,
                loop_block,
                id,
                ..
            } => {
                self.visit_value(*id, init, state);
                self.visit_value(*id, test, state);
                self.visit_block(loop_block, state);
                if let Some(update) = update {
                    self.visit_value(*id, update, state);
                }
            }
            ReactiveTerminal::ForOf {
                init,
                test,
                loop_block,
                id,
                ..
            } => {
                self.visit_value(*id, init, state);
                self.visit_value(*id, test, state);
                self.visit_block(loop_block, state);
            }
            ReactiveTerminal::ForIn {
                init,
                loop_block,
                id,
                ..
            } => {
                self.visit_value(*id, init, state);
                self.visit_block(loop_block, state);
            }
            ReactiveTerminal::DoWhile {
                loop_block,
                test,
                id,
                ..
            } => {
                self.visit_block(loop_block, state);
                self.visit_value(*id, test, state);
            }
            ReactiveTerminal::While {
                test,
                loop_block,
                id,
                ..
            } => {
                self.visit_value(*id, test, state);
                self.visit_block(loop_block, state);
            }
            ReactiveTerminal::If {
                test,
                consequent,
                alternate,
                id,
                ..
            } => {
                self.visit_place(*id, test, state);
                self.visit_block(consequent, state);
                if let Some(alt) = alternate {
                    self.visit_block(alt, state);
                }
            }
            ReactiveTerminal::Switch {
                test, cases, id, ..
            } => {
                self.visit_place(*id, test, state);
                for case in cases {
                    if let Some(t) = &case.test {
                        self.visit_place(*id, t, state);
                    }
                    if let Some(block) = &case.block {
                        self.visit_block(block, state);
                    }
                }
            }
            ReactiveTerminal::Label { block, .. } => {
                self.visit_block(block, state);
            }
            ReactiveTerminal::Try {
                block,
                handler_binding,
                handler,
                id,
                ..
            } => {
                self.visit_block(block, state);
                if let Some(binding) = handler_binding {
                    self.visit_place(*id, binding, state);
                }
                self.visit_block(handler, state);
            }
        }
    }

    fn visit_scope(&self, scope: &ReactiveScopeBlock, state: &mut Self::State) {
        self.traverse_scope(scope, state);
    }

    fn traverse_scope(&self, scope: &ReactiveScopeBlock, state: &mut Self::State) {
        self.visit_block(&scope.instructions, state);
    }

    fn visit_pruned_scope(&self, scope: &PrunedReactiveScopeBlock, state: &mut Self::State) {
        self.traverse_pruned_scope(scope, state);
    }

    fn traverse_pruned_scope(&self, scope: &PrunedReactiveScopeBlock, state: &mut Self::State) {
        self.visit_block(&scope.instructions, state);
    }

    fn visit_block(&self, block: &ReactiveBlock, state: &mut Self::State) {
        self.traverse_block(block, state);
    }

    fn traverse_block(&self, block: &ReactiveBlock, state: &mut Self::State) {
        for stmt in block {
            match stmt {
                ReactiveStatement::Instruction(instr) => {
                    self.visit_instruction(instr, state);
                }
                ReactiveStatement::Scope(scope) => {
                    self.visit_scope(scope, state);
                }
                ReactiveStatement::PrunedScope(scope) => {
                    self.visit_pruned_scope(scope, state);
                }
                ReactiveStatement::Terminal(terminal) => {
                    self.visit_terminal(terminal, state);
                }
            }
        }
    }
}

/// Entry point for visiting a reactive function.
/// TS: `visitReactiveFunction`
pub fn visit_reactive_function<V: ReactiveFunctionVisitor>(
    func: &ReactiveFunction,
    visitor: &V,
    state: &mut V::State,
) {
    visitor.visit_block(&func.body, state);
}

// =============================================================================
// Transformed / TransformedValue enums
// =============================================================================

/// Result of transforming a ReactiveStatement.
/// TS: `Transformed<T>`
pub enum Transformed<T> {
    Keep,
    Remove,
    Replace(T),
    ReplaceMany(Vec<T>),
}

/// Result of transforming a ReactiveValue.
/// TS: `TransformedValue`
#[allow(dead_code)]
pub enum TransformedValue {
    Keep,
    Replace(ReactiveValue),
}

// =============================================================================
// ReactiveFunctionTransform trait
// =============================================================================

/// Transform trait for modifying a ReactiveFunction tree in-place.
///
/// Extends the visitor pattern with `transform_*` methods that can modify
/// or remove statements. The `traverse_block` implementation handles applying
/// transform results to the block.
///
/// TS: `class ReactiveFunctionTransform<TState>`
pub trait ReactiveFunctionTransform {
    type State;

    /// Provide Environment access. The default traversal uses this to include
    /// FunctionExpression/ObjectMethod context places as operands (matching the
    /// TS `eachInstructionValueOperand` behavior).
    fn env(&self) -> &Environment;

    fn visit_id(
        &mut self,
        _id: EvaluationOrder,
        _state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        Ok(())
    }

    fn visit_place(
        &mut self,
        _id: EvaluationOrder,
        _place: &Place,
        _state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        Ok(())
    }

    fn visit_lvalue(
        &mut self,
        _id: EvaluationOrder,
        _lvalue: &Place,
        _state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        Ok(())
    }

    fn visit_value(
        &mut self,
        id: EvaluationOrder,
        value: &mut ReactiveValue,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.traverse_value(id, value, state)
    }

    fn traverse_value(
        &mut self,
        id: EvaluationOrder,
        value: &mut ReactiveValue,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        match value {
            ReactiveValue::OptionalExpression { value: inner, .. } => {
                let next = self.transform_value(id, inner, state)?;
                if let TransformedValue::Replace(new_value) = next {
                    **inner = new_value;
                }
            }
            ReactiveValue::LogicalExpression { left, right, .. } => {
                let next_left = self.transform_value(id, left, state)?;
                if let TransformedValue::Replace(new_value) = next_left {
                    **left = new_value;
                }
                let next_right = self.transform_value(id, right, state)?;
                if let TransformedValue::Replace(new_value) = next_right {
                    **right = new_value;
                }
            }
            ReactiveValue::ConditionalExpression {
                test,
                consequent,
                alternate,
                ..
            } => {
                let next_test = self.transform_value(id, test, state)?;
                if let TransformedValue::Replace(new_value) = next_test {
                    **test = new_value;
                }
                let next_cons = self.transform_value(id, consequent, state)?;
                if let TransformedValue::Replace(new_value) = next_cons {
                    **consequent = new_value;
                }
                let next_alt = self.transform_value(id, alternate, state)?;
                if let TransformedValue::Replace(new_value) = next_alt {
                    **alternate = new_value;
                }
            }
            ReactiveValue::SequenceExpression {
                instructions,
                id: seq_id,
                value: inner,
                ..
            } => {
                let seq_id = *seq_id;
                for instr in instructions.iter_mut() {
                    self.visit_instruction(instr, state)?;
                }
                let next = self.transform_value(seq_id, inner, state)?;
                if let TransformedValue::Replace(new_value) = next {
                    **inner = new_value;
                }
            }
            ReactiveValue::Instruction(instr_value) => {
                // Collect operands before visiting to avoid borrow conflict
                // (self.env() borrows self immutably, self.visit_place() needs &mut self).
                let operands = react_compiler_hir::visitors::each_instruction_value_operand(
                    instr_value,
                    self.env(),
                );
                for place in &operands {
                    self.visit_place(id, place, state)?;
                }
            }
        }
        Ok(())
    }

    fn visit_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.traverse_instruction(instruction, state)
    }

    fn transform_value(
        &mut self,
        id: EvaluationOrder,
        value: &mut ReactiveValue,
        state: &mut Self::State,
    ) -> Result<TransformedValue, CompilerError> {
        self.visit_value(id, value, state)?;
        Ok(TransformedValue::Keep)
    }

    fn traverse_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.visit_id(instruction.id, state)?;
        // Visit instruction-level lvalue
        if let Some(lvalue) = &instruction.lvalue {
            self.visit_lvalue(instruction.id, lvalue, state)?;
        }
        // Visit value-level lvalues (TS: eachInstructionValueLValue)
        if let ReactiveValue::Instruction(iv) = &instruction.value {
            for place in react_compiler_hir::visitors::each_instruction_value_lvalue(iv) {
                self.visit_lvalue(instruction.id, &place, state)?;
            }
        }
        let next_value = self.transform_value(instruction.id, &mut instruction.value, state)?;
        if let TransformedValue::Replace(new_value) = next_value {
            instruction.value = new_value;
        }
        Ok(())
    }

    fn visit_terminal(
        &mut self,
        stmt: &mut ReactiveTerminalStatement,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.traverse_terminal(stmt, state)
    }

    fn traverse_terminal(
        &mut self,
        stmt: &mut ReactiveTerminalStatement,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        let terminal = &mut stmt.terminal;
        let id = terminal_id(terminal);
        self.visit_id(id, state)?;
        match terminal {
            ReactiveTerminal::Break { .. } | ReactiveTerminal::Continue { .. } => {}
            ReactiveTerminal::Return { value, id, .. } => {
                self.visit_place(*id, value, state)?;
            }
            ReactiveTerminal::Throw { value, id, .. } => {
                self.visit_place(*id, value, state)?;
            }
            ReactiveTerminal::For {
                init,
                test,
                update,
                loop_block,
                id,
                ..
            } => {
                let id = *id;
                let next_init = self.transform_value(id, init, state)?;
                if let TransformedValue::Replace(new_value) = next_init {
                    *init = new_value;
                }
                let next_test = self.transform_value(id, test, state)?;
                if let TransformedValue::Replace(new_value) = next_test {
                    *test = new_value;
                }
                if let Some(update) = update {
                    let next_update = self.transform_value(id, update, state)?;
                    if let TransformedValue::Replace(new_value) = next_update {
                        *update = new_value;
                    }
                }
                self.visit_block(loop_block, state)?;
            }
            ReactiveTerminal::ForOf {
                init,
                test,
                loop_block,
                id,
                ..
            } => {
                let id = *id;
                let next_init = self.transform_value(id, init, state)?;
                if let TransformedValue::Replace(new_value) = next_init {
                    *init = new_value;
                }
                let next_test = self.transform_value(id, test, state)?;
                if let TransformedValue::Replace(new_value) = next_test {
                    *test = new_value;
                }
                self.visit_block(loop_block, state)?;
            }
            ReactiveTerminal::ForIn {
                init,
                loop_block,
                id,
                ..
            } => {
                let id = *id;
                let next_init = self.transform_value(id, init, state)?;
                if let TransformedValue::Replace(new_value) = next_init {
                    *init = new_value;
                }
                self.visit_block(loop_block, state)?;
            }
            ReactiveTerminal::DoWhile {
                loop_block,
                test,
                id,
                ..
            } => {
                let id = *id;
                self.visit_block(loop_block, state)?;
                let next_test = self.transform_value(id, test, state)?;
                if let TransformedValue::Replace(new_value) = next_test {
                    *test = new_value;
                }
            }
            ReactiveTerminal::While {
                test,
                loop_block,
                id,
                ..
            } => {
                let id = *id;
                let next_test = self.transform_value(id, test, state)?;
                if let TransformedValue::Replace(new_value) = next_test {
                    *test = new_value;
                }
                self.visit_block(loop_block, state)?;
            }
            ReactiveTerminal::If {
                test,
                consequent,
                alternate,
                id,
                ..
            } => {
                self.visit_place(*id, test, state)?;
                self.visit_block(consequent, state)?;
                if let Some(alt) = alternate {
                    self.visit_block(alt, state)?;
                }
            }
            ReactiveTerminal::Switch {
                test, cases, id, ..
            } => {
                let id = *id;
                self.visit_place(id, test, state)?;
                for case in cases.iter_mut() {
                    if let Some(t) = &case.test {
                        self.visit_place(id, t, state)?;
                    }
                    if let Some(block) = &mut case.block {
                        self.visit_block(block, state)?;
                    }
                }
            }
            ReactiveTerminal::Label { block, .. } => {
                self.visit_block(block, state)?;
            }
            ReactiveTerminal::Try {
                block,
                handler_binding,
                handler,
                id,
                ..
            } => {
                let id = *id;
                self.visit_block(block, state)?;
                if let Some(binding) = handler_binding {
                    self.visit_place(id, binding, state)?;
                }
                self.visit_block(handler, state)?;
            }
        }
        Ok(())
    }

    fn visit_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.traverse_scope(scope, state)
    }

    fn traverse_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.visit_block(&mut scope.instructions, state)
    }

    fn visit_pruned_scope(
        &mut self,
        scope: &mut PrunedReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.traverse_pruned_scope(scope, state)
    }

    fn traverse_pruned_scope(
        &mut self,
        scope: &mut PrunedReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.visit_block(&mut scope.instructions, state)
    }

    fn visit_block(
        &mut self,
        block: &mut ReactiveBlock,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        self.traverse_block(block, state)
    }

    fn transform_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        state: &mut Self::State,
    ) -> Result<Transformed<ReactiveStatement>, CompilerError> {
        self.visit_instruction(instruction, state)?;
        Ok(Transformed::Keep)
    }

    fn transform_terminal(
        &mut self,
        stmt: &mut ReactiveTerminalStatement,
        state: &mut Self::State,
    ) -> Result<Transformed<ReactiveStatement>, CompilerError> {
        self.visit_terminal(stmt, state)?;
        Ok(Transformed::Keep)
    }

    fn transform_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<Transformed<ReactiveStatement>, CompilerError> {
        self.visit_scope(scope, state)?;
        Ok(Transformed::Keep)
    }

    fn transform_pruned_scope(
        &mut self,
        scope: &mut PrunedReactiveScopeBlock,
        state: &mut Self::State,
    ) -> Result<Transformed<ReactiveStatement>, CompilerError> {
        self.visit_pruned_scope(scope, state)?;
        Ok(Transformed::Keep)
    }

    fn traverse_block(
        &mut self,
        block: &mut ReactiveBlock,
        state: &mut Self::State,
    ) -> Result<(), CompilerError> {
        let mut next_block: Option<Vec<ReactiveStatement>> = None;
        let len = block.len();
        for i in 0..len {
            // Take the statement out temporarily
            let mut stmt = std::mem::replace(
                &mut block[i],
                // Placeholder — will be overwritten or discarded
                ReactiveStatement::Instruction(ReactiveInstruction {
                    id: EvaluationOrder(0),
                    lvalue: None,
                    value: ReactiveValue::Instruction(
                        react_compiler_hir::InstructionValue::Debugger { loc: None },
                    ),
                    effects: None,
                    loc: None,
                }),
            );
            let transformed = match &mut stmt {
                ReactiveStatement::Instruction(instr) => {
                    self.transform_instruction(instr, state)?
                }
                ReactiveStatement::Scope(scope) => self.transform_scope(scope, state)?,
                ReactiveStatement::PrunedScope(scope) => {
                    self.transform_pruned_scope(scope, state)?
                }
                ReactiveStatement::Terminal(terminal) => {
                    self.transform_terminal(terminal, state)?
                }
            };
            match transformed {
                Transformed::Keep => {
                    if let Some(ref mut nb) = next_block {
                        nb.push(stmt);
                    } else {
                        // Put it back
                        block[i] = stmt;
                    }
                }
                Transformed::Remove => {
                    if next_block.is_none() {
                        next_block = Some(block[..i].to_vec());
                    }
                }
                Transformed::Replace(replacement) => {
                    if next_block.is_none() {
                        next_block = Some(block[..i].to_vec());
                    }
                    next_block.as_mut().unwrap().push(replacement);
                }
                Transformed::ReplaceMany(replacements) => {
                    if next_block.is_none() {
                        next_block = Some(block[..i].to_vec());
                    }
                    next_block.as_mut().unwrap().extend(replacements);
                }
            }
        }
        if let Some(nb) = next_block {
            *block = nb;
        }
        Ok(())
    }
}

/// Entry point for transforming a reactive function.
/// TS: `visitReactiveFunction` (used with transforms too)
pub fn transform_reactive_function<T: ReactiveFunctionTransform>(
    func: &mut ReactiveFunction,
    transform: &mut T,
    state: &mut T::State,
) -> Result<(), CompilerError> {
    transform.visit_block(&mut func.body, state)
}

// =============================================================================
// Helper: extract terminal ID
// =============================================================================

fn terminal_id(terminal: &ReactiveTerminal) -> EvaluationOrder {
    match terminal {
        ReactiveTerminal::Break { id, .. }
        | ReactiveTerminal::Continue { id, .. }
        | ReactiveTerminal::Return { id, .. }
        | ReactiveTerminal::Throw { id, .. }
        | ReactiveTerminal::Switch { id, .. }
        | ReactiveTerminal::DoWhile { id, .. }
        | ReactiveTerminal::While { id, .. }
        | ReactiveTerminal::For { id, .. }
        | ReactiveTerminal::ForOf { id, .. }
        | ReactiveTerminal::ForIn { id, .. }
        | ReactiveTerminal::If { id, .. }
        | ReactiveTerminal::Label { id, .. }
        | ReactiveTerminal::Try { id, .. } => *id,
    }
}

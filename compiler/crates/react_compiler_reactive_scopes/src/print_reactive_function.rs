// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Verbose debug printer for ReactiveFunction.
//!
//! Produces output identical to the TS `printDebugReactiveFunction`.
//! Delegates shared formatting (Places, Identifiers, Scopes, Types,
//! InstructionValues, Effects, Errors) to `react_compiler_hir::print::PrintFormatter`.

use react_compiler_hir::environment::Environment;
use react_compiler_hir::print::{self, PrintFormatter};
use react_compiler_hir::{
    HirFunction, ParamPattern, ReactiveBlock, ReactiveFunction, ReactiveInstruction,
    ReactiveStatement, ReactiveTerminal, ReactiveTerminalStatement, ReactiveValue,
};

// =============================================================================
// DebugPrinter — thin wrapper around PrintFormatter for reactive-specific logic
// =============================================================================

pub struct DebugPrinter<'a> {
    pub fmt: PrintFormatter<'a>,
    /// Optional formatter for HIR functions (used for inner functions in FunctionExpression/ObjectMethod)
    pub hir_formatter: Option<&'a HirFunctionFormatter>,
}

impl<'a> DebugPrinter<'a> {
    pub fn new(env: &'a Environment) -> Self {
        Self {
            fmt: PrintFormatter::new(env),
            hir_formatter: None,
        }
    }

    // =========================================================================
    // ReactiveFunction
    // =========================================================================

    pub fn format_reactive_function(&mut self, func: &ReactiveFunction) {
        self.fmt.indent();
        self.fmt.line(&format!(
            "id: {}",
            match &func.id {
                Some(id) => format!("\"{}\"", id),
                None => "null".to_string(),
            }
        ));
        self.fmt.line(&format!(
            "name_hint: {}",
            match &func.name_hint {
                Some(h) => format!("\"{}\"", h),
                None => "null".to_string(),
            }
        ));
        self.fmt.line(&format!("generator: {}", func.generator));
        self.fmt.line(&format!("is_async: {}", func.is_async));
        self.fmt
            .line(&format!("loc: {}", print::format_loc(&func.loc)));

        // params
        self.fmt.line("params:");
        self.fmt.indent();
        for (i, param) in func.params.iter().enumerate() {
            match param {
                ParamPattern::Place(place) => {
                    self.fmt.format_place_field(&format!("[{}]", i), place);
                }
                ParamPattern::Spread(spread) => {
                    self.fmt.line(&format!("[{}] Spread:", i));
                    self.fmt.indent();
                    self.fmt.format_place_field("place", &spread.place);
                    self.fmt.dedent();
                }
            }
        }
        self.fmt.dedent();

        // directives
        self.fmt.line("directives:");
        self.fmt.indent();
        for (i, d) in func.directives.iter().enumerate() {
            self.fmt.line(&format!("[{}] \"{}\"", i, d));
        }
        self.fmt.dedent();

        self.fmt.line("");
        self.fmt.line("Body:");
        self.fmt.indent();
        self.format_reactive_block(&func.body);
        self.fmt.dedent();
        self.fmt.dedent();
    }

    // =========================================================================
    // ReactiveBlock
    // =========================================================================

    fn format_reactive_block(&mut self, block: &ReactiveBlock) {
        for stmt in block.iter() {
            self.format_reactive_statement(stmt);
        }
    }

    fn format_reactive_statement(&mut self, stmt: &ReactiveStatement) {
        match stmt {
            ReactiveStatement::Instruction(instr) => {
                self.format_reactive_instruction_block(instr);
            }
            ReactiveStatement::Terminal(term) => {
                self.fmt.line("ReactiveTerminalStatement {");
                self.fmt.indent();
                self.format_terminal_statement(term);
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveStatement::Scope(scope) => {
                self.fmt.line("ReactiveScopeBlock {");
                self.fmt.indent();
                self.fmt.format_scope_field("scope", scope.scope);
                self.fmt.line("instructions:");
                self.fmt.indent();
                self.format_reactive_block(&scope.instructions);
                self.fmt.dedent();
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveStatement::PrunedScope(scope) => {
                self.fmt.line("PrunedReactiveScopeBlock {");
                self.fmt.indent();
                self.fmt.format_scope_field("scope", scope.scope);
                self.fmt.line("instructions:");
                self.fmt.indent();
                self.format_reactive_block(&scope.instructions);
                self.fmt.dedent();
                self.fmt.dedent();
                self.fmt.line("}");
            }
        }
    }

    // =========================================================================
    // ReactiveInstruction
    // =========================================================================

    fn format_reactive_instruction_block(&mut self, instr: &ReactiveInstruction) {
        self.fmt.line("ReactiveInstruction {");
        self.fmt.indent();
        self.format_reactive_instruction(instr);
        self.fmt.dedent();
        self.fmt.line("}");
    }

    fn format_reactive_instruction(&mut self, instr: &ReactiveInstruction) {
        self.fmt.line(&format!("id: {}", instr.id.0));
        match &instr.lvalue {
            Some(place) => self.fmt.format_place_field("lvalue", place),
            None => self.fmt.line("lvalue: null"),
        }
        self.fmt.line("value:");
        self.fmt.indent();
        self.format_reactive_value(&instr.value);
        self.fmt.dedent();
        match &instr.effects {
            Some(effects) => {
                self.fmt.line("effects:");
                self.fmt.indent();
                for (i, eff) in effects.iter().enumerate() {
                    self.fmt
                        .line(&format!("[{}] {}", i, self.fmt.format_effect(eff)));
                }
                self.fmt.dedent();
            }
            None => self.fmt.line("effects: null"),
        }
        self.fmt
            .line(&format!("loc: {}", print::format_loc(&instr.loc)));
    }

    // =========================================================================
    // ReactiveValue
    // =========================================================================

    fn format_reactive_value(&mut self, value: &ReactiveValue) {
        match value {
            ReactiveValue::Instruction(iv) => {
                // Build the inner function formatter callback if we have an hir_formatter
                let hir_formatter = self.hir_formatter;
                let inner_func_cb: Option<Box<dyn Fn(&mut PrintFormatter, &HirFunction) + '_>> =
                    hir_formatter.map(|hf| {
                        Box::new(move |fmt: &mut PrintFormatter, func: &HirFunction| {
                            hf(fmt, func);
                        })
                            as Box<dyn Fn(&mut PrintFormatter, &HirFunction) + '_>
                    });
                self.fmt.format_instruction_value(
                    iv,
                    inner_func_cb
                        .as_ref()
                        .map(|cb| cb.as_ref() as &dyn Fn(&mut PrintFormatter, &HirFunction)),
                );
            }
            ReactiveValue::LogicalExpression {
                operator,
                left,
                right,
                loc,
            } => {
                self.fmt.line("LogicalExpression {");
                self.fmt.indent();
                self.fmt.line(&format!("operator: \"{}\"", operator));
                self.fmt.line("left:");
                self.fmt.indent();
                self.format_reactive_value(left);
                self.fmt.dedent();
                self.fmt.line("right:");
                self.fmt.indent();
                self.format_reactive_value(right);
                self.fmt.dedent();
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveValue::ConditionalExpression {
                test,
                consequent,
                alternate,
                loc,
            } => {
                self.fmt.line("ConditionalExpression {");
                self.fmt.indent();
                self.fmt.line("test:");
                self.fmt.indent();
                self.format_reactive_value(test);
                self.fmt.dedent();
                self.fmt.line("consequent:");
                self.fmt.indent();
                self.format_reactive_value(consequent);
                self.fmt.dedent();
                self.fmt.line("alternate:");
                self.fmt.indent();
                self.format_reactive_value(alternate);
                self.fmt.dedent();
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveValue::SequenceExpression {
                instructions,
                id,
                value,
                loc,
            } => {
                self.fmt.line("SequenceExpression {");
                self.fmt.indent();
                self.fmt.line("instructions:");
                self.fmt.indent();
                for (i, instr) in instructions.iter().enumerate() {
                    self.fmt.line(&format!("[{}]:", i));
                    self.fmt.indent();
                    self.format_reactive_instruction_block(instr);
                    self.fmt.dedent();
                }
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line("value:");
                self.fmt.indent();
                self.format_reactive_value(value);
                self.fmt.dedent();
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveValue::OptionalExpression {
                id,
                value,
                optional,
                loc,
            } => {
                self.fmt.line("OptionalExpression {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line("value:");
                self.fmt.indent();
                self.format_reactive_value(value);
                self.fmt.dedent();
                self.fmt.line(&format!("optional: {}", optional));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
        }
    }

    // =========================================================================
    // ReactiveTerminal
    // =========================================================================

    fn format_terminal_statement(&mut self, stmt: &ReactiveTerminalStatement) {
        match &stmt.label {
            Some(label) => {
                self.fmt.line(&format!(
                    "label: {{ id: bb{}, implicit: {} }}",
                    label.id.0, label.implicit
                ));
            }
            None => self.fmt.line("label: null"),
        }
        self.fmt.line("terminal:");
        self.fmt.indent();
        self.format_reactive_terminal(&stmt.terminal);
        self.fmt.dedent();
    }

    fn format_reactive_terminal(&mut self, terminal: &ReactiveTerminal) {
        match terminal {
            ReactiveTerminal::Break {
                target,
                id,
                target_kind,
                loc,
            } => {
                self.fmt.line("Break {");
                self.fmt.indent();
                self.fmt.line(&format!("target: bb{}", target.0));
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("targetKind: \"{}\"", target_kind));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::Continue {
                target,
                id,
                target_kind,
                loc,
            } => {
                self.fmt.line("Continue {");
                self.fmt.indent();
                self.fmt.line(&format!("target: bb{}", target.0));
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("targetKind: \"{}\"", target_kind));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::Return { value, id, loc } => {
                self.fmt.line("Return {");
                self.fmt.indent();
                self.fmt.format_place_field("value", value);
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::Throw { value, id, loc } => {
                self.fmt.line("Throw {");
                self.fmt.indent();
                self.fmt.format_place_field("value", value);
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::Switch {
                test,
                cases,
                id,
                loc,
            } => {
                self.fmt.line("Switch {");
                self.fmt.indent();
                self.fmt.format_place_field("test", test);
                self.fmt.line("cases:");
                self.fmt.indent();
                for (i, case) in cases.iter().enumerate() {
                    self.fmt.line(&format!("[{}] {{", i));
                    self.fmt.indent();
                    match &case.test {
                        Some(p) => {
                            self.fmt.format_place_field("test", p);
                        }
                        None => {
                            self.fmt.line("test: null");
                        }
                    }
                    match &case.block {
                        Some(block) => {
                            self.fmt.line("block:");
                            self.fmt.indent();
                            self.format_reactive_block(block);
                            self.fmt.dedent();
                        }
                        None => self.fmt.line("block: undefined"),
                    }
                    self.fmt.dedent();
                    self.fmt.line("}");
                }
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::DoWhile {
                loop_block,
                test,
                id,
                loc,
            } => {
                self.fmt.line("DoWhile {");
                self.fmt.indent();
                self.fmt.line("loop:");
                self.fmt.indent();
                self.format_reactive_block(loop_block);
                self.fmt.dedent();
                self.fmt.line("test:");
                self.fmt.indent();
                self.format_reactive_value(test);
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::While {
                test,
                loop_block,
                id,
                loc,
            } => {
                self.fmt.line("While {");
                self.fmt.indent();
                self.fmt.line("test:");
                self.fmt.indent();
                self.format_reactive_value(test);
                self.fmt.dedent();
                self.fmt.line("loop:");
                self.fmt.indent();
                self.format_reactive_block(loop_block);
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::For {
                init,
                test,
                update,
                loop_block,
                id,
                loc,
            } => {
                self.fmt.line("For {");
                self.fmt.indent();
                self.fmt.line("init:");
                self.fmt.indent();
                self.format_reactive_value(init);
                self.fmt.dedent();
                self.fmt.line("test:");
                self.fmt.indent();
                self.format_reactive_value(test);
                self.fmt.dedent();
                match update {
                    Some(u) => {
                        self.fmt.line("update:");
                        self.fmt.indent();
                        self.format_reactive_value(u);
                        self.fmt.dedent();
                    }
                    None => self.fmt.line("update: null"),
                }
                self.fmt.line("loop:");
                self.fmt.indent();
                self.format_reactive_block(loop_block);
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::ForOf {
                init,
                test,
                loop_block,
                id,
                loc,
            } => {
                self.fmt.line("ForOf {");
                self.fmt.indent();
                self.fmt.line("init:");
                self.fmt.indent();
                self.format_reactive_value(init);
                self.fmt.dedent();
                self.fmt.line("test:");
                self.fmt.indent();
                self.format_reactive_value(test);
                self.fmt.dedent();
                self.fmt.line("loop:");
                self.fmt.indent();
                self.format_reactive_block(loop_block);
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::ForIn {
                init,
                loop_block,
                id,
                loc,
            } => {
                self.fmt.line("ForIn {");
                self.fmt.indent();
                self.fmt.line("init:");
                self.fmt.indent();
                self.format_reactive_value(init);
                self.fmt.dedent();
                self.fmt.line("loop:");
                self.fmt.indent();
                self.format_reactive_block(loop_block);
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::If {
                test,
                consequent,
                alternate,
                id,
                loc,
            } => {
                self.fmt.line("If {");
                self.fmt.indent();
                self.fmt.format_place_field("test", test);
                self.fmt.line("consequent:");
                self.fmt.indent();
                self.format_reactive_block(consequent);
                self.fmt.dedent();
                match alternate {
                    Some(alt) => {
                        self.fmt.line("alternate:");
                        self.fmt.indent();
                        self.format_reactive_block(alt);
                        self.fmt.dedent();
                    }
                    None => self.fmt.line("alternate: null"),
                }
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::Label { block, id, loc } => {
                self.fmt.line("Label {");
                self.fmt.indent();
                self.fmt.line("block:");
                self.fmt.indent();
                self.format_reactive_block(block);
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            ReactiveTerminal::Try {
                block,
                handler_binding,
                handler,
                id,
                loc,
            } => {
                self.fmt.line("Try {");
                self.fmt.indent();
                self.fmt.line("block:");
                self.fmt.indent();
                self.format_reactive_block(block);
                self.fmt.dedent();
                match handler_binding {
                    Some(p) => self.fmt.format_place_field("handlerBinding", p),
                    None => self.fmt.line("handlerBinding: null"),
                }
                self.fmt.line("handler:");
                self.fmt.indent();
                self.format_reactive_block(handler);
                self.fmt.dedent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
        }
    }
}

// =============================================================================
// Entry point
// =============================================================================

/// Type alias for a function formatter callback that can print HIR functions.
/// Used to format inner functions in FunctionExpression/ObjectMethod values.
pub type HirFunctionFormatter = dyn Fn(&mut PrintFormatter, &HirFunction);

pub fn debug_reactive_function(func: &ReactiveFunction, env: &Environment) -> String {
    debug_reactive_function_with_formatter(func, env, None)
}

pub fn debug_reactive_function_with_formatter(
    func: &ReactiveFunction,
    env: &Environment,
    hir_formatter: Option<&HirFunctionFormatter>,
) -> String {
    let mut printer = DebugPrinter::new(env);
    printer.hir_formatter = hir_formatter;
    printer.format_reactive_function(func);

    // TODO: Print outlined functions when they've been converted to reactive form

    printer.fmt.line("");
    printer.fmt.line("Environment:");
    printer.fmt.indent();
    printer.fmt.format_errors(&env.errors);
    printer.fmt.dedent();

    printer.fmt.to_string_output()
}

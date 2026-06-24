use react_compiler_diagnostics::CompilerError;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::print::{self, PrintFormatter};
use react_compiler_hir::{
    BasicBlock, BlockId, HirFunction, Instruction, ParamPattern, Place, Terminal,
};

// =============================================================================
// DebugPrinter struct — thin wrapper around PrintFormatter for HIR-specific logic
// =============================================================================

struct DebugPrinter<'a> {
    fmt: PrintFormatter<'a>,
}

impl<'a> DebugPrinter<'a> {
    fn new(env: &'a Environment) -> Self {
        Self {
            fmt: PrintFormatter::new(env),
        }
    }

    // =========================================================================
    // Function
    // =========================================================================

    fn format_function(&mut self, func: &HirFunction) {
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
        self.fmt.line(&format!("fn_type: {:?}", func.fn_type));
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

        // returns
        self.fmt.line("returns:");
        self.fmt.indent();
        self.fmt.format_place_field("value", &func.returns);
        self.fmt.dedent();

        // context
        self.fmt.line("context:");
        self.fmt.indent();
        for (i, place) in func.context.iter().enumerate() {
            self.fmt.format_place_field(&format!("[{}]", i), place);
        }
        self.fmt.dedent();

        // aliasing_effects
        match &func.aliasing_effects {
            Some(effects) => {
                self.fmt.line("aliasingEffects:");
                self.fmt.indent();
                for (i, eff) in effects.iter().enumerate() {
                    self.fmt
                        .line(&format!("[{}] {}", i, self.fmt.format_effect(eff)));
                }
                self.fmt.dedent();
            }
            None => self.fmt.line("aliasingEffects: null"),
        }

        // directives
        self.fmt.line("directives:");
        self.fmt.indent();
        for (i, d) in func.directives.iter().enumerate() {
            self.fmt.line(&format!("[{}] \"{}\"", i, d));
        }
        self.fmt.dedent();

        // return_type_annotation
        self.fmt.line(&format!(
            "returnTypeAnnotation: {}",
            match &func.return_type_annotation {
                Some(ann) => ann.clone(),
                None => "null".to_string(),
            }
        ));

        self.fmt.line("");
        self.fmt.line("Blocks:");
        self.fmt.indent();
        for (block_id, block) in &func.body.blocks {
            self.format_block(block_id, block, &func.instructions);
        }
        self.fmt.dedent();
        self.fmt.dedent();
    }

    // =========================================================================
    // Block
    // =========================================================================

    fn format_block(
        &mut self,
        block_id: &BlockId,
        block: &BasicBlock,
        instructions: &[Instruction],
    ) {
        self.fmt
            .line(&format!("bb{} ({}):", block_id.0, block.kind));
        self.fmt.indent();

        // preds
        let preds: Vec<String> = block.preds.iter().map(|p| format!("bb{}", p.0)).collect();
        self.fmt.line(&format!("preds: [{}]", preds.join(", ")));

        // phis
        self.fmt.line("phis:");
        self.fmt.indent();
        for phi in &block.phis {
            self.format_phi(phi);
        }
        self.fmt.dedent();

        // instructions
        self.fmt.line("instructions:");
        self.fmt.indent();
        for (index, instr_id) in block.instructions.iter().enumerate() {
            let instr = &instructions[instr_id.0 as usize];
            self.format_instruction(instr, index);
        }
        self.fmt.dedent();

        // terminal
        self.fmt.line("terminal:");
        self.fmt.indent();
        self.format_terminal(&block.terminal);
        self.fmt.dedent();

        self.fmt.dedent();
    }

    // =========================================================================
    // Phi
    // =========================================================================

    fn format_phi(&mut self, phi: &react_compiler_hir::Phi) {
        self.fmt.line("Phi {");
        self.fmt.indent();
        self.fmt.format_place_field("place", &phi.place);
        self.fmt.line("operands:");
        self.fmt.indent();
        for (block_id, place) in &phi.operands {
            self.fmt.line(&format!("bb{}:", block_id.0));
            self.fmt.indent();
            self.fmt.format_place_field("value", place);
            self.fmt.dedent();
        }
        self.fmt.dedent();
        self.fmt.dedent();
        self.fmt.line("}");
    }

    // =========================================================================
    // Instruction
    // =========================================================================

    fn format_instruction(&mut self, instr: &Instruction, index: usize) {
        self.fmt.line(&format!("[{}] Instruction {{", index));
        self.fmt.indent();
        self.fmt.line(&format!("id: {}", instr.id.0));
        self.fmt.format_place_field("lvalue", &instr.lvalue);
        self.fmt.line("value:");
        self.fmt.indent();
        // For the HIR printer, inner functions are formatted via format_function
        self.fmt.format_instruction_value(
            &instr.value,
            Some(&|fmt: &mut PrintFormatter, func: &HirFunction| {
                // We need to recursively format the inner function
                // Use a temporary DebugPrinter that shares the formatter state
                let mut inner = DebugPrinter {
                    fmt: PrintFormatter {
                        env: fmt.env,
                        seen_identifiers: std::mem::take(&mut fmt.seen_identifiers),
                        seen_scopes: std::mem::take(&mut fmt.seen_scopes),
                        output: Vec::new(),
                        indent_level: fmt.indent_level,
                    },
                };
                inner.format_function(func);
                // Write the output lines into the parent formatter
                for line in &inner.fmt.output {
                    fmt.line_raw(line);
                }
                // Copy back the seen state
                fmt.seen_identifiers = inner.fmt.seen_identifiers;
                fmt.seen_scopes = inner.fmt.seen_scopes;
            }),
        );
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
        self.fmt.dedent();
        self.fmt.line("}");
    }

    // =========================================================================
    // Terminal
    // =========================================================================

    fn format_terminal(&mut self, terminal: &Terminal) {
        match terminal {
            Terminal::If {
                test,
                consequent,
                alternate,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("If {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.format_place_field("test", test);
                self.fmt.line(&format!("consequent: bb{}", consequent.0));
                self.fmt.line(&format!("alternate: bb{}", alternate.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Branch {
                test,
                consequent,
                alternate,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Branch {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.format_place_field("test", test);
                self.fmt.line(&format!("consequent: bb{}", consequent.0));
                self.fmt.line(&format!("alternate: bb{}", alternate.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Logical {
                operator,
                test,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Logical {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("operator: \"{}\"", operator));
                self.fmt.line(&format!("test: bb{}", test.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Ternary {
                test,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Ternary {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("test: bb{}", test.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Optional {
                optional,
                test,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Optional {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("optional: {}", optional));
                self.fmt.line(&format!("test: bb{}", test.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Throw { value, id, loc } => {
                self.fmt.line("Throw {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.format_place_field("value", value);
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Return {
                value,
                return_variant,
                id,
                loc,
                effects,
            } => {
                self.fmt.line("Return {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt
                    .line(&format!("returnVariant: {:?}", return_variant));
                self.fmt.format_place_field("value", value);
                match effects {
                    Some(e) => {
                        self.fmt.line("effects:");
                        self.fmt.indent();
                        for (i, eff) in e.iter().enumerate() {
                            self.fmt
                                .line(&format!("[{}] {}", i, self.fmt.format_effect(eff)));
                        }
                        self.fmt.dedent();
                    }
                    None => self.fmt.line("effects: null"),
                }
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Goto {
                block,
                variant,
                id,
                loc,
            } => {
                self.fmt.line("Goto {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("block: bb{}", block.0));
                self.fmt.line(&format!("variant: {:?}", variant));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Switch {
                test,
                cases,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Switch {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.format_place_field("test", test);
                self.fmt.line("cases:");
                self.fmt.indent();
                for (i, case) in cases.iter().enumerate() {
                    match &case.test {
                        Some(p) => {
                            self.fmt.line(&format!("[{}] Case {{", i));
                            self.fmt.indent();
                            self.fmt.format_place_field("test", p);
                            self.fmt.line(&format!("block: bb{}", case.block.0));
                            self.fmt.dedent();
                            self.fmt.line("}");
                        }
                        None => {
                            self.fmt
                                .line(&format!("[{}] Default {{ block: bb{} }}", i, case.block.0));
                        }
                    }
                }
                self.fmt.dedent();
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::DoWhile {
                loop_block,
                test,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("DoWhile {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("loop: bb{}", loop_block.0));
                self.fmt.line(&format!("test: bb{}", test.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::While {
                test,
                loop_block,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("While {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("test: bb{}", test.0));
                self.fmt.line(&format!("loop: bb{}", loop_block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::For {
                init,
                test,
                update,
                loop_block,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("For {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("init: bb{}", init.0));
                self.fmt.line(&format!("test: bb{}", test.0));
                self.fmt.line(&format!(
                    "update: {}",
                    match update {
                        Some(u) => format!("bb{}", u.0),
                        None => "null".to_string(),
                    }
                ));
                self.fmt.line(&format!("loop: bb{}", loop_block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::ForOf {
                init,
                test,
                loop_block,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("ForOf {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("init: bb{}", init.0));
                self.fmt.line(&format!("test: bb{}", test.0));
                self.fmt.line(&format!("loop: bb{}", loop_block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::ForIn {
                init,
                loop_block,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("ForIn {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("init: bb{}", init.0));
                self.fmt.line(&format!("loop: bb{}", loop_block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Label {
                block,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Label {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("block: bb{}", block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Sequence {
                block,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Sequence {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("block: bb{}", block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Unreachable { id, loc } => {
                self.fmt.line(&format!(
                    "Unreachable {{ id: {}, loc: {} }}",
                    id.0,
                    print::format_loc(loc)
                ));
            }
            Terminal::Unsupported { id, loc } => {
                self.fmt.line(&format!(
                    "Unsupported {{ id: {}, loc: {} }}",
                    id.0,
                    print::format_loc(loc)
                ));
            }
            Terminal::MaybeThrow {
                continuation,
                handler,
                id,
                loc,
                effects,
            } => {
                self.fmt.line("MaybeThrow {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt
                    .line(&format!("continuation: bb{}", continuation.0));
                self.fmt.line(&format!(
                    "handler: {}",
                    match handler {
                        Some(h) => format!("bb{}", h.0),
                        None => "null".to_string(),
                    }
                ));
                match effects {
                    Some(e) => {
                        self.fmt.line("effects:");
                        self.fmt.indent();
                        for (i, eff) in e.iter().enumerate() {
                            self.fmt
                                .line(&format!("[{}] {}", i, self.fmt.format_effect(eff)));
                        }
                        self.fmt.dedent();
                    }
                    None => self.fmt.line("effects: null"),
                }
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Scope {
                fallthrough,
                block,
                scope,
                id,
                loc,
            } => {
                self.fmt.line("Scope {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.format_scope_field("scope", *scope);
                self.fmt.line(&format!("block: bb{}", block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::PrunedScope {
                fallthrough,
                block,
                scope,
                id,
                loc,
            } => {
                self.fmt.line("PrunedScope {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.format_scope_field("scope", *scope);
                self.fmt.line(&format!("block: bb{}", block.0));
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
                self.fmt.line(&format!("loc: {}", print::format_loc(loc)));
                self.fmt.dedent();
                self.fmt.line("}");
            }
            Terminal::Try {
                block,
                handler_binding,
                handler,
                fallthrough,
                id,
                loc,
            } => {
                self.fmt.line("Try {");
                self.fmt.indent();
                self.fmt.line(&format!("id: {}", id.0));
                self.fmt.line(&format!("block: bb{}", block.0));
                self.fmt.line(&format!("handler: bb{}", handler.0));
                match handler_binding {
                    Some(p) => self.fmt.format_place_field("handlerBinding", p),
                    None => self.fmt.line("handlerBinding: null"),
                }
                self.fmt.line(&format!("fallthrough: bb{}", fallthrough.0));
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

pub fn debug_hir(hir: &HirFunction, env: &Environment) -> String {
    let mut printer = DebugPrinter::new(env);
    printer.format_function(hir);

    // Print outlined functions (matches TS DebugPrintHIR.ts: printDebugHIR)
    for outlined in env.get_outlined_functions() {
        printer.fmt.line("");
        printer.format_function(&outlined.func);
    }

    printer.fmt.line("");
    printer.fmt.line("Environment:");
    printer.fmt.indent();
    printer.fmt.format_errors(&env.errors);
    printer.fmt.dedent();

    printer.fmt.to_string_output()
}

// =============================================================================
// Error formatting (kept for backward compatibility)
// =============================================================================

pub fn format_errors(error: &CompilerError) -> String {
    let env = Environment::new();
    let mut fmt = PrintFormatter::new(&env);
    fmt.format_errors(error);
    fmt.to_string_output()
}

/// Format an HIR function into a reactive PrintFormatter.
/// This bridges the two debug printers so inner functions in FunctionExpression/ObjectMethod
/// can be printed within the reactive function output.
pub fn format_hir_function_into(reactive_fmt: &mut PrintFormatter, func: &HirFunction) {
    // Create a temporary DebugPrinter that shares the same environment
    let mut printer = DebugPrinter {
        fmt: PrintFormatter {
            env: reactive_fmt.env,
            seen_identifiers: std::mem::take(&mut reactive_fmt.seen_identifiers),
            seen_scopes: std::mem::take(&mut reactive_fmt.seen_scopes),
            output: Vec::new(),
            indent_level: reactive_fmt.indent_level,
        },
    };
    printer.format_function(func);

    // Write the output lines into the reactive formatter
    for line in &printer.fmt.output {
        reactive_fmt.line_raw(line);
    }
    // Copy back the seen state
    reactive_fmt.seen_identifiers = printer.fmt.seen_identifiers;
    reactive_fmt.seen_scopes = printer.fmt.seen_scopes;
}

// =============================================================================
// Helpers for effect formatting (kept for backward compatibility)
// =============================================================================

#[allow(dead_code)]
fn format_place_short(place: &Place, env: &Environment) -> String {
    let ident = &env.identifiers[place.identifier.0 as usize];
    let name = match &ident.name {
        Some(name) => name.value().to_string(),
        None => String::new(),
    };
    let scope = match ident.scope {
        Some(scope_id) => format!(":{}", scope_id.0),
        None => String::new(),
    };
    format!("{}${}{}", name, place.identifier.0, scope)
}

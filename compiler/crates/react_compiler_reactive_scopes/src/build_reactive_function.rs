// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Converts the HIR CFG into a tree-structured ReactiveFunction.
//!
//! Corresponds to `src/ReactiveScopes/BuildReactiveFunction.ts`.

use rustc_hash::FxHashSet;

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory, SourceLocation,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{
    BasicBlock, BlockId, EvaluationOrder, GotoVariant, HirFunction, InstructionValue, Place,
    PrunedReactiveScopeBlock, ReactiveBlock, ReactiveFunction, ReactiveInstruction, ReactiveLabel,
    ReactiveScopeBlock, ReactiveStatement, ReactiveSwitchCase, ReactiveTerminal,
    ReactiveTerminalStatement, ReactiveTerminalTargetKind, ReactiveValue, Terminal,
};

/// Convert the HIR CFG into a tree-structured ReactiveFunction.
pub fn build_reactive_function(
    hir: &HirFunction,
    env: &Environment,
) -> Result<ReactiveFunction, CompilerDiagnostic> {
    let mut ctx = Context::new(hir);
    let mut driver = Driver {
        cx: &mut ctx,
        hir,
        env,
    };

    let entry_block_id = hir.body.entry;
    let mut body = Vec::new();
    driver.visit_block(entry_block_id, &mut body)?;

    Ok(ReactiveFunction {
        loc: hir.loc,
        id: hir.id.clone(),
        name_hint: hir.name_hint.clone(),
        params: hir.params.clone(),
        generator: hir.generator,
        is_async: hir.is_async,
        body,
        directives: hir.directives.clone(),
    })
}

// =============================================================================
// ControlFlowTarget
// =============================================================================

#[derive(Debug)]
enum ControlFlowTarget {
    If {
        block: BlockId,
        id: u32,
    },
    Switch {
        block: BlockId,
        id: u32,
    },
    Case {
        block: BlockId,
        id: u32,
    },
    Loop {
        block: BlockId,
        #[allow(dead_code)]
        owns_block: bool,
        continue_block: BlockId,
        loop_block: Option<BlockId>,
        owns_loop: bool,
        id: u32,
    },
}

impl ControlFlowTarget {
    fn block(&self) -> BlockId {
        match self {
            ControlFlowTarget::If { block, .. }
            | ControlFlowTarget::Switch { block, .. }
            | ControlFlowTarget::Case { block, .. }
            | ControlFlowTarget::Loop { block, .. } => *block,
        }
    }

    fn id(&self) -> u32 {
        match self {
            ControlFlowTarget::If { id, .. }
            | ControlFlowTarget::Switch { id, .. }
            | ControlFlowTarget::Case { id, .. }
            | ControlFlowTarget::Loop { id, .. } => *id,
        }
    }

    fn is_loop(&self) -> bool {
        matches!(self, ControlFlowTarget::Loop { .. })
    }
}

// =============================================================================
// Context
// =============================================================================

struct Context<'a> {
    ir: &'a HirFunction,
    next_schedule_id: u32,
    emitted: FxHashSet<BlockId>,
    scope_fallthroughs: FxHashSet<BlockId>,
    scheduled: FxHashSet<BlockId>,
    catch_handlers: FxHashSet<BlockId>,
    control_flow_stack: Vec<ControlFlowTarget>,
}

impl<'a> Context<'a> {
    fn new(ir: &'a HirFunction) -> Self {
        Self {
            ir,
            next_schedule_id: 0,
            emitted: FxHashSet::default(),
            scope_fallthroughs: FxHashSet::default(),
            scheduled: FxHashSet::default(),
            catch_handlers: FxHashSet::default(),
            control_flow_stack: Vec::new(),
        }
    }

    fn block(&self, id: BlockId) -> &BasicBlock {
        &self.ir.body.blocks[&id]
    }

    fn schedule_catch_handler(&mut self, block: BlockId) {
        self.catch_handlers.insert(block);
    }

    fn reachable(&self, id: BlockId) -> bool {
        let block = self.block(id);
        !matches!(block.terminal, Terminal::Unreachable { .. })
    }

    fn schedule(&mut self, block: BlockId, target_type: &str) -> Result<u32, CompilerDiagnostic> {
        let id = self.next_schedule_id;
        self.next_schedule_id += 1;
        if self.scheduled.contains(&block) {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                format!("Break block is already scheduled: bb{}", block.0),
                None,
            ));
        }
        self.scheduled.insert(block);
        let target = match target_type {
            "if" => ControlFlowTarget::If { block, id },
            "switch" => ControlFlowTarget::Switch { block, id },
            "case" => ControlFlowTarget::Case { block, id },
            _ => {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    format!("Unknown target type: {}", target_type),
                    None,
                ));
            }
        };
        self.control_flow_stack.push(target);
        Ok(id)
    }

    fn schedule_loop(
        &mut self,
        fallthrough_block: BlockId,
        continue_block: BlockId,
        loop_block: Option<BlockId>,
    ) -> Result<u32, CompilerDiagnostic> {
        let id = self.next_schedule_id;
        self.next_schedule_id += 1;
        let owns_block = !self.scheduled.contains(&fallthrough_block);
        self.scheduled.insert(fallthrough_block);
        if self.scheduled.contains(&continue_block) {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                format!(
                    "Continue block is already scheduled: bb{}",
                    continue_block.0
                ),
                None,
            ));
        }
        self.scheduled.insert(continue_block);
        let mut owns_loop = false;
        if let Some(lb) = loop_block {
            owns_loop = !self.scheduled.contains(&lb);
            self.scheduled.insert(lb);
        }

        self.control_flow_stack.push(ControlFlowTarget::Loop {
            block: fallthrough_block,
            owns_block,
            continue_block,
            loop_block,
            owns_loop,
            id,
        });
        Ok(id)
    }

    fn unschedule(&mut self, schedule_id: u32) -> Result<(), CompilerDiagnostic> {
        let last = self
            .control_flow_stack
            .pop()
            .expect("Can only unschedule the last target");
        if last.id() != schedule_id {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Can only unschedule the last target".to_string(),
                None,
            ));
        }
        match &last {
            ControlFlowTarget::Loop {
                block,
                continue_block,
                loop_block,
                owns_loop,
                ..
            } => {
                // TS: always removes block from scheduled for loops
                // (ownsBlock is boolean, so `!== null` is always true)
                self.scheduled.remove(block);
                self.scheduled.remove(continue_block);
                if *owns_loop {
                    if let Some(lb) = loop_block {
                        self.scheduled.remove(lb);
                    }
                }
            }
            _ => {
                self.scheduled.remove(&last.block());
            }
        }
        Ok(())
    }

    fn unschedule_all(&mut self, schedule_ids: &[u32]) -> Result<(), CompilerDiagnostic> {
        for &id in schedule_ids.iter().rev() {
            self.unschedule(id)?;
        }
        Ok(())
    }

    fn is_scheduled(&self, block: BlockId) -> bool {
        self.scheduled.contains(&block) || self.catch_handlers.contains(&block)
    }

    fn get_break_target(
        &self,
        block: BlockId,
    ) -> Result<(BlockId, ReactiveTerminalTargetKind), CompilerDiagnostic> {
        let mut has_preceding_loop = false;
        for i in (0..self.control_flow_stack.len()).rev() {
            let target = &self.control_flow_stack[i];
            if target.block() == block {
                let kind = if target.is_loop() {
                    if has_preceding_loop {
                        ReactiveTerminalTargetKind::Labeled
                    } else {
                        ReactiveTerminalTargetKind::Unlabeled
                    }
                } else if i == self.control_flow_stack.len() - 1 {
                    ReactiveTerminalTargetKind::Implicit
                } else {
                    ReactiveTerminalTargetKind::Labeled
                };
                return Ok((target.block(), kind));
            }
            has_preceding_loop = has_preceding_loop || target.is_loop();
        }
        Err(CompilerDiagnostic::new(
            ErrorCategory::Invariant,
            format!("Expected a break target for bb{}", block.0),
            None,
        ))
    }

    fn get_continue_target(&self, block: BlockId) -> Option<(BlockId, ReactiveTerminalTargetKind)> {
        let mut has_preceding_loop = false;
        for i in (0..self.control_flow_stack.len()).rev() {
            let target = &self.control_flow_stack[i];
            if let ControlFlowTarget::Loop {
                block: fallthrough_block,
                continue_block,
                ..
            } = target
            {
                if *continue_block == block {
                    let kind = if has_preceding_loop {
                        ReactiveTerminalTargetKind::Labeled
                    } else if i == self.control_flow_stack.len() - 1 {
                        ReactiveTerminalTargetKind::Implicit
                    } else {
                        ReactiveTerminalTargetKind::Unlabeled
                    };
                    return Some((*fallthrough_block, kind));
                }
            }
            has_preceding_loop = has_preceding_loop || target.is_loop();
        }
        None
    }
}

// =============================================================================
// Driver
// =============================================================================

struct Driver<'a, 'b> {
    cx: &'b mut Context<'a>,
    hir: &'a HirFunction,
    #[allow(dead_code)]
    env: &'a Environment,
}

impl<'a, 'b> Driver<'a, 'b> {
    fn traverse_block(&mut self, block_id: BlockId) -> Result<ReactiveBlock, CompilerDiagnostic> {
        let mut block_value = Vec::new();
        self.visit_block(block_id, &mut block_value)?;
        Ok(block_value)
    }

    fn visit_block(
        &mut self,
        mut block_id: BlockId,
        block_value: &mut ReactiveBlock,
    ) -> Result<(), CompilerDiagnostic> {
        // Use a loop to avoid deep recursion for fallthrough chains.
        // Each terminal that would tail-call visit_block(fallthrough, block_value)
        // instead sets next_block and continues the loop.
        loop {
            // Extract data from block before any mutable operations
            let block = &self.hir.body.blocks[&block_id];
            let block_id_val = block.id;
            let instructions: Vec<_> = block.instructions.clone();
            let terminal = block.terminal.clone();

            if !self.cx.emitted.insert(block_id_val) {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    format!("Block bb{} was already emitted", block_id_val.0),
                    None,
                ));
            }

            // Emit instructions
            for instr_id in &instructions {
                let instr = &self.hir.instructions[instr_id.0 as usize];
                block_value.push(ReactiveStatement::Instruction(ReactiveInstruction {
                    id: instr.id,
                    lvalue: Some(instr.lvalue.clone()),
                    value: ReactiveValue::Instruction(instr.value.clone()),
                    effects: instr.effects.clone(),
                    loc: instr.loc,
                }));
            }

            // Process terminal
            let mut schedule_ids: Vec<u32> = Vec::new();
            let mut next_block: Option<BlockId> = None;

            match &terminal {
                Terminal::If {
                    test,
                    consequent,
                    alternate,
                    fallthrough,
                    id,
                    loc,
                } => {
                    // TS: reachable(fallthrough) && !isScheduled(fallthrough)
                    let fallthrough_id =
                        if self.cx.reachable(*fallthrough) && !self.cx.is_scheduled(*fallthrough) {
                            Some(*fallthrough)
                        } else {
                            None
                        };
                    // TS: alternate !== fallthrough ? alternate : null
                    let alternate_id = if *alternate != *fallthrough {
                        Some(*alternate)
                    } else {
                        None
                    };

                    if let Some(ft) = fallthrough_id {
                        schedule_ids.push(self.cx.schedule(ft, "if")?);
                    }

                    let consequent_block = if self.cx.is_scheduled(*consequent) {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            format!(
                                "Unexpected 'if' where consequent is already scheduled (bb{})",
                                consequent.0
                            ),
                            None,
                        ));
                    } else {
                        self.traverse_block(*consequent)?
                    };

                    let alternate_block = if let Some(alt) = alternate_id {
                        if self.cx.is_scheduled(alt) {
                            return Err(CompilerDiagnostic::new(
                                ErrorCategory::Invariant,
                                format!(
                                    "Unexpected 'if' where the alternate is already scheduled (bb{})",
                                    alt.0
                                ),
                                None,
                            ));
                        } else {
                            Some(self.traverse_block(alt)?)
                        }
                    } else {
                        None
                    };

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::If {
                            test: test.clone(),
                            consequent: consequent_block,
                            alternate: alternate_block,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::Switch {
                    test,
                    cases,
                    fallthrough,
                    id,
                    loc,
                } => {
                    // TS: reachable(fallthrough) && !isScheduled(fallthrough)
                    let fallthrough_id =
                        if self.cx.reachable(*fallthrough) && !self.cx.is_scheduled(*fallthrough) {
                            Some(*fallthrough)
                        } else {
                            None
                        };
                    if let Some(ft) = fallthrough_id {
                        schedule_ids.push(self.cx.schedule(ft, "switch")?);
                    }

                    // TS processes cases in reverse order, then reverses the result.
                    // This ensures that later cases are scheduled when earlier cases
                    // are traversed, matching fallthrough semantics.
                    let mut reactive_cases = Vec::new();
                    for case in cases.iter().rev() {
                        let case_block_id = case.block;

                        if self.cx.is_scheduled(case_block_id) {
                            // TS: asserts case.block === fallthrough, then skips (return)
                            if case_block_id != *fallthrough {
                                return Err(CompilerDiagnostic::new(
                                ErrorCategory::Invariant,
                                "Unexpected 'switch' where a case is already scheduled and block is not the fallthrough".to_string(),
                                None,
                            ));
                            }
                            continue;
                        }

                        let consequent = self.traverse_block(case_block_id)?;
                        let case_schedule_id = self.cx.schedule(case_block_id, "case")?;
                        schedule_ids.push(case_schedule_id);

                        reactive_cases.push(ReactiveSwitchCase {
                            test: case.test.clone(),
                            block: Some(consequent),
                        });
                    }
                    reactive_cases.reverse();

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::Switch {
                            test: test.clone(),
                            cases: reactive_cases,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::DoWhile {
                    loop_block,
                    test,
                    fallthrough,
                    id,
                    loc,
                } => {
                    let fallthrough_id = if !self.cx.is_scheduled(*fallthrough) {
                        Some(*fallthrough)
                    } else {
                        None
                    };
                    let loop_id =
                        if !self.cx.is_scheduled(*loop_block) && *loop_block != *fallthrough {
                            Some(*loop_block)
                        } else {
                            None
                        };

                    schedule_ids.push(self.cx.schedule_loop(
                        *fallthrough,
                        *test,
                        Some(*loop_block),
                    )?);

                    let loop_body = if let Some(lid) = loop_id {
                        self.traverse_block(lid)?
                    } else {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'do-while' where the loop is already scheduled",
                            None,
                        ));
                    };
                    let test_result = self.visit_value_block(*test, *loc, None)?;

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::DoWhile {
                            loop_block: loop_body,
                            test: test_result.value,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::While {
                    test,
                    loop_block,
                    fallthrough,
                    id,
                    loc,
                } => {
                    // TS: reachable(fallthrough) && !isScheduled(fallthrough)
                    let fallthrough_id =
                        if self.cx.reachable(*fallthrough) && !self.cx.is_scheduled(*fallthrough) {
                            Some(*fallthrough)
                        } else {
                            None
                        };
                    let loop_id =
                        if !self.cx.is_scheduled(*loop_block) && *loop_block != *fallthrough {
                            Some(*loop_block)
                        } else {
                            None
                        };

                    schedule_ids.push(self.cx.schedule_loop(
                        *fallthrough,
                        *test,
                        Some(*loop_block),
                    )?);

                    let test_result = self.visit_value_block(*test, *loc, None)?;

                    let loop_body = if let Some(lid) = loop_id {
                        self.traverse_block(lid)?
                    } else {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'while' where the loop is already scheduled",
                            None,
                        ));
                    };

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::While {
                            test: test_result.value,
                            loop_block: loop_body,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
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
                    let loop_id =
                        if !self.cx.is_scheduled(*loop_block) && *loop_block != *fallthrough {
                            Some(*loop_block)
                        } else {
                            None
                        };

                    let fallthrough_id = if !self.cx.is_scheduled(*fallthrough) {
                        Some(*fallthrough)
                    } else {
                        None
                    };

                    // Continue block is update (if present) or test
                    let continue_block = update.unwrap_or(*test);
                    schedule_ids.push(self.cx.schedule_loop(
                        *fallthrough,
                        continue_block,
                        Some(*loop_block),
                    )?);

                    let init_result = self.visit_value_block(*init, *loc, None)?;
                    let init_value = self.value_block_result_to_sequence(init_result, *loc);

                    let test_result = self.visit_value_block(*test, *loc, None)?;

                    let update_result = match update {
                        Some(u) => Some(self.visit_value_block(*u, *loc, None)?),
                        None => None,
                    };

                    let loop_body = if let Some(lid) = loop_id {
                        self.traverse_block(lid)?
                    } else {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'for' where the loop is already scheduled",
                            None,
                        ));
                    };

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::For {
                            init: init_value,
                            test: test_result.value,
                            update: update_result.map(|r| r.value),
                            loop_block: loop_body,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::ForOf {
                    init,
                    test,
                    loop_block,
                    fallthrough,
                    id,
                    loc,
                } => {
                    let loop_id =
                        if !self.cx.is_scheduled(*loop_block) && *loop_block != *fallthrough {
                            Some(*loop_block)
                        } else {
                            None
                        };

                    let fallthrough_id = if !self.cx.is_scheduled(*fallthrough) {
                        Some(*fallthrough)
                    } else {
                        None
                    };

                    // TS: scheduleLoop(fallthrough, init, loop)
                    schedule_ids.push(self.cx.schedule_loop(
                        *fallthrough,
                        *init,
                        Some(*loop_block),
                    )?);

                    let init_result = self.visit_value_block(*init, *loc, None)?;
                    let init_value = self.value_block_result_to_sequence(init_result, *loc);

                    let test_result = self.visit_value_block(*test, *loc, None)?;
                    let test_value = self.value_block_result_to_sequence(test_result, *loc);

                    let loop_body = if let Some(lid) = loop_id {
                        self.traverse_block(lid)?
                    } else {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'for-of' where the loop is already scheduled",
                            None,
                        ));
                    };

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::ForOf {
                            init: init_value,
                            test: test_value,
                            loop_block: loop_body,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::ForIn {
                    init,
                    loop_block,
                    fallthrough,
                    id,
                    loc,
                } => {
                    let loop_id =
                        if !self.cx.is_scheduled(*loop_block) && *loop_block != *fallthrough {
                            Some(*loop_block)
                        } else {
                            None
                        };

                    let fallthrough_id = if !self.cx.is_scheduled(*fallthrough) {
                        Some(*fallthrough)
                    } else {
                        None
                    };

                    schedule_ids.push(self.cx.schedule_loop(
                        *fallthrough,
                        *init,
                        Some(*loop_block),
                    )?);

                    let init_result = self.visit_value_block(*init, *loc, None)?;
                    let init_value = self.value_block_result_to_sequence(init_result, *loc);

                    let loop_body = if let Some(lid) = loop_id {
                        self.traverse_block(lid)?
                    } else {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'for-in' where the loop is already scheduled",
                            None,
                        ));
                    };

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::ForIn {
                            init: init_value,
                            loop_block: loop_body,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::Label {
                    block: label_block,
                    fallthrough,
                    id,
                    loc,
                } => {
                    // TS: reachable(fallthrough) && !isScheduled(fallthrough)
                    let fallthrough_id =
                        if self.cx.reachable(*fallthrough) && !self.cx.is_scheduled(*fallthrough) {
                            Some(*fallthrough)
                        } else {
                            None
                        };
                    if let Some(ft) = fallthrough_id {
                        schedule_ids.push(self.cx.schedule(ft, "if")?);
                    }

                    if self.cx.is_scheduled(*label_block) {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'label' where the block is already scheduled".to_string(),
                            None,
                        ));
                    }
                    let label_body = self.traverse_block(*label_block)?;

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::Label {
                            block: label_body,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::Sequence { .. }
                | Terminal::Optional { .. }
                | Terminal::Ternary { .. }
                | Terminal::Logical { .. } => {
                    let fallthrough = match &terminal {
                        Terminal::Sequence { fallthrough, .. }
                        | Terminal::Optional { fallthrough, .. }
                        | Terminal::Ternary { fallthrough, .. }
                        | Terminal::Logical { fallthrough, .. } => *fallthrough,
                        _ => unreachable!(),
                    };
                    let fallthrough_id = if !self.cx.is_scheduled(fallthrough) {
                        Some(fallthrough)
                    } else {
                        None
                    };
                    if let Some(ft) = fallthrough_id {
                        schedule_ids.push(self.cx.schedule(ft, "if")?);
                    }

                    let result = self.visit_value_block_terminal(&terminal)?;
                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Instruction(ReactiveInstruction {
                        id: result.id,
                        lvalue: Some(result.place),
                        value: result.value,
                        effects: None,
                        loc: *terminal_loc(&terminal),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::Goto {
                    block: goto_block,
                    variant,
                    id,
                    loc,
                } => {
                    match variant {
                        GotoVariant::Break => {
                            if let Some(stmt) = self.visit_break(*goto_block, *id, *loc)? {
                                block_value.push(stmt);
                            }
                        }
                        GotoVariant::Continue => {
                            let stmt = self.visit_continue(*goto_block, *id, *loc)?;
                            block_value.push(stmt);
                        }
                        GotoVariant::Try => {
                            // noop
                        }
                    }
                }

                Terminal::MaybeThrow { continuation, .. } => {
                    if !self.cx.is_scheduled(*continuation) {
                        next_block = Some(*continuation);
                    }
                }

                Terminal::Try {
                    block: try_block,
                    handler_binding,
                    handler,
                    fallthrough,
                    id,
                    loc,
                } => {
                    let fallthrough_id =
                        if self.cx.reachable(*fallthrough) && !self.cx.is_scheduled(*fallthrough) {
                            Some(*fallthrough)
                        } else {
                            None
                        };
                    if let Some(ft) = fallthrough_id {
                        schedule_ids.push(self.cx.schedule(ft, "if")?);
                    }
                    self.cx.schedule_catch_handler(*handler);

                    let try_body = self.traverse_block(*try_block)?;
                    let handler_body = self.traverse_block(*handler)?;

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::Try {
                            block: try_body,
                            handler_binding: handler_binding.clone(),
                            handler: handler_body,
                            id: *id,
                            loc: *loc,
                        },
                        label: fallthrough_id.map(|ft| ReactiveLabel {
                            id: ft,
                            implicit: false,
                        }),
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::Scope {
                    fallthrough,
                    block: scope_block,
                    scope,
                    ..
                } => {
                    let fallthrough_id = if !self.cx.is_scheduled(*fallthrough) {
                        Some(*fallthrough)
                    } else {
                        None
                    };
                    if let Some(ft) = fallthrough_id {
                        schedule_ids.push(self.cx.schedule(ft, "if")?);
                        self.cx.scope_fallthroughs.insert(ft);
                    }

                    if self.cx.is_scheduled(*scope_block) {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'scope' where the block is already scheduled".to_string(),
                            None,
                        ));
                    }
                    let scope_body = self.traverse_block(*scope_block)?;

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::Scope(ReactiveScopeBlock {
                        scope: *scope,
                        instructions: scope_body,
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::PrunedScope {
                    fallthrough,
                    block: scope_block,
                    scope,
                    ..
                } => {
                    let fallthrough_id = if !self.cx.is_scheduled(*fallthrough) {
                        Some(*fallthrough)
                    } else {
                        None
                    };
                    if let Some(ft) = fallthrough_id {
                        schedule_ids.push(self.cx.schedule(ft, "if")?);
                        self.cx.scope_fallthroughs.insert(ft);
                    }

                    if self.cx.is_scheduled(*scope_block) {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'scope' where the block is already scheduled".to_string(),
                            None,
                        ));
                    }
                    let scope_body = self.traverse_block(*scope_block)?;

                    self.cx.unschedule_all(&schedule_ids)?;
                    block_value.push(ReactiveStatement::PrunedScope(PrunedReactiveScopeBlock {
                        scope: *scope,
                        instructions: scope_body,
                    }));

                    next_block = fallthrough_id;
                }

                Terminal::Return { value, id, loc, .. } => {
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::Return {
                            value: value.clone(),
                            id: *id,
                            loc: *loc,
                        },
                        label: None,
                    }));
                }

                Terminal::Throw { value, id, loc } => {
                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::Throw {
                            value: value.clone(),
                            id: *id,
                            loc: *loc,
                        },
                        label: None,
                    }));
                }

                Terminal::Unreachable { .. } => {
                    // noop
                }

                Terminal::Unsupported { .. } => {
                    return Err(CompilerDiagnostic::new(
                        ErrorCategory::Invariant,
                        "Unexpected unsupported terminal",
                        None,
                    ));
                }

                Terminal::Branch {
                    test,
                    consequent,
                    alternate,
                    id,
                    loc,
                    ..
                } => {
                    let consequent_block = if self.cx.is_scheduled(*consequent) {
                        if let Some(stmt) = self.visit_break(*consequent, *id, *loc)? {
                            vec![stmt]
                        } else {
                            Vec::new()
                        }
                    } else {
                        self.traverse_block(*consequent)?
                    };

                    if self.cx.is_scheduled(*alternate) {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Unexpected 'branch' where the alternate is already scheduled"
                                .to_string(),
                            None,
                        ));
                    }
                    let alternate_block = self.traverse_block(*alternate)?;

                    block_value.push(ReactiveStatement::Terminal(ReactiveTerminalStatement {
                        terminal: ReactiveTerminal::If {
                            test: test.clone(),
                            consequent: consequent_block,
                            alternate: Some(alternate_block),
                            id: *id,
                            loc: *loc,
                        },
                        label: None,
                    }));
                }
            }
            match next_block {
                Some(nb) => block_id = nb,
                None => return Ok(()),
            }
        } // end loop
    }

    // =========================================================================
    // Value block processing
    // =========================================================================

    fn visit_value_block(
        &mut self,
        block_id: BlockId,
        loc: Option<SourceLocation>,
        fallthrough: Option<BlockId>,
    ) -> Result<ValueBlockResult, CompilerDiagnostic> {
        let block = &self.hir.body.blocks[&block_id];
        let block_id_val = block.id;
        let terminal = block.terminal.clone();
        let instructions: Vec<_> = block.instructions.clone();

        // If we've reached the fallthrough, stop
        if let Some(ft) = fallthrough {
            if block_id == ft {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    format!(
                        "Did not expect to reach the fallthrough of a value block (bb{})",
                        block_id.0
                    ),
                    None,
                ));
            }
        }

        match &terminal {
            Terminal::Branch {
                test, id: term_id, ..
            } => {
                if instructions.is_empty() {
                    Ok(ValueBlockResult {
                        block: block_id_val,
                        place: test.clone(),
                        value: ReactiveValue::Instruction(InstructionValue::LoadLocal {
                            place: test.clone(),
                            loc: test.loc,
                        }),
                        id: *term_id,
                    })
                } else {
                    Ok(self.extract_value_block_result(&instructions, block_id_val, loc))
                }
            }
            Terminal::Goto { .. } => {
                if instructions.is_empty() {
                    return Err(CompilerDiagnostic::new(
                        ErrorCategory::Invariant,
                        "Unexpected empty block with `goto` terminal",
                        Some(format!("Block bb{} is empty", block_id.0)),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc,
                        message: Some("Unexpected empty block with `goto` terminal".to_string()),
                        identifier_name: None,
                    }));
                }
                Ok(self.extract_value_block_result(&instructions, block_id_val, loc))
            }
            Terminal::MaybeThrow { continuation, .. } => {
                let continuation_id = *continuation;
                let continuation_block = self.cx.block(continuation_id);
                let cont_instructions_empty = continuation_block.instructions.is_empty();
                let cont_is_goto = matches!(continuation_block.terminal, Terminal::Goto { .. });
                let cont_block_id = continuation_block.id;

                if cont_instructions_empty && cont_is_goto {
                    Ok(self.extract_value_block_result(&instructions, cont_block_id, loc))
                } else {
                    let continuation = self.visit_value_block(continuation_id, loc, fallthrough)?;
                    Ok(self.wrap_with_sequence(&instructions, continuation, loc))
                }
            }
            _ => {
                // Value block ended in a value terminal, recurse to get the value
                // of that terminal and stitch them together in a sequence.
                // TS: visitValueBlock(init.fallthrough, loc) — does NOT propagate fallthrough
                let init = self.visit_value_block_terminal(&terminal)?;
                let init_fallthrough = init.fallthrough;
                let init_instr = ReactiveInstruction {
                    id: init.id,
                    lvalue: Some(init.place),
                    value: init.value,
                    effects: None,
                    loc,
                };
                let final_result = self.visit_value_block(init_fallthrough, loc, None)?;

                // Combine block instructions + init instruction, then wrap
                let mut all_instrs: Vec<ReactiveInstruction> = instructions
                    .iter()
                    .map(|iid| {
                        let instr = &self.hir.instructions[iid.0 as usize];
                        ReactiveInstruction {
                            id: instr.id,
                            lvalue: Some(instr.lvalue.clone()),
                            value: ReactiveValue::Instruction(instr.value.clone()),
                            effects: instr.effects.clone(),
                            loc: instr.loc,
                        }
                    })
                    .collect();
                all_instrs.push(init_instr);

                if all_instrs.is_empty() {
                    Ok(final_result)
                } else {
                    Ok(ValueBlockResult {
                        block: final_result.block,
                        place: final_result.place.clone(),
                        value: ReactiveValue::SequenceExpression {
                            instructions: all_instrs,
                            id: final_result.id,
                            value: Box::new(final_result.value),
                            loc,
                        },
                        id: final_result.id,
                    })
                }
            }
        }
    }

    fn visit_test_block(
        &mut self,
        test_block_id: BlockId,
        loc: Option<SourceLocation>,
        terminal_kind: &str,
    ) -> Result<TestBlockResult, CompilerDiagnostic> {
        let test = self.visit_value_block(test_block_id, loc, None)?;
        let test_block = &self.hir.body.blocks[&test.block];
        match &test_block.terminal {
            Terminal::Branch {
                consequent,
                alternate,
                loc: branch_loc,
                ..
            } => Ok(TestBlockResult {
                test,
                consequent: *consequent,
                alternate: *alternate,
                branch_loc: *branch_loc,
            }),
            other => Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                format!(
                    "Expected a branch terminal for {} test block, got {:?}",
                    terminal_kind,
                    std::mem::discriminant(other)
                ),
                None,
            )),
        }
    }

    fn visit_value_block_terminal(
        &mut self,
        terminal: &Terminal,
    ) -> Result<ValueTerminalResult, CompilerDiagnostic> {
        match terminal {
            Terminal::Sequence {
                block,
                fallthrough,
                id,
                loc,
            } => {
                let block_result = self.visit_value_block(*block, *loc, Some(*fallthrough))?;
                Ok(ValueTerminalResult {
                    value: block_result.value,
                    place: block_result.place,
                    fallthrough: *fallthrough,
                    id: *id,
                })
            }
            Terminal::Optional {
                optional,
                test,
                fallthrough,
                id,
                loc,
            } => {
                let test_result = self.visit_test_block(*test, *loc, "optional")?;
                let consequent =
                    self.visit_value_block(test_result.consequent, *loc, Some(*fallthrough))?;
                let call = ReactiveValue::SequenceExpression {
                    instructions: vec![ReactiveInstruction {
                        id: test_result.test.id,
                        lvalue: Some(test_result.test.place.clone()),
                        value: test_result.test.value,
                        effects: None,
                        loc: test_result.branch_loc,
                    }],
                    id: consequent.id,
                    value: Box::new(consequent.value),
                    loc: *loc,
                };
                Ok(ValueTerminalResult {
                    place: consequent.place,
                    value: ReactiveValue::OptionalExpression {
                        optional: *optional,
                        value: Box::new(call),
                        id: *id,
                        loc: *loc,
                    },
                    fallthrough: *fallthrough,
                    id: *id,
                })
            }
            Terminal::Logical {
                operator,
                test,
                fallthrough,
                id,
                loc,
            } => {
                let test_result = self.visit_test_block(*test, *loc, "logical")?;
                let left_final =
                    self.visit_value_block(test_result.consequent, *loc, Some(*fallthrough))?;
                let left = ReactiveValue::SequenceExpression {
                    instructions: vec![ReactiveInstruction {
                        id: test_result.test.id,
                        lvalue: Some(test_result.test.place.clone()),
                        value: test_result.test.value,
                        effects: None,
                        loc: *loc,
                    }],
                    id: left_final.id,
                    value: Box::new(left_final.value),
                    loc: *loc,
                };
                let right =
                    self.visit_value_block(test_result.alternate, *loc, Some(*fallthrough))?;
                Ok(ValueTerminalResult {
                    place: left_final.place,
                    value: ReactiveValue::LogicalExpression {
                        operator: *operator,
                        left: Box::new(left),
                        right: Box::new(right.value),
                        loc: *loc,
                    },
                    fallthrough: *fallthrough,
                    id: *id,
                })
            }
            Terminal::Ternary {
                test,
                fallthrough,
                id,
                loc,
            } => {
                let test_result = self.visit_test_block(*test, *loc, "ternary")?;
                let consequent =
                    self.visit_value_block(test_result.consequent, *loc, Some(*fallthrough))?;
                let alternate =
                    self.visit_value_block(test_result.alternate, *loc, Some(*fallthrough))?;
                Ok(ValueTerminalResult {
                    place: consequent.place,
                    value: ReactiveValue::ConditionalExpression {
                        test: Box::new(test_result.test.value),
                        consequent: Box::new(consequent.value),
                        alternate: Box::new(alternate.value),
                        loc: *loc,
                    },
                    fallthrough: *fallthrough,
                    id: *id,
                })
            }
            Terminal::MaybeThrow { .. } => Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Unexpected maybe-throw in visit_value_block_terminal",
                None,
            )),
            Terminal::Label { .. } => Err(CompilerDiagnostic::new(
                ErrorCategory::Todo,
                "Support labeled statements combined with value blocks is not yet implemented",
                None,
            )),
            _ => Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Unsupported terminal kind in value block",
                None,
            )),
        }
    }

    fn extract_value_block_result(
        &self,
        instructions: &[react_compiler_hir::InstructionId],
        block_id: BlockId,
        loc: Option<SourceLocation>,
    ) -> ValueBlockResult {
        let last_id = instructions
            .last()
            .expect("Expected non-empty instructions");
        let last_instr = &self.hir.instructions[last_id.0 as usize];

        let remaining: Vec<ReactiveInstruction> = instructions[..instructions.len() - 1]
            .iter()
            .map(|iid| {
                let instr = &self.hir.instructions[iid.0 as usize];
                ReactiveInstruction {
                    id: instr.id,
                    lvalue: Some(instr.lvalue.clone()),
                    value: ReactiveValue::Instruction(instr.value.clone()),
                    effects: instr.effects.clone(),
                    loc: instr.loc,
                }
            })
            .collect();

        // If the last instruction is a StoreLocal to a temporary (unnamed identifier),
        // convert it to a LoadLocal of the value being stored, matching the TS behavior.
        let (value, place) = match &last_instr.value {
            InstructionValue::StoreLocal {
                lvalue,
                value: store_value,
                ..
            } => {
                let ident = &self.env.identifiers[lvalue.place.identifier.0 as usize];
                if ident.name.is_none() {
                    (
                        ReactiveValue::Instruction(InstructionValue::LoadLocal {
                            place: store_value.clone(),
                            loc: store_value.loc,
                        }),
                        lvalue.place.clone(),
                    )
                } else {
                    (
                        ReactiveValue::Instruction(last_instr.value.clone()),
                        last_instr.lvalue.clone(),
                    )
                }
            }
            _ => (
                ReactiveValue::Instruction(last_instr.value.clone()),
                last_instr.lvalue.clone(),
            ),
        };
        let id = last_instr.id;

        if remaining.is_empty() {
            ValueBlockResult {
                block: block_id,
                place,
                value,
                id,
            }
        } else {
            ValueBlockResult {
                block: block_id,
                place: place.clone(),
                value: ReactiveValue::SequenceExpression {
                    instructions: remaining,
                    id,
                    value: Box::new(value),
                    loc,
                },
                id,
            }
        }
    }

    fn wrap_with_sequence(
        &self,
        instructions: &[react_compiler_hir::InstructionId],
        continuation: ValueBlockResult,
        loc: Option<SourceLocation>,
    ) -> ValueBlockResult {
        if instructions.is_empty() {
            return continuation;
        }

        let reactive_instrs: Vec<ReactiveInstruction> = instructions
            .iter()
            .map(|iid| {
                let instr = &self.hir.instructions[iid.0 as usize];
                ReactiveInstruction {
                    id: instr.id,
                    lvalue: Some(instr.lvalue.clone()),
                    value: ReactiveValue::Instruction(instr.value.clone()),
                    effects: instr.effects.clone(),
                    loc: instr.loc,
                }
            })
            .collect();

        ValueBlockResult {
            block: continuation.block,
            place: continuation.place.clone(),
            value: ReactiveValue::SequenceExpression {
                instructions: reactive_instrs,
                id: continuation.id,
                value: Box::new(continuation.value),
                loc,
            },
            id: continuation.id,
        }
    }

    /// Converts the result of visit_value_block into a SequenceExpression that includes
    /// the instruction with its lvalue. This is needed for for/for-of/for-in init/test
    /// blocks where the instruction's lvalue assignment must be preserved.
    ///
    /// This also flattens nested SequenceExpressions that can occur from MaybeThrow
    /// handling in try-catch blocks.
    ///
    /// TS: valueBlockResultToSequence()
    fn value_block_result_to_sequence(
        &self,
        result: ValueBlockResult,
        loc: Option<SourceLocation>,
    ) -> ReactiveValue {
        // Collect all instructions from potentially nested SequenceExpressions
        let mut instructions: Vec<ReactiveInstruction> = Vec::new();
        let mut inner_value = result.value;

        // Flatten nested SequenceExpressions
        loop {
            match inner_value {
                ReactiveValue::SequenceExpression {
                    instructions: seq_instrs,
                    value,
                    ..
                } => {
                    instructions.extend(seq_instrs);
                    inner_value = *value;
                }
                _ => break,
            }
        }

        // Only add the final instruction if the innermost value is not just a LoadLocal
        // of the same place we're storing to (which would be a no-op).
        let is_load_of_same_place = match &inner_value {
            ReactiveValue::Instruction(InstructionValue::LoadLocal { place, .. }) => {
                place.identifier == result.place.identifier
            }
            _ => false,
        };

        if !is_load_of_same_place {
            instructions.push(ReactiveInstruction {
                id: result.id,
                lvalue: Some(result.place),
                value: inner_value,
                effects: None,
                loc,
            });
        }

        ReactiveValue::SequenceExpression {
            instructions,
            id: result.id,
            value: Box::new(ReactiveValue::Instruction(InstructionValue::Primitive {
                value: react_compiler_hir::PrimitiveValue::Undefined,
                loc,
            })),
            loc,
        }
    }

    fn visit_break(
        &self,
        block: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    ) -> Result<Option<ReactiveStatement>, CompilerDiagnostic> {
        let (target_block, target_kind) = self.cx.get_break_target(block)?;
        if self.cx.scope_fallthroughs.contains(&target_block) {
            if target_kind != ReactiveTerminalTargetKind::Implicit {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Expected reactive scope to implicitly break to fallthrough".to_string(),
                    None,
                ));
            }
            return Ok(None);
        }
        Ok(Some(ReactiveStatement::Terminal(
            ReactiveTerminalStatement {
                terminal: ReactiveTerminal::Break {
                    target: target_block,
                    id,
                    target_kind,
                    loc,
                },
                label: None,
            },
        )))
    }

    fn visit_continue(
        &self,
        block: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    ) -> Result<ReactiveStatement, CompilerDiagnostic> {
        let (target_block, target_kind) = match self.cx.get_continue_target(block) {
            Some(result) => result,
            None => {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    format!("Expected continue target to be scheduled for bb{}", block.0),
                    None,
                ));
            }
        };

        Ok(ReactiveStatement::Terminal(ReactiveTerminalStatement {
            terminal: ReactiveTerminal::Continue {
                target: target_block,
                id,
                target_kind,
                loc,
            },
            label: None,
        }))
    }
}

// =============================================================================
// Helper types
// =============================================================================

struct ValueBlockResult {
    block: BlockId,
    place: Place,
    value: ReactiveValue,
    id: EvaluationOrder,
}

struct TestBlockResult {
    test: ValueBlockResult,
    consequent: BlockId,
    alternate: BlockId,
    branch_loc: Option<SourceLocation>,
}

struct ValueTerminalResult {
    value: ReactiveValue,
    place: Place,
    fallthrough: BlockId,
    id: EvaluationOrder,
}

/// Helper to get loc from a terminal
fn terminal_loc(terminal: &Terminal) -> &Option<SourceLocation> {
    match terminal {
        Terminal::If { loc, .. }
        | Terminal::Branch { loc, .. }
        | Terminal::Logical { loc, .. }
        | Terminal::Ternary { loc, .. }
        | Terminal::Optional { loc, .. }
        | Terminal::Throw { loc, .. }
        | Terminal::Return { loc, .. }
        | Terminal::Goto { loc, .. }
        | Terminal::Switch { loc, .. }
        | Terminal::DoWhile { loc, .. }
        | Terminal::While { loc, .. }
        | Terminal::For { loc, .. }
        | Terminal::ForOf { loc, .. }
        | Terminal::ForIn { loc, .. }
        | Terminal::Label { loc, .. }
        | Terminal::Sequence { loc, .. }
        | Terminal::Unreachable { loc, .. }
        | Terminal::Unsupported { loc, .. }
        | Terminal::MaybeThrow { loc, .. }
        | Terminal::Scope { loc, .. }
        | Terminal::PrunedScope { loc, .. }
        | Terminal::Try { loc, .. } => loc,
    }
}

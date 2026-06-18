use indexmap::IndexMap;
use indexmap::IndexSet;
use react_compiler_ast::scope::BindingId;
use react_compiler_ast::scope::ImportBindingKind;
use react_compiler_ast::scope::ScopeId;
use react_compiler_ast::scope::ScopeInfo;
use react_compiler_diagnostics::CompilerDiagnostic;
use react_compiler_diagnostics::CompilerDiagnosticDetail;
use react_compiler_diagnostics::CompilerError;
use react_compiler_diagnostics::CompilerErrorDetail;
use react_compiler_diagnostics::ErrorCategory;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::each_terminal_successor;
use react_compiler_hir::visitors::terminal_fallthrough;
use react_compiler_hir::*;

use crate::identifier_loc_index::IdentifierLocIndex;

// ---------------------------------------------------------------------------
// Reserved word check (matches TS isReservedWord)
// ---------------------------------------------------------------------------

pub(crate) fn is_always_reserved_word(s: &str) -> bool {
    matches!(
        s,
        "break"
            | "case"
            | "catch"
            | "continue"
            | "debugger"
            | "default"
            | "do"
            | "else"
            | "finally"
            | "for"
            | "function"
            | "if"
            | "in"
            | "instanceof"
            | "new"
            | "return"
            | "switch"
            | "this"
            | "throw"
            | "try"
            | "typeof"
            | "var"
            | "void"
            | "while"
            | "with"
            | "class"
            | "const"
            | "enum"
            | "export"
            | "extends"
            | "import"
            | "super"
            | "null"
            | "true"
            | "false"
            | "delete"
    )
}

pub(crate) fn reserved_identifier_diagnostic(name: &str) -> CompilerDiagnostic {
    CompilerDiagnostic::new(
        ErrorCategory::Syntax,
        "Expected a non-reserved identifier name",
        Some(format!(
            "`{}` is a reserved word in JavaScript and cannot be used as an identifier name",
            name
        )),
    )
    .with_detail(CompilerDiagnosticDetail::Error {
        loc: None, // GeneratedSource in TS
        message: Some("reserved word".to_string()),
        identifier_name: None,
    })
}

// ---------------------------------------------------------------------------
// Scope types for tracking break/continue targets
// ---------------------------------------------------------------------------

enum Scope {
    Loop {
        label: Option<String>,
        continue_block: BlockId,
        break_block: BlockId,
    },
    Label {
        label: String,
        break_block: BlockId,
    },
    Switch {
        label: Option<String>,
        break_block: BlockId,
    },
}

impl Scope {
    fn label(&self) -> Option<&str> {
        match self {
            Scope::Loop { label, .. } => label.as_deref(),
            Scope::Label { label, .. } => Some(label.as_str()),
            Scope::Switch { label, .. } => label.as_deref(),
        }
    }

    fn break_block(&self) -> BlockId {
        match self {
            Scope::Loop { break_block, .. } => *break_block,
            Scope::Label { break_block, .. } => *break_block,
            Scope::Switch { break_block, .. } => *break_block,
        }
    }
}

// ---------------------------------------------------------------------------
// WipBlock: a block under construction that does not yet have a terminal
// ---------------------------------------------------------------------------

pub struct WipBlock {
    pub id: BlockId,
    pub instructions: Vec<InstructionId>,
    pub kind: BlockKind,
}

fn new_block(id: BlockId, kind: BlockKind) -> WipBlock {
    WipBlock {
        id,
        kind,
        instructions: Vec::new(),
    }
}

// ---------------------------------------------------------------------------
// HirBuilder: helper struct for constructing a CFG
// ---------------------------------------------------------------------------

pub struct HirBuilder<'a> {
    completed: IndexMap<BlockId, BasicBlock>,
    current: WipBlock,
    entry: BlockId,
    scopes: Vec<Scope>,
    /// Context identifiers: variables captured from an outer scope.
    /// Maps the outer scope's BindingId to the source location where it was referenced.
    context: IndexMap<BindingId, Option<SourceLocation>>,
    /// Resolved bindings: maps a BindingId to the HIR IdentifierId created for it.
    bindings: IndexMap<BindingId, IdentifierId>,
    /// Names already used by bindings, for collision avoidance.
    /// Maps name string -> how many times it has been used (for appending _0, _1, ...).
    used_names: IndexMap<String, BindingId>,
    env: &'a mut Environment,
    scope_info: &'a ScopeInfo,
    exception_handler_stack: Vec<BlockId>,
    /// Flat instruction table being built up.
    instruction_table: Vec<Instruction>,
    /// Traversal context: counts the number of `fbt` tag parents
    /// of the current babel node.
    pub fbt_depth: u32,
    /// The scope of the function being compiled (for context identifier checks).
    function_scope: ScopeId,
    /// The scope of the outermost component/hook function (for gather_captured_context).
    component_scope: ScopeId,
    /// Set of BindingIds for variables declared in scopes between component_scope
    /// and any inner function scope, that are referenced from an inner function scope.
    /// These need StoreContext/LoadContext instead of StoreLocal/LoadLocal.
    context_identifiers: std::collections::HashSet<BindingId>,
    /// Set of ScopeIds that have been matched to synthetic blocks/functions.
    /// Prevents the same scope from being reused for different synthetic nodes.
    claimed_synthetic_scopes: std::collections::HashSet<ScopeId>,
    /// Index mapping identifier byte offsets to source locations and JSX status.
    identifier_locs: &'a IdentifierLocIndex,
}

impl<'a> HirBuilder<'a> {
    // -----------------------------------------------------------------------
    // M2: Core methods
    // -----------------------------------------------------------------------

    /// Create a new HirBuilder.
    ///
    /// - `env`: the shared environment (counters, arenas, error accumulator)
    /// - `scope_info`: the scope information from the AST
    /// - `function_scope`: the ScopeId of the function being compiled
    /// - `bindings`: optional pre-existing bindings (e.g., from a parent function)
    /// - `context`: optional pre-existing captured context map
    /// - `entry_block_kind`: the kind of the entry block (defaults to `Block`)
    pub fn new(
        env: &'a mut Environment,
        scope_info: &'a ScopeInfo,
        function_scope: ScopeId,
        component_scope: ScopeId,
        context_identifiers: std::collections::HashSet<BindingId>,
        bindings: Option<IndexMap<BindingId, IdentifierId>>,
        context: Option<IndexMap<BindingId, Option<SourceLocation>>>,
        entry_block_kind: Option<BlockKind>,
        used_names: Option<IndexMap<String, BindingId>>,
        identifier_locs: &'a IdentifierLocIndex,
    ) -> Self {
        let entry = env.next_block_id();
        let kind = entry_block_kind.unwrap_or(BlockKind::Block);
        HirBuilder {
            completed: IndexMap::new(),
            current: new_block(entry, kind),
            entry,
            scopes: Vec::new(),
            context: context.unwrap_or_default(),
            bindings: bindings.unwrap_or_default(),
            used_names: used_names.unwrap_or_default(),
            env,
            scope_info,
            exception_handler_stack: Vec::new(),
            instruction_table: Vec::new(),
            fbt_depth: 0,
            function_scope,
            component_scope,
            context_identifiers,
            claimed_synthetic_scopes: std::collections::HashSet::new(),
            identifier_locs,
        }
    }

    /// Check if a scope is the component scope or a descendant of it.
    /// Used to determine whether a binding is local to the compiled function
    /// or belongs to an ancestor function scope (e.g., a factory function
    /// wrapping a nested component declaration).
    /// Uses component_scope (the outermost compiled function's scope) rather
    /// than function_scope because inner function expressions within the
    /// compiled function have their own function_scope but still consider
    /// the outer component's variables as local.
    fn is_scope_within_compiled_function(&self, scope_id: ScopeId) -> bool {
        let mut current = Some(scope_id);
        while let Some(id) = current {
            if id == self.component_scope {
                return true;
            }
            current = self.scope_info.scopes[id.0 as usize].parent;
        }
        false
    }

    /// Access the environment.
    pub fn environment(&self) -> &Environment {
        self.env
    }

    /// Access the environment mutably.
    pub fn environment_mut(&mut self) -> &mut Environment {
        self.env
    }

    /// Create a new unique TypeVar type, allocated from the environment's type arena
    /// so that TypeIds are consistent with identifier type slots.
    pub fn make_type(&mut self) -> Type {
        let type_id = self.env.make_type();
        Type::TypeVar { id: type_id }
    }

    /// Access the scope info.
    pub fn scope_info(&self) -> &ScopeInfo {
        self.scope_info
    }

    /// Look up the source location of an identifier by its node_id.
    pub fn get_identifier_loc(&self, node_id: u32) -> Option<SourceLocation> {
        self.identifier_locs
            .get(&node_id)
            .map(|entry| entry.loc.clone())
    }

    /// Check whether a reference at the given byte offset corresponds to a
    /// JSXIdentifier. Scans the node_id-keyed index for an entry whose stored
    /// `start` matches the offset.
    pub fn is_jsx_identifier_at_pos(&self, offset: u32) -> bool {
        self.identifier_locs
            .values()
            .any(|entry| entry.start == offset && entry.is_jsx)
    }

    /// Access the function scope (the scope of the function being compiled).
    pub fn function_scope(&self) -> ScopeId {
        self.function_scope
    }

    /// Access the component scope.
    pub fn component_scope(&self) -> ScopeId {
        self.component_scope
    }

    /// Access the context map.
    pub fn context(&self) -> &IndexMap<BindingId, Option<SourceLocation>> {
        &self.context
    }

    /// Access the pre-computed context identifiers set.
    pub fn context_identifiers(&self) -> &std::collections::HashSet<BindingId> {
        &self.context_identifiers
    }

    /// Add a binding to the context identifiers set (used by hoisting).
    pub fn add_context_identifier(&mut self, binding_id: BindingId) {
        self.context_identifiers.insert(binding_id);
    }

    pub fn claim_synthetic_scope(&mut self, scope_id: ScopeId) {
        self.claimed_synthetic_scopes.insert(scope_id);
    }

    pub fn is_synthetic_scope_claimed(&self, scope_id: ScopeId) -> bool {
        self.claimed_synthetic_scopes.contains(&scope_id)
    }

    /// Access scope_info and environment mutably at the same time.
    /// This is safe because they are disjoint fields, but Rust's borrow checker
    /// can't prove this through method calls alone.
    pub fn scope_info_and_env_mut(&mut self) -> (&ScopeInfo, &mut Environment) {
        (self.scope_info, self.env)
    }

    /// Access the identifier location index.
    /// Returns the 'a reference to avoid conflicts with mutable borrows on self.
    pub fn identifier_locs(&self) -> &'a IdentifierLocIndex {
        self.identifier_locs
    }

    /// Access the bindings map.
    pub fn bindings(&self) -> &IndexMap<BindingId, IdentifierId> {
        &self.bindings
    }

    /// Access the used names map.
    pub fn used_names(&self) -> &IndexMap<String, BindingId> {
        &self.used_names
    }

    /// Merge used names from a child builder back into this builder.
    /// This ensures name deduplication works across function scopes.
    pub fn merge_used_names(&mut self, child_used_names: IndexMap<String, BindingId>) {
        for (name, binding_id) in child_used_names {
            self.used_names.entry(name).or_insert(binding_id);
        }
    }

    /// Merge bindings (binding_id -> IdentifierId) from a child builder back into this builder.
    /// This matches TS behavior where parent and child share the same #bindings map by reference,
    /// so bindings resolved by the child are automatically visible to the parent.
    pub fn merge_bindings(&mut self, child_bindings: IndexMap<BindingId, IdentifierId>) {
        for (binding_id, identifier_id) in child_bindings {
            self.bindings.entry(binding_id).or_insert(identifier_id);
        }
    }

    /// Push an instruction onto the current block.
    ///
    /// Adds the instruction to the flat instruction table and records
    /// its InstructionId in the current block's instruction list.
    ///
    /// If an exception handler is active, also emits a MaybeThrow terminal
    /// after the instruction to model potential control flow to the handler,
    /// then continues in a new block.
    pub fn push(&mut self, instruction: Instruction) {
        let loc = instruction.loc.clone();
        let instr_id = InstructionId(self.instruction_table.len() as u32);
        self.instruction_table.push(instruction);
        self.current.instructions.push(instr_id);

        if let Some(&handler) = self.exception_handler_stack.last() {
            let continuation = self.reserve(self.current_block_kind());
            self.terminate_with_continuation(
                Terminal::MaybeThrow {
                    continuation: continuation.id,
                    handler: Some(handler),
                    id: EvaluationOrder(0),
                    loc,
                    effects: None,
                },
                continuation,
            );
        }
    }

    /// Terminate the current block with the given terminal and start a new block.
    ///
    /// If `next_block_kind` is `Some`, a new current block is created with that kind.
    /// Returns the BlockId of the completed block.
    pub fn terminate(&mut self, terminal: Terminal, next_block_kind: Option<BlockKind>) -> BlockId {
        // The placeholder block created here (BlockId(u32::MAX)) is only used when
        // next_block_kind is None, meaning this is the final terminate() call.
        // It will never be read or completed because build() consumes self
        // immediately after, and no further operations should occur on the builder.
        let wip = std::mem::replace(
            &mut self.current,
            new_block(BlockId(u32::MAX), BlockKind::Block),
        );
        let block_id = wip.id;

        self.completed.insert(
            block_id,
            BasicBlock {
                kind: wip.kind,
                id: block_id,
                instructions: wip.instructions,
                terminal,
                preds: IndexSet::new(),
                phis: Vec::new(),
            },
        );

        if let Some(kind) = next_block_kind {
            let next_id = self.env.next_block_id();
            self.current = new_block(next_id, kind);
        }
        block_id
    }

    /// Terminate the current block with the given terminal, and set
    /// a previously reserved block as the new current block.
    pub fn terminate_with_continuation(&mut self, terminal: Terminal, continuation: WipBlock) {
        let wip = std::mem::replace(&mut self.current, continuation);
        let block_id = wip.id;
        self.completed.insert(
            block_id,
            BasicBlock {
                kind: wip.kind,
                id: block_id,
                instructions: wip.instructions,
                terminal,
                preds: IndexSet::new(),
                phis: Vec::new(),
            },
        );
    }

    /// Reserve a new block so it can be referenced before construction.
    /// Use `terminate_with_continuation()` to make it current, or `complete()` to
    /// save it directly.
    pub fn reserve(&mut self, kind: BlockKind) -> WipBlock {
        let id = self.env.next_block_id();
        new_block(id, kind)
    }

    /// Save a previously reserved block as completed with the given terminal.
    pub fn complete(&mut self, block: WipBlock, terminal: Terminal) {
        let block_id = block.id;
        self.completed.insert(
            block_id,
            BasicBlock {
                kind: block.kind,
                id: block_id,
                instructions: block.instructions,
                terminal,
                preds: IndexSet::new(),
                phis: Vec::new(),
            },
        );
    }

    /// Sets the given wip block as current, executes the closure to populate
    /// it and obtain its terminal, then completes the block and restores the
    /// previous current block.
    pub fn enter_reserved(&mut self, wip: WipBlock, f: impl FnOnce(&mut Self) -> Terminal) {
        let prev = std::mem::replace(&mut self.current, wip);
        let terminal = f(self);
        let completed_wip = std::mem::replace(&mut self.current, prev);
        self.completed.insert(
            completed_wip.id,
            BasicBlock {
                kind: completed_wip.kind,
                id: completed_wip.id,
                instructions: completed_wip.instructions,
                terminal,
                preds: IndexSet::new(),
                phis: Vec::new(),
            },
        );
    }

    /// Like `enter_reserved`, but the closure returns a `Result<Terminal, CompilerDiagnostic>`.
    pub fn try_enter_reserved(
        &mut self,
        wip: WipBlock,
        f: impl FnOnce(&mut Self) -> Result<Terminal, CompilerDiagnostic>,
    ) -> Result<(), CompilerDiagnostic> {
        let prev = std::mem::replace(&mut self.current, wip);
        let terminal = f(self)?;
        let completed_wip = std::mem::replace(&mut self.current, prev);
        self.completed.insert(
            completed_wip.id,
            BasicBlock {
                kind: completed_wip.kind,
                id: completed_wip.id,
                instructions: completed_wip.instructions,
                terminal,
                preds: IndexSet::new(),
                phis: Vec::new(),
            },
        );
        Ok(())
    }

    /// Create a new block, set it as current, run the closure to populate it
    /// and obtain its terminal, complete the block, and restore the previous
    /// current block. Returns the new block's BlockId.
    pub fn enter(
        &mut self,
        kind: BlockKind,
        f: impl FnOnce(&mut Self, BlockId) -> Terminal,
    ) -> BlockId {
        let wip = self.reserve(kind);
        let wip_id = wip.id;
        self.enter_reserved(wip, |this| f(this, wip_id));
        wip_id
    }

    /// Like `enter`, but the closure returns a `Result<Terminal, CompilerDiagnostic>`.
    pub fn try_enter(
        &mut self,
        kind: BlockKind,
        f: impl FnOnce(&mut Self, BlockId) -> Result<Terminal, CompilerDiagnostic>,
    ) -> Result<BlockId, CompilerDiagnostic> {
        let wip = self.reserve(kind);
        let wip_id = wip.id;
        self.try_enter_reserved(wip, |this| f(this, wip_id))?;
        Ok(wip_id)
    }

    /// Push an exception handler, run the closure, then pop the handler.
    pub fn enter_try_catch(&mut self, handler: BlockId, f: impl FnOnce(&mut Self)) {
        self.exception_handler_stack.push(handler);
        f(self);
        self.exception_handler_stack.pop();
    }

    /// Like `enter_try_catch`, but the closure returns a `Result`.
    pub fn try_enter_try_catch(
        &mut self,
        handler: BlockId,
        f: impl FnOnce(&mut Self) -> Result<(), CompilerDiagnostic>,
    ) -> Result<(), CompilerDiagnostic> {
        self.exception_handler_stack.push(handler);
        let result = f(self);
        self.exception_handler_stack.pop();
        result
    }

    /// Return the top of the exception handler stack, or None.
    pub fn resolve_throw_handler(&self) -> Option<BlockId> {
        self.exception_handler_stack.last().copied()
    }

    /// Push a Loop scope, run the closure, pop and verify.
    pub fn loop_scope<T>(
        &mut self,
        label: Option<String>,
        continue_block: BlockId,
        break_block: BlockId,
        f: impl FnOnce(&mut Self) -> Result<T, CompilerDiagnostic>,
    ) -> Result<T, CompilerDiagnostic> {
        self.scopes.push(Scope::Loop {
            label: label.clone(),
            continue_block,
            break_block,
        });
        let value = f(self)?;
        let last = self
            .scopes
            .pop()
            .expect("Mismatched loop scope: stack empty");
        match &last {
            Scope::Loop {
                label: l,
                continue_block: c,
                break_block: b,
            } => {
                assert!(
                    *l == label && *c == continue_block && *b == break_block,
                    "Mismatched loop scope"
                );
            }
            _ => {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Mismatched loop scope: expected Loop, got other",
                    None,
                ));
            }
        }
        Ok(value)
    }

    /// Push a Label scope, run the closure, pop and verify.
    pub fn label_scope<T>(
        &mut self,
        label: String,
        break_block: BlockId,
        f: impl FnOnce(&mut Self) -> Result<T, CompilerDiagnostic>,
    ) -> Result<T, CompilerDiagnostic> {
        self.scopes.push(Scope::Label {
            label: label.clone(),
            break_block,
        });
        let value = f(self)?;
        let last = self
            .scopes
            .pop()
            .expect("Mismatched label scope: stack empty");
        match &last {
            Scope::Label {
                label: l,
                break_block: b,
            } => {
                assert!(*l == label && *b == break_block, "Mismatched label scope");
            }
            _ => {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Mismatched label scope: expected Label, got other",
                    None,
                ));
            }
        }
        Ok(value)
    }

    /// Push a Switch scope, run the closure, pop and verify.
    pub fn switch_scope<T>(
        &mut self,
        label: Option<String>,
        break_block: BlockId,
        f: impl FnOnce(&mut Self) -> Result<T, CompilerDiagnostic>,
    ) -> Result<T, CompilerDiagnostic> {
        self.scopes.push(Scope::Switch {
            label: label.clone(),
            break_block,
        });
        let value = f(self)?;
        let last = self
            .scopes
            .pop()
            .expect("Mismatched switch scope: stack empty");
        match &last {
            Scope::Switch {
                label: l,
                break_block: b,
            } => {
                assert!(*l == label && *b == break_block, "Mismatched switch scope");
            }
            _ => {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Mismatched switch scope: expected Switch, got other",
                    None,
                ));
            }
        }
        Ok(value)
    }

    /// Look up the break target for the given label (or the innermost
    /// loop/switch if label is None).
    pub fn lookup_break(&self, label: Option<&str>) -> Result<BlockId, CompilerDiagnostic> {
        for scope in self.scopes.iter().rev() {
            match scope {
                Scope::Loop { .. } | Scope::Switch { .. } if label.is_none() => {
                    return Ok(scope.break_block());
                }
                _ if label.is_some() && scope.label() == label => {
                    return Ok(scope.break_block());
                }
                _ => continue,
            }
        }
        Err(CompilerDiagnostic::new(
            ErrorCategory::Invariant,
            "Expected a loop or switch to be in scope for break",
            None,
        ))
    }

    /// Look up the continue target for the given label (or the innermost
    /// loop if label is None). Only loops support continue.
    pub fn lookup_continue(&self, label: Option<&str>) -> Result<BlockId, CompilerDiagnostic> {
        for scope in self.scopes.iter().rev() {
            match scope {
                Scope::Loop {
                    label: scope_label,
                    continue_block,
                    ..
                } => {
                    if label.is_none() || label == scope_label.as_deref() {
                        return Ok(*continue_block);
                    }
                }
                _ => {
                    if label.is_some() && scope.label() == label {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "Continue may only refer to a labeled loop",
                            None,
                        ));
                    }
                }
            }
        }
        Err(CompilerDiagnostic::new(
            ErrorCategory::Invariant,
            "Expected a loop to be in scope for continue",
            None,
        ))
    }

    /// Create a temporary identifier with a fresh id, returning its IdentifierId.
    pub fn make_temporary(&mut self, loc: Option<SourceLocation>) -> IdentifierId {
        let id = self.env.next_identifier_id();
        // Update the loc on the allocated identifier
        self.env.identifiers[id.0 as usize].loc = loc;
        id
    }

    /// Set the source location for an identifier.
    pub fn set_identifier_loc(&mut self, id: IdentifierId, loc: Option<SourceLocation>) {
        self.env.identifiers[id.0 as usize].loc = loc;
    }

    /// Record an error on the environment.
    /// Returns `Err` for Invariant errors (matching TS throw behavior).
    pub fn record_error(&mut self, error: CompilerErrorDetail) -> Result<(), CompilerError> {
        self.env.record_error(error)
    }

    /// Record a diagnostic on the environment.
    pub fn record_diagnostic(&mut self, diagnostic: CompilerDiagnostic) {
        self.env.record_diagnostic(diagnostic);
    }

    /// Check if a name has a local binding (non-module-level).
    /// This is used for checking if fbt/fbs JSX tags are local bindings
    /// (which is not supported).
    pub fn has_local_binding(&self, name: &str) -> bool {
        if let Some(binding) = self
            .scope_info
            .find_binding_in_descendants(name, self.component_scope)
        {
            return binding.scope != self.scope_info.program_scope;
        }
        false
    }

    /// Return the kind of the current block.
    pub fn current_block_kind(&self) -> BlockKind {
        self.current.kind
    }

    /// Construct the final HIR and instruction table from the completed blocks.
    ///
    /// Performs these post-build passes:
    /// 1. Reverse-postorder sort + unreachable block removal
    /// 2. Check for unreachable blocks containing FunctionExpression instructions
    /// 3. Remove unreachable for-loop updates
    /// 4. Remove dead do-while statements
    /// 5. Remove unnecessary try-catch
    /// 6. Number all instructions and terminals
    /// 7. Mark predecessor blocks
    pub fn build(
        mut self,
    ) -> Result<
        (
            HIR,
            Vec<Instruction>,
            IndexMap<String, BindingId>,
            IndexMap<BindingId, IdentifierId>,
        ),
        CompilerError,
    > {
        let mut hir = HIR {
            blocks: std::mem::take(&mut self.completed),
            entry: self.entry,
        };

        let mut instructions = std::mem::take(&mut self.instruction_table);

        let rpo_blocks = get_reverse_postordered_blocks(&hir, &instructions);

        // Check for unreachable blocks that contain FunctionExpression instructions.
        // These could contain hoisted declarations that we can't safely remove.
        for (id, block) in &hir.blocks {
            if !rpo_blocks.contains_key(id) {
                let has_function_expr = block.instructions.iter().any(|&instr_id| {
                    matches!(
                        instructions[instr_id.0 as usize].value,
                        InstructionValue::FunctionExpression { .. }
                    )
                });
                if has_function_expr {
                    let loc = block
                        .instructions
                        .first()
                        .and_then(|&i| instructions[i.0 as usize].loc.clone())
                        .or_else(|| block.terminal.loc().copied());
                    self.env.record_error(CompilerErrorDetail {
                        category: ErrorCategory::Todo,
                        reason: "Support functions with unreachable code that may contain hoisted declarations".to_string(),
                        description: None,
                        loc,
                        suggestions: None,
                    })?;
                }
            }
        }

        hir.blocks = rpo_blocks;

        remove_unreachable_for_updates(&mut hir);
        remove_dead_do_while_statements(&mut hir);
        remove_unnecessary_try_catch(&mut hir);
        mark_instruction_ids(&mut hir, &mut instructions);
        mark_predecessors(&mut hir);

        let used_names = self.used_names;
        let bindings = self.bindings;
        Ok((hir, instructions, used_names, bindings))
    }

    // -----------------------------------------------------------------------
    // M3: Binding resolution methods
    // -----------------------------------------------------------------------

    /// Map a BindingId to an HIR IdentifierId.
    ///
    /// On first encounter, creates a new Identifier with the given name and a fresh id.
    /// On subsequent encounters, returns the cached IdentifierId.
    /// Handles name collisions by appending `_0`, `_1`, etc.
    ///
    /// Records errors for variables named 'fbt' or 'this'.
    pub fn resolve_binding(
        &mut self,
        name: &str,
        binding_id: BindingId,
    ) -> Result<IdentifierId, CompilerError> {
        self.resolve_binding_with_loc(name, binding_id, None)
    }

    /// Map a BindingId to an HIR IdentifierId, with an optional source location.
    pub fn resolve_binding_with_loc(
        &mut self,
        name: &str,
        binding_id: BindingId,
        loc: Option<SourceLocation>,
    ) -> Result<IdentifierId, CompilerError> {
        // Check for unsupported names BEFORE the cache check.
        // In TS, resolveBinding records fbt errors when node.name === 'fbt'. After a name collision
        // causes a rename (e.g., "fbt" -> "fbt_0"), TS's scope.rename changes the AST node's name,
        // preventing subsequent fbt error recording. We simulate this by checking whether the
        // resolved name for this binding is still "fbt" (not renamed to "fbt_0" etc.).
        if name == "fbt" {
            // Check if this binding was previously resolved to a renamed version
            let should_record_fbt_error =
                if let Some(&identifier_id) = self.bindings.get(&binding_id) {
                    // Already resolved - check if the resolved name is still "fbt"
                    match &self.env.identifiers[identifier_id.0 as usize].name {
                        Some(IdentifierName::Named(resolved_name)) => resolved_name == "fbt",
                        _ => false,
                    }
                } else {
                    // First resolution - always record
                    true
                };
            if should_record_fbt_error {
                let error_loc = self.scope_info.bindings[binding_id.0 as usize]
                    .declaration_node_id
                    .and_then(|nid| self.get_identifier_loc(nid))
                    .or_else(|| loc.clone());
                self.env.record_error(CompilerErrorDetail {
                    category: ErrorCategory::Todo,
                    reason: "Support local variables named `fbt`".to_string(),
                    description: Some(
                        "Local variables named `fbt` may conflict with the fbt plugin and are not yet supported".to_string(),
                    ),
                    loc: error_loc,
                    suggestions: None,
                })?;
            }
        }

        // If we've already resolved this binding, return the cached IdentifierId
        if let Some(&identifier_id) = self.bindings.get(&binding_id) {
            return Ok(identifier_id);
        }

        if is_always_reserved_word(name) {
            // Match TS behavior: makeIdentifierName throws for reserved words.
            return Err(CompilerError::from(reserved_identifier_diagnostic(name)));
        }

        // Find a unique name: start with the original name, then try name_0, name_1, ...
        let mut candidate = name.to_string();
        let mut index = 0u32;
        loop {
            if let Some(&existing_binding_id) = self.used_names.get(&candidate) {
                if existing_binding_id == binding_id {
                    // Same binding, use this name
                    break;
                }
                // Name collision with a different binding, try the next suffix
                candidate = format!("{}_{}", name, index);
                index += 1;
            } else {
                // Name is available
                break;
            }
        }

        // Record rename if the candidate differs from the original name
        if candidate != name {
            let binding = &self.scope_info.bindings[binding_id.0 as usize];
            if let Some(decl_start) = binding.declaration_start {
                self.env
                    .renames
                    .push(react_compiler_hir::environment::BindingRename {
                        original: name.to_string(),
                        renamed: candidate.clone(),
                        declaration_start: decl_start,
                    });
            }
        }

        // Allocate identifier in the arena
        let id = self.env.next_identifier_id();
        // Update the name and loc on the allocated identifier
        self.env.identifiers[id.0 as usize].name = Some(IdentifierName::Named(candidate.clone()));
        // Prefer the binding's declaration loc over the reference loc.
        // This matches TS behavior where Babel's resolveBinding returns the
        // binding identifier's original loc (the declaration site).
        let binding = &self.scope_info.bindings[binding_id.0 as usize];
        let decl_loc = binding
            .declaration_node_id
            .and_then(|nid| self.get_identifier_loc(nid));
        if let Some(ref dl) = decl_loc {
            self.env.identifiers[id.0 as usize].loc = Some(dl.clone());
        } else if let Some(ref loc) = loc {
            self.env.identifiers[id.0 as usize].loc = Some(loc.clone());
        }

        self.used_names.insert(candidate, binding_id);
        self.bindings.insert(binding_id, id);
        Ok(id)
    }

    /// Set the loc on an identifier to the declaration-site loc.
    /// This overrides any previously-set loc (which may have come from a reference site).
    pub fn set_identifier_declaration_loc(
        &mut self,
        id: IdentifierId,
        loc: &Option<SourceLocation>,
    ) {
        if let Some(loc_val) = loc {
            self.env.identifiers[id.0 as usize].loc = Some(loc_val.clone());
        }
    }

    /// Resolve an identifier reference to a VariableBinding.
    ///
    /// Uses ScopeInfo to determine whether the reference is:
    /// - Global (no binding found)
    /// - ImportDefault, ImportSpecifier, ImportNamespace (program-scope import binding)
    /// - ModuleLocal (program-scope non-import binding)
    /// - Identifier (local binding, resolved via resolve_binding)
    pub fn resolve_identifier(
        &mut self,
        name: &str,
        _start_offset: u32,
        loc: Option<SourceLocation>,
        node_id: Option<u32>,
    ) -> Result<VariableBinding, CompilerError> {
        let binding_data = self.scope_info.resolve_reference_for_node(node_id);

        match binding_data {
            None => {
                // No binding found: this is a global
                Ok(VariableBinding::Global {
                    name: name.to_string(),
                })
            }
            Some(binding) => {
                // Treat type-only declarations as globals so the compiler
                // doesn't try to create/initialize HIR bindings for them.
                // TSEnumDeclaration is included because enums inside function
                // bodies are lowered as UnsupportedNode and their binding
                // is never initialized in HIR.
                if matches!(
                    binding.declaration_type.as_str(),
                    "TSTypeAliasDeclaration"
                        | "TSInterfaceDeclaration"
                        | "TSEnumDeclaration"
                        | "TSModuleDeclaration"
                ) {
                    return Ok(VariableBinding::Global {
                        name: name.to_string(),
                    });
                }
                if binding.scope == self.scope_info.program_scope {
                    // Module-level binding: check import info
                    Ok(match &binding.import {
                        Some(import_info) => match import_info.kind {
                            ImportBindingKind::Default => VariableBinding::ImportDefault {
                                name: name.to_string(),
                                module: import_info.source.clone(),
                            },
                            ImportBindingKind::Named => VariableBinding::ImportSpecifier {
                                name: name.to_string(),
                                module: import_info.source.clone(),
                                imported: import_info
                                    .imported
                                    .clone()
                                    .unwrap_or_else(|| name.to_string()),
                            },
                            ImportBindingKind::Namespace => VariableBinding::ImportNamespace {
                                name: name.to_string(),
                                module: import_info.source.clone(),
                            },
                        },
                        None => VariableBinding::ModuleLocal {
                            name: name.to_string(),
                        },
                    })
                } else if !self.is_scope_within_compiled_function(binding.scope) {
                    // The binding lives between module scope and the compiled
                    // function (e.g. a local of an enclosing factory function).
                    // It lowers like a module-level binding, but record it so
                    // outline_functions doesn't hoist references to it out of
                    // the enclosing function's scope.
                    self.env.non_module_scope_names.insert(name.to_string());
                    Ok(VariableBinding::ModuleLocal {
                        name: name.to_string(),
                    })
                } else {
                    let binding_id = binding.id;
                    let binding_kind = crate::convert_binding_kind(&binding.kind);
                    let identifier_id = self.resolve_binding_with_loc(name, binding_id, loc)?;
                    Ok(VariableBinding::Identifier {
                        identifier: identifier_id,
                        binding_kind,
                    })
                }
            }
        }
    }

    /// Check if an identifier reference resolves to a context identifier.
    ///
    /// A context identifier is a variable declared in an ancestor scope of the
    /// current function's scope, but NOT in the program scope itself and NOT
    /// in the function's own scope. These are "captured" variables from an
    /// enclosing function.
    pub fn is_context_identifier(
        &self,
        _name: &str,
        _start_offset: u32,
        node_id: Option<u32>,
    ) -> bool {
        let binding = self.scope_info.resolve_reference_for_node(node_id);

        match binding {
            None => false,
            Some(binding_data) => {
                if binding_data.scope == self.scope_info.program_scope {
                    return false;
                }
                self.context_identifiers.contains(&binding_data.id)
            }
        }
    }

    /// Like `is_context_identifier`, for callers that already resolved a
    /// BindingId instead of going through a reference node.
    pub fn is_context_binding(&self, binding_id: BindingId) -> bool {
        let binding = &self.scope_info.bindings[binding_id.0 as usize];
        if binding.scope == self.scope_info.program_scope {
            return false;
        }
        self.context_identifiers.contains(&binding_id)
    }

    /// Resolve the binding for a function declaration's id the way TS does:
    /// Babel's `path.scope.getBinding(name)` starts at the function's OWN
    /// scope, so a body-level local (or parameter) that shadows the function's
    /// name resolves to that inner binding rather than to the function's
    /// hoisted binding in the parent scope.
    ///
    /// Babel's `scope.rename` re-keys a scope's bindings when the TS builder
    /// renames a shadowed binding (e.g. `init` -> `init_0`), so a binding only
    /// matches if its *current* name — the resolved HIR identifier name once
    /// resolved — still equals `name`. A binding renamed *to* `name` overwrites
    /// the original key in Babel and takes precedence over an unresolved
    /// binding with that original name.
    ///
    /// Returns None when the walk resolves outside the compiled function
    /// (degraded scope info); callers should fall back to node-based
    /// resolution in that case.
    pub fn get_function_declaration_binding(
        &self,
        function_scope: ScopeId,
        name: &str,
    ) -> Option<BindingId> {
        // None = unresolved binding; Some(matches) = resolved, current name comparison
        let resolved_name_matches = |bid: BindingId| -> Option<bool> {
            let &identifier_id = self.bindings.get(&bid)?;
            match &self.env.identifiers[identifier_id.0 as usize].name {
                Some(IdentifierName::Named(n)) => Some(n == name),
                _ => Some(false),
            }
        };
        let mut current = Some(function_scope);
        while let Some(id) = current {
            let scope = &self.scope_info.scopes[id.0 as usize];
            let mut found = scope
                .bindings
                .values()
                .copied()
                .find(|&bid| resolved_name_matches(bid) == Some(true));
            if found.is_none() {
                if let Some(&bid) = scope.bindings.get(name) {
                    // Skip bindings that were renamed away from `name`.
                    if resolved_name_matches(bid) != Some(false) {
                        found = Some(bid);
                    }
                }
            }
            if let Some(bid) = found {
                let binding_scope = self.scope_info.bindings[bid.0 as usize].scope;
                if !self.is_scope_within_compiled_function(binding_scope) {
                    return None;
                }
                return Some(bid);
            }
            current = scope.parent;
        }
        None
    }
}

// ---------------------------------------------------------------------------
// Post-build helper functions
// ---------------------------------------------------------------------------

/// Compute a reverse-postorder of blocks reachable from the entry.
///
/// Visits successors in reverse order so that when the postorder list is
/// reversed, sibling edges appear in program order.
///
/// Blocks not reachable through successors are removed. Blocks that are
/// only reachable as fallthroughs (not through real successor edges) are
/// replaced with empty blocks that have an Unreachable terminal.
pub fn get_reverse_postordered_blocks(
    hir: &HIR,
    _instructions: &[Instruction],
) -> IndexMap<BlockId, BasicBlock> {
    let mut visited: IndexSet<BlockId> = IndexSet::new();
    let mut used: IndexSet<BlockId> = IndexSet::new();
    let mut used_fallthroughs: IndexSet<BlockId> = IndexSet::new();
    let mut postorder: Vec<BlockId> = Vec::new();

    fn visit(
        hir: &HIR,
        block_id: BlockId,
        is_used: bool,
        visited: &mut IndexSet<BlockId>,
        used: &mut IndexSet<BlockId>,
        used_fallthroughs: &mut IndexSet<BlockId>,
        postorder: &mut Vec<BlockId>,
    ) {
        let was_used = used.contains(&block_id);
        let was_visited = visited.contains(&block_id);
        visited.insert(block_id);
        if is_used {
            used.insert(block_id);
        }
        if was_visited && (was_used || !is_used) {
            return;
        }

        let block = hir
            .blocks
            .get(&block_id)
            .unwrap_or_else(|| panic!("[HIRBuilder] expected block {:?} to exist", block_id));

        // Visit successors in reverse order so that when we reverse the
        // postorder list, sibling edges come out in program order.
        let mut successors = each_terminal_successor(&block.terminal);
        successors.reverse();

        let fallthrough = terminal_fallthrough(&block.terminal);

        // Visit fallthrough first (marking as not-yet-used) to ensure its
        // block ID is emitted in the correct position.
        if let Some(ft) = fallthrough {
            if is_used {
                used_fallthroughs.insert(ft);
            }
            visit(hir, ft, false, visited, used, used_fallthroughs, postorder);
        }
        for successor in successors {
            visit(
                hir,
                successor,
                is_used,
                visited,
                used,
                used_fallthroughs,
                postorder,
            );
        }

        if !was_visited {
            postorder.push(block_id);
        }
    }

    visit(
        hir,
        hir.entry,
        true,
        &mut visited,
        &mut used,
        &mut used_fallthroughs,
        &mut postorder,
    );

    let mut blocks = IndexMap::new();
    for block_id in postorder.into_iter().rev() {
        let block = hir.blocks.get(&block_id).unwrap();
        if used.contains(&block_id) {
            blocks.insert(block_id, block.clone());
        } else if used_fallthroughs.contains(&block_id) {
            blocks.insert(
                block_id,
                BasicBlock {
                    kind: block.kind,
                    id: block_id,
                    instructions: Vec::new(),
                    terminal: Terminal::Unreachable {
                        id: block.terminal.evaluation_order(),
                        loc: block.terminal.loc().copied(),
                    },
                    preds: block.preds.clone(),
                    phis: Vec::new(),
                },
            );
        }
        // otherwise this block is unreachable and is dropped
    }

    blocks
}

/// For each block with a `For` terminal whose update block is not in the
/// blocks map, set update to None.
pub fn remove_unreachable_for_updates(hir: &mut HIR) {
    let block_ids: IndexSet<BlockId> = hir.blocks.keys().copied().collect();
    for block in hir.blocks.values_mut() {
        if let Terminal::For { update, .. } = &mut block.terminal {
            if let Some(update_id) = *update {
                if !block_ids.contains(&update_id) {
                    *update = None;
                }
            }
        }
    }
}

/// For each block with a `DoWhile` terminal whose test block is not in
/// the blocks map, replace the terminal with a Goto to the loop block.
pub fn remove_dead_do_while_statements(hir: &mut HIR) {
    let block_ids: IndexSet<BlockId> = hir.blocks.keys().copied().collect();
    for block in hir.blocks.values_mut() {
        let should_replace = if let Terminal::DoWhile { test, .. } = &block.terminal {
            !block_ids.contains(test)
        } else {
            false
        };
        if should_replace {
            if let Terminal::DoWhile {
                loop_block,
                id,
                loc,
                ..
            } = std::mem::replace(
                &mut block.terminal,
                Terminal::Unreachable {
                    id: EvaluationOrder(0),
                    loc: None,
                },
            ) {
                block.terminal = Terminal::Goto {
                    block: loop_block,
                    variant: GotoVariant::Break,
                    id,
                    loc,
                };
            }
        }
    }
}

/// For each block with a `Try` terminal whose handler block is not in
/// the blocks map, replace the terminal with a Goto to the try block.
///
/// Also cleans up the fallthrough block's predecessors if the handler
/// was the only path to it.
pub fn remove_unnecessary_try_catch(hir: &mut HIR) {
    let block_ids: IndexSet<BlockId> = hir.blocks.keys().copied().collect();

    // Collect the blocks that need replacement and their associated data
    let replacements: Vec<(BlockId, BlockId, BlockId, BlockId, Option<SourceLocation>)> = hir
        .blocks
        .iter()
        .filter_map(|(&block_id, block)| {
            if let Terminal::Try {
                block: try_block,
                handler,
                fallthrough,
                loc,
                ..
            } = &block.terminal
            {
                if !block_ids.contains(handler) {
                    return Some((block_id, *try_block, *handler, *fallthrough, loc.clone()));
                }
            }
            None
        })
        .collect();

    for (block_id, try_block, handler_id, fallthrough_id, loc) in replacements {
        // Replace the terminal
        if let Some(block) = hir.blocks.get_mut(&block_id) {
            block.terminal = Terminal::Goto {
                block: try_block,
                id: EvaluationOrder(0),
                loc,
                variant: GotoVariant::Break,
            };
        }

        // Clean up fallthrough predecessor info
        if let Some(fallthrough) = hir.blocks.get_mut(&fallthrough_id) {
            if fallthrough.preds.len() == 1 && fallthrough.preds.contains(&handler_id) {
                // The handler was the only predecessor: remove the fallthrough block
                hir.blocks.shift_remove(&fallthrough_id);
            } else {
                fallthrough.preds.shift_remove(&handler_id);
            }
        }
    }
}

/// Sequentially number all instructions and terminals starting from 1.
pub fn mark_instruction_ids(hir: &mut HIR, instructions: &mut [Instruction]) {
    let mut order: u32 = 0;
    for block in hir.blocks.values_mut() {
        for &instr_id in &block.instructions {
            order += 1;
            instructions[instr_id.0 as usize].id = EvaluationOrder(order);
        }
        order += 1;
        block.terminal.set_evaluation_order(EvaluationOrder(order));
    }
}

/// DFS from entry, for each successor add the predecessor's id to
/// the successor's preds set.
///
/// Note: This only visits direct successors (via `each_terminal_successor`),
/// not fallthrough blocks. Fallthrough blocks are reached indirectly via
/// Goto terminals from within branching blocks, matching the TypeScript
/// `markPredecessors` behavior.
pub fn mark_predecessors(hir: &mut HIR) {
    // Clear all preds first
    for block in hir.blocks.values_mut() {
        block.preds.clear();
    }

    let mut visited: IndexSet<BlockId> = IndexSet::new();

    fn visit(
        hir: &mut HIR,
        block_id: BlockId,
        prev_block_id: Option<BlockId>,
        visited: &mut IndexSet<BlockId>,
    ) {
        // Add predecessor
        if let Some(prev_id) = prev_block_id {
            if let Some(block) = hir.blocks.get_mut(&block_id) {
                block.preds.insert(prev_id);
            } else {
                return;
            }
        }

        if visited.contains(&block_id) {
            return;
        }
        visited.insert(block_id);

        // Get successors before mutating
        let successors = if let Some(block) = hir.blocks.get(&block_id) {
            each_terminal_successor(&block.terminal)
        } else {
            return;
        };

        for successor in successors {
            visit(hir, successor, Some(block_id), visited);
        }
    }

    visit(hir, hir.entry, None, &mut visited);
}

// ---------------------------------------------------------------------------
// Public helper functions
// ---------------------------------------------------------------------------

/// Create a temporary Place with a fresh identifier allocated in the arena.
pub fn create_temporary_place(env: &mut Environment, loc: Option<SourceLocation>) -> Place {
    let id = env.next_identifier_id();
    // Update the loc on the allocated identifier
    env.identifiers[id.0 as usize].loc = loc;
    Place {
        identifier: id,
        reactive: false,
        effect: Effect::Unknown,
        loc: None,
    }
}

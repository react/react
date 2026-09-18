//! Rust equivalent of the TypeScript `FindContextIdentifiers` pass.
//!
//! Determines which bindings need StoreContext/LoadContext semantics by
//! walking the AST with scope tracking to find variables that cross
//! function boundaries.

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_ast::expressions::*;
use react_compiler_ast::patterns::*;
use react_compiler_ast::scope::*;
use react_compiler_ast::statements::FunctionDeclaration;
use react_compiler_ast::visitor::AstWalker;
use react_compiler_ast::visitor::Visitor;
use react_compiler_diagnostics::CompilerError;
use react_compiler_diagnostics::CompilerErrorDetail;
use react_compiler_diagnostics::ErrorCategory;
use react_compiler_diagnostics::Position;
use react_compiler_diagnostics::SourceLocation;
use react_compiler_hir::environment::Environment;

use crate::FunctionNode;

#[derive(Default)]
struct BindingInfo {
    reassigned: bool,
    reassigned_by_inner_fn: bool,
    referenced_by_inner_fn: bool,
}

struct ContextIdentifierVisitor<'a> {
    scope_info: &'a ScopeInfo,
    env: &'a mut Environment,
    /// Stack of inner function scopes encountered during traversal.
    /// Empty when at the top level of the function being compiled.
    function_stack: Vec<ScopeId>,
    binding_info: FxHashMap<BindingId, BindingInfo>,
    error: Option<CompilerError>,
}

impl<'a> ContextIdentifierVisitor<'a> {
    fn push_function_scope(&mut self, _start: Option<u32>, node_id: Option<u32>) {
        let scope = self.scope_info.resolve_scope_for_node(node_id);
        if let Some(scope) = scope {
            self.function_stack.push(scope);
        }
    }

    fn pop_function_scope(&mut self, _start: Option<u32>, node_id: Option<u32>) {
        let has_scope = self.scope_info.resolve_scope_for_node(node_id);
        if has_scope.is_some() {
            self.function_stack.pop();
        }
    }

    fn check_captured_reference(&mut self, _start: Option<u32>, node_id: Option<u32>) {
        let binding_id = match self.scope_info.resolve_reference_id_for_node(node_id) {
            Some(id) => id,
            None => return,
        };
        let &fn_scope = match self.function_stack.last() {
            Some(s) => s,
            None => return,
        };
        let binding = &self.scope_info.bindings[binding_id.0 as usize];
        if is_captured_by_function(self.scope_info, binding.scope, fn_scope) {
            let info = self.binding_info.entry(binding_id).or_default();
            info.referenced_by_inner_fn = true;
        }
    }

    fn handle_reassignment_identifier(&mut self, name: &str, current_scope: ScopeId) {
        if let Some(binding_id) = self.scope_info.get_binding(current_scope, name) {
            let info = self.binding_info.entry(binding_id).or_default();
            info.reassigned = true;
            if let Some(&fn_scope) = self.function_stack.last() {
                let binding = &self.scope_info.bindings[binding_id.0 as usize];
                if is_captured_by_function(self.scope_info, binding.scope, fn_scope) {
                    info.reassigned_by_inner_fn = true;
                }
            }
        }
    }
}

impl<'ast> Visitor<'ast> for ContextIdentifierVisitor<'_> {
    fn enter_function_declaration(&mut self, node: &'ast FunctionDeclaration, _: &[ScopeId]) {
        self.push_function_scope(node.base.start, node.base.node_id);
    }
    fn leave_function_declaration(&mut self, node: &'ast FunctionDeclaration, _: &[ScopeId]) {
        self.pop_function_scope(node.base.start, node.base.node_id);
    }
    fn enter_function_expression(&mut self, node: &'ast FunctionExpression, _: &[ScopeId]) {
        self.push_function_scope(node.base.start, node.base.node_id);
    }
    fn leave_function_expression(&mut self, node: &'ast FunctionExpression, _: &[ScopeId]) {
        self.pop_function_scope(node.base.start, node.base.node_id);
    }
    fn enter_arrow_function_expression(
        &mut self,
        node: &'ast ArrowFunctionExpression,
        _: &[ScopeId],
    ) {
        self.push_function_scope(node.base.start, node.base.node_id);
    }
    fn leave_arrow_function_expression(
        &mut self,
        node: &'ast ArrowFunctionExpression,
        _: &[ScopeId],
    ) {
        self.pop_function_scope(node.base.start, node.base.node_id);
    }
    fn enter_object_method(&mut self, node: &'ast ObjectMethod, _: &[ScopeId]) {
        self.push_function_scope(node.base.start, node.base.node_id);
    }
    fn leave_object_method(&mut self, node: &'ast ObjectMethod, _: &[ScopeId]) {
        self.pop_function_scope(node.base.start, node.base.node_id);
    }

    fn enter_identifier(&mut self, node: &'ast Identifier, _scope_stack: &[ScopeId]) {
        self.check_captured_reference(node.base.start, node.base.node_id);
    }

    fn enter_jsx_identifier(
        &mut self,
        node: &'ast react_compiler_ast::jsx::JSXIdentifier,
        _scope_stack: &[ScopeId],
    ) {
        self.check_captured_reference(node.base.start, node.base.node_id);
    }

    fn enter_assignment_expression(
        &mut self,
        node: &'ast AssignmentExpression,
        scope_stack: &[ScopeId],
    ) {
        let current_scope = scope_stack
            .last()
            .copied()
            .unwrap_or(self.scope_info.program_scope);
        if self.error.is_none() {
            if let Err(error) = walk_lval_for_reassignment(self, &node.left, current_scope) {
                self.error = Some(error);
            }
        }
    }

    fn enter_update_expression(&mut self, node: &'ast UpdateExpression, scope_stack: &[ScopeId]) {
        if let Expression::Identifier(ident) = node.argument.as_ref() {
            let current_scope = scope_stack
                .last()
                .copied()
                .unwrap_or(self.scope_info.program_scope);
            self.handle_reassignment_identifier(&ident.name, current_scope);
        }
    }
}

/// Recursively walk an LVal pattern to find all reassignment target identifiers.
fn walk_lval_for_reassignment(
    visitor: &mut ContextIdentifierVisitor<'_>,
    pattern: &PatternLike,
    current_scope: ScopeId,
) -> Result<(), CompilerError> {
    match pattern {
        PatternLike::Identifier(ident) => {
            visitor.handle_reassignment_identifier(&ident.name, current_scope);
        }
        PatternLike::ArrayPattern(pat) => {
            for element in &pat.elements {
                if let Some(el) = element {
                    walk_lval_for_reassignment(visitor, el, current_scope)?;
                }
            }
        }
        PatternLike::ObjectPattern(pat) => {
            for prop in &pat.properties {
                match prop {
                    ObjectPatternProperty::ObjectProperty(p) => {
                        walk_lval_for_reassignment(visitor, &p.value, current_scope)?;
                    }
                    ObjectPatternProperty::RestElement(p) => {
                        walk_lval_for_reassignment(visitor, &p.argument, current_scope)?;
                    }
                }
            }
        }
        PatternLike::AssignmentPattern(pat) => {
            walk_lval_for_reassignment(visitor, &pat.left, current_scope)?;
        }
        PatternLike::RestElement(pat) => {
            walk_lval_for_reassignment(visitor, &pat.argument, current_scope)?;
        }
        PatternLike::MemberExpression(_) => {
            // Interior mutability - not a variable reassignment
        }
        PatternLike::TSAsExpression(node) => {
            record_unsupported_lval(
                visitor.env,
                "TSAsExpression",
                convert_opt_loc(&node.base.loc),
            )?;
        }
        PatternLike::TSSatisfiesExpression(node) => {
            record_unsupported_lval(
                visitor.env,
                "TSSatisfiesExpression",
                convert_opt_loc(&node.base.loc),
            )?;
        }
        PatternLike::TSNonNullExpression(node) => {
            record_unsupported_lval(
                visitor.env,
                "TSNonNullExpression",
                convert_opt_loc(&node.base.loc),
            )?;
        }
        PatternLike::TSTypeAssertion(node) => {
            record_unsupported_lval(
                visitor.env,
                "TSTypeAssertion",
                convert_opt_loc(&node.base.loc),
            )?;
        }
        PatternLike::TypeCastExpression(node) => {
            record_unsupported_lval(
                visitor.env,
                "TypeCastExpression",
                convert_opt_loc(&node.base.loc),
            )?;
        }
    }
    Ok(())
}

fn convert_loc(loc: &react_compiler_ast::common::SourceLocation) -> SourceLocation {
    SourceLocation {
        start: Position {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: Position {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
    }
}

fn convert_opt_loc(
    loc: &Option<react_compiler_ast::common::SourceLocation>,
) -> Option<SourceLocation> {
    loc.as_ref().map(convert_loc)
}

/// Record the TS-faithful Todo for an unsupported assignment-target wrapper
/// node, mirroring the TypeScript `FindContextIdentifiers` pass. TS throws
/// immediately (CompilerError.throwTodo in handleAssignment's default case),
/// aborting before BuildHIR ever runs or logs, so this must return Err rather
/// than record-and-continue: otherwise Rust emits HIR debug entries for a
/// function TS never lowered.
fn record_unsupported_lval(
    env: &mut Environment,
    type_name: &str,
    loc: Option<SourceLocation>,
) -> Result<(), CompilerError> {
    let _ = env;
    let mut err = CompilerError::new();
    err.push_error_detail(CompilerErrorDetail {
        category: ErrorCategory::Todo,
        reason: format!(
            "[FindContextIdentifiers] Cannot handle Object destructuring assignment target {type_name}"
        ),
        description: None,
        loc,
        suggestions: None,
    });
    Err(err)
}

/// Check if a binding declared at `binding_scope` is captured by a function at `function_scope`.
/// Returns true if the binding is declared above the function (in the parent scope or higher).
fn is_captured_by_function(
    scope_info: &ScopeInfo,
    binding_scope: ScopeId,
    function_scope: ScopeId,
) -> bool {
    let fn_parent = match scope_info.scopes[function_scope.0 as usize].parent {
        Some(p) => p,
        None => return false,
    };
    if binding_scope == fn_parent {
        return true;
    }
    // Walk up from fn_parent to see if binding_scope is an ancestor
    let mut current = scope_info.scopes[fn_parent.0 as usize].parent;
    while let Some(scope_id) = current {
        if scope_id == binding_scope {
            return true;
        }
        current = scope_info.scopes[scope_id.0 as usize].parent;
    }
    false
}

/// Build a set of `(BindingId, position)` pairs that are declaration sites
/// in `reference_to_binding`, not true references. Uses node-ID comparison
/// when available (from `ref_node_id_to_binding` + `declaration_node_id`),
/// falling back to position comparison otherwise.
/// Build a set of (BindingId, node_id) pairs for declaration sites in
/// ref_node_id_to_binding. These are entries where the reference's node_id
/// matches the binding's declaration_node_id — i.e., the "reference" is
/// actually the declaration itself.
fn build_declaration_node_ids(scope_info: &ScopeInfo) -> FxHashSet<(BindingId, u32)> {
    let mut result = FxHashSet::default();
    for (&ref_nid, &binding_id) in &scope_info.ref_node_id_to_binding {
        let binding = &scope_info.bindings[binding_id.0 as usize];
        if binding.declaration_node_id == Some(ref_nid) {
            result.insert((binding_id, ref_nid));
        }
    }
    result
}

/// Find context identifiers for a function: variables that are captured across
/// function boundaries and need StoreContext/LoadContext semantics.
///
/// A binding is a context identifier if:
/// - It is reassigned from inside a nested function (`reassignedByInnerFn`), OR
/// - It is reassigned AND referenced from inside a nested function
///   (`reassigned && referencedByInnerFn`)
///
/// This is the Rust equivalent of the TypeScript `FindContextIdentifiers` pass.
pub fn find_context_identifiers(
    func: &FunctionNode<'_>,
    scope_info: &ScopeInfo,
    env: &mut Environment,
    identifier_locs: &crate::identifier_loc_index::IdentifierLocIndex,
) -> Result<FxHashSet<BindingId>, CompilerError> {
    let func_scope = scope_info
        .resolve_scope_for_node(func.node_id())
        .unwrap_or(scope_info.program_scope);

    let mut visitor = ContextIdentifierVisitor {
        scope_info,
        env,
        function_stack: Vec::new(),
        binding_info: FxHashMap::default(),
        error: None,
    };
    let mut walker = AstWalker::with_initial_scope(scope_info, func_scope);

    // Walk params and body (like Babel's func.traverse())
    match func {
        FunctionNode::FunctionDeclaration(d) => {
            for param in &d.params {
                walker.walk_pattern(&mut visitor, param);
            }
            walker.walk_block_statement(&mut visitor, &d.body);
        }
        FunctionNode::FunctionExpression(e) => {
            for param in &e.params {
                walker.walk_pattern(&mut visitor, param);
            }
            walker.walk_block_statement(&mut visitor, &e.body);
        }
        FunctionNode::ArrowFunctionExpression(a) => {
            for param in &a.params {
                walker.walk_pattern(&mut visitor, param);
            }
            match a.body.as_ref() {
                ArrowFunctionBody::BlockStatement(block) => {
                    walker.walk_block_statement(&mut visitor, block);
                }
                ArrowFunctionBody::Expression(expr) => {
                    walker.walk_expression(&mut visitor, expr);
                }
            }
        }
    }

    if let Some(error) = visitor.error {
        return Err(error);
    }

    // Supplement the walker-based analysis with referenceToBinding data.
    // The AST walker doesn't visit identifiers inside type annotations,
    // but Babel's traverse (used by TS findContextIdentifiers) does.
    // After scope extraction includes type annotation references,
    // we check if any reassigned binding has references in nested function scopes
    // via referenceToBinding — matching the TS behavior.
    //
    // We must skip declaration sites (e.g., the `x` in `function x() {}`),
    // which are included in reference_to_binding but are not true references.
    // Prefer node-ID comparison (immune to position-0 collisions from synthetic
    // nodes), falling back to position when node-IDs are unavailable.
    let declaration_node_ids = build_declaration_node_ids(scope_info);
    for (&ref_nid, &binding_id) in &scope_info.ref_node_id_to_binding {
        let info = match visitor.binding_info.get(&binding_id) {
            Some(info) if info.reassigned && !info.referenced_by_inner_fn => info,
            _ => continue,
        };
        let _ = info;
        if declaration_node_ids.contains(&(binding_id, ref_nid)) {
            continue;
        }
        // Get the reference's position from identifier_locs for range checks
        let ref_pos = match identifier_locs.get(&ref_nid) {
            Some(entry) => entry.start,
            None => continue,
        };
        let binding = &scope_info.bindings[binding_id.0 as usize];
        // Check if ref_pos is inside a nested function scope
        for (&scope_start, &scope_id) in &scope_info.node_to_scope {
            if scope_start <= ref_pos {
                if let Some(&scope_end) = scope_info.node_to_scope_end.get(&scope_start) {
                    if ref_pos < scope_end
                        && matches!(
                            scope_info.scopes[scope_id.0 as usize].kind,
                            ScopeKind::Function
                        )
                        && is_captured_by_function(scope_info, binding.scope, scope_id)
                    {
                        visitor
                            .binding_info
                            .get_mut(&binding_id)
                            .unwrap()
                            .referenced_by_inner_fn = true;
                        break;
                    }
                }
            }
        }
    }

    // Collect results
    Ok(visitor
        .binding_info
        .into_iter()
        .filter(|(_, info)| {
            info.reassigned_by_inner_fn || (info.reassigned && info.referenced_by_inner_fn)
        })
        .map(|(id, _)| id)
        .collect())
}

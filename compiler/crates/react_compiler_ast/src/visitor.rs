//! AST visitor with automatic scope tracking.
//!
//! Provides a [`Visitor`] trait with enter/leave hooks for specific node types,
//! and an [`AstWalker`] that traverses the AST while tracking the active scope
//! via the scope tree's `node_to_scope` map.

use crate::Program;
use crate::declarations::*;
use crate::expressions::*;
use crate::jsx::*;
use crate::patterns::*;
use crate::scope::ScopeId;
use crate::scope::ScopeInfo;
use crate::statements::*;

/// Trait for visiting Babel AST nodes. All methods default to no-ops.
/// Override specific methods to intercept nodes of interest.
///
/// The `'ast` lifetime ties visitor hooks to the AST being walked, allowing
/// visitors to store references into the AST (e.g., for deferred processing).
///
/// The `scope_stack` parameter provides the current scope context during traversal.
/// The active scope is `scope_stack.last()`.
pub trait Visitor<'ast> {
    /// Controls whether the walker recurses into function/arrow/method bodies.
    /// Returns `true` by default. Override to `false` to skip function bodies
    /// (similar to Babel's `path.skip()` in traverse visitors).
    ///
    /// When `false`, the walker still calls `enter_*` / `leave_*` for functions
    /// but does not walk their params or body.
    fn traverse_function_bodies(&self) -> bool {
        true
    }

    fn enter_function_declaration(
        &mut self,
        _node: &'ast FunctionDeclaration,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn leave_function_declaration(
        &mut self,
        _node: &'ast FunctionDeclaration,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn enter_function_expression(
        &mut self,
        _node: &'ast FunctionExpression,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn leave_function_expression(
        &mut self,
        _node: &'ast FunctionExpression,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn enter_arrow_function_expression(
        &mut self,
        _node: &'ast ArrowFunctionExpression,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn leave_arrow_function_expression(
        &mut self,
        _node: &'ast ArrowFunctionExpression,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn enter_class_declaration(
        &mut self,
        _node: &'ast crate::statements::ClassDeclaration,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn enter_class_expression(&mut self, _node: &'ast ClassExpression, _scope_stack: &[ScopeId]) {}
    fn enter_object_method(&mut self, _node: &'ast ObjectMethod, _scope_stack: &[ScopeId]) {}
    fn leave_object_method(&mut self, _node: &'ast ObjectMethod, _scope_stack: &[ScopeId]) {}
    fn enter_assignment_expression(
        &mut self,
        _node: &'ast AssignmentExpression,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn enter_update_expression(&mut self, _node: &'ast UpdateExpression, _scope_stack: &[ScopeId]) {
    }
    fn enter_identifier(&mut self, _node: &'ast Identifier, _scope_stack: &[ScopeId]) {}
    fn enter_jsx_identifier(&mut self, _node: &'ast JSXIdentifier, _scope_stack: &[ScopeId]) {}
    fn enter_jsx_opening_element(
        &mut self,
        _node: &'ast JSXOpeningElement,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn leave_jsx_opening_element(
        &mut self,
        _node: &'ast JSXOpeningElement,
        _scope_stack: &[ScopeId],
    ) {
    }

    fn enter_variable_declarator(
        &mut self,
        _node: &'ast VariableDeclarator,
        _scope_stack: &[ScopeId],
    ) {
    }
    fn leave_variable_declarator(
        &mut self,
        _node: &'ast VariableDeclarator,
        _scope_stack: &[ScopeId],
    ) {
    }

    fn enter_call_expression(&mut self, _node: &'ast CallExpression, _scope_stack: &[ScopeId]) {}
    fn leave_call_expression(&mut self, _node: &'ast CallExpression, _scope_stack: &[ScopeId]) {}

    /// Called when the walker enters a loop expression context (while.test,
    /// do-while.test, for-in.right, for-of.right). Functions found in these
    /// positions are treated as non-program-scope by Babel, even though the
    /// walker doesn't push a scope for them.
    fn enter_loop_expression(&mut self) {}
    fn leave_loop_expression(&mut self) {}
}

/// Walks the AST while tracking scope context via `node_to_scope`.
pub struct AstWalker<'a> {
    scope_info: &'a ScopeInfo,
    scope_stack: Vec<ScopeId>,
    /// Depth counter for loop/iteration expression positions (while.test,
    /// do-while.test, for-in.right, for-of.right). These positions are
    /// NOT inside a scope in the walker's model, but Babel's scope analysis
    /// treats them as non-program-scope. Visitors can check this via
    /// `in_loop_expression_depth()` to implement Babel-compatible scope checks.
    loop_expression_depth: usize,
}

impl<'a> AstWalker<'a> {
    pub fn new(scope_info: &'a ScopeInfo) -> Self {
        AstWalker {
            scope_info,
            scope_stack: Vec::new(),
            loop_expression_depth: 0,
        }
    }

    /// Create a walker with an initial scope already on the stack.
    pub fn with_initial_scope(scope_info: &'a ScopeInfo, initial_scope: ScopeId) -> Self {
        AstWalker {
            scope_info,
            scope_stack: vec![initial_scope],
            loop_expression_depth: 0,
        }
    }

    pub fn scope_stack(&self) -> &[ScopeId] {
        &self.scope_stack
    }

    /// Returns the current loop-expression depth. Non-zero when the walker is
    /// inside a loop's test/right expression (while.test, do-while.test,
    /// for-in.right, for-of.right). Visitors can use this to implement
    /// Babel-compatible scope checks in 'all' compilation mode.
    pub fn loop_expression_depth(&self) -> usize {
        self.loop_expression_depth
    }

    /// Try to push a scope for a node. Returns true if a scope was pushed.
    fn try_push_scope(&mut self, _start: Option<u32>, node_id: Option<u32>) -> bool {
        let scope = self.scope_info.resolve_scope_for_node(node_id);
        if let Some(scope_id) = scope {
            self.scope_stack.push(scope_id);
            return true;
        }
        false
    }

    // ---- Public walk methods ----

    pub fn walk_program<'ast>(&mut self, v: &mut impl Visitor<'ast>, node: &'ast Program) {
        let pushed = self.try_push_scope(node.base.start, node.base.node_id);
        for stmt in &node.body {
            self.walk_statement(v, stmt);
        }
        if pushed {
            self.scope_stack.pop();
        }
    }

    pub fn walk_block_statement<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        node: &'ast BlockStatement,
    ) {
        let pushed = self.try_push_scope(node.base.start, node.base.node_id);
        for stmt in &node.body {
            self.walk_statement(v, stmt);
        }
        if pushed {
            self.scope_stack.pop();
        }
    }

    pub fn walk_statement<'ast>(&mut self, v: &mut impl Visitor<'ast>, stmt: &'ast Statement) {
        match stmt {
            Statement::BlockStatement(node) => self.walk_block_statement(v, node),
            Statement::ReturnStatement(node) => {
                if let Some(arg) = &node.argument {
                    self.walk_expression(v, arg);
                }
            }
            Statement::ExpressionStatement(node) => {
                self.walk_expression(v, &node.expression);
            }
            Statement::IfStatement(node) => {
                self.walk_expression(v, &node.test);
                self.walk_statement(v, &node.consequent);
                if let Some(alt) = &node.alternate {
                    self.walk_statement(v, alt);
                }
            }
            Statement::ForStatement(node) => {
                let pushed = self.try_push_scope(node.base.start, node.base.node_id);
                if let Some(init) = &node.init {
                    match init.as_ref() {
                        ForInit::VariableDeclaration(decl) => {
                            self.walk_variable_declaration(v, decl)
                        }
                        ForInit::Expression(expr) => self.walk_expression(v, expr),
                    }
                }
                if let Some(test) = &node.test {
                    self.walk_expression(v, test);
                }
                if let Some(update) = &node.update {
                    self.walk_expression(v, update);
                }
                self.walk_statement(v, &node.body);
                if pushed {
                    self.scope_stack.pop();
                }
            }
            Statement::WhileStatement(node) => {
                self.loop_expression_depth += 1;
                v.enter_loop_expression();
                self.walk_expression(v, &node.test);
                v.leave_loop_expression();
                self.loop_expression_depth -= 1;
                self.walk_statement(v, &node.body);
            }
            Statement::DoWhileStatement(node) => {
                self.walk_statement(v, &node.body);
                self.loop_expression_depth += 1;
                v.enter_loop_expression();
                self.walk_expression(v, &node.test);
                v.leave_loop_expression();
                self.loop_expression_depth -= 1;
            }
            Statement::ForInStatement(node) => {
                let pushed = self.try_push_scope(node.base.start, node.base.node_id);
                self.walk_for_in_of_left(v, &node.left);
                self.loop_expression_depth += 1;
                v.enter_loop_expression();
                self.walk_expression(v, &node.right);
                v.leave_loop_expression();
                self.loop_expression_depth -= 1;
                self.walk_statement(v, &node.body);
                if pushed {
                    self.scope_stack.pop();
                }
            }
            Statement::ForOfStatement(node) => {
                let pushed = self.try_push_scope(node.base.start, node.base.node_id);
                self.walk_for_in_of_left(v, &node.left);
                self.loop_expression_depth += 1;
                v.enter_loop_expression();
                self.walk_expression(v, &node.right);
                v.leave_loop_expression();
                self.loop_expression_depth -= 1;
                self.walk_statement(v, &node.body);
                if pushed {
                    self.scope_stack.pop();
                }
            }
            Statement::SwitchStatement(node) => {
                let pushed = self.try_push_scope(node.base.start, node.base.node_id);
                self.walk_expression(v, &node.discriminant);
                for case in &node.cases {
                    if let Some(test) = &case.test {
                        self.walk_expression(v, test);
                    }
                    for consequent in &case.consequent {
                        self.walk_statement(v, consequent);
                    }
                }
                if pushed {
                    self.scope_stack.pop();
                }
            }
            Statement::ThrowStatement(node) => {
                self.walk_expression(v, &node.argument);
            }
            Statement::TryStatement(node) => {
                self.walk_block_statement(v, &node.block);
                if let Some(handler) = &node.handler {
                    let pushed = self.try_push_scope(handler.base.start, handler.base.node_id);
                    if let Some(param) = &handler.param {
                        self.walk_pattern(v, param);
                    }
                    self.walk_block_statement(v, &handler.body);
                    if pushed {
                        self.scope_stack.pop();
                    }
                }
                if let Some(finalizer) = &node.finalizer {
                    self.walk_block_statement(v, finalizer);
                }
            }
            Statement::LabeledStatement(node) => {
                self.walk_statement(v, &node.body);
            }
            Statement::VariableDeclaration(node) => {
                self.walk_variable_declaration(v, node);
            }
            Statement::FunctionDeclaration(node) => {
                self.walk_function_declaration_inner(v, node);
            }
            Statement::ClassDeclaration(node) => {
                // Call the visitor hook so consumers can index the class name,
                // but skip walking the class body (no compilable functions inside)
                v.enter_class_declaration(node, &self.scope_stack);
            }
            Statement::WithStatement(node) => {
                self.walk_expression(v, &node.object);
                self.walk_statement(v, &node.body);
            }
            Statement::ExportNamedDeclaration(node) => {
                if let Some(decl) = &node.declaration {
                    self.walk_declaration(v, decl);
                }
            }
            Statement::ExportDefaultDeclaration(node) => {
                self.walk_export_default_decl(v, &node.declaration);
            }
            // No runtime expressions to traverse
            Statement::BreakStatement(_)
            | Statement::ContinueStatement(_)
            | Statement::EmptyStatement(_)
            | Statement::DebuggerStatement(_)
            | Statement::ImportDeclaration(_)
            | Statement::ExportAllDeclaration(_)
            | Statement::TSEnumDeclaration(_)
            | Statement::EnumDeclaration(_)
            // Unmodeled raw node: opaque, no compilable children to traverse.
            | Statement::Unknown(_) => {}
        }
    }

    pub fn walk_expression<'ast>(&mut self, v: &mut impl Visitor<'ast>, expr: &'ast Expression) {
        match expr {
            Expression::Identifier(node) => {
                v.enter_identifier(node, &self.scope_stack);
            }
            Expression::CallExpression(node) => {
                v.enter_call_expression(node, &self.scope_stack);
                self.walk_expression(v, &node.callee);
                for arg in &node.arguments {
                    self.walk_expression(v, arg);
                }
                v.leave_call_expression(node, &self.scope_stack);
            }
            Expression::MemberExpression(node) => {
                self.walk_expression(v, &node.object);
                if node.computed {
                    self.walk_expression(v, &node.property);
                }
            }
            Expression::OptionalCallExpression(node) => {
                self.walk_expression(v, &node.callee);
                for arg in &node.arguments {
                    self.walk_expression(v, arg);
                }
            }
            Expression::OptionalMemberExpression(node) => {
                self.walk_expression(v, &node.object);
                if node.computed {
                    self.walk_expression(v, &node.property);
                }
            }
            Expression::BinaryExpression(node) => {
                self.walk_expression(v, &node.left);
                self.walk_expression(v, &node.right);
            }
            Expression::LogicalExpression(node) => {
                self.walk_expression(v, &node.left);
                self.walk_expression(v, &node.right);
            }
            Expression::UnaryExpression(node) => {
                self.walk_expression(v, &node.argument);
            }
            Expression::UpdateExpression(node) => {
                v.enter_update_expression(node, &self.scope_stack);
                self.walk_expression(v, &node.argument);
            }
            Expression::ConditionalExpression(node) => {
                self.walk_expression(v, &node.test);
                self.walk_expression(v, &node.consequent);
                self.walk_expression(v, &node.alternate);
            }
            Expression::AssignmentExpression(node) => {
                v.enter_assignment_expression(node, &self.scope_stack);
                self.walk_pattern(v, &node.left);
                self.walk_expression(v, &node.right);
            }
            Expression::SequenceExpression(node) => {
                for expr in &node.expressions {
                    self.walk_expression(v, expr);
                }
            }
            Expression::ArrowFunctionExpression(node) => {
                let pushed = self.try_push_scope(node.base.start, node.base.node_id);
                v.enter_arrow_function_expression(node, &self.scope_stack);
                if v.traverse_function_bodies() {
                    for param in &node.params {
                        self.walk_pattern(v, param);
                    }
                    match node.body.as_ref() {
                        ArrowFunctionBody::BlockStatement(block) => {
                            self.walk_block_statement(v, block);
                        }
                        ArrowFunctionBody::Expression(expr) => {
                            self.walk_expression(v, expr);
                        }
                    }
                }
                v.leave_arrow_function_expression(node, &self.scope_stack);
                if pushed {
                    self.scope_stack.pop();
                }
            }
            Expression::FunctionExpression(node) => {
                let pushed = self.try_push_scope(node.base.start, node.base.node_id);
                v.enter_function_expression(node, &self.scope_stack);
                if v.traverse_function_bodies() {
                    for param in &node.params {
                        self.walk_pattern(v, param);
                    }
                    self.walk_block_statement(v, &node.body);
                }
                v.leave_function_expression(node, &self.scope_stack);
                if pushed {
                    self.scope_stack.pop();
                }
            }
            Expression::ObjectExpression(node) => {
                for prop in &node.properties {
                    self.walk_object_expression_property(v, prop);
                }
            }
            Expression::ArrayExpression(node) => {
                for element in &node.elements {
                    if let Some(el) = element {
                        self.walk_expression(v, el);
                    }
                }
            }
            Expression::NewExpression(node) => {
                self.walk_expression(v, &node.callee);
                for arg in &node.arguments {
                    self.walk_expression(v, arg);
                }
            }
            Expression::TemplateLiteral(node) => {
                for expr in &node.expressions {
                    self.walk_expression(v, expr);
                }
            }
            Expression::TaggedTemplateExpression(node) => {
                self.walk_expression(v, &node.tag);
                for expr in &node.quasi.expressions {
                    self.walk_expression(v, expr);
                }
            }
            Expression::AwaitExpression(node) => {
                self.walk_expression(v, &node.argument);
            }
            Expression::YieldExpression(node) => {
                if let Some(arg) = &node.argument {
                    self.walk_expression(v, arg);
                }
            }
            Expression::SpreadElement(node) => {
                self.walk_expression(v, &node.argument);
            }
            Expression::ParenthesizedExpression(node) => {
                self.walk_expression(v, &node.expression);
            }
            Expression::AssignmentPattern(node) => {
                self.walk_pattern(v, &node.left);
                self.walk_expression(v, &node.right);
            }
            Expression::ClassExpression(node) => {
                // Call the visitor hook so consumers can index the class name,
                // but skip walking the class body
                v.enter_class_expression(node, &self.scope_stack);
            }
            // JSX
            Expression::JSXElement(node) => self.walk_jsx_element(v, node),
            Expression::JSXFragment(node) => self.walk_jsx_fragment(v, node),
            // TS/Flow wrappers - traverse inner expression
            Expression::TSAsExpression(node) => self.walk_expression(v, &node.expression),
            Expression::TSSatisfiesExpression(node) => self.walk_expression(v, &node.expression),
            Expression::TSNonNullExpression(node) => self.walk_expression(v, &node.expression),
            Expression::TSTypeAssertion(node) => self.walk_expression(v, &node.expression),
            Expression::TSInstantiationExpression(node) => {
                self.walk_expression(v, &node.expression)
            }
            Expression::TypeCastExpression(node) => self.walk_expression(v, &node.expression),
            // Leaf nodes
            Expression::StringLiteral(_)
            | Expression::NumericLiteral(_)
            | Expression::BooleanLiteral(_)
            | Expression::NullLiteral(_)
            | Expression::BigIntLiteral(_)
            | Expression::RegExpLiteral(_)
            | Expression::MetaProperty(_)
            | Expression::PrivateName(_)
            | Expression::Super(_)
            | Expression::Import(_)
            | Expression::ThisExpression(_) => {}
        }
    }

    pub fn walk_pattern<'ast>(&mut self, v: &mut impl Visitor<'ast>, pat: &'ast PatternLike) {
        match pat {
            PatternLike::Identifier(node) => {
                v.enter_identifier(node, &self.scope_stack);
            }
            PatternLike::ObjectPattern(node) => {
                for prop in &node.properties {
                    match prop {
                        ObjectPatternProperty::ObjectProperty(p) => {
                            if p.computed {
                                self.walk_expression(v, &p.key);
                            }
                            self.walk_pattern(v, &p.value);
                        }
                        ObjectPatternProperty::RestElement(p) => {
                            self.walk_pattern(v, &p.argument);
                        }
                    }
                }
            }
            PatternLike::ArrayPattern(node) => {
                for element in &node.elements {
                    if let Some(el) = element {
                        self.walk_pattern(v, el);
                    }
                }
            }
            PatternLike::AssignmentPattern(node) => {
                self.walk_pattern(v, &node.left);
                self.walk_expression(v, &node.right);
            }
            PatternLike::RestElement(node) => {
                self.walk_pattern(v, &node.argument);
            }
            PatternLike::MemberExpression(node) => {
                self.walk_expression(v, &node.object);
                if node.computed {
                    self.walk_expression(v, &node.property);
                }
            }
            PatternLike::TSAsExpression(node) => self.walk_expression(v, &node.expression),
            PatternLike::TSSatisfiesExpression(node) => self.walk_expression(v, &node.expression),
            PatternLike::TSNonNullExpression(node) => self.walk_expression(v, &node.expression),
            PatternLike::TSTypeAssertion(node) => self.walk_expression(v, &node.expression),
            PatternLike::TypeCastExpression(node) => self.walk_expression(v, &node.expression),
        }
    }

    // ---- Private helper walk methods ----

    fn walk_for_in_of_left<'ast>(&mut self, v: &mut impl Visitor<'ast>, left: &'ast ForInOfLeft) {
        match left {
            ForInOfLeft::VariableDeclaration(decl) => self.walk_variable_declaration(v, decl),
            ForInOfLeft::Pattern(pat) => self.walk_pattern(v, pat),
        }
    }

    fn walk_variable_declaration<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        decl: &'ast VariableDeclaration,
    ) {
        for declarator in &decl.declarations {
            v.enter_variable_declarator(declarator, &self.scope_stack);
            self.walk_pattern(v, &declarator.id);
            if let Some(init) = &declarator.init {
                self.walk_expression(v, init);
            }
            v.leave_variable_declarator(declarator, &self.scope_stack);
        }
    }

    fn walk_function_declaration_inner<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        node: &'ast FunctionDeclaration,
    ) {
        let pushed = self.try_push_scope(node.base.start, node.base.node_id);
        v.enter_function_declaration(node, &self.scope_stack);
        if v.traverse_function_bodies() {
            for param in &node.params {
                self.walk_pattern(v, param);
            }
            self.walk_block_statement(v, &node.body);
        }
        v.leave_function_declaration(node, &self.scope_stack);
        if pushed {
            self.scope_stack.pop();
        }
    }

    fn walk_object_expression_property<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        prop: &'ast ObjectExpressionProperty,
    ) {
        match prop {
            ObjectExpressionProperty::ObjectProperty(p) => {
                if p.computed {
                    self.walk_expression(v, &p.key);
                }
                self.walk_expression(v, &p.value);
            }
            ObjectExpressionProperty::ObjectMethod(node) => {
                let pushed = self.try_push_scope(node.base.start, node.base.node_id);
                v.enter_object_method(node, &self.scope_stack);
                if v.traverse_function_bodies() {
                    if node.computed {
                        self.walk_expression(v, &node.key);
                    }
                    for param in &node.params {
                        self.walk_pattern(v, param);
                    }
                    self.walk_block_statement(v, &node.body);
                }
                v.leave_object_method(node, &self.scope_stack);
                if pushed {
                    self.scope_stack.pop();
                }
            }
            ObjectExpressionProperty::SpreadElement(p) => {
                self.walk_expression(v, &p.argument);
            }
        }
    }

    fn walk_declaration<'ast>(&mut self, v: &mut impl Visitor<'ast>, decl: &'ast Declaration) {
        match decl {
            Declaration::FunctionDeclaration(node) => {
                self.walk_function_declaration_inner(v, node);
            }
            Declaration::VariableDeclaration(node) => {
                self.walk_variable_declaration(v, node);
            }
            // TS/Flow declarations - no runtime expressions
            _ => {}
        }
    }

    fn walk_export_default_decl<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        decl: &'ast ExportDefaultDecl,
    ) {
        match decl {
            ExportDefaultDecl::FunctionDeclaration(node) => {
                self.walk_function_declaration_inner(v, node);
            }
            ExportDefaultDecl::ClassDeclaration(node) => {
                // Call the visitor hook, but skip the class body
                v.enter_class_declaration(node, &self.scope_stack);
            }
            ExportDefaultDecl::EnumDeclaration(_) => {
                // Flow enum declarations are opaque — no visitor hooks needed
            }
            ExportDefaultDecl::Expression(expr) => {
                self.walk_expression(v, expr);
            }
        }
    }

    fn walk_jsx_element<'ast>(&mut self, v: &mut impl Visitor<'ast>, node: &'ast JSXElement) {
        v.enter_jsx_opening_element(&node.opening_element, &self.scope_stack);
        self.walk_jsx_element_name(v, &node.opening_element.name);
        v.leave_jsx_opening_element(&node.opening_element, &self.scope_stack);
        for attr in &node.opening_element.attributes {
            match attr {
                JSXAttributeItem::JSXAttribute(a) => {
                    if let Some(value) = &a.value {
                        match value {
                            JSXAttributeValue::JSXExpressionContainer(c) => {
                                self.walk_jsx_expr_container(v, c);
                            }
                            JSXAttributeValue::JSXElement(el) => {
                                self.walk_jsx_element(v, el);
                            }
                            JSXAttributeValue::JSXFragment(f) => {
                                self.walk_jsx_fragment(v, f);
                            }
                            JSXAttributeValue::StringLiteral(_) => {}
                        }
                    }
                }
                JSXAttributeItem::JSXSpreadAttribute(a) => {
                    self.walk_expression(v, &a.argument);
                }
            }
        }
        for child in &node.children {
            self.walk_jsx_child(v, child);
        }
    }

    fn walk_jsx_fragment<'ast>(&mut self, v: &mut impl Visitor<'ast>, node: &'ast JSXFragment) {
        for child in &node.children {
            self.walk_jsx_child(v, child);
        }
    }

    fn walk_jsx_child<'ast>(&mut self, v: &mut impl Visitor<'ast>, child: &'ast JSXChild) {
        match child {
            JSXChild::JSXElement(el) => self.walk_jsx_element(v, el),
            JSXChild::JSXFragment(f) => self.walk_jsx_fragment(v, f),
            JSXChild::JSXExpressionContainer(c) => self.walk_jsx_expr_container(v, c),
            JSXChild::JSXSpreadChild(s) => self.walk_expression(v, &s.expression),
            JSXChild::JSXText(_) => {}
        }
    }

    fn walk_jsx_expr_container<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        node: &'ast JSXExpressionContainer,
    ) {
        match &node.expression {
            JSXExpressionContainerExpr::Expression(expr) => self.walk_expression(v, expr),
            JSXExpressionContainerExpr::JSXEmptyExpression(_) => {}
        }
    }

    fn walk_jsx_element_name<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        name: &'ast JSXElementName,
    ) {
        match name {
            JSXElementName::JSXIdentifier(id) => {
                v.enter_jsx_identifier(id, &self.scope_stack);
            }
            JSXElementName::JSXMemberExpression(expr) => {
                self.walk_jsx_member_expression(v, expr);
            }
            JSXElementName::JSXNamespacedName(_) => {}
        }
    }

    fn walk_jsx_member_expression<'ast>(
        &mut self,
        v: &mut impl Visitor<'ast>,
        expr: &'ast JSXMemberExpression,
    ) {
        match &*expr.object {
            JSXMemberExprObject::JSXIdentifier(id) => {
                v.enter_jsx_identifier(id, &self.scope_stack);
            }
            JSXMemberExprObject::JSXMemberExpression(inner) => {
                self.walk_jsx_member_expression(v, inner);
            }
        }
        v.enter_jsx_identifier(&expr.property, &self.scope_stack);
    }
}

// =============================================================================
// Mutable visitor
// =============================================================================

/// Result from a mutable visitor hook.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VisitResult {
    /// Continue traversal to children.
    Continue,
    /// Stop traversal immediately.
    Stop,
}

impl VisitResult {
    pub fn is_stop(self) -> bool {
        self == VisitResult::Stop
    }
}

/// Trait for mutating Babel AST nodes during traversal.
///
/// Override hooks to intercept and mutate specific node types.
/// Return [`VisitResult::Stop`] from any hook to halt the walk.
/// Hooks are called *before* the walker recurses into children,
/// so returning `Stop` prevents child traversal.
pub trait MutVisitor {
    /// Called for every statement before recursing into its children.
    fn visit_statement(&mut self, _stmt: &mut Statement) -> VisitResult {
        VisitResult::Continue
    }

    /// Called for every expression before recursing into its children.
    fn visit_expression(&mut self, _expr: &mut Expression) -> VisitResult {
        VisitResult::Continue
    }

    /// Called for identifiers in expression position.
    fn visit_identifier(&mut self, _node: &mut Identifier) -> VisitResult {
        VisitResult::Continue
    }
}

/// Walk a program's body mutably, calling visitor hooks for each node.
pub fn walk_program_mut(v: &mut impl MutVisitor, program: &mut Program) -> VisitResult {
    for stmt in program.body.iter_mut() {
        if walk_statement_mut(v, stmt).is_stop() {
            return VisitResult::Stop;
        }
    }
    VisitResult::Continue
}

/// Walk a single statement mutably, calling visitor hooks and recursing into children.
pub fn walk_statement_mut(v: &mut impl MutVisitor, stmt: &mut Statement) -> VisitResult {
    if v.visit_statement(stmt).is_stop() {
        return VisitResult::Stop;
    }
    match stmt {
        Statement::BlockStatement(node) => {
            for s in node.body.iter_mut() {
                if walk_statement_mut(v, s).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Statement::ReturnStatement(node) => {
            if let Some(ref mut arg) = node.argument {
                if walk_expression_mut(v, arg).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Statement::ExpressionStatement(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::IfStatement(node) => {
            if walk_expression_mut(v, &mut node.test).is_stop() {
                return VisitResult::Stop;
            }
            if walk_statement_mut(v, &mut node.consequent).is_stop() {
                return VisitResult::Stop;
            }
            if let Some(ref mut alt) = node.alternate {
                if walk_statement_mut(v, alt).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Statement::ForStatement(node) => {
            if let Some(ref mut init) = node.init {
                match init.as_mut() {
                    ForInit::VariableDeclaration(decl) => {
                        if walk_variable_declaration_mut(v, decl).is_stop() {
                            return VisitResult::Stop;
                        }
                    }
                    ForInit::Expression(expr) => {
                        if walk_expression_mut(v, expr).is_stop() {
                            return VisitResult::Stop;
                        }
                    }
                }
            }
            if let Some(ref mut test) = node.test {
                if walk_expression_mut(v, test).is_stop() {
                    return VisitResult::Stop;
                }
            }
            if let Some(ref mut update) = node.update {
                if walk_expression_mut(v, update).is_stop() {
                    return VisitResult::Stop;
                }
            }
            if walk_statement_mut(v, &mut node.body).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::WhileStatement(node) => {
            if walk_expression_mut(v, &mut node.test).is_stop() {
                return VisitResult::Stop;
            }
            if walk_statement_mut(v, &mut node.body).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::DoWhileStatement(node) => {
            if walk_statement_mut(v, &mut node.body).is_stop() {
                return VisitResult::Stop;
            }
            if walk_expression_mut(v, &mut node.test).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::ForInStatement(node) => {
            if walk_expression_mut(v, &mut node.right).is_stop() {
                return VisitResult::Stop;
            }
            if walk_statement_mut(v, &mut node.body).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::ForOfStatement(node) => {
            if walk_expression_mut(v, &mut node.right).is_stop() {
                return VisitResult::Stop;
            }
            if walk_statement_mut(v, &mut node.body).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::SwitchStatement(node) => {
            if walk_expression_mut(v, &mut node.discriminant).is_stop() {
                return VisitResult::Stop;
            }
            for case in node.cases.iter_mut() {
                if let Some(ref mut test) = case.test {
                    if walk_expression_mut(v, test).is_stop() {
                        return VisitResult::Stop;
                    }
                }
                for s in case.consequent.iter_mut() {
                    if walk_statement_mut(v, s).is_stop() {
                        return VisitResult::Stop;
                    }
                }
            }
        }
        Statement::ThrowStatement(node) => {
            if walk_expression_mut(v, &mut node.argument).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::TryStatement(node) => {
            for s in node.block.body.iter_mut() {
                if walk_statement_mut(v, s).is_stop() {
                    return VisitResult::Stop;
                }
            }
            if let Some(ref mut handler) = node.handler {
                for s in handler.body.body.iter_mut() {
                    if walk_statement_mut(v, s).is_stop() {
                        return VisitResult::Stop;
                    }
                }
            }
            if let Some(ref mut finalizer) = node.finalizer {
                for s in finalizer.body.iter_mut() {
                    if walk_statement_mut(v, s).is_stop() {
                        return VisitResult::Stop;
                    }
                }
            }
        }
        Statement::LabeledStatement(node) => {
            if walk_statement_mut(v, &mut node.body).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::VariableDeclaration(node) => {
            if walk_variable_declaration_mut(v, node).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::FunctionDeclaration(node) => {
            for s in node.body.body.iter_mut() {
                if walk_statement_mut(v, s).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Statement::ClassDeclaration(node) => {
            if let Some(ref mut sc) = node.super_class {
                if walk_expression_mut(v, sc).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Statement::WithStatement(node) => {
            if walk_expression_mut(v, &mut node.object).is_stop() {
                return VisitResult::Stop;
            }
            if walk_statement_mut(v, &mut node.body).is_stop() {
                return VisitResult::Stop;
            }
        }
        Statement::ExportNamedDeclaration(node) => {
            if let Some(ref mut decl) = node.declaration {
                if walk_declaration_mut(v, decl).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Statement::ExportDefaultDeclaration(node) => {
            if walk_export_default_decl_mut(v, &mut node.declaration).is_stop() {
                return VisitResult::Stop;
            }
        }
        // No runtime expressions to traverse
        Statement::BreakStatement(_)
        | Statement::ContinueStatement(_)
        | Statement::EmptyStatement(_)
        | Statement::DebuggerStatement(_)
        | Statement::ImportDeclaration(_)
        | Statement::ExportAllDeclaration(_)
        | Statement::TSEnumDeclaration(_)
        | Statement::EnumDeclaration(_)
        // Unmodeled raw node: opaque, no compilable children to traverse.
        | Statement::Unknown(_) => {}
    }
    VisitResult::Continue
}

/// Walk an expression mutably, calling visitor hooks and recursing into children.
pub fn walk_expression_mut(v: &mut impl MutVisitor, expr: &mut Expression) -> VisitResult {
    if v.visit_expression(expr).is_stop() {
        return VisitResult::Stop;
    }
    match expr {
        Expression::Identifier(node) => {
            if v.visit_identifier(node).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::CallExpression(node) => {
            if walk_expression_mut(v, &mut node.callee).is_stop() {
                return VisitResult::Stop;
            }
            for arg in node.arguments.iter_mut() {
                if walk_expression_mut(v, arg).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::MemberExpression(node) => {
            if walk_expression_mut(v, &mut node.object).is_stop() {
                return VisitResult::Stop;
            }
            if node.computed {
                if walk_expression_mut(v, &mut node.property).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::OptionalCallExpression(node) => {
            if walk_expression_mut(v, &mut node.callee).is_stop() {
                return VisitResult::Stop;
            }
            for arg in node.arguments.iter_mut() {
                if walk_expression_mut(v, arg).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::OptionalMemberExpression(node) => {
            if walk_expression_mut(v, &mut node.object).is_stop() {
                return VisitResult::Stop;
            }
            if node.computed {
                if walk_expression_mut(v, &mut node.property).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::BinaryExpression(node) => {
            if walk_expression_mut(v, &mut node.left).is_stop() {
                return VisitResult::Stop;
            }
            if walk_expression_mut(v, &mut node.right).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::LogicalExpression(node) => {
            if walk_expression_mut(v, &mut node.left).is_stop() {
                return VisitResult::Stop;
            }
            if walk_expression_mut(v, &mut node.right).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::UnaryExpression(node) => {
            if walk_expression_mut(v, &mut node.argument).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::UpdateExpression(node) => {
            if walk_expression_mut(v, &mut node.argument).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::ConditionalExpression(node) => {
            if walk_expression_mut(v, &mut node.test).is_stop() {
                return VisitResult::Stop;
            }
            if walk_expression_mut(v, &mut node.consequent).is_stop() {
                return VisitResult::Stop;
            }
            if walk_expression_mut(v, &mut node.alternate).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::AssignmentExpression(node) => {
            if walk_expression_mut(v, &mut node.right).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::SequenceExpression(node) => {
            for e in node.expressions.iter_mut() {
                if walk_expression_mut(v, e).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::ArrowFunctionExpression(node) => match node.body.as_mut() {
            ArrowFunctionBody::BlockStatement(block) => {
                for s in block.body.iter_mut() {
                    if walk_statement_mut(v, s).is_stop() {
                        return VisitResult::Stop;
                    }
                }
            }
            ArrowFunctionBody::Expression(e) => {
                if walk_expression_mut(v, e).is_stop() {
                    return VisitResult::Stop;
                }
            }
        },
        Expression::FunctionExpression(node) => {
            for s in node.body.body.iter_mut() {
                if walk_statement_mut(v, s).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::ObjectExpression(node) => {
            for prop in node.properties.iter_mut() {
                match prop {
                    ObjectExpressionProperty::ObjectProperty(p) => {
                        if p.computed {
                            if walk_expression_mut(v, &mut p.key).is_stop() {
                                return VisitResult::Stop;
                            }
                        }
                        if walk_expression_mut(v, &mut p.value).is_stop() {
                            return VisitResult::Stop;
                        }
                    }
                    ObjectExpressionProperty::ObjectMethod(m) => {
                        for s in m.body.body.iter_mut() {
                            if walk_statement_mut(v, s).is_stop() {
                                return VisitResult::Stop;
                            }
                        }
                    }
                    ObjectExpressionProperty::SpreadElement(s) => {
                        if walk_expression_mut(v, &mut s.argument).is_stop() {
                            return VisitResult::Stop;
                        }
                    }
                }
            }
        }
        Expression::ArrayExpression(node) => {
            for elem in node.elements.iter_mut().flatten() {
                if walk_expression_mut(v, elem).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::NewExpression(node) => {
            if walk_expression_mut(v, &mut node.callee).is_stop() {
                return VisitResult::Stop;
            }
            for arg in node.arguments.iter_mut() {
                if walk_expression_mut(v, arg).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::TemplateLiteral(node) => {
            for e in node.expressions.iter_mut() {
                if walk_expression_mut(v, e).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::TaggedTemplateExpression(node) => {
            if walk_expression_mut(v, &mut node.tag).is_stop() {
                return VisitResult::Stop;
            }
            for e in node.quasi.expressions.iter_mut() {
                if walk_expression_mut(v, e).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::AwaitExpression(node) => {
            if walk_expression_mut(v, &mut node.argument).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::YieldExpression(node) => {
            if let Some(ref mut arg) = node.argument {
                if walk_expression_mut(v, arg).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::SpreadElement(node) => {
            if walk_expression_mut(v, &mut node.argument).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::ParenthesizedExpression(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::AssignmentPattern(node) => {
            if walk_expression_mut(v, &mut node.right).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::ClassExpression(node) => {
            if let Some(ref mut sc) = node.super_class {
                if walk_expression_mut(v, sc).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Expression::JSXElement(node) => {
            if walk_jsx_mut(v, &mut node.opening_element.attributes, &mut node.children).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::JSXFragment(node) => {
            if walk_jsx_children_mut(v, &mut node.children).is_stop() {
                return VisitResult::Stop;
            }
        }
        // TS/Flow wrappers — traverse inner expression
        Expression::TSAsExpression(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::TSSatisfiesExpression(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::TSNonNullExpression(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::TSTypeAssertion(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::TSInstantiationExpression(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        Expression::TypeCastExpression(node) => {
            if walk_expression_mut(v, &mut node.expression).is_stop() {
                return VisitResult::Stop;
            }
        }
        // Leaf nodes
        Expression::StringLiteral(_)
        | Expression::NumericLiteral(_)
        | Expression::BooleanLiteral(_)
        | Expression::NullLiteral(_)
        | Expression::BigIntLiteral(_)
        | Expression::RegExpLiteral(_)
        | Expression::MetaProperty(_)
        | Expression::PrivateName(_)
        | Expression::Super(_)
        | Expression::Import(_)
        | Expression::ThisExpression(_) => {}
    }
    VisitResult::Continue
}

fn walk_jsx_mut(
    v: &mut impl MutVisitor,
    attrs: &mut [crate::jsx::JSXAttributeItem],
    children: &mut [crate::jsx::JSXChild],
) -> VisitResult {
    for attr in attrs.iter_mut() {
        match attr {
            crate::jsx::JSXAttributeItem::JSXAttribute(a) => {
                if let Some(ref mut val) = a.value {
                    match val {
                        crate::jsx::JSXAttributeValue::JSXExpressionContainer(c) => {
                            if let crate::jsx::JSXExpressionContainerExpr::Expression(ref mut e) =
                                c.expression
                            {
                                if walk_expression_mut(v, e).is_stop() {
                                    return VisitResult::Stop;
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
            crate::jsx::JSXAttributeItem::JSXSpreadAttribute(s) => {
                if walk_expression_mut(v, &mut s.argument).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
    }
    walk_jsx_children_mut(v, children)
}

fn walk_jsx_children_mut(
    v: &mut impl MutVisitor,
    children: &mut [crate::jsx::JSXChild],
) -> VisitResult {
    for child in children.iter_mut() {
        match child {
            crate::jsx::JSXChild::JSXElement(el) => {
                if walk_jsx_mut(v, &mut el.opening_element.attributes, &mut el.children).is_stop() {
                    return VisitResult::Stop;
                }
            }
            crate::jsx::JSXChild::JSXFragment(f) => {
                if walk_jsx_children_mut(v, &mut f.children).is_stop() {
                    return VisitResult::Stop;
                }
            }
            crate::jsx::JSXChild::JSXExpressionContainer(c) => {
                if let crate::jsx::JSXExpressionContainerExpr::Expression(ref mut e) = c.expression
                {
                    if walk_expression_mut(v, e).is_stop() {
                        return VisitResult::Stop;
                    }
                }
            }
            crate::jsx::JSXChild::JSXSpreadChild(s) => {
                if walk_expression_mut(v, &mut s.expression).is_stop() {
                    return VisitResult::Stop;
                }
            }
            _ => {}
        }
    }
    VisitResult::Continue
}

// ---- Private helper walk-mut functions ----

fn walk_variable_declaration_mut(
    v: &mut impl MutVisitor,
    decl: &mut VariableDeclaration,
) -> VisitResult {
    for declarator in decl.declarations.iter_mut() {
        if let Some(ref mut init) = declarator.init {
            if walk_expression_mut(v, init).is_stop() {
                return VisitResult::Stop;
            }
        }
    }
    VisitResult::Continue
}

fn walk_declaration_mut(v: &mut impl MutVisitor, decl: &mut Declaration) -> VisitResult {
    match decl {
        Declaration::FunctionDeclaration(node) => {
            for s in node.body.body.iter_mut() {
                if walk_statement_mut(v, s).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        Declaration::VariableDeclaration(node) => {
            if walk_variable_declaration_mut(v, node).is_stop() {
                return VisitResult::Stop;
            }
        }
        Declaration::ClassDeclaration(node) => {
            if let Some(ref mut sc) = node.super_class {
                if walk_expression_mut(v, sc).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        _ => {}
    }
    VisitResult::Continue
}

fn walk_export_default_decl_mut(
    v: &mut impl MutVisitor,
    decl: &mut ExportDefaultDecl,
) -> VisitResult {
    match decl {
        ExportDefaultDecl::FunctionDeclaration(node) => {
            for s in node.body.body.iter_mut() {
                if walk_statement_mut(v, s).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        ExportDefaultDecl::Expression(expr) => {
            if walk_expression_mut(v, expr).is_stop() {
                return VisitResult::Stop;
            }
        }
        ExportDefaultDecl::ClassDeclaration(node) => {
            if let Some(ref mut sc) = node.super_class {
                if walk_expression_mut(v, sc).is_stop() {
                    return VisitResult::Stop;
                }
            }
        }
        ExportDefaultDecl::EnumDeclaration(_) => {
            // Flow enum declarations are opaque — nothing to walk
        }
    }
    VisitResult::Continue
}

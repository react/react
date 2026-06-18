// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Validates that important source locations from the original code are preserved
//! in the generated AST. This ensures that Istanbul coverage instrumentation can
//! properly map back to the original source code.
//!
//! This validation is test-only, enabled via `@validateSourceLocations` pragma.
//!
//! Analogous to TS `ValidateSourceLocations.ts`.

use std::collections::{HashMap, HashSet};

use react_compiler_ast::common::SourceLocation as AstSourceLocation;
use react_compiler_ast::expressions::{
    ArrowFunctionBody, ArrowFunctionExpression, Expression, FunctionExpression,
    ObjectExpressionProperty,
};
use react_compiler_ast::patterns::PatternLike;
use react_compiler_ast::statements::{ForInOfLeft, ForInit, Statement, VariableDeclaration};
use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory, Position as DiagPosition,
    SourceLocation as DiagSourceLocation,
};
use react_compiler_hir::environment::Environment;
use react_compiler_lowering::FunctionNode;
use react_compiler_reactive_scopes::codegen_reactive_function::CodegenFunction;

/// Validate that important source locations are preserved in the generated AST.
pub fn validate_source_locations(
    func: &FunctionNode<'_>,
    codegen: &CodegenFunction,
    env: &mut Environment,
) {
    // Step 1: Collect important locations from the original source
    let important_original = collect_important_original_locations(func);

    // Step 2: Collect all locations from the generated AST
    let mut generated = HashMap::<String, HashSet<String>>::new();
    collect_generated_from_block(&codegen.body.body, &mut generated);
    for outlined in &codegen.outlined {
        collect_generated_from_block(&outlined.func.body.body, &mut generated);
    }

    // Step 3: Validate that all important locations are preserved
    let strict_node_types: HashSet<&str> =
        ["VariableDeclaration", "VariableDeclarator", "Identifier"]
            .into_iter()
            .collect();

    // Sort entries by source position to match TS output order
    // (JS Map preserves insertion order, which is AST traversal order = source order)
    let mut sorted_entries: Vec<&ImportantLocation> = important_original.values().collect();
    sorted_entries.sort_by(|a, b| {
        a.loc
            .start
            .line
            .cmp(&b.loc.start.line)
            .then(a.loc.start.column.cmp(&b.loc.start.column))
            // Outer nodes (larger spans) before inner nodes, matching depth-first traversal
            .then(b.loc.end.line.cmp(&a.loc.end.line))
            .then(b.loc.end.column.cmp(&a.loc.end.column))
    });

    for entry in &sorted_entries {
        let generated_node_types = generated.get(&entry.key);

        if generated_node_types.is_none() {
            // Location is completely missing
            let mut node_types_str: Vec<&str> = entry.node_types.iter().copied().collect();
            node_types_str.sort();
            report_missing_location(env, &entry.loc, &node_types_str.join(", "));
        } else {
            let generated_node_types = generated_node_types.unwrap();
            // Location exists, check each strict node type
            for &node_type in &entry.node_types {
                if strict_node_types.contains(node_type)
                    && !generated_node_types.contains(node_type)
                {
                    // For strict node types, the specific node type must be present.
                    // Check if any generated node type is also an important original node type.
                    let has_valid_node_type = generated_node_types
                        .iter()
                        .any(|gen_type| entry.node_types.contains(gen_type.as_str()));

                    if has_valid_node_type {
                        report_missing_location(env, &entry.loc, node_type);
                    } else {
                        report_wrong_node_type(env, &entry.loc, node_type, generated_node_types);
                    }
                }
            }
        }
    }
}

// ---- Types ----

struct ImportantLocation {
    key: String,
    loc: AstSourceLocation,
    node_types: HashSet<&'static str>,
}

// ---- Location key ----

fn location_key(loc: &AstSourceLocation) -> String {
    format!(
        "{}:{}-{}:{}",
        loc.start.line, loc.start.column, loc.end.line, loc.end.column
    )
}

// ---- AST to diagnostics SourceLocation conversion ----

fn ast_to_diag_loc(loc: &AstSourceLocation) -> DiagSourceLocation {
    DiagSourceLocation {
        start: DiagPosition {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: DiagPosition {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
    }
}

// ---- Error reporting ----

fn report_missing_location(env: &mut Environment, loc: &AstSourceLocation, node_type: &str) {
    let diag_loc = ast_to_diag_loc(loc);
    env.record_diagnostic(
        CompilerDiagnostic::new(
            ErrorCategory::Todo,
            "Important source location missing in generated code",
            Some(format!(
                "Source location for {} is missing in the generated output. \
                 This can cause coverage instrumentation to fail to track this \
                 code properly, resulting in inaccurate coverage reports.",
                node_type
            )),
        )
        .with_detail(CompilerDiagnosticDetail::Error {
            loc: Some(diag_loc),
            message: None,
            identifier_name: None,
        }),
    );
}

fn report_wrong_node_type(
    env: &mut Environment,
    loc: &AstSourceLocation,
    expected_type: &str,
    actual_types: &HashSet<String>,
) {
    let diag_loc = ast_to_diag_loc(loc);
    let mut actual: Vec<&str> = actual_types.iter().map(|s| s.as_str()).collect();
    actual.sort();
    env.record_diagnostic(
        CompilerDiagnostic::new(
            ErrorCategory::Todo,
            "Important source location has wrong node type in generated code",
            Some(format!(
                "Source location for {} exists in the generated output but with wrong \
                 node type(s): {}. This can cause coverage instrumentation to fail to \
                 track this code properly, resulting in inaccurate coverage reports.",
                expected_type,
                actual.join(", ")
            )),
        )
        .with_detail(CompilerDiagnosticDetail::Error {
            loc: Some(diag_loc),
            message: None,
            identifier_name: None,
        }),
    );
}

// ---- Important type checking ----

/// Returns the Babel type name if this statement variant is an "important instrumented type".
fn important_statement_type(stmt: &Statement) -> Option<&'static str> {
    match stmt {
        Statement::ExpressionStatement(_) => Some("ExpressionStatement"),
        Statement::BreakStatement(_) => Some("BreakStatement"),
        Statement::ContinueStatement(_) => Some("ContinueStatement"),
        Statement::ReturnStatement(_) => Some("ReturnStatement"),
        Statement::ThrowStatement(_) => Some("ThrowStatement"),
        Statement::TryStatement(_) => Some("TryStatement"),
        Statement::IfStatement(_) => Some("IfStatement"),
        Statement::ForStatement(_) => Some("ForStatement"),
        Statement::ForInStatement(_) => Some("ForInStatement"),
        Statement::ForOfStatement(_) => Some("ForOfStatement"),
        Statement::WhileStatement(_) => Some("WhileStatement"),
        Statement::DoWhileStatement(_) => Some("DoWhileStatement"),
        Statement::SwitchStatement(_) => Some("SwitchStatement"),
        Statement::WithStatement(_) => Some("WithStatement"),
        Statement::FunctionDeclaration(_) => Some("FunctionDeclaration"),
        Statement::LabeledStatement(_) => Some("LabeledStatement"),
        Statement::VariableDeclaration(_) => Some("VariableDeclaration"),
        _ => None,
    }
}

/// Returns the Babel type name if this expression variant is an "important instrumented type".
fn important_expression_type(expr: &Expression) -> Option<&'static str> {
    match expr {
        Expression::ArrowFunctionExpression(_) => Some("ArrowFunctionExpression"),
        Expression::FunctionExpression(_) => Some("FunctionExpression"),
        Expression::ConditionalExpression(_) => Some("ConditionalExpression"),
        Expression::LogicalExpression(_) => Some("LogicalExpression"),
        Expression::Identifier(_) => Some("Identifier"),
        Expression::AssignmentPattern(_) => Some("AssignmentPattern"),
        _ => None,
    }
}

// ---- Manual memoization check ----

fn is_manual_memoization(expr: &Expression) -> bool {
    if let Expression::CallExpression(call) = expr {
        match call.callee.as_ref() {
            Expression::Identifier(id) => id.name == "useMemo" || id.name == "useCallback",
            Expression::MemberExpression(mem) => {
                if let (Expression::Identifier(obj), Expression::Identifier(prop)) =
                    (mem.object.as_ref(), &*mem.property)
                {
                    obj.name == "React" && (prop.name == "useMemo" || prop.name == "useCallback")
                } else {
                    false
                }
            }
            _ => false,
        }
    } else {
        false
    }
}

// ============================================================================
// Step 1: Collect important original locations
// ============================================================================

fn collect_important_original_locations(
    func: &FunctionNode<'_>,
) -> HashMap<String, ImportantLocation> {
    let mut locations = HashMap::new();

    // Note: TS uses func.traverse() which visits DESCENDANTS only, not the root
    // function node itself. So we don't record the root function as important.
    match func {
        FunctionNode::FunctionDeclaration(f) => {
            if let Some(id) = &f.id {
                record_important("Identifier", &id.base.loc, &mut locations);
            }
            for param in &f.params {
                collect_original_pattern(param, &mut locations);
            }
            collect_original_block(&f.body.body, false, &mut locations);
        }
        FunctionNode::FunctionExpression(f) => {
            if let Some(id) = &f.id {
                record_important("Identifier", &id.base.loc, &mut locations);
            }
            for param in &f.params {
                collect_original_pattern(param, &mut locations);
            }
            collect_original_block(&f.body.body, false, &mut locations);
        }
        FunctionNode::ArrowFunctionExpression(f) => {
            for param in &f.params {
                collect_original_pattern(param, &mut locations);
            }
            match f.body.as_ref() {
                ArrowFunctionBody::BlockStatement(block) => {
                    collect_original_block(&block.body, false, &mut locations);
                }
                ArrowFunctionBody::Expression(expr) => {
                    collect_original_expression(expr, &mut locations);
                }
            }
        }
    }

    locations
}

fn record_important(
    node_type: &'static str,
    loc: &Option<AstSourceLocation>,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    if let Some(loc) = loc {
        let key = location_key(loc);
        if let Some(existing) = locations.get_mut(&key) {
            existing.node_types.insert(node_type);
        } else {
            let mut node_types = HashSet::new();
            node_types.insert(node_type);
            locations.insert(
                key.clone(),
                ImportantLocation {
                    key,
                    loc: loc.clone(),
                    node_types,
                },
            );
        }
    }
}

fn collect_original_block(
    stmts: &[Statement],
    in_single_return_arrow: bool,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    for stmt in stmts {
        collect_original_statement(stmt, in_single_return_arrow, locations);
    }
}

fn collect_original_statement(
    stmt: &Statement,
    in_single_return_arrow: bool,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    // Record this statement if it's an important type
    if let Some(type_name) = important_statement_type(stmt) {
        // Skip return statements inside arrow functions that will be simplified
        // to expression body: () => { return expr } -> () => expr
        if type_name == "ReturnStatement" && in_single_return_arrow {
            if let Statement::ReturnStatement(ret) = stmt {
                if ret.argument.is_some() {
                    // Skip recording, but still recurse into children
                    if let Some(arg) = &ret.argument {
                        collect_original_expression(arg, locations);
                    }
                    return;
                }
            }
        }

        // Skip manual memoization
        if type_name == "ExpressionStatement" {
            if let Statement::ExpressionStatement(expr_stmt) = stmt {
                if is_manual_memoization(&expr_stmt.expression) {
                    // Still recurse into children
                    collect_original_expression(&expr_stmt.expression, locations);
                    return;
                }
            }
        }

        let base_loc = statement_loc(stmt);
        record_important(type_name, base_loc, locations);
    }

    // Recurse into children
    match stmt {
        Statement::BlockStatement(node) => {
            collect_original_block(&node.body, false, locations);
        }
        Statement::ReturnStatement(node) => {
            if let Some(arg) = &node.argument {
                collect_original_expression(arg, locations);
            }
        }
        Statement::ExpressionStatement(node) => {
            collect_original_expression(&node.expression, locations);
        }
        Statement::IfStatement(node) => {
            collect_original_expression(&node.test, locations);
            collect_original_statement(&node.consequent, false, locations);
            if let Some(alt) = &node.alternate {
                collect_original_statement(alt, false, locations);
            }
        }
        Statement::ForStatement(node) => {
            if let Some(init) = &node.init {
                match init.as_ref() {
                    ForInit::VariableDeclaration(decl) => {
                        collect_original_var_declaration(decl, locations);
                    }
                    ForInit::Expression(expr) => {
                        collect_original_expression(expr, locations);
                    }
                }
            }
            if let Some(test) = &node.test {
                collect_original_expression(test, locations);
            }
            if let Some(update) = &node.update {
                collect_original_expression(update, locations);
            }
            collect_original_statement(&node.body, false, locations);
        }
        Statement::WhileStatement(node) => {
            collect_original_expression(&node.test, locations);
            collect_original_statement(&node.body, false, locations);
        }
        Statement::DoWhileStatement(node) => {
            collect_original_statement(&node.body, false, locations);
            collect_original_expression(&node.test, locations);
        }
        Statement::ForInStatement(node) => {
            if let ForInOfLeft::Pattern(pat) = node.left.as_ref() {
                collect_original_pattern(pat, locations);
            }
            collect_original_expression(&node.right, locations);
            collect_original_statement(&node.body, false, locations);
        }
        Statement::ForOfStatement(node) => {
            if let ForInOfLeft::Pattern(pat) = node.left.as_ref() {
                collect_original_pattern(pat, locations);
            }
            collect_original_expression(&node.right, locations);
            collect_original_statement(&node.body, false, locations);
        }
        Statement::SwitchStatement(node) => {
            collect_original_expression(&node.discriminant, locations);
            for case in &node.cases {
                // SwitchCase is an important type
                record_important("SwitchCase", &case.base.loc, locations);
                if let Some(test) = &case.test {
                    collect_original_expression(test, locations);
                }
                collect_original_block(&case.consequent, false, locations);
            }
        }
        Statement::ThrowStatement(node) => {
            collect_original_expression(&node.argument, locations);
        }
        Statement::TryStatement(node) => {
            collect_original_block(&node.block.body, false, locations);
            if let Some(handler) = &node.handler {
                if let Some(param) = &handler.param {
                    collect_original_pattern(param, locations);
                }
                collect_original_block(&handler.body.body, false, locations);
            }
            if let Some(finalizer) = &node.finalizer {
                collect_original_block(&finalizer.body, false, locations);
            }
        }
        Statement::LabeledStatement(node) => {
            // Label identifier
            record_important("Identifier", &node.label.base.loc, locations);
            collect_original_statement(&node.body, false, locations);
        }
        Statement::VariableDeclaration(node) => {
            collect_original_var_declaration(node, locations);
        }
        Statement::FunctionDeclaration(node) => {
            if let Some(id) = &node.id {
                record_important("Identifier", &id.base.loc, locations);
            }
            for param in &node.params {
                collect_original_pattern(param, locations);
            }
            collect_original_block(&node.body.body, false, locations);
        }
        Statement::WithStatement(node) => {
            collect_original_expression(&node.object, locations);
            collect_original_statement(&node.body, false, locations);
        }
        // Non-runtime statements: no children to recurse into
        _ => {}
    }
}

fn collect_original_var_declaration(
    decl: &VariableDeclaration,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    for declarator in &decl.declarations {
        // VariableDeclarator is an important type
        record_important("VariableDeclarator", &declarator.base.loc, locations);
        collect_original_pattern(&declarator.id, locations);
        if let Some(init) = &declarator.init {
            collect_original_expression(init, locations);
        }
    }
}

fn collect_original_expression(
    expr: &Expression,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    // Record this expression if it's an important type
    if let Some(type_name) = important_expression_type(expr) {
        // Skip manual memoization
        if !is_manual_memoization(expr) {
            let base_loc = expression_loc(expr);
            record_important(type_name, base_loc, locations);
        }
    }

    // Recurse into children
    match expr {
        Expression::Identifier(_) => {
            // Already recorded above if important. No children.
        }
        Expression::CallExpression(node) => {
            collect_original_expression(&node.callee, locations);
            for arg in &node.arguments {
                collect_original_expression(arg, locations);
            }
        }
        Expression::MemberExpression(node) => {
            collect_original_expression(&node.object, locations);
            if node.computed {
                collect_original_expression(&node.property, locations);
            } else {
                // Non-computed property is an Identifier - record it
                if let Expression::Identifier(id) = node.property.as_ref() {
                    record_important("Identifier", &id.base.loc, locations);
                }
            }
        }
        Expression::OptionalCallExpression(node) => {
            collect_original_expression(&node.callee, locations);
            for arg in &node.arguments {
                collect_original_expression(arg, locations);
            }
        }
        Expression::OptionalMemberExpression(node) => {
            collect_original_expression(&node.object, locations);
            if node.computed {
                collect_original_expression(&node.property, locations);
            } else if let Expression::Identifier(id) = node.property.as_ref() {
                record_important("Identifier", &id.base.loc, locations);
            }
        }
        Expression::BinaryExpression(node) => {
            collect_original_expression(&node.left, locations);
            collect_original_expression(&node.right, locations);
        }
        Expression::LogicalExpression(node) => {
            collect_original_expression(&node.left, locations);
            collect_original_expression(&node.right, locations);
        }
        Expression::UnaryExpression(node) => {
            collect_original_expression(&node.argument, locations);
        }
        Expression::UpdateExpression(node) => {
            collect_original_expression(&node.argument, locations);
        }
        Expression::ConditionalExpression(node) => {
            collect_original_expression(&node.test, locations);
            collect_original_expression(&node.consequent, locations);
            collect_original_expression(&node.alternate, locations);
        }
        Expression::AssignmentExpression(node) => {
            collect_original_pattern(&node.left, locations);
            collect_original_expression(&node.right, locations);
        }
        Expression::SequenceExpression(node) => {
            for e in &node.expressions {
                collect_original_expression(e, locations);
            }
        }
        Expression::ArrowFunctionExpression(node) => {
            collect_original_arrow_children(node, locations);
        }
        Expression::FunctionExpression(node) => {
            collect_original_fn_expr_children(node, locations);
        }
        Expression::ObjectExpression(node) => {
            for prop in &node.properties {
                match prop {
                    ObjectExpressionProperty::ObjectProperty(p) => {
                        if p.computed {
                            collect_original_expression(&p.key, locations);
                        } else if let Expression::Identifier(id) = p.key.as_ref() {
                            record_important("Identifier", &id.base.loc, locations);
                        }
                        collect_original_expression(&p.value, locations);
                    }
                    ObjectExpressionProperty::ObjectMethod(m) => {
                        // ObjectMethod is an important type
                        record_important("ObjectMethod", &m.base.loc, locations);
                        for param in &m.params {
                            collect_original_pattern(param, locations);
                        }
                        collect_original_block(&m.body.body, false, locations);
                    }
                    ObjectExpressionProperty::SpreadElement(s) => {
                        collect_original_expression(&s.argument, locations);
                    }
                }
            }
        }
        Expression::ArrayExpression(node) => {
            for elem in node.elements.iter().flatten() {
                collect_original_expression(elem, locations);
            }
        }
        Expression::NewExpression(node) => {
            collect_original_expression(&node.callee, locations);
            for arg in &node.arguments {
                collect_original_expression(arg, locations);
            }
        }
        Expression::TemplateLiteral(node) => {
            for e in &node.expressions {
                collect_original_expression(e, locations);
            }
        }
        Expression::TaggedTemplateExpression(node) => {
            collect_original_expression(&node.tag, locations);
            for e in &node.quasi.expressions {
                collect_original_expression(e, locations);
            }
        }
        Expression::AwaitExpression(node) => {
            collect_original_expression(&node.argument, locations);
        }
        Expression::YieldExpression(node) => {
            if let Some(arg) = &node.argument {
                collect_original_expression(arg, locations);
            }
        }
        Expression::SpreadElement(node) => {
            collect_original_expression(&node.argument, locations);
        }
        Expression::ParenthesizedExpression(node) => {
            collect_original_expression(&node.expression, locations);
        }
        Expression::AssignmentPattern(node) => {
            collect_original_pattern(&node.left, locations);
            collect_original_expression(&node.right, locations);
        }
        Expression::ClassExpression(node) => {
            if let Some(sc) = &node.super_class {
                collect_original_expression(sc, locations);
            }
        }
        // TS/Flow wrappers — traverse inner expression
        Expression::TSAsExpression(node) => {
            collect_original_expression(&node.expression, locations);
        }
        Expression::TSSatisfiesExpression(node) => {
            collect_original_expression(&node.expression, locations);
        }
        Expression::TSNonNullExpression(node) => {
            collect_original_expression(&node.expression, locations);
        }
        Expression::TSTypeAssertion(node) => {
            collect_original_expression(&node.expression, locations);
        }
        Expression::TSInstantiationExpression(node) => {
            collect_original_expression(&node.expression, locations);
        }
        Expression::TypeCastExpression(node) => {
            collect_original_expression(&node.expression, locations);
        }
        // Leaf nodes and JSX
        _ => {}
    }
}

fn collect_original_arrow_children(
    arrow: &ArrowFunctionExpression,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    for param in &arrow.params {
        collect_original_pattern(param, locations);
    }
    match arrow.body.as_ref() {
        ArrowFunctionBody::BlockStatement(block) => {
            let is_single_return = block.body.len() == 1 && block.directives.is_empty();
            collect_original_block(&block.body, is_single_return, locations);
        }
        ArrowFunctionBody::Expression(expr) => {
            collect_original_expression(expr, locations);
        }
    }
}

fn collect_original_fn_expr_children(
    func: &FunctionExpression,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    if let Some(id) = &func.id {
        record_important("Identifier", &id.base.loc, locations);
    }
    for param in &func.params {
        collect_original_pattern(param, locations);
    }
    collect_original_block(&func.body.body, false, locations);
}

fn collect_original_pattern(
    pattern: &PatternLike,
    locations: &mut HashMap<String, ImportantLocation>,
) {
    match pattern {
        PatternLike::Identifier(id) => {
            record_important("Identifier", &id.base.loc, locations);
        }
        PatternLike::AssignmentPattern(ap) => {
            record_important("AssignmentPattern", &ap.base.loc, locations);
            collect_original_pattern(&ap.left, locations);
            collect_original_expression(&ap.right, locations);
        }
        PatternLike::ObjectPattern(op) => {
            for prop in &op.properties {
                match prop {
                    react_compiler_ast::patterns::ObjectPatternProperty::ObjectProperty(p) => {
                        if p.computed {
                            collect_original_expression(&p.key, locations);
                        } else if let Expression::Identifier(id) = p.key.as_ref() {
                            record_important("Identifier", &id.base.loc, locations);
                        }
                        collect_original_pattern(&p.value, locations);
                    }
                    react_compiler_ast::patterns::ObjectPatternProperty::RestElement(r) => {
                        collect_original_pattern(&r.argument, locations);
                    }
                }
            }
        }
        PatternLike::ArrayPattern(ap) => {
            for elem in ap.elements.iter().flatten() {
                collect_original_pattern(elem, locations);
            }
        }
        PatternLike::RestElement(r) => {
            collect_original_pattern(&r.argument, locations);
        }
        PatternLike::MemberExpression(m) => {
            collect_original_expression(&Expression::MemberExpression(m.clone()), locations);
        }
        PatternLike::TSAsExpression(_)
        | PatternLike::TSSatisfiesExpression(_)
        | PatternLike::TSNonNullExpression(_)
        | PatternLike::TSTypeAssertion(_)
        | PatternLike::TypeCastExpression(_) => {}
    }
}

// ---- Helpers to get loc from statement/expression ----

fn statement_loc(stmt: &Statement) -> &Option<AstSourceLocation> {
    match stmt {
        Statement::BlockStatement(n) => &n.base.loc,
        Statement::ReturnStatement(n) => &n.base.loc,
        Statement::IfStatement(n) => &n.base.loc,
        Statement::ForStatement(n) => &n.base.loc,
        Statement::WhileStatement(n) => &n.base.loc,
        Statement::DoWhileStatement(n) => &n.base.loc,
        Statement::ForInStatement(n) => &n.base.loc,
        Statement::ForOfStatement(n) => &n.base.loc,
        Statement::SwitchStatement(n) => &n.base.loc,
        Statement::ThrowStatement(n) => &n.base.loc,
        Statement::TryStatement(n) => &n.base.loc,
        Statement::BreakStatement(n) => &n.base.loc,
        Statement::ContinueStatement(n) => &n.base.loc,
        Statement::LabeledStatement(n) => &n.base.loc,
        Statement::ExpressionStatement(n) => &n.base.loc,
        Statement::EmptyStatement(n) => &n.base.loc,
        Statement::DebuggerStatement(n) => &n.base.loc,
        Statement::WithStatement(n) => &n.base.loc,
        Statement::VariableDeclaration(n) => &n.base.loc,
        Statement::FunctionDeclaration(n) => &n.base.loc,
        Statement::ClassDeclaration(n) => &n.base.loc,
        Statement::ImportDeclaration(n) => &n.base.loc,
        Statement::ExportNamedDeclaration(n) => &n.base.loc,
        Statement::ExportDefaultDeclaration(n) => &n.base.loc,
        Statement::ExportAllDeclaration(n) => &n.base.loc,
        Statement::TSEnumDeclaration(n) => &n.base.loc,
        Statement::EnumDeclaration(n) => &n.base.loc,
        Statement::Unknown(n) => &n.base().loc,
    }
}

fn expression_loc(expr: &Expression) -> &Option<AstSourceLocation> {
    match expr {
        Expression::Identifier(n) => &n.base.loc,
        Expression::StringLiteral(n) => &n.base.loc,
        Expression::NumericLiteral(n) => &n.base.loc,
        Expression::BooleanLiteral(n) => &n.base.loc,
        Expression::NullLiteral(n) => &n.base.loc,
        Expression::BigIntLiteral(n) => &n.base.loc,
        Expression::RegExpLiteral(n) => &n.base.loc,
        Expression::CallExpression(n) => &n.base.loc,
        Expression::MemberExpression(n) => &n.base.loc,
        Expression::OptionalCallExpression(n) => &n.base.loc,
        Expression::OptionalMemberExpression(n) => &n.base.loc,
        Expression::BinaryExpression(n) => &n.base.loc,
        Expression::LogicalExpression(n) => &n.base.loc,
        Expression::UnaryExpression(n) => &n.base.loc,
        Expression::UpdateExpression(n) => &n.base.loc,
        Expression::ConditionalExpression(n) => &n.base.loc,
        Expression::AssignmentExpression(n) => &n.base.loc,
        Expression::SequenceExpression(n) => &n.base.loc,
        Expression::ArrowFunctionExpression(n) => &n.base.loc,
        Expression::FunctionExpression(n) => &n.base.loc,
        Expression::ObjectExpression(n) => &n.base.loc,
        Expression::ArrayExpression(n) => &n.base.loc,
        Expression::NewExpression(n) => &n.base.loc,
        Expression::TemplateLiteral(n) => &n.base.loc,
        Expression::TaggedTemplateExpression(n) => &n.base.loc,
        Expression::AwaitExpression(n) => &n.base.loc,
        Expression::YieldExpression(n) => &n.base.loc,
        Expression::SpreadElement(n) => &n.base.loc,
        Expression::MetaProperty(n) => &n.base.loc,
        Expression::ClassExpression(n) => &n.base.loc,
        Expression::PrivateName(n) => &n.base.loc,
        Expression::Super(n) => &n.base.loc,
        Expression::Import(n) => &n.base.loc,
        Expression::ThisExpression(n) => &n.base.loc,
        Expression::ParenthesizedExpression(n) => &n.base.loc,
        Expression::AssignmentPattern(n) => &n.base.loc,
        Expression::JSXElement(n) => &n.base.loc,
        Expression::JSXFragment(n) => &n.base.loc,
        Expression::TSAsExpression(n) => &n.base.loc,
        Expression::TSSatisfiesExpression(n) => &n.base.loc,
        Expression::TSNonNullExpression(n) => &n.base.loc,
        Expression::TSTypeAssertion(n) => &n.base.loc,
        Expression::TSInstantiationExpression(n) => &n.base.loc,
        Expression::TypeCastExpression(n) => &n.base.loc,
    }
}

// ============================================================================
// Step 2: Collect generated locations (ALL node types, not just important ones)
// ============================================================================

fn collect_generated_from_block(
    stmts: &[Statement],
    locations: &mut HashMap<String, HashSet<String>>,
) {
    for stmt in stmts {
        collect_generated_statement(stmt, locations);
    }
}

fn record_generated(
    type_name: &str,
    loc: &Option<AstSourceLocation>,
    locations: &mut HashMap<String, HashSet<String>>,
) {
    if let Some(loc) = loc {
        let key = location_key(loc);
        locations
            .entry(key)
            .or_default()
            .insert(type_name.to_string());
    }
}

fn collect_generated_statement(stmt: &Statement, locations: &mut HashMap<String, HashSet<String>>) {
    // Record this statement's location
    let type_name = statement_type_name(stmt);
    record_generated(type_name, statement_loc(stmt), locations);

    // Recurse into children (same structure as original, but record ALL types)
    match stmt {
        Statement::BlockStatement(node) => {
            collect_generated_from_block(&node.body, locations);
        }
        Statement::ReturnStatement(node) => {
            if let Some(arg) = &node.argument {
                collect_generated_expression(arg, locations);
            }
        }
        Statement::ExpressionStatement(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        Statement::IfStatement(node) => {
            collect_generated_expression(&node.test, locations);
            collect_generated_statement(&node.consequent, locations);
            if let Some(alt) = &node.alternate {
                collect_generated_statement(alt, locations);
            }
        }
        Statement::ForStatement(node) => {
            if let Some(init) = &node.init {
                match init.as_ref() {
                    ForInit::VariableDeclaration(decl) => {
                        collect_generated_var_declaration(decl, locations);
                    }
                    ForInit::Expression(expr) => {
                        collect_generated_expression(expr, locations);
                    }
                }
            }
            if let Some(test) = &node.test {
                collect_generated_expression(test, locations);
            }
            if let Some(update) = &node.update {
                collect_generated_expression(update, locations);
            }
            collect_generated_statement(&node.body, locations);
        }
        Statement::WhileStatement(node) => {
            collect_generated_expression(&node.test, locations);
            collect_generated_statement(&node.body, locations);
        }
        Statement::DoWhileStatement(node) => {
            collect_generated_statement(&node.body, locations);
            collect_generated_expression(&node.test, locations);
        }
        Statement::ForInStatement(node) => {
            match node.left.as_ref() {
                ForInOfLeft::VariableDeclaration(decl) => {
                    collect_generated_var_declaration(decl, locations);
                }
                ForInOfLeft::Pattern(pat) => {
                    collect_generated_pattern(pat, locations);
                }
            }
            collect_generated_expression(&node.right, locations);
            collect_generated_statement(&node.body, locations);
        }
        Statement::ForOfStatement(node) => {
            match node.left.as_ref() {
                ForInOfLeft::VariableDeclaration(decl) => {
                    collect_generated_var_declaration(decl, locations);
                }
                ForInOfLeft::Pattern(pat) => {
                    collect_generated_pattern(pat, locations);
                }
            }
            collect_generated_expression(&node.right, locations);
            collect_generated_statement(&node.body, locations);
        }
        Statement::SwitchStatement(node) => {
            collect_generated_expression(&node.discriminant, locations);
            for case in &node.cases {
                record_generated("SwitchCase", &case.base.loc, locations);
                if let Some(test) = &case.test {
                    collect_generated_expression(test, locations);
                }
                collect_generated_from_block(&case.consequent, locations);
            }
        }
        Statement::ThrowStatement(node) => {
            collect_generated_expression(&node.argument, locations);
        }
        Statement::TryStatement(node) => {
            collect_generated_from_block(&node.block.body, locations);
            if let Some(handler) = &node.handler {
                if let Some(param) = &handler.param {
                    collect_generated_pattern(param, locations);
                }
                collect_generated_from_block(&handler.body.body, locations);
            }
            if let Some(finalizer) = &node.finalizer {
                collect_generated_from_block(&finalizer.body, locations);
            }
        }
        Statement::LabeledStatement(node) => {
            record_generated("Identifier", &node.label.base.loc, locations);
            collect_generated_statement(&node.body, locations);
        }
        Statement::VariableDeclaration(node) => {
            collect_generated_var_declaration(node, locations);
        }
        Statement::FunctionDeclaration(node) => {
            if let Some(id) = &node.id {
                record_generated("Identifier", &id.base.loc, locations);
            }
            for param in &node.params {
                collect_generated_pattern(param, locations);
            }
            collect_generated_from_block(&node.body.body, locations);
        }
        Statement::WithStatement(node) => {
            collect_generated_expression(&node.object, locations);
            collect_generated_statement(&node.body, locations);
        }
        Statement::ClassDeclaration(node) => {
            if let Some(id) = &node.id {
                record_generated("Identifier", &id.base.loc, locations);
            }
            if let Some(sc) = &node.super_class {
                collect_generated_expression(sc, locations);
            }
        }
        _ => {}
    }
}

fn collect_generated_var_declaration(
    decl: &VariableDeclaration,
    locations: &mut HashMap<String, HashSet<String>>,
) {
    for declarator in &decl.declarations {
        record_generated("VariableDeclarator", &declarator.base.loc, locations);
        collect_generated_pattern(&declarator.id, locations);
        if let Some(init) = &declarator.init {
            collect_generated_expression(init, locations);
        }
    }
}

fn collect_generated_expression(
    expr: &Expression,
    locations: &mut HashMap<String, HashSet<String>>,
) {
    let type_name = expression_type_name(expr);
    record_generated(type_name, expression_loc(expr), locations);

    match expr {
        Expression::Identifier(_) => {}
        Expression::CallExpression(node) => {
            collect_generated_expression(&node.callee, locations);
            for arg in &node.arguments {
                collect_generated_expression(arg, locations);
            }
        }
        Expression::MemberExpression(node) => {
            collect_generated_expression(&node.object, locations);
            collect_generated_expression(&node.property, locations);
        }
        Expression::OptionalCallExpression(node) => {
            collect_generated_expression(&node.callee, locations);
            for arg in &node.arguments {
                collect_generated_expression(arg, locations);
            }
        }
        Expression::OptionalMemberExpression(node) => {
            collect_generated_expression(&node.object, locations);
            collect_generated_expression(&node.property, locations);
        }
        Expression::BinaryExpression(node) => {
            collect_generated_expression(&node.left, locations);
            collect_generated_expression(&node.right, locations);
        }
        Expression::LogicalExpression(node) => {
            collect_generated_expression(&node.left, locations);
            collect_generated_expression(&node.right, locations);
        }
        Expression::UnaryExpression(node) => {
            collect_generated_expression(&node.argument, locations);
        }
        Expression::UpdateExpression(node) => {
            collect_generated_expression(&node.argument, locations);
        }
        Expression::ConditionalExpression(node) => {
            collect_generated_expression(&node.test, locations);
            collect_generated_expression(&node.consequent, locations);
            collect_generated_expression(&node.alternate, locations);
        }
        Expression::AssignmentExpression(node) => {
            collect_generated_pattern(&node.left, locations);
            collect_generated_expression(&node.right, locations);
        }
        Expression::SequenceExpression(node) => {
            for e in &node.expressions {
                collect_generated_expression(e, locations);
            }
        }
        Expression::ArrowFunctionExpression(node) => {
            for param in &node.params {
                collect_generated_pattern(param, locations);
            }
            match node.body.as_ref() {
                ArrowFunctionBody::BlockStatement(block) => {
                    collect_generated_from_block(&block.body, locations);
                }
                ArrowFunctionBody::Expression(e) => {
                    collect_generated_expression(e, locations);
                }
            }
        }
        Expression::FunctionExpression(node) => {
            if let Some(id) = &node.id {
                record_generated("Identifier", &id.base.loc, locations);
            }
            for param in &node.params {
                collect_generated_pattern(param, locations);
            }
            collect_generated_from_block(&node.body.body, locations);
        }
        Expression::ObjectExpression(node) => {
            for prop in &node.properties {
                match prop {
                    ObjectExpressionProperty::ObjectProperty(p) => {
                        collect_generated_expression(&p.key, locations);
                        collect_generated_expression(&p.value, locations);
                    }
                    ObjectExpressionProperty::ObjectMethod(m) => {
                        record_generated("ObjectMethod", &m.base.loc, locations);
                        for param in &m.params {
                            collect_generated_pattern(param, locations);
                        }
                        collect_generated_from_block(&m.body.body, locations);
                    }
                    ObjectExpressionProperty::SpreadElement(s) => {
                        collect_generated_expression(&s.argument, locations);
                    }
                }
            }
        }
        Expression::ArrayExpression(node) => {
            for elem in node.elements.iter().flatten() {
                collect_generated_expression(elem, locations);
            }
        }
        Expression::NewExpression(node) => {
            collect_generated_expression(&node.callee, locations);
            for arg in &node.arguments {
                collect_generated_expression(arg, locations);
            }
        }
        Expression::TemplateLiteral(node) => {
            for e in &node.expressions {
                collect_generated_expression(e, locations);
            }
        }
        Expression::TaggedTemplateExpression(node) => {
            collect_generated_expression(&node.tag, locations);
            for e in &node.quasi.expressions {
                collect_generated_expression(e, locations);
            }
        }
        Expression::AwaitExpression(node) => {
            collect_generated_expression(&node.argument, locations);
        }
        Expression::YieldExpression(node) => {
            if let Some(arg) = &node.argument {
                collect_generated_expression(arg, locations);
            }
        }
        Expression::SpreadElement(node) => {
            collect_generated_expression(&node.argument, locations);
        }
        Expression::ParenthesizedExpression(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        Expression::AssignmentPattern(node) => {
            collect_generated_pattern(&node.left, locations);
            collect_generated_expression(&node.right, locations);
        }
        Expression::ClassExpression(node) => {
            if let Some(sc) = &node.super_class {
                collect_generated_expression(sc, locations);
            }
        }
        Expression::TSAsExpression(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        Expression::TSSatisfiesExpression(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        Expression::TSNonNullExpression(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        Expression::TSTypeAssertion(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        Expression::TSInstantiationExpression(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        Expression::TypeCastExpression(node) => {
            collect_generated_expression(&node.expression, locations);
        }
        // Leaf nodes and JSX
        _ => {}
    }
}

fn collect_generated_pattern(
    pattern: &PatternLike,
    locations: &mut HashMap<String, HashSet<String>>,
) {
    match pattern {
        PatternLike::Identifier(id) => {
            record_generated("Identifier", &id.base.loc, locations);
        }
        PatternLike::AssignmentPattern(ap) => {
            record_generated("AssignmentPattern", &ap.base.loc, locations);
            collect_generated_pattern(&ap.left, locations);
            collect_generated_expression(&ap.right, locations);
        }
        PatternLike::ObjectPattern(op) => {
            record_generated("ObjectPattern", &op.base.loc, locations);
            for prop in &op.properties {
                match prop {
                    react_compiler_ast::patterns::ObjectPatternProperty::ObjectProperty(p) => {
                        record_generated("ObjectProperty", &p.base.loc, locations);
                        collect_generated_expression(&p.key, locations);
                        collect_generated_pattern(&p.value, locations);
                    }
                    react_compiler_ast::patterns::ObjectPatternProperty::RestElement(r) => {
                        record_generated("RestElement", &r.base.loc, locations);
                        collect_generated_pattern(&r.argument, locations);
                    }
                }
            }
        }
        PatternLike::ArrayPattern(ap) => {
            record_generated("ArrayPattern", &ap.base.loc, locations);
            for elem in ap.elements.iter().flatten() {
                collect_generated_pattern(elem, locations);
            }
        }
        PatternLike::RestElement(r) => {
            record_generated("RestElement", &r.base.loc, locations);
            collect_generated_pattern(&r.argument, locations);
        }
        PatternLike::MemberExpression(m) => {
            record_generated("MemberExpression", &m.base.loc, locations);
            collect_generated_expression(&m.object, locations);
            collect_generated_expression(&m.property, locations);
        }
        PatternLike::TSAsExpression(_)
        | PatternLike::TSSatisfiesExpression(_)
        | PatternLike::TSNonNullExpression(_)
        | PatternLike::TSTypeAssertion(_)
        | PatternLike::TypeCastExpression(_) => {}
    }
}

// ---- Type name helpers ----

fn statement_type_name(stmt: &Statement) -> &'static str {
    match stmt {
        Statement::BlockStatement(_) => "BlockStatement",
        Statement::ReturnStatement(_) => "ReturnStatement",
        Statement::IfStatement(_) => "IfStatement",
        Statement::ForStatement(_) => "ForStatement",
        Statement::WhileStatement(_) => "WhileStatement",
        Statement::DoWhileStatement(_) => "DoWhileStatement",
        Statement::ForInStatement(_) => "ForInStatement",
        Statement::ForOfStatement(_) => "ForOfStatement",
        Statement::SwitchStatement(_) => "SwitchStatement",
        Statement::ThrowStatement(_) => "ThrowStatement",
        Statement::TryStatement(_) => "TryStatement",
        Statement::BreakStatement(_) => "BreakStatement",
        Statement::ContinueStatement(_) => "ContinueStatement",
        Statement::LabeledStatement(_) => "LabeledStatement",
        Statement::ExpressionStatement(_) => "ExpressionStatement",
        Statement::EmptyStatement(_) => "EmptyStatement",
        Statement::DebuggerStatement(_) => "DebuggerStatement",
        Statement::WithStatement(_) => "WithStatement",
        Statement::VariableDeclaration(_) => "VariableDeclaration",
        Statement::FunctionDeclaration(_) => "FunctionDeclaration",
        Statement::ClassDeclaration(_) => "ClassDeclaration",
        Statement::ImportDeclaration(_) => "ImportDeclaration",
        Statement::ExportNamedDeclaration(_) => "ExportNamedDeclaration",
        Statement::ExportDefaultDeclaration(_) => "ExportDefaultDeclaration",
        Statement::ExportAllDeclaration(_) => "ExportAllDeclaration",
        Statement::TSEnumDeclaration(_) => "TSEnumDeclaration",
        Statement::EnumDeclaration(_) => "EnumDeclaration",
        // The real Babel `type` lives in the raw node, but this function
        // returns &'static str; "Unknown" is the static stand-in.
        Statement::Unknown(_) => "Unknown",
    }
}

fn expression_type_name(expr: &Expression) -> &'static str {
    match expr {
        Expression::Identifier(_) => "Identifier",
        Expression::StringLiteral(_) => "StringLiteral",
        Expression::NumericLiteral(_) => "NumericLiteral",
        Expression::BooleanLiteral(_) => "BooleanLiteral",
        Expression::NullLiteral(_) => "NullLiteral",
        Expression::BigIntLiteral(_) => "BigIntLiteral",
        Expression::RegExpLiteral(_) => "RegExpLiteral",
        Expression::CallExpression(_) => "CallExpression",
        Expression::MemberExpression(_) => "MemberExpression",
        Expression::OptionalCallExpression(_) => "OptionalCallExpression",
        Expression::OptionalMemberExpression(_) => "OptionalMemberExpression",
        Expression::BinaryExpression(_) => "BinaryExpression",
        Expression::LogicalExpression(_) => "LogicalExpression",
        Expression::UnaryExpression(_) => "UnaryExpression",
        Expression::UpdateExpression(_) => "UpdateExpression",
        Expression::ConditionalExpression(_) => "ConditionalExpression",
        Expression::AssignmentExpression(_) => "AssignmentExpression",
        Expression::SequenceExpression(_) => "SequenceExpression",
        Expression::ArrowFunctionExpression(_) => "ArrowFunctionExpression",
        Expression::FunctionExpression(_) => "FunctionExpression",
        Expression::ObjectExpression(_) => "ObjectExpression",
        Expression::ArrayExpression(_) => "ArrayExpression",
        Expression::NewExpression(_) => "NewExpression",
        Expression::TemplateLiteral(_) => "TemplateLiteral",
        Expression::TaggedTemplateExpression(_) => "TaggedTemplateExpression",
        Expression::AwaitExpression(_) => "AwaitExpression",
        Expression::YieldExpression(_) => "YieldExpression",
        Expression::SpreadElement(_) => "SpreadElement",
        Expression::MetaProperty(_) => "MetaProperty",
        Expression::ClassExpression(_) => "ClassExpression",
        Expression::PrivateName(_) => "PrivateName",
        Expression::Super(_) => "Super",
        Expression::Import(_) => "Import",
        Expression::ThisExpression(_) => "ThisExpression",
        Expression::ParenthesizedExpression(_) => "ParenthesizedExpression",
        Expression::AssignmentPattern(_) => "AssignmentPattern",
        Expression::JSXElement(_) => "JSXElement",
        Expression::JSXFragment(_) => "JSXFragment",
        Expression::TSAsExpression(_) => "TSAsExpression",
        Expression::TSSatisfiesExpression(_) => "TSSatisfiesExpression",
        Expression::TSNonNullExpression(_) => "TSNonNullExpression",
        Expression::TSTypeAssertion(_) => "TSTypeAssertion",
        Expression::TSInstantiationExpression(_) => "TSInstantiationExpression",
        Expression::TypeCastExpression(_) => "TypeCastExpression",
    }
}

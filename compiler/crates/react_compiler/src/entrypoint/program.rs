// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Main entrypoint for the React Compiler.
//!
//! This module is a port of Program.ts from the TypeScript compiler. It orchestrates
//! the compilation of a program by:
//! 1. Checking if compilation should be skipped
//! 2. Validating restricted imports
//! 3. Finding program-level suppressions
//! 4. Discovering functions to compile (components, hooks)
//! 5. Processing each function through the compilation pipeline
//! 6. Applying compiled functions back to the AST

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_ast::File;
use react_compiler_ast::Program;
use react_compiler_ast::common::BaseNode;
use react_compiler_ast::declarations::Declaration;
use react_compiler_ast::declarations::ExportDefaultDecl;
use react_compiler_ast::declarations::ExportDefaultDeclaration;
use react_compiler_ast::declarations::ImportSpecifier;
use react_compiler_ast::declarations::ModuleExportName;
use react_compiler_ast::expressions::*;
use react_compiler_ast::patterns::PatternLike;
use react_compiler_ast::scope::ScopeId;
use react_compiler_ast::scope::ScopeInfo;
use react_compiler_ast::statements::*;
use react_compiler_ast::visitor::AstWalker;
use react_compiler_ast::visitor::MutVisitor;
use react_compiler_ast::visitor::VisitResult;
use react_compiler_ast::visitor::Visitor;
use react_compiler_ast::visitor::walk_program_mut;
use react_compiler_diagnostics::CompilerError;
use react_compiler_diagnostics::CompilerErrorDetail;
use react_compiler_diagnostics::CompilerErrorOrDiagnostic;
use react_compiler_diagnostics::ErrorCategory;
use react_compiler_diagnostics::SourceLocation;
use react_compiler_hir::ReactFunctionType;
use react_compiler_hir::environment_config::EnvironmentConfig;
use react_compiler_lowering::FunctionNode;

use super::compile_result::BindingRenameInfo;
use super::compile_result::CodegenFunction;
use super::compile_result::CompileResult;
use super::compile_result::CompilerErrorDetailInfo;
use super::compile_result::CompilerErrorInfo;
use super::compile_result::CompilerErrorItemInfo;
use super::compile_result::DebugLogEntry;
use super::compile_result::LoggerEvent;
use super::compile_result::LoggerPosition;
use super::compile_result::LoggerSourceLocation;
use super::compile_result::LoggerSuggestionInfo;
use super::compile_result::LoggerSuggestionOp;
use super::compile_result::OrderedLogItem;
use super::imports::ProgramContext;
use super::imports::add_imports_to_program;
use super::imports::get_react_compiler_runtime_module;
use super::imports::validate_restricted_imports;
use super::pipeline;
use super::plugin_options::CompilerOutputMode;
use super::plugin_options::GatingConfig;
use super::plugin_options::PluginOptions;
use super::suppression::SuppressionRange;
use super::suppression::filter_suppressions_that_affect_function;
use super::suppression::find_program_suppressions;
use super::suppression::suppressions_to_compiler_error;

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------

const DEFAULT_ESLINT_SUPPRESSIONS: &[&str] =
    &["react-hooks/exhaustive-deps", "react-hooks/rules-of-hooks"];

/// Directives that opt a function into memoization
const OPT_IN_DIRECTIVES: &[&str] = &["use forget", "use memo"];

/// Directives that opt a function out of memoization
const OPT_OUT_DIRECTIVES: &[&str] = &["use no forget", "use no memo"];

// -----------------------------------------------------------------------
// Internal types
// -----------------------------------------------------------------------

/// A function found in the program that should be compiled
#[allow(dead_code)]
struct CompileSource<'a> {
    kind: CompileSourceKind,
    fn_node: FunctionNode<'a>,
    /// Location of this function in the AST for logging
    fn_name: Option<String>,
    fn_loc: Option<SourceLocation>,
    /// Original AST source location (with index and filename) for logger events.
    fn_ast_loc: Option<react_compiler_ast::common::SourceLocation>,
    fn_start: Option<u32>,
    fn_end: Option<u32>,
    fn_node_id: Option<u32>,
    fn_type: ReactFunctionType,
    /// Directives from the function body (for opt-in/opt-out checks)
    body_directives: Vec<Directive>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CompileSourceKind {
    Original,
    #[allow(dead_code)]
    Outlined,
}

// -----------------------------------------------------------------------
// Directive helpers
// -----------------------------------------------------------------------

/// Check if any opt-in directive is present in the given directives.
/// Returns the first matching directive, or None.
///
/// Also checks for dynamic gating directives (`use memo if(...)`)
fn try_find_directive_enabling_memoization<'a>(
    directives: &'a [Directive],
    opts: &PluginOptions,
) -> Result<Option<&'a Directive>, CompilerError> {
    // Check standard opt-in directives
    let opt_in = directives
        .iter()
        .find(|d| OPT_IN_DIRECTIVES.contains(&d.value.value.as_str()));
    if let Some(directive) = opt_in {
        return Ok(Some(directive));
    }

    // Check dynamic gating directives
    match find_directives_dynamic_gating(directives, opts) {
        Ok(Some(result)) => Ok(Some(result.directive)),
        Ok(None) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Check if any opt-out directive is present in the given directives.
fn find_directive_disabling_memoization<'a>(
    directives: &'a [Directive],
    opts: &PluginOptions,
) -> Option<&'a Directive> {
    if let Some(ref custom_directives) = opts.custom_opt_out_directives {
        directives
            .iter()
            .find(|d| custom_directives.contains(&d.value.value))
    } else {
        directives
            .iter()
            .find(|d| OPT_OUT_DIRECTIVES.contains(&d.value.value.as_str()))
    }
}

/// Result of a dynamic gating directive parse.
struct DynamicGatingResult<'a> {
    #[allow(dead_code)]
    directive: &'a Directive,
    gating: GatingConfig,
}

/// Check for dynamic gating directives like `use memo if(identifier)`.
/// Returns the directive and gating config if found, or an error if malformed.
fn find_directives_dynamic_gating<'a>(
    directives: &'a [Directive],
    opts: &PluginOptions,
) -> Result<Option<DynamicGatingResult<'a>>, CompilerError> {
    let dynamic_gating = match &opts.dynamic_gating {
        Some(dg) => dg,
        None => return Ok(None),
    };

    let mut errors: Vec<CompilerErrorDetail> = Vec::new();
    let mut matches: Vec<(&'a Directive, String)> = Vec::new();

    for directive in directives {
        if let Some(ident) = parse_dynamic_gating_directive(&directive.value.value) {
            if is_valid_identifier(ident) {
                matches.push((directive, ident.to_string()));
            } else {
                let mut detail = CompilerErrorDetail::new(
                    ErrorCategory::Gating,
                    "Dynamic gating directive is not a valid JavaScript identifier",
                )
                .with_description(format!("Found '{}'", directive.value.value));
                detail.loc = directive.base.loc.as_ref().map(convert_loc);
                errors.push(detail);
            }
        }
    }

    if !errors.is_empty() {
        let mut err = CompilerError::new();
        for e in errors {
            err.push_error_detail(e);
        }
        return Err(err);
    }

    if matches.len() > 1 {
        let names: Vec<String> = matches.iter().map(|(d, _)| d.value.value.clone()).collect();
        let mut err = CompilerError::new();
        let mut detail = CompilerErrorDetail::new(
            ErrorCategory::Gating,
            "Multiple dynamic gating directives found",
        )
        .with_description(format!(
            "Expected a single directive but found [{}]",
            names.join(", ")
        ));
        detail.loc = matches[0].0.base.loc.as_ref().map(convert_loc);
        err.push_error_detail(detail);
        return Err(err);
    }

    if matches.len() == 1 {
        Ok(Some(DynamicGatingResult {
            directive: matches[0].0,
            gating: GatingConfig {
                source: dynamic_gating.source.clone(),
                import_specifier_name: matches[0].1.clone(),
            },
        }))
    } else {
        Ok(None)
    }
}

/// Parse a `use memo if(<condition>)` directive, returning the condition.
/// Exact equivalent of the TS DYNAMIC_GATING_DIRECTIVE regex
/// `^use memo if\(([^\)]*)\)$`: the condition may not contain `)` and the
/// directive must end at the closing paren.
fn parse_dynamic_gating_directive(value: &str) -> Option<&str> {
    let condition = value.strip_prefix("use memo if(")?.strip_suffix(')')?;
    if condition.contains(')') {
        return None;
    }
    Some(condition)
}

/// Simple check for valid JavaScript identifier (alphanumeric + underscore + $, starting with letter/$/_ )
/// Also rejects reserved words like `true`, `false`, `null`, etc.
fn is_valid_identifier(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }
    let mut chars = s.chars();
    let first = chars.next().unwrap();
    if !first.is_alphabetic() && first != '_' && first != '$' {
        return false;
    }
    if !chars.all(|c| c.is_alphanumeric() || c == '_' || c == '$') {
        return false;
    }
    // Check for reserved words (matching Babel's t.isValidIdentifier)
    !matches!(
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
            | "implements"
            | "interface"
            | "let"
            | "package"
            | "private"
            | "protected"
            | "public"
            | "static"
            | "yield"
            | "null"
            | "true"
            | "false"
            | "delete"
    )
}

// -----------------------------------------------------------------------
// Name helpers
// -----------------------------------------------------------------------

/// Check if a string follows the React hook naming convention (use[A-Z0-9]...).
fn is_hook_name(s: &str) -> bool {
    let bytes = s.as_bytes();
    bytes.len() >= 4
        && bytes[0] == b'u'
        && bytes[1] == b's'
        && bytes[2] == b'e'
        && bytes
            .get(3)
            .map_or(false, |c| c.is_ascii_uppercase() || c.is_ascii_digit())
}

/// Check if a name looks like a React component (starts with uppercase letter).
fn is_component_name(name: &str) -> bool {
    name.chars()
        .next()
        .map_or(false, |c| c.is_ascii_uppercase())
}

/// Check if an expression is a hook call (identifier with hook name, or
/// member expression `PascalCase.useHook`).
fn expr_is_hook(expr: &Expression) -> bool {
    match expr {
        Expression::Identifier(id) => is_hook_name(&id.name),
        Expression::MemberExpression(member) => {
            if member.computed {
                return false;
            }
            // Property must be a hook name
            if !expr_is_hook(&member.property) {
                return false;
            }
            // Object must be a PascalCase identifier
            if let Expression::Identifier(obj) = member.object.as_ref() {
                obj.name
                    .chars()
                    .next()
                    .map_or(false, |c| c.is_ascii_uppercase())
            } else {
                false
            }
        }
        _ => false,
    }
}

/// Check if an expression is a React API call (e.g., `forwardRef` or `React.forwardRef`).
#[allow(dead_code)]
fn is_react_api(expr: &Expression, function_name: &str) -> bool {
    match expr {
        Expression::Identifier(id) => id.name == function_name,
        Expression::MemberExpression(member) => {
            if let Expression::Identifier(obj) = member.object.as_ref() {
                if obj.name == "React" {
                    if let Expression::Identifier(prop) = member.property.as_ref() {
                        return prop.name == function_name;
                    }
                }
            }
            false
        }
        _ => false,
    }
}

/// Get the inferred function name from a function's context.
///
/// For FunctionDeclaration: uses the `id` field.
/// For FunctionExpression/ArrowFunctionExpression: infers from parent context
/// (VariableDeclarator, etc.) which is passed explicitly since we don't have Babel paths.
fn get_function_name_from_id(id: Option<&Identifier>) -> Option<String> {
    id.map(|id| id.name.clone())
}

// -----------------------------------------------------------------------
// AST traversal helpers
// -----------------------------------------------------------------------

/// Check if an expression is a "non-node" return value (indicating the function
/// is not a React component). This matches the TS `isNonNode` function.
fn is_non_node(expr: &Expression) -> bool {
    matches!(
        expr,
        Expression::ObjectExpression(_)
            | Expression::ArrowFunctionExpression(_)
            | Expression::FunctionExpression(_)
            | Expression::BigIntLiteral(_)
            | Expression::ClassExpression(_)
            | Expression::NewExpression(_)
    )
}

/// Recursively check if a function body returns a non-React-node value.
/// Walks all return statements in the function (not in nested functions).
/// The last return statement visited (in DFS order) determines the result,
/// rather than short-circuiting on the first non-node return.
fn returns_non_node_in_stmts(stmts: &[Statement]) -> bool {
    let mut result = false;
    for stmt in stmts {
        returns_non_node_in_stmt(stmt, &mut result);
    }
    result
}

fn returns_non_node_in_stmt(stmt: &Statement, result: &mut bool) {
    match stmt {
        Statement::ReturnStatement(ret) => {
            *result = match &ret.argument {
                Some(arg) => is_non_node(arg),
                None => true, // bare `return;` with no argument is a non-node value
            };
        }
        Statement::BlockStatement(block) => {
            for s in &block.body {
                returns_non_node_in_stmt(s, result);
            }
        }
        Statement::IfStatement(if_stmt) => {
            returns_non_node_in_stmt(&if_stmt.consequent, result);
            if let Some(ref alt) = if_stmt.alternate {
                returns_non_node_in_stmt(alt, result);
            }
        }
        Statement::ForStatement(for_stmt) => returns_non_node_in_stmt(&for_stmt.body, result),
        Statement::WhileStatement(while_stmt) => returns_non_node_in_stmt(&while_stmt.body, result),
        Statement::DoWhileStatement(do_while) => returns_non_node_in_stmt(&do_while.body, result),
        Statement::ForInStatement(for_in) => returns_non_node_in_stmt(&for_in.body, result),
        Statement::ForOfStatement(for_of) => returns_non_node_in_stmt(&for_of.body, result),
        Statement::SwitchStatement(switch) => {
            for case in &switch.cases {
                for s in &case.consequent {
                    returns_non_node_in_stmt(s, result);
                }
            }
        }
        Statement::TryStatement(try_stmt) => {
            for s in &try_stmt.block.body {
                returns_non_node_in_stmt(s, result);
            }
            if let Some(ref handler) = try_stmt.handler {
                for s in &handler.body.body {
                    returns_non_node_in_stmt(s, result);
                }
            }
            if let Some(ref finalizer) = try_stmt.finalizer {
                for s in &finalizer.body {
                    returns_non_node_in_stmt(s, result);
                }
            }
        }
        Statement::LabeledStatement(labeled) => returns_non_node_in_stmt(&labeled.body, result),
        Statement::WithStatement(with) => returns_non_node_in_stmt(&with.body, result),
        // Skip nested function/class declarations -- they have their own returns
        Statement::FunctionDeclaration(_) | Statement::ClassDeclaration(_) => {}
        // Unmodeled statements are opaque to return analysis; functions
        // containing them bail out in lowering before this matters.
        Statement::Unknown(_) => {}
        _ => {}
    }
}

/// Check if a function returns non-node values.
/// For arrow functions with expression body, checks the expression directly.
/// For block bodies, walks the statements.
fn returns_non_node_fn(params: &[PatternLike], body: &FunctionBody) -> bool {
    let _ = params;
    match body {
        FunctionBody::Block(block) => returns_non_node_in_stmts(&block.body),
        FunctionBody::Expression(expr) => is_non_node(expr),
    }
}

/// Check if a function body calls hooks or creates JSX.
/// Traverses the function body (not nested functions) looking for:
/// - CallExpression where callee is a hook
/// - JSXElement or JSXFragment
fn calls_hooks_or_creates_jsx_in_stmts(stmts: &[Statement]) -> bool {
    for stmt in stmts {
        if calls_hooks_or_creates_jsx_in_stmt(stmt) {
            return true;
        }
    }
    false
}

fn calls_hooks_or_creates_jsx_in_stmt(stmt: &Statement) -> bool {
    match stmt {
        Statement::ExpressionStatement(expr_stmt) => {
            calls_hooks_or_creates_jsx_in_expr(&expr_stmt.expression)
        }
        Statement::ReturnStatement(ret) => {
            if let Some(ref arg) = ret.argument {
                calls_hooks_or_creates_jsx_in_expr(arg)
            } else {
                false
            }
        }
        Statement::VariableDeclaration(var_decl) => {
            for decl in &var_decl.declarations {
                if let Some(ref init) = decl.init {
                    if calls_hooks_or_creates_jsx_in_expr(init) {
                        return true;
                    }
                }
            }
            false
        }
        Statement::BlockStatement(block) => calls_hooks_or_creates_jsx_in_stmts(&block.body),
        Statement::IfStatement(if_stmt) => {
            calls_hooks_or_creates_jsx_in_expr(&if_stmt.test)
                || calls_hooks_or_creates_jsx_in_stmt(&if_stmt.consequent)
                || if_stmt
                    .alternate
                    .as_ref()
                    .map_or(false, |alt| calls_hooks_or_creates_jsx_in_stmt(alt))
        }
        Statement::ForStatement(for_stmt) => {
            if let Some(ref init) = for_stmt.init {
                match init.as_ref() {
                    ForInit::Expression(expr) => {
                        if calls_hooks_or_creates_jsx_in_expr(expr) {
                            return true;
                        }
                    }
                    ForInit::VariableDeclaration(var_decl) => {
                        for decl in &var_decl.declarations {
                            if let Some(ref init) = decl.init {
                                if calls_hooks_or_creates_jsx_in_expr(init) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            if let Some(ref test) = for_stmt.test {
                if calls_hooks_or_creates_jsx_in_expr(test) {
                    return true;
                }
            }
            if let Some(ref update) = for_stmt.update {
                if calls_hooks_or_creates_jsx_in_expr(update) {
                    return true;
                }
            }
            calls_hooks_or_creates_jsx_in_stmt(&for_stmt.body)
        }
        Statement::WhileStatement(while_stmt) => {
            calls_hooks_or_creates_jsx_in_expr(&while_stmt.test)
                || calls_hooks_or_creates_jsx_in_stmt(&while_stmt.body)
        }
        Statement::DoWhileStatement(do_while) => {
            calls_hooks_or_creates_jsx_in_stmt(&do_while.body)
                || calls_hooks_or_creates_jsx_in_expr(&do_while.test)
        }
        Statement::ForInStatement(for_in) => {
            calls_hooks_or_creates_jsx_in_expr(&for_in.right)
                || calls_hooks_or_creates_jsx_in_stmt(&for_in.body)
        }
        Statement::ForOfStatement(for_of) => {
            calls_hooks_or_creates_jsx_in_expr(&for_of.right)
                || calls_hooks_or_creates_jsx_in_stmt(&for_of.body)
        }
        Statement::SwitchStatement(switch) => {
            if calls_hooks_or_creates_jsx_in_expr(&switch.discriminant) {
                return true;
            }
            for case in &switch.cases {
                if let Some(ref test) = case.test {
                    if calls_hooks_or_creates_jsx_in_expr(test) {
                        return true;
                    }
                }
                if calls_hooks_or_creates_jsx_in_stmts(&case.consequent) {
                    return true;
                }
            }
            false
        }
        Statement::ThrowStatement(throw) => calls_hooks_or_creates_jsx_in_expr(&throw.argument),
        Statement::TryStatement(try_stmt) => {
            if calls_hooks_or_creates_jsx_in_stmts(&try_stmt.block.body) {
                return true;
            }
            if let Some(ref handler) = try_stmt.handler {
                if calls_hooks_or_creates_jsx_in_stmts(&handler.body.body) {
                    return true;
                }
            }
            if let Some(ref finalizer) = try_stmt.finalizer {
                if calls_hooks_or_creates_jsx_in_stmts(&finalizer.body) {
                    return true;
                }
            }
            false
        }
        Statement::LabeledStatement(labeled) => calls_hooks_or_creates_jsx_in_stmt(&labeled.body),
        Statement::WithStatement(with) => {
            calls_hooks_or_creates_jsx_in_expr(&with.object)
                || calls_hooks_or_creates_jsx_in_stmt(&with.body)
        }
        // Recurse into class body to find JSX/hooks in methods (matching TS behavior
        // where Babel's traverse enters class bodies, only skipping nested functions)
        Statement::FunctionDeclaration(_) => false,
        Statement::ClassDeclaration(class) => calls_hooks_or_creates_jsx_in_class_body(&class.body),
        // Unmodeled statements are preserved verbatim and never compiled, so
        // hook/JSX content inside them cannot affect compilation decisions.
        Statement::Unknown(_) => false,
        _ => false,
    }
}

fn calls_hooks_or_creates_jsx_in_expr(expr: &Expression) -> bool {
    match expr {
        // JSX creates
        Expression::JSXElement(_) | Expression::JSXFragment(_) => true,

        // Hook calls
        Expression::CallExpression(call) => {
            if expr_is_hook(&call.callee) {
                return true;
            }
            // Also check arguments for JSX/hooks (but not nested functions)
            if calls_hooks_or_creates_jsx_in_expr(&call.callee) {
                return true;
            }
            for arg in &call.arguments {
                // Skip function arguments -- they are nested functions
                if matches!(
                    arg,
                    Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
                ) {
                    continue;
                }
                if calls_hooks_or_creates_jsx_in_expr(arg) {
                    return true;
                }
            }
            false
        }
        Expression::OptionalCallExpression(call) => {
            // Note: OptionalCallExpression is NOT treated as a hook call for
            // the purpose of determining function type. The TS code only checks
            // regular CallExpression nodes in callsHooksOrCreatesJsx.
            // We still recurse into the callee and arguments to find other
            // hook calls or JSX.
            if calls_hooks_or_creates_jsx_in_expr(&call.callee) {
                return true;
            }
            for arg in &call.arguments {
                if matches!(
                    arg,
                    Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
                ) {
                    continue;
                }
                if calls_hooks_or_creates_jsx_in_expr(arg) {
                    return true;
                }
            }
            false
        }

        // Binary/logical
        Expression::BinaryExpression(bin) => {
            calls_hooks_or_creates_jsx_in_expr(&bin.left)
                || calls_hooks_or_creates_jsx_in_expr(&bin.right)
        }
        Expression::LogicalExpression(log) => {
            calls_hooks_or_creates_jsx_in_expr(&log.left)
                || calls_hooks_or_creates_jsx_in_expr(&log.right)
        }
        Expression::ConditionalExpression(cond) => {
            calls_hooks_or_creates_jsx_in_expr(&cond.test)
                || calls_hooks_or_creates_jsx_in_expr(&cond.consequent)
                || calls_hooks_or_creates_jsx_in_expr(&cond.alternate)
        }
        Expression::AssignmentExpression(assign) => {
            calls_hooks_or_creates_jsx_in_expr(&assign.right)
        }
        Expression::SequenceExpression(seq) => seq
            .expressions
            .iter()
            .any(|e| calls_hooks_or_creates_jsx_in_expr(e)),
        Expression::UnaryExpression(unary) => calls_hooks_or_creates_jsx_in_expr(&unary.argument),
        Expression::UpdateExpression(update) => {
            calls_hooks_or_creates_jsx_in_expr(&update.argument)
        }
        Expression::MemberExpression(member) => {
            calls_hooks_or_creates_jsx_in_expr(&member.object)
                || calls_hooks_or_creates_jsx_in_expr(&member.property)
        }
        Expression::OptionalMemberExpression(member) => {
            calls_hooks_or_creates_jsx_in_expr(&member.object)
                || calls_hooks_or_creates_jsx_in_expr(&member.property)
        }
        Expression::SpreadElement(spread) => calls_hooks_or_creates_jsx_in_expr(&spread.argument),
        Expression::AwaitExpression(await_expr) => {
            calls_hooks_or_creates_jsx_in_expr(&await_expr.argument)
        }
        Expression::YieldExpression(yield_expr) => yield_expr
            .argument
            .as_ref()
            .map_or(false, |arg| calls_hooks_or_creates_jsx_in_expr(arg)),
        Expression::TaggedTemplateExpression(tagged) => {
            calls_hooks_or_creates_jsx_in_expr(&tagged.tag)
        }
        Expression::TemplateLiteral(tl) => tl
            .expressions
            .iter()
            .any(|e| calls_hooks_or_creates_jsx_in_expr(e)),
        Expression::ArrayExpression(arr) => arr.elements.iter().any(|e| {
            e.as_ref()
                .map_or(false, |e| calls_hooks_or_creates_jsx_in_expr(e))
        }),
        Expression::ObjectExpression(obj) => obj.properties.iter().any(|prop| match prop {
            ObjectExpressionProperty::ObjectProperty(p) => {
                calls_hooks_or_creates_jsx_in_expr(&p.value)
            }
            ObjectExpressionProperty::SpreadElement(s) => {
                calls_hooks_or_creates_jsx_in_expr(&s.argument)
            }
            // ObjectMethod: traverse into its body to find hooks/JSX.
            // This matches the TS behavior where Babel's traverse enters
            // ObjectMethod (only FunctionDeclaration, FunctionExpression,
            // and ArrowFunctionExpression are skipped).
            ObjectExpressionProperty::ObjectMethod(m) => {
                calls_hooks_or_creates_jsx_in_stmts(&m.body.body)
            }
        }),
        Expression::ParenthesizedExpression(paren) => {
            calls_hooks_or_creates_jsx_in_expr(&paren.expression)
        }
        Expression::TSAsExpression(ts) => calls_hooks_or_creates_jsx_in_expr(&ts.expression),
        Expression::TSSatisfiesExpression(ts) => calls_hooks_or_creates_jsx_in_expr(&ts.expression),
        Expression::TSNonNullExpression(ts) => calls_hooks_or_creates_jsx_in_expr(&ts.expression),
        Expression::TSTypeAssertion(ts) => calls_hooks_or_creates_jsx_in_expr(&ts.expression),
        Expression::TSInstantiationExpression(ts) => {
            calls_hooks_or_creates_jsx_in_expr(&ts.expression)
        }
        Expression::TypeCastExpression(tc) => calls_hooks_or_creates_jsx_in_expr(&tc.expression),
        Expression::NewExpression(new) => {
            if calls_hooks_or_creates_jsx_in_expr(&new.callee) {
                return true;
            }
            new.arguments.iter().any(|a| {
                if matches!(
                    a,
                    Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
                ) {
                    return false;
                }
                calls_hooks_or_creates_jsx_in_expr(a)
            })
        }

        // Skip nested functions
        Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_) => false,

        // Recurse into class body to find JSX/hooks in methods
        Expression::ClassExpression(class) => calls_hooks_or_creates_jsx_in_class_body(&class.body),

        // Leaf expressions
        _ => false,
    }
}

/// Recursively search a ClassBody for JSX elements or hook calls.
/// Class body members are stored as serde_json::Value since they aren't fully typed.
/// We search the JSON tree, skipping nested function nodes (matching TS behavior where
/// Babel's traverse skips ArrowFunctionExpression, FunctionExpression, FunctionDeclaration
/// but recurses into class methods).
fn calls_hooks_or_creates_jsx_in_class_body(
    body: &react_compiler_ast::expressions::ClassBody,
) -> bool {
    body.body
        .iter()
        .any(|member| calls_hooks_or_creates_jsx_in_json(&member.parse_value()))
}

fn calls_hooks_or_creates_jsx_in_json(value: &serde_json::Value) -> bool {
    match value {
        serde_json::Value::Object(obj) => {
            // Check the node type
            if let Some(serde_json::Value::String(node_type)) = obj.get("type") {
                match node_type.as_str() {
                    // JSX nodes
                    "JSXElement" | "JSXFragment" => return true,
                    // Skip nested function nodes (matching TS skipNestedFunctions)
                    "ArrowFunctionExpression" | "FunctionExpression" | "FunctionDeclaration" => {
                        return false;
                    }
                    // Hook calls: check if callee name starts with "use"
                    "CallExpression" => {
                        if let Some(callee) = obj.get("callee") {
                            if json_expr_is_hook(callee) {
                                return true;
                            }
                        }
                    }
                    _ => {}
                }
            }
            // Recurse into all values of the object
            obj.values().any(|v| calls_hooks_or_creates_jsx_in_json(v))
        }
        serde_json::Value::Array(arr) => arr.iter().any(|v| calls_hooks_or_creates_jsx_in_json(v)),
        _ => false,
    }
}

/// Check if a JSON expression node looks like a hook call.
/// Handles both Identifier (e.g. `useState`) and MemberExpression
/// (e.g. `React.useState`) patterns, reusing `is_hook_name` for
/// consistent naming checks.
fn json_expr_is_hook(callee: &serde_json::Value) -> bool {
    if let serde_json::Value::Object(obj) = callee {
        if let Some(serde_json::Value::String(node_type)) = obj.get("type") {
            if node_type == "Identifier" {
                if let Some(serde_json::Value::String(name)) = obj.get("name") {
                    return is_hook_name(name);
                }
            } else if node_type == "MemberExpression" {
                // Check for PascalCase.useHook pattern (non-computed)
                let computed = obj
                    .get("computed")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                if computed {
                    return false;
                }
                // Property must be a hook name
                if let Some(serde_json::Value::Object(prop)) = obj.get("property") {
                    if prop.get("type").and_then(|v| v.as_str()) == Some("Identifier") {
                        if let Some(name) = prop.get("name").and_then(|v| v.as_str()) {
                            if !is_hook_name(name) {
                                return false;
                            }
                            // Object must be PascalCase identifier
                            if let Some(serde_json::Value::Object(obj_node)) = obj.get("object") {
                                if obj_node.get("type").and_then(|v| v.as_str())
                                    == Some("Identifier")
                                {
                                    if let Some(obj_name) =
                                        obj_node.get("name").and_then(|v| v.as_str())
                                    {
                                        return is_component_name(obj_name);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    false
}

/// Check if a function body calls hooks or creates JSX.
fn calls_hooks_or_creates_jsx(params: &[PatternLike], body: &FunctionBody) -> bool {
    // Check default param values (TS traverses the whole function node including params)
    if calls_hooks_or_creates_jsx_in_params(params) {
        return true;
    }
    match body {
        FunctionBody::Block(block) => calls_hooks_or_creates_jsx_in_stmts(&block.body),
        FunctionBody::Expression(expr) => calls_hooks_or_creates_jsx_in_expr(expr),
    }
}

/// Check if any parameter default values contain hooks or JSX.
fn calls_hooks_or_creates_jsx_in_params(params: &[PatternLike]) -> bool {
    for param in params {
        if calls_hooks_or_creates_jsx_in_pattern(param) {
            return true;
        }
    }
    false
}

fn calls_hooks_or_creates_jsx_in_pattern(pattern: &PatternLike) -> bool {
    match pattern {
        PatternLike::AssignmentPattern(assign) => {
            // Check the default value expression
            calls_hooks_or_creates_jsx_in_expr(&assign.right)
                || calls_hooks_or_creates_jsx_in_pattern(&assign.left)
        }
        PatternLike::ObjectPattern(obj) => obj.properties.iter().any(|prop| match prop {
            react_compiler_ast::patterns::ObjectPatternProperty::ObjectProperty(p) => {
                calls_hooks_or_creates_jsx_in_pattern(&p.value)
            }
            react_compiler_ast::patterns::ObjectPatternProperty::RestElement(rest) => {
                calls_hooks_or_creates_jsx_in_pattern(&rest.argument)
            }
        }),
        PatternLike::ArrayPattern(arr) => arr.elements.iter().any(|elem| {
            elem.as_ref()
                .map_or(false, |e| calls_hooks_or_creates_jsx_in_pattern(e))
        }),
        PatternLike::RestElement(rest) => calls_hooks_or_creates_jsx_in_pattern(&rest.argument),
        PatternLike::Identifier(_)
        | PatternLike::MemberExpression(_)
        | PatternLike::TSAsExpression(_)
        | PatternLike::TSSatisfiesExpression(_)
        | PatternLike::TSNonNullExpression(_)
        | PatternLike::TSTypeAssertion(_)
        | PatternLike::TypeCastExpression(_) => false,
    }
}

/// Check if the function parameters are valid for a React component.
/// Components can have 0 params, 1 param (props), or 2 params (props + ref).
/// Check if a parameter's type annotation is valid for a React component prop.
/// Returns false for primitive type annotations that indicate this is NOT a component.
fn is_valid_props_annotation(param: &PatternLike) -> bool {
    let type_annotation = match param {
        PatternLike::Identifier(id) => id.type_annotation.as_ref(),
        PatternLike::ObjectPattern(op) => op.type_annotation.as_ref(),
        PatternLike::ArrayPattern(ap) => ap.type_annotation.as_ref(),
        PatternLike::AssignmentPattern(ap) => ap.type_annotation.as_ref(),
        PatternLike::RestElement(re) => re.type_annotation.as_ref(),
        PatternLike::MemberExpression(_)
        | PatternLike::TSAsExpression(_)
        | PatternLike::TSSatisfiesExpression(_)
        | PatternLike::TSNonNullExpression(_)
        | PatternLike::TSTypeAssertion(_)
        | PatternLike::TypeCastExpression(_) => None,
    };
    let annot = match type_annotation {
        Some(raw) => raw.parse_value(),
        None => return true, // No annotation = valid
    };
    let annot_type = match annot.get("type").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => return true,
    };
    match annot_type {
        "TSTypeAnnotation" => {
            let inner_type = annot
                .get("typeAnnotation")
                .and_then(|v| v.get("type"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            !matches!(
                inner_type,
                "TSArrayType"
                    | "TSBigIntKeyword"
                    | "TSBooleanKeyword"
                    | "TSConstructorType"
                    | "TSFunctionType"
                    | "TSLiteralType"
                    | "TSNeverKeyword"
                    | "TSNumberKeyword"
                    | "TSStringKeyword"
                    | "TSSymbolKeyword"
                    | "TSTupleType"
            )
        }
        "TypeAnnotation" => {
            let inner_type = annot
                .get("typeAnnotation")
                .and_then(|v| v.get("type"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            !matches!(
                inner_type,
                "ArrayTypeAnnotation"
                    | "BooleanLiteralTypeAnnotation"
                    | "BooleanTypeAnnotation"
                    | "EmptyTypeAnnotation"
                    | "FunctionTypeAnnotation"
                    | "NullLiteralTypeAnnotation"
                    | "NumberLiteralTypeAnnotation"
                    | "NumberTypeAnnotation"
                    | "StringLiteralTypeAnnotation"
                    | "StringTypeAnnotation"
                    | "SymbolTypeAnnotation"
                    | "ThisTypeAnnotation"
                    | "TupleTypeAnnotation"
            )
        }
        "Noop" => true,
        _ => true,
    }
}

fn is_valid_component_params(params: &[PatternLike]) -> bool {
    if params.is_empty() {
        return true;
    }
    if params.len() > 2 {
        return false;
    }
    // First param cannot be a rest element
    if matches!(params[0], PatternLike::RestElement(_)) {
        return false;
    }
    // Check type annotation on first param
    if !is_valid_props_annotation(&params[0]) {
        return false;
    }
    if params.len() == 1 {
        return true;
    }
    // If second param exists, it should look like a ref
    if let PatternLike::Identifier(ref id) = params[1] {
        id.name.contains("ref") || id.name.contains("Ref")
    } else {
        false
    }
}

// -----------------------------------------------------------------------
// Unified function body type for traversal
// -----------------------------------------------------------------------

/// Abstraction over function body types to simplify traversal code
enum FunctionBody<'a> {
    Block(&'a BlockStatement),
    Expression(&'a Expression),
}

// -----------------------------------------------------------------------
// Function type detection
// -----------------------------------------------------------------------

/// Determine the React function type for a function, given the compilation mode
/// and the function's name and context.
///
/// This is the Rust equivalent of `getReactFunctionType` in Program.ts.
fn get_react_function_type(
    name: Option<&str>,
    params: &[PatternLike],
    body: &FunctionBody,
    body_directives: &[Directive],
    is_declaration: bool,
    parent_callee_name: Option<&str>,
    opts: &PluginOptions,
    is_component_declaration: bool,
    is_hook_declaration: bool,
) -> Option<ReactFunctionType> {
    // Check for opt-in directives in the function body
    if let FunctionBody::Block(_) = body {
        let opt_in = try_find_directive_enabling_memoization(body_directives, opts);
        if let Ok(Some(_)) = opt_in {
            // If there's an opt-in directive, use name heuristics but fall back to Other
            return Some(
                get_component_or_hook_like(name, params, body, parent_callee_name)
                    .unwrap_or(ReactFunctionType::Other),
            );
        }
    }

    // Component and hook declarations are known components/hooks
    // (Flow `component Foo() { ... }` and `hook useFoo() { ... }` syntax,
    //  detected via __componentDeclaration / __hookDeclaration from the Hermes parser)
    let component_syntax_type = if is_declaration {
        if is_component_declaration {
            Some(ReactFunctionType::Component)
        } else if is_hook_declaration {
            Some(ReactFunctionType::Hook)
        } else {
            None
        }
    } else {
        None
    };

    match opts.compilation_mode.as_str() {
        "annotation" => {
            // opt-ins were checked above
            None
        }
        "infer" => {
            // Check if this is a component or hook-like function
            component_syntax_type
                .or_else(|| get_component_or_hook_like(name, params, body, parent_callee_name))
        }
        "syntax" => {
            // In syntax mode, only compile declared components/hooks
            component_syntax_type
        }
        "all" => Some(
            get_component_or_hook_like(name, params, body, parent_callee_name)
                .unwrap_or(ReactFunctionType::Other),
        ),
        _ => None,
    }
}

/// Determine if a function looks like a React component or hook based on
/// naming conventions and code patterns.
///
/// Adapted from the ESLint rule at
/// https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/src/RulesOfHooks.js
fn get_component_or_hook_like(
    name: Option<&str>,
    params: &[PatternLike],
    body: &FunctionBody,
    parent_callee_name: Option<&str>,
) -> Option<ReactFunctionType> {
    if let Some(fn_name) = name {
        if is_component_name(fn_name) {
            // Check if it actually looks like a component
            let is_component = calls_hooks_or_creates_jsx(params, body)
                && is_valid_component_params(params)
                && !returns_non_node_fn(params, body);
            return if is_component {
                Some(ReactFunctionType::Component)
            } else {
                None
            };
        } else if is_hook_name(fn_name) {
            // Hooks have hook invocations or JSX, but can take any # of arguments
            return if calls_hooks_or_creates_jsx(params, body) {
                Some(ReactFunctionType::Hook)
            } else {
                None
            };
        }
    }

    // For unnamed functions, check if they are forwardRef/memo callbacks
    if let Some(callee_name) = parent_callee_name {
        if callee_name == "forwardRef" || callee_name == "memo" {
            return if calls_hooks_or_creates_jsx(params, body) {
                Some(ReactFunctionType::Component)
            } else {
                None
            };
        }
    }

    None
}

/// Extract the callee name from a CallExpression if it's a React API call
/// (forwardRef, memo, React.forwardRef, React.memo).
fn get_callee_name_if_react_api(callee: &Expression) -> Option<&str> {
    match callee {
        Expression::Identifier(id) => {
            if id.name == "forwardRef" || id.name == "memo" {
                Some(&id.name)
            } else {
                None
            }
        }
        Expression::MemberExpression(member) => {
            if let Expression::Identifier(obj) = member.object.as_ref() {
                if obj.name == "React" {
                    if let Expression::Identifier(prop) = member.property.as_ref() {
                        if prop.name == "forwardRef" || prop.name == "memo" {
                            return Some(&prop.name);
                        }
                    }
                }
            }
            None
        }
        _ => None,
    }
}

// -----------------------------------------------------------------------
// SourceLocation conversion
// -----------------------------------------------------------------------

/// Convert an AST SourceLocation to a diagnostics SourceLocation
fn convert_loc(loc: &react_compiler_ast::common::SourceLocation) -> SourceLocation {
    SourceLocation {
        start: react_compiler_diagnostics::Position {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: react_compiler_diagnostics::Position {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
        start_offset: None,
        end_offset: None,
    }
}

fn base_node_loc(base: &BaseNode) -> Option<SourceLocation> {
    base.loc.as_ref().map(convert_loc)
}

// -----------------------------------------------------------------------
// Error handling
// -----------------------------------------------------------------------

/// Convert CompilerDiagnostic details into serializable CompilerErrorItemInfo items.
fn diagnostic_details_to_items(
    d: &react_compiler_diagnostics::CompilerDiagnostic,
    filename: Option<&str>,
) -> Option<Vec<CompilerErrorItemInfo>> {
    let items: Vec<CompilerErrorItemInfo> = d
        .details
        .iter()
        .map(|item| match item {
            react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
                loc,
                message,
                identifier_name,
            } => CompilerErrorItemInfo {
                kind: "error".to_string(),
                loc: loc.as_ref().map(|l| {
                    let mut logger_loc = diag_loc_to_logger_loc(l, filename);
                    logger_loc.identifier_name = identifier_name.clone();
                    logger_loc
                }),
                message: message.clone(),
            },
            react_compiler_diagnostics::CompilerDiagnosticDetail::Hint { message } => {
                CompilerErrorItemInfo {
                    kind: "hint".to_string(),
                    loc: None,
                    message: Some(message.clone()),
                }
            }
        })
        .collect();
    if items.is_empty() { None } else { Some(items) }
}

/// Convert an optional AST SourceLocation to a LoggerSourceLocation with filename.
fn to_logger_loc(
    ast_loc: Option<&react_compiler_ast::common::SourceLocation>,
    filename: Option<&str>,
) -> Option<LoggerSourceLocation> {
    ast_loc.map(|loc| LoggerSourceLocation {
        start: LoggerPosition {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: LoggerPosition {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
        filename: filename.map(|s| s.to_string()),
        identifier_name: loc.identifier_name.clone(),
    })
}

/// Convert a diagnostics SourceLocation to a LoggerSourceLocation with filename.
fn diag_loc_to_logger_loc(loc: &SourceLocation, filename: Option<&str>) -> LoggerSourceLocation {
    LoggerSourceLocation {
        start: LoggerPosition {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: LoggerPosition {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
        filename: filename.map(|s| s.to_string()),
        identifier_name: None,
    }
}

/// Convert diagnostic suggestions to logger suggestion infos.
fn suggestions_to_logger(
    suggestions: &Option<Vec<react_compiler_diagnostics::CompilerSuggestion>>,
) -> Option<Vec<LoggerSuggestionInfo>> {
    suggestions.as_ref().map(|suggestions| {
        suggestions
            .iter()
            .map(|s| {
                let op = match s.op {
                    react_compiler_diagnostics::CompilerSuggestionOperation::InsertBefore => {
                        LoggerSuggestionOp::InsertBefore
                    }
                    react_compiler_diagnostics::CompilerSuggestionOperation::InsertAfter => {
                        LoggerSuggestionOp::InsertAfter
                    }
                    react_compiler_diagnostics::CompilerSuggestionOperation::Remove => {
                        LoggerSuggestionOp::Remove
                    }
                    react_compiler_diagnostics::CompilerSuggestionOperation::Replace => {
                        LoggerSuggestionOp::Replace
                    }
                };
                LoggerSuggestionInfo {
                    description: s.description.clone(),
                    op,
                    range: s.range,
                    text: s.text.clone(),
                }
            })
            .collect()
    })
}

/// Log an error as LoggerEvent(s) directly onto the ProgramContext.
fn log_error(
    err: &CompilerError,
    fn_ast_loc: Option<&react_compiler_ast::common::SourceLocation>,
    context: &mut ProgramContext,
) {
    // Use the filename from the AST node's loc (set by parser's sourceFilename option),
    // not from plugin options (which may have a different prefix like '/').
    let source_filename = fn_ast_loc.and_then(|loc| loc.filename.as_deref());
    let fn_loc = to_logger_loc(fn_ast_loc, source_filename);

    // Detect simulated unknown exception (throwUnknownException__testonly).
    // In TS, non-CompilerError exceptions are logged as PipelineError with the
    // error message as data. Emit the same event shape.
    let is_simulated_unknown = err.details.len() == 1
        && err.details.iter().all(|d| match d {
            CompilerErrorOrDiagnostic::ErrorDetail(d) => {
                d.category == ErrorCategory::Invariant && d.reason == "unexpected error"
            }
            _ => false,
        });
    if is_simulated_unknown {
        context.log_event(LoggerEvent::PipelineError {
            fn_loc: fn_loc.clone(),
            data: "Error: unexpected error".to_string(),
        });
        return;
    }

    for detail in &err.details {
        let detail_info = match detail {
            CompilerErrorOrDiagnostic::Diagnostic(d) => CompilerErrorDetailInfo {
                category: format!("{:?}", d.category),
                reason: d.reason.clone(),
                description: d.description.clone(),
                severity: format!("{:?}", d.logged_severity()),
                suggestions: suggestions_to_logger(&d.suggestions),
                details: diagnostic_details_to_items(d, source_filename),
                loc: None,
            },
            CompilerErrorOrDiagnostic::ErrorDetail(d) => CompilerErrorDetailInfo {
                category: format!("{:?}", d.category),
                reason: d.reason.clone(),
                description: d.description.clone(),
                severity: format!("{:?}", d.logged_severity()),
                suggestions: suggestions_to_logger(&d.suggestions),
                details: None,
                loc: d
                    .loc
                    .as_ref()
                    .map(|l| diag_loc_to_logger_loc(l, source_filename)),
            },
        };
        // Use CompileErrorWithLoc when fn_loc is present to match TS field ordering
        if let Some(ref loc) = fn_loc {
            context.log_event(LoggerEvent::CompileErrorWithLoc {
                fn_loc: loc.clone(),
                detail: detail_info,
            });
        } else {
            context.log_event(LoggerEvent::CompileError {
                fn_loc: None,
                detail: detail_info,
            });
        }
    }
}

/// Handle an error according to the panicThreshold setting.
/// Returns Some(CompileResult::Error) if the error should be surfaced as fatal,
/// otherwise returns None (error was logged only).
fn handle_error(
    err: &CompilerError,
    fn_ast_loc: Option<&react_compiler_ast::common::SourceLocation>,
    context: &mut ProgramContext,
) -> Option<CompileResult> {
    // Log the error
    log_error(err, fn_ast_loc, context);

    let should_panic = match context.opts.panic_threshold.as_str() {
        "all_errors" => true,
        "critical_errors" => err.has_errors(),
        _ => false,
    };

    // Config errors always cause a panic
    let is_config_error = err.details.iter().any(|d| match d {
        CompilerErrorOrDiagnostic::Diagnostic(d) => d.category == ErrorCategory::Config,
        CompilerErrorOrDiagnostic::ErrorDetail(d) => d.category == ErrorCategory::Config,
    });

    if should_panic || is_config_error {
        let source_fn = context.source_filename();
        let mut error_info = compiler_error_to_info(err, source_fn.as_deref());

        // Detect simulated unknown exception (throwUnknownException__testonly).
        // In the TS compiler, this throws a plain Error('unexpected error'), not
        // a CompilerError. Set rawMessage so the JS side throws with the raw
        // message instead of formatting through formatCompilerError().
        let is_simulated_unknown = err.details.len() == 1
            && err.details.iter().all(|d| match d {
                CompilerErrorOrDiagnostic::ErrorDetail(d) => {
                    d.category == ErrorCategory::Invariant && d.reason == "unexpected error"
                }
                _ => false,
            });
        if is_simulated_unknown {
            error_info.raw_message = Some("unexpected error".to_string());
        }

        // Pre-format the error message in Rust when possible, so the JS
        // shim can use it directly instead of calling formatCompilerError().
        if error_info.raw_message.is_none() {
            if let Some(ref source) = context.code {
                error_info.formatted_message = Some(
                    react_compiler_diagnostics::code_frame::format_compiler_error(
                        err,
                        source,
                        source_fn.as_deref(),
                    ),
                );
            }
        }

        Some(CompileResult::Error {
            error: error_info,
            events: context.events.clone(),
            ordered_log: context.ordered_log.clone(),
            timing: Vec::new(),
        })
    } else {
        None
    }
}

/// Convert a diagnostics CompilerError to a serializable CompilerErrorInfo.
fn compiler_error_to_info(err: &CompilerError, filename: Option<&str>) -> CompilerErrorInfo {
    let details: Vec<CompilerErrorDetailInfo> = err
        .details
        .iter()
        .map(|d| match d {
            CompilerErrorOrDiagnostic::Diagnostic(d) => CompilerErrorDetailInfo {
                category: format!("{:?}", d.category),
                reason: d.reason.clone(),
                description: d.description.clone(),
                severity: format!("{:?}", d.severity()),
                suggestions: suggestions_to_logger(&d.suggestions),
                details: diagnostic_details_to_items(d, filename),
                loc: None,
            },
            CompilerErrorOrDiagnostic::ErrorDetail(d) => CompilerErrorDetailInfo {
                category: format!("{:?}", d.category),
                reason: d.reason.clone(),
                description: d.description.clone(),
                severity: format!("{:?}", d.severity()),
                suggestions: suggestions_to_logger(&d.suggestions),
                details: None,
                loc: d.loc.as_ref().map(|l| diag_loc_to_logger_loc(l, filename)),
            },
        })
        .collect();

    let (reason, description) = details
        .first()
        .map(|d| (d.reason.clone(), d.description.clone()))
        .unwrap_or_else(|| ("Unknown error".to_string(), None));

    CompilerErrorInfo {
        reason,
        description,
        details,
        raw_message: None,
        formatted_message: None,
    }
}

// -----------------------------------------------------------------------
// Compilation pipeline stubs
// -----------------------------------------------------------------------

/// Attempt to compile a single function.
///
/// Returns `CodegenFunction` on success or `CompilerError` on failure.
/// Debug log entries are accumulated on `context.debug_logs`.
fn try_compile_function(
    source: &CompileSource<'_>,
    scope_info: &ScopeInfo,
    output_mode: CompilerOutputMode,
    env_config: &EnvironmentConfig,
    context: &mut ProgramContext,
) -> Result<CodegenFunction, CompilerError> {
    // Check for suppressions that affect this function
    if let (Some(start), Some(end)) = (source.fn_start, source.fn_end) {
        let affecting = filter_suppressions_that_affect_function(&context.suppressions, start, end);
        if !affecting.is_empty() {
            let owned: Vec<SuppressionRange> = affecting.into_iter().cloned().collect();
            let mut err = suppressions_to_compiler_error(&owned);
            // Suppression errors are returned (not thrown), so they should NOT
            // trigger CompileUnexpectedThrow.
            err.is_thrown = false;
            return Err(err);
        }
    }

    // Run the compilation pipeline
    pipeline::compile_fn(
        &source.fn_node,
        source.fn_name.as_deref(),
        scope_info,
        source.fn_type,
        output_mode,
        env_config,
        context,
    )
}

/// Process a single function: check directives, attempt compilation, handle results.
///
/// Returns `Ok(Some(codegen_fn))` when the function was compiled and should be applied,
/// `Ok(None)` when the function was skipped or lint-only,
/// or `Err(CompileResult)` if a fatal error should short-circuit the program.
fn process_fn(
    source: &CompileSource<'_>,
    scope_info: &ScopeInfo,
    output_mode: CompilerOutputMode,
    env_config: &EnvironmentConfig,
    context: &mut ProgramContext,
) -> Result<Option<CodegenFunction>, CompileResult> {
    // Parse directives from the function body
    let opt_in_result =
        try_find_directive_enabling_memoization(&source.body_directives, &context.opts);
    let opt_out = find_directive_disabling_memoization(&source.body_directives, &context.opts);

    // If parsing opt-in directive fails, handle the error and skip
    let opt_in = match opt_in_result {
        Ok(d) => d,
        Err(err) => {
            // Apply panic threshold logic (same as compilation errors)
            if let Some(result) = handle_error(&err, source.fn_ast_loc.as_ref(), context) {
                return Err(result);
            }
            return Ok(None);
        }
    };

    // Attempt compilation
    let compile_result = try_compile_function(source, scope_info, output_mode, env_config, context);

    match compile_result {
        Err(err) => {
            // Emit CompileUnexpectedThrow for errors that were "thrown" from a pass
            // (not accumulated via env.record_error) and have all non-Invariant details.
            // Matches TS tryCompileFunction() catch block behavior.
            if err.is_thrown && err.is_all_non_invariant() {
                let source_filename = source
                    .fn_ast_loc
                    .as_ref()
                    .and_then(|loc| loc.filename.as_deref());
                context.log_event(LoggerEvent::CompileUnexpectedThrow {
                    fn_loc: to_logger_loc(source.fn_ast_loc.as_ref(), source_filename),
                    data: err.to_string_for_event(),
                });
            }

            if opt_out.is_some() {
                // If there's an opt-out, just log the error (don't escalate)
                log_error(&err, source.fn_ast_loc.as_ref(), context);
            } else {
                // Apply panic threshold logic
                if let Some(result) = handle_error(&err, source.fn_ast_loc.as_ref(), context) {
                    return Err(result);
                }
            }
            Ok(None)
        }
        Ok(codegen_fn) => {
            // Check opt-out
            if !context.opts.ignore_use_no_forget && opt_out.is_some() {
                let opt_out_value = &opt_out.unwrap().value.value;
                let source_filename = source
                    .fn_ast_loc
                    .as_ref()
                    .and_then(|loc| loc.filename.as_deref());
                context.log_event(LoggerEvent::CompileSkip {
                    fn_loc: to_logger_loc(source.fn_ast_loc.as_ref(), source_filename),
                    reason: format!("Skipped due to '{}' directive.", opt_out_value),
                    loc: opt_out.and_then(|d| to_logger_loc(d.base.loc.as_ref(), source_filename)),
                });
                // The function is skipped due to opt-out. Do NOT register the memo
                // cache import here — it will be registered in apply_compiled_functions()
                // only for functions that are actually applied to the output.
                return Ok(None);
            }

            // Log success with memo stats from CodegenFunction
            let source_filename = source
                .fn_ast_loc
                .as_ref()
                .and_then(|loc| loc.filename.as_deref());
            context.log_event(LoggerEvent::CompileSuccess {
                fn_loc: to_logger_loc(source.fn_ast_loc.as_ref(), source_filename),
                fn_name: codegen_fn.id.as_ref().map(|id| id.name.clone()),
                memo_slots: codegen_fn.memo_slots_used,
                memo_blocks: codegen_fn.memo_blocks,
                memo_values: codegen_fn.memo_values,
                pruned_memo_blocks: codegen_fn.pruned_memo_blocks,
                pruned_memo_values: codegen_fn.pruned_memo_values,
            });

            // Check module scope opt-out
            if context.has_module_scope_opt_out {
                return Ok(None);
            }

            // Check output mode — lint mode doesn't apply compiled functions
            if output_mode == CompilerOutputMode::Lint {
                return Ok(None);
            }

            // Check annotation mode
            if context.opts.compilation_mode == "annotation" && opt_in.is_none() {
                return Ok(None);
            }

            Ok(Some(codegen_fn))
        }
    }
}

// -----------------------------------------------------------------------
// Import checking
// -----------------------------------------------------------------------

/// Check if the program already has a `c` import from the React Compiler runtime module.
/// If so, the file was already compiled and should be skipped.
fn has_memo_cache_function_import(program: &Program, module_name: &str) -> bool {
    for stmt in &program.body {
        if let Statement::ImportDeclaration(import) = stmt {
            if import.source.value == module_name {
                for specifier in &import.specifiers {
                    if let ImportSpecifier::ImportSpecifier(data) = specifier {
                        let imported_name = match &data.imported {
                            ModuleExportName::Identifier(id) => Some(id.name.as_str()),
                            ModuleExportName::StringLiteral(s) => s.value.as_str(),
                        };
                        if imported_name == Some("c") {
                            return true;
                        }
                    }
                }
            }
        }
    }
    false
}

/// Check if compilation should be skipped for this program.
fn should_skip_compilation(program: &Program, options: &PluginOptions) -> bool {
    let runtime_module = get_react_compiler_runtime_module(&options.target);
    has_memo_cache_function_import(program, &runtime_module)
}

// -----------------------------------------------------------------------
// Function discovery
// -----------------------------------------------------------------------

/// Information about an expression that might be a function to compile
struct FunctionInfo<'a> {
    name: Option<String>,
    fn_node: FunctionNode<'a>,
    params: &'a [PatternLike],
    body: FunctionBody<'a>,
    body_directives: Vec<Directive>,
    base: &'a BaseNode,
    parent_callee_name: Option<String>,
    /// True if the node has `__componentDeclaration` set by the Hermes parser (Flow component syntax)
    is_component_declaration: bool,
    /// True if the node has `__hookDeclaration` set by the Hermes parser (Flow hook syntax)
    is_hook_declaration: bool,
}

/// Extract function info from a FunctionDeclaration
fn fn_info_from_decl(decl: &FunctionDeclaration) -> FunctionInfo<'_> {
    FunctionInfo {
        name: get_function_name_from_id(decl.id.as_ref()),
        fn_node: FunctionNode::FunctionDeclaration(decl),
        params: &decl.params,
        body: FunctionBody::Block(&decl.body),
        body_directives: decl.body.directives.clone(),
        base: &decl.base,
        parent_callee_name: None,
        is_component_declaration: decl.component_declaration,
        is_hook_declaration: decl.hook_declaration,
    }
}

/// Extract function info from a FunctionExpression
fn fn_info_from_func_expr<'a>(
    expr: &'a FunctionExpression,
    inferred_name: Option<String>,
    parent_callee_name: Option<String>,
) -> FunctionInfo<'a> {
    FunctionInfo {
        name: inferred_name,
        fn_node: FunctionNode::FunctionExpression(expr),
        params: &expr.params,
        body: FunctionBody::Block(&expr.body),
        body_directives: expr.body.directives.clone(),
        base: &expr.base,
        parent_callee_name,
        is_component_declaration: false,
        is_hook_declaration: false,
    }
}

/// Extract function info from an ArrowFunctionExpression
fn fn_info_from_arrow<'a>(
    expr: &'a ArrowFunctionExpression,
    inferred_name: Option<String>,
    parent_callee_name: Option<String>,
) -> FunctionInfo<'a> {
    let (body, directives) = match expr.body.as_ref() {
        ArrowFunctionBody::BlockStatement(block) => {
            (FunctionBody::Block(block), block.directives.clone())
        }
        ArrowFunctionBody::Expression(e) => (FunctionBody::Expression(e), Vec::new()),
    };
    FunctionInfo {
        name: inferred_name,
        fn_node: FunctionNode::ArrowFunctionExpression(expr),
        params: &expr.params,
        body,
        body_directives: directives,
        base: &expr.base,
        parent_callee_name,
        is_component_declaration: false,
        is_hook_declaration: false,
    }
}

/// Try to create a CompileSource from function info
fn try_make_compile_source<'a>(
    info: FunctionInfo<'a>,
    opts: &PluginOptions,
    context: &mut ProgramContext,
) -> Option<CompileSource<'a>> {
    // Skip if already compiled (identified by node_id)
    if let Some(nid) = info.base.node_id {
        if context.is_already_compiled(nid) {
            return None;
        }
    }

    let fn_type = get_react_function_type(
        info.name.as_deref(),
        info.params,
        &info.body,
        &info.body_directives,
        info.is_component_declaration || info.is_hook_declaration,
        info.parent_callee_name.as_deref(),
        opts,
        info.is_component_declaration,
        info.is_hook_declaration,
    )?;

    // Mark as compiled
    if let Some(nid) = info.base.node_id {
        context.mark_compiled(nid);
    }

    Some(CompileSource {
        kind: CompileSourceKind::Original,
        fn_node: info.fn_node,
        fn_name: info.name,
        fn_loc: base_node_loc(info.base),
        fn_ast_loc: info.base.loc.clone(),
        fn_start: info.base.start,
        fn_end: info.base.end,
        fn_node_id: info.base.node_id,
        fn_type,
        body_directives: info.body_directives,
    })
}

/// Get the variable declarator name (for inferring function names from `const Foo = () => {}`)
fn get_declarator_name(decl: &VariableDeclarator) -> Option<String> {
    match &decl.id {
        PatternLike::Identifier(id) => Some(id.name.clone()),
        _ => None,
    }
}

// -----------------------------------------------------------------------
// FunctionDiscoveryVisitor — uses AstWalker to find compilable functions
// -----------------------------------------------------------------------

/// Visitor that discovers functions to compile, matching the TypeScript
/// compiler's Babel `program.traverse` behavior.
///
/// Dynamically controls body traversal via `traverse_function_bodies()`:
/// functions that are queued for compilation have their bodies skipped
/// (matching Babel's `fn.skip()`), while non-compiled functions have their
/// bodies traversed to find nested component/hook declarations.
///
/// Tracks parent context via:
/// - `current_declarator_name`: set by `enter_variable_declarator`, used to
///   infer function names from `const Foo = () => {}`.
/// - `parent_callee_stack`: set by `enter_call_expression`, used to detect
///   forwardRef/memo wrappers around function expressions.
///
/// In 'all' mode, uses `scope_stack.len() > 1` to reject functions that are
/// not at program scope. The walker pushes the program scope first, then
/// nested scopes for for/switch/etc. — so `len() > 1` means the function
/// is inside a nested scope (not at program level), matching Babel's
/// `fn.scope.getProgramParent() !== fn.scope.parent` check.
struct FunctionDiscoveryVisitor<'a, 'ast> {
    opts: &'a PluginOptions,
    context: &'a mut ProgramContext,
    queue: Vec<CompileSource<'ast>>,
    /// The inferred name from the current VariableDeclarator, if any.
    current_declarator_name: Option<String>,
    /// Stack tracking callee names of enclosing CallExpressions.
    /// `Some(name)` when the callee is a React API (forwardRef/memo),
    /// `None` for other calls.
    parent_callee_stack: Vec<Option<String>>,
    /// Depth counter for loop expression positions (while.test, for-in.right, etc.).
    /// When > 0, functions are treated as non-program-scope in 'all' mode.
    loop_expression_depth: usize,
    /// Set by enter_* hooks: true when the function was queued for compilation,
    /// meaning the walker should NOT traverse its body (matching Babel's fn.skip()).
    /// When false, the walker DOES traverse the body to find nested declarations.
    skip_body: bool,
}

impl<'a, 'ast> FunctionDiscoveryVisitor<'a, 'ast> {
    fn new(opts: &'a PluginOptions, context: &'a mut ProgramContext) -> Self {
        Self {
            opts,
            context,
            queue: Vec::new(),
            current_declarator_name: None,
            parent_callee_stack: Vec::new(),
            loop_expression_depth: 0,
            skip_body: false,
        }
    }

    /// Check if in 'all' mode and the function is inside a nested scope.
    /// The walker pushes the function's own scope BEFORE calling enter hooks,
    /// so scope_stack = [program, ...parents, function_scope]. A top-level
    /// function has len=2 (program + function). Anything deeper means it's
    /// inside a nested scope (for/switch/etc.) and should be rejected.
    /// Also rejects functions found in loop expression positions (while.test,
    /// for-in.right, etc.) where Babel treats the scope as non-program.
    fn is_rejected_by_scope_check(&self, scope_stack: &[ScopeId]) -> bool {
        self.opts.compilation_mode == "all"
            && (scope_stack.len() > 2 || self.loop_expression_depth > 0)
    }

    /// Get the current parent callee name (forwardRef/memo) if any.
    fn current_parent_callee(&self) -> Option<String> {
        self.parent_callee_stack.last().and_then(|opt| opt.clone())
    }
}

impl<'a, 'ast> Visitor<'ast> for FunctionDiscoveryVisitor<'a, 'ast> {
    fn traverse_function_bodies(&self) -> bool {
        // Dynamic: only skip the body of functions that were queued for compilation.
        // Non-queued functions have their bodies traversed to find nested declarations
        // (matching Babel behavior where fn.skip() is only called for compiled functions).
        !self.skip_body
    }

    fn enter_loop_expression(&mut self) {
        self.loop_expression_depth += 1;
    }

    fn leave_loop_expression(&mut self) {
        self.loop_expression_depth -= 1;
    }

    fn enter_variable_declarator(
        &mut self,
        node: &'ast VariableDeclarator,
        _scope_stack: &[ScopeId],
    ) {
        // Only infer the declarator name when the init is a direct function
        // expression, arrow, or call expression (for forwardRef/memo wrappers).
        // TS checks `path.parentPath.isVariableDeclarator()` which only matches
        // when the function IS the init, not when it's nested inside an object,
        // array, or other expression.
        if let Some(ref init) = node.init {
            match init.as_ref() {
                Expression::FunctionExpression(_)
                | Expression::ArrowFunctionExpression(_)
                | Expression::CallExpression(_) => {
                    self.current_declarator_name = get_declarator_name(node);
                }
                _ => {}
            }
        }
    }

    fn leave_variable_declarator(
        &mut self,
        _node: &'ast VariableDeclarator,
        _scope_stack: &[ScopeId],
    ) {
        self.current_declarator_name = None;
    }

    fn enter_call_expression(&mut self, node: &'ast CallExpression, _scope_stack: &[ScopeId]) {
        let callee_name = get_callee_name_if_react_api(&node.callee).map(|s| s.to_string());
        // In TS, the declarator name only flows through forwardRef/memo calls
        // (path.parentPath.isCallExpression() checks the callee). For any other
        // call expression, clear the name so nested functions don't inherit it.
        if callee_name.is_none() {
            self.current_declarator_name = None;
        }
        self.parent_callee_stack.push(callee_name);
    }

    fn leave_call_expression(&mut self, _node: &'ast CallExpression, _scope_stack: &[ScopeId]) {
        let was_react_api = self
            .parent_callee_stack
            .pop()
            .and_then(|name| name)
            .is_some();
        // After a forwardRef/memo call finishes, clear the declarator name.
        // The name is only valid within the call's arguments — if a function
        // inside consumed it via .take(), great; if not, it shouldn't leak
        // to sibling or subsequent expressions.
        if was_react_api {
            self.current_declarator_name = None;
        }
    }

    fn enter_function_declaration(
        &mut self,
        node: &'ast FunctionDeclaration,
        scope_stack: &[ScopeId],
    ) {
        self.skip_body = false;
        if self.is_rejected_by_scope_check(scope_stack) {
            return;
        }
        let info = fn_info_from_decl(node);
        if let Some(source) = try_make_compile_source(info, self.opts, self.context) {
            self.queue.push(source);
            self.skip_body = true;
        }
    }

    fn enter_function_expression(
        &mut self,
        node: &'ast FunctionExpression,
        scope_stack: &[ScopeId],
    ) {
        self.skip_body = false;
        if self.is_rejected_by_scope_check(scope_stack) {
            return;
        }
        // TS getFunctionName for FunctionExpressions only returns names from parent
        // context (VariableDeclarator, AssignmentExpression, Property) — never from
        // the expression's own `id`. So we only use current_declarator_name here.
        let inferred_name = self.current_declarator_name.take();
        let parent_callee = self.current_parent_callee();
        let info = fn_info_from_func_expr(node, inferred_name, parent_callee);
        if let Some(source) = try_make_compile_source(info, self.opts, self.context) {
            self.queue.push(source);
            self.skip_body = true;
        }
    }

    fn enter_arrow_function_expression(
        &mut self,
        node: &'ast ArrowFunctionExpression,
        scope_stack: &[ScopeId],
    ) {
        self.skip_body = false;
        if self.is_rejected_by_scope_check(scope_stack) {
            return;
        }
        let inferred_name = self.current_declarator_name.take();
        let parent_callee = self.current_parent_callee();
        let info = fn_info_from_arrow(node, inferred_name, parent_callee);
        if let Some(source) = try_make_compile_source(info, self.opts, self.context) {
            self.queue.push(source);
            self.skip_body = true;
        }
    }

    fn enter_object_method(
        &mut self,
        _node: &'ast react_compiler_ast::expressions::ObjectMethod,
        _scope_stack: &[ScopeId],
    ) {
        self.skip_body = false;
    }
}

/// Find all functions in the program that should be compiled.
///
/// Uses the `AstWalker` with a `FunctionDiscoveryVisitor` to traverse
/// the entire program, discovering functions at any depth. The visitor
/// dynamically controls body traversal: compiled functions have their
/// bodies skipped (matching Babel's `fn.skip()`), while non-compiled
/// functions have their bodies traversed to find nested declarations.
///
/// The visitor tracks parent context (VariableDeclarator names for
/// `const Foo = () => {}`, CallExpression callees for forwardRef/memo
/// wrappers) via enter/leave hooks.
///
/// Skips classes and their contents (the walker does not recurse into
/// class bodies).
fn find_functions_to_compile<'a>(
    program: &'a Program,
    opts: &PluginOptions,
    context: &mut ProgramContext,
    scope: &ScopeInfo,
) -> Vec<CompileSource<'a>> {
    let mut visitor = FunctionDiscoveryVisitor::new(opts, context);
    let mut walker = AstWalker::new(scope);
    walker.walk_program(&mut visitor, program);
    visitor.queue
}

// -----------------------------------------------------------------------
// Main entry point
// -----------------------------------------------------------------------

/// A successfully compiled function, ready to be applied to the AST.
struct CompiledFunction<'a> {
    #[allow(dead_code)]
    kind: CompileSourceKind,
    #[allow(dead_code)]
    source: &'a CompileSource<'a>,
    codegen_fn: CodegenFunction,
}

/// The type of the original function node, used to determine what kind of
/// replacement node to create.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum OriginalFnKind {
    FunctionDeclaration,
    FunctionExpression,
    ArrowFunctionExpression,
}

/// Owned representation of a compiled function for AST replacement.
/// Does not borrow from the original program, so we can mutate the AST.
struct CompiledFnForReplacement {
    /// Start position of the original function (retained for range queries).
    fn_start: Option<u32>,
    /// Node ID of the original function, used to find it in the AST.
    fn_node_id: Option<u32>,
    /// The kind of the original function node.
    original_kind: OriginalFnKind,
    /// The compiled codegen output.
    codegen_fn: CodegenFunction,
    /// Whether this is an original function (vs outlined). Gating only applies to original.
    #[allow(dead_code)]
    source_kind: CompileSourceKind,
    /// The function name, if any.
    fn_name: Option<String>,
    /// Gating configuration (from dynamic gating or plugin options).
    gating: Option<GatingConfig>,
}

/// Check if a compiled function is referenced before its declaration at the top level.
/// This is needed for the gating rewrite: hoisted function declarations that are
/// referenced before their declaration site need a special gating pattern.
fn get_functions_referenced_before_declaration(
    program: &Program,
    compiled_fns: &[CompiledFnForReplacement],
) -> FxHashSet<u32> {
    // Collect function names and their node_ids for compiled FunctionDeclarations
    let mut fn_names: FxHashMap<String, u32> = FxHashMap::default();
    for compiled in compiled_fns {
        if compiled.original_kind == OriginalFnKind::FunctionDeclaration {
            if let Some(ref name) = compiled.fn_name {
                if let Some(nid) = compiled.fn_node_id {
                    fn_names.insert(name.clone(), nid);
                }
            }
        }
    }

    if fn_names.is_empty() {
        return FxHashSet::default();
    }

    let mut referenced_before_decl: FxHashSet<u32> = FxHashSet::default();

    // Walk through program body in order. For each statement, check if it references
    // any of the function names before the function's declaration.
    for stmt in &program.body {
        // Check if this statement IS one of the function declarations
        if let Statement::FunctionDeclaration(f) = stmt {
            if let Some(ref id) = f.id {
                fn_names.remove(&id.name);
            }
        }
        // For all remaining tracked names, check if the statement references them
        // at the top level (not inside nested functions)
        for (_name, nid) in &fn_names {
            if stmt_references_identifier_at_top_level(stmt, _name) {
                referenced_before_decl.insert(*nid);
            }
        }
    }

    referenced_before_decl
}

/// Check if a statement references an identifier at the top level (not inside nested functions).
fn stmt_references_identifier_at_top_level(stmt: &Statement, name: &str) -> bool {
    match stmt {
        Statement::FunctionDeclaration(_) => {
            // Don't look inside function declarations (they create their own scope)
            false
        }
        Statement::ExportDefaultDeclaration(export) => match export.declaration.as_ref() {
            ExportDefaultDecl::Expression(e) => expr_references_identifier_at_top_level(e, name),
            _ => false,
        },
        Statement::ExportNamedDeclaration(export) => {
            if let Some(ref decl) = export.declaration {
                match decl.as_ref() {
                    Declaration::VariableDeclaration(var_decl) => {
                        var_decl.declarations.iter().any(|d| {
                            d.init
                                .as_ref()
                                .map_or(false, |e| expr_references_identifier_at_top_level(e, name))
                        })
                    }
                    _ => false,
                }
            } else {
                // export { Name } - check specifiers
                export.specifiers.iter().any(|s| {
                    if let react_compiler_ast::declarations::ExportSpecifier::ExportSpecifier(
                        spec,
                    ) = s
                    {
                        match &spec.local {
                            ModuleExportName::Identifier(id) => id.name == name,
                            _ => false,
                        }
                    } else {
                        false
                    }
                })
            }
        }
        Statement::VariableDeclaration(var_decl) => var_decl.declarations.iter().any(|d| {
            d.init
                .as_ref()
                .map_or(false, |e| expr_references_identifier_at_top_level(e, name))
        }),
        Statement::ExpressionStatement(expr_stmt) => {
            expr_references_identifier_at_top_level(&expr_stmt.expression, name)
        }
        Statement::ReturnStatement(ret) => ret
            .argument
            .as_ref()
            .map_or(false, |e| expr_references_identifier_at_top_level(e, name)),
        // Unmodeled statements (e.g. `export = X`) can reference top-level
        // bindings; scan the raw node for a matching Identifier so the
        // gating reference-before-declaration analysis does not miss them.
        Statement::Unknown(unknown) => {
            raw_node_references_identifier(&unknown.raw().parse_value(), name)
        }
        _ => false,
    }
}

/// Conservatively detect an `Identifier` node with the given name anywhere in
/// a raw unmodeled subtree.
fn raw_node_references_identifier(value: &serde_json::Value, name: &str) -> bool {
    match value {
        serde_json::Value::Object(map) => {
            if map.get("type").and_then(serde_json::Value::as_str) == Some("Identifier")
                && map.get("name").and_then(serde_json::Value::as_str) == Some(name)
            {
                return true;
            }
            map.values()
                .any(|v| raw_node_references_identifier(v, name))
        }
        serde_json::Value::Array(items) => items
            .iter()
            .any(|v| raw_node_references_identifier(v, name)),
        _ => false,
    }
}

/// Check if an expression references an identifier at the top level.
fn expr_references_identifier_at_top_level(expr: &Expression, name: &str) -> bool {
    match expr {
        Expression::Identifier(id) => id.name == name,
        Expression::CallExpression(call) => {
            expr_references_identifier_at_top_level(&call.callee, name)
                || call
                    .arguments
                    .iter()
                    .any(|a| expr_references_identifier_at_top_level(a, name))
        }
        Expression::MemberExpression(member) => {
            expr_references_identifier_at_top_level(&member.object, name)
        }
        Expression::ConditionalExpression(cond) => {
            expr_references_identifier_at_top_level(&cond.test, name)
                || expr_references_identifier_at_top_level(&cond.consequent, name)
                || expr_references_identifier_at_top_level(&cond.alternate, name)
        }
        Expression::BinaryExpression(bin) => {
            expr_references_identifier_at_top_level(&bin.left, name)
                || expr_references_identifier_at_top_level(&bin.right, name)
        }
        Expression::LogicalExpression(log) => {
            expr_references_identifier_at_top_level(&log.left, name)
                || expr_references_identifier_at_top_level(&log.right, name)
        }
        // Don't recurse into function expressions/arrows (they create their own scope)
        Expression::FunctionExpression(_) | Expression::ArrowFunctionExpression(_) => false,
        _ => false,
    }
}

/// Build a function expression from a codegen function (compiled output).
fn build_compiled_function_expression(codegen: &CodegenFunction) -> Expression {
    Expression::FunctionExpression(FunctionExpression {
        base: BaseNode::typed("FunctionExpression"),
        id: codegen.id.clone(),
        params: codegen.params.clone(),
        body: codegen.body.clone(),
        generator: codegen.generator,
        is_async: codegen.is_async,
        return_type: None,
        type_parameters: None,
        predicate: None,
    })
}

/// Build a function expression that preserves the original function's structure.
/// For FunctionDeclarations, converts to FunctionExpression.
/// For ArrowFunctionExpressions, keeps as-is.
fn clone_original_fn_as_expression(stmt: &Statement, node_id: u32) -> Option<Expression> {
    match stmt {
        Statement::FunctionDeclaration(f) => {
            if f.base.node_id == Some(node_id) {
                return Some(Expression::FunctionExpression(FunctionExpression {
                    base: BaseNode::typed("FunctionExpression"),
                    id: f.id.clone(),
                    params: f.params.clone(),
                    body: f.body.clone(),
                    generator: f.generator,
                    is_async: f.is_async,
                    return_type: None,
                    type_parameters: None,
                    predicate: None,
                }));
            }
            None
        }
        Statement::VariableDeclaration(var_decl) => {
            for d in &var_decl.declarations {
                if let Some(ref init) = d.init {
                    if let Some(e) = clone_original_expr_as_expression(init, node_id) {
                        return Some(e);
                    }
                }
            }
            None
        }
        Statement::ExportDefaultDeclaration(export) => match export.declaration.as_ref() {
            ExportDefaultDecl::FunctionDeclaration(f) => {
                if f.base.node_id == Some(node_id) {
                    return Some(Expression::FunctionExpression(FunctionExpression {
                        base: BaseNode::typed("FunctionExpression"),
                        id: f.id.clone(),
                        params: f.params.clone(),
                        body: f.body.clone(),
                        generator: f.generator,
                        is_async: f.is_async,
                        return_type: None,
                        type_parameters: None,
                        predicate: None,
                    }));
                }
                None
            }
            ExportDefaultDecl::Expression(e) => clone_original_expr_as_expression(e, node_id),
            _ => None,
        },
        Statement::ExportNamedDeclaration(export) => {
            if let Some(ref decl) = export.declaration {
                match decl.as_ref() {
                    Declaration::FunctionDeclaration(f) => {
                        if f.base.node_id == Some(node_id) {
                            return Some(Expression::FunctionExpression(FunctionExpression {
                                base: BaseNode::typed("FunctionExpression"),
                                id: f.id.clone(),
                                params: f.params.clone(),
                                body: f.body.clone(),
                                generator: f.generator,
                                is_async: f.is_async,
                                return_type: None,
                                type_parameters: None,
                                predicate: None,
                            }));
                        }
                        None
                    }
                    Declaration::VariableDeclaration(var_decl) => {
                        for d in &var_decl.declarations {
                            if let Some(ref init) = d.init {
                                if let Some(e) = clone_original_expr_as_expression(init, node_id) {
                                    return Some(e);
                                }
                            }
                        }
                        None
                    }
                    _ => None,
                }
            } else {
                None
            }
        }
        Statement::ExpressionStatement(expr_stmt) => {
            clone_original_expr_as_expression(&expr_stmt.expression, node_id)
        }
        // Recurse into block-containing statements
        Statement::BlockStatement(block) => {
            for s in &block.body {
                if let Some(e) = clone_original_fn_as_expression(s, node_id) {
                    return Some(e);
                }
            }
            None
        }
        Statement::IfStatement(if_stmt) => {
            if let Some(e) = clone_original_expr_as_expression(&if_stmt.test, node_id) {
                return Some(e);
            }
            if let Some(e) = clone_original_fn_as_expression(&if_stmt.consequent, node_id) {
                return Some(e);
            }
            if let Some(ref alt) = if_stmt.alternate {
                if let Some(e) = clone_original_fn_as_expression(alt, node_id) {
                    return Some(e);
                }
            }
            None
        }
        Statement::TryStatement(try_stmt) => {
            for s in &try_stmt.block.body {
                if let Some(e) = clone_original_fn_as_expression(s, node_id) {
                    return Some(e);
                }
            }
            if let Some(ref handler) = try_stmt.handler {
                for s in &handler.body.body {
                    if let Some(e) = clone_original_fn_as_expression(s, node_id) {
                        return Some(e);
                    }
                }
            }
            if let Some(ref finalizer) = try_stmt.finalizer {
                for s in &finalizer.body {
                    if let Some(e) = clone_original_fn_as_expression(s, node_id) {
                        return Some(e);
                    }
                }
            }
            None
        }
        Statement::SwitchStatement(switch_stmt) => {
            if let Some(e) = clone_original_expr_as_expression(&switch_stmt.discriminant, node_id) {
                return Some(e);
            }
            for case in &switch_stmt.cases {
                for s in &case.consequent {
                    if let Some(e) = clone_original_fn_as_expression(s, node_id) {
                        return Some(e);
                    }
                }
            }
            None
        }
        Statement::LabeledStatement(labeled) => {
            clone_original_fn_as_expression(&labeled.body, node_id)
        }
        Statement::ForStatement(for_stmt) => {
            if let Some(ref init) = for_stmt.init {
                match init.as_ref() {
                    ForInit::VariableDeclaration(var_decl) => {
                        for d in &var_decl.declarations {
                            if let Some(ref init_expr) = d.init {
                                if let Some(e) =
                                    clone_original_expr_as_expression(init_expr, node_id)
                                {
                                    return Some(e);
                                }
                            }
                        }
                    }
                    ForInit::Expression(expr) => {
                        if let Some(e) = clone_original_expr_as_expression(expr, node_id) {
                            return Some(e);
                        }
                    }
                }
            }
            if let Some(ref test) = for_stmt.test {
                if let Some(e) = clone_original_expr_as_expression(test, node_id) {
                    return Some(e);
                }
            }
            if let Some(ref update) = for_stmt.update {
                if let Some(e) = clone_original_expr_as_expression(update, node_id) {
                    return Some(e);
                }
            }
            clone_original_fn_as_expression(&for_stmt.body, node_id)
        }
        Statement::WhileStatement(while_stmt) => {
            if let Some(e) = clone_original_expr_as_expression(&while_stmt.test, node_id) {
                return Some(e);
            }
            clone_original_fn_as_expression(&while_stmt.body, node_id)
        }
        Statement::DoWhileStatement(do_while) => {
            if let Some(e) = clone_original_expr_as_expression(&do_while.test, node_id) {
                return Some(e);
            }
            clone_original_fn_as_expression(&do_while.body, node_id)
        }
        Statement::ForInStatement(for_in) => {
            if let Some(e) = clone_original_expr_as_expression(&for_in.right, node_id) {
                return Some(e);
            }
            clone_original_fn_as_expression(&for_in.body, node_id)
        }
        Statement::ForOfStatement(for_of) => {
            if let Some(e) = clone_original_expr_as_expression(&for_of.right, node_id) {
                return Some(e);
            }
            clone_original_fn_as_expression(&for_of.body, node_id)
        }
        Statement::WithStatement(with_stmt) => {
            if let Some(e) = clone_original_expr_as_expression(&with_stmt.object, node_id) {
                return Some(e);
            }
            clone_original_fn_as_expression(&with_stmt.body, node_id)
        }
        Statement::ReturnStatement(ret) => {
            if let Some(ref arg) = ret.argument {
                clone_original_expr_as_expression(arg, node_id)
            } else {
                None
            }
        }
        Statement::ThrowStatement(throw_stmt) => {
            clone_original_expr_as_expression(&throw_stmt.argument, node_id)
        }
        _ => None,
    }
}

/// Clone an expression node for use as the original (fallback) in gating.
fn clone_original_expr_as_expression(expr: &Expression, node_id: u32) -> Option<Expression> {
    match expr {
        Expression::FunctionExpression(f) => {
            if f.base.node_id == Some(node_id) {
                return Some(Expression::FunctionExpression(f.clone()));
            }
            None
        }
        Expression::ArrowFunctionExpression(f) => {
            if f.base.node_id == Some(node_id) {
                return Some(Expression::ArrowFunctionExpression(f.clone()));
            }
            None
        }
        Expression::CallExpression(call) => {
            for arg in &call.arguments {
                if let Some(e) = clone_original_expr_as_expression(arg, node_id) {
                    return Some(e);
                }
            }
            None
        }
        Expression::ObjectExpression(obj) => {
            for prop in &obj.properties {
                match prop {
                    ObjectExpressionProperty::ObjectProperty(p) => {
                        if let Some(e) = clone_original_expr_as_expression(&p.value, node_id) {
                            return Some(e);
                        }
                    }
                    ObjectExpressionProperty::SpreadElement(s) => {
                        if let Some(e) = clone_original_expr_as_expression(&s.argument, node_id) {
                            return Some(e);
                        }
                    }
                    _ => {}
                }
            }
            None
        }
        Expression::ArrayExpression(arr) => {
            for elem in arr.elements.iter().flatten() {
                if let Some(e) = clone_original_expr_as_expression(elem, node_id) {
                    return Some(e);
                }
            }
            None
        }
        Expression::AssignmentExpression(assign) => {
            clone_original_expr_as_expression(&assign.right, node_id)
        }
        Expression::SequenceExpression(seq) => {
            for e in &seq.expressions {
                if let Some(e) = clone_original_expr_as_expression(e, node_id) {
                    return Some(e);
                }
            }
            None
        }
        Expression::ConditionalExpression(cond) => {
            if let Some(e) = clone_original_expr_as_expression(&cond.consequent, node_id) {
                return Some(e);
            }
            clone_original_expr_as_expression(&cond.alternate, node_id)
        }
        Expression::ParenthesizedExpression(paren) => {
            clone_original_expr_as_expression(&paren.expression, node_id)
        }
        _ => None,
    }
}

/// Build a compiled arrow/function expression from a codegen function,
/// matching the original expression kind.
fn build_compiled_expression_matching_kind(
    codegen: &CodegenFunction,
    original_kind: OriginalFnKind,
) -> Expression {
    match original_kind {
        OriginalFnKind::ArrowFunctionExpression => {
            Expression::ArrowFunctionExpression(ArrowFunctionExpression {
                base: BaseNode::typed("ArrowFunctionExpression"),
                params: codegen.params.clone(),
                body: Box::new(ArrowFunctionBody::BlockStatement(codegen.body.clone())),
                id: None,
                generator: codegen.generator,
                is_async: codegen.is_async,
                expression: Some(false),
                return_type: None,
                type_parameters: None,
                predicate: None,
            })
        }
        _ => build_compiled_function_expression(codegen),
    }
}

/// Apply compiled functions back to the AST by replacing original function nodes
/// with their compiled versions, inserting outlined functions, and adding imports.
fn apply_compiled_functions(
    compiled_fns: &[CompiledFnForReplacement],
    program: &mut Program,
    context: &mut ProgramContext,
) {
    if compiled_fns.is_empty() {
        return;
    }

    // Check if any compiled functions have gating enabled
    let has_gating = compiled_fns.iter().any(|cf| cf.gating.is_some());

    // If gating is enabled, determine which functions are referenced before declaration
    let referenced_before_decl = if has_gating {
        get_functions_referenced_before_declaration(program, compiled_fns)
    } else {
        FxHashSet::default()
    };

    // For gated functions, we need to clone the original function expressions
    // BEFORE we start mutating the AST.
    let original_expressions: Vec<Option<Expression>> = if has_gating {
        compiled_fns
            .iter()
            .map(|compiled| {
                if compiled.gating.is_some() {
                    if let Some(node_id) = compiled.fn_node_id {
                        for stmt in program.body.iter() {
                            if let Some(expr) = clone_original_fn_as_expression(stmt, node_id) {
                                return Some(expr);
                            }
                        }
                    }
                    None
                } else {
                    None
                }
            })
            .collect()
    } else {
        compiled_fns.iter().map(|_| None).collect()
    };

    // Collect outlined functions to insert (as FunctionDeclarations).
    // For FunctionDeclarations: insert right after the parent (matching TS insertAfter behavior)
    // For FunctionExpression/ArrowFunctionExpression: append at end of program body
    //   (matching TS pushContainer behavior)
    let mut outlined_decls: Vec<(Option<u32>, OriginalFnKind, FunctionDeclaration)> = Vec::new(); // (node_id, kind, decl)

    // Replace each compiled function in the AST
    for (idx, compiled) in compiled_fns.iter().enumerate() {
        // Collect outlined functions for this compiled function
        for outlined in &compiled.codegen_fn.outlined {
            let outlined_decl = FunctionDeclaration {
                base: BaseNode::typed("FunctionDeclaration"),
                id: outlined.func.id.clone(),
                params: outlined.func.params.clone(),
                body: outlined.func.body.clone(),
                generator: outlined.func.generator,
                is_async: outlined.func.is_async,
                declare: None,
                return_type: None,
                type_parameters: None,
                predicate: None,
                component_declaration: false,
                hook_declaration: false,
            };
            outlined_decls.push((compiled.fn_node_id, compiled.original_kind, outlined_decl));
        }

        if let Some(ref gating_config) = compiled.gating {
            let is_ref_before_decl = compiled
                .fn_node_id
                .map_or(false, |nid| referenced_before_decl.contains(&nid));

            if is_ref_before_decl && compiled.original_kind == OriginalFnKind::FunctionDeclaration {
                // Use the hoisted function declaration gating pattern
                apply_gated_function_hoisted(program, compiled, gating_config, context);
            } else {
                // Use the conditional expression gating pattern
                let original_expr = original_expressions[idx].clone();
                apply_gated_function_conditional(
                    program,
                    compiled,
                    gating_config,
                    original_expr,
                    context,
                );
            }
        } else {
            // No gating: replace the function directly (original behavior)
            if let Some(node_id) = compiled.fn_node_id {
                let mut visitor = ReplaceFnVisitor { node_id, compiled };
                walk_program_mut(&mut visitor, program);
            }
        }
    }

    // Insert outlined function declarations.
    // For FunctionDeclarations: insert right after the parent function at the same scope level.
    //   This requires recursive search since the parent may be nested inside other functions.
    //   Matches TS behavior: `originalFn.insertAfter(outlinedFn)`.
    // For FunctionExpression/ArrowFunctionExpression: push to program body (top level).
    //   Matches TS behavior: `program.pushContainer('body', [fn])`.

    for (parent_node_id, original_kind, outlined_decl) in outlined_decls {
        let outlined_stmt = Statement::FunctionDeclaration(outlined_decl);
        match original_kind {
            OriginalFnKind::FunctionDeclaration => {
                if let Some(nid) = parent_node_id {
                    if !insert_after_fn_recursive(&mut program.body, nid, outlined_stmt.clone()) {
                        program.body.push(outlined_stmt);
                    }
                } else {
                    program.body.push(outlined_stmt);
                }
            }
            OriginalFnKind::FunctionExpression | OriginalFnKind::ArrowFunctionExpression => {
                program.body.push(outlined_stmt);
            }
        }
    }

    // Register the memo cache import and rename useMemoCache references.
    let needs_memo_import = compiled_fns
        .iter()
        .any(|cf| cf.codegen_fn.memo_slots_used > 0);
    if needs_memo_import {
        let import_spec = context.add_memo_cache_import();
        let local_name = import_spec.name;
        let mut visitor = RenameIdentifierVisitor {
            old_name: "useMemoCache",
            new_name: &local_name,
        };
        walk_program_mut(&mut visitor, program);
    }

    // Instrumentation and hook guard imports are pre-registered in compile_program
    // before compilation, so they are already in the imports map. No post-hoc
    // renaming needed since codegen uses the pre-resolved local names.

    add_imports_to_program(program, context);
}

/// Apply the conditional expression gating pattern.
///
/// For function declarations (non-export-default, non-hoisted):
///   `function Foo(props) { ... }` -> `const Foo = gating() ? function Foo(...) { compiled } : function Foo(...) { original };`
///
/// For export default function with name:
///   `export default function Foo(props) { ... }` -> `const Foo = gating() ? ... : ...; export default Foo;`
///
/// For export named function:
///   `export function Foo(props) { ... }` -> `export const Foo = gating() ? ... : ...;`
///
/// For arrow/function expressions:
///   Replace the expression inline with `gating() ? compiled : original`
fn apply_gated_function_conditional(
    program: &mut Program,
    compiled: &CompiledFnForReplacement,
    gating_config: &GatingConfig,
    original_expr: Option<Expression>,
    context: &mut ProgramContext,
) {
    let _start = match compiled.fn_start {
        Some(s) => s,
        None => return,
    };
    let node_id = match compiled.fn_node_id {
        Some(nid) => nid,
        None => return,
    };

    // Add the gating import
    let gating_import = context.add_import_specifier(
        &gating_config.source,
        &gating_config.import_specifier_name,
        None,
    );
    let gating_callee_name = gating_import.name;

    // Build the compiled expression
    let compiled_expr =
        build_compiled_expression_matching_kind(&compiled.codegen_fn, compiled.original_kind);

    // Build the original (fallback) expression
    let original_expr = match original_expr {
        Some(e) => e,
        None => return, // shouldn't happen
    };

    // Build: gating() ? compiled : original
    let gating_expression = Expression::ConditionalExpression(ConditionalExpression {
        base: BaseNode::typed("ConditionalExpression"),
        test: Box::new(Expression::CallExpression(CallExpression {
            base: BaseNode::typed("CallExpression"),
            callee: Box::new(Expression::Identifier(Identifier {
                base: BaseNode::typed("Identifier"),
                name: gating_callee_name,
                type_annotation: None,
                optional: None,
                decorators: None,
            })),
            arguments: vec![],
            type_parameters: None,
            type_arguments: None,
            optional: None,
        })),
        consequent: Box::new(compiled_expr),
        alternate: Box::new(original_expr),
    });

    // Find and replace the function in the program body.
    // We need to track if this was an export default function with a name,
    // because we need to insert `export default Name;` after the replacement.
    let mut export_default_name: Option<(usize, String)> = None;

    for (idx, stmt) in program.body.iter().enumerate() {
        if let Statement::ExportDefaultDeclaration(export) = stmt {
            if let ExportDefaultDecl::FunctionDeclaration(f) = export.declaration.as_ref() {
                if f.base.node_id == Some(node_id) {
                    if let Some(ref fn_id) = f.id {
                        export_default_name = Some((idx, fn_id.name.clone()));
                    }
                }
            }
        }
    }

    let mut visitor = ReplaceWithGatedVisitor {
        node_id,
        gating_expression: &gating_expression,
    };
    walk_program_mut(&mut visitor, program);

    // If this was an export default function with a name, insert `export default Name;` after
    if let Some((idx, name)) = export_default_name {
        program.body.insert(
            idx + 1,
            Statement::ExportDefaultDeclaration(ExportDefaultDeclaration {
                base: BaseNode::typed("ExportDefaultDeclaration"),
                declaration: Box::new(ExportDefaultDecl::Expression(Box::new(
                    Expression::Identifier(Identifier {
                        base: BaseNode::typed("Identifier"),
                        name,
                        type_annotation: None,
                        optional: None,
                        decorators: None,
                    }),
                ))),
                export_kind: None,
            }),
        );
    }
}

/// Visitor that replaces a function with a gated conditional expression.
struct ReplaceWithGatedVisitor<'a> {
    node_id: u32,
    gating_expression: &'a Expression,
}

impl MutVisitor for ReplaceWithGatedVisitor<'_> {
    fn visit_statement(&mut self, stmt: &mut Statement) -> VisitResult {
        // FunctionDeclaration → replace with `const Foo = gating() ? ... : ...;`
        if let Statement::FunctionDeclaration(f) = &*stmt {
            if f.base.node_id == Some(self.node_id) {
                let fn_name = f.id.clone().unwrap_or_else(|| Identifier {
                    base: BaseNode::typed("Identifier"),
                    name: "anonymous".to_string(),
                    type_annotation: None,
                    optional: None,
                    decorators: None,
                });
                let mut base = BaseNode::typed("VariableDeclaration");
                base.leading_comments = f.base.leading_comments.clone();
                base.trailing_comments = f.base.trailing_comments.clone();
                base.inner_comments = f.base.inner_comments.clone();
                *stmt = Statement::VariableDeclaration(VariableDeclaration {
                    base,
                    kind: VariableDeclarationKind::Const,
                    declarations: vec![VariableDeclarator {
                        base: BaseNode::typed("VariableDeclarator"),
                        id: PatternLike::Identifier(fn_name),
                        init: Some(Box::new(self.gating_expression.clone())),
                        definite: None,
                    }],
                    declare: None,
                });
                return VisitResult::Stop;
            }
        }

        // ExportDefaultDeclaration with FunctionDeclaration
        if let Statement::ExportDefaultDeclaration(export) = stmt {
            let is_fn_decl_match = matches!(
                export.declaration.as_ref(),
                ExportDefaultDecl::FunctionDeclaration(f) if f.base.node_id == Some(self.node_id)
            );
            if is_fn_decl_match {
                if let ExportDefaultDecl::FunctionDeclaration(f) = export.declaration.as_ref() {
                    let fn_name = f.id.clone();
                    if let Some(fn_id) = fn_name {
                        let mut base = BaseNode::typed("VariableDeclaration");
                        base.leading_comments = export.base.leading_comments.clone();
                        base.trailing_comments = export.base.trailing_comments.clone();
                        base.inner_comments = export.base.inner_comments.clone();
                        *stmt = Statement::VariableDeclaration(VariableDeclaration {
                            base,
                            kind: VariableDeclarationKind::Const,
                            declarations: vec![VariableDeclarator {
                                base: BaseNode::typed("VariableDeclarator"),
                                id: PatternLike::Identifier(fn_id),
                                init: Some(Box::new(self.gating_expression.clone())),
                                definite: None,
                            }],
                            declare: None,
                        });
                        return VisitResult::Stop;
                    } else {
                        export.declaration = Box::new(ExportDefaultDecl::Expression(Box::new(
                            self.gating_expression.clone(),
                        )));
                        return VisitResult::Stop;
                    }
                }
            }
            // Expression case handled by walker recursion into visit_expression
        }

        // ExportNamedDeclaration with FunctionDeclaration
        if let Statement::ExportNamedDeclaration(export) = stmt {
            if let Some(ref mut decl) = export.declaration {
                if let Declaration::FunctionDeclaration(f) = decl.as_mut() {
                    if f.base.node_id == Some(self.node_id) {
                        let fn_name = f.id.clone().unwrap_or_else(|| Identifier {
                            base: BaseNode::typed("Identifier"),
                            name: "anonymous".to_string(),
                            type_annotation: None,
                            optional: None,
                            decorators: None,
                        });
                        *decl = Box::new(Declaration::VariableDeclaration(VariableDeclaration {
                            base: BaseNode::typed("VariableDeclaration"),
                            kind: VariableDeclarationKind::Const,
                            declarations: vec![VariableDeclarator {
                                base: BaseNode::typed("VariableDeclarator"),
                                id: PatternLike::Identifier(fn_name),
                                init: Some(Box::new(self.gating_expression.clone())),
                                definite: None,
                            }],
                            declare: None,
                        }));
                        return VisitResult::Stop;
                    }
                }
            }
        }

        VisitResult::Continue
    }

    fn visit_expression(&mut self, expr: &mut Expression) -> VisitResult {
        match expr {
            Expression::FunctionExpression(f) if f.base.node_id == Some(self.node_id) => {
                *expr = self.gating_expression.clone();
                VisitResult::Stop
            }
            Expression::ArrowFunctionExpression(f) if f.base.node_id == Some(self.node_id) => {
                *expr = self.gating_expression.clone();
                VisitResult::Stop
            }
            _ => VisitResult::Continue,
        }
    }
}

/// Apply the hoisted function declaration gating pattern.
///
/// This is used when a function declaration is referenced before its declaration site.
/// Instead of wrapping in a conditional expression (which would break hoisting), we:
/// 1. Rename the original function to `Foo_unoptimized`
/// 2. Insert a compiled function as `Foo_optimized`
/// 3. Insert a `const gating_result = gating()` before
/// 4. Insert a new `function Foo(arg0, ...) { if (gating_result) return Foo_optimized(...); else return Foo_unoptimized(...); }` after
fn apply_gated_function_hoisted(
    program: &mut Program,
    compiled: &CompiledFnForReplacement,
    gating_config: &GatingConfig,
    context: &mut ProgramContext,
) {
    let _start = match compiled.fn_start {
        Some(s) => s,
        None => return,
    };
    let node_id = match compiled.fn_node_id {
        Some(nid) => nid,
        None => return,
    };

    let original_fn_name = match &compiled.fn_name {
        Some(name) => name.clone(),
        None => return,
    };

    // Add the gating import
    let gating_import = context.add_import_specifier(
        &gating_config.source,
        &gating_config.import_specifier_name,
        None,
    );
    let gating_callee_name = gating_import.name.clone();

    // Generate unique names
    let gating_result_name = context.new_uid(&format!("{}_result", gating_callee_name));
    let unoptimized_name = context.new_uid(&format!("{}_unoptimized", original_fn_name));
    let optimized_name = context.new_uid(&format!("{}_optimized", original_fn_name));

    // Find the original function declaration and determine its params
    let mut original_params: Vec<PatternLike> = Vec::new();
    let mut fn_stmt_idx: Option<usize> = None;

    for (idx, stmt) in program.body.iter().enumerate() {
        if let Statement::FunctionDeclaration(f) = stmt {
            if f.base.node_id == Some(node_id) {
                original_params = f.params.clone();
                fn_stmt_idx = Some(idx);
                break;
            }
        }
    }

    let fn_idx = match fn_stmt_idx {
        Some(idx) => idx,
        None => return,
    };

    // Rename the original function to `_unoptimized`
    if let Statement::FunctionDeclaration(f) = &mut program.body[fn_idx] {
        if let Some(ref mut id) = f.id {
            id.name = unoptimized_name.clone();
        }
    }

    // Build the optimized function declaration (compiled version with renamed id)
    let compiled_fn_decl = FunctionDeclaration {
        base: BaseNode::typed("FunctionDeclaration"),
        id: Some(Identifier {
            base: BaseNode::typed("Identifier"),
            name: optimized_name.clone(),
            type_annotation: None,
            optional: None,
            decorators: None,
        }),
        params: compiled.codegen_fn.params.clone(),
        body: compiled.codegen_fn.body.clone(),
        generator: compiled.codegen_fn.generator,
        is_async: compiled.codegen_fn.is_async,
        declare: None,
        return_type: None,
        type_parameters: None,
        predicate: None,
        component_declaration: false,
        hook_declaration: false,
    };

    // Build the gating result variable: `const gating_result = gating();`
    let gating_result_stmt = Statement::VariableDeclaration(VariableDeclaration {
        base: BaseNode::typed("VariableDeclaration"),
        kind: VariableDeclarationKind::Const,
        declarations: vec![VariableDeclarator {
            base: BaseNode::typed("VariableDeclarator"),
            id: PatternLike::Identifier(Identifier {
                base: BaseNode::typed("Identifier"),
                name: gating_result_name.clone(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }),
            init: Some(Box::new(Expression::CallExpression(CallExpression {
                base: BaseNode::typed("CallExpression"),
                callee: Box::new(Expression::Identifier(Identifier {
                    base: BaseNode::typed("Identifier"),
                    name: gating_callee_name,
                    type_annotation: None,
                    optional: None,
                    decorators: None,
                })),
                arguments: vec![],
                type_parameters: None,
                type_arguments: None,
                optional: None,
            }))),
            definite: None,
        }],
        declare: None,
    });

    // Build new params and args for the dispatcher function
    let num_params = original_params.len();
    let mut new_params: Vec<PatternLike> = Vec::new();
    let mut optimized_args: Vec<Expression> = Vec::new();
    let mut unoptimized_args: Vec<Expression> = Vec::new();

    for i in 0..num_params {
        let arg_name = format!("arg{}", i);
        let is_rest = matches!(&original_params[i], PatternLike::RestElement(_));

        if is_rest {
            new_params.push(PatternLike::RestElement(
                react_compiler_ast::patterns::RestElement {
                    base: BaseNode::typed("RestElement"),
                    argument: Box::new(PatternLike::Identifier(Identifier {
                        base: BaseNode::typed("Identifier"),
                        name: arg_name.clone(),
                        type_annotation: None,
                        optional: None,
                        decorators: None,
                    })),
                    type_annotation: None,
                    decorators: None,
                },
            ));
            optimized_args.push(Expression::SpreadElement(SpreadElement {
                base: BaseNode::typed("SpreadElement"),
                argument: Box::new(Expression::Identifier(Identifier {
                    base: BaseNode::typed("Identifier"),
                    name: arg_name.clone(),
                    type_annotation: None,
                    optional: None,
                    decorators: None,
                })),
            }));
            unoptimized_args.push(Expression::SpreadElement(SpreadElement {
                base: BaseNode::typed("SpreadElement"),
                argument: Box::new(Expression::Identifier(Identifier {
                    base: BaseNode::typed("Identifier"),
                    name: arg_name,
                    type_annotation: None,
                    optional: None,
                    decorators: None,
                })),
            }));
        } else {
            new_params.push(PatternLike::Identifier(Identifier {
                base: BaseNode::typed("Identifier"),
                name: arg_name.clone(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }));
            optimized_args.push(Expression::Identifier(Identifier {
                base: BaseNode::typed("Identifier"),
                name: arg_name.clone(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }));
            unoptimized_args.push(Expression::Identifier(Identifier {
                base: BaseNode::typed("Identifier"),
                name: arg_name,
                type_annotation: None,
                optional: None,
                decorators: None,
            }));
        }
    }

    // Build the dispatcher function:
    // function Foo(arg0, ...) {
    //   if (gating_result) return Foo_optimized(arg0, ...);
    //   else return Foo_unoptimized(arg0, ...);
    // }
    let dispatcher_fn = Statement::FunctionDeclaration(FunctionDeclaration {
        base: BaseNode::typed("FunctionDeclaration"),
        id: Some(Identifier {
            base: BaseNode::typed("Identifier"),
            name: original_fn_name,
            type_annotation: None,
            optional: None,
            decorators: None,
        }),
        params: new_params,
        body: BlockStatement {
            base: BaseNode::typed("BlockStatement"),
            body: vec![Statement::IfStatement(IfStatement {
                base: BaseNode::typed("IfStatement"),
                test: Box::new(Expression::Identifier(Identifier {
                    base: BaseNode::typed("Identifier"),
                    name: gating_result_name,
                    type_annotation: None,
                    optional: None,
                    decorators: None,
                })),
                consequent: Box::new(Statement::ReturnStatement(ReturnStatement {
                    base: BaseNode::typed("ReturnStatement"),
                    argument: Some(Box::new(Expression::CallExpression(CallExpression {
                        base: BaseNode::typed("CallExpression"),
                        callee: Box::new(Expression::Identifier(Identifier {
                            base: BaseNode::typed("Identifier"),
                            name: optimized_name.clone(),
                            type_annotation: None,
                            optional: None,
                            decorators: None,
                        })),
                        arguments: optimized_args,
                        type_parameters: None,
                        type_arguments: None,
                        optional: None,
                    }))),
                })),
                alternate: Some(Box::new(Statement::ReturnStatement(ReturnStatement {
                    base: BaseNode::typed("ReturnStatement"),
                    argument: Some(Box::new(Expression::CallExpression(CallExpression {
                        base: BaseNode::typed("CallExpression"),
                        callee: Box::new(Expression::Identifier(Identifier {
                            base: BaseNode::typed("Identifier"),
                            name: unoptimized_name,
                            type_annotation: None,
                            optional: None,
                            decorators: None,
                        })),
                        arguments: unoptimized_args,
                        type_parameters: None,
                        type_arguments: None,
                        optional: None,
                    }))),
                }))),
            })],
            directives: vec![],
        },
        generator: false,
        is_async: false,
        declare: None,
        return_type: None,
        type_parameters: None,
        predicate: None,
        component_declaration: false,
        hook_declaration: false,
    });

    // Insert nodes. The TS code uses insertBefore for the gating result and optimized fn,
    // and insertAfter for the dispatcher. The order in the output should be:
    //   ... (existing statements before fn_idx) ...
    //   const gating_result = gating();       <- inserted before
    //   function Foo_optimized() { ... }       <- inserted before
    //   function Foo_unoptimized() { ... }     <- the original (renamed)
    //   function Foo(arg0) { ... }             <- inserted after
    //   ... (existing statements after fn_idx) ...
    //
    // insertBefore inserts before the target, and insertAfter inserts after.
    // We insert in reverse order for insertAfter.

    // Insert dispatcher after the original (now renamed) function
    program.body.insert(fn_idx + 1, dispatcher_fn);

    // Insert optimized function before the original
    program
        .body
        .insert(fn_idx, Statement::FunctionDeclaration(compiled_fn_decl));

    // Insert gating result before the optimized function
    program.body.insert(fn_idx, gating_result_stmt);
}

/// Recursively search for a function at `start` position and insert `new_stmt`
/// right after it in the same block. Returns true if successfully inserted.
/// Searches through all nested structures: function bodies, object method bodies, etc.
fn insert_after_fn_recursive(
    stmts: &mut Vec<Statement>,
    node_id: u32,
    new_stmt: Statement,
) -> bool {
    // Check this level first
    if let Some(pos) = stmts
        .iter()
        .position(|s| stmt_has_fn_with_node_id(s, node_id))
    {
        stmts.insert(pos + 1, new_stmt);
        return true;
    }
    // Recurse into every statement that can contain nested blocks
    for stmt in stmts.iter_mut() {
        if insert_after_fn_in_stmt(stmt, node_id, &new_stmt) {
            return true;
        }
    }
    false
}

fn insert_after_fn_in_stmt(stmt: &mut Statement, node_id: u32, new_stmt: &Statement) -> bool {
    match stmt {
        Statement::FunctionDeclaration(f) => {
            insert_after_fn_in_block(&mut f.body, node_id, new_stmt)
        }
        Statement::BlockStatement(b) => insert_after_fn_in_block(b, node_id, new_stmt),
        Statement::ExpressionStatement(e) => {
            insert_after_fn_in_expr(&mut e.expression, node_id, new_stmt)
        }
        Statement::ReturnStatement(r) => {
            if let Some(arg) = &mut r.argument {
                insert_after_fn_in_expr(arg, node_id, new_stmt)
            } else {
                false
            }
        }
        Statement::VariableDeclaration(v) => {
            for decl in &mut v.declarations {
                if let Some(init) = &mut decl.init {
                    if insert_after_fn_in_expr(init, node_id, new_stmt) {
                        return true;
                    }
                }
            }
            false
        }
        Statement::ExportDefaultDeclaration(e) => match e.declaration.as_mut() {
            ExportDefaultDecl::FunctionDeclaration(f) => {
                insert_after_fn_in_block(&mut f.body, node_id, new_stmt)
            }
            ExportDefaultDecl::Expression(expr) => insert_after_fn_in_expr(expr, node_id, new_stmt),
            _ => false,
        },
        Statement::ExportNamedDeclaration(e) => {
            if let Some(decl) = &mut e.declaration {
                match decl.as_mut() {
                    Declaration::FunctionDeclaration(f) => {
                        insert_after_fn_in_block(&mut f.body, node_id, new_stmt)
                    }
                    Declaration::VariableDeclaration(v) => {
                        for d in &mut v.declarations {
                            if let Some(init) = &mut d.init {
                                if insert_after_fn_in_expr(init, node_id, new_stmt) {
                                    return true;
                                }
                            }
                        }
                        false
                    }
                    _ => false,
                }
            } else {
                false
            }
        }
        Statement::IfStatement(i) => {
            insert_after_fn_in_stmt(&mut i.consequent, node_id, new_stmt)
                || i.alternate
                    .as_mut()
                    .map_or(false, |a| insert_after_fn_in_stmt(a, node_id, new_stmt))
        }
        Statement::ForStatement(f) => insert_after_fn_in_stmt(&mut f.body, node_id, new_stmt),
        Statement::WhileStatement(w) => insert_after_fn_in_stmt(&mut w.body, node_id, new_stmt),
        Statement::TryStatement(t) => {
            if insert_after_fn_in_block(&mut t.block, node_id, new_stmt) {
                return true;
            }
            if let Some(h) = &mut t.handler {
                if insert_after_fn_in_block(&mut h.body, node_id, new_stmt) {
                    return true;
                }
            }
            if let Some(f) = &mut t.finalizer {
                if insert_after_fn_in_block(f, node_id, new_stmt) {
                    return true;
                }
            }
            false
        }
        _ => false,
    }
}

fn insert_after_fn_in_block(
    block: &mut react_compiler_ast::statements::BlockStatement,
    node_id: u32,
    new_stmt: &Statement,
) -> bool {
    if let Some(pos) = block
        .body
        .iter()
        .position(|s| stmt_has_fn_with_node_id(s, node_id))
    {
        block.body.insert(pos + 1, new_stmt.clone());
        return true;
    }
    for stmt in block.body.iter_mut() {
        if insert_after_fn_in_stmt(stmt, node_id, new_stmt) {
            return true;
        }
    }
    false
}

fn insert_after_fn_in_expr(
    expr: &mut react_compiler_ast::expressions::Expression,
    node_id: u32,
    new_stmt: &Statement,
) -> bool {
    use react_compiler_ast::expressions::Expression;
    match expr {
        Expression::ObjectExpression(obj) => {
            for prop in &mut obj.properties {
                match prop {
                    react_compiler_ast::expressions::ObjectExpressionProperty::ObjectMethod(m) => {
                        if insert_after_fn_in_block(&mut m.body, node_id, new_stmt) {
                            return true;
                        }
                    }
                    react_compiler_ast::expressions::ObjectExpressionProperty::ObjectProperty(
                        p,
                    ) => {
                        if insert_after_fn_in_expr(&mut p.value, node_id, new_stmt) {
                            return true;
                        }
                    }
                    _ => {}
                }
            }
            false
        }
        Expression::ArrayExpression(arr) => {
            for elem in arr.elements.iter_mut().flatten() {
                if insert_after_fn_in_expr(elem, node_id, new_stmt) {
                    return true;
                }
            }
            false
        }
        Expression::ArrowFunctionExpression(arrow) => match arrow.body.as_mut() {
            react_compiler_ast::expressions::ArrowFunctionBody::BlockStatement(block) => {
                insert_after_fn_in_block(block, node_id, new_stmt)
            }
            react_compiler_ast::expressions::ArrowFunctionBody::Expression(e) => {
                insert_after_fn_in_expr(e, node_id, new_stmt)
            }
        },
        Expression::FunctionExpression(f) => {
            insert_after_fn_in_block(&mut f.body, node_id, new_stmt)
        }
        Expression::CallExpression(c) => {
            for arg in &mut c.arguments {
                if insert_after_fn_in_expr(arg, node_id, new_stmt) {
                    return true;
                }
            }
            insert_after_fn_in_expr(&mut c.callee, node_id, new_stmt)
        }
        Expression::ConditionalExpression(c) => {
            insert_after_fn_in_expr(&mut c.consequent, node_id, new_stmt)
                || insert_after_fn_in_expr(&mut c.alternate, node_id, new_stmt)
        }
        Expression::AssignmentExpression(a) => {
            insert_after_fn_in_expr(&mut a.right, node_id, new_stmt)
        }
        Expression::TypeCastExpression(tc) => {
            insert_after_fn_in_expr(&mut tc.expression, node_id, new_stmt)
        }
        Expression::ParenthesizedExpression(p) => {
            insert_after_fn_in_expr(&mut p.expression, node_id, new_stmt)
        }
        Expression::TSAsExpression(ts) => {
            insert_after_fn_in_expr(&mut ts.expression, node_id, new_stmt)
        }
        Expression::SequenceExpression(s) => {
            for expr in &mut s.expressions {
                if insert_after_fn_in_expr(expr, node_id, new_stmt) {
                    return true;
                }
            }
            false
        }
        _ => false,
    }
}

/// Check if a statement contains a function whose BaseNode.node_id matches.
fn stmt_has_fn_with_node_id(stmt: &Statement, node_id: u32) -> bool {
    match stmt {
        Statement::FunctionDeclaration(f) => f.base.node_id == Some(node_id),
        Statement::VariableDeclaration(var_decl) => var_decl.declarations.iter().any(|decl| {
            if let Some(ref init) = decl.init {
                expr_has_fn_with_node_id(init, node_id)
            } else {
                false
            }
        }),
        Statement::ExportDefaultDeclaration(export) => match export.declaration.as_ref() {
            ExportDefaultDecl::FunctionDeclaration(f) => f.base.node_id == Some(node_id),
            ExportDefaultDecl::Expression(e) => expr_has_fn_with_node_id(e, node_id),
            _ => false,
        },
        Statement::ExportNamedDeclaration(export) => {
            if let Some(ref decl) = export.declaration {
                match decl.as_ref() {
                    Declaration::FunctionDeclaration(f) => f.base.node_id == Some(node_id),
                    Declaration::VariableDeclaration(var_decl) => {
                        var_decl.declarations.iter().any(|d| {
                            if let Some(ref init) = d.init {
                                expr_has_fn_with_node_id(init, node_id)
                            } else {
                                false
                            }
                        })
                    }
                    _ => false,
                }
            } else {
                false
            }
        }
        Statement::ExpressionStatement(expr_stmt) => {
            expr_has_fn_with_node_id(&expr_stmt.expression, node_id)
        }
        // Recurse into block-containing statements
        Statement::BlockStatement(block) => block
            .body
            .iter()
            .any(|s| stmt_has_fn_with_node_id(s, node_id)),
        Statement::IfStatement(if_stmt) => {
            expr_has_fn_with_node_id(&if_stmt.test, node_id)
                || stmt_has_fn_with_node_id(&if_stmt.consequent, node_id)
                || if_stmt
                    .alternate
                    .as_ref()
                    .map_or(false, |alt| stmt_has_fn_with_node_id(alt, node_id))
        }
        Statement::TryStatement(try_stmt) => {
            try_stmt
                .block
                .body
                .iter()
                .any(|s| stmt_has_fn_with_node_id(s, node_id))
                || try_stmt.handler.as_ref().map_or(false, |h| {
                    h.body
                        .body
                        .iter()
                        .any(|s| stmt_has_fn_with_node_id(s, node_id))
                })
                || try_stmt.finalizer.as_ref().map_or(false, |f| {
                    f.body.iter().any(|s| stmt_has_fn_with_node_id(s, node_id))
                })
        }
        Statement::SwitchStatement(switch_stmt) => {
            expr_has_fn_with_node_id(&switch_stmt.discriminant, node_id)
                || switch_stmt.cases.iter().any(|case| {
                    case.consequent
                        .iter()
                        .any(|s| stmt_has_fn_with_node_id(s, node_id))
                })
        }
        Statement::LabeledStatement(labeled) => stmt_has_fn_with_node_id(&labeled.body, node_id),
        Statement::ForStatement(for_stmt) => {
            if let Some(ref init) = for_stmt.init {
                match init.as_ref() {
                    ForInit::VariableDeclaration(var_decl) => {
                        if var_decl.declarations.iter().any(|d| {
                            d.init
                                .as_ref()
                                .map_or(false, |e| expr_has_fn_with_node_id(e, node_id))
                        }) {
                            return true;
                        }
                    }
                    ForInit::Expression(expr) => {
                        if expr_has_fn_with_node_id(expr, node_id) {
                            return true;
                        }
                    }
                }
            }
            if for_stmt
                .test
                .as_ref()
                .map_or(false, |t| expr_has_fn_with_node_id(t, node_id))
            {
                return true;
            }
            if for_stmt
                .update
                .as_ref()
                .map_or(false, |u| expr_has_fn_with_node_id(u, node_id))
            {
                return true;
            }
            stmt_has_fn_with_node_id(&for_stmt.body, node_id)
        }
        Statement::WhileStatement(while_stmt) => {
            expr_has_fn_with_node_id(&while_stmt.test, node_id)
                || stmt_has_fn_with_node_id(&while_stmt.body, node_id)
        }
        Statement::DoWhileStatement(do_while) => {
            expr_has_fn_with_node_id(&do_while.test, node_id)
                || stmt_has_fn_with_node_id(&do_while.body, node_id)
        }
        Statement::ForInStatement(for_in) => {
            expr_has_fn_with_node_id(&for_in.right, node_id)
                || stmt_has_fn_with_node_id(&for_in.body, node_id)
        }
        Statement::ForOfStatement(for_of) => {
            expr_has_fn_with_node_id(&for_of.right, node_id)
                || stmt_has_fn_with_node_id(&for_of.body, node_id)
        }
        Statement::WithStatement(with_stmt) => {
            expr_has_fn_with_node_id(&with_stmt.object, node_id)
                || stmt_has_fn_with_node_id(&with_stmt.body, node_id)
        }
        Statement::ReturnStatement(ret) => ret
            .argument
            .as_ref()
            .map_or(false, |arg| expr_has_fn_with_node_id(arg, node_id)),
        Statement::ThrowStatement(throw_stmt) => {
            expr_has_fn_with_node_id(&throw_stmt.argument, node_id)
        }
        _ => false,
    }
}

/// Check if an expression contains a function whose BaseNode.node_id matches.
fn expr_has_fn_with_node_id(expr: &Expression, node_id: u32) -> bool {
    match expr {
        Expression::FunctionExpression(f) => f.base.node_id == Some(node_id),
        Expression::ArrowFunctionExpression(f) => f.base.node_id == Some(node_id),
        // Check for forwardRef/memo wrappers: the inner function
        Expression::CallExpression(call) => call
            .arguments
            .iter()
            .any(|arg| expr_has_fn_with_node_id(arg, node_id)),
        _ => false,
    }
}

/// Visitor that replaces a compiled function in the AST by matching `base.node_id`.
struct ReplaceFnVisitor<'a> {
    node_id: u32,
    compiled: &'a CompiledFnForReplacement,
}

impl MutVisitor for ReplaceFnVisitor<'_> {
    fn visit_statement(&mut self, stmt: &mut Statement) -> VisitResult {
        match stmt {
            Statement::FunctionDeclaration(f) if f.base.node_id == Some(self.node_id) => {
                f.id = self.compiled.codegen_fn.id.clone();
                f.params = self.compiled.codegen_fn.params.clone();
                f.body = self.compiled.codegen_fn.body.clone();
                f.generator = self.compiled.codegen_fn.generator;
                f.is_async = self.compiled.codegen_fn.is_async;
                f.return_type = None;
                f.type_parameters = None;
                f.predicate = None;
                f.declare = None;
                return VisitResult::Stop;
            }
            Statement::ExportDefaultDeclaration(export) => {
                if let ExportDefaultDecl::FunctionDeclaration(f) = export.declaration.as_mut() {
                    if f.base.node_id == Some(self.node_id) {
                        f.id = self.compiled.codegen_fn.id.clone();
                        f.params = self.compiled.codegen_fn.params.clone();
                        f.body = self.compiled.codegen_fn.body.clone();
                        f.generator = self.compiled.codegen_fn.generator;
                        f.is_async = self.compiled.codegen_fn.is_async;
                        f.return_type = None;
                        f.type_parameters = None;
                        f.predicate = None;
                        f.declare = None;
                        return VisitResult::Stop;
                    }
                }
            }
            Statement::ExportNamedDeclaration(export) => {
                if let Some(ref mut decl) = export.declaration {
                    if let Declaration::FunctionDeclaration(f) = decl.as_mut() {
                        if f.base.node_id == Some(self.node_id) {
                            f.id = self.compiled.codegen_fn.id.clone();
                            f.params = self.compiled.codegen_fn.params.clone();
                            f.body = self.compiled.codegen_fn.body.clone();
                            f.generator = self.compiled.codegen_fn.generator;
                            f.is_async = self.compiled.codegen_fn.is_async;
                            f.return_type = None;
                            f.type_parameters = None;
                            f.predicate = None;
                            f.declare = None;
                            return VisitResult::Stop;
                        }
                    }
                }
            }
            _ => {}
        }
        VisitResult::Continue
    }

    fn visit_expression(&mut self, expr: &mut Expression) -> VisitResult {
        match expr {
            Expression::FunctionExpression(f) if f.base.node_id == Some(self.node_id) => {
                f.id = self.compiled.codegen_fn.id.clone();
                f.params = self.compiled.codegen_fn.params.clone();
                f.body = self.compiled.codegen_fn.body.clone();
                f.generator = self.compiled.codegen_fn.generator;
                f.is_async = self.compiled.codegen_fn.is_async;
                f.return_type = None;
                f.type_parameters = None;
                VisitResult::Stop
            }
            Expression::ArrowFunctionExpression(f) if f.base.node_id == Some(self.node_id) => {
                f.params = self.compiled.codegen_fn.params.clone();
                f.body = Box::new(ArrowFunctionBody::BlockStatement(
                    self.compiled.codegen_fn.body.clone(),
                ));
                f.generator = self.compiled.codegen_fn.generator;
                f.is_async = self.compiled.codegen_fn.is_async;
                f.expression = Some(false);
                f.return_type = None;
                f.type_parameters = None;
                f.predicate = None;
                VisitResult::Stop
            }
            _ => VisitResult::Continue,
        }
    }
}

/// Visitor that renames all occurrences of an identifier in expression position.
struct RenameIdentifierVisitor<'a> {
    old_name: &'a str,
    new_name: &'a str,
}

impl MutVisitor for RenameIdentifierVisitor<'_> {
    fn visit_identifier(&mut self, node: &mut Identifier) -> VisitResult {
        if node.name == self.old_name {
            node.name = self.new_name.to_string();
        }
        VisitResult::Continue
    }
}

/// Main entry point for the React Compiler.
///
/// Receives a full program AST, scope information (unused for now), and resolved options.
/// Returns a CompileResult indicating whether the AST was modified,
/// along with any logger events.
///
/// This function implements the logic from the TS entrypoint (Program.ts):
/// - shouldSkipCompilation: check for existing runtime imports
/// - validateRestrictedImports: check for blocklisted imports
/// - findProgramSuppressions: find eslint/flow suppression comments
/// - findFunctionsToCompile: traverse program to find components and hooks
/// - processFn: per-function compilation with directive and suppression handling
/// - applyCompiledFunctions: replace original functions with compiled versions
pub fn compile_program(mut file: File, scope: ScopeInfo, options: PluginOptions) -> CompileResult {
    // Compute output mode once, up front
    let output_mode = CompilerOutputMode::from_opts(&options);

    // Create a temporary context for early-return paths (before full context is set up)
    let early_events: Vec<LoggerEvent> = Vec::new();
    let mut early_ordered_log: Vec<OrderedLogItem> = Vec::new();

    // Log environment config for debugLogIRs
    if options.debug {
        early_ordered_log.push(OrderedLogItem::Debug {
            entry: DebugLogEntry::new(
                "EnvironmentConfig",
                serde_json::to_string_pretty(&options.environment).unwrap_or_default(),
            ),
        });
    }

    // Check if we should compile this file at all (pre-resolved by JS shim)
    if !options.should_compile {
        return CompileResult::Success {
            ast: None,
            events: early_events,
            ordered_log: early_ordered_log,
            renames: Vec::new(),
            timing: Vec::new(),
        };
    }

    let program = &file.program;

    // Check for existing runtime imports (file already compiled)
    if should_skip_compilation(program, &options) {
        return CompileResult::Success {
            ast: None,
            events: early_events,
            ordered_log: early_ordered_log,
            renames: Vec::new(),
            timing: Vec::new(),
        };
    }

    // Validate restricted imports from the environment config
    let restricted_imports = options.environment.validate_blocklisted_imports.clone();

    // Determine if we should check for eslint suppressions
    let validate_exhaustive = options
        .environment
        .validate_exhaustive_memoization_dependencies;
    let validate_hooks = options.environment.validate_hooks_usage;

    let eslint_rules: Option<Vec<String>> = if validate_exhaustive && validate_hooks {
        // Don't check for ESLint suppressions if both validations are enabled
        None
    } else {
        Some(options.eslint_suppression_rules.clone().unwrap_or_else(|| {
            DEFAULT_ESLINT_SUPPRESSIONS
                .iter()
                .map(|s| s.to_string())
                .collect()
        }))
    };

    // Find program-level suppressions from comments
    let suppressions = find_program_suppressions(
        &file.comments,
        eslint_rules.as_deref(),
        options.flow_suppressions,
    );

    // Check for module-scope opt-out directive
    let has_module_scope_opt_out =
        find_directive_disabling_memoization(&program.directives, &options).is_some();

    // Create program context
    let mut context = ProgramContext::new(
        options.clone(),
        options.filename.clone(),
        // Pass the source code for fast refresh hash computation.
        options.source_code.clone(),
        suppressions,
        has_module_scope_opt_out,
    );

    // Extract the source filename from the AST (set by parser's sourceFilename option).
    // This is the bare filename (e.g., "foo.ts") without path prefixes, which the TS
    // compiler uses in logger event source locations.
    let source_filename = program
        .base
        .loc
        .as_ref()
        .and_then(|loc| loc.filename.clone())
        .or_else(|| {
            // Fallback: try the first statement's loc
            program.body.first().and_then(|stmt| {
                let base = match stmt {
                    react_compiler_ast::statements::Statement::ExpressionStatement(s) => &s.base,
                    react_compiler_ast::statements::Statement::VariableDeclaration(s) => &s.base,
                    react_compiler_ast::statements::Statement::FunctionDeclaration(s) => &s.base,
                    _ => return None,
                };
                base.loc.as_ref().and_then(|loc| loc.filename.clone())
            })
        });
    context.set_source_filename(source_filename);

    // Initialize known referenced names from scope bindings for UID collision detection
    context.init_from_scope(&scope);

    // Seed context with early ordered log entries
    context.ordered_log.extend(early_ordered_log);

    // Validate restricted imports (needs context for handle_error)
    if let Some(err) = validate_restricted_imports(program, &restricted_imports) {
        if let Some(result) = handle_error(&err, None, &mut context) {
            return result;
        }
        return CompileResult::Success {
            ast: None,
            events: context.events,
            ordered_log: context.ordered_log,
            renames: convert_renames(&context.renames),
            timing: Vec::new(),
        };
    }

    // Pre-register instrumentation imports to get stable local names.
    // These are needed before compilation so codegen can use the correct names.
    let instrument_fn_name: Option<String>;
    let instrument_gating_name: Option<String>;
    let hook_guard_name: Option<String>;

    if let Some(ref instrument_config) = options.environment.enable_emit_instrument_forget {
        let fn_spec = context.add_import_specifier(
            &instrument_config.fn_.source,
            &instrument_config.fn_.import_specifier_name,
            None,
        );
        instrument_fn_name = Some(fn_spec.name.clone());
        instrument_gating_name = instrument_config.gating.as_ref().map(|g| {
            let spec = context.add_import_specifier(&g.source, &g.import_specifier_name, None);
            spec.name.clone()
        });
    } else {
        instrument_fn_name = None;
        instrument_gating_name = None;
    }

    if let Some(ref hook_guard_config) = options.environment.enable_emit_hook_guards {
        let spec = context.add_import_specifier(
            &hook_guard_config.source,
            &hook_guard_config.import_specifier_name,
            None,
        );
        hook_guard_name = Some(spec.name.clone());
    } else {
        hook_guard_name = None;
    }

    // Store pre-resolved names on context for pipeline access
    context.instrument_fn_name = instrument_fn_name;
    context.instrument_gating_name = instrument_gating_name;
    context.hook_guard_name = hook_guard_name;

    // Find all functions to compile
    let queue = find_functions_to_compile(program, &options, &mut context, &scope);

    // Clone env_config once for all function compilations (avoids per-function clone
    // while satisfying the borrow checker — compile_fn needs &mut context + &env_config)
    let env_config = options.environment.clone();

    // Process each function and collect compiled results
    let mut compiled_fns: Vec<CompiledFunction<'_>> = Vec::new();

    for source in &queue {
        match process_fn(source, &scope, output_mode, &env_config, &mut context) {
            Ok(Some(codegen_fn)) => {
                compiled_fns.push(CompiledFunction {
                    kind: source.kind,
                    source,
                    codegen_fn,
                });
            }
            Ok(None) => {
                // Function was skipped or lint-only
            }
            Err(fatal_result) => {
                return fatal_result;
            }
        }
    }

    // Emit CompileSuccess events for JSX-outlined functions (fn_type.is_some()).
    // In TS, outlined functions from outlineJSX are appended to the compilation queue
    // and processed after all original functions, so their events appear at the end.
    // Regular outlined functions (from OutlineFunctions pass) don't get separate events.
    for compiled in &compiled_fns {
        for outlined in &compiled.codegen_fn.outlined {
            if outlined.fn_type.is_some() {
                context.log_event(LoggerEvent::CompileSuccess {
                    fn_loc: None,
                    fn_name: outlined.func.id.as_ref().map(|id| id.name.clone()),
                    memo_slots: outlined.func.memo_slots_used,
                    memo_blocks: outlined.func.memo_blocks,
                    memo_values: outlined.func.memo_values,
                    pruned_memo_blocks: outlined.func.pruned_memo_blocks,
                    pruned_memo_values: outlined.func.pruned_memo_values,
                });
            }
        }
    }

    // TS invariant: if there's a module scope opt-out, no functions should have been compiled
    if has_module_scope_opt_out {
        if !compiled_fns.is_empty() {
            let mut err = CompilerError::new();
            err.push_error_detail(CompilerErrorDetail::new(
                ErrorCategory::Invariant,
                "Unexpected compiled functions when module scope opt-out is present",
            ));
            handle_error(&err, None, &mut context);
        }
        return CompileResult::Success {
            ast: None,
            events: context.events,
            ordered_log: context.ordered_log,
            renames: convert_renames(&context.renames),
            timing: Vec::new(),
        };
    }

    // Determine gating for each compiled function.
    // In the TS compiler, dynamic gating from directives takes precedence over plugin-level gating.
    // Gating only applies to 'original' functions, not 'outlined' ones.
    let function_gating_config = options.gating.clone();

    // Convert compiled functions to owned representations (dropping borrows)
    // so we can mutate the AST.
    let replacements: Vec<CompiledFnForReplacement> = compiled_fns
        .into_iter()
        .map(|cf| {
            let original_kind = match cf.source.fn_node {
                FunctionNode::FunctionDeclaration(_) => OriginalFnKind::FunctionDeclaration,
                FunctionNode::FunctionExpression(_) => OriginalFnKind::FunctionExpression,
                FunctionNode::ArrowFunctionExpression(_) => OriginalFnKind::ArrowFunctionExpression,
            };
            // Determine per-function gating: dynamic gating from directives OR plugin-level gating.
            // Dynamic gating (from `use memo if(identifier)`) takes precedence.
            let gating = if cf.kind == CompileSourceKind::Original {
                // Check body directives for dynamic gating
                let dynamic_gating =
                    find_directives_dynamic_gating(&cf.source.body_directives, &options)
                        .ok()
                        .flatten()
                        .map(|r| r.gating);
                dynamic_gating.or_else(|| function_gating_config.clone())
            } else {
                None
            };
            CompiledFnForReplacement {
                fn_start: cf.source.fn_start,
                fn_node_id: cf.source.fn_node_id,
                original_kind,
                codegen_fn: cf.codegen_fn,
                source_kind: cf.kind,
                fn_name: cf.source.fn_name.clone(),
                gating,
            }
        })
        .collect();
    // Drop queue (and its borrows from file.program)
    drop(queue);

    if replacements.is_empty() {
        // No functions to replace. Return renames for the Babel plugin to apply
        // (e.g., variable shadowing renames in lint mode). Imports are NOT added
        // when there are no replacements — matching TS behavior where
        // addImportsToProgram is only called when compiledFns.length > 0.
        return CompileResult::Success {
            ast: None,
            events: context.events,
            ordered_log: context.ordered_log,
            renames: convert_renames(&context.renames),
            timing: Vec::new(),
        };
    }

    // Now we can mutate file.program
    apply_compiled_functions(&replacements, &mut file.program, &mut context);

    let timing_entries = context.timing.into_entries();

    // Return the compiled File by value; in-process Rust consumers use it
    // directly, and the napi consumer serializes the whole result as before.
    CompileResult::Success {
        ast: Some(file),
        events: context.events,
        ordered_log: context.ordered_log,
        renames: convert_renames(&context.renames),
        timing: timing_entries,
    }
}

/// Convert internal BindingRename structs to the serializable BindingRenameInfo format.
fn convert_renames(
    renames: &[react_compiler_hir::environment::BindingRename],
) -> Vec<BindingRenameInfo> {
    renames
        .iter()
        .map(|r| BindingRenameInfo {
            original: r.original.clone(),
            renamed: r.renamed.clone(),
            declaration_start: r.declaration_start,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_hook_name() {
        assert!(is_hook_name("useState"));
        assert!(is_hook_name("useEffect"));
        assert!(is_hook_name("use0Something"));
        assert!(!is_hook_name("use"));
        assert!(!is_hook_name("useless")); // lowercase after use
        assert!(!is_hook_name("foo"));
        assert!(!is_hook_name(""));
    }

    #[test]
    fn test_is_component_name() {
        assert!(is_component_name("MyComponent"));
        assert!(is_component_name("App"));
        assert!(!is_component_name("myComponent"));
        assert!(!is_component_name("app"));
        assert!(!is_component_name(""));
    }

    #[test]
    fn test_is_valid_identifier() {
        assert!(is_valid_identifier("foo"));
        assert!(is_valid_identifier("_bar"));
        assert!(is_valid_identifier("$baz"));
        assert!(is_valid_identifier("foo123"));
        assert!(!is_valid_identifier(""));
        assert!(!is_valid_identifier("123foo"));
        assert!(!is_valid_identifier("foo bar"));
    }

    #[test]
    fn test_is_valid_component_params_empty() {
        assert!(is_valid_component_params(&[]));
    }

    #[test]
    fn test_is_valid_component_params_one_identifier() {
        let params = vec![PatternLike::Identifier(Identifier {
            base: BaseNode::default(),
            name: "props".to_string(),
            type_annotation: None,
            optional: None,
            decorators: None,
        })];
        assert!(is_valid_component_params(&params));
    }

    #[test]
    fn test_is_valid_component_params_too_many() {
        let params = vec![
            PatternLike::Identifier(Identifier {
                base: BaseNode::default(),
                name: "a".to_string(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }),
            PatternLike::Identifier(Identifier {
                base: BaseNode::default(),
                name: "b".to_string(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }),
            PatternLike::Identifier(Identifier {
                base: BaseNode::default(),
                name: "c".to_string(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }),
        ];
        assert!(!is_valid_component_params(&params));
    }

    #[test]
    fn test_is_valid_component_params_with_ref() {
        let params = vec![
            PatternLike::Identifier(Identifier {
                base: BaseNode::default(),
                name: "props".to_string(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }),
            PatternLike::Identifier(Identifier {
                base: BaseNode::default(),
                name: "ref".to_string(),
                type_annotation: None,
                optional: None,
                decorators: None,
            }),
        ];
        assert!(is_valid_component_params(&params));
    }

    #[test]
    fn test_should_skip_compilation_no_import() {
        let program = Program {
            base: BaseNode::default(),
            body: vec![],
            directives: vec![],
            source_type: react_compiler_ast::SourceType::Module,
            interpreter: None,
            source_file: None,
        };
        let options = PluginOptions {
            should_compile: true,
            enable_reanimated: false,
            is_dev: false,
            filename: None,
            compilation_mode: "infer".to_string(),
            panic_threshold: "none".to_string(),
            target: super::super::plugin_options::CompilerTarget::Version("19".to_string()),
            gating: None,
            dynamic_gating: None,
            no_emit: false,
            output_mode: None,
            eslint_suppression_rules: None,
            flow_suppressions: true,
            ignore_use_no_forget: false,
            custom_opt_out_directives: None,
            environment: EnvironmentConfig::default(),
            source_code: None,
            profiling: false,
            debug: false,
        };
        assert!(!should_skip_compilation(&program, &options));
    }
}

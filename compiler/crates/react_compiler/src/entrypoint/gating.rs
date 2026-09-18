// Gating rewrite logic for compiled functions.
//
// When gating is enabled, the compiled function is wrapped in a conditional:
// `gating() ? optimized_fn : original_fn`
//
// For function declarations referenced before their declaration, a special
// hoisting pattern is used (see `insert_additional_function_declaration`).
//
// Ported from `Entrypoint/Gating.ts`.

use react_compiler_ast::common::BaseNode;
use react_compiler_ast::expressions::*;
use react_compiler_ast::patterns::PatternLike;
use react_compiler_ast::statements::*;
use react_compiler_diagnostics::CompilerDiagnostic;
use react_compiler_diagnostics::ErrorCategory;

use super::imports::ProgramContext;
use super::plugin_options::GatingConfig;

/// A compiled function node, can be any function type.
#[derive(Debug, Clone)]
pub enum CompiledFunctionNode {
    FunctionDeclaration(FunctionDeclaration),
    FunctionExpression(FunctionExpression),
    ArrowFunctionExpression(ArrowFunctionExpression),
}

/// Represents a compiled function that needs gating.
/// In the Rust version, we work with indices into the program body
/// rather than Babel paths.
pub struct GatingRewrite {
    /// Index in program.body where the original function is
    pub original_index: usize,
    /// The compiled function AST node
    pub compiled_fn: CompiledFunctionNode,
    /// The gating config
    pub gating: GatingConfig,
    /// Whether the function is referenced before its declaration at top level
    pub referenced_before_declared: bool,
    /// Whether the parent statement is an ExportDefaultDeclaration
    pub is_export_default: bool,
}

/// Apply gating rewrites to the program.
/// This modifies program.body by replacing/inserting statements.
///
/// Corresponds to `insertGatedFunctionDeclaration` in the TS version,
/// but batched: all rewrites are collected first, then applied in reverse
/// index order to maintain validity of earlier indices.
pub fn apply_gating_rewrites(
    program: &mut react_compiler_ast::Program,
    mut rewrites: Vec<GatingRewrite>,
    context: &mut ProgramContext,
) -> Result<(), CompilerDiagnostic> {
    // Sort rewrites in reverse order by original_index so that insertions
    // at higher indices don't invalidate lower indices.
    rewrites.sort_by(|a, b| b.original_index.cmp(&a.original_index));

    for rewrite in rewrites {
        let gating_imported_name = context
            .add_import_specifier(
                &rewrite.gating.source,
                &rewrite.gating.import_specifier_name,
                None,
            )
            .name
            .clone();

        if rewrite.referenced_before_declared {
            // The referenced-before-declared case only applies to FunctionDeclarations
            if let CompiledFunctionNode::FunctionDeclaration(compiled) = rewrite.compiled_fn {
                insert_additional_function_declaration(
                    &mut program.body,
                    rewrite.original_index,
                    compiled,
                    context,
                    &gating_imported_name,
                )?;
            } else {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Expected compiled node type to match input type: \
                     got non-FunctionDeclaration but expected FunctionDeclaration",
                    None,
                ));
            }
        } else {
            let original_stmt = program.body[rewrite.original_index].clone();
            let original_fn = extract_function_node_from_stmt(&original_stmt)?;

            let gating_expression =
                build_gating_expression(rewrite.compiled_fn, original_fn, &gating_imported_name);

            // Determine how to rewrite based on context
            if !rewrite.is_export_default {
                if let Some(fn_name) = get_fn_decl_name(&original_stmt) {
                    // Convert function declaration to: const fnName = gating() ? compiled : original
                    let var_decl = Statement::VariableDeclaration(VariableDeclaration {
                        base: BaseNode::default(),
                        declarations: vec![VariableDeclarator {
                            base: BaseNode::default(),
                            id: PatternLike::Identifier(make_identifier(&fn_name)),
                            init: Some(Box::new(gating_expression)),
                            definite: None,
                        }],
                        kind: VariableDeclarationKind::Const,
                        declare: None,
                    });
                    program.body[rewrite.original_index] = var_decl;
                } else {
                    // Replace with the conditional expression directly (e.g. arrow/expression)
                    let expr_stmt = Statement::ExpressionStatement(ExpressionStatement {
                        base: BaseNode::default(),
                        expression: Box::new(gating_expression),
                    });
                    program.body[rewrite.original_index] = expr_stmt;
                }
            } else {
                // ExportDefaultDeclaration case
                if let Some(fn_name) = get_fn_decl_name_from_export_default(&original_stmt) {
                    // Named export default function: replace with const + re-export
                    //   const fnName = gating() ? compiled : original;
                    //   export default fnName;
                    let var_decl = Statement::VariableDeclaration(VariableDeclaration {
                        base: BaseNode::default(),
                        declarations: vec![VariableDeclarator {
                            base: BaseNode::default(),
                            id: PatternLike::Identifier(make_identifier(&fn_name)),
                            init: Some(Box::new(gating_expression)),
                            definite: None,
                        }],
                        kind: VariableDeclarationKind::Const,
                        declare: None,
                    });
                    let re_export = Statement::ExportDefaultDeclaration(
                        react_compiler_ast::declarations::ExportDefaultDeclaration {
                            base: BaseNode::default(),
                            declaration: Box::new(
                                react_compiler_ast::declarations::ExportDefaultDecl::Expression(
                                    Box::new(Expression::Identifier(make_identifier(&fn_name))),
                                ),
                            ),
                            export_kind: None,
                        },
                    );
                    // Replace the original statement with the var decl, then insert re-export after
                    program.body[rewrite.original_index] = var_decl;
                    program.body.insert(rewrite.original_index + 1, re_export);
                } else {
                    // Anonymous export default or arrow: replace the declaration content
                    // with the conditional expression
                    let export_default = Statement::ExportDefaultDeclaration(
                        react_compiler_ast::declarations::ExportDefaultDeclaration {
                            base: BaseNode::default(),
                            declaration: Box::new(
                                react_compiler_ast::declarations::ExportDefaultDecl::Expression(
                                    Box::new(gating_expression),
                                ),
                            ),
                            export_kind: None,
                        },
                    );
                    program.body[rewrite.original_index] = export_default;
                }
            }
        }
    }
    Ok(())
}

/// Gating rewrite for function declarations which are referenced before their
/// declaration site.
///
/// ```js
/// // original
/// export default React.memo(Foo);
/// function Foo() { ... }
///
/// // React compiler optimized + gated
/// import {gating} from 'myGating';
/// export default React.memo(Foo);
/// const gating_result = gating();  // <- inserted
/// function Foo_optimized() {}      // <- inserted
/// function Foo_unoptimized() {}    // <- renamed from Foo
/// function Foo() {                 // <- inserted, hoistable by JS engines
///   if (gating_result) return Foo_optimized();
///   else return Foo_unoptimized();
/// }
/// ```
fn insert_additional_function_declaration(
    body: &mut Vec<Statement>,
    original_index: usize,
    mut compiled: FunctionDeclaration,
    context: &mut ProgramContext,
    gating_function_identifier_name: &str,
) -> Result<(), CompilerDiagnostic> {
    // Extract the original function declaration from body
    let original_fn = match &body[original_index] {
        Statement::FunctionDeclaration(fd) => fd.clone(),
        Statement::ExportNamedDeclaration(end) => {
            if let Some(decl) = &end.declaration {
                if let react_compiler_ast::declarations::Declaration::FunctionDeclaration(fd) =
                    decl.as_ref()
                {
                    fd.clone()
                } else {
                    return Err(CompilerDiagnostic::new(
                        ErrorCategory::Invariant,
                        "Expected function declaration in export",
                        None,
                    ));
                }
            } else {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Expected declaration in export",
                    None,
                ));
            }
        }
        _ => {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Expected function declaration at original_index",
                None,
            ));
        }
    };

    let original_fn_name = original_fn
        .id
        .as_ref()
        .expect("Expected function declaration referenced elsewhere to have a named identifier");
    let compiled_id = compiled
        .id
        .as_ref()
        .expect("Expected compiled function declaration to have a named identifier");
    assert_eq!(
        original_fn.params.len(),
        compiled.params.len(),
        "Expected compiled function to have the same number of parameters as source"
    );

    let _ = compiled_id; // used above for the assert

    // Generate unique names
    let gating_condition_name =
        context.new_uid(&format!("{}_result", gating_function_identifier_name));
    let unoptimized_fn_name = context.new_uid(&format!("{}_unoptimized", original_fn_name.name));
    let optimized_fn_name = context.new_uid(&format!("{}_optimized", original_fn_name.name));

    // Step 1: rename existing functions
    compiled.id = Some(make_identifier(&optimized_fn_name));

    // Rename the original function in-place to *_unoptimized
    rename_fn_decl_at(body, original_index, &unoptimized_fn_name)?;

    // Step 2: build new params and args for the dispatcher function
    let mut new_params: Vec<PatternLike> = Vec::new();
    let mut new_args_optimized: Vec<Expression> = Vec::new();
    let mut new_args_unoptimized: Vec<Expression> = Vec::new();

    for (i, param) in original_fn.params.iter().enumerate() {
        let arg_name = format!("arg{}", i);
        match param {
            PatternLike::RestElement(_) => {
                new_params.push(PatternLike::RestElement(
                    react_compiler_ast::patterns::RestElement {
                        base: BaseNode::default(),
                        argument: Box::new(PatternLike::Identifier(make_identifier(&arg_name))),
                        type_annotation: None,
                        decorators: None,
                    },
                ));
                new_args_optimized.push(Expression::SpreadElement(SpreadElement {
                    base: BaseNode::default(),
                    argument: Box::new(Expression::Identifier(make_identifier(&arg_name))),
                }));
                new_args_unoptimized.push(Expression::SpreadElement(SpreadElement {
                    base: BaseNode::default(),
                    argument: Box::new(Expression::Identifier(make_identifier(&arg_name))),
                }));
            }
            _ => {
                new_params.push(PatternLike::Identifier(make_identifier(&arg_name)));
                new_args_optimized.push(Expression::Identifier(make_identifier(&arg_name)));
                new_args_unoptimized.push(Expression::Identifier(make_identifier(&arg_name)));
            }
        }
    }

    // Build the dispatcher function:
    // function Foo(...args) {
    //   if (gating_result) return Foo_optimized(...args);
    //   else return Foo_unoptimized(...args);
    // }
    let dispatcher_fn = Statement::FunctionDeclaration(FunctionDeclaration {
        base: BaseNode::default(),
        id: Some(make_identifier(&original_fn_name.name)),
        params: new_params,
        body: BlockStatement {
            base: BaseNode::default(),
            body: vec![Statement::IfStatement(IfStatement {
                base: BaseNode::default(),
                test: Box::new(Expression::Identifier(make_identifier(
                    &gating_condition_name,
                ))),
                consequent: Box::new(Statement::ReturnStatement(ReturnStatement {
                    base: BaseNode::default(),
                    argument: Some(Box::new(Expression::CallExpression(CallExpression {
                        base: BaseNode::default(),
                        callee: Box::new(Expression::Identifier(make_identifier(
                            &optimized_fn_name,
                        ))),
                        arguments: new_args_optimized,
                        type_parameters: None,
                        type_arguments: None,
                        optional: None,
                    }))),
                })),
                alternate: Some(Box::new(Statement::ReturnStatement(ReturnStatement {
                    base: BaseNode::default(),
                    argument: Some(Box::new(Expression::CallExpression(CallExpression {
                        base: BaseNode::default(),
                        callee: Box::new(Expression::Identifier(make_identifier(
                            &unoptimized_fn_name,
                        ))),
                        arguments: new_args_unoptimized,
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

    // Build: const gating_result = gating();
    let gating_const = Statement::VariableDeclaration(VariableDeclaration {
        base: BaseNode::default(),
        declarations: vec![VariableDeclarator {
            base: BaseNode::default(),
            id: PatternLike::Identifier(make_identifier(&gating_condition_name)),
            init: Some(Box::new(Expression::CallExpression(CallExpression {
                base: BaseNode::default(),
                callee: Box::new(Expression::Identifier(make_identifier(
                    gating_function_identifier_name,
                ))),
                arguments: vec![],
                type_parameters: None,
                type_arguments: None,
                optional: None,
            }))),
            definite: None,
        }],
        kind: VariableDeclarationKind::Const,
        declare: None,
    });

    // Build: the compiled (optimized) function declaration
    let compiled_stmt = Statement::FunctionDeclaration(compiled);

    // Insert statements. In the TS version:
    //   fnPath.insertBefore(gating_const)
    //   fnPath.insertBefore(compiled)
    //   fnPath.insertAfter(dispatcher_fn)
    //
    // This means the final order is:
    //   [before original_index]: gating_const
    //   [before original_index]: compiled (optimized fn)
    //   [at original_index]:     original fn (renamed to *_unoptimized)
    //   [after original_index]:  dispatcher fn
    //
    // We insert in order: first the ones before, then the one after.
    // Insert before original_index: gating_const, compiled
    body.insert(original_index, compiled_stmt);
    body.insert(original_index, gating_const);
    // The original (now renamed) fn is now at original_index + 2
    // Insert dispatcher after it
    body.insert(original_index + 3, dispatcher_fn);
    Ok(())
}

/// Build a gating conditional expression:
/// `gating_fn() ? build_fn_expr(compiled) : build_fn_expr(original)`
fn build_gating_expression(
    compiled: CompiledFunctionNode,
    original: CompiledFunctionNode,
    gating_name: &str,
) -> Expression {
    Expression::ConditionalExpression(ConditionalExpression {
        base: BaseNode::default(),
        test: Box::new(Expression::CallExpression(CallExpression {
            base: BaseNode::default(),
            callee: Box::new(Expression::Identifier(make_identifier(gating_name))),
            arguments: vec![],
            type_parameters: None,
            type_arguments: None,
            optional: None,
        })),
        consequent: Box::new(build_function_expression(compiled)),
        alternate: Box::new(build_function_expression(original)),
    })
}

/// Convert a compiled function node to an expression.
/// Function declarations are converted to function expressions;
/// arrow functions and function expressions are returned as-is.
fn build_function_expression(node: CompiledFunctionNode) -> Expression {
    match node {
        CompiledFunctionNode::ArrowFunctionExpression(arrow) => {
            Expression::ArrowFunctionExpression(arrow)
        }
        CompiledFunctionNode::FunctionExpression(func_expr) => {
            Expression::FunctionExpression(func_expr)
        }
        CompiledFunctionNode::FunctionDeclaration(func_decl) => {
            // Convert FunctionDeclaration to FunctionExpression
            Expression::FunctionExpression(FunctionExpression {
                base: func_decl.base,
                params: func_decl.params,
                body: func_decl.body,
                id: func_decl.id,
                generator: func_decl.generator,
                is_async: func_decl.is_async,
                return_type: func_decl.return_type,
                type_parameters: func_decl.type_parameters,
                predicate: func_decl.predicate,
            })
        }
    }
}

/// Helper to create a simple Identifier with the given name and default BaseNode.
fn make_identifier(name: &str) -> Identifier {
    Identifier {
        base: BaseNode::default(),
        name: name.to_string(),
        type_annotation: None,
        optional: None,
        decorators: None,
    }
}

/// Extract the function name from a top-level Statement if it is a
/// FunctionDeclaration with an id.
fn get_fn_decl_name(stmt: &Statement) -> Option<String> {
    match stmt {
        Statement::FunctionDeclaration(fd) => fd.id.as_ref().map(|id| id.name.clone()),
        _ => None,
    }
}

/// Extract the function name from an ExportDefaultDeclaration's declaration,
/// if it is a named FunctionDeclaration.
fn get_fn_decl_name_from_export_default(stmt: &Statement) -> Option<String> {
    match stmt {
        Statement::ExportDefaultDeclaration(ed) => match ed.declaration.as_ref() {
            react_compiler_ast::declarations::ExportDefaultDecl::FunctionDeclaration(fd) => {
                fd.id.as_ref().map(|id| id.name.clone())
            }
            _ => None,
        },
        _ => None,
    }
}

/// Extract a CompiledFunctionNode from a statement (for building the
/// "original" side of the gating expression).
fn extract_function_node_from_stmt(
    stmt: &Statement,
) -> Result<CompiledFunctionNode, CompilerDiagnostic> {
    match stmt {
        Statement::FunctionDeclaration(fd) => {
            Ok(CompiledFunctionNode::FunctionDeclaration(fd.clone()))
        }
        Statement::ExpressionStatement(es) => match es.expression.as_ref() {
            Expression::ArrowFunctionExpression(arrow) => {
                Ok(CompiledFunctionNode::ArrowFunctionExpression(arrow.clone()))
            }
            Expression::FunctionExpression(fe) => {
                Ok(CompiledFunctionNode::FunctionExpression(fe.clone()))
            }
            _ => Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Expected function expression in expression statement for gating",
                None,
            )),
        },
        Statement::ExportDefaultDeclaration(ed) => match ed.declaration.as_ref() {
            react_compiler_ast::declarations::ExportDefaultDecl::FunctionDeclaration(fd) => {
                Ok(CompiledFunctionNode::FunctionDeclaration(fd.clone()))
            }
            react_compiler_ast::declarations::ExportDefaultDecl::Expression(expr) => {
                match expr.as_ref() {
                    Expression::ArrowFunctionExpression(arrow) => {
                        Ok(CompiledFunctionNode::ArrowFunctionExpression(arrow.clone()))
                    }
                    Expression::FunctionExpression(fe) => {
                        Ok(CompiledFunctionNode::FunctionExpression(fe.clone()))
                    }
                    _ => Err(CompilerDiagnostic::new(
                        ErrorCategory::Invariant,
                        "Expected function expression in export default for gating",
                        None,
                    )),
                }
            }
            _ => Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Expected function in export default declaration for gating",
                None,
            )),
        },
        Statement::VariableDeclaration(vd) => {
            let init = vd.declarations[0]
                .init
                .as_ref()
                .expect("Expected variable declarator to have an init for gating");
            match init.as_ref() {
                Expression::ArrowFunctionExpression(arrow) => {
                    Ok(CompiledFunctionNode::ArrowFunctionExpression(arrow.clone()))
                }
                Expression::FunctionExpression(fe) => {
                    Ok(CompiledFunctionNode::FunctionExpression(fe.clone()))
                }
                _ => Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Expected function expression in variable declaration for gating",
                    None,
                )),
            }
        }
        _ => Err(CompilerDiagnostic::new(
            ErrorCategory::Invariant,
            "Unexpected statement type for gating rewrite",
            None,
        )),
    }
}

/// Rename the function declaration at `body[index]` in place.
/// Handles both bare FunctionDeclaration and ExportNamedDeclaration wrapping one.
fn rename_fn_decl_at(
    body: &mut [Statement],
    index: usize,
    new_name: &str,
) -> Result<(), CompilerDiagnostic> {
    match &mut body[index] {
        Statement::FunctionDeclaration(fd) => {
            fd.id = Some(make_identifier(new_name));
        }
        Statement::ExportNamedDeclaration(end) => {
            if let Some(decl) = &mut end.declaration {
                if let react_compiler_ast::declarations::Declaration::FunctionDeclaration(fd) =
                    decl.as_mut()
                {
                    fd.id = Some(make_identifier(new_name));
                }
            }
        }
        _ => {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Expected function declaration to rename",
                None,
            ));
        }
    }
    Ok(())
}

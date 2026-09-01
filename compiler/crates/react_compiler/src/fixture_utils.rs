use react_compiler_ast::File;
use react_compiler_ast::declarations::{Declaration, ExportDefaultDecl};
use react_compiler_ast::expressions::Expression;
use react_compiler_ast::statements::Statement;
use react_compiler_lowering::FunctionNode;

/// Count the number of top-level functions in an AST file.
///
/// "Top-level" means:
/// - FunctionDeclaration at program body level
/// - FunctionExpression/ArrowFunctionExpression in a VariableDeclarator at program body level
/// - FunctionDeclaration inside ExportNamedDeclaration
/// - FunctionDeclaration/FunctionExpression/ArrowFunctionExpression inside ExportDefaultDeclaration
/// - VariableDeclaration with function expressions inside ExportNamedDeclaration
///
/// This matches the TS test binary's traversal behavior.
pub fn count_top_level_functions(ast: &File) -> usize {
    let mut count = 0;
    for stmt in &ast.program.body {
        count += count_functions_in_statement(stmt);
    }
    count
}

fn count_functions_in_statement(stmt: &Statement) -> usize {
    match stmt {
        Statement::FunctionDeclaration(_) => 1,
        Statement::VariableDeclaration(var_decl) => {
            let mut count = 0;
            for declarator in &var_decl.declarations {
                if let Some(init) = &declarator.init {
                    if is_function_expression(init) {
                        count += 1;
                    }
                }
            }
            count
        }
        Statement::ExportNamedDeclaration(export) => {
            if let Some(decl) = &export.declaration {
                match decl.as_ref() {
                    Declaration::FunctionDeclaration(_) => 1,
                    Declaration::VariableDeclaration(var_decl) => {
                        let mut count = 0;
                        for declarator in &var_decl.declarations {
                            if let Some(init) = &declarator.init {
                                if is_function_expression(init) {
                                    count += 1;
                                }
                            }
                        }
                        count
                    }
                    _ => 0,
                }
            } else {
                0
            }
        }
        Statement::ExportDefaultDeclaration(export) => match export.declaration.as_ref() {
            ExportDefaultDecl::FunctionDeclaration(_) => 1,
            ExportDefaultDecl::Expression(expr) => {
                if is_function_expression(expr) {
                    1
                } else {
                    0
                }
            }
            _ => 0,
        },
        // Expression statements with function expressions (uncommon but possible)
        Statement::ExpressionStatement(expr_stmt) => {
            if is_function_expression(&expr_stmt.expression) {
                1
            } else {
                0
            }
        }
        _ => 0,
    }
}

fn is_function_expression(expr: &Expression) -> bool {
    matches!(
        expr,
        Expression::FunctionExpression(_) | Expression::ArrowFunctionExpression(_)
    )
}

/// Extract the nth top-level function from an AST file as a `FunctionNode`.
/// Also returns the inferred name (e.g. from a variable declarator).
/// Returns None if function_index is out of bounds.
pub fn extract_function(
    ast: &File,
    function_index: usize,
) -> Option<(FunctionNode<'_>, Option<&str>)> {
    let mut index = 0usize;

    for stmt in &ast.program.body {
        match stmt {
            Statement::FunctionDeclaration(func_decl) => {
                if index == function_index {
                    let name = func_decl.id.as_ref().map(|id| id.name.as_str());
                    return Some((FunctionNode::FunctionDeclaration(func_decl), name));
                }
                index += 1;
            }
            Statement::VariableDeclaration(var_decl) => {
                for declarator in &var_decl.declarations {
                    if let Some(init) = &declarator.init {
                        match init.as_ref() {
                            Expression::FunctionExpression(func) => {
                                if index == function_index {
                                    let name = match &declarator.id {
                                        react_compiler_ast::patterns::PatternLike::Identifier(
                                            ident,
                                        ) => Some(ident.name.as_str()),
                                        _ => func.id.as_ref().map(|id| id.name.as_str()),
                                    };
                                    return Some((FunctionNode::FunctionExpression(func), name));
                                }
                                index += 1;
                            }
                            Expression::ArrowFunctionExpression(arrow) => {
                                if index == function_index {
                                    let name = match &declarator.id {
                                        react_compiler_ast::patterns::PatternLike::Identifier(
                                            ident,
                                        ) => Some(ident.name.as_str()),
                                        _ => None,
                                    };
                                    return Some((
                                        FunctionNode::ArrowFunctionExpression(arrow),
                                        name,
                                    ));
                                }
                                index += 1;
                            }
                            _ => {}
                        }
                    }
                }
            }
            Statement::ExportNamedDeclaration(export) => {
                if let Some(decl) = &export.declaration {
                    match decl.as_ref() {
                        Declaration::FunctionDeclaration(func_decl) => {
                            if index == function_index {
                                let name = func_decl.id.as_ref().map(|id| id.name.as_str());
                                return Some((FunctionNode::FunctionDeclaration(func_decl), name));
                            }
                            index += 1;
                        }
                        Declaration::VariableDeclaration(var_decl) => {
                            for declarator in &var_decl.declarations {
                                if let Some(init) = &declarator.init {
                                    match init.as_ref() {
                                        Expression::FunctionExpression(func) => {
                                            if index == function_index {
                                                let name = match &declarator.id {
                                                    react_compiler_ast::patterns::PatternLike::Identifier(ident) => Some(ident.name.as_str()),
                                                    _ => func.id.as_ref().map(|id| id.name.as_str()),
                                                };
                                                return Some((
                                                    FunctionNode::FunctionExpression(func),
                                                    name,
                                                ));
                                            }
                                            index += 1;
                                        }
                                        Expression::ArrowFunctionExpression(arrow) => {
                                            if index == function_index {
                                                let name = match &declarator.id {
                                                    react_compiler_ast::patterns::PatternLike::Identifier(ident) => Some(ident.name.as_str()),
                                                    _ => None,
                                                };
                                                return Some((
                                                    FunctionNode::ArrowFunctionExpression(arrow),
                                                    name,
                                                ));
                                            }
                                            index += 1;
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
            Statement::ExportDefaultDeclaration(export) => match export.declaration.as_ref() {
                ExportDefaultDecl::FunctionDeclaration(func_decl) => {
                    if index == function_index {
                        let name = func_decl.id.as_ref().map(|id| id.name.as_str());
                        return Some((FunctionNode::FunctionDeclaration(func_decl), name));
                    }
                    index += 1;
                }
                ExportDefaultDecl::Expression(expr) => match expr.as_ref() {
                    Expression::FunctionExpression(func) => {
                        if index == function_index {
                            let name = func.id.as_ref().map(|id| id.name.as_str());
                            return Some((FunctionNode::FunctionExpression(func), name));
                        }
                        index += 1;
                    }
                    Expression::ArrowFunctionExpression(arrow) => {
                        if index == function_index {
                            return Some((FunctionNode::ArrowFunctionExpression(arrow), None));
                        }
                        index += 1;
                    }
                    _ => {}
                },
                _ => {}
            },
            Statement::ExpressionStatement(expr_stmt) => match expr_stmt.expression.as_ref() {
                Expression::FunctionExpression(func) => {
                    if index == function_index {
                        let name = func.id.as_ref().map(|id| id.name.as_str());
                        return Some((FunctionNode::FunctionExpression(func), name));
                    }
                    index += 1;
                }
                Expression::ArrowFunctionExpression(arrow) => {
                    if index == function_index {
                        return Some((FunctionNode::ArrowFunctionExpression(arrow), None));
                    }
                    index += 1;
                }
                _ => {}
            },
            _ => {}
        }
    }
    None
}

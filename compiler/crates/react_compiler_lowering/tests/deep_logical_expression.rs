use serde_json::json;

use react_compiler_ast::common::{BaseNode, Position, SourceLocation};
use react_compiler_ast::expressions::{Expression, LogicalExpression, ParenthesizedExpression};
use react_compiler_ast::literals::BooleanLiteral;
use react_compiler_ast::operators::LogicalOperator as AstLogicalOperator;
use react_compiler_ast::scope::ScopeInfo;
use react_compiler_ast::statements::{
    BlockStatement, FunctionDeclaration, ReturnStatement, Statement,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{LogicalOperator, Terminal};
use react_compiler_lowering::{FunctionNode, lower};

const OPERAND_COUNT: usize = 96;

fn base(node_type: &str, start: u32, end: u32) -> BaseNode {
    BaseNode {
        node_type: Some(node_type.to_string()),
        start: Some(start),
        end: Some(end),
        loc: Some(SourceLocation {
            start: Position {
                line: 1,
                column: start,
                index: Some(start),
            },
            end: Position {
                line: 1,
                column: end,
                index: Some(end),
            },
            filename: None,
            identifier_name: None,
        }),
        ..BaseNode::default()
    }
}

fn operand(index: usize) -> Expression {
    let offset = index as u32 * 4;
    Expression::BooleanLiteral(BooleanLiteral {
        base: base("BooleanLiteral", offset, offset + 1),
        value: index % 2 == 0,
    })
}

fn operator(index: usize, mixed: bool) -> AstLogicalOperator {
    if !mixed {
        AstLogicalOperator::Or
    } else {
        match index % 3 {
            0 => AstLogicalOperator::And,
            1 => AstLogicalOperator::Or,
            _ => AstLogicalOperator::NullishCoalescing,
        }
    }
}

fn logical(left: Expression, right: Expression, index: usize, mixed: bool) -> Expression {
    Expression::LogicalExpression(LogicalExpression {
        base: base("LogicalExpression", 0, index as u32 * 4 + 1),
        operator: operator(index, mixed),
        left: Box::new(left),
        right: Box::new(right),
    })
}

fn left_associated(mixed: bool) -> Expression {
    (1..OPERAND_COUNT).fold(operand(0), |left, index| {
        logical(left, operand(index), index, mixed)
    })
}

fn right_associated_parenthesized(mixed: bool) -> Expression {
    (0..OPERAND_COUNT - 1)
        .rev()
        .fold(operand(OPERAND_COUNT - 1), |right, index| {
            let right = Expression::ParenthesizedExpression(ParenthesizedExpression {
                base: base("ParenthesizedExpression", index as u32 * 4, 400),
                expression: Box::new(right),
            });
            logical(operand(index), right, index, mixed)
        })
}

fn scope_info() -> ScopeInfo {
    serde_json::from_value(json!({
        "scopes": [
            { "id": 0, "parent": null, "kind": "program", "bindings": {} },
            { "id": 1, "parent": 0, "kind": "function", "bindings": {} }
        ],
        "bindings": [],
        "nodeToScope": { "0": 1 },
        "nodeToScopeEnd": { "0": 400 },
        "referenceToBinding": {},
        "refNodeIdToBinding": {},
        "nodeIdToScope": { "1": 1 },
        "programScope": 0
    }))
    .unwrap()
}

fn lower_expression(expression: Expression) -> Vec<LogicalOperator> {
    let function = FunctionDeclaration {
        base: BaseNode {
            node_id: Some(1),
            ..base("FunctionDeclaration", 0, 400)
        },
        id: None,
        params: vec![],
        body: BlockStatement {
            base: base("BlockStatement", 0, 400),
            body: vec![Statement::ReturnStatement(ReturnStatement {
                base: base("ReturnStatement", 0, 400),
                argument: Some(Box::new(expression)),
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
    };
    let mut environment = Environment::new();
    let hir = lower(
        &FunctionNode::FunctionDeclaration(&function),
        None,
        &scope_info(),
        &mut environment,
    )
    .expect("deep logical expression should lower");
    assert!(!environment.has_errors());
    let branch_count = hir
        .body
        .blocks
        .values()
        .filter(|block| matches!(block.terminal, Terminal::Branch { .. }))
        .count();
    assert_eq!(branch_count, OPERAND_COUNT - 1);

    hir.body
        .blocks
        .values()
        .filter_map(|block| match block.terminal {
            Terminal::Logical { operator, loc, .. } => {
                assert!(
                    loc.is_some(),
                    "logical terminal should retain its source location"
                );
                Some(operator)
            }
            _ => None,
        })
        .collect()
}

#[test]
fn deeply_nested_logical_expressions_use_bounded_call_stack() {
    std::thread::Builder::new()
        .name("deep-logical-lowering".into())
        .stack_size(2 * 1024 * 1024)
        .spawn(|| {
            let or_operators = lower_expression(left_associated(false));
            let mixed_operators = lower_expression(left_associated(true));
            let right_nested_operators = lower_expression(right_associated_parenthesized(true));

            for operators in [&or_operators, &mixed_operators, &right_nested_operators] {
                assert_eq!(operators.len(), OPERAND_COUNT - 1);
            }

            assert!(
                or_operators
                    .iter()
                    .all(|operator| matches!(operator, LogicalOperator::Or))
            );

            assert!(
                mixed_operators
                    .iter()
                    .any(|op| matches!(op, LogicalOperator::And))
            );
            assert!(
                mixed_operators
                    .iter()
                    .any(|op| matches!(op, LogicalOperator::Or))
            );
            assert!(
                mixed_operators
                    .iter()
                    .any(|op| matches!(op, LogicalOperator::NullishCoalescing))
            );
        })
        .unwrap()
        .join()
        .unwrap();
}

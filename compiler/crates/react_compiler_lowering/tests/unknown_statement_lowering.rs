use react_compiler_ast::scope::ScopeInfo;
use react_compiler_ast::statements::FunctionDeclaration;
use react_compiler_hir::InstructionValue;
use react_compiler_hir::environment::Environment;
use react_compiler_lowering::{FunctionNode, lower};
use serde_json::json;

/// An unknown statement inside a function body degrades like the other
/// unsupported-statement arms: an UnsupportedSyntax error is recorded and an
/// UnsupportedNode instruction carries the raw node verbatim.
#[test]
fn unknown_statement_in_function_body_records_bailout() {
    let unknown_node = json!({
        "type": "TSFutureStatement",
        "start": 40,
        "end": 52,
        "payload": { "type": "Identifier", "name": "x" }
    });
    let func: FunctionDeclaration = serde_json::from_value(json!({
        "type": "FunctionDeclaration",
        "start": 0,
        "end": 60,
        "id": { "type": "Identifier", "name": "useValue", "start": 9, "end": 17 },
        "generator": false,
        "async": false,
        "params": [],
        "body": {
            "type": "BlockStatement",
            "start": 20,
            "end": 60,
            "body": [unknown_node.clone()],
            "directives": []
        }
    }))
    .unwrap();

    let scope_info: ScopeInfo = serde_json::from_value(json!({
        "scopes": [
            { "id": 0, "parent": null, "kind": "program", "bindings": { "useValue": 0 } },
            { "id": 1, "parent": 0, "kind": "function", "bindings": {} }
        ],
        "bindings": [
            {
                "id": 0,
                "name": "useValue",
                "kind": "hoisted",
                "scope": 0,
                "declarationType": "FunctionDeclaration"
            }
        ],
        "nodeToScope": { "0": 1 },
        "referenceToBinding": {},
        "programScope": 0
    }))
    .unwrap();

    let mut env = Environment::new();
    let result = lower(
        &FunctionNode::FunctionDeclaration(&func),
        None,
        &scope_info,
        &mut env,
    );

    assert!(
        env.has_errors(),
        "expected a recorded error, got result {result:?}"
    );
    let rendered = format!("{:?}", env.errors());
    assert!(
        rendered.contains("Unsupported statement kind 'TSFutureStatement'"),
        "unexpected error payload: {rendered}"
    );

    let hir = result.expect("lowering degrades, it does not fail outright");
    let unsupported = hir
        .instructions
        .iter()
        .find_map(|instr| match &instr.value {
            InstructionValue::UnsupportedNode {
                node_type,
                original_node,
                ..
            } => Some((node_type.clone(), original_node.clone())),
            _ => None,
        })
        .expect("expected an UnsupportedNode instruction");

    assert_eq!(unsupported.0.as_deref(), Some("TSFutureStatement"));
    assert_eq!(unsupported.1, Some(unknown_node));
}

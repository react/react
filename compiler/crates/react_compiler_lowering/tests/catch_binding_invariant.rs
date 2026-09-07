use react_compiler_ast::scope::ScopeInfo;
use react_compiler_ast::statements::FunctionDeclaration;
use react_compiler_diagnostics::{CompilerErrorOrDiagnostic, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_lowering::{FunctionNode, lower};
use serde_json::json;

/// A destructured catch binding is not registered in Babel's scope, so lowering
/// records an invariant error. The error propagates as a flat `CompilerErrorDetail`,
/// which the logger serializes as `detail.loc` like the TS reference does, rather
/// than as a diagnostic with nested `detail.details`.
#[test]
fn destructured_catch_binding_keeps_flat_error_detail() {
    let catch_param = json!({
        "type": "ObjectPattern",
        "start": 34,
        "end": 42,
        "properties": [{
            "type": "ObjectProperty",
            "start": 35,
            "end": 41,
            "computed": false,
            "shorthand": true,
            "key": { "type": "Identifier", "name": "status", "start": 35, "end": 41 },
            "value": {
                "type": "Identifier",
                "name": "status",
                "start": 35,
                "end": 41,
                "loc": {
                    "start": { "line": 3, "column": 11, "index": 35 },
                    "end": { "line": 3, "column": 17, "index": 41 }
                }
            }
        }]
    });
    let try_stmt = json!({
        "type": "TryStatement",
        "start": 19,
        "end": 58,
        "block": { "type": "BlockStatement", "start": 23, "end": 26, "body": [], "directives": [] },
        "handler": {
            "type": "CatchClause",
            "start": 27,
            "end": 58,
            "param": catch_param,
            "body": {
                "type": "BlockStatement", "start": 44, "end": 58, "body": [], "directives": []
            }
        },
        "finalizer": null
    });
    let func: FunctionDeclaration = serde_json::from_value(json!({
        "type": "FunctionDeclaration",
        "start": 0,
        "end": 60,
        "id": { "type": "Identifier", "name": "Foo", "start": 9, "end": 12 },
        "generator": false,
        "async": false,
        "params": [],
        "body": {
            "type": "BlockStatement",
            "start": 15,
            "end": 60,
            "directives": [],
            "body": [try_stmt]
        }
    }))
    .unwrap();

    let scope_info: ScopeInfo = serde_json::from_value(json!({
        "scopes": [
            { "id": 0, "parent": null, "kind": "program", "bindings": { "Foo": 0 } },
            { "id": 1, "parent": 0, "kind": "function", "bindings": {} }
        ],
        "bindings": [
            {
                "id": 0,
                "name": "Foo",
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
    let err = lower(
        &FunctionNode::FunctionDeclaration(&func),
        None,
        &scope_info,
        &mut env,
    )
    .expect_err("expected lowering to fail on the destructured catch binding");

    match err.details.as_slice() {
        [CompilerErrorOrDiagnostic::ErrorDetail(detail)] => {
            assert_eq!(detail.category, ErrorCategory::Invariant);
            assert_eq!(
                detail.reason,
                "(BuildHIR::lowerAssignment) Could not find binding for declaration."
            );
            assert!(detail.loc.is_some(), "expected a location on the detail");
        }
        other => panic!("expected a single flat ErrorDetail, got {other:?}"),
    }
}

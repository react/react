//! Deep ASTs must survive deserialization when the caller disables
//! serde_json's recursion limit, as the napi entrypoint does. The tolerant
//! statement deserializer reparses captured raw text internally; those
//! reparses must not reintroduce the default depth limit.

use react_compiler_ast::File;
use serde::Deserialize;

fn from_json_str_unbounded(s: &str) -> serde_json::Result<File> {
    let mut deserializer = serde_json::Deserializer::from_str(s);
    deserializer.disable_recursion_limit();
    File::deserialize(&mut deserializer)
}

#[test]
fn statement_nested_beyond_default_recursion_limit_deserializes() {
    let depth = 400;
    let mut expr = r#"{"type":"Identifier","name":"x"}"#.to_string();
    for _ in 0..depth {
        expr = format!(r#"{{"type":"CallExpression","callee":{expr},"arguments":[]}}"#);
    }
    let json = format!(
        r#"{{"type":"File","program":{{"type":"Program","sourceType":"module","body":[{{"type":"ExpressionStatement","expression":{expr}}}],"directives":[]}}}}"#
    );

    // Parse on a large stack like the napi entrypoint does; without the limit,
    // depth is bounded by stack, not by serde_json's counter.
    let file = std::thread::Builder::new()
        .stack_size(64 * 1024 * 1024)
        .spawn(move || from_json_str_unbounded(&json).expect("deep statement must deserialize"))
        .expect("spawn")
        .join()
        .expect("join");
    assert_eq!(file.program.body.len(), 1);
}

use std::time::Instant;

use napi_derive::napi;
use react_compiler::entrypoint::PluginOptions;
use react_compiler::entrypoint::compile_program;
use react_compiler::timing::TimingEntry;
use react_compiler_ast::File;
use react_compiler_ast::scope::ScopeInfo;
use serde::Deserialize;

/// Deserialize JSON with no recursion limit (for deeply nested ASTs).
fn from_json_str<'de, T: Deserialize<'de>>(s: &'de str) -> serde_json::Result<T> {
    let mut deserializer = serde_json::Deserializer::from_str(s);
    deserializer.disable_recursion_limit();
    T::deserialize(&mut deserializer)
}

/// Main entry point for the React Compiler.
///
/// Receives a full program AST, scope information, and resolved options
/// as JSON strings. Returns a JSON string containing the CompileResult.
///
/// This function is called by the JS shim (bridge.ts) via napi-rs.
/// Spawns a dedicated thread with 64MB stack to handle deeply nested ASTs
/// that would overflow the default Node.js thread stack.
#[napi]
pub fn compile(ast_json: String, scope_json: String, options_json: String) -> napi::Result<String> {
    let handle = std::thread::Builder::new()
        .stack_size(64 * 1024 * 1024) // 64MB stack
        .spawn(move || compile_inner(ast_json, scope_json, options_json))
        .map_err(|e| napi::Error::from_reason(format!("Failed to spawn compiler thread: {}", e)))?;

    match handle.join() {
        Ok(result) => result,
        Err(panic_payload) => {
            let msg = if let Some(s) = panic_payload.downcast_ref::<&str>() {
                format!("Rust compiler panicked: {}", s)
            } else if let Some(s) = panic_payload.downcast_ref::<String>() {
                format!("Rust compiler panicked: {}", s)
            } else {
                "Rust compiler panicked (unknown payload)".to_string()
            };
            Err(napi::Error::from_reason(msg))
        }
    }
}

fn compile_inner(
    ast_json: String,
    scope_json: String,
    options_json: String,
) -> napi::Result<String> {
    // Check if profiling is enabled by peeking at the options JSON
    let profiling = options_json.contains("\"__profiling\":true");

    let deser_start = Instant::now();

    let ast: File = from_json_str(&ast_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse AST JSON: {}", e)))?;

    let scope: ScopeInfo = from_json_str(&scope_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse scope JSON: {}", e)))?;

    let opts: PluginOptions = from_json_str(&options_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse options JSON: {}", e)))?;

    let deser_duration = deser_start.elapsed();

    let compile_start = Instant::now();
    let mut result = compile_program(ast, scope, opts);
    let compile_duration = compile_start.elapsed();

    // If profiling is enabled, prepend NAPI deserialization timing and append serialization timing
    if profiling {
        let napi_deser_entry = TimingEntry {
            name: "napi_deserialize".to_string(),
            duration_us: deser_duration.as_micros() as u64,
        };

        // Insert NAPI timing entries
        match &mut result {
            react_compiler::entrypoint::CompileResult::Success { timing, .. } => {
                timing.insert(0, napi_deser_entry);
            }
            react_compiler::entrypoint::CompileResult::Error { timing, .. } => {
                timing.insert(0, napi_deser_entry);
            }
        }

        // Add compile_program duration (the total Rust compilation time including pass timing)
        let compile_entry = TimingEntry {
            name: "napi_compile_program".to_string(),
            duration_us: compile_duration.as_micros() as u64,
        };
        match &mut result {
            react_compiler::entrypoint::CompileResult::Success { timing, .. } => {
                timing.push(compile_entry);
            }
            react_compiler::entrypoint::CompileResult::Error { timing, .. } => {
                timing.push(compile_entry);
            }
        }
    }

    let ser_start = Instant::now();
    let result_json = serde_json::to_string(&result)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize result: {}", e)))?;

    if profiling {
        // We need to inject the serialization timing into the already-serialized JSON.
        // Since timing is a JSON array at the end of the result, we can append to it.
        let ser_duration = ser_start.elapsed();
        let ser_entry = format!(
            r#"{{"name":"napi_serialize","duration_us":{}}}"#,
            ser_duration.as_micros()
        );

        // Find the timing array in the JSON and append our entry
        if let Some(pos) = result_json.rfind("\"timing\":[") {
            // Find the closing ] of the timing array
            let timing_start = pos + "\"timing\":[".len();
            if let Some(close_bracket) = result_json[timing_start..].rfind(']') {
                let abs_close = timing_start + close_bracket;
                let mut patched = result_json[..abs_close].to_string();
                if abs_close > timing_start {
                    // Array is non-empty, add comma
                    patched.push(',');
                }
                patched.push_str(&ser_entry);
                patched.push_str(&result_json[abs_close..]);
                return Ok(patched);
            }
        }
    }

    Ok(result_json)
}

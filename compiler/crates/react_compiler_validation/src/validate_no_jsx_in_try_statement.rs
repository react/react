// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Validates against constructing JSX within try/catch blocks.
//!
//! Developers may not be aware of error boundaries and lazy evaluation of JSX, leading them
//! to use patterns such as `let el; try { el = <Component /> } catch { ... }` to attempt to
//! catch rendering errors. Such code will fail to catch errors in rendering, but developers
//! may not realize this right away.
//!
//! This validation pass errors for JSX created within a try block. JSX is allowed within a
//! catch statement, unless that catch is itself nested inside an outer try.
//!
//! Port of ValidateNoJSXInTryStatement.ts.

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, CompilerError, ErrorCategory,
};
use react_compiler_hir::{BlockId, HirFunction, InstructionValue, Terminal};

pub fn validate_no_jsx_in_try_statement(func: &HirFunction) -> CompilerError {
    let mut active_try_blocks: Vec<BlockId> = Vec::new();
    let mut error = CompilerError::new();

    for (_block_id, block) in &func.body.blocks {
        // Remove completed try blocks (retainWhere equivalent)
        active_try_blocks.retain(|id| *id != block.id);

        if !active_try_blocks.is_empty() {
            for &instr_id in &block.instructions {
                let instr = &func.instructions[instr_id.0 as usize];
                match &instr.value {
                    InstructionValue::JsxExpression { loc, .. }
                    | InstructionValue::JsxFragment { loc, .. } => {
                        error.push_diagnostic(
                            CompilerDiagnostic::new(
                                ErrorCategory::ErrorBoundaries,
                                "Avoid constructing JSX within try/catch",
                                Some(
                                    "React does not immediately render components when JSX is rendered, so any errors from this component will not be caught by the try/catch. To catch errors in rendering a given component, wrap that component in an error boundary. (https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)".to_string(),
                                ),
                            )
                            .with_detail(CompilerDiagnosticDetail::Error {
                                loc: *loc,
                                message: Some(
                                    "Avoid constructing JSX within try/catch".to_string(),
                                ),
                                identifier_name: None,
                            }),
                        );
                    }
                    _ => {}
                }
            }
        }

        if let Terminal::Try { handler, .. } = &block.terminal {
            active_try_blocks.push(*handler);
        }
    }

    error
}

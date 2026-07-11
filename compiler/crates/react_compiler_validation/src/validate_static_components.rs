// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Validates against components that are created dynamically and whose identity
//! is not guaranteed to be stable (which would cause the component to reset on
//! each re-render).
//!
//! Port of ValidateStaticComponents.ts.

use rustc_hash::FxHashMap;

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, CompilerError, ErrorCategory, SourceLocation,
};
use react_compiler_hir::{HirFunction, IdentifierId, InstructionValue, JsxTag};

/// Validates that components used in JSX are not dynamically created during render.
///
/// Returns a CompilerError containing all diagnostics found (may be empty).
/// Called via `env.logErrors()` pattern in Pipeline.ts.
pub fn validate_static_components(func: &HirFunction) -> CompilerError {
    let mut error = CompilerError::new();
    let mut known_dynamic_components: FxHashMap<IdentifierId, Option<SourceLocation>> =
        FxHashMap::default();

    for (_block_id, block) in &func.body.blocks {
        // Process phis: propagate dynamic component knowledge through phi nodes
        'phis: for phi in &block.phis {
            for (_pred, operand) in &phi.operands {
                if let Some(loc) = known_dynamic_components.get(&operand.identifier) {
                    known_dynamic_components.insert(phi.place.identifier, *loc);
                    continue 'phis;
                }
            }
        }

        // Process instructions
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let lvalue_id = instr.lvalue.identifier;
            let value = &instr.value;

            match value {
                InstructionValue::FunctionExpression { loc, .. }
                | InstructionValue::NewExpression { loc, .. }
                | InstructionValue::MethodCall { loc, .. }
                | InstructionValue::CallExpression { loc, .. } => {
                    known_dynamic_components.insert(lvalue_id, *loc);
                }
                InstructionValue::LoadLocal { place, .. } => {
                    if let Some(loc) = known_dynamic_components.get(&place.identifier) {
                        known_dynamic_components.insert(lvalue_id, *loc);
                    }
                }
                InstructionValue::StoreLocal {
                    lvalue, value: val, ..
                } => {
                    if let Some(loc) = known_dynamic_components.get(&val.identifier) {
                        let loc = *loc;
                        known_dynamic_components.insert(lvalue_id, loc);
                        known_dynamic_components.insert(lvalue.place.identifier, loc);
                    }
                }
                InstructionValue::JsxExpression { tag, .. } => {
                    if let JsxTag::Place(tag_place) = tag {
                        if let Some(location) = known_dynamic_components.get(&tag_place.identifier)
                        {
                            let location = *location;
                            let diagnostic = CompilerDiagnostic::new(
                                ErrorCategory::StaticComponents,
                                "Cannot create components during render",
                                Some("Components created during render will reset their state each time they are created. Declare components outside of render".to_string()),
                            )
                            .with_detail(CompilerDiagnosticDetail::Error {
                                loc: tag_place.loc,
                                message: Some(
                                    "This component is created during render".to_string(),
                                ),
                                identifier_name: None,
                            })
                            .with_detail(CompilerDiagnosticDetail::Error {
                                loc: location,
                                message: Some(
                                    "The component is created during render here".to_string(),
                                ),
                                identifier_name: None,
                            });
                            error.push_diagnostic(diagnostic);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    error
}

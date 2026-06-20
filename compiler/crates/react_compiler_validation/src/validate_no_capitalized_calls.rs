use std::collections::{HashMap, HashSet};

use react_compiler_diagnostics::{CompilerError, CompilerErrorDetail, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{HirFunction, IdentifierId, InstructionValue, PropertyLiteral};

/// Validates that capitalized functions are not called directly (they should be rendered as JSX).
///
/// Port of ValidateNoCapitalizedCalls.ts.
pub fn validate_no_capitalized_calls(
    func: &HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerError> {
    // Build the allow list from global registry keys + config entries
    let mut allow_list: HashSet<String> = env.globals().keys().cloned().collect();
    if let Some(config_entries) = &env.config.validate_no_capitalized_calls {
        for entry in config_entries {
            allow_list.insert(entry.clone());
        }
    }

    let mut capital_load_globals: HashMap<IdentifierId, String> = HashMap::new();
    let mut capitalized_properties: HashMap<IdentifierId, String> = HashMap::new();

    let reason = "Capitalized functions are reserved for components, which must be invoked with JSX. If this is a component, render it with JSX. Otherwise, ensure that it has no hook calls and rename it to begin with a lowercase letter. Alternatively, if you know for a fact that this function is not a component, you can allowlist it via the compiler config";

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let lvalue_id = instr.lvalue.identifier;
            let value = &instr.value;

            match value {
                InstructionValue::LoadGlobal { binding, .. } => {
                    let name = binding.name();
                    if !name.is_empty()
                        && name.starts_with(|c: char| c.is_ascii_uppercase())
                        // We don't want to flag CONSTANTS()
                        && name != name.to_uppercase()
                        && !allow_list.contains(name)
                    {
                        capital_load_globals.insert(lvalue_id, name.to_string());
                    }
                }
                InstructionValue::CallExpression { callee, loc, .. } => {
                    let callee_id = callee.identifier;
                    if let Some(callee_name) = capital_load_globals.get(&callee_id) {
                        env.record_error(CompilerErrorDetail {
                            category: ErrorCategory::CapitalizedCalls,
                            reason: reason.to_string(),
                            description: Some(format!("{callee_name} may be a component")),
                            loc: *loc,
                            suggestions: None,
                        })?;
                        continue;
                    }
                }
                InstructionValue::PropertyLoad { property, .. } => {
                    if let PropertyLiteral::String(prop_name) = property {
                        if prop_name.starts_with(|c: char| c.is_ascii_uppercase()) {
                            capitalized_properties.insert(lvalue_id, prop_name.clone());
                        }
                    }
                }
                InstructionValue::MethodCall { property, loc, .. } => {
                    let property_id = property.identifier;
                    if let Some(prop_name) = capitalized_properties.get(&property_id) {
                        env.record_error(CompilerErrorDetail {
                            category: ErrorCategory::CapitalizedCalls,
                            reason: reason.to_string(),
                            description: Some(format!("{prop_name} may be a component")),
                            loc: *loc,
                            suggestions: None,
                        })?;
                    }
                }
                _ => {}
            }
        }
    }
    Ok(())
}

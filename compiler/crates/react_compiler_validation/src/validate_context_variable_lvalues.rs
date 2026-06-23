use rustc_hash::FxHashMap;

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, CompilerError, ErrorCategory,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::{each_instruction_value_lvalue, each_pattern_operand};
use react_compiler_hir::{
    FunctionId, HirFunction, Identifier, IdentifierId, InstructionValue, Place,
};

/// Variable reference kind: local, context, or destructure.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VarRefKind {
    Local,
    Context,
    Destructure,
}

impl std::fmt::Display for VarRefKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VarRefKind::Local => write!(f, "local"),
            VarRefKind::Context => write!(f, "context"),
            VarRefKind::Destructure => write!(f, "destructure"),
        }
    }
}

type IdentifierKinds = FxHashMap<IdentifierId, (Place, VarRefKind)>;

/// Validates that context variable lvalues are used consistently.
///
/// Port of ValidateContextVariableLValues.ts
pub fn validate_context_variable_lvalues(
    func: &HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerDiagnostic> {
    validate_context_variable_lvalues_with_errors(
        func,
        &env.functions,
        &env.identifiers,
        &mut env.errors,
    )
}

/// Like [`validate_context_variable_lvalues`], but writes diagnostics into the
/// provided `errors` instead of `env.errors`. Useful when the caller wants to
/// discard the diagnostics (e.g. when lowering is incomplete).
pub fn validate_context_variable_lvalues_with_errors(
    func: &HirFunction,
    functions: &[HirFunction],
    identifiers: &[Identifier],
    errors: &mut CompilerError,
) -> Result<(), CompilerDiagnostic> {
    let mut identifier_kinds: IdentifierKinds = FxHashMap::default();
    validate_context_variable_lvalues_impl(
        func,
        &mut identifier_kinds,
        functions,
        identifiers,
        errors,
    )
}

fn validate_context_variable_lvalues_impl(
    func: &HirFunction,
    identifier_kinds: &mut IdentifierKinds,
    functions: &[HirFunction],
    identifiers: &[Identifier],
    errors: &mut CompilerError,
) -> Result<(), CompilerDiagnostic> {
    let mut inner_function_ids: Vec<FunctionId> = Vec::new();

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let value = &instr.value;

            match value {
                InstructionValue::DeclareContext { lvalue, .. }
                | InstructionValue::StoreContext { lvalue, .. } => {
                    visit(
                        identifier_kinds,
                        &lvalue.place,
                        VarRefKind::Context,
                        identifiers,
                        errors,
                    )?;
                }
                InstructionValue::LoadContext { place, .. } => {
                    visit(
                        identifier_kinds,
                        place,
                        VarRefKind::Context,
                        identifiers,
                        errors,
                    )?;
                }
                InstructionValue::StoreLocal { lvalue, .. }
                | InstructionValue::DeclareLocal { lvalue, .. } => {
                    visit(
                        identifier_kinds,
                        &lvalue.place,
                        VarRefKind::Local,
                        identifiers,
                        errors,
                    )?;
                }
                InstructionValue::LoadLocal { place, .. } => {
                    visit(
                        identifier_kinds,
                        place,
                        VarRefKind::Local,
                        identifiers,
                        errors,
                    )?;
                }
                InstructionValue::PostfixUpdate { lvalue, .. }
                | InstructionValue::PrefixUpdate { lvalue, .. } => {
                    visit(
                        identifier_kinds,
                        lvalue,
                        VarRefKind::Local,
                        identifiers,
                        errors,
                    )?;
                }
                InstructionValue::Destructure { lvalue, .. } => {
                    for place in each_pattern_operand(&lvalue.pattern) {
                        visit(
                            identifier_kinds,
                            &place,
                            VarRefKind::Destructure,
                            identifiers,
                            errors,
                        )?;
                    }
                }
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    inner_function_ids.push(lowered_func.func);
                }
                _ => {
                    for _ in each_instruction_value_lvalue(value) {
                        errors.push_diagnostic(
                            CompilerDiagnostic::new(
                                ErrorCategory::Todo,
                                "ValidateContextVariableLValues: unhandled instruction variant",
                                None,
                            )
                            .with_detail(
                                CompilerDiagnosticDetail::Error {
                                    loc: value.loc().copied(),
                                    message: None,
                                    identifier_name: None,
                                },
                            ),
                        );
                    }
                }
            }
        }
    }

    // Process inner functions after the block loop to avoid borrow conflicts
    for func_id in inner_function_ids {
        let inner_func = &functions[func_id.0 as usize];
        validate_context_variable_lvalues_impl(
            inner_func,
            identifier_kinds,
            functions,
            identifiers,
            errors,
        )?;
    }

    Ok(())
}

/// Format a place like TS `printPlace()`: `<effect> <name>$<id>`
fn format_place(place: &Place, identifiers: &[Identifier]) -> String {
    let id = place.identifier;
    let ident = &identifiers[id.0 as usize];
    let name = match &ident.name {
        Some(n) => n.value().to_string(),
        None => String::new(),
    };
    format!("{} {}${}", place.effect, name, id.0)
}

fn visit(
    identifiers: &mut IdentifierKinds,
    place: &Place,
    kind: VarRefKind,
    env_identifiers: &[Identifier],
    errors: &mut CompilerError,
) -> Result<(), CompilerDiagnostic> {
    if let Some((prev_place, prev_kind)) = identifiers.get(&place.identifier) {
        let was_context = *prev_kind == VarRefKind::Context;
        let is_context = kind == VarRefKind::Context;
        if was_context != is_context {
            if *prev_kind == VarRefKind::Destructure || kind == VarRefKind::Destructure {
                let loc = if kind == VarRefKind::Destructure {
                    place.loc
                } else {
                    prev_place.loc
                };
                errors.push_diagnostic(
                    CompilerDiagnostic::new(
                        ErrorCategory::Todo,
                        "Support destructuring of context variables",
                        None,
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc,
                        message: None,
                        identifier_name: None,
                    }),
                );
                return Ok(());
            }
            let place_str = format_place(place, env_identifiers);
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Expected all references to a variable to be consistently local or context references",
                Some(format!(
                    "Identifier {} is referenced as a {} variable, but was previously referenced as a {} variable",
                    place_str, kind, prev_kind
                )),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: place.loc,
                message: Some(format!("this is {}", prev_kind)),
                identifier_name: None,
            }));
        }
    }
    identifiers.insert(place.identifier, (place.clone(), kind));
    Ok(())
}

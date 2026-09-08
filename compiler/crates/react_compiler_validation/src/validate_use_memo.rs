use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, CompilerError, ErrorCategory, SourceLocation,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::{
    each_instruction_value_operand_with_functions, each_terminal_operand,
};
use react_compiler_hir::{
    FunctionId, HirFunction, IdentifierId, InstructionValue, ParamPattern, Place, PlaceOrSpread,
    ReturnVariant, Terminal,
};

/// Validates useMemo() usage patterns.
///
/// Port of ValidateUseMemo.ts.
/// Returns VoidUseMemo errors separately (for logging via logErrors, not as compile errors).
pub fn validate_use_memo(func: &HirFunction, env: &mut Environment) -> CompilerError {
    validate_use_memo_impl(
        func,
        &env.functions,
        &mut env.errors,
        env.config.validate_no_void_use_memo,
    )
}

/// Information about a FunctionExpression needed for validation.
struct FuncExprInfo {
    func_id: FunctionId,
    loc: Option<SourceLocation>,
}

fn validate_use_memo_impl(
    func: &HirFunction,
    functions: &[HirFunction],
    errors: &mut CompilerError,
    validate_no_void_use_memo: bool,
) -> CompilerError {
    let mut void_memo_errors = CompilerError::new();
    let mut use_memos: FxHashSet<IdentifierId> = FxHashSet::default();
    let mut react: FxHashSet<IdentifierId> = FxHashSet::default();
    let mut func_exprs: FxHashMap<IdentifierId, FuncExprInfo> = FxHashMap::default();
    let mut unused_use_memos: FxHashMap<IdentifierId, (SourceLocation, Option<String>)> =
        FxHashMap::default();

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let lvalue = &instr.lvalue;
            let value = &instr.value;

            // Remove used operands from unused_use_memos
            if !unused_use_memos.is_empty() {
                for operand_id in each_instruction_value_operand_ids(value, functions) {
                    unused_use_memos.remove(&operand_id);
                }
            }

            match value {
                InstructionValue::LoadGlobal { binding, .. } => {
                    let name = binding.name();
                    if name == "useMemo" {
                        use_memos.insert(lvalue.identifier);
                    } else if name == "React" {
                        react.insert(lvalue.identifier);
                    }
                }
                InstructionValue::PropertyLoad {
                    object, property, ..
                } => {
                    if react.contains(&object.identifier) {
                        if let react_compiler_hir::PropertyLiteral::String(prop_name) = property {
                            if prop_name == "useMemo" {
                                use_memos.insert(lvalue.identifier);
                            }
                        }
                    }
                }
                InstructionValue::FunctionExpression {
                    lowered_func, loc, ..
                } => {
                    func_exprs.insert(
                        lvalue.identifier,
                        FuncExprInfo {
                            func_id: lowered_func.func,
                            loc: *loc,
                        },
                    );
                }
                InstructionValue::CallExpression { callee, args, .. } => {
                    handle_possible_use_memo_call(
                        functions,
                        errors,
                        &mut void_memo_errors,
                        &use_memos,
                        &func_exprs,
                        &mut unused_use_memos,
                        callee,
                        args,
                        lvalue,
                        validate_no_void_use_memo,
                    );
                }
                InstructionValue::MethodCall { property, args, .. } => {
                    handle_possible_use_memo_call(
                        functions,
                        errors,
                        &mut void_memo_errors,
                        &use_memos,
                        &func_exprs,
                        &mut unused_use_memos,
                        property,
                        args,
                        lvalue,
                        validate_no_void_use_memo,
                    );
                }
                _ => {}
            }
        }

        // Check terminal operands for unused_use_memos
        if !unused_use_memos.is_empty() {
            for operand_id in each_terminal_operand_ids(&block.terminal) {
                unused_use_memos.remove(&operand_id);
            }
        }
    }

    // Report unused useMemo results
    if !unused_use_memos.is_empty() {
        for (loc, ident_name) in unused_use_memos.values() {
            void_memo_errors.push_diagnostic(
                CompilerDiagnostic::new(
                    ErrorCategory::VoidUseMemo,
                    "useMemo() result is unused",
                    Some(
                        "This useMemo() value is unused. useMemo() is for computing and caching values, not for arbitrary side effects"
                            .to_string(),
                    ),
                )
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc: Some(*loc),
                    message: Some("useMemo() result is unused".to_string()),
                    identifier_name: ident_name.clone(),
                }),
            );
        }
    }

    void_memo_errors
}

#[allow(clippy::too_many_arguments)]
fn handle_possible_use_memo_call(
    functions: &[HirFunction],
    errors: &mut CompilerError,
    void_memo_errors: &mut CompilerError,
    use_memos: &FxHashSet<IdentifierId>,
    func_exprs: &FxHashMap<IdentifierId, FuncExprInfo>,
    unused_use_memos: &mut FxHashMap<IdentifierId, (SourceLocation, Option<String>)>,
    callee: &Place,
    args: &[PlaceOrSpread],
    lvalue: &Place,
    validate_no_void_use_memo: bool,
) {
    let is_use_memo = use_memos.contains(&callee.identifier);
    if !is_use_memo || args.is_empty() {
        return;
    }

    let first_arg = match &args[0] {
        PlaceOrSpread::Place(place) => place,
        PlaceOrSpread::Spread(_) => return,
    };

    let body_info = match func_exprs.get(&first_arg.identifier) {
        Some(info) => info,
        None => return,
    };

    let body_func = &functions[body_info.func_id.0 as usize];

    // Validate no parameters
    if !body_func.params.is_empty() {
        let first_param = &body_func.params[0];
        let loc = match first_param {
            ParamPattern::Place(place) => place.loc,
            ParamPattern::Spread(spread) => spread.place.loc,
        };
        errors.push_diagnostic(
            CompilerDiagnostic::new(
                ErrorCategory::UseMemo,
                "useMemo() callbacks may not accept parameters",
                Some(
                    "useMemo() callbacks are called by React to cache calculations across re-renders. They should not take parameters. Instead, directly reference the props, state, or local variables needed for the computation"
                        .to_string(),
                ),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc,
                message: Some("Callbacks with parameters are not supported".to_string()),
                identifier_name: None,
            }),
        );
    }

    // Validate not async or generator
    if body_func.is_async || body_func.generator {
        errors.push_diagnostic(
            CompilerDiagnostic::new(
                ErrorCategory::UseMemo,
                "useMemo() callbacks may not be async or generator functions",
                Some(
                    "useMemo() callbacks are called once and must synchronously return a value"
                        .to_string(),
                ),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: body_info.loc,
                message: Some("Async and generator functions are not supported".to_string()),
                identifier_name: None,
            }),
        );
    }

    // Validate no context variable assignment
    validate_no_context_variable_assignment(body_func, errors);

    if validate_no_void_use_memo && !has_non_void_return(body_func) {
        void_memo_errors.push_diagnostic(
            CompilerDiagnostic::new(
                ErrorCategory::VoidUseMemo,
                "useMemo() callbacks must return a value",
                Some(
                    "This useMemo() callback doesn't return a value. useMemo() is for computing and caching values, not for arbitrary side effects"
                        .to_string(),
                ),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: body_info.loc,
                message: Some("useMemo() callbacks must return a value".to_string()),
                identifier_name: None,
            }),
        );
    } else if validate_no_void_use_memo {
        if let Some(callee_loc) = callee.loc {
            // The callee is always useMemo/React.useMemo since we checked is_use_memo above.
            // The identifierName in Babel's AST SourceLocation is "useMemo".
            unused_use_memos.insert(lvalue.identifier, (callee_loc, Some("useMemo".to_string())));
        }
    }
}

fn validate_no_context_variable_assignment(func: &HirFunction, errors: &mut CompilerError) {
    let context: FxHashSet<IdentifierId> =
        func.context.iter().map(|place| place.identifier).collect();

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            if let InstructionValue::StoreContext { lvalue, .. } = &instr.value {
                if context.contains(&lvalue.place.identifier) {
                    errors.push_diagnostic(
                        CompilerDiagnostic::new(
                            ErrorCategory::UseMemo,
                            "useMemo() callbacks may not reassign variables declared outside of the callback",
                            Some(
                                "useMemo() callbacks must be pure functions and cannot reassign variables defined outside of the callback function"
                                    .to_string(),
                            ),
                        )
                        .with_detail(CompilerDiagnosticDetail::Error {
                            loc: lvalue.place.loc,
                            message: Some("Cannot reassign variable".to_string()),
                            identifier_name: None,
                        }),
                    );
                }
            }
        }
    }
}

fn has_non_void_return(func: &HirFunction) -> bool {
    for (_block_id, block) in &func.body.blocks {
        if let Terminal::Return { return_variant, .. } = &block.terminal {
            if matches!(
                return_variant,
                ReturnVariant::Explicit | ReturnVariant::Implicit
            ) {
                return true;
            }
        }
    }
    false
}

/// Collect all operand IdentifierIds from an InstructionValue.
/// Thin wrapper around canonical `each_instruction_value_operand_with_functions` that maps to ids.
fn each_instruction_value_operand_ids(
    value: &InstructionValue,
    functions: &[HirFunction],
) -> Vec<IdentifierId> {
    each_instruction_value_operand_with_functions(value, functions)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

/// Collect all operand IdentifierIds from a Terminal.
/// Thin wrapper around canonical `each_terminal_operand` that maps to ids.
fn each_terminal_operand_ids(terminal: &Terminal) -> Vec<IdentifierId> {
    each_terminal_operand(terminal)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

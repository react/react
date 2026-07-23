use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory, SourceLocation,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::object_shape::HookKind;
use react_compiler_hir::visitors::{
    each_instruction_value_operand as canonical_each_instruction_value_operand,
    each_pattern_operand, each_terminal_operand,
};
use react_compiler_hir::{
    AliasingEffect, BlockId, HirFunction, Identifier, IdentifierId, InstructionValue, Place,
    PrimitiveValue, PropertyLiteral, Terminal, Type, UnaryOperator,
};

const ERROR_DESCRIPTION: &str = "React refs are values that are not needed for rendering. \
    Refs should only be accessed outside of render, such as in event handlers or effects. \
    Accessing a ref value (the `current` property) during render can cause your component \
    not to update as expected (https://react.dev/reference/react/useRef)";

// --- RefId ---

type RefId = u32;

static REF_ID_COUNTER: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);

fn next_ref_id() -> RefId {
    REF_ID_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
}

// --- RefAccessType / RefAccessRefType / RefFnType ---

/// Corresponds to TS `RefAccessType`.
///
/// PartialEq matches the TS `tyEqual` semantics: Ref ignores ref_id,
/// RefValue compares loc but ignores ref_id. This is critical for fixpoint
/// convergence — join creates fresh ref_ids, and comparing them would
/// prevent the environment from stabilizing.
#[derive(Debug, Clone)]
enum RefAccessType {
    None,
    Nullable,
    Guard {
        ref_id: RefId,
    },
    Ref {
        ref_id: RefId,
    },
    RefValue {
        loc: Option<SourceLocation>,
        ref_id: Option<RefId>,
    },
    Structure {
        value: Option<Box<RefAccessRefType>>,
        fn_type: Option<RefFnType>,
    },
}

impl PartialEq for RefAccessType {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (RefAccessType::None, RefAccessType::None) => true,
            (RefAccessType::Nullable, RefAccessType::Nullable) => true,
            (RefAccessType::Guard { ref_id: a }, RefAccessType::Guard { ref_id: b }) => a == b,
            (RefAccessType::Ref { .. }, RefAccessType::Ref { .. }) => true,
            (RefAccessType::RefValue { loc: a, .. }, RefAccessType::RefValue { loc: b, .. }) => {
                a == b
            }
            (
                RefAccessType::Structure {
                    value: a_val,
                    fn_type: a_fn,
                },
                RefAccessType::Structure {
                    value: b_val,
                    fn_type: b_fn,
                },
            ) => a_val == b_val && a_fn == b_fn,
            _ => false,
        }
    }
}

/// Corresponds to TS `RefAccessRefType` — the subset of `RefAccessType` that can appear
/// inside `Structure.value` and be joined via `join_ref_access_ref_types`.
///
/// PartialEq mirrors RefAccessType: Ref ignores ref_id, RefValue compares
/// loc only.
#[derive(Debug, Clone)]
enum RefAccessRefType {
    Ref {
        ref_id: RefId,
    },
    RefValue {
        loc: Option<SourceLocation>,
        ref_id: Option<RefId>,
    },
    Structure {
        value: Option<Box<RefAccessRefType>>,
        fn_type: Option<RefFnType>,
    },
}

impl PartialEq for RefAccessRefType {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (RefAccessRefType::Ref { .. }, RefAccessRefType::Ref { .. }) => true,
            (
                RefAccessRefType::RefValue { loc: a, .. },
                RefAccessRefType::RefValue { loc: b, .. },
            ) => a == b,
            (
                RefAccessRefType::Structure {
                    value: a_val,
                    fn_type: a_fn,
                },
                RefAccessRefType::Structure {
                    value: b_val,
                    fn_type: b_fn,
                },
            ) => a_val == b_val && a_fn == b_fn,
            _ => false,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
struct RefFnType {
    read_ref_effect: bool,
    return_type: Box<RefAccessType>,
}

impl RefAccessType {
    /// Try to convert a `RefAccessType` to a `RefAccessRefType` (the Ref/RefValue/Structure subset).
    fn to_ref_type(&self) -> Option<RefAccessRefType> {
        match self {
            RefAccessType::Ref { ref_id } => Some(RefAccessRefType::Ref { ref_id: *ref_id }),
            RefAccessType::RefValue { loc, ref_id } => Some(RefAccessRefType::RefValue {
                loc: *loc,
                ref_id: *ref_id,
            }),
            RefAccessType::Structure { value, fn_type } => Some(RefAccessRefType::Structure {
                value: value.clone(),
                fn_type: fn_type.clone(),
            }),
            _ => None,
        }
    }

    /// Convert a `RefAccessRefType` back to a `RefAccessType`.
    fn from_ref_type(ref_type: &RefAccessRefType) -> Self {
        match ref_type {
            RefAccessRefType::Ref { ref_id } => RefAccessType::Ref { ref_id: *ref_id },
            RefAccessRefType::RefValue { loc, ref_id } => RefAccessType::RefValue {
                loc: *loc,
                ref_id: *ref_id,
            },
            RefAccessRefType::Structure { value, fn_type } => RefAccessType::Structure {
                value: value.clone(),
                fn_type: fn_type.clone(),
            },
        }
    }
}

// --- Join operations ---

fn join_ref_access_ref_types(a: &RefAccessRefType, b: &RefAccessRefType) -> RefAccessRefType {
    match (a, b) {
        (
            RefAccessRefType::RefValue { ref_id: a_id, .. },
            RefAccessRefType::RefValue { ref_id: b_id, .. },
        ) => {
            if a_id == b_id {
                a.clone()
            } else {
                RefAccessRefType::RefValue {
                    loc: None,
                    ref_id: None,
                }
            }
        }
        (RefAccessRefType::RefValue { .. }, _) => RefAccessRefType::RefValue {
            loc: None,
            ref_id: None,
        },
        (_, RefAccessRefType::RefValue { .. }) => RefAccessRefType::RefValue {
            loc: None,
            ref_id: None,
        },
        (RefAccessRefType::Ref { ref_id: a_id }, RefAccessRefType::Ref { ref_id: b_id }) => {
            if a_id == b_id {
                a.clone()
            } else {
                RefAccessRefType::Ref {
                    ref_id: next_ref_id(),
                }
            }
        }
        (RefAccessRefType::Ref { .. }, _) | (_, RefAccessRefType::Ref { .. }) => {
            RefAccessRefType::Ref {
                ref_id: next_ref_id(),
            }
        }
        (
            RefAccessRefType::Structure {
                value: a_value,
                fn_type: a_fn,
            },
            RefAccessRefType::Structure {
                value: b_value,
                fn_type: b_fn,
            },
        ) => {
            let fn_type = match (a_fn, b_fn) {
                (None, other) | (other, None) => other.clone(),
                (Some(a_fn), Some(b_fn)) => Some(RefFnType {
                    read_ref_effect: a_fn.read_ref_effect || b_fn.read_ref_effect,
                    return_type: Box::new(join_ref_access_types(
                        &a_fn.return_type,
                        &b_fn.return_type,
                    )),
                }),
            };
            let value = match (a_value, b_value) {
                (None, other) | (other, None) => other.clone(),
                (Some(a_val), Some(b_val)) => {
                    Some(Box::new(join_ref_access_ref_types(a_val, b_val)))
                }
            };
            RefAccessRefType::Structure { value, fn_type }
        }
    }
}

fn join_ref_access_types(a: &RefAccessType, b: &RefAccessType) -> RefAccessType {
    match (a, b) {
        (RefAccessType::None, other) | (other, RefAccessType::None) => other.clone(),
        (RefAccessType::Guard { ref_id: a_id }, RefAccessType::Guard { ref_id: b_id }) => {
            if a_id == b_id {
                a.clone()
            } else {
                RefAccessType::None
            }
        }
        (RefAccessType::Guard { .. }, RefAccessType::Nullable)
        | (RefAccessType::Nullable, RefAccessType::Guard { .. }) => RefAccessType::None,
        (RefAccessType::Guard { .. }, other) | (other, RefAccessType::Guard { .. }) => {
            other.clone()
        }
        (RefAccessType::Nullable, other) | (other, RefAccessType::Nullable) => other.clone(),
        _ => match (a.to_ref_type(), b.to_ref_type()) {
            (Some(a_ref), Some(b_ref)) => {
                RefAccessType::from_ref_type(&join_ref_access_ref_types(&a_ref, &b_ref))
            }
            (Some(r), None) | (None, Some(r)) => RefAccessType::from_ref_type(&r),
            _ => RefAccessType::None,
        },
    }
}

fn join_ref_access_types_many(types: &[RefAccessType]) -> RefAccessType {
    types
        .iter()
        .fold(RefAccessType::None, |acc, t| join_ref_access_types(&acc, t))
}

// --- Env ---

struct Env {
    changed: bool,
    data: FxHashMap<IdentifierId, RefAccessType>,
    temporaries: FxHashMap<IdentifierId, Place>,
}

impl Env {
    fn new() -> Self {
        Self {
            changed: false,
            data: FxHashMap::default(),
            temporaries: FxHashMap::default(),
        }
    }

    fn define(&mut self, key: IdentifierId, value: Place) {
        self.temporaries.insert(key, value);
    }

    fn reset_changed(&mut self) {
        self.changed = false;
    }

    fn has_changed(&self) -> bool {
        self.changed
    }

    fn get(&self, key: IdentifierId) -> Option<&RefAccessType> {
        let operand_id = self
            .temporaries
            .get(&key)
            .map(|p| p.identifier)
            .unwrap_or(key);
        self.data.get(&operand_id)
    }

    fn set(&mut self, key: IdentifierId, value: RefAccessType) {
        let operand_id = self
            .temporaries
            .get(&key)
            .map(|p| p.identifier)
            .unwrap_or(key);
        let current = self.data.get(&operand_id);
        let widened_value = join_ref_access_types(&value, current.unwrap_or(&RefAccessType::None));
        if current.is_none() && widened_value == RefAccessType::None {
            // No change needed
        } else if current.map_or(true, |c| c != &widened_value) {
            self.changed = true;
        }
        self.data.insert(operand_id, widened_value);
    }
}

// --- Helper functions ---

fn ref_type_of_type(id: IdentifierId, identifiers: &[Identifier], types: &[Type]) -> RefAccessType {
    let identifier = &identifiers[id.0 as usize];
    let ty = &types[identifier.type_.0 as usize];
    if react_compiler_hir::is_ref_value_type(ty) {
        RefAccessType::RefValue {
            loc: None,
            ref_id: None,
        }
    } else if react_compiler_hir::is_use_ref_type(ty) {
        RefAccessType::Ref {
            ref_id: next_ref_id(),
        }
    } else {
        RefAccessType::None
    }
}

fn is_ref_type(id: IdentifierId, identifiers: &[Identifier], types: &[Type]) -> bool {
    let identifier = &identifiers[id.0 as usize];
    react_compiler_hir::is_use_ref_type(&types[identifier.type_.0 as usize])
}

fn is_ref_value_type(id: IdentifierId, identifiers: &[Identifier], types: &[Type]) -> bool {
    let identifier = &identifiers[id.0 as usize];
    react_compiler_hir::is_ref_value_type(&types[identifier.type_.0 as usize])
}

fn destructure(ty: &RefAccessType) -> RefAccessType {
    match ty {
        RefAccessType::Structure {
            value: Some(inner), ..
        } => destructure(&RefAccessType::from_ref_type(inner)),
        other => other.clone(),
    }
}

// --- Validation helpers ---

fn validate_no_direct_ref_value_access(
    errors: &mut Vec<CompilerDiagnostic>,
    operand: &Place,
    env: &Env,
) {
    if let Some(ty) = env.get(operand.identifier) {
        let ty = destructure(ty);
        if let RefAccessType::RefValue { loc, .. } = &ty {
            errors.push(
                CompilerDiagnostic::new(
                    ErrorCategory::Refs,
                    "Cannot access refs during render",
                    Some(ERROR_DESCRIPTION.to_string()),
                )
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc: loc.or(operand.loc),
                    message: Some("Cannot access ref value during render".to_string()),
                    identifier_name: None,
                }),
            );
        }
    }
}

fn validate_no_ref_value_access(errors: &mut Vec<CompilerDiagnostic>, env: &Env, operand: &Place) {
    if let Some(ty) = env.get(operand.identifier) {
        let ty = destructure(ty);
        match &ty {
            RefAccessType::RefValue { loc, .. } => {
                errors.push(
                    CompilerDiagnostic::new(
                        ErrorCategory::Refs,
                        "Cannot access refs during render",
                        Some(ERROR_DESCRIPTION.to_string()),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc: loc.or(operand.loc),
                        message: Some("Cannot access ref value during render".to_string()),
                        identifier_name: None,
                    }),
                );
            }
            RefAccessType::Structure {
                fn_type: Some(fn_type),
                ..
            } if fn_type.read_ref_effect => {
                errors.push(
                    CompilerDiagnostic::new(
                        ErrorCategory::Refs,
                        "Cannot access refs during render",
                        Some(ERROR_DESCRIPTION.to_string()),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc: operand.loc,
                        message: Some("Cannot access ref value during render".to_string()),
                        identifier_name: None,
                    }),
                );
            }
            _ => {}
        }
    }
}

fn validate_no_ref_passed_to_function(
    errors: &mut Vec<CompilerDiagnostic>,
    env: &Env,
    operand: &Place,
    loc: Option<SourceLocation>,
) {
    if let Some(ty) = env.get(operand.identifier) {
        let ty = destructure(ty);
        match &ty {
            RefAccessType::Ref { .. } | RefAccessType::RefValue { .. } => {
                let error_loc = if let RefAccessType::RefValue { loc: ref_loc, .. } = &ty {
                    ref_loc.or(loc)
                } else {
                    loc
                };
                errors.push(
                    CompilerDiagnostic::new(
                        ErrorCategory::Refs,
                        "Cannot access refs during render",
                        Some(ERROR_DESCRIPTION.to_string()),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc: error_loc,
                        message: Some(
                            "Passing a ref to a function may read its value during render"
                                .to_string(),
                        ),
                        identifier_name: None,
                    }),
                );
            }
            RefAccessType::Structure {
                fn_type: Some(fn_type),
                ..
            } if fn_type.read_ref_effect => {
                errors.push(
                    CompilerDiagnostic::new(
                        ErrorCategory::Refs,
                        "Cannot access refs during render",
                        Some(ERROR_DESCRIPTION.to_string()),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc,
                        message: Some(
                            "Passing a ref to a function may read its value during render"
                                .to_string(),
                        ),
                        identifier_name: None,
                    }),
                );
            }
            _ => {}
        }
    }
}

fn validate_no_ref_update(
    errors: &mut Vec<CompilerDiagnostic>,
    env: &Env,
    operand: &Place,
    loc: Option<SourceLocation>,
) {
    if let Some(ty) = env.get(operand.identifier) {
        let ty = destructure(ty);
        match &ty {
            RefAccessType::Ref { .. } | RefAccessType::RefValue { .. } => {
                let error_loc = if let RefAccessType::RefValue { loc: ref_loc, .. } = &ty {
                    ref_loc.or(loc)
                } else {
                    loc
                };
                errors.push(
                    CompilerDiagnostic::new(
                        ErrorCategory::Refs,
                        "Cannot access refs during render",
                        Some(ERROR_DESCRIPTION.to_string()),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc: error_loc,
                        message: Some("Cannot update ref during render".to_string()),
                        identifier_name: None,
                    }),
                );
            }
            _ => {}
        }
    }
}

fn guard_check(errors: &mut Vec<CompilerDiagnostic>, operand: &Place, env: &Env) {
    if matches!(
        env.get(operand.identifier),
        Some(RefAccessType::Guard { .. })
    ) {
        errors.push(
            CompilerDiagnostic::new(
                ErrorCategory::Refs,
                "Cannot access refs during render",
                Some(ERROR_DESCRIPTION.to_string()),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: operand.loc,
                message: Some("Cannot access ref value during render".to_string()),
                identifier_name: None,
            }),
        );
    }
}

// --- Main entry point ---

pub fn validate_no_ref_access_in_render(func: &HirFunction, env: &mut Environment) {
    let mut ref_env = Env::new();
    collect_temporaries_sidemap(func, &mut ref_env, &env.identifiers, &env.types);
    let mut errors: Vec<CompilerDiagnostic> = Vec::new();
    validate_no_ref_access_in_render_impl(
        func,
        &env.identifiers,
        &env.types,
        &env.functions,
        &*env,
        &mut ref_env,
        &mut errors,
    );
    for diagnostic in errors {
        env.record_diagnostic(diagnostic);
    }
}

fn collect_temporaries_sidemap(
    func: &HirFunction,
    env: &mut Env,
    identifiers: &[Identifier],
    types: &[Type],
) {
    for (_, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::LoadLocal { place, .. } => {
                    let temp = env
                        .temporaries
                        .get(&place.identifier)
                        .cloned()
                        .unwrap_or_else(|| place.clone());
                    env.define(instr.lvalue.identifier, temp);
                }
                InstructionValue::StoreLocal { lvalue, value, .. } => {
                    let temp = env
                        .temporaries
                        .get(&value.identifier)
                        .cloned()
                        .unwrap_or_else(|| value.clone());
                    env.define(instr.lvalue.identifier, temp.clone());
                    env.define(lvalue.place.identifier, temp);
                }
                InstructionValue::PropertyLoad {
                    object, property, ..
                } => {
                    if is_ref_type(object.identifier, identifiers, types)
                        && *property == PropertyLiteral::String("current".to_string())
                    {
                        continue;
                    }
                    let temp = env
                        .temporaries
                        .get(&object.identifier)
                        .cloned()
                        .unwrap_or_else(|| object.clone());
                    env.define(instr.lvalue.identifier, temp);
                }
                _ => {}
            }
        }
    }
}

fn validate_no_ref_access_in_render_impl(
    func: &HirFunction,
    identifiers: &[Identifier],
    types: &[Type],
    functions: &[HirFunction],
    env: &Environment,
    ref_env: &mut Env,
    errors: &mut Vec<CompilerDiagnostic>,
) -> RefAccessType {
    let mut return_values: Vec<RefAccessType> = Vec::new();

    // Process params
    for param in &func.params {
        let place = match param {
            react_compiler_hir::ParamPattern::Place(p) => p,
            react_compiler_hir::ParamPattern::Spread(s) => &s.place,
        };
        ref_env.set(
            place.identifier,
            ref_type_of_type(place.identifier, identifiers, types),
        );
    }

    // Collect identifiers that are interpolated as JSX children
    let mut interpolated_as_jsx: FxHashSet<IdentifierId> = FxHashSet::default();
    for (_, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::JsxExpression {
                    children: Some(children),
                    ..
                } => {
                    for child in children {
                        interpolated_as_jsx.insert(child.identifier);
                    }
                }
                InstructionValue::JsxFragment { children, .. } => {
                    for child in children {
                        interpolated_as_jsx.insert(child.identifier);
                    }
                }
                _ => {}
            }
        }
    }

    // Fixed-point iteration (up to 10 iterations)
    for iteration in 0..10 {
        if iteration > 0 && !ref_env.has_changed() {
            break;
        }
        ref_env.reset_changed();
        return_values.clear();
        let mut safe_blocks: Vec<(BlockId, RefId)> = Vec::new();

        for (_, block) in &func.body.blocks {
            safe_blocks.retain(|(block_id, _)| *block_id != block.id);

            // Process phis
            for phi in &block.phis {
                let phi_types: Vec<RefAccessType> = phi
                    .operands
                    .values()
                    .map(|operand| {
                        ref_env
                            .get(operand.identifier)
                            .cloned()
                            .unwrap_or(RefAccessType::None)
                    })
                    .collect();
                ref_env.set(phi.place.identifier, join_ref_access_types_many(&phi_types));
            }

            // Process instructions
            for &instr_id in &block.instructions {
                let instr = &func.instructions[instr_id.0 as usize];
                match &instr.value {
                    InstructionValue::JsxExpression { .. }
                    | InstructionValue::JsxFragment { .. } => {
                        for operand in &canonical_each_instruction_value_operand(&instr.value, env)
                        {
                            validate_no_direct_ref_value_access(errors, operand, ref_env);
                        }
                    }
                    InstructionValue::ComputedLoad {
                        object, property, ..
                    } => {
                        validate_no_direct_ref_value_access(errors, property, ref_env);
                        let obj_type = ref_env.get(object.identifier).cloned();
                        let lookup_type = match &obj_type {
                            Some(RefAccessType::Structure {
                                value: Some(value), ..
                            }) => Some(RefAccessType::from_ref_type(value)),
                            Some(RefAccessType::Ref { ref_id }) => Some(RefAccessType::RefValue {
                                loc: instr.loc,
                                ref_id: Some(*ref_id),
                            }),
                            _ => None,
                        };
                        ref_env.set(
                            instr.lvalue.identifier,
                            lookup_type.unwrap_or_else(|| {
                                ref_type_of_type(instr.lvalue.identifier, identifiers, types)
                            }),
                        );
                    }
                    InstructionValue::PropertyLoad { object, .. } => {
                        let obj_type = ref_env.get(object.identifier).cloned();
                        let lookup_type = match &obj_type {
                            Some(RefAccessType::Structure {
                                value: Some(value), ..
                            }) => Some(RefAccessType::from_ref_type(value)),
                            Some(RefAccessType::Ref { ref_id }) => Some(RefAccessType::RefValue {
                                loc: instr.loc,
                                ref_id: Some(*ref_id),
                            }),
                            _ => None,
                        };
                        ref_env.set(
                            instr.lvalue.identifier,
                            lookup_type.unwrap_or_else(|| {
                                ref_type_of_type(instr.lvalue.identifier, identifiers, types)
                            }),
                        );
                    }
                    InstructionValue::TypeCastExpression { value, .. }
                    | InstructionValue::NonNullExpression { value, .. } => {
                        ref_env.set(
                            instr.lvalue.identifier,
                            ref_env.get(value.identifier).cloned().unwrap_or_else(|| {
                                ref_type_of_type(instr.lvalue.identifier, identifiers, types)
                            }),
                        );
                    }
                    InstructionValue::LoadContext { place, .. }
                    | InstructionValue::LoadLocal { place, .. } => {
                        ref_env.set(
                            instr.lvalue.identifier,
                            ref_env.get(place.identifier).cloned().unwrap_or_else(|| {
                                ref_type_of_type(instr.lvalue.identifier, identifiers, types)
                            }),
                        );
                    }
                    InstructionValue::StoreContext { lvalue, value, .. }
                    | InstructionValue::StoreLocal { lvalue, value, .. } => {
                        ref_env.set(
                            lvalue.place.identifier,
                            ref_env.get(value.identifier).cloned().unwrap_or_else(|| {
                                ref_type_of_type(lvalue.place.identifier, identifiers, types)
                            }),
                        );
                        ref_env.set(
                            instr.lvalue.identifier,
                            ref_env.get(value.identifier).cloned().unwrap_or_else(|| {
                                ref_type_of_type(instr.lvalue.identifier, identifiers, types)
                            }),
                        );
                    }
                    InstructionValue::Destructure { value, lvalue, .. } => {
                        let obj_type = ref_env.get(value.identifier).cloned();
                        let lookup_type = match &obj_type {
                            Some(RefAccessType::Structure {
                                value: Some(value), ..
                            }) => Some(RefAccessType::from_ref_type(value)),
                            _ => None,
                        };
                        ref_env.set(
                            instr.lvalue.identifier,
                            lookup_type.clone().unwrap_or_else(|| {
                                ref_type_of_type(instr.lvalue.identifier, identifiers, types)
                            }),
                        );
                        for pattern_place in each_pattern_operand(&lvalue.pattern) {
                            ref_env.set(
                                pattern_place.identifier,
                                lookup_type.clone().unwrap_or_else(|| {
                                    ref_type_of_type(pattern_place.identifier, identifiers, types)
                                }),
                            );
                        }
                    }
                    InstructionValue::ObjectMethod { lowered_func, .. }
                    | InstructionValue::FunctionExpression { lowered_func, .. } => {
                        let inner = &functions[lowered_func.func.0 as usize];
                        let mut inner_errors: Vec<CompilerDiagnostic> = Vec::new();
                        let result = validate_no_ref_access_in_render_impl(
                            inner,
                            identifiers,
                            types,
                            functions,
                            env,
                            ref_env,
                            &mut inner_errors,
                        );
                        let (return_type, read_ref_effect) = if inner_errors.is_empty() {
                            (result, false)
                        } else {
                            (RefAccessType::None, true)
                        };
                        ref_env.set(
                            instr.lvalue.identifier,
                            RefAccessType::Structure {
                                value: None,
                                fn_type: Some(RefFnType {
                                    read_ref_effect,
                                    return_type: Box::new(return_type),
                                }),
                            },
                        );
                    }
                    InstructionValue::MethodCall { property, .. }
                    | InstructionValue::CallExpression {
                        callee: property, ..
                    } => {
                        let callee = property;
                        let mut return_type = RefAccessType::None;
                        let fn_type = ref_env.get(callee.identifier).cloned();
                        let mut did_error = false;

                        if let Some(RefAccessType::Structure {
                            fn_type: Some(fn_ty),
                            ..
                        }) = &fn_type
                        {
                            return_type = *fn_ty.return_type.clone();
                            if fn_ty.read_ref_effect {
                                did_error = true;
                                errors.push(
                                    CompilerDiagnostic::new(
                                        ErrorCategory::Refs,
                                        "Cannot access refs during render",
                                        Some(ERROR_DESCRIPTION.to_string()),
                                    )
                                    .with_detail(
                                        CompilerDiagnosticDetail::Error {
                                            loc: callee.loc,
                                            message: Some(
                                                "This function accesses a ref value".to_string(),
                                            ),
                                            identifier_name: None,
                                        },
                                    ),
                                );
                            }
                        }

                        /*
                         * If we already reported an error on this instruction, don't report
                         * duplicate errors
                         */
                        if !did_error {
                            let is_ref_lvalue =
                                is_ref_type(instr.lvalue.identifier, identifiers, types);
                            let callee_identifier = &identifiers[callee.identifier.0 as usize];
                            let callee_type = &types[callee_identifier.type_.0 as usize];
                            let hook_kind = env.get_hook_kind_for_type(callee_type).ok().flatten();

                            if is_ref_lvalue
                                || (hook_kind.is_some()
                                    && !matches!(hook_kind, Some(&HookKind::UseState))
                                    && !matches!(hook_kind, Some(&HookKind::UseReducer)))
                            {
                                for operand in
                                    &canonical_each_instruction_value_operand(&instr.value, env)
                                {
                                    /*
                                     * Allow passing refs or ref-accessing functions when:
                                     * 1. lvalue is a ref (mergeRefs pattern)
                                     * 2. calling hooks (independently validated)
                                     */
                                    validate_no_direct_ref_value_access(errors, operand, ref_env);
                                }
                            } else if interpolated_as_jsx.contains(&instr.lvalue.identifier) {
                                for operand in
                                    &canonical_each_instruction_value_operand(&instr.value, env)
                                {
                                    /*
                                     * Special case: the lvalue is passed as a jsx child
                                     */
                                    validate_no_ref_value_access(errors, ref_env, operand);
                                }
                            } else if hook_kind.is_none() {
                                if let Some(ref effects) = instr.effects {
                                    /*
                                     * For non-hook functions with known aliasing effects,
                                     * use the effects to determine what validation to apply.
                                     * Track visited id:kind pairs to avoid duplicate errors.
                                     */
                                    let mut visited_effects: FxHashSet<String> =
                                        FxHashSet::default();
                                    for effect in effects {
                                        let (place, validation) = match effect {
                                            AliasingEffect::Freeze { value, .. } => {
                                                (Some(value), "direct-ref")
                                            }
                                            AliasingEffect::Mutate { value, .. }
                                            | AliasingEffect::MutateTransitive { value, .. }
                                            | AliasingEffect::MutateConditionally {
                                                value, ..
                                            }
                                            | AliasingEffect::MutateTransitiveConditionally {
                                                value,
                                                ..
                                            } => (Some(value), "ref-passed"),
                                            AliasingEffect::Render { place, .. } => {
                                                (Some(place), "ref-passed")
                                            }
                                            AliasingEffect::Capture { from, .. }
                                            | AliasingEffect::Alias { from, .. }
                                            | AliasingEffect::MaybeAlias { from, .. }
                                            | AliasingEffect::Assign { from, .. }
                                            | AliasingEffect::CreateFrom { from, .. } => {
                                                (Some(from), "ref-passed")
                                            }
                                            AliasingEffect::ImmutableCapture { from, .. } => {
                                                /*
                                                 * ImmutableCapture: check whether the same
                                                 * operand also has a Freeze effect to
                                                 * distinguish known signatures from
                                                 * downgraded defaults.
                                                 */
                                                let is_frozen = effects.iter().any(|e| {
                                                    matches!(
                                                        e,
                                                        AliasingEffect::Freeze { value, .. }
                                                            if value.identifier == from.identifier
                                                    )
                                                });
                                                (
                                                    Some(from),
                                                    if is_frozen {
                                                        "direct-ref"
                                                    } else {
                                                        "ref-passed"
                                                    },
                                                )
                                            }
                                            _ => (None, "none"),
                                        };
                                        if let Some(place) = place {
                                            if validation != "none" {
                                                let key = format!(
                                                    "{}:{}",
                                                    place.identifier.0, validation
                                                );
                                                if visited_effects.insert(key) {
                                                    if validation == "direct-ref" {
                                                        validate_no_direct_ref_value_access(
                                                            errors, place, ref_env,
                                                        );
                                                    } else {
                                                        validate_no_ref_passed_to_function(
                                                            errors, ref_env, place, place.loc,
                                                        );
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    for operand in
                                        &canonical_each_instruction_value_operand(&instr.value, env)
                                    {
                                        validate_no_ref_passed_to_function(
                                            errors,
                                            ref_env,
                                            operand,
                                            operand.loc,
                                        );
                                    }
                                }
                            } else {
                                for operand in
                                    &canonical_each_instruction_value_operand(&instr.value, env)
                                {
                                    validate_no_ref_passed_to_function(
                                        errors,
                                        ref_env,
                                        operand,
                                        operand.loc,
                                    );
                                }
                            }
                        }
                        ref_env.set(instr.lvalue.identifier, return_type);
                    }
                    InstructionValue::ObjectExpression { .. }
                    | InstructionValue::ArrayExpression { .. } => {
                        let operands = canonical_each_instruction_value_operand(&instr.value, env);
                        let mut types_vec: Vec<RefAccessType> = Vec::new();
                        for operand in &operands {
                            validate_no_direct_ref_value_access(errors, operand, ref_env);
                            types_vec.push(
                                ref_env
                                    .get(operand.identifier)
                                    .cloned()
                                    .unwrap_or(RefAccessType::None),
                            );
                        }
                        let value = join_ref_access_types_many(&types_vec);
                        match &value {
                            RefAccessType::None
                            | RefAccessType::Guard { .. }
                            | RefAccessType::Nullable => {
                                ref_env.set(instr.lvalue.identifier, RefAccessType::None);
                            }
                            _ => {
                                ref_env.set(
                                    instr.lvalue.identifier,
                                    RefAccessType::Structure {
                                        value: value.to_ref_type().map(Box::new),
                                        fn_type: None,
                                    },
                                );
                            }
                        }
                    }
                    InstructionValue::PropertyDelete { object, .. }
                    | InstructionValue::PropertyStore { object, .. }
                    | InstructionValue::ComputedDelete { object, .. }
                    | InstructionValue::ComputedStore { object, .. } => {
                        let target = ref_env.get(object.identifier).cloned();
                        let mut found_safe = false;
                        if matches!(&instr.value, InstructionValue::PropertyStore { .. }) {
                            if let Some(RefAccessType::Ref { ref_id }) = &target {
                                if let Some(pos) = safe_blocks.iter().position(|(_, r)| r == ref_id)
                                {
                                    safe_blocks.remove(pos);
                                    found_safe = true;
                                }
                            }
                        }
                        if !found_safe {
                            validate_no_ref_update(errors, ref_env, object, instr.loc);
                        }
                        match &instr.value {
                            InstructionValue::ComputedDelete { property, .. }
                            | InstructionValue::ComputedStore { property, .. } => {
                                validate_no_ref_value_access(errors, ref_env, property);
                            }
                            _ => {}
                        }
                        match &instr.value {
                            InstructionValue::ComputedStore { value, .. }
                            | InstructionValue::PropertyStore { value, .. } => {
                                validate_no_direct_ref_value_access(errors, value, ref_env);
                                let value_type = ref_env.get(value.identifier).cloned();
                                if let Some(RefAccessType::Structure { .. }) = &value_type {
                                    let mut object_type = value_type.unwrap();
                                    if let Some(t) = &target {
                                        object_type = join_ref_access_types(&object_type, t);
                                    }
                                    ref_env.set(object.identifier, object_type);
                                }
                            }
                            _ => {}
                        }
                    }
                    InstructionValue::StartMemoize { .. }
                    | InstructionValue::FinishMemoize { .. } => {}
                    InstructionValue::LoadGlobal { binding, .. } => {
                        if binding.name() == "undefined" {
                            ref_env.set(instr.lvalue.identifier, RefAccessType::Nullable);
                        }
                    }
                    InstructionValue::Primitive { value, .. } => {
                        if matches!(value, PrimitiveValue::Null | PrimitiveValue::Undefined) {
                            ref_env.set(instr.lvalue.identifier, RefAccessType::Nullable);
                        }
                    }
                    InstructionValue::UnaryExpression {
                        operator, value, ..
                    } => {
                        if *operator == UnaryOperator::Not {
                            if let Some(RefAccessType::RefValue {
                                ref_id: Some(ref_id),
                                ..
                            }) = ref_env.get(value.identifier).cloned().as_ref()
                            {
                                /*
                                 * Record an error suggesting the `if (ref.current == null)` pattern,
                                 * but also record the lvalue as a guard so that we don't emit a
                                 * second error for the write to the ref
                                 */
                                ref_env.set(
                                    instr.lvalue.identifier,
                                    RefAccessType::Guard { ref_id: *ref_id },
                                );
                                errors.push(
                                    CompilerDiagnostic::new(
                                        ErrorCategory::Refs,
                                        "Cannot access refs during render",
                                        Some(ERROR_DESCRIPTION.to_string()),
                                    )
                                    .with_detail(CompilerDiagnosticDetail::Error {
                                        loc: value.loc,
                                        message: Some(
                                            "Cannot access ref value during render"
                                                .to_string(),
                                        ),
                                        identifier_name: None,
                                    })
                                    .with_detail(CompilerDiagnosticDetail::Hint {
                                        message: "To initialize a ref only once, check that the ref is null with the pattern `if (ref.current == null) { ref.current = ... }`".to_string(),
                                    }),
                                );
                            } else {
                                validate_no_ref_value_access(errors, ref_env, value);
                            }
                        } else {
                            validate_no_ref_value_access(errors, ref_env, value);
                        }
                    }
                    InstructionValue::BinaryExpression { left, right, .. } => {
                        let left_type = ref_env.get(left.identifier).cloned();
                        let right_type = ref_env.get(right.identifier).cloned();
                        let mut nullish = false;
                        let mut found_ref_id: Option<RefId> = None;

                        if let Some(RefAccessType::RefValue {
                            ref_id: Some(id), ..
                        }) = &left_type
                        {
                            found_ref_id = Some(*id);
                        } else if let Some(RefAccessType::RefValue {
                            ref_id: Some(id), ..
                        }) = &right_type
                        {
                            found_ref_id = Some(*id);
                        }

                        if matches!(&left_type, Some(RefAccessType::Nullable)) {
                            nullish = true;
                        } else if matches!(&right_type, Some(RefAccessType::Nullable)) {
                            nullish = true;
                        }

                        if let Some(ref_id) = found_ref_id {
                            if nullish {
                                ref_env
                                    .set(instr.lvalue.identifier, RefAccessType::Guard { ref_id });
                            } else {
                                validate_no_ref_value_access(errors, ref_env, left);
                                validate_no_ref_value_access(errors, ref_env, right);
                            }
                        } else {
                            validate_no_ref_value_access(errors, ref_env, left);
                            validate_no_ref_value_access(errors, ref_env, right);
                        }
                    }
                    _ => {
                        for operand in &canonical_each_instruction_value_operand(&instr.value, env)
                        {
                            validate_no_ref_value_access(errors, ref_env, operand);
                        }
                    }
                }

                // Guard values are derived from ref.current, so they can only be used
                // in if statement targets
                for operand in &canonical_each_instruction_value_operand(&instr.value, env) {
                    guard_check(errors, operand, ref_env);
                }

                if is_ref_type(instr.lvalue.identifier, identifiers, types)
                    && !matches!(
                        ref_env.get(instr.lvalue.identifier),
                        Some(RefAccessType::Ref { .. })
                    )
                {
                    let existing = ref_env
                        .get(instr.lvalue.identifier)
                        .cloned()
                        .unwrap_or(RefAccessType::None);
                    ref_env.set(
                        instr.lvalue.identifier,
                        join_ref_access_types(
                            &existing,
                            &RefAccessType::Ref {
                                ref_id: next_ref_id(),
                            },
                        ),
                    );
                }
                if is_ref_value_type(instr.lvalue.identifier, identifiers, types)
                    && !matches!(
                        ref_env.get(instr.lvalue.identifier),
                        Some(RefAccessType::RefValue { .. })
                    )
                {
                    let existing = ref_env
                        .get(instr.lvalue.identifier)
                        .cloned()
                        .unwrap_or(RefAccessType::None);
                    ref_env.set(
                        instr.lvalue.identifier,
                        join_ref_access_types(
                            &existing,
                            &RefAccessType::RefValue {
                                loc: instr.loc,
                                ref_id: None,
                            },
                        ),
                    );
                }
            }

            // Check if terminal is an `if` — push safe block for guard
            if let Terminal::If {
                test, fallthrough, ..
            } = &block.terminal
            {
                if let Some(RefAccessType::Guard { ref_id }) = ref_env.get(test.identifier) {
                    if !safe_blocks.iter().any(|(_, r)| r == ref_id) {
                        safe_blocks.push((*fallthrough, *ref_id));
                    }
                }
            }

            // Process terminal operands
            for operand in &each_terminal_operand(&block.terminal) {
                if !matches!(&block.terminal, Terminal::Return { .. }) {
                    validate_no_ref_value_access(errors, ref_env, operand);
                    if !matches!(&block.terminal, Terminal::If { .. }) {
                        guard_check(errors, operand, ref_env);
                    }
                } else {
                    // Allow functions containing refs to be returned, but not direct ref values
                    validate_no_direct_ref_value_access(errors, operand, ref_env);
                    guard_check(errors, operand, ref_env);
                    if let Some(ty) = ref_env.get(operand.identifier) {
                        return_values.push(ty.clone());
                    }
                }
            }
        }

        if !errors.is_empty() {
            return RefAccessType::None;
        }
    }

    if ref_env.has_changed() {
        errors.push(CompilerDiagnostic::new(
            react_compiler_diagnostics::ErrorCategory::Invariant,
            "Ref type environment did not converge",
            None,
        ));
        return RefAccessType::None;
    }

    join_ref_access_types_many(&return_values)
}

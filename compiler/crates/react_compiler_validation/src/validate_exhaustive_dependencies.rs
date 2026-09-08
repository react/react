use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, CompilerSuggestion, CompilerSuggestionOperation,
    ErrorCategory, SourceLocation,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::environment_config::ExhaustiveEffectDepsMode;
use react_compiler_hir::visitors::{
    each_instruction_value_lvalue, each_instruction_value_operand_with_functions,
    each_terminal_operand,
};
use react_compiler_hir::{
    ArrayElement, BlockId, DependencyPathEntry, HirFunction, Identifier, IdentifierId,
    InstructionKind, InstructionValue, ManualMemoDependency, ManualMemoDependencyRoot,
    NonLocalBinding, ParamPattern, Place, PlaceOrSpread, PropertyLiteral, Terminal, Type,
};

/// Port of ValidateExhaustiveDependencies.ts
///
/// Validates that existing manual memoization is exhaustive and does not
/// have extraneous dependencies. The goal is to ensure auto-memoization
/// will not substantially change program behavior.
///
/// Note: takes `&mut HirFunction` (deviating from the read-only validation convention)
/// because it sets `has_invalid_deps` on StartMemoize instructions when validation
/// errors are found, so that ValidatePreservedManualMemoization can skip those blocks.
pub fn validate_exhaustive_dependencies(
    func: &mut HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerDiagnostic> {
    let reactive = collect_reactive_identifiers(func, &env.functions);
    let validate_memo = env.config.validate_exhaustive_memoization_dependencies;
    let validate_effect = env.config.validate_exhaustive_effect_dependencies.clone();

    let mut temporaries: FxHashMap<IdentifierId, Temporary> = FxHashMap::default();
    for param in &func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(s) => &s.place,
        };
        temporaries.insert(
            place.identifier,
            Temporary::Local {
                identifier: place.identifier,
                path: Vec::new(),
                context: false,
                loc: place.loc,
            },
        );
    }

    let mut start_memo: Option<StartMemoInfo> = None;
    let mut memo_locals: FxHashSet<IdentifierId> = FxHashSet::default();

    // Callbacks struct holding the mutable state
    let mut callbacks = Callbacks {
        start_memo: &mut start_memo,
        memo_locals: &mut memo_locals,
        validate_memo,
        validate_effect: validate_effect.clone(),
        reactive: &reactive,
        diagnostics: Vec::new(),
        invalid_memo_ids: FxHashSet::default(),
    };

    collect_dependencies(
        func,
        &env.identifiers,
        &env.types,
        &env.functions,
        &mut temporaries,
        &mut Some(&mut callbacks),
        false,
    )?;

    // Set has_invalid_deps on StartMemoize instructions that had validation errors
    if !callbacks.invalid_memo_ids.is_empty() {
        for instr in func.instructions.iter_mut() {
            if let InstructionValue::StartMemoize {
                manual_memo_id,
                has_invalid_deps,
                ..
            } = &mut instr.value
            {
                if callbacks.invalid_memo_ids.contains(manual_memo_id) {
                    *has_invalid_deps = true;
                }
            }
        }
    }

    // Record all diagnostics on the environment
    for diagnostic in callbacks.diagnostics {
        env.record_diagnostic(diagnostic);
    }
    Ok(())
}

// =============================================================================
// Internal types
// =============================================================================

/// Info extracted from a StartMemoize instruction
struct StartMemoInfo {
    manual_memo_id: u32,
    deps: Option<Vec<ManualMemoDependency>>,
    deps_loc: Option<Option<SourceLocation>>,
    #[allow(dead_code)]
    loc: Option<SourceLocation>,
}

/// A temporary value tracked during dependency collection
#[derive(Debug, Clone)]
enum Temporary {
    Local {
        identifier: IdentifierId,
        path: Vec<DependencyPathEntry>,
        context: bool,
        loc: Option<SourceLocation>,
    },
    Global {
        binding: NonLocalBinding,
    },
    Aggregate {
        dependencies: Vec<InferredDependency>,
        loc: Option<SourceLocation>,
    },
}

/// An inferred dependency (Local or Global)
#[derive(Debug, Clone)]
enum InferredDependency {
    Local {
        identifier: IdentifierId,
        path: Vec<DependencyPathEntry>,
        #[allow(dead_code)]
        context: bool,
        loc: Option<SourceLocation>,
    },
    Global {
        binding: NonLocalBinding,
    },
}

/// Hashable key for deduplicating inferred dependencies in a Set
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum InferredDependencyKey {
    Local {
        identifier: IdentifierId,
        path_key: String,
    },
    Global {
        name: String,
    },
}

fn dep_to_key(dep: &InferredDependency) -> InferredDependencyKey {
    match dep {
        InferredDependency::Local {
            identifier, path, ..
        } => InferredDependencyKey::Local {
            identifier: *identifier,
            path_key: path_to_string(path),
        },
        InferredDependency::Global { binding } => InferredDependencyKey::Global {
            name: binding.name().to_string(),
        },
    }
}

fn path_to_string(path: &[DependencyPathEntry]) -> String {
    path.iter()
        .map(|p| format!("{}{}", if p.optional { "?." } else { "." }, p.property))
        .collect::<Vec<_>>()
        .join("")
}

/// Callbacks for StartMemoize/FinishMemoize/Effect events
struct Callbacks<'a> {
    start_memo: &'a mut Option<StartMemoInfo>,
    #[allow(dead_code)]
    memo_locals: &'a mut FxHashSet<IdentifierId>,
    validate_memo: bool,
    validate_effect: ExhaustiveEffectDepsMode,
    reactive: &'a FxHashSet<IdentifierId>,
    diagnostics: Vec<CompilerDiagnostic>,
    /// manual_memo_ids that had validation errors (to set has_invalid_deps)
    invalid_memo_ids: FxHashSet<u32>,
}

// =============================================================================
// Helper: type checking functions
// =============================================================================

fn is_effect_event_function_type(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. } if id == "BuiltInEffectEventFunction")
}

fn is_stable_type(ty: &Type) -> bool {
    match ty {
        Type::Function {
            shape_id: Some(id), ..
        } => matches!(
            id.as_str(),
            "BuiltInSetState"
                | "BuiltInSetActionState"
                | "BuiltInDispatch"
                | "BuiltInStartTransition"
                | "BuiltInSetOptimistic"
        ),
        Type::Object { shape_id: Some(id) } => matches!(id.as_str(), "BuiltInUseRefId"),
        _ => false,
    }
}

fn is_effect_hook(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. }
        if id == "BuiltInUseEffectHook"
            || id == "BuiltInUseLayoutEffectHook"
            || id == "BuiltInUseInsertionEffectHook"
    )
}

fn is_primitive_type(ty: &Type) -> bool {
    matches!(ty, Type::Primitive)
}

fn is_use_ref_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == "BuiltInUseRefId")
}

fn get_identifier_type<'a>(
    id: IdentifierId,
    identifiers: &'a [Identifier],
    types: &'a [Type],
) -> &'a Type {
    let ident = &identifiers[id.0 as usize];
    &types[ident.type_.0 as usize]
}

fn get_identifier_name(id: IdentifierId, identifiers: &[Identifier]) -> Option<String> {
    identifiers[id.0 as usize]
        .name
        .as_ref()
        .map(|n| n.value().to_string())
}

// =============================================================================
// Path helpers (matching TS areEqualPaths, isSubPath, isSubPathIgnoringOptionals)
// =============================================================================

fn are_equal_paths(a: &[DependencyPathEntry], b: &[DependencyPathEntry]) -> bool {
    a.len() == b.len()
        && a.iter()
            .zip(b.iter())
            .all(|(ai, bi)| ai.property == bi.property && ai.optional == bi.optional)
}

fn is_sub_path(subpath: &[DependencyPathEntry], path: &[DependencyPathEntry]) -> bool {
    subpath.len() <= path.len()
        && subpath
            .iter()
            .zip(path.iter())
            .all(|(a, b)| a.property == b.property && a.optional == b.optional)
}

fn is_sub_path_ignoring_optionals(
    subpath: &[DependencyPathEntry],
    path: &[DependencyPathEntry],
) -> bool {
    subpath.len() <= path.len()
        && subpath
            .iter()
            .zip(path.iter())
            .all(|(a, b)| a.property == b.property)
}

// =============================================================================
// Collect reactive identifiers
// =============================================================================

fn collect_reactive_identifiers(
    func: &HirFunction,
    functions: &[HirFunction],
) -> FxHashSet<IdentifierId> {
    let mut reactive = FxHashSet::default();
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            // Check instruction lvalue
            if instr.lvalue.reactive {
                reactive.insert(instr.lvalue.identifier);
            }
            // Check inner lvalues (Destructure patterns, StoreLocal, DeclareLocal, etc.)
            // Matches TS eachInstructionLValue which yields both instr.lvalue and
            // eachInstructionValueLValue(instr.value)
            for lvalue in each_instruction_value_lvalue(&instr.value) {
                if lvalue.reactive {
                    reactive.insert(lvalue.identifier);
                }
            }
            for operand in each_instruction_value_operand_with_functions(&instr.value, functions) {
                if operand.reactive {
                    reactive.insert(operand.identifier);
                }
            }
        }
        for operand in each_terminal_operand(&block.terminal) {
            if operand.reactive {
                reactive.insert(operand.identifier);
            }
        }
    }
    reactive
}

// =============================================================================
// findOptionalPlaces
// =============================================================================

fn find_optional_places(func: &HirFunction) -> FxHashMap<IdentifierId, bool> {
    let mut optionals: FxHashMap<IdentifierId, bool> = FxHashMap::default();
    let mut visited: FxHashSet<BlockId> = FxHashSet::default();

    for (_block_id, block) in &func.body.blocks {
        if visited.contains(&block.id) {
            continue;
        }
        if let Terminal::Optional {
            test,
            fallthrough: optional_fallthrough,
            optional,
            ..
        } = &block.terminal
        {
            visited.insert(block.id);
            let mut test_block_id = *test;
            let mut queue: Vec<Option<bool>> = vec![Some(*optional)];

            'outer: loop {
                let test_block = &func.body.blocks[&test_block_id];
                visited.insert(test_block.id);
                match &test_block.terminal {
                    Terminal::Branch {
                        test: test_place,
                        consequent,
                        fallthrough,
                        ..
                    } => {
                        let is_optional = queue
                            .pop()
                            .expect("Expected an optional value for each optional test condition");
                        if let Some(opt) = is_optional {
                            optionals.insert(test_place.identifier, opt);
                        }
                        if fallthrough == optional_fallthrough {
                            // Found the end of the optional chain
                            let consequent_block = &func.body.blocks[consequent];
                            if let Some(last_id) = consequent_block.instructions.last() {
                                let last_instr = &func.instructions[last_id.0 as usize];
                                if let InstructionValue::StoreLocal { value, .. } =
                                    &last_instr.value
                                {
                                    if let Some(opt) = is_optional {
                                        optionals.insert(value.identifier, opt);
                                    }
                                }
                            }
                            break 'outer;
                        } else {
                            test_block_id = *fallthrough;
                        }
                    }
                    Terminal::Optional {
                        optional: opt,
                        test: inner_test,
                        ..
                    } => {
                        queue.push(Some(*opt));
                        test_block_id = *inner_test;
                    }
                    Terminal::Logical {
                        test: inner_test, ..
                    }
                    | Terminal::Ternary {
                        test: inner_test, ..
                    } => {
                        queue.push(None);
                        test_block_id = *inner_test;
                    }
                    Terminal::Sequence {
                        block: seq_block, ..
                    } => {
                        test_block_id = *seq_block;
                    }
                    Terminal::MaybeThrow { continuation, .. } => {
                        test_block_id = *continuation;
                    }
                    _ => {
                        // Unexpected terminal in optional — skip rather than panic
                        break 'outer;
                    }
                }
            }
            // TS asserts queue.length === 0 here, but we skip the assertion
            // to avoid panicking on edge cases.
        }
    }

    optionals
}

// =============================================================================
// Dependency collection
// =============================================================================

fn add_dependency(
    dep: &Temporary,
    dependencies: &mut Vec<InferredDependency>,
    dep_keys: &mut FxHashSet<InferredDependencyKey>,
    locals: &FxHashSet<IdentifierId>,
) {
    match dep {
        Temporary::Aggregate {
            dependencies: agg_deps,
            ..
        } => {
            for d in agg_deps {
                add_dependency_inferred(d, dependencies, dep_keys, locals);
            }
        }
        Temporary::Global { binding } => {
            let inferred = InferredDependency::Global {
                binding: binding.clone(),
            };
            let key = dep_to_key(&inferred);
            if dep_keys.insert(key) {
                dependencies.push(inferred);
            }
        }
        Temporary::Local {
            identifier,
            path,
            context,
            loc,
        } => {
            if !locals.contains(identifier) {
                let inferred = InferredDependency::Local {
                    identifier: *identifier,
                    path: path.clone(),
                    context: *context,
                    loc: *loc,
                };
                let key = dep_to_key(&inferred);
                if dep_keys.insert(key) {
                    dependencies.push(inferred);
                }
            }
        }
    }
}

fn add_dependency_inferred(
    dep: &InferredDependency,
    dependencies: &mut Vec<InferredDependency>,
    dep_keys: &mut FxHashSet<InferredDependencyKey>,
    locals: &FxHashSet<IdentifierId>,
) {
    match dep {
        InferredDependency::Global { .. } => {
            let key = dep_to_key(dep);
            if dep_keys.insert(key) {
                dependencies.push(dep.clone());
            }
        }
        InferredDependency::Local { identifier, .. } => {
            if !locals.contains(identifier) {
                let key = dep_to_key(dep);
                if dep_keys.insert(key) {
                    dependencies.push(dep.clone());
                }
            }
        }
    }
}

fn visit_candidate_dependency(
    place: &Place,
    temporaries: &FxHashMap<IdentifierId, Temporary>,
    dependencies: &mut Vec<InferredDependency>,
    dep_keys: &mut FxHashSet<InferredDependencyKey>,
    locals: &FxHashSet<IdentifierId>,
) {
    if let Some(dep) = temporaries.get(&place.identifier) {
        add_dependency(dep, dependencies, dep_keys, locals);
    }
}

fn collect_dependencies(
    func: &HirFunction,
    identifiers: &[Identifier],
    types: &[Type],
    functions: &[HirFunction],
    temporaries: &mut FxHashMap<IdentifierId, Temporary>,
    callbacks: &mut Option<&mut Callbacks<'_>>,
    is_function_expression: bool,
) -> Result<Temporary, CompilerDiagnostic> {
    let optionals = find_optional_places(func);
    let mut locals: FxHashSet<IdentifierId> = FxHashSet::default();

    if is_function_expression {
        for param in &func.params {
            let place = match param {
                ParamPattern::Place(p) => p,
                ParamPattern::Spread(s) => &s.place,
            };
            locals.insert(place.identifier);
        }
    }

    let mut dependencies: Vec<InferredDependency> = Vec::new();
    let mut dep_keys: FxHashSet<InferredDependencyKey> = FxHashSet::default();

    // Saved state for when we're inside a memo block (StartMemoize..FinishMemoize).
    // In TS, `dependencies` and `locals` are shared by reference between the main
    // collection loop and the callbacks — StartMemoize clears them, FinishMemoize
    // reads and clears them. We simulate this by saving/restoring.
    let mut saved_dependencies: Option<Vec<InferredDependency>> = None;
    let mut saved_dep_keys: Option<FxHashSet<InferredDependencyKey>> = None;
    let mut saved_locals: Option<FxHashSet<IdentifierId>> = None;

    for (_block_id, block) in &func.body.blocks {
        // Process phis
        for phi in &block.phis {
            let mut deps: Vec<InferredDependency> = Vec::new();
            for (_pred_id, operand) in &phi.operands {
                if let Some(dep) = temporaries.get(&operand.identifier) {
                    match dep {
                        Temporary::Aggregate {
                            dependencies: agg, ..
                        } => {
                            deps.extend(agg.iter().cloned());
                        }
                        Temporary::Local {
                            identifier,
                            path,
                            context,
                            loc,
                        } => {
                            deps.push(InferredDependency::Local {
                                identifier: *identifier,
                                path: path.clone(),
                                context: *context,
                                loc: *loc,
                            });
                        }
                        Temporary::Global { binding } => {
                            deps.push(InferredDependency::Global {
                                binding: binding.clone(),
                            });
                        }
                    }
                }
            }
            if deps.is_empty() {
                continue;
            } else if deps.len() == 1 {
                let dep = &deps[0];
                match dep {
                    InferredDependency::Local {
                        identifier,
                        path,
                        context,
                        loc,
                    } => {
                        temporaries.insert(
                            phi.place.identifier,
                            Temporary::Local {
                                identifier: *identifier,
                                path: path.clone(),
                                context: *context,
                                loc: *loc,
                            },
                        );
                    }
                    InferredDependency::Global { binding } => {
                        temporaries.insert(
                            phi.place.identifier,
                            Temporary::Global {
                                binding: binding.clone(),
                            },
                        );
                    }
                }
            } else {
                temporaries.insert(
                    phi.place.identifier,
                    Temporary::Aggregate {
                        dependencies: deps,
                        loc: None,
                    },
                );
            }
        }

        // Process instructions
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let lvalue_id = instr.lvalue.identifier;

            match &instr.value {
                InstructionValue::LoadGlobal { binding, .. } => {
                    temporaries.insert(
                        lvalue_id,
                        Temporary::Global {
                            binding: binding.clone(),
                        },
                    );
                }
                InstructionValue::LoadContext { place, .. }
                | InstructionValue::LoadLocal { place, .. } => {
                    if let Some(temp) = temporaries.get(&place.identifier).cloned() {
                        match &temp {
                            Temporary::Local { .. } => {
                                // Update loc to the load site
                                let mut updated = temp.clone();
                                if let Temporary::Local { loc, .. } = &mut updated {
                                    *loc = place.loc;
                                }
                                temporaries.insert(lvalue_id, updated);
                            }
                            _ => {
                                temporaries.insert(lvalue_id, temp);
                            }
                        }
                        if locals.contains(&place.identifier) {
                            locals.insert(lvalue_id);
                        }
                    }
                }
                InstructionValue::DeclareLocal {
                    lvalue: decl_lv, ..
                } => {
                    temporaries.insert(
                        decl_lv.place.identifier,
                        Temporary::Local {
                            identifier: decl_lv.place.identifier,
                            path: Vec::new(),
                            context: false,
                            loc: decl_lv.place.loc,
                        },
                    );
                    locals.insert(decl_lv.place.identifier);
                }
                InstructionValue::StoreLocal {
                    lvalue: store_lv,
                    value: store_val,
                    ..
                } => {
                    let has_name = identifiers[store_lv.place.identifier.0 as usize]
                        .name
                        .is_some();
                    if !has_name {
                        // Unnamed: propagate temporary
                        if let Some(temp) = temporaries.get(&store_val.identifier).cloned() {
                            temporaries.insert(store_lv.place.identifier, temp);
                        }
                    } else {
                        // Named: visit the value and create a new local
                        visit_candidate_dependency(
                            store_val,
                            temporaries,
                            &mut dependencies,
                            &mut dep_keys,
                            &locals,
                        );
                        if store_lv.kind != InstructionKind::Reassign {
                            temporaries.insert(
                                store_lv.place.identifier,
                                Temporary::Local {
                                    identifier: store_lv.place.identifier,
                                    path: Vec::new(),
                                    context: false,
                                    loc: store_lv.place.loc,
                                },
                            );
                            locals.insert(store_lv.place.identifier);
                        }
                    }
                }
                InstructionValue::DeclareContext {
                    lvalue: decl_lv, ..
                } => {
                    temporaries.insert(
                        decl_lv.place.identifier,
                        Temporary::Local {
                            identifier: decl_lv.place.identifier,
                            path: Vec::new(),
                            context: true,
                            loc: decl_lv.place.loc,
                        },
                    );
                }
                InstructionValue::StoreContext {
                    lvalue: store_lv,
                    value: store_val,
                    ..
                } => {
                    visit_candidate_dependency(
                        store_val,
                        temporaries,
                        &mut dependencies,
                        &mut dep_keys,
                        &locals,
                    );
                    if store_lv.kind != InstructionKind::Reassign {
                        temporaries.insert(
                            store_lv.place.identifier,
                            Temporary::Local {
                                identifier: store_lv.place.identifier,
                                path: Vec::new(),
                                context: true,
                                loc: store_lv.place.loc,
                            },
                        );
                        locals.insert(store_lv.place.identifier);
                    }
                }
                InstructionValue::Destructure {
                    value: destr_val,
                    lvalue: destr_lv,
                    ..
                } => {
                    visit_candidate_dependency(
                        destr_val,
                        temporaries,
                        &mut dependencies,
                        &mut dep_keys,
                        &locals,
                    );
                    if destr_lv.kind != InstructionKind::Reassign {
                        for lv_place in each_instruction_value_lvalue(&instr.value) {
                            temporaries.insert(
                                lv_place.identifier,
                                Temporary::Local {
                                    identifier: lv_place.identifier,
                                    path: Vec::new(),
                                    context: false,
                                    loc: lv_place.loc,
                                },
                            );
                            locals.insert(lv_place.identifier);
                        }
                    }
                }
                InstructionValue::PropertyLoad {
                    object, property, ..
                } => {
                    // Number properties or ref.current: visit the object directly
                    let is_numeric = matches!(property, PropertyLiteral::Number(_));
                    let is_ref_current =
                        is_use_ref_type(get_identifier_type(object.identifier, identifiers, types))
                            && *property == PropertyLiteral::String("current".to_string());

                    if is_numeric || is_ref_current {
                        visit_candidate_dependency(
                            object,
                            temporaries,
                            &mut dependencies,
                            &mut dep_keys,
                            &locals,
                        );
                    } else {
                        // Extend path
                        let obj_temp = temporaries.get(&object.identifier).cloned();
                        if let Some(Temporary::Local {
                            identifier,
                            path,
                            context,
                            ..
                        }) = obj_temp
                        {
                            let optional =
                                optionals.get(&object.identifier).copied().unwrap_or(false);
                            let mut new_path = path.clone();
                            new_path.push(DependencyPathEntry {
                                optional,
                                property: property.clone(),
                                loc: instr.value.loc().copied(),
                            });
                            temporaries.insert(
                                lvalue_id,
                                Temporary::Local {
                                    identifier,
                                    path: new_path,
                                    context,
                                    loc: instr.value.loc().copied(),
                                },
                            );
                        }
                    }
                }
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let inner_func = &functions[lowered_func.func.0 as usize];
                    let function_deps = collect_dependencies(
                        inner_func,
                        identifiers,
                        types,
                        functions,
                        temporaries,
                        &mut None,
                        true,
                    )?;
                    temporaries.insert(lvalue_id, function_deps.clone());
                    add_dependency(&function_deps, &mut dependencies, &mut dep_keys, &locals);
                }
                InstructionValue::StartMemoize {
                    manual_memo_id,
                    deps,
                    deps_loc,
                    loc,
                    ..
                } => {
                    if let Some(cb) = callbacks.as_mut() {
                        // onStartMemoize — mirrors TS behavior of clearing dependencies and locals
                        *cb.start_memo = Some(StartMemoInfo {
                            manual_memo_id: *manual_memo_id,
                            deps: deps.clone(),
                            deps_loc: *deps_loc,
                            loc: *loc,
                        });
                        // Save current state and clear, matching TS which clears the shared
                        // dependencies/locals sets on StartMemoize
                        saved_dependencies = Some(std::mem::take(&mut dependencies));
                        saved_dep_keys = Some(std::mem::take(&mut dep_keys));
                        saved_locals = Some(std::mem::take(&mut locals));
                    }
                }
                InstructionValue::FinishMemoize {
                    manual_memo_id,
                    decl,
                    ..
                } => {
                    if let Some(cb) = callbacks.as_mut() {
                        // onFinishMemoize — mirrors TS behavior
                        let sm = cb.start_memo.take();
                        if let Some(sm) = sm {
                            assert_eq!(
                                sm.manual_memo_id, *manual_memo_id,
                                "Found FinishMemoize without corresponding StartMemoize"
                            );

                            if cb.validate_memo {
                                // Visit the decl to add it as a dependency candidate
                                // (matches TS: visitCandidateDependency(value.decl, ...))
                                visit_candidate_dependency(
                                    decl,
                                    temporaries,
                                    &mut dependencies,
                                    &mut dep_keys,
                                    &locals,
                                );

                                // Use ALL dependencies collected since StartMemoize cleared the set.
                                // This matches TS: `const inferred = Array.from(dependencies)`
                                let inferred: Vec<InferredDependency> = dependencies.clone();

                                let diagnostic = validate_dependencies(
                                    inferred,
                                    &sm.deps.unwrap_or_default(),
                                    cb.reactive,
                                    sm.deps_loc.unwrap_or(None),
                                    ErrorCategory::MemoDependencies,
                                    "all",
                                    identifiers,
                                    types,
                                )?;
                                if let Some(diag) = diagnostic {
                                    cb.diagnostics.push(diag);
                                    cb.invalid_memo_ids.insert(sm.manual_memo_id);
                                }
                            }

                            // Restore saved state (matching TS: dependencies.clear(), locals.clear())
                            // We restore instead of just clearing because we need the outer deps back
                            if let Some(saved) = saved_dependencies.take() {
                                // Merge current memo-block deps into the restored outer deps
                                let memo_deps = std::mem::replace(&mut dependencies, saved);
                                let _memo_keys = std::mem::replace(
                                    &mut dep_keys,
                                    saved_dep_keys.take().unwrap_or_default(),
                                );
                                locals = saved_locals.take().unwrap_or_default();
                                // Add memo deps to outer deps (they're still valid outer deps)
                                for d in memo_deps {
                                    let key = dep_to_key(&d);
                                    if dep_keys.insert(key) {
                                        dependencies.push(d);
                                    }
                                }
                            }
                        }
                    }
                }
                InstructionValue::ArrayExpression { elements, loc, .. } => {
                    let mut array_deps: Vec<InferredDependency> = Vec::new();
                    let mut array_keys: FxHashSet<InferredDependencyKey> = FxHashSet::default();
                    let empty_locals = FxHashSet::default();
                    for elem in elements {
                        let place = match elem {
                            ArrayElement::Place(p) => Some(p),
                            ArrayElement::Spread(s) => Some(&s.place),
                            ArrayElement::Hole => None,
                        };
                        if let Some(place) = place {
                            // Visit with empty locals for manual deps
                            visit_candidate_dependency(
                                place,
                                temporaries,
                                &mut array_deps,
                                &mut array_keys,
                                &empty_locals,
                            );
                            // Visit normally
                            visit_candidate_dependency(
                                place,
                                temporaries,
                                &mut dependencies,
                                &mut dep_keys,
                                &locals,
                            );
                        }
                    }
                    temporaries.insert(
                        lvalue_id,
                        Temporary::Aggregate {
                            dependencies: array_deps,
                            loc: *loc,
                        },
                    );
                }
                InstructionValue::CallExpression { callee, args, .. } => {
                    // Check if this is an effect hook call
                    if let Some(cb) = callbacks.as_mut() {
                        let callee_ty = get_identifier_type(callee.identifier, identifiers, types);
                        if is_effect_hook(callee_ty)
                            && !matches!(cb.validate_effect, ExhaustiveEffectDepsMode::Off)
                        {
                            if args.len() >= 2 {
                                let fn_arg = match &args[0] {
                                    PlaceOrSpread::Place(p) => Some(p),
                                    _ => None,
                                };
                                let deps_arg = match &args[1] {
                                    PlaceOrSpread::Place(p) => Some(p),
                                    _ => None,
                                };
                                if let (Some(fn_place), Some(deps_place)) = (fn_arg, deps_arg) {
                                    let fn_deps = temporaries.get(&fn_place.identifier).cloned();
                                    let manual_deps =
                                        temporaries.get(&deps_place.identifier).cloned();
                                    if let (
                                        Some(Temporary::Aggregate {
                                            dependencies: fn_dep_list,
                                            ..
                                        }),
                                        Some(Temporary::Aggregate {
                                            dependencies: manual_dep_list,
                                            loc: manual_loc,
                                        }),
                                    ) = (fn_deps, manual_deps)
                                    {
                                        let effect_report_mode = match &cb.validate_effect {
                                            ExhaustiveEffectDepsMode::All => "all",
                                            ExhaustiveEffectDepsMode::MissingOnly => "missing-only",
                                            ExhaustiveEffectDepsMode::ExtraOnly => "extra-only",
                                            ExhaustiveEffectDepsMode::Off => unreachable!(),
                                        };
                                        // Convert manual deps to ManualMemoDependency format
                                        let manual_memo_deps: Vec<ManualMemoDependency> =
                                            manual_dep_list
                                                .iter()
                                                .map(|dep| match dep {
                                                    InferredDependency::Local {
                                                        identifier,
                                                        path,
                                                        loc,
                                                        ..
                                                    } => ManualMemoDependency {
                                                        root: ManualMemoDependencyRoot::NamedLocal {
                                                            value: Place {
                                                                identifier: *identifier,
                                                                effect:
                                                                    react_compiler_hir::Effect::Read,
                                                                reactive: cb
                                                                    .reactive
                                                                    .contains(identifier),
                                                                loc: *loc,
                                                            },
                                                            constant: false,
                                                        },
                                                        path: path.clone(),
                                                        loc: *loc,
                                                    },
                                                    InferredDependency::Global { binding } => {
                                                        ManualMemoDependency {
                                                            root:
                                                                ManualMemoDependencyRoot::Global {
                                                                    identifier_name: binding
                                                                        .name()
                                                                        .to_string(),
                                                                },
                                                            path: Vec::new(),
                                                            loc: None,
                                                        }
                                                    }
                                                })
                                                .collect();

                                        let diagnostic = validate_dependencies(
                                            fn_dep_list,
                                            &manual_memo_deps,
                                            cb.reactive,
                                            manual_loc,
                                            ErrorCategory::EffectExhaustiveDependencies,
                                            effect_report_mode,
                                            identifiers,
                                            types,
                                        )?;
                                        if let Some(diag) = diagnostic {
                                            cb.diagnostics.push(diag);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Visit all operands except for MethodCall's property
                    for operand in
                        each_instruction_value_operand_with_functions(&instr.value, functions)
                    {
                        visit_candidate_dependency(
                            &operand,
                            temporaries,
                            &mut dependencies,
                            &mut dep_keys,
                            &locals,
                        );
                    }
                }
                InstructionValue::MethodCall {
                    receiver,
                    property,
                    args,
                    ..
                } => {
                    // Check if this is an effect hook call
                    if let Some(cb) = callbacks.as_mut() {
                        let prop_ty = get_identifier_type(property.identifier, identifiers, types);
                        if is_effect_hook(prop_ty)
                            && !matches!(cb.validate_effect, ExhaustiveEffectDepsMode::Off)
                        {
                            if args.len() >= 2 {
                                let fn_arg = match &args[0] {
                                    PlaceOrSpread::Place(p) => Some(p),
                                    _ => None,
                                };
                                let deps_arg = match &args[1] {
                                    PlaceOrSpread::Place(p) => Some(p),
                                    _ => None,
                                };
                                if let (Some(fn_place), Some(deps_place)) = (fn_arg, deps_arg) {
                                    let fn_deps = temporaries.get(&fn_place.identifier).cloned();
                                    let manual_deps =
                                        temporaries.get(&deps_place.identifier).cloned();
                                    if let (
                                        Some(Temporary::Aggregate {
                                            dependencies: fn_dep_list,
                                            ..
                                        }),
                                        Some(Temporary::Aggregate {
                                            dependencies: manual_dep_list,
                                            loc: manual_loc,
                                        }),
                                    ) = (fn_deps, manual_deps)
                                    {
                                        let effect_report_mode = match &cb.validate_effect {
                                            ExhaustiveEffectDepsMode::All => "all",
                                            ExhaustiveEffectDepsMode::MissingOnly => "missing-only",
                                            ExhaustiveEffectDepsMode::ExtraOnly => "extra-only",
                                            ExhaustiveEffectDepsMode::Off => unreachable!(),
                                        };
                                        let manual_memo_deps: Vec<ManualMemoDependency> =
                                            manual_dep_list
                                                .iter()
                                                .map(|dep| match dep {
                                                    InferredDependency::Local {
                                                        identifier,
                                                        path,
                                                        loc,
                                                        ..
                                                    } => ManualMemoDependency {
                                                        root: ManualMemoDependencyRoot::NamedLocal {
                                                            value: Place {
                                                                identifier: *identifier,
                                                                effect:
                                                                    react_compiler_hir::Effect::Read,
                                                                reactive: cb
                                                                    .reactive
                                                                    .contains(identifier),
                                                                loc: *loc,
                                                            },
                                                            constant: false,
                                                        },
                                                        path: path.clone(),
                                                        loc: *loc,
                                                    },
                                                    InferredDependency::Global { binding } => {
                                                        ManualMemoDependency {
                                                            root:
                                                                ManualMemoDependencyRoot::Global {
                                                                    identifier_name: binding
                                                                        .name()
                                                                        .to_string(),
                                                                },
                                                            path: Vec::new(),
                                                            loc: None,
                                                        }
                                                    }
                                                })
                                                .collect();

                                        let diagnostic = validate_dependencies(
                                            fn_dep_list,
                                            &manual_memo_deps,
                                            cb.reactive,
                                            manual_loc,
                                            ErrorCategory::EffectExhaustiveDependencies,
                                            effect_report_mode,
                                            identifiers,
                                            types,
                                        )?;
                                        if let Some(diag) = diagnostic {
                                            cb.diagnostics.push(diag);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Visit operands, skipping the method property itself
                    visit_candidate_dependency(
                        receiver,
                        temporaries,
                        &mut dependencies,
                        &mut dep_keys,
                        &locals,
                    );
                    // Skip property — matches TS behavior
                    for arg in args {
                        let place = match arg {
                            PlaceOrSpread::Place(p) => p,
                            PlaceOrSpread::Spread(s) => &s.place,
                        };
                        visit_candidate_dependency(
                            place,
                            temporaries,
                            &mut dependencies,
                            &mut dep_keys,
                            &locals,
                        );
                    }
                }
                _ => {
                    // Default: visit all operands
                    for operand in
                        each_instruction_value_operand_with_functions(&instr.value, functions)
                    {
                        visit_candidate_dependency(
                            &operand,
                            temporaries,
                            &mut dependencies,
                            &mut dep_keys,
                            &locals,
                        );
                    }
                    // Track lvalues as locals
                    for lv in each_instruction_lvalue_ids(&instr.value, lvalue_id) {
                        locals.insert(lv);
                    }
                }
            }
        }

        // Terminal operands
        for operand in &each_terminal_operand(&block.terminal) {
            if optionals.contains_key(&operand.identifier) {
                continue;
            }
            visit_candidate_dependency(
                operand,
                temporaries,
                &mut dependencies,
                &mut dep_keys,
                &locals,
            );
        }
    }

    Ok(Temporary::Aggregate {
        dependencies,
        loc: None,
    })
}

// =============================================================================
// validateDependencies
// =============================================================================

fn validate_dependencies(
    mut inferred: Vec<InferredDependency>,
    manual_dependencies: &[ManualMemoDependency],
    reactive: &FxHashSet<IdentifierId>,
    manual_memo_loc: Option<SourceLocation>,
    category: ErrorCategory,
    exhaustive_deps_report_mode: &str,
    identifiers: &[Identifier],
    types: &[Type],
) -> Result<Option<CompilerDiagnostic>, CompilerDiagnostic> {
    // Sort dependencies by name and path
    inferred.sort_by(|a, b| {
        match (a, b) {
            (
                InferredDependency::Global { binding: ab },
                InferredDependency::Global { binding: bb },
            ) => ab.name().cmp(bb.name()),
            (
                InferredDependency::Local {
                    identifier: a_id,
                    path: a_path,
                    ..
                },
                InferredDependency::Local {
                    identifier: b_id,
                    path: b_path,
                    ..
                },
            ) => {
                let a_name = get_identifier_name(*a_id, identifiers);
                let b_name = get_identifier_name(*b_id, identifiers);
                match (a_name.as_deref(), b_name.as_deref()) {
                    (Some(an), Some(bn)) => {
                        if *a_id != *b_id {
                            an.cmp(bn)
                        } else if a_path.len() != b_path.len() {
                            a_path.len().cmp(&b_path.len())
                        } else {
                            // Compare path entries
                            for (ap, bp) in a_path.iter().zip(b_path.iter()) {
                                let a_opt = if ap.optional { 0i32 } else { 1 };
                                let b_opt = if bp.optional { 0i32 } else { 1 };
                                if a_opt != b_opt {
                                    return a_opt.cmp(&b_opt);
                                }
                                let prop_cmp =
                                    ap.property.to_string().cmp(&bp.property.to_string());
                                if prop_cmp != std::cmp::Ordering::Equal {
                                    return prop_cmp;
                                }
                            }
                            std::cmp::Ordering::Equal
                        }
                    }
                    _ => std::cmp::Ordering::Equal,
                }
            }
            (
                InferredDependency::Global { binding: ab },
                InferredDependency::Local {
                    identifier: b_id, ..
                },
            ) => {
                let a_name = ab.name();
                let b_name = get_identifier_name(*b_id, identifiers);
                match b_name.as_deref() {
                    Some(bn) => a_name.cmp(bn),
                    None => std::cmp::Ordering::Equal,
                }
            }
            (
                InferredDependency::Local {
                    identifier: a_id, ..
                },
                InferredDependency::Global { binding: bb },
            ) => {
                let a_name = get_identifier_name(*a_id, identifiers);
                let b_name = bb.name();
                match a_name.as_deref() {
                    Some(an) => an.cmp(b_name),
                    None => std::cmp::Ordering::Equal,
                }
            }
        }
    });

    // Remove redundant inferred dependencies
    // retainWhere logic: keep dep[ix] only if no earlier entry is equal or a subpath prefix
    // Mirrors TS: retainWhere(inferred, (dep, ix) => {
    //   const match = inferred.findIndex(prevDep => isEqualTemporary(prevDep, dep) || ...);
    //   return match === -1 || match >= ix;
    // })
    {
        let snapshot = inferred.clone();
        let mut write_index = 0;
        for ix in 0..snapshot.len() {
            let dep = &snapshot[ix];
            let first_match = snapshot.iter().position(|prev_dep| {
                is_equal_temporary(prev_dep, dep)
                    || (matches!(
                        (prev_dep, dep),
                        (
                            InferredDependency::Local { .. },
                            InferredDependency::Local { .. }
                        )
                    ) && {
                        if let (
                            InferredDependency::Local {
                                identifier: prev_id,
                                path: prev_path,
                                ..
                            },
                            InferredDependency::Local {
                                identifier: dep_id,
                                path: dep_path,
                                ..
                            },
                        ) = (prev_dep, dep)
                        {
                            prev_id == dep_id && is_sub_path(prev_path, dep_path)
                        } else {
                            false
                        }
                    })
            });

            let keep = match first_match {
                None => true,
                Some(m) => m >= ix,
            };
            if keep {
                inferred[write_index] = snapshot[ix].clone();
                write_index += 1;
            }
        }
        inferred.truncate(write_index);
    }

    // Validate manual deps
    let mut matched: FxHashSet<usize> = FxHashSet::default(); // indices into manual_dependencies
    let mut missing: Vec<&InferredDependency> = Vec::new();
    let mut extra: Vec<&ManualMemoDependency> = Vec::new();

    for inferred_dep in &inferred {
        match inferred_dep {
            InferredDependency::Global { binding } => {
                for (i, manual_dep) in manual_dependencies.iter().enumerate() {
                    if let ManualMemoDependencyRoot::Global { identifier_name } = &manual_dep.root {
                        if identifier_name == binding.name() {
                            matched.insert(i);
                            extra.push(manual_dep);
                        }
                    }
                }
                continue;
            }
            InferredDependency::Local {
                identifier,
                path,
                loc: _,
                ..
            } => {
                // Skip effect event functions
                let ty = get_identifier_type(*identifier, identifiers, types);
                if is_effect_event_function_type(ty) {
                    continue;
                }

                let mut has_matching = false;
                for (i, manual_dep) in manual_dependencies.iter().enumerate() {
                    if let ManualMemoDependencyRoot::NamedLocal { value, .. } = &manual_dep.root {
                        if value.identifier == *identifier
                            && (are_equal_paths(&manual_dep.path, path)
                                || is_sub_path_ignoring_optionals(&manual_dep.path, path))
                        {
                            has_matching = true;
                            matched.insert(i);
                        }
                    }
                }

                if has_matching || is_optional_dependency(*identifier, reactive, identifiers, types)
                {
                    continue;
                }

                missing.push(inferred_dep);
            }
        }
    }

    // Check for extra dependencies
    for (i, dep) in manual_dependencies.iter().enumerate() {
        if matched.contains(&i) {
            continue;
        }
        if let ManualMemoDependencyRoot::NamedLocal {
            constant, value, ..
        } = &dep.root
        {
            if *constant {
                let dep_ty = get_identifier_type(value.identifier, identifiers, types);
                // Constant-folded primitives: skip
                if !value.reactive && is_primitive_type(dep_ty) {
                    continue;
                }
            }
        }
        extra.push(dep);
    }

    // Filter based on report mode
    let filtered_missing: Vec<&InferredDependency> = if exhaustive_deps_report_mode == "extra-only"
    {
        Vec::new()
    } else {
        missing
    };
    let filtered_extra: Vec<&ManualMemoDependency> =
        if exhaustive_deps_report_mode == "missing-only" {
            Vec::new()
        } else {
            extra
        };

    if filtered_missing.is_empty() && filtered_extra.is_empty() {
        return Ok(None);
    }

    // Build suggestion when we have valid index info (matches TS behavior)
    let suggestion = manual_memo_loc.and_then(|loc| {
        let start_index = loc.start.index?;
        let end_index = loc.end.index?;
        let text = format!(
            "[{}]",
            inferred
                .iter()
                .filter(|dep| {
                    match dep {
                        InferredDependency::Local { identifier, .. } => {
                            let ty = get_identifier_type(*identifier, identifiers, types);
                            !is_optional_dependency(*identifier, reactive, identifiers, types)
                                && !is_effect_event_function_type(ty)
                        }
                        InferredDependency::Global { .. } => false,
                    }
                })
                .map(|dep| print_inferred_dependency(dep, identifiers))
                .collect::<Vec<_>>()
                .join(", ")
        );
        Some(CompilerSuggestion {
            op: CompilerSuggestionOperation::Replace,
            range: (start_index as usize, end_index as usize),
            description: "Update dependencies".to_string(),
            text: Some(text),
        })
    });

    let mut diagnostic = create_diagnostic(
        category,
        &filtered_missing,
        &filtered_extra,
        suggestion,
        identifiers,
    )?;

    // Add detail items for missing deps
    for dep in &filtered_missing {
        if let InferredDependency::Local {
            identifier,
            path: _,
            loc,
            ..
        } = dep
        {
            let mut hint = String::new();
            let ty = get_identifier_type(*identifier, identifiers, types);
            if is_stable_type(ty) {
                hint = ". Refs, setState functions, and other \"stable\" values generally do not need to be added as dependencies, but this variable may change over time to point to different values".to_string();
            }
            let dep_str = print_inferred_dependency(dep, identifiers);
            diagnostic.details.push(CompilerDiagnosticDetail::Error {
                loc: *loc,
                message: Some(format!("Missing dependency `{dep_str}`{hint}")),
                identifier_name: None,
            });
        }
    }

    // Add detail items for extra deps
    for dep in &filtered_extra {
        match &dep.root {
            ManualMemoDependencyRoot::Global { .. } => {
                let dep_str = print_manual_memo_dependency(dep, identifiers);
                diagnostic.details.push(CompilerDiagnosticDetail::Error {
                    loc: dep.loc.or(manual_memo_loc),
                    message: Some(format!(
                        "Unnecessary dependency `{dep_str}`. Values declared outside of a component/hook should not be listed as dependencies as the component will not re-render if they change"
                    )),
                    identifier_name: None,
                });
            }
            ManualMemoDependencyRoot::NamedLocal { value, .. } => {
                // Check if there's a matching inferred dep
                let matching_inferred = inferred.iter().find(|inf_dep| {
                    if let InferredDependency::Local {
                        identifier: inf_id,
                        path: inf_path,
                        ..
                    } = inf_dep
                    {
                        *inf_id == value.identifier
                            && is_sub_path_ignoring_optionals(inf_path, &dep.path)
                    } else {
                        false
                    }
                });

                if let Some(matching) = matching_inferred {
                    if let InferredDependency::Local { identifier, .. } = matching {
                        let matching_ty = get_identifier_type(*identifier, identifiers, types);
                        if is_effect_event_function_type(matching_ty) {
                            let dep_str = print_manual_memo_dependency(dep, identifiers);
                            diagnostic.details.push(CompilerDiagnosticDetail::Error {
                                loc: dep.loc.or(manual_memo_loc),
                                message: Some(format!(
                                    "Functions returned from `useEffectEvent` must not be included in the dependency array. Remove `{dep_str}` from the dependencies."
                                )),
                                identifier_name: None,
                            });
                        } else if !is_optional_dependency_inferred(
                            matching,
                            reactive,
                            identifiers,
                            types,
                        ) {
                            let dep_str = print_manual_memo_dependency(dep, identifiers);
                            let inferred_str = print_inferred_dependency(matching, identifiers);
                            diagnostic.details.push(CompilerDiagnosticDetail::Error {
                                loc: dep.loc.or(manual_memo_loc),
                                message: Some(format!(
                                    "Overly precise dependency `{dep_str}`, use `{inferred_str}` instead"
                                )),
                                identifier_name: None,
                            });
                        } else {
                            let dep_str = print_manual_memo_dependency(dep, identifiers);
                            diagnostic.details.push(CompilerDiagnosticDetail::Error {
                                loc: dep.loc.or(manual_memo_loc),
                                message: Some(format!("Unnecessary dependency `{dep_str}`")),
                                identifier_name: None,
                            });
                        }
                    }
                } else {
                    let dep_str = print_manual_memo_dependency(dep, identifiers);
                    diagnostic.details.push(CompilerDiagnosticDetail::Error {
                        loc: dep.loc.or(manual_memo_loc),
                        message: Some(format!("Unnecessary dependency `{dep_str}`")),
                        identifier_name: None,
                    });
                }
            }
        }
    }

    // Add hint showing inferred dependencies when a suggestion was generated
    // (matches TS: only adds hint when suggestion != null, using suggestion.text)
    if let Some(ref suggestions) = diagnostic.suggestions {
        if let Some(suggestion) = suggestions.first() {
            if let Some(ref text) = suggestion.text {
                diagnostic.details.push(CompilerDiagnosticDetail::Hint {
                    message: format!("Inferred dependencies: `{text}`"),
                });
            }
        }
    }

    Ok(Some(diagnostic))
}

// =============================================================================
// Printing helpers
// =============================================================================

fn print_inferred_dependency(dep: &InferredDependency, identifiers: &[Identifier]) -> String {
    match dep {
        InferredDependency::Global { binding } => binding.name().to_string(),
        InferredDependency::Local {
            identifier, path, ..
        } => {
            let name = get_identifier_name(*identifier, identifiers)
                .unwrap_or_else(|| "<unnamed>".to_string());
            let path_str: String = path
                .iter()
                .map(|p| format!("{}.{}", if p.optional { "?" } else { "" }, p.property))
                .collect();
            format!("{name}{path_str}")
        }
    }
}

fn print_manual_memo_dependency(dep: &ManualMemoDependency, identifiers: &[Identifier]) -> String {
    let name = match &dep.root {
        ManualMemoDependencyRoot::Global { identifier_name } => identifier_name.clone(),
        ManualMemoDependencyRoot::NamedLocal { value, .. } => {
            get_identifier_name(value.identifier, identifiers)
                .unwrap_or_else(|| "<unnamed>".to_string())
        }
    };
    let path_str: String = dep
        .path
        .iter()
        .map(|p| format!("{}.{}", if p.optional { "?" } else { "" }, p.property))
        .collect();
    format!("{name}{path_str}")
}

// =============================================================================
// Optional dependency check
// =============================================================================

fn is_optional_dependency(
    identifier: IdentifierId,
    reactive: &FxHashSet<IdentifierId>,
    identifiers: &[Identifier],
    types: &[Type],
) -> bool {
    if reactive.contains(&identifier) {
        return false;
    }
    let ty = get_identifier_type(identifier, identifiers, types);
    is_stable_type(ty) || is_primitive_type(ty)
}

fn is_optional_dependency_inferred(
    dep: &InferredDependency,
    reactive: &FxHashSet<IdentifierId>,
    identifiers: &[Identifier],
    types: &[Type],
) -> bool {
    match dep {
        InferredDependency::Local { identifier, .. } => {
            is_optional_dependency(*identifier, reactive, identifiers, types)
        }
        InferredDependency::Global { .. } => false,
    }
}

// =============================================================================
// Equality check for temporaries
// =============================================================================

fn is_equal_temporary(a: &InferredDependency, b: &InferredDependency) -> bool {
    match (a, b) {
        (
            InferredDependency::Global { binding: ab },
            InferredDependency::Global { binding: bb },
        ) => ab.name() == bb.name(),
        (
            InferredDependency::Local {
                identifier: a_id,
                path: a_path,
                ..
            },
            InferredDependency::Local {
                identifier: b_id,
                path: b_path,
                ..
            },
        ) => a_id == b_id && are_equal_paths(a_path, b_path),
        _ => false,
    }
}

// =============================================================================
// createDiagnostic
// =============================================================================

fn create_diagnostic(
    category: ErrorCategory,
    missing: &[&InferredDependency],
    extra: &[&ManualMemoDependency],
    suggestion: Option<CompilerSuggestion>,
    _identifiers: &[Identifier],
) -> Result<CompilerDiagnostic, CompilerDiagnostic> {
    let missing_str = if !missing.is_empty() {
        Some("missing")
    } else {
        None
    };
    let extra_str = if !extra.is_empty() {
        Some("extra")
    } else {
        None
    };

    let (reason, description) = match category {
        ErrorCategory::MemoDependencies => {
            let reason_parts: Vec<&str> =
                [missing_str, extra_str].iter().filter_map(|x| *x).collect();
            let reason = format!("Found {} memoization dependencies", reason_parts.join("/"));

            let desc_parts: Vec<&str> = [
                if !missing.is_empty() {
                    Some("Missing dependencies can cause a value to update less often than it should, resulting in stale UI")
                } else {
                    None
                },
                if !extra.is_empty() {
                    Some("Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often")
                } else {
                    None
                },
            ]
            .iter()
            .filter_map(|x| *x)
            .collect();
            let description = desc_parts.join(". ");
            (reason, description)
        }
        ErrorCategory::EffectExhaustiveDependencies => {
            let reason_parts: Vec<&str> =
                [missing_str, extra_str].iter().filter_map(|x| *x).collect();
            let reason = format!("Found {} effect dependencies", reason_parts.join("/"));

            let desc_parts: Vec<&str> = [
                if !missing.is_empty() {
                    Some("Missing dependencies can cause an effect to fire less often than it should")
                } else {
                    None
                },
                if !extra.is_empty() {
                    Some("Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects")
                } else {
                    None
                },
            ]
            .iter()
            .filter_map(|x| *x)
            .collect();
            let description = desc_parts.join(". ");
            (reason, description)
        }
        _ => {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                format!("Unexpected error category: {:?}", category),
                None,
            ));
        }
    };

    Ok(CompilerDiagnostic {
        category,
        reason,
        description: Some(description),
        details: Vec::new(),
        suggestions: suggestion.map(|s| vec![s]),
    })
}

/// Collect lvalue identifier ids from instruction value (for the default branch).
/// Thin wrapper around canonical `each_instruction_value_lvalue` that maps to ids.
fn each_instruction_lvalue_ids(
    value: &InstructionValue,
    lvalue_id: IdentifierId,
) -> Vec<IdentifierId> {
    let mut ids = vec![lvalue_id];
    for place in each_instruction_value_lvalue(value) {
        ids.push(place.identifier);
    }
    ids
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Removes manual memoization using `useMemo` and `useCallback` APIs.
//!
//! For useMemo: replaces `Call useMemo(fn, deps)` with `Call fn()`
//! For useCallback: replaces `Call useCallback(fn, deps)` with `LoadLocal fn`
//!
//! When validation flags are set, inserts `StartMemoize`/`FinishMemoize` markers.
//!
//! Analogous to TS `Inference/DropManualMemoization.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use react_compiler_diagnostics::CompilerDiagnostic;
use react_compiler_diagnostics::CompilerDiagnosticDetail;
use react_compiler_diagnostics::ErrorCategory;
use react_compiler_hir::ArrayElement;
use react_compiler_hir::DependencyPathEntry;
use react_compiler_hir::Effect;
use react_compiler_hir::EvaluationOrder;
use react_compiler_hir::HirFunction;
use react_compiler_hir::IdentifierId;
use react_compiler_hir::IdentifierName;
use react_compiler_hir::Instruction;
use react_compiler_hir::InstructionId;
use react_compiler_hir::InstructionValue;
use react_compiler_hir::ManualMemoDependency;
use react_compiler_hir::ManualMemoDependencyRoot;
use react_compiler_hir::NonLocalBinding;
use react_compiler_hir::Place;
use react_compiler_hir::PlaceOrSpread;
use react_compiler_hir::PropertyLiteral;
use react_compiler_hir::SourceLocation;
use react_compiler_hir::environment::Environment;
use react_compiler_lowering::create_temporary_place;
use react_compiler_lowering::mark_instruction_ids;

// =============================================================================
// Types
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ManualMemoKind {
    UseMemo,
    UseCallback,
}

#[derive(Debug, Clone)]
struct ManualMemoCallee {
    kind: ManualMemoKind,
    /// InstructionId of the LoadGlobal or PropertyLoad that loaded the callee.
    load_instr_id: InstructionId,
}

struct IdentifierSidemap {
    /// Maps identifier id -> InstructionId of FunctionExpression instructions
    functions: HashSet<IdentifierId>,
    /// Maps identifier id -> ManualMemoCallee for useMemo/useCallback callees
    manual_memos: HashMap<IdentifierId, ManualMemoCallee>,
    /// Set of identifier ids that loaded 'React' global
    react: HashSet<IdentifierId>,
    /// Maps identifier id -> deps list info for array expressions
    maybe_deps_lists: HashMap<IdentifierId, MaybeDepsListInfo>,
    /// Maps identifier id -> ManualMemoDependency for dependency tracking
    maybe_deps: HashMap<IdentifierId, ManualMemoDependency>,
    /// Set of identifier ids that are results of optional chains
    optionals: HashSet<IdentifierId>,
}

#[derive(Debug, Clone)]
struct MaybeDepsListInfo {
    loc: Option<SourceLocation>,
    deps: Vec<Place>,
}

struct ExtractedMemoArgs {
    fn_place: Place,
    deps_list: Option<Vec<ManualMemoDependency>>,
    deps_loc: Option<SourceLocation>,
}

// =============================================================================
// Main pass
// =============================================================================

/// Drop manual memoization (useMemo/useCallback calls), replacing them
/// with direct invocations/references.
pub fn drop_manual_memoization(
    func: &mut HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerDiagnostic> {
    let is_validation_enabled = env.validate_preserve_existing_memoization_guarantees
        || env.validate_no_set_state_in_render
        || env.enable_preserve_existing_memoization_guarantees;

    let optionals = find_optional_places(func)?;
    let mut sidemap = IdentifierSidemap {
        functions: HashSet::new(),
        manual_memos: HashMap::new(),
        react: HashSet::new(),
        maybe_deps: HashMap::new(),
        maybe_deps_lists: HashMap::new(),
        optionals,
    };
    let mut next_manual_memo_id: u32 = 0;

    // Phase 1:
    // - Overwrite manual memoization CallExpression/MethodCall
    // - (if validation is enabled) collect manual memoization markers
    //
    // queued_inserts maps InstructionId -> new Instruction to insert after that instruction
    let mut queued_inserts: HashMap<InstructionId, Instruction> = HashMap::new();

    // Collect all block instruction lists up front to avoid borrowing func immutably
    // while needing to mutate it
    let all_block_instructions: Vec<Vec<InstructionId>> = func
        .body
        .blocks
        .values()
        .map(|block| block.instructions.clone())
        .collect();

    for block_instructions in &all_block_instructions {
        for &instr_id in block_instructions {
            let instr = &func.instructions[instr_id.0 as usize];

            // Extract the identifier we need to look up, and whether it's a call/method
            let lookup_id = match &instr.value {
                InstructionValue::CallExpression { callee, .. } => Some(callee.identifier),
                InstructionValue::MethodCall { property, .. } => Some(property.identifier),
                _ => None,
            };

            let manual_memo = lookup_id.and_then(|id| sidemap.manual_memos.get(&id).cloned());

            if let Some(manual_memo) = manual_memo {
                process_manual_memo_call(
                    func,
                    env,
                    instr_id,
                    &manual_memo,
                    &mut sidemap,
                    is_validation_enabled,
                    &mut next_manual_memo_id,
                    &mut queued_inserts,
                );
            } else {
                collect_temporaries(func, env, instr_id, &mut sidemap);
            }
        }
    }

    // Phase 2: Insert manual memoization markers as needed
    if !queued_inserts.is_empty() {
        let mut has_changes = false;
        for block in func.body.blocks.values_mut() {
            let mut next_instructions: Option<Vec<InstructionId>> = None;
            for i in 0..block.instructions.len() {
                let instr_id = block.instructions[i];
                if let Some(insert_instr) = queued_inserts.remove(&instr_id) {
                    if next_instructions.is_none() {
                        next_instructions = Some(block.instructions[..i].to_vec());
                    }
                    let ni = next_instructions.as_mut().unwrap();
                    ni.push(instr_id);
                    // Add the new instruction to the flat table and get its InstructionId
                    let new_instr_id = InstructionId(func.instructions.len() as u32);
                    func.instructions.push(insert_instr);
                    ni.push(new_instr_id);
                } else if let Some(ni) = next_instructions.as_mut() {
                    ni.push(instr_id);
                }
            }
            if let Some(ni) = next_instructions {
                block.instructions = ni;
                has_changes = true;
            }
        }

        if has_changes {
            mark_instruction_ids(&mut func.body, &mut func.instructions);
        }
    }

    Ok(())
}

// =============================================================================
// Phase 1 helpers
// =============================================================================

#[allow(clippy::too_many_arguments)]
fn process_manual_memo_call(
    func: &mut HirFunction,
    env: &mut Environment,
    instr_id: InstructionId,
    manual_memo: &ManualMemoCallee,
    sidemap: &mut IdentifierSidemap,
    is_validation_enabled: bool,
    next_manual_memo_id: &mut u32,
    queued_inserts: &mut HashMap<InstructionId, Instruction>,
) {
    let instr = &func.instructions[instr_id.0 as usize];

    let memo_details = extract_manual_memoization_args(instr, manual_memo.kind, sidemap, env);

    let Some(memo_details) = memo_details else {
        return;
    };

    let ExtractedMemoArgs {
        fn_place,
        deps_list,
        deps_loc,
    } = memo_details;

    let loc = func.instructions[instr_id.0 as usize].value.loc().cloned();

    // Replace the instruction value with the memoization replacement
    let replacement = get_manual_memoization_replacement(&fn_place, loc.clone(), manual_memo.kind);
    func.instructions[instr_id.0 as usize].value = replacement;

    if is_validation_enabled {
        // Bail out when we encounter manual memoization without inline function expressions
        if !sidemap.functions.contains(&fn_place.identifier) {
            let mut diag = CompilerDiagnostic::new(
                ErrorCategory::UseMemo,
                "Expected the first argument to be an inline function expression",
                Some("Expected the first argument to be an inline function expression".to_string()),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: fn_place.loc.clone(),
                message: Some(
                    "Expected the first argument to be an inline function expression".to_string(),
                ),
                identifier_name: None,
            });
            // Match TS behavior: suggestions is [] (empty array), not null
            diag.suggestions = Some(vec![]);
            env.record_diagnostic(diag);
            return;
        }

        let memo_decl: Place = if manual_memo.kind == ManualMemoKind::UseMemo {
            func.instructions[instr_id.0 as usize].lvalue.clone()
        } else {
            Place {
                identifier: fn_place.identifier,
                effect: Effect::Unknown,
                reactive: false,
                loc: fn_place.loc.clone(),
            }
        };

        let manual_memo_id = *next_manual_memo_id;
        *next_manual_memo_id += 1;

        let (start_marker, finish_marker) = make_manual_memoization_markers(
            &fn_place,
            env,
            deps_list,
            deps_loc,
            &memo_decl,
            manual_memo_id,
        );

        queued_inserts.insert(manual_memo.load_instr_id, start_marker);
        queued_inserts.insert(instr_id, finish_marker);
    }
}

fn collect_temporaries(
    func: &HirFunction,
    env: &Environment,
    instr_id: InstructionId,
    sidemap: &mut IdentifierSidemap,
) {
    let instr = &func.instructions[instr_id.0 as usize];
    let lvalue_id = instr.lvalue.identifier;

    match &instr.value {
        InstructionValue::FunctionExpression { .. } => {
            sidemap.functions.insert(lvalue_id);
        }
        InstructionValue::LoadGlobal { binding, .. } => {
            let hook_name = get_hook_detection_name(binding);
            let mut detected = false;
            if let Some(name) = hook_name {
                if name == "useMemo" {
                    sidemap.manual_memos.insert(
                        lvalue_id,
                        ManualMemoCallee {
                            kind: ManualMemoKind::UseMemo,
                            load_instr_id: instr_id,
                        },
                    );
                    detected = true;
                } else if name == "useCallback" {
                    sidemap.manual_memos.insert(
                        lvalue_id,
                        ManualMemoCallee {
                            kind: ManualMemoKind::UseCallback,
                            load_instr_id: instr_id,
                        },
                    );
                    detected = true;
                }
            }
            if !detected && binding.name() == "React" {
                sidemap.react.insert(lvalue_id);
            }
        }
        InstructionValue::PropertyLoad {
            object, property, ..
        } => {
            if sidemap.react.contains(&object.identifier) {
                if let PropertyLiteral::String(prop_name) = property {
                    if prop_name == "useMemo" {
                        sidemap.manual_memos.insert(
                            lvalue_id,
                            ManualMemoCallee {
                                kind: ManualMemoKind::UseMemo,
                                load_instr_id: instr_id,
                            },
                        );
                    } else if prop_name == "useCallback" {
                        sidemap.manual_memos.insert(
                            lvalue_id,
                            ManualMemoCallee {
                                kind: ManualMemoKind::UseCallback,
                                load_instr_id: instr_id,
                            },
                        );
                    }
                }
            }
        }
        InstructionValue::ArrayExpression { elements, .. } => {
            // Check if all elements are Identifier (Place) - no spreads or holes
            let all_places: Option<Vec<Place>> = elements
                .iter()
                .map(|e| match e {
                    ArrayElement::Place(p) => Some(p.clone()),
                    _ => None,
                })
                .collect();

            if let Some(deps) = all_places {
                sidemap.maybe_deps_lists.insert(
                    lvalue_id,
                    MaybeDepsListInfo {
                        loc: instr.value.loc().cloned(),
                        deps,
                    },
                );
            }
        }
        _ => {}
    }

    let is_optional = sidemap.optionals.contains(&lvalue_id);
    let maybe_dep =
        collect_maybe_memo_dependencies(&instr.value, &sidemap.maybe_deps, is_optional, env);
    if let Some(dep) = maybe_dep {
        // For StoreLocal, also insert under the StoreLocal's lvalue place identifier,
        // matching the TS behavior where collectMaybeMemoDependencies inserts into
        // maybeDeps directly for StoreLocal's target variable.
        if let InstructionValue::StoreLocal { lvalue, .. } = &instr.value {
            sidemap
                .maybe_deps
                .insert(lvalue.place.identifier, dep.clone());
        }
        sidemap.maybe_deps.insert(lvalue_id, dep);
    }
}

// =============================================================================
// collectMaybeMemoDependencies
// =============================================================================

/// Collect loads from named variables and property reads into `maybe_deps`.
/// Returns the variable + property reads represented by the instruction value.
pub fn collect_maybe_memo_dependencies(
    value: &InstructionValue,
    maybe_deps: &HashMap<IdentifierId, ManualMemoDependency>,
    optional: bool,
    env: &Environment,
) -> Option<ManualMemoDependency> {
    match value {
        InstructionValue::LoadGlobal { binding, loc, .. } => Some(ManualMemoDependency {
            root: ManualMemoDependencyRoot::Global {
                identifier_name: binding.name().to_string(),
            },
            path: vec![],
            loc: loc.clone(),
        }),
        InstructionValue::PropertyLoad {
            object,
            property,
            loc,
            ..
        } => {
            if let Some(object_dep) = maybe_deps.get(&object.identifier) {
                Some(ManualMemoDependency {
                    root: object_dep.root.clone(),
                    path: {
                        let mut path = object_dep.path.clone();
                        path.push(DependencyPathEntry {
                            property: property.clone(),
                            optional,
                            loc: loc.clone(),
                        });
                        path
                    },
                    loc: loc.clone(),
                })
            } else {
                None
            }
        }
        InstructionValue::LoadLocal { place, .. } | InstructionValue::LoadContext { place, .. } => {
            if let Some(source) = maybe_deps.get(&place.identifier) {
                Some(source.clone())
            } else if matches!(
                &env.identifiers[place.identifier.0 as usize].name,
                Some(IdentifierName::Named(_))
            ) {
                Some(ManualMemoDependency {
                    root: ManualMemoDependencyRoot::NamedLocal {
                        value: place.clone(),
                        constant: false,
                    },
                    path: vec![],
                    loc: place.loc.clone(),
                })
            } else {
                None
            }
        }
        InstructionValue::StoreLocal {
            lvalue, value: val, ..
        } => {
            // Value blocks rely on StoreLocal to populate their return value.
            // We need to track these as optional property chains are valid in
            // source depslists
            let lvalue_id = lvalue.place.identifier;
            let rvalue_id = val.identifier;
            if let Some(aliased) = maybe_deps.get(&rvalue_id) {
                let lvalue_name = &env.identifiers[lvalue_id.0 as usize].name;
                if !matches!(lvalue_name, Some(IdentifierName::Named(_))) {
                    // Note: we can't insert into maybe_deps here since we only have
                    // a shared reference. The caller handles insertion.
                    return Some(aliased.clone());
                }
            }
            None
        }
        _ => None,
    }
}

// =============================================================================
// Replacement helpers
// =============================================================================

fn get_manual_memoization_replacement(
    fn_place: &Place,
    loc: Option<SourceLocation>,
    kind: ManualMemoKind,
) -> InstructionValue {
    if kind == ManualMemoKind::UseMemo {
        // Replace with Call fn() - invoke the memo function directly
        InstructionValue::CallExpression {
            callee: fn_place.clone(),
            args: vec![],
            loc,
        }
    } else {
        // Replace with LoadLocal fn - just reference the function
        InstructionValue::LoadLocal {
            place: Place {
                identifier: fn_place.identifier,
                effect: Effect::Unknown,
                reactive: false,
                loc: loc.clone(),
            },
            loc,
        }
    }
}

fn make_manual_memoization_markers(
    fn_expr: &Place,
    env: &mut Environment,
    deps_list: Option<Vec<ManualMemoDependency>>,
    deps_loc: Option<SourceLocation>,
    memo_decl: &Place,
    manual_memo_id: u32,
) -> (Instruction, Instruction) {
    let start = Instruction {
        id: EvaluationOrder(0),
        lvalue: create_temporary_place(env, fn_expr.loc.clone()),
        value: InstructionValue::StartMemoize {
            manual_memo_id,
            deps: deps_list,
            deps_loc: Some(deps_loc),
            has_invalid_deps: false,
            loc: fn_expr.loc.clone(),
        },
        loc: fn_expr.loc.clone(),
        effects: None,
    };
    let finish = Instruction {
        id: EvaluationOrder(0),
        lvalue: create_temporary_place(env, fn_expr.loc.clone()),
        value: InstructionValue::FinishMemoize {
            manual_memo_id,
            decl: memo_decl.clone(),
            pruned: false,
            loc: fn_expr.loc.clone(),
        },
        loc: fn_expr.loc.clone(),
        effects: None,
    };
    (start, finish)
}

fn extract_manual_memoization_args(
    instr: &Instruction,
    kind: ManualMemoKind,
    sidemap: &IdentifierSidemap,
    env: &mut Environment,
) -> Option<ExtractedMemoArgs> {
    let args: &[PlaceOrSpread] = match &instr.value {
        InstructionValue::CallExpression { args, .. } => args,
        InstructionValue::MethodCall { args, .. } => args,
        _ => return None,
    };

    let kind_name = match kind {
        ManualMemoKind::UseMemo => "useMemo",
        ManualMemoKind::UseCallback => "useCallback",
    };

    // Get the first arg (fn)
    let fn_place = match args.first() {
        Some(PlaceOrSpread::Place(p)) => p.clone(),
        _ => {
            let loc = instr.value.loc().cloned();
            env.record_diagnostic(
                CompilerDiagnostic::new(
                    ErrorCategory::UseMemo,
                    format!("Expected a callback function to be passed to {kind_name}"),
                    Some(if kind == ManualMemoKind::UseCallback {
                        "The first argument to useCallback() must be a function to cache".to_string()
                    } else {
                        "The first argument to useMemo() must be a function that calculates a result to cache".to_string()
                    }),
                )
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc,
                    message: Some(if kind == ManualMemoKind::UseCallback {
                        "Expected a callback function".to_string()
                    } else {
                        "Expected a memoization function".to_string()
                    }),
                    identifier_name: None,
                }),
            );
            return None;
        }
    };

    // Get the second arg (deps list), if present
    let deps_list_place = args.get(1);
    if deps_list_place.is_none() {
        return Some(ExtractedMemoArgs {
            fn_place,
            deps_list: None,
            deps_loc: None,
        });
    }

    let deps_list_id = match deps_list_place {
        Some(PlaceOrSpread::Place(p)) => Some(p.identifier),
        _ => None,
    };

    let maybe_deps_list = deps_list_id.and_then(|id| sidemap.maybe_deps_lists.get(&id));

    if maybe_deps_list.is_none() {
        let loc = match deps_list_place {
            Some(PlaceOrSpread::Place(p)) => p.loc.clone(),
            _ => instr.loc.clone(),
        };
        env.record_diagnostic(
            CompilerDiagnostic::new(
                ErrorCategory::UseMemo,
                format!("Expected the dependency list for {kind_name} to be an array literal"),
                Some(format!(
                    "Expected the dependency list for {kind_name} to be an array literal"
                )),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc,
                message: Some(format!(
                    "Expected the dependency list for {kind_name} to be an array literal"
                )),
                identifier_name: None,
            }),
        );
        return None;
    }

    let deps_info = maybe_deps_list.unwrap();
    let mut deps_list: Vec<ManualMemoDependency> = Vec::new();
    for dep in &deps_info.deps {
        let maybe_dep = sidemap.maybe_deps.get(&dep.identifier);
        if let Some(d) = maybe_dep {
            deps_list.push(d.clone());
        } else {
            env.record_diagnostic(
                CompilerDiagnostic::new(
                    ErrorCategory::UseMemo,
                    "Expected the dependency list to be an array of simple expressions (e.g. `x`, `x.y.z`, `x?.y?.z`)",
                    Some("Expected the dependency list to be an array of simple expressions (e.g. `x`, `x.y.z`, `x?.y?.z`)".to_string()),
                )
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc: dep.loc.clone(),
                    message: Some("Expected the dependency list to be an array of simple expressions (e.g. `x`, `x.y.z`, `x?.y?.z`)".to_string()),
                    identifier_name: None,
                }),
            );
        }
    }

    Some(ExtractedMemoArgs {
        fn_place,
        deps_list: Some(deps_list),
        deps_loc: deps_info.loc.clone(),
    })
}

// =============================================================================
// findOptionalPlaces
// =============================================================================

fn find_optional_places(func: &HirFunction) -> Result<HashSet<IdentifierId>, CompilerDiagnostic> {
    use react_compiler_hir::Terminal;

    let mut optionals = HashSet::new();
    for block in func.body.blocks.values() {
        if let Terminal::Optional {
            optional: true,
            test,
            fallthrough,
            ..
        } = &block.terminal
        {
            let optional_fallthrough = *fallthrough;
            let mut test_block_id = *test;
            loop {
                let test_block = &func.body.blocks[&test_block_id];
                match &test_block.terminal {
                    Terminal::Branch {
                        consequent,
                        fallthrough,
                        ..
                    } => {
                        if *fallthrough == optional_fallthrough {
                            // Found it
                            let consequent_block = &func.body.blocks[consequent];
                            if let Some(&last_instr_id) = consequent_block.instructions.last() {
                                let last_instr = &func.instructions[last_instr_id.0 as usize];
                                if let InstructionValue::StoreLocal { value, .. } =
                                    &last_instr.value
                                {
                                    optionals.insert(value.identifier);
                                }
                            }
                            break;
                        } else {
                            test_block_id = *fallthrough;
                        }
                    }
                    Terminal::Optional { fallthrough, .. }
                    | Terminal::Logical { fallthrough, .. }
                    | Terminal::Sequence { fallthrough, .. }
                    | Terminal::Ternary { fallthrough, .. } => {
                        test_block_id = *fallthrough;
                    }
                    Terminal::MaybeThrow { continuation, .. } => {
                        test_block_id = *continuation;
                    }
                    other => {
                        // Invariant: unexpected terminal in optional
                        // In TS this throws CompilerError.invariant
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            format!(
                                "Unexpected terminal kind in optional: {:?}",
                                std::mem::discriminant(other)
                            ),
                            None,
                        ));
                    }
                }
            }
        }
    }
    Ok(optionals)
}

fn is_known_react_module(module: &str) -> bool {
    let lower = module.to_lowercase();
    lower == "react" || lower == "react-dom"
}

/// Returns the name to use for useMemo/useCallback detection, matching the TS
/// behavior of `getGlobalDeclaration` + `getHookKindForType`.
///
/// - `Global`: use the binding name (matches globals.get(name) in TS)
/// - `ImportSpecifier` from known React module: use the `imported` name
/// - `ImportSpecifier` from unknown module: return None (TS returns a generic
///   custom hook type with hookKind 'Custom', not 'useMemo'/'useCallback')
/// - `ModuleLocal`: return None (same reason as above)
/// - `ImportDefault`/`ImportNamespace` from known React module: use the local name
/// - `ImportDefault`/`ImportNamespace` from unknown module: return None
fn get_hook_detection_name(binding: &NonLocalBinding) -> Option<&str> {
    match binding {
        NonLocalBinding::Global { name } => Some(name.as_str()),
        NonLocalBinding::ImportSpecifier {
            imported, module, ..
        } => {
            if is_known_react_module(module) {
                Some(imported.as_str())
            } else {
                None
            }
        }
        NonLocalBinding::ImportDefault { name, module }
        | NonLocalBinding::ImportNamespace { name, module } => {
            if is_known_react_module(module) {
                Some(name.as_str())
            } else {
                None
            }
        }
        NonLocalBinding::ModuleLocal { .. } => None,
    }
}

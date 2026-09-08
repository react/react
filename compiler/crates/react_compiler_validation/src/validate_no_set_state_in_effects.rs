// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Validates against calling setState in the body of an effect (useEffect and friends),
//! while allowing calling setState in callbacks scheduled by the effect.
//!
//! Calling setState during execution of a useEffect triggers a re-render, which is
//! often bad for performance and frequently has more efficient and straightforward
//! alternatives. See https://react.dev/learn/you-might-not-need-an-effect for examples.
//!
//! Port of ValidateNoSetStateInEffects.ts.

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, CompilerError, ErrorCategory,
};
use react_compiler_hir::dominator::{compute_post_dominator_tree, post_dominator_frontier};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{
    BlockId, HirFunction, Identifier, IdentifierId, IdentifierName, InstructionValue,
    PlaceOrSpread, PropertyLiteral, SourceLocation, Terminal, Type, is_ref_value_type,
    is_set_state_type, is_use_effect_event_type, is_use_effect_hook_type,
    is_use_insertion_effect_hook_type, is_use_layout_effect_hook_type, is_use_ref_type, visitors,
};

pub fn validate_no_set_state_in_effects(
    func: &HirFunction,
    env: &Environment,
) -> Result<CompilerError, CompilerDiagnostic> {
    let identifiers = &env.identifiers;
    let types = &env.types;
    let functions = &env.functions;
    let enable_verbose = env.config.enable_verbose_no_set_state_in_effect;
    let enable_allow_set_state_from_refs = env.config.enable_allow_set_state_from_refs_in_effects;

    // Map from IdentifierId to the Place where the setState originated
    let mut set_state_functions: FxHashMap<IdentifierId, SetStateInfo> = FxHashMap::default();
    let mut errors = CompilerError::new();

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::LoadLocal { place, .. } => {
                    if set_state_functions.contains_key(&place.identifier) {
                        let info = set_state_functions[&place.identifier].clone();
                        set_state_functions.insert(instr.lvalue.identifier, info);
                    }
                }
                InstructionValue::StoreLocal { lvalue, value, .. } => {
                    if set_state_functions.contains_key(&value.identifier) {
                        let info = set_state_functions[&value.identifier].clone();
                        set_state_functions.insert(lvalue.place.identifier, info.clone());
                        set_state_functions.insert(instr.lvalue.identifier, info);
                    }
                }
                InstructionValue::FunctionExpression { lowered_func, .. } => {
                    // Check if any context capture references a setState
                    let inner_func = &functions[lowered_func.func.0 as usize];
                    let has_set_state_operand = inner_func.context.iter().any(|ctx_place| {
                        is_set_state_type_by_id(ctx_place.identifier, identifiers, types)
                            || set_state_functions.contains_key(&ctx_place.identifier)
                    });

                    if has_set_state_operand {
                        let callee = get_set_state_call(
                            inner_func,
                            &mut set_state_functions,
                            identifiers,
                            types,
                            functions,
                            enable_allow_set_state_from_refs,
                            env.next_block_id_counter,
                            env.code.as_deref(),
                        )?;
                        if let Some(info) = callee {
                            set_state_functions.insert(instr.lvalue.identifier, info);
                        }
                    }
                }
                InstructionValue::MethodCall { property, args, .. } => {
                    let prop_type =
                        &types[identifiers[property.identifier.0 as usize].type_.0 as usize];
                    if is_use_effect_event_type(prop_type) {
                        if let Some(first_arg) = args.first() {
                            if let PlaceOrSpread::Place(arg_place) = first_arg {
                                if let Some(info) = set_state_functions.get(&arg_place.identifier) {
                                    set_state_functions
                                        .insert(instr.lvalue.identifier, info.clone());
                                }
                            }
                        }
                    } else if is_use_effect_hook_type(prop_type)
                        || is_use_layout_effect_hook_type(prop_type)
                        || is_use_insertion_effect_hook_type(prop_type)
                    {
                        if let Some(first_arg) = args.first() {
                            if let PlaceOrSpread::Place(arg_place) = first_arg {
                                if let Some(info) = set_state_functions.get(&arg_place.identifier) {
                                    push_error(&mut errors, info, enable_verbose);
                                }
                            }
                        }
                    }
                }
                InstructionValue::CallExpression { callee, args, .. } => {
                    let callee_type =
                        &types[identifiers[callee.identifier.0 as usize].type_.0 as usize];
                    if is_use_effect_event_type(callee_type) {
                        if let Some(first_arg) = args.first() {
                            if let PlaceOrSpread::Place(arg_place) = first_arg {
                                if let Some(info) = set_state_functions.get(&arg_place.identifier) {
                                    set_state_functions
                                        .insert(instr.lvalue.identifier, info.clone());
                                }
                            }
                        }
                    } else if is_use_effect_hook_type(callee_type)
                        || is_use_layout_effect_hook_type(callee_type)
                        || is_use_insertion_effect_hook_type(callee_type)
                    {
                        if let Some(first_arg) = args.first() {
                            if let PlaceOrSpread::Place(arg_place) = first_arg {
                                if let Some(info) = set_state_functions.get(&arg_place.identifier) {
                                    push_error(&mut errors, info, enable_verbose);
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    Ok(errors)
}

#[derive(Debug, Clone)]
struct SetStateInfo {
    loc: Option<SourceLocation>,
    identifier_name: Option<String>,
}

/// Get the user-visible name for an identifier, matching Babel's
/// loc.identifierName behavior. First checks the identifier's own name,
/// then falls back to extracting the name from the source code at the
/// given source location (the callee's loc). This handles SSA identifiers
/// whose names were lost during compiler passes.
fn get_identifier_name_with_loc(
    id: IdentifierId,
    identifiers: &[Identifier],
    loc: &Option<SourceLocation>,
    source_code: Option<&str>,
) -> Option<String> {
    let ident = &identifiers[id.0 as usize];
    if let Some(IdentifierName::Named(name)) = &ident.name {
        return Some(name.clone());
    }
    // Fall back to extracting from source code
    if let (Some(loc), Some(code)) = (loc, source_code) {
        let start_idx = loc.start.index? as usize;
        let end_idx = loc.end.index? as usize;
        if start_idx < code.len() && end_idx <= code.len() && start_idx < end_idx {
            let slice = &code[start_idx..end_idx];
            if !slice.is_empty()
                && slice
                    .chars()
                    .all(|c| c.is_alphanumeric() || c == '_' || c == '$')
            {
                return Some(slice.to_string());
            }
        }
    }
    None
}

fn is_set_state_type_by_id(
    identifier_id: IdentifierId,
    identifiers: &[Identifier],
    types: &[Type],
) -> bool {
    let ident = &identifiers[identifier_id.0 as usize];
    let ty = &types[ident.type_.0 as usize];
    is_set_state_type(ty)
}

fn push_error(errors: &mut CompilerError, info: &SetStateInfo, enable_verbose: bool) {
    if enable_verbose {
        errors.push_diagnostic(
            CompilerDiagnostic::new(
                ErrorCategory::EffectSetState,
                "Calling setState synchronously within an effect can trigger cascading renders",
                Some(
                    "Effects are intended to synchronize state between React and external systems. \
                     Calling setState synchronously causes cascading renders that hurt performance.\n\n\
                     This pattern may indicate one of several issues:\n\n\
                     **1. Non-local derived data**: If the value being set could be computed from props/state \
                     but requires data from a parent component, consider restructuring state ownership so the \
                     derivation can happen during render in the component that owns the relevant state.\n\n\
                     **2. Derived event pattern**: If you're detecting when a prop changes (e.g., `isPlaying` \
                     transitioning from false to true), this often indicates the parent should provide an event \
                     callback (like `onPlay`) instead of just the current state. Request access to the original event.\n\n\
                     **3. Force update / external sync**: If you're forcing a re-render to sync with an external \
                     data source (mutable values outside React), use `useSyncExternalStore` to properly subscribe \
                     to external state changes.\n\n\
                     See: https://react.dev/learn/you-might-not-need-an-effect".to_string(),
                ),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: info.loc,
                message: Some(
                    "Avoid calling setState() directly within an effect".to_string(),
                ),
                identifier_name: info.identifier_name.clone(),
            }),
        );
    } else {
        errors.push_diagnostic(
            CompilerDiagnostic::new(
                ErrorCategory::EffectSetState,
                "Calling setState synchronously within an effect can trigger cascading renders",
                Some(
                    "Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. \
                     In general, the body of an effect should do one or both of the following:\n\
                     * Update external systems with the latest state from React.\n\
                     * Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\n\
                     Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. \
                     (https://react.dev/learn/you-might-not-need-an-effect)".to_string(),
                ),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: info.loc,
                message: Some(
                    "Avoid calling setState() directly within an effect".to_string(),
                ),
                identifier_name: info.identifier_name.clone(),
            }),
        );
    }
}

/// Recursively collect all Place identifiers from a destructure pattern.
fn collect_destructure_places(
    pattern: &react_compiler_hir::Pattern,
    ref_derived_values: &mut FxHashSet<IdentifierId>,
) {
    match pattern {
        react_compiler_hir::Pattern::Array(arr) => {
            for item in &arr.items {
                match item {
                    react_compiler_hir::ArrayPatternElement::Place(p) => {
                        ref_derived_values.insert(p.identifier);
                    }
                    react_compiler_hir::ArrayPatternElement::Spread(s) => {
                        ref_derived_values.insert(s.place.identifier);
                    }
                    react_compiler_hir::ArrayPatternElement::Hole => {}
                }
            }
        }
        react_compiler_hir::Pattern::Object(obj) => {
            for prop in &obj.properties {
                match prop {
                    react_compiler_hir::ObjectPropertyOrSpread::Property(p) => {
                        ref_derived_values.insert(p.place.identifier);
                    }
                    react_compiler_hir::ObjectPropertyOrSpread::Spread(s) => {
                        ref_derived_values.insert(s.place.identifier);
                    }
                }
            }
        }
    }
}

fn is_derived_from_ref(
    id: IdentifierId,
    ref_derived_values: &FxHashSet<IdentifierId>,
    identifiers: &[Identifier],
    types: &[Type],
) -> bool {
    if ref_derived_values.contains(&id) {
        return true;
    }
    let ident = &identifiers[id.0 as usize];
    let ty = &types[ident.type_.0 as usize];
    is_use_ref_type(ty) || is_ref_value_type(ty)
}

/// Collects all operand IdentifierIds from an instruction value.
/// Uses the canonical `each_instruction_value_operand_with_functions` from visitors.
fn collect_operands(value: &InstructionValue, functions: &[HirFunction]) -> Vec<IdentifierId> {
    visitors::each_instruction_value_operand_with_functions(value, functions)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

/// Creates a function that checks whether a block is "control-dominated" by
/// a ref-derived condition. A block is ref-controlled if its post-dominator
/// frontier contains a block whose terminal tests a ref-derived value.
fn create_ref_controlled_block_checker(
    func: &HirFunction,
    next_block_id_counter: u32,
    ref_derived_values: &FxHashSet<IdentifierId>,
    identifiers: &[Identifier],
    types: &[Type],
) -> Result<FxHashMap<BlockId, bool>, CompilerDiagnostic> {
    let post_dominators = compute_post_dominator_tree(func, next_block_id_counter, false)?;
    let mut cache: FxHashMap<BlockId, bool> = FxHashMap::default();

    for (block_id, _block) in &func.body.blocks {
        let frontier = post_dominator_frontier(func, &post_dominators, *block_id);
        let mut is_controlled = false;

        for frontier_block_id in &frontier {
            let control_block = &func.body.blocks[frontier_block_id];
            match &control_block.terminal {
                Terminal::If { test, .. } | Terminal::Branch { test, .. } => {
                    if is_derived_from_ref(test.identifier, ref_derived_values, identifiers, types)
                    {
                        is_controlled = true;
                        break;
                    }
                }
                Terminal::Switch { test, cases, .. } => {
                    if is_derived_from_ref(test.identifier, ref_derived_values, identifiers, types)
                    {
                        is_controlled = true;
                        break;
                    }
                    for case in cases {
                        if let Some(case_test) = &case.test {
                            if is_derived_from_ref(
                                case_test.identifier,
                                ref_derived_values,
                                identifiers,
                                types,
                            ) {
                                is_controlled = true;
                                break;
                            }
                        }
                    }
                    if is_controlled {
                        break;
                    }
                }
                _ => {}
            }
        }

        cache.insert(*block_id, is_controlled);
    }

    Ok(cache)
}

/// Checks inner function body for direct setState calls. Returns the callee Place info
/// if a setState call is found in the function body.
/// Tracks ref-derived values to allow setState when the value being set comes from a ref.
fn get_set_state_call(
    func: &HirFunction,
    set_state_functions: &mut FxHashMap<IdentifierId, SetStateInfo>,
    identifiers: &[Identifier],
    types: &[Type],
    functions: &[HirFunction],
    enable_allow_set_state_from_refs: bool,
    next_block_id_counter: u32,
    source_code: Option<&str>,
) -> Result<Option<SetStateInfo>, CompilerDiagnostic> {
    let mut ref_derived_values: FxHashSet<IdentifierId> = FxHashSet::default();

    // First pass: collect ref-derived values (needed before building control dominator checker)
    // We do a pre-pass to seed ref_derived_values so the control dominator checker has them.
    if enable_allow_set_state_from_refs {
        for (_block_id, block) in &func.body.blocks {
            for phi in &block.phis {
                let is_phi_derived = phi.operands.values().any(|operand| {
                    is_derived_from_ref(operand.identifier, &ref_derived_values, identifiers, types)
                });
                if is_phi_derived {
                    ref_derived_values.insert(phi.place.identifier);
                }
            }

            for &instr_id in &block.instructions {
                let instr = &func.instructions[instr_id.0 as usize];

                let operands = collect_operands(&instr.value, functions);
                let has_ref_operand = operands.iter().any(|op_id| {
                    is_derived_from_ref(*op_id, &ref_derived_values, identifiers, types)
                });

                if has_ref_operand {
                    ref_derived_values.insert(instr.lvalue.identifier);
                    if let InstructionValue::Destructure { lvalue, .. } = &instr.value {
                        collect_destructure_places(&lvalue.pattern, &mut ref_derived_values);
                    }
                    if let InstructionValue::StoreLocal { lvalue, .. } = &instr.value {
                        ref_derived_values.insert(lvalue.place.identifier);
                    }
                }

                if let InstructionValue::PropertyLoad {
                    object, property, ..
                } = &instr.value
                {
                    if *property == PropertyLiteral::String("current".to_string()) {
                        let obj_ident = &identifiers[object.identifier.0 as usize];
                        let obj_ty = &types[obj_ident.type_.0 as usize];
                        if is_use_ref_type(obj_ty) || is_ref_value_type(obj_ty) {
                            ref_derived_values.insert(instr.lvalue.identifier);
                        }
                    }
                }
            }
        }
    }

    // Build control dominator checker after collecting ref-derived values
    let ref_controlled_blocks = if enable_allow_set_state_from_refs {
        create_ref_controlled_block_checker(
            func,
            next_block_id_counter,
            &ref_derived_values,
            identifiers,
            types,
        )?
    } else {
        FxHashMap::default()
    };

    let is_ref_controlled_block = |block_id: BlockId| -> bool {
        ref_controlled_blocks
            .get(&block_id)
            .copied()
            .unwrap_or(false)
    };

    // Reset and redo: second pass with control dominator info available
    ref_derived_values.clear();

    for (_block_id, block) in &func.body.blocks {
        // Track ref-derived values through phis
        if enable_allow_set_state_from_refs {
            for phi in &block.phis {
                if is_derived_from_ref(
                    phi.place.identifier,
                    &ref_derived_values,
                    identifiers,
                    types,
                ) {
                    continue;
                }
                let is_phi_derived = phi.operands.values().any(|operand| {
                    is_derived_from_ref(operand.identifier, &ref_derived_values, identifiers, types)
                });
                if is_phi_derived {
                    ref_derived_values.insert(phi.place.identifier);
                } else {
                    // Fallback: check if any predecessor block is ref-controlled
                    let mut found = false;
                    for pred in phi.operands.keys() {
                        if is_ref_controlled_block(*pred) {
                            ref_derived_values.insert(phi.place.identifier);
                            found = true;
                            break;
                        }
                    }
                    if found {
                        continue;
                    }
                }
            }
        }

        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];

            // Track ref-derived values through instructions
            if enable_allow_set_state_from_refs {
                let operands = collect_operands(&instr.value, functions);
                let has_ref_operand = operands.iter().any(|op_id| {
                    is_derived_from_ref(*op_id, &ref_derived_values, identifiers, types)
                });

                if has_ref_operand {
                    ref_derived_values.insert(instr.lvalue.identifier);
                    // For Destructure, also mark all pattern places as ref-derived
                    if let InstructionValue::Destructure { lvalue, .. } = &instr.value {
                        collect_destructure_places(&lvalue.pattern, &mut ref_derived_values);
                    }
                    // For StoreLocal, propagate to the local variable
                    if let InstructionValue::StoreLocal { lvalue, .. } = &instr.value {
                        ref_derived_values.insert(lvalue.place.identifier);
                    }
                }

                // Special case: PropertyLoad of .current on ref/refValue
                if let InstructionValue::PropertyLoad {
                    object, property, ..
                } = &instr.value
                {
                    if *property == PropertyLiteral::String("current".to_string()) {
                        let obj_ident = &identifiers[object.identifier.0 as usize];
                        let obj_ty = &types[obj_ident.type_.0 as usize];
                        if is_use_ref_type(obj_ty) || is_ref_value_type(obj_ty) {
                            ref_derived_values.insert(instr.lvalue.identifier);
                        }
                    }
                }
            }

            match &instr.value {
                InstructionValue::LoadLocal { place, .. } => {
                    if set_state_functions.contains_key(&place.identifier) {
                        let info = set_state_functions[&place.identifier].clone();
                        set_state_functions.insert(instr.lvalue.identifier, info);
                    }
                }
                InstructionValue::StoreLocal { lvalue, value, .. } => {
                    if set_state_functions.contains_key(&value.identifier) {
                        let info = set_state_functions[&value.identifier].clone();
                        set_state_functions.insert(lvalue.place.identifier, info.clone());
                        set_state_functions.insert(instr.lvalue.identifier, info);
                    }
                }
                InstructionValue::CallExpression { callee, args, .. } => {
                    if is_set_state_type_by_id(callee.identifier, identifiers, types)
                        || set_state_functions.contains_key(&callee.identifier)
                    {
                        if enable_allow_set_state_from_refs {
                            // Check if the first argument is ref-derived
                            if let Some(first_arg) = args.first() {
                                if let PlaceOrSpread::Place(arg_place) = first_arg {
                                    if is_derived_from_ref(
                                        arg_place.identifier,
                                        &ref_derived_values,
                                        identifiers,
                                        types,
                                    ) {
                                        // Allow setState when value is derived from ref
                                        return Ok(None);
                                    }
                                }
                            }
                            // Check if the current block is controlled by a ref-derived condition
                            if is_ref_controlled_block(block.id) {
                                continue;
                            }
                        }
                        // Get the user-visible identifier name, matching Babel's
                        // loc.identifierName behavior. Uses declaration_id to find
                        // the original named identifier when SSA creates unnamed copies.
                        let callee_name = get_identifier_name_with_loc(
                            callee.identifier,
                            identifiers,
                            &callee.loc,
                            source_code,
                        );
                        return Ok(Some(SetStateInfo {
                            loc: callee.loc,
                            identifier_name: callee_name,
                        }));
                    }
                }
                _ => {}
            }
        }
    }
    Ok(None)
}

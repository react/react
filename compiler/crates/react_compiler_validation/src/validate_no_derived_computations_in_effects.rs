// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Validates that useEffect is not used for derived computations which could/should
//! be performed in render.
//!
//! See https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
//!
//! Port of ValidateNoDerivedComputationsInEffects_exp.ts.

use indexmap::{IndexMap, IndexSet};
use rustc_hash::{FxBuildHasher, FxHashMap, FxHashSet};

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, CompilerError, CompilerErrorDetail, ErrorCategory,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::{
    each_instruction_lvalue_ids, each_instruction_operand as canonical_each_instruction_operand,
};
use react_compiler_hir::{
    ArrayElement, BlockId, Effect, EvaluationOrder, FunctionId, HirFunction, Identifier,
    IdentifierId, IdentifierName, InstructionValue, ParamPattern, PlaceOrSpread, ReactFunctionType,
    ReturnVariant, SourceLocation, Type, is_set_state_type, is_use_effect_hook_type,
    is_use_ref_type, is_use_state_type,
};

/// Get the user-visible name for an identifier, matching Babel's
/// loc.identifierName behavior. First checks the identifier's own name,
/// then falls back to extracting the name from the source code at the
/// given source location. This handles SSA identifiers whose names were
/// lost during compiler passes.
fn get_identifier_name_with_loc(
    id: IdentifierId,
    identifiers: &[Identifier],
    loc: &Option<SourceLocation>,
    source_code: Option<&str>,
) -> Option<String> {
    let ident = &identifiers[id.0 as usize];
    match &ident.name {
        Some(IdentifierName::Named(name)) | Some(IdentifierName::Promoted(name)) => {
            return Some(name.clone());
        }
        _ => {}
    }
    // Fall back: find another identifier with the same declaration_id that has a name.
    let decl_id = ident.declaration_id;
    for other in identifiers {
        if other.declaration_id == decl_id {
            match &other.name {
                Some(IdentifierName::Named(name)) | Some(IdentifierName::Promoted(name)) => {
                    return Some(name.clone());
                }
                _ => {}
            }
        }
    }
    // Fall back to extracting from source code using UTF-16 code unit indices.
    // Babel/JS positions use UTF-16 code unit offsets, but Rust strings are UTF-8,
    // so we need to convert between the two.
    if let (Some(loc), Some(code)) = (loc, source_code) {
        let start_utf16 = loc.start.index? as usize;
        let end_utf16 = loc.end.index? as usize;
        if start_utf16 < end_utf16 {
            // Convert UTF-16 code unit offsets to UTF-8 byte offsets
            let mut utf16_pos = 0usize;
            let mut byte_start = None;
            let mut byte_end = None;
            for (byte_idx, ch) in code.char_indices() {
                if utf16_pos == start_utf16 {
                    byte_start = Some(byte_idx);
                }
                if utf16_pos == end_utf16 {
                    byte_end = Some(byte_idx);
                    break;
                }
                utf16_pos += ch.len_utf16();
            }
            // Handle end at the very end of string
            if utf16_pos == end_utf16 && byte_end.is_none() {
                byte_end = Some(code.len());
            }
            if let (Some(start), Some(end)) = (byte_start, byte_end) {
                let slice = &code[start..end];
                if !slice.is_empty()
                    && slice
                        .chars()
                        .all(|c| c.is_alphanumeric() || c == '_' || c == '$')
                {
                    return Some(slice.to_string());
                }
            }
        }
    }
    None
}

const MAX_FIXPOINT_ITERATIONS: usize = 100;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TypeOfValue {
    Ignored,
    FromProps,
    FromState,
    FromPropsAndState,
}

#[derive(Debug, Clone)]
struct DerivationMetadata {
    type_of_value: TypeOfValue,
    place_identifier: IdentifierId,
    place_name: Option<IdentifierName>,
    source_ids: IndexSet<IdentifierId, FxBuildHasher>,
    is_state_source: bool,
}

/// Metadata about a useEffect call site.
struct EffectMetadata {
    effect_func_id: FunctionId,
    dep_elements: Vec<DepElement>,
}

#[derive(Debug, Clone)]
struct DepElement {
    identifier: IdentifierId,
    loc: Option<SourceLocation>,
}

struct ValidationContext {
    /// Map from lvalue identifier to the FunctionId of function expressions
    functions: FxHashMap<IdentifierId, FunctionId>,
    /// Map from lvalue identifier to ArrayExpression elements (candidate deps)
    candidate_dependencies: FxHashMap<IdentifierId, Vec<DepElement>>,
    derivation_cache: DerivationCache,
    effects_cache: FxHashMap<IdentifierId, EffectMetadata>,
    set_state_loads: FxHashMap<IdentifierId, Option<IdentifierId>>,
    set_state_usages: FxHashMap<IdentifierId, FxHashSet<LocKey>>,
}

/// A hashable key for SourceLocation to use in FxHashSet
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct LocKey {
    start_line: u32,
    start_col: u32,
    end_line: u32,
    end_col: u32,
}

impl LocKey {
    fn from_loc(loc: &Option<SourceLocation>) -> Self {
        match loc {
            Some(loc) => LocKey {
                start_line: loc.start.line,
                start_col: loc.start.column,
                end_line: loc.end.line,
                end_col: loc.end.column,
            },
            None => LocKey {
                start_line: 0,
                start_col: 0,
                end_line: 0,
                end_col: 0,
            },
        }
    }
}

#[derive(Debug, Clone)]
struct DerivationCache {
    has_changes: bool,
    cache: FxHashMap<IdentifierId, DerivationMetadata>,
    previous_cache: Option<FxHashMap<IdentifierId, DerivationMetadata>>,
}

impl DerivationCache {
    fn new() -> Self {
        DerivationCache {
            has_changes: false,
            cache: FxHashMap::default(),
            previous_cache: None,
        }
    }

    fn take_snapshot(&mut self) {
        let mut prev = FxHashMap::default();
        for (key, value) in &self.cache {
            prev.insert(
                *key,
                DerivationMetadata {
                    place_identifier: value.place_identifier,
                    place_name: value.place_name.clone(),
                    source_ids: value.source_ids.clone(),
                    type_of_value: value.type_of_value,
                    is_state_source: value.is_state_source,
                },
            );
        }
        self.previous_cache = Some(prev);
    }

    fn check_for_changes(&mut self) {
        let prev = match &self.previous_cache {
            Some(p) => p,
            None => {
                self.has_changes = true;
                return;
            }
        };

        for (key, value) in &self.cache {
            match prev.get(key) {
                None => {
                    self.has_changes = true;
                    return;
                }
                Some(prev_value) => {
                    if !is_derivation_equal(prev_value, value) {
                        self.has_changes = true;
                        return;
                    }
                }
            }
        }

        if self.cache.len() != prev.len() {
            self.has_changes = true;
            return;
        }

        self.has_changes = false;
    }

    fn snapshot(&mut self) -> bool {
        let has_changes = self.has_changes;
        self.has_changes = false;
        has_changes
    }

    fn add_derivation_entry(
        &mut self,
        derived_id: IdentifierId,
        derived_name: Option<IdentifierName>,
        source_ids: IndexSet<IdentifierId, FxBuildHasher>,
        type_of_value: TypeOfValue,
        is_state_source: bool,
    ) {
        let mut final_is_source = is_state_source;
        if !final_is_source {
            for source_id in &source_ids {
                if let Some(source_metadata) = self.cache.get(source_id) {
                    if source_metadata.is_state_source
                        && !matches!(&source_metadata.place_name, Some(IdentifierName::Named(_)))
                    {
                        final_is_source = true;
                        break;
                    }
                }
            }
        }

        self.cache.insert(
            derived_id,
            DerivationMetadata {
                place_identifier: derived_id,
                place_name: derived_name,
                source_ids,
                type_of_value,
                is_state_source: final_is_source,
            },
        );
    }
}

fn is_derivation_equal(a: &DerivationMetadata, b: &DerivationMetadata) -> bool {
    if a.type_of_value != b.type_of_value {
        return false;
    }
    if a.source_ids.len() != b.source_ids.len() {
        return false;
    }
    for id in &a.source_ids {
        if !b.source_ids.contains(id) {
            return false;
        }
    }
    true
}

fn join_value(lvalue_type: TypeOfValue, value_type: TypeOfValue) -> TypeOfValue {
    if lvalue_type == TypeOfValue::Ignored {
        return value_type;
    }
    if value_type == TypeOfValue::Ignored {
        return lvalue_type;
    }
    if lvalue_type == value_type {
        return lvalue_type;
    }
    TypeOfValue::FromPropsAndState
}

fn get_root_set_state(
    key: IdentifierId,
    loads: &FxHashMap<IdentifierId, Option<IdentifierId>>,
    visited: &mut FxHashSet<IdentifierId>,
) -> Option<IdentifierId> {
    if visited.contains(&key) {
        return None;
    }
    visited.insert(key);

    match loads.get(&key) {
        None => None,
        Some(None) => Some(key),
        Some(Some(parent_id)) => get_root_set_state(*parent_id, loads, visited),
    }
}

fn maybe_record_set_state_for_instr(
    instr: &react_compiler_hir::Instruction,
    env: &Environment,
    set_state_loads: &mut FxHashMap<IdentifierId, Option<IdentifierId>>,
    set_state_usages: &mut FxHashMap<IdentifierId, FxHashSet<LocKey>>,
) {
    let identifiers = &env.identifiers;
    let types = &env.types;

    let all_lvalues = each_instruction_lvalue_ids(instr);
    for &lvalue_id in &all_lvalues {
        // Check if this is a LoadLocal from a known setState
        if let InstructionValue::LoadLocal { place, .. } = &instr.value {
            if set_state_loads.contains_key(&place.identifier) {
                set_state_loads.insert(lvalue_id, Some(place.identifier));
            } else {
                // Only check root setState if not a LoadLocal from a known chain
                let lvalue_ident = &identifiers[lvalue_id.0 as usize];
                let lvalue_ty = &types[lvalue_ident.type_.0 as usize];
                if is_set_state_type(lvalue_ty) {
                    set_state_loads.insert(lvalue_id, None);
                }
            }
        } else {
            // Check if lvalue is a setState type (root setState)
            let lvalue_ident = &identifiers[lvalue_id.0 as usize];
            let lvalue_ty = &types[lvalue_ident.type_.0 as usize];
            if is_set_state_type(lvalue_ty) {
                set_state_loads.insert(lvalue_id, None);
            }
        }

        let root = get_root_set_state(lvalue_id, set_state_loads, &mut FxHashSet::default());
        if let Some(root_id) = root {
            set_state_usages.entry(root_id).or_insert_with(|| {
                let mut set = FxHashSet::default();
                set.insert(LocKey::from_loc(&instr.lvalue.loc));
                set
            });
        }
    }
}

fn is_mutable_at(
    env: &Environment,
    eval_order: EvaluationOrder,
    identifier_id: IdentifierId,
) -> bool {
    env.identifiers[identifier_id.0 as usize]
        .mutable_range
        .contains(eval_order)
}

pub fn validate_no_derived_computations_in_effects_exp(
    func: &HirFunction,
    env: &Environment,
) -> Result<CompilerError, CompilerDiagnostic> {
    let identifiers = &env.identifiers;

    let mut context = ValidationContext {
        functions: FxHashMap::default(),
        candidate_dependencies: FxHashMap::default(),
        derivation_cache: DerivationCache::new(),
        effects_cache: FxHashMap::default(),
        set_state_loads: FxHashMap::default(),
        set_state_usages: FxHashMap::default(),
    };

    // Initialize derivation cache based on function type
    if func.fn_type == ReactFunctionType::Hook {
        for param in &func.params {
            if let ParamPattern::Place(place) = param {
                let name = identifiers[place.identifier.0 as usize].name.clone();
                context.derivation_cache.cache.insert(
                    place.identifier,
                    DerivationMetadata {
                        place_identifier: place.identifier,
                        place_name: name,
                        source_ids: IndexSet::default(),
                        type_of_value: TypeOfValue::FromProps,
                        is_state_source: true,
                    },
                );
            }
        }
    } else if func.fn_type == ReactFunctionType::Component {
        if let Some(param) = func.params.first() {
            if let ParamPattern::Place(place) = param {
                let name = identifiers[place.identifier.0 as usize].name.clone();
                context.derivation_cache.cache.insert(
                    place.identifier,
                    DerivationMetadata {
                        place_identifier: place.identifier,
                        place_name: name,
                        source_ids: IndexSet::default(),
                        type_of_value: TypeOfValue::FromProps,
                        is_state_source: true,
                    },
                );
            }
        }
    }

    // Fixpoint iteration
    let mut is_first_pass = true;
    let mut iteration_count = 0;
    loop {
        context.derivation_cache.take_snapshot();

        for (_block_id, block) in &func.body.blocks {
            record_phi_derivations(block, &mut context, env);
            for &instr_id in &block.instructions {
                let instr = &func.instructions[instr_id.0 as usize];
                record_instruction_derivations(instr, &mut context, is_first_pass, func, env)?;
            }
        }

        context.derivation_cache.check_for_changes();
        is_first_pass = false;
        iteration_count += 1;
        assert!(
            iteration_count < MAX_FIXPOINT_ITERATIONS,
            "[ValidateNoDerivedComputationsInEffects] Fixpoint iteration failed to converge."
        );

        if !context.derivation_cache.snapshot() {
            break;
        }
    }

    // Validate all effect sites
    let mut errors = CompilerError::new();
    let effects_cache: Vec<(IdentifierId, FunctionId, Vec<DepElement>)> = context
        .effects_cache
        .iter()
        .map(|(k, v)| (*k, v.effect_func_id, v.dep_elements.clone()))
        .collect();

    for (_key, effect_func_id, dep_elements) in &effects_cache {
        validate_effect(
            *effect_func_id,
            dep_elements,
            &mut context,
            func,
            env,
            &mut errors,
        );
    }

    Ok(errors)
}

fn record_phi_derivations(
    block: &react_compiler_hir::BasicBlock,
    context: &mut ValidationContext,
    env: &Environment,
) {
    let identifiers = &env.identifiers;
    for phi in &block.phis {
        let mut type_of_value = TypeOfValue::Ignored;
        let mut source_ids: IndexSet<IdentifierId, FxBuildHasher> = IndexSet::default();

        for (_block_id, operand) in &phi.operands {
            if let Some(operand_metadata) = context.derivation_cache.cache.get(&operand.identifier)
            {
                type_of_value = join_value(type_of_value, operand_metadata.type_of_value);
                source_ids.insert(operand.identifier);
            }
        }

        if type_of_value != TypeOfValue::Ignored {
            let name = identifiers[phi.place.identifier.0 as usize].name.clone();
            context.derivation_cache.add_derivation_entry(
                phi.place.identifier,
                name,
                source_ids,
                type_of_value,
                false,
            );
        }
    }
}

fn record_instruction_derivations(
    instr: &react_compiler_hir::Instruction,
    context: &mut ValidationContext,
    is_first_pass: bool,
    _outer_func: &HirFunction,
    env: &Environment,
) -> Result<(), CompilerDiagnostic> {
    let identifiers = &env.identifiers;
    let types = &env.types;
    let functions = &env.functions;
    let lvalue_id = instr.lvalue.identifier;

    // maybeRecordSetState
    maybe_record_set_state_for_instr(
        instr,
        env,
        &mut context.set_state_loads,
        &mut context.set_state_usages,
    );

    let mut type_of_value = TypeOfValue::Ignored;
    let is_source = false;
    let mut sources: IndexSet<IdentifierId, FxBuildHasher> = IndexSet::default();

    match &instr.value {
        InstructionValue::FunctionExpression { lowered_func, .. } => {
            context.functions.insert(lvalue_id, lowered_func.func);
            // Recurse into the inner function
            let inner_func = &functions[lowered_func.func.0 as usize];
            for (_block_id, block) in &inner_func.body.blocks {
                record_phi_derivations(block, context, env);
                for &inner_instr_id in &block.instructions {
                    let inner_instr = &inner_func.instructions[inner_instr_id.0 as usize];
                    record_instruction_derivations(
                        inner_instr,
                        context,
                        is_first_pass,
                        inner_func,
                        env,
                    )?;
                }
            }
        }
        InstructionValue::CallExpression { callee, args, .. } => {
            let callee_type = &types[identifiers[callee.identifier.0 as usize].type_.0 as usize];
            if is_use_effect_hook_type(callee_type) && args.len() == 2 {
                if let (
                    react_compiler_hir::PlaceOrSpread::Place(arg0),
                    react_compiler_hir::PlaceOrSpread::Place(arg1),
                ) = (&args[0], &args[1])
                {
                    let effect_function = context.functions.get(&arg0.identifier).copied();
                    let deps = context
                        .candidate_dependencies
                        .get(&arg1.identifier)
                        .cloned();
                    if let (Some(effect_func_id), Some(dep_elements)) = (effect_function, deps) {
                        context.effects_cache.insert(
                            arg0.identifier,
                            EffectMetadata {
                                effect_func_id,
                                dep_elements,
                            },
                        );
                    }
                }
            }

            // Check if lvalue is useState type
            let lvalue_type = &types[identifiers[lvalue_id.0 as usize].type_.0 as usize];
            if is_use_state_type(lvalue_type) {
                let name = identifiers[lvalue_id.0 as usize].name.clone();
                context.derivation_cache.add_derivation_entry(
                    lvalue_id,
                    name,
                    IndexSet::default(),
                    TypeOfValue::FromState,
                    true,
                );
                return Ok(());
            }
        }
        InstructionValue::MethodCall { property, args, .. } => {
            let prop_type = &types[identifiers[property.identifier.0 as usize].type_.0 as usize];
            if is_use_effect_hook_type(prop_type) && args.len() == 2 {
                if let (
                    react_compiler_hir::PlaceOrSpread::Place(arg0),
                    react_compiler_hir::PlaceOrSpread::Place(arg1),
                ) = (&args[0], &args[1])
                {
                    let effect_function = context.functions.get(&arg0.identifier).copied();
                    let deps = context
                        .candidate_dependencies
                        .get(&arg1.identifier)
                        .cloned();
                    if let (Some(effect_func_id), Some(dep_elements)) = (effect_function, deps) {
                        context.effects_cache.insert(
                            arg0.identifier,
                            EffectMetadata {
                                effect_func_id,
                                dep_elements,
                            },
                        );
                    }
                }
            }

            // Check if lvalue is useState type
            let lvalue_type = &types[identifiers[lvalue_id.0 as usize].type_.0 as usize];
            if is_use_state_type(lvalue_type) {
                let name = identifiers[lvalue_id.0 as usize].name.clone();
                context.derivation_cache.add_derivation_entry(
                    lvalue_id,
                    name,
                    IndexSet::default(),
                    TypeOfValue::FromState,
                    true,
                );
                return Ok(());
            }
        }
        InstructionValue::ArrayExpression { elements, .. } => {
            let dep_elements: Vec<DepElement> = elements
                .iter()
                .filter_map(|el| match el {
                    ArrayElement::Place(p) => Some(DepElement {
                        identifier: p.identifier,
                        loc: p.loc,
                    }),
                    _ => None,
                })
                .collect();
            context
                .candidate_dependencies
                .insert(lvalue_id, dep_elements);
        }
        _ => {}
    }

    // Collect operand derivations
    for (operand_id, operand_loc) in each_instruction_operand(instr, env) {
        // Track setState usages
        if context.set_state_loads.contains_key(&operand_id) {
            let root = get_root_set_state(
                operand_id,
                &context.set_state_loads,
                &mut FxHashSet::default(),
            );
            if let Some(root_id) = root {
                if let Some(usages) = context.set_state_usages.get_mut(&root_id) {
                    usages.insert(LocKey::from_loc(&operand_loc));
                }
            }
        }

        if let Some(operand_metadata) = context.derivation_cache.cache.get(&operand_id) {
            type_of_value = join_value(type_of_value, operand_metadata.type_of_value);
            sources.insert(operand_id);
        }
    }

    if type_of_value == TypeOfValue::Ignored {
        return Ok(());
    }

    // Record derivation for ALL lvalue places (including destructured variables)
    for &lv_id in &each_instruction_lvalue_ids(instr) {
        let name = identifiers[lv_id.0 as usize].name.clone();
        context.derivation_cache.add_derivation_entry(
            lv_id,
            name,
            sources.clone(),
            type_of_value,
            is_source,
        );
    }

    if matches!(&instr.value, InstructionValue::FunctionExpression { .. }) {
        // Don't record mutation effects for FunctionExpressions
        return Ok(());
    }

    // Handle mutable operands
    for operand in each_instruction_operand_with_effect(instr, env) {
        if operand.effect.is_mutable() {
            if is_mutable_at(env, instr.id, operand.id) {
                if let Some(existing) = context.derivation_cache.cache.get_mut(&operand.id) {
                    existing.type_of_value = join_value(type_of_value, existing.type_of_value);
                } else {
                    let name = identifiers[operand.id.0 as usize].name.clone();
                    context.derivation_cache.add_derivation_entry(
                        operand.id,
                        name,
                        sources.clone(),
                        type_of_value,
                        false,
                    );
                }
            }
        } else if matches!(operand.effect, Effect::Unknown) {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "Unexpected unknown effect",
                None,
            ));
        }
        // Freeze | Read => no-op
    }
    Ok(())
}

struct OperandWithEffect {
    id: IdentifierId,
    effect: Effect,
}

/// Collects operand (IdentifierId, loc) pairs from an instruction.
/// Thin wrapper around canonical `each_instruction_operand` that maps Places to (id, loc) pairs.
fn each_instruction_operand(
    instr: &react_compiler_hir::Instruction,
    env: &Environment,
) -> Vec<(IdentifierId, Option<SourceLocation>)> {
    canonical_each_instruction_operand(instr, env)
        .into_iter()
        .map(|place| (place.identifier, place.loc))
        .collect()
}

/// Collects operands with their effects.
/// Thin wrapper around canonical `each_instruction_operand` that maps Places to OperandWithEffect.
fn each_instruction_operand_with_effect(
    instr: &react_compiler_hir::Instruction,
    env: &Environment,
) -> Vec<OperandWithEffect> {
    canonical_each_instruction_operand(instr, env)
        .into_iter()
        .map(|place| OperandWithEffect {
            id: place.identifier,
            effect: place.effect,
        })
        .collect()
}

// =============================================================================
// Tree building and rendering (for error messages)
// =============================================================================

struct TreeNode {
    name: String,
    type_of_value: TypeOfValue,
    is_source: bool,
    children: Vec<TreeNode>,
}

fn build_tree_node(
    source_id: IdentifierId,
    context: &ValidationContext,
    visited: &FxHashSet<String>,
) -> Vec<TreeNode> {
    let source_metadata = match context.derivation_cache.cache.get(&source_id) {
        Some(m) => m,
        None => return Vec::new(),
    };

    if source_metadata.is_state_source {
        if let Some(IdentifierName::Named(name)) = &source_metadata.place_name {
            return vec![TreeNode {
                name: name.clone(),
                type_of_value: source_metadata.type_of_value,
                is_source: true,
                children: Vec::new(),
            }];
        }
    }

    let mut children: Vec<TreeNode> = Vec::new();
    let mut named_siblings: IndexSet<String, FxBuildHasher> = IndexSet::default();

    for child_id in &source_metadata.source_ids {
        assert_ne!(
            *child_id, source_id,
            "Unexpected self-reference: a value should not have itself as a source"
        );

        let mut new_visited = visited.clone();
        if let Some(IdentifierName::Named(name)) = &source_metadata.place_name {
            new_visited.insert(name.clone());
        }

        let child_nodes = build_tree_node(*child_id, context, &new_visited);
        for child_node in child_nodes {
            if !named_siblings.contains(&child_node.name) {
                named_siblings.insert(child_node.name.clone());
                children.push(child_node);
            }
        }
    }

    if let Some(IdentifierName::Named(name)) = &source_metadata.place_name {
        if !visited.contains(name) {
            return vec![TreeNode {
                name: name.clone(),
                type_of_value: source_metadata.type_of_value,
                is_source: source_metadata.is_state_source,
                children,
            }];
        }
    }

    children
}

fn render_tree(
    node: &TreeNode,
    indent: &str,
    is_last: bool,
    props_set: &mut IndexSet<String, FxBuildHasher>,
    state_set: &mut IndexSet<String, FxBuildHasher>,
) -> String {
    let prefix = format!(
        "{}{}",
        indent,
        if is_last {
            "\u{2514}\u{2500}\u{2500} "
        } else {
            "\u{251c}\u{2500}\u{2500} "
        }
    );
    let child_indent = format!("{}{}", indent, if is_last { "    " } else { "\u{2502}   " });

    let mut result = format!("{}{}", prefix, node.name);

    if node.is_source {
        let type_label = match node.type_of_value {
            TypeOfValue::FromProps => {
                props_set.insert(node.name.clone());
                "Prop"
            }
            TypeOfValue::FromState => {
                state_set.insert(node.name.clone());
                "State"
            }
            _ => {
                props_set.insert(node.name.clone());
                state_set.insert(node.name.clone());
                "Prop and State"
            }
        };
        result += &format!(" ({})", type_label);
    }

    if !node.children.is_empty() {
        result += "\n";
        for (index, child) in node.children.iter().enumerate() {
            let is_last_child = index == node.children.len() - 1;
            result += &render_tree(child, &child_indent, is_last_child, props_set, state_set);
            if index < node.children.len() - 1 {
                result += "\n";
            }
        }
    }

    result
}

fn get_fn_local_deps(
    func_id: Option<FunctionId>,
    env: &Environment,
) -> Option<FxHashSet<IdentifierId>> {
    let func_id = func_id?;
    let inner = &env.functions[func_id.0 as usize];
    let mut deps: FxHashSet<IdentifierId> = FxHashSet::default();

    for (_block_id, block) in &inner.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &inner.instructions[instr_id.0 as usize];
            if let InstructionValue::LoadLocal { place, .. } = &instr.value {
                deps.insert(place.identifier);
            }
        }
    }

    Some(deps)
}

fn validate_effect(
    effect_func_id: FunctionId,
    dependencies: &[DepElement],
    context: &mut ValidationContext,
    _outer_func: &HirFunction,
    env: &Environment,
    errors: &mut CompilerError,
) {
    let identifiers = &env.identifiers;
    let types = &env.types;
    let functions = &env.functions;
    let effect_function = &functions[effect_func_id.0 as usize];
    let mut seen_blocks: FxHashSet<BlockId> = FxHashSet::default();

    struct DerivedSetStateCall {
        callee_loc: Option<SourceLocation>,
        callee_id: IdentifierId,
        callee_identifier_name: Option<String>,
        source_ids: IndexSet<IdentifierId, FxBuildHasher>,
    }

    let mut effect_derived_set_state_calls: Vec<DerivedSetStateCall> = Vec::new();
    let mut effect_set_state_usages: FxHashMap<IdentifierId, FxHashSet<LocKey>> =
        FxHashMap::default();

    // Consider setStates in the effect's dependency array as being part of effectSetStateUsages
    for dep in dependencies {
        let root = get_root_set_state(
            dep.identifier,
            &context.set_state_loads,
            &mut FxHashSet::default(),
        );
        if let Some(root_id) = root {
            let mut set = FxHashSet::default();
            set.insert(LocKey::from_loc(&dep.loc));
            effect_set_state_usages.insert(root_id, set);
        }
    }

    let mut cleanup_function_deps: Option<FxHashSet<IdentifierId>> = None;
    let mut globals: FxHashSet<IdentifierId> = FxHashSet::default();

    for (_block_id, block) in &effect_function.body.blocks {
        // Check for return -> cleanup function
        if let react_compiler_hir::Terminal::Return {
            value,
            return_variant: ReturnVariant::Explicit,
            ..
        } = &block.terminal
        {
            let func_id = context.functions.get(&value.identifier).copied();
            cleanup_function_deps = get_fn_local_deps(func_id, env);
        }

        // Skip if block has a back edge (pred not yet seen)
        let has_back_edge = block.preds.iter().any(|pred| !seen_blocks.contains(pred));
        if has_back_edge {
            return;
        }

        for &instr_id in &block.instructions {
            let instr = &effect_function.instructions[instr_id.0 as usize];

            // Early return if any instruction derives from a ref
            let lvalue_type =
                &types[identifiers[instr.lvalue.identifier.0 as usize].type_.0 as usize];
            if is_use_ref_type(lvalue_type) {
                return;
            }

            // maybeRecordSetState for effect instructions
            maybe_record_set_state_for_instr(
                instr,
                env,
                &mut context.set_state_loads,
                &mut effect_set_state_usages,
            );

            // Track setState usages for operands
            for (operand_id, operand_loc) in each_instruction_operand(instr, env) {
                if context.set_state_loads.contains_key(&operand_id) {
                    let root = get_root_set_state(
                        operand_id,
                        &context.set_state_loads,
                        &mut FxHashSet::default(),
                    );
                    if let Some(root_id) = root {
                        if let Some(usages) = effect_set_state_usages.get_mut(&root_id) {
                            usages.insert(LocKey::from_loc(&operand_loc));
                        }
                    }
                }
            }

            match &instr.value {
                InstructionValue::CallExpression { callee, args, .. } => {
                    let callee_type =
                        &types[identifiers[callee.identifier.0 as usize].type_.0 as usize];
                    if is_set_state_type(callee_type) && args.len() == 1 {
                        if let react_compiler_hir::PlaceOrSpread::Place(arg0) = &args[0] {
                            let callee_metadata =
                                context.derivation_cache.cache.get(&callee.identifier);

                            // If the setState comes from a source other than local state, skip
                            if let Some(cm) = callee_metadata {
                                if cm.type_of_value != TypeOfValue::FromState {
                                    continue;
                                }
                            } else {
                                continue;
                            }

                            let arg_metadata = context.derivation_cache.cache.get(&arg0.identifier);
                            if let Some(am) = arg_metadata {
                                // Get the user-visible identifier name, matching Babel's
                                // loc.identifierName. Falls back to extracting from source code.
                                let callee_ident_name = get_identifier_name_with_loc(
                                    callee.identifier,
                                    identifiers,
                                    &callee.loc,
                                    env.code.as_deref(),
                                );
                                effect_derived_set_state_calls.push(DerivedSetStateCall {
                                    callee_loc: callee.loc,
                                    callee_id: callee.identifier,
                                    callee_identifier_name: callee_ident_name,
                                    source_ids: am.source_ids.clone(),
                                });
                            }
                        }
                    } else {
                        // Check if callee is from props/propsAndState -> bail
                        let callee_metadata =
                            context.derivation_cache.cache.get(&callee.identifier);
                        if let Some(cm) = callee_metadata {
                            if cm.type_of_value == TypeOfValue::FromProps
                                || cm.type_of_value == TypeOfValue::FromPropsAndState
                            {
                                return;
                            }
                        }

                        if globals.contains(&callee.identifier) {
                            return;
                        }
                    }
                }
                InstructionValue::LoadGlobal { .. } => {
                    globals.insert(instr.lvalue.identifier);
                    for (operand_id, _) in each_instruction_operand(instr, env) {
                        globals.insert(operand_id);
                    }
                }
                _ => {}
            }
        }
        seen_blocks.insert(block.id);
    }

    // Emit errors for derived setState calls
    for derived in &effect_derived_set_state_calls {
        let root_set_state_call = get_root_set_state(
            derived.callee_id,
            &context.set_state_loads,
            &mut FxHashSet::default(),
        );
        if let Some(root_id) = root_set_state_call {
            let effect_usage_count = effect_set_state_usages
                .get(&root_id)
                .map(|s| s.len())
                .unwrap_or(0);
            let total_usage_count = context
                .set_state_usages
                .get(&root_id)
                .map(|s| s.len())
                .unwrap_or(0);
            if effect_set_state_usages.contains_key(&root_id)
                && context.set_state_usages.contains_key(&root_id)
                && effect_usage_count == total_usage_count - 1
            {
                let mut props_set: IndexSet<String, FxBuildHasher> = IndexSet::default();
                let mut state_set: IndexSet<String, FxBuildHasher> = IndexSet::default();

                let mut root_nodes_map: IndexMap<String, TreeNode, FxBuildHasher> =
                    IndexMap::default();
                for id in &derived.source_ids {
                    let nodes = build_tree_node(*id, context, &FxHashSet::default());
                    for node in nodes {
                        if !root_nodes_map.contains_key(&node.name) {
                            root_nodes_map.insert(node.name.clone(), node);
                        }
                    }
                }
                let root_nodes: Vec<&TreeNode> = root_nodes_map.values().collect();

                let trees: Vec<String> = root_nodes
                    .iter()
                    .enumerate()
                    .map(|(index, node)| {
                        render_tree(
                            node,
                            "",
                            index == root_nodes.len() - 1,
                            &mut props_set,
                            &mut state_set,
                        )
                    })
                    .collect();

                // Check cleanup function dependencies
                let should_skip = if let Some(ref cleanup_deps) = cleanup_function_deps {
                    derived
                        .source_ids
                        .iter()
                        .any(|dep| cleanup_deps.contains(dep))
                } else {
                    false
                };
                if should_skip {
                    return;
                }

                let mut root_sources = String::new();
                if !props_set.is_empty() {
                    let props_list: Vec<&str> = props_set.iter().map(|s| s.as_str()).collect();
                    root_sources += &format!("Props: [{}]", props_list.join(", "));
                }
                if !state_set.is_empty() {
                    if !root_sources.is_empty() {
                        root_sources += "\n";
                    }
                    let state_list: Vec<&str> = state_set.iter().map(|s| s.as_str()).collect();
                    root_sources += &format!("State: [{}]", state_list.join(", "));
                }

                let description = format!(
                    "Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\n\
                     This setState call is setting a derived value that depends on the following reactive sources:\n\n\
                     {}\n\n\
                     Data Flow Tree:\n\
                     {}\n\n\
                     See: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state",
                    root_sources,
                    trees.join("\n"),
                );

                errors.push_diagnostic(
                    CompilerDiagnostic::new(
                        ErrorCategory::EffectDerivationsOfState,
                        "You might not need an effect. Derive values in render, not effects.",
                        Some(description),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc: derived.callee_loc,
                        message: Some(
                            "This should be computed during render, not in an effect".to_string(),
                        ),
                        identifier_name: derived.callee_identifier_name.clone(),
                    }),
                );
            }
        }
    }
}

// =============================================================================
// Non-exp version: ValidateNoDerivedComputationsInEffects
// Port of ValidateNoDerivedComputationsInEffects.ts
// =============================================================================

/// Non-experimental version of the derived-computations-in-effects validation.
/// Records errors directly on the Environment (matching TS `env.recordError()` behavior).
pub fn validate_no_derived_computations_in_effects(
    func: &HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerError> {
    // Phase 1: Collect effect call sites (func_id + resolved deps).
    // Done with only immutable borrows of env fields.
    let effects_to_validate: Vec<(FunctionId, Vec<IdentifierId>)> = {
        let ids = &env.identifiers;
        let tys = &env.types;
        let mut candidate_deps: FxHashMap<IdentifierId, Vec<IdentifierId>> = FxHashMap::default();
        let mut functions_map: FxHashMap<IdentifierId, FunctionId> = FxHashMap::default();
        let mut locals_map: FxHashMap<IdentifierId, IdentifierId> = FxHashMap::default();
        let mut result = Vec::new();

        for (_, block) in &func.body.blocks {
            for &iid in &block.instructions {
                let instr = &func.instructions[iid.0 as usize];
                match &instr.value {
                    InstructionValue::LoadLocal { place, .. } => {
                        locals_map.insert(instr.lvalue.identifier, place.identifier);
                    }
                    InstructionValue::ArrayExpression { elements, .. } => {
                        let elem_ids: Vec<IdentifierId> = elements
                            .iter()
                            .filter_map(|e| match e {
                                ArrayElement::Place(p) => Some(p.identifier),
                                _ => None,
                            })
                            .collect();
                        if elem_ids.len() == elements.len() {
                            candidate_deps.insert(instr.lvalue.identifier, elem_ids);
                        }
                    }
                    InstructionValue::FunctionExpression { lowered_func, .. } => {
                        functions_map.insert(instr.lvalue.identifier, lowered_func.func);
                    }
                    InstructionValue::CallExpression { callee, args, .. } => {
                        let callee_ty = &tys[ids[callee.identifier.0 as usize].type_.0 as usize];
                        if is_use_effect_hook_type(callee_ty) && args.len() == 2 {
                            if let (PlaceOrSpread::Place(arg0), PlaceOrSpread::Place(arg1)) =
                                (&args[0], &args[1])
                            {
                                if let (Some(&func_id), Some(dep_elements)) = (
                                    functions_map.get(&arg0.identifier),
                                    candidate_deps.get(&arg1.identifier),
                                ) {
                                    if !dep_elements.is_empty() {
                                        let resolved: Vec<IdentifierId> = dep_elements
                                            .iter()
                                            .map(|d| locals_map.get(d).copied().unwrap_or(*d))
                                            .collect();
                                        result.push((func_id, resolved));
                                    }
                                }
                            }
                        }
                    }
                    InstructionValue::MethodCall { property, args, .. } => {
                        let callee_ty = &tys[ids[property.identifier.0 as usize].type_.0 as usize];
                        if is_use_effect_hook_type(callee_ty) && args.len() == 2 {
                            if let (PlaceOrSpread::Place(arg0), PlaceOrSpread::Place(arg1)) =
                                (&args[0], &args[1])
                            {
                                if let (Some(&func_id), Some(dep_elements)) = (
                                    functions_map.get(&arg0.identifier),
                                    candidate_deps.get(&arg1.identifier),
                                ) {
                                    if !dep_elements.is_empty() {
                                        let resolved: Vec<IdentifierId> = dep_elements
                                            .iter()
                                            .map(|d| locals_map.get(d).copied().unwrap_or(*d))
                                            .collect();
                                        result.push((func_id, resolved));
                                    }
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        result
    };

    // Phase 2: Validate each collected effect and record error details.
    // Uses ErrorDetail (flat loc format) to match TS behavior where
    // env.recordError(new CompilerErrorDetail({...})) is used.
    for (func_id, resolved_deps) in effects_to_validate {
        let details = validate_effect_non_exp(
            &env.functions[func_id.0 as usize],
            &resolved_deps,
            &env.identifiers,
            &env.types,
        );
        for detail in details {
            env.record_error(detail)?;
        }
    }
    Ok(())
}

fn validate_effect_non_exp(
    effect_func: &HirFunction,
    effect_deps: &[IdentifierId],
    ids: &[Identifier],
    tys: &[Type],
) -> Vec<CompilerErrorDetail> {
    // Check that the effect function only captures effect deps and setState
    for ctx in &effect_func.context {
        let ctx_ty = &tys[ids[ctx.identifier.0 as usize].type_.0 as usize];
        if is_set_state_type(ctx_ty) {
            continue;
        } else if effect_deps.iter().any(|d| *d == ctx.identifier) {
            continue;
        } else {
            return Vec::new();
        }
    }

    // Check that all effect deps are actually used in the function
    for dep in effect_deps {
        if !effect_func.context.iter().any(|c| c.identifier == *dep) {
            return Vec::new();
        }
    }

    let mut seen_blocks: FxHashSet<BlockId> = FxHashSet::default();
    let mut dep_values: FxHashMap<IdentifierId, Vec<IdentifierId>> = FxHashMap::default();
    for dep in effect_deps {
        dep_values.insert(*dep, vec![*dep]);
    }

    let mut set_state_locs: Vec<SourceLocation> = Vec::new();

    for (_, block) in &effect_func.body.blocks {
        for &pred in &block.preds {
            if !seen_blocks.contains(&pred) {
                return Vec::new();
            }
        }

        for phi in &block.phis {
            let mut aggregate: FxHashSet<IdentifierId> = FxHashSet::default();
            for operand in phi.operands.values() {
                if let Some(deps) = dep_values.get(&operand.identifier) {
                    for d in deps {
                        aggregate.insert(*d);
                    }
                }
            }
            if !aggregate.is_empty() {
                dep_values.insert(phi.place.identifier, aggregate.into_iter().collect());
            }
        }

        for &iid in &block.instructions {
            let instr = &effect_func.instructions[iid.0 as usize];
            match &instr.value {
                InstructionValue::Primitive { .. }
                | InstructionValue::JSXText { .. }
                | InstructionValue::LoadGlobal { .. } => {}
                InstructionValue::LoadLocal { place, .. } => {
                    if let Some(deps) = dep_values.get(&place.identifier) {
                        dep_values.insert(instr.lvalue.identifier, deps.clone());
                    }
                }
                InstructionValue::ComputedLoad { .. }
                | InstructionValue::PropertyLoad { .. }
                | InstructionValue::BinaryExpression { .. }
                | InstructionValue::TemplateLiteral { .. }
                | InstructionValue::CallExpression { .. }
                | InstructionValue::MethodCall { .. } => {
                    let mut aggregate: FxHashSet<IdentifierId> = FxHashSet::default();
                    for operand in non_exp_value_operands(&instr.value) {
                        if let Some(deps) = dep_values.get(&operand) {
                            for d in deps {
                                aggregate.insert(*d);
                            }
                        }
                    }
                    if !aggregate.is_empty() {
                        dep_values.insert(instr.lvalue.identifier, aggregate.into_iter().collect());
                    }

                    if let InstructionValue::CallExpression { callee, args, .. } = &instr.value {
                        let callee_ty = &tys[ids[callee.identifier.0 as usize].type_.0 as usize];
                        if is_set_state_type(callee_ty) && args.len() == 1 {
                            if let PlaceOrSpread::Place(arg) = &args[0] {
                                if let Some(deps) = dep_values.get(&arg.identifier) {
                                    let dep_set: FxHashSet<_> = deps.iter().collect();
                                    if dep_set.len() == effect_deps.len() {
                                        if let Some(loc) = callee.loc {
                                            set_state_locs.push(loc);
                                        }
                                    } else {
                                        return Vec::new();
                                    }
                                } else {
                                    return Vec::new();
                                }
                            }
                        }
                    }
                }
                _ => {
                    return Vec::new();
                }
            }
        }

        match &block.terminal {
            react_compiler_hir::Terminal::Return { value, .. }
            | react_compiler_hir::Terminal::Throw { value, .. } => {
                if dep_values.contains_key(&value.identifier) {
                    return Vec::new();
                }
            }
            react_compiler_hir::Terminal::If { test, .. }
            | react_compiler_hir::Terminal::Branch { test, .. } => {
                if dep_values.contains_key(&test.identifier) {
                    return Vec::new();
                }
            }
            react_compiler_hir::Terminal::Switch { test, .. } => {
                if dep_values.contains_key(&test.identifier) {
                    return Vec::new();
                }
            }
            _ => {}
        }

        seen_blocks.insert(block.id);
    }

    set_state_locs
        .into_iter()
        .map(|loc| {
            CompilerErrorDetail {
                category: ErrorCategory::EffectDerivationsOfState,
                reason: "Values derived from props and state should be calculated during render, not in an effect. (https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state)".to_string(),
                description: None,
                loc: Some(loc),
                suggestions: None,
            }
        })
        .collect()
}

/// Collects operand IdentifierIds for a subset of instruction variants used
/// by `validate_effect_non_exp`.
///
/// NOTE: This intentionally does NOT use the canonical `each_instruction_value_operand`
/// because: (1) `validate_effect_non_exp` only matches specific variants
/// (ComputedLoad, PropertyLoad, BinaryExpression, TemplateLiteral, CallExpression,
/// MethodCall), so FunctionExpression/ObjectMethod context handling is unnecessary;
/// and (2) the caller does not have access to `env` which the canonical function requires
/// for resolving function expression context captures.
fn non_exp_value_operands(value: &InstructionValue) -> Vec<IdentifierId> {
    match value {
        InstructionValue::ComputedLoad {
            object, property, ..
        } => {
            vec![object.identifier, property.identifier]
        }
        InstructionValue::PropertyLoad { object, .. } => vec![object.identifier],
        InstructionValue::BinaryExpression { left, right, .. } => {
            vec![left.identifier, right.identifier]
        }
        InstructionValue::TemplateLiteral { subexprs, .. } => {
            subexprs.iter().map(|s| s.identifier).collect()
        }
        InstructionValue::CallExpression { callee, args, .. } => {
            let mut op_ids = vec![callee.identifier];
            for a in args {
                match a {
                    PlaceOrSpread::Place(p) => op_ids.push(p.identifier),
                    PlaceOrSpread::Spread(s) => op_ids.push(s.place.identifier),
                }
            }
            op_ids
        }
        InstructionValue::MethodCall {
            receiver,
            property,
            args,
            ..
        } => {
            let mut op_ids = vec![receiver.identifier, property.identifier];
            for a in args {
                match a {
                    PlaceOrSpread::Place(p) => op_ids.push(p.identifier),
                    PlaceOrSpread::Spread(s) => op_ids.push(s.place.identifier),
                }
            }
            op_ids
        }
        _ => Vec::new(),
    }
}

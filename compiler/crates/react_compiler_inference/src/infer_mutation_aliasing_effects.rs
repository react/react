// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Infers the mutation/aliasing effects for instructions and terminals.
//!
//! Ported from TypeScript `src/Inference/InferMutationAliasingEffects.ts`.
//!
//! This pass uses abstract interpretation to compute effects describing
//! creation, aliasing, mutation, freezing, and error conditions for each
//! instruction and terminal in the HIR.

use std::collections::HashMap;
use std::collections::HashSet;

use indexmap::IndexSet;
use react_compiler_diagnostics::CompilerDiagnostic;
use react_compiler_diagnostics::CompilerDiagnosticDetail;
use react_compiler_diagnostics::ErrorCategory;
use react_compiler_hir::AliasingEffect;
use react_compiler_hir::AliasingSignature;
use react_compiler_hir::BlockId;
use react_compiler_hir::DeclarationId;
use react_compiler_hir::Effect;
use react_compiler_hir::FunctionId;
use react_compiler_hir::HirFunction;
use react_compiler_hir::IdentifierId;
use react_compiler_hir::InstructionKind;
use react_compiler_hir::InstructionValue;
use react_compiler_hir::MutationReason;
use react_compiler_hir::ParamPattern;
use react_compiler_hir::Place;
use react_compiler_hir::PlaceOrSpread;
use react_compiler_hir::PlaceOrSpreadOrHole;
use react_compiler_hir::ReactFunctionType;
use react_compiler_hir::SourceLocation;
use react_compiler_hir::Type;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::object_shape::BUILT_IN_ARRAY_ID;
use react_compiler_hir::object_shape::BUILT_IN_MAP_ID;
use react_compiler_hir::object_shape::BUILT_IN_SET_ID;
use react_compiler_hir::object_shape::FunctionSignature;
use react_compiler_hir::object_shape::HookKind;
use react_compiler_hir::type_config::ValueKind;
use react_compiler_hir::type_config::ValueReason;
use react_compiler_hir::visitors;

// =============================================================================
// Public entry point
// =============================================================================

/// Infers mutation/aliasing effects for all instructions and terminals in `func`.
///
/// Corresponds to TS `inferMutationAliasingEffects(fn, {isFunctionExpression})`.
pub fn infer_mutation_aliasing_effects(
    func: &mut HirFunction,
    env: &mut Environment,
    is_function_expression: bool,
) -> Result<(), CompilerDiagnostic> {
    let mut initial_state = InferenceState::empty(env, is_function_expression);

    // Map of blocks to the last (merged) incoming state that was processed
    let mut states_by_block: HashMap<BlockId, InferenceState> = HashMap::new();

    // Initialize context variables
    for ctx_place in &func.context {
        let value_id = ValueId::new();
        initial_state.initialize(
            value_id,
            AbstractValue {
                kind: ValueKind::Context,
                reason: hashset_of(ValueReason::Other),
            },
        );
        initial_state.define(ctx_place.identifier, value_id);
    }

    let param_kind: AbstractValue = if is_function_expression {
        AbstractValue {
            kind: ValueKind::Mutable,
            reason: hashset_of(ValueReason::Other),
        }
    } else {
        AbstractValue {
            kind: ValueKind::Frozen,
            reason: hashset_of(ValueReason::ReactiveFunctionArgument),
        }
    };

    if func.fn_type == ReactFunctionType::Component {
        // Component: at most 2 params (props, ref)
        let params_len = func.params.len();
        if params_len > 0 {
            infer_param(&func.params[0], &mut initial_state, &param_kind);
        }
        if params_len > 1 {
            let ref_place = match &func.params[1] {
                ParamPattern::Place(p) => p,
                ParamPattern::Spread(s) => &s.place,
            };
            let value_id = ValueId::new();
            initial_state.initialize(
                value_id,
                AbstractValue {
                    kind: ValueKind::Mutable,
                    reason: hashset_of(ValueReason::Other),
                },
            );
            initial_state.define(ref_place.identifier, value_id);
        }
    } else {
        for param in &func.params {
            infer_param(param, &mut initial_state, &param_kind);
        }
    }

    let mut queued_states: indexmap::IndexMap<BlockId, InferenceState> = indexmap::IndexMap::new();

    // Queue helper
    fn queue(
        queued_states: &mut indexmap::IndexMap<BlockId, InferenceState>,
        states_by_block: &HashMap<BlockId, InferenceState>,
        block_id: BlockId,
        state: InferenceState,
    ) {
        if let Some(queued_state) = queued_states.get(&block_id) {
            let merged = queued_state.merge(&state);
            let new_state = merged.unwrap_or_else(|| queued_state.clone());
            queued_states.insert(block_id, new_state);
        } else {
            let prev_state = states_by_block.get(&block_id);
            if let Some(prev) = prev_state {
                let next_state = prev.merge(&state);
                if let Some(next) = next_state {
                    queued_states.insert(block_id, next);
                }
            } else {
                queued_states.insert(block_id, state);
            }
        }
    }

    queue(
        &mut queued_states,
        &states_by_block,
        func.body.entry,
        initial_state,
    );

    let hoisted_context_declarations = find_hoisted_context_declarations(func, env);
    let non_mutating_spreads = find_non_mutated_destructure_spreads(func, env);

    let mut context = Context {
        interned_effects: HashMap::new(),
        instruction_signature_cache: HashMap::new(),
        catch_handlers: HashMap::new(),
        is_function_expression,
        hoisted_context_declarations,
        non_mutating_spreads,
        effect_value_id_cache: HashMap::new(),
        function_values: HashMap::new(),
        function_signature_cache: HashMap::new(),
        aliasing_config_temp_cache: HashMap::new(),
    };

    let mut iteration_count = 0;

    while !queued_states.is_empty() {
        iteration_count += 1;
        if iteration_count > 100 {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                "[InferMutationAliasingEffects] Potential infinite loop: \
                 A value, temporary place, or effect was not cached properly",
                None,
            ));
        }

        // Collect block IDs to process in order
        let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();
        for block_id in block_ids {
            let incoming_state = match queued_states.swap_remove(&block_id) {
                Some(s) => s,
                None => continue,
            };

            states_by_block.insert(block_id, incoming_state.clone());
            let mut state = incoming_state.clone();

            infer_block(&mut context, &mut state, block_id, func, env)?;

            // Check for uninitialized identifier access (matches TS invariant:
            // "Expected value kind to be initialized")
            if let Some((uninitialized_id, usage_loc)) = state.uninitialized_access.get() {
                let ident_info = env.identifiers.get(uninitialized_id.0 as usize);
                let name = ident_info
                    .and_then(|ident| ident.name.as_ref())
                    .map(|n| n.value().to_string())
                    .unwrap_or_else(|| "".to_string());
                // Use usage_loc if available, otherwise fall back to identifier's own loc
                let error_loc = usage_loc.or_else(|| ident_info.and_then(|i| i.loc));
                // Match TS printPlace format: "<unknown> name$id:type"
                let type_str = ident_info
                    .map(|ident| {
                        let ty = &env.types[ident.type_.0 as usize];
                        format_type_for_print(ty)
                    })
                    .unwrap_or_default();
                let description = format!("<unknown> {}${}{}", name, uninitialized_id.0, type_str);
                let diag = CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "[InferMutationAliasingEffects] Expected value kind to be initialized",
                    Some(description),
                )
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc: error_loc,
                    message: Some("this is uninitialized".to_string()),
                    identifier_name: None,
                });
                return Err(diag);
            }

            // Queue successors
            let successors = terminal_successors(&func.body.blocks[&block_id].terminal);
            for next_block_id in successors {
                queue(
                    &mut queued_states,
                    &states_by_block,
                    next_block_id,
                    state.clone(),
                );
            }
        }
    }

    Ok(())
}

// =============================================================================
// ValueId: replaces InstructionValue identity as allocation-site key
// =============================================================================

/// Unique allocation-site identifier, replacing TS's object-identity on InstructionValue.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct ValueId(u32);

use std::sync::atomic::AtomicU32;
use std::sync::atomic::Ordering;
static NEXT_VALUE_ID: AtomicU32 = AtomicU32::new(1);

impl ValueId {
    fn new() -> Self {
        ValueId(NEXT_VALUE_ID.fetch_add(1, Ordering::Relaxed))
    }
}

// =============================================================================
// AbstractValue
// =============================================================================

#[derive(Debug, Clone)]
struct AbstractValue {
    kind: ValueKind,
    reason: IndexSet<ValueReason>,
}

fn hashset_of(r: ValueReason) -> IndexSet<ValueReason> {
    let mut s = IndexSet::new();
    s.insert(r);
    s
}

// =============================================================================
// InferenceState
// =============================================================================

/// The abstract state tracked during inference.
/// Uses interior mutability via a struct with direct fields (no Rc needed since
/// we always have exclusive access in the pass).
#[derive(Debug, Clone)]
struct InferenceState {
    is_function_expression: bool,
    /// The kind of each value, based on its allocation site
    values: HashMap<ValueId, AbstractValue>,
    /// The set of values pointed to by each identifier
    variables: HashMap<IdentifierId, HashSet<ValueId>>,
    /// Tracks uninitialized identifier access errors (matches TS invariant).
    /// Uses Cell so it can be set from `&self` methods like `kind()`.
    /// Stores (IdentifierId, usage_loc) where usage_loc is the source location
    /// of the Place that triggered the uninitialized access.
    uninitialized_access: std::cell::Cell<Option<(IdentifierId, Option<SourceLocation>)>>,
}

impl InferenceState {
    fn empty(_env: &Environment, is_function_expression: bool) -> Self {
        InferenceState {
            is_function_expression,
            values: HashMap::new(),
            variables: HashMap::new(),
            uninitialized_access: std::cell::Cell::new(None),
        }
    }

    /// Check the kind of a place, recording the usage location for error reporting.
    fn kind_with_loc(
        &self,
        place_id: IdentifierId,
        usage_loc: Option<SourceLocation>,
    ) -> AbstractValue {
        let values = match self.variables.get(&place_id) {
            Some(v) => v,
            None => {
                if self.uninitialized_access.get().is_none() {
                    self.uninitialized_access.set(Some((place_id, usage_loc)));
                }
                return AbstractValue {
                    kind: ValueKind::Mutable,
                    reason: hashset_of(ValueReason::Other),
                };
            }
        };
        let mut merged_kind: Option<AbstractValue> = None;
        for value_id in values {
            let kind = match self.values.get(value_id) {
                Some(k) => k,
                None => continue,
            };
            merged_kind = Some(match merged_kind {
                Some(prev) => merge_abstract_values(&prev, kind),
                None => kind.clone(),
            });
        }
        merged_kind.unwrap_or_else(|| AbstractValue {
            kind: ValueKind::Mutable,
            reason: hashset_of(ValueReason::Other),
        })
    }

    fn initialize(&mut self, value_id: ValueId, kind: AbstractValue) {
        self.values.insert(value_id, kind);
    }

    fn define(&mut self, place_id: IdentifierId, value_id: ValueId) {
        let mut set = HashSet::new();
        set.insert(value_id);
        self.variables.insert(place_id, set);
    }

    fn assign(&mut self, into: IdentifierId, from: IdentifierId) {
        let values = match self.variables.get(&from) {
            Some(v) => v.clone(),
            None => {
                // Create a stable value for uninitialized identifiers
                // Use a deterministic ID based on the from identifier
                let vid = ValueId(from.0 | 0x80000000);
                let mut set = HashSet::new();
                set.insert(vid);
                if !self.values.contains_key(&vid) {
                    self.values.insert(
                        vid,
                        AbstractValue {
                            kind: ValueKind::Mutable,
                            reason: hashset_of(ValueReason::Other),
                        },
                    );
                }
                set
            }
        };
        self.variables.insert(into, values);
    }

    fn append_alias(&mut self, place: IdentifierId, value: IdentifierId) {
        let new_values = match self.variables.get(&value) {
            Some(v) => v.clone(),
            None => return,
        };
        let prev_values = match self.variables.get(&place) {
            Some(v) => v.clone(),
            None => return,
        };
        let merged: HashSet<ValueId> = prev_values.union(&new_values).copied().collect();
        self.variables.insert(place, merged);
    }

    fn is_defined(&self, place_id: IdentifierId) -> bool {
        self.variables.contains_key(&place_id)
    }

    fn values_for(&self, place_id: IdentifierId) -> Vec<ValueId> {
        match self.variables.get(&place_id) {
            Some(values) => values.iter().copied().collect(),
            None => Vec::new(),
        }
    }

    #[allow(dead_code)]
    fn kind_opt(&self, place_id: IdentifierId) -> Option<AbstractValue> {
        let values = self.variables.get(&place_id)?;
        let mut merged_kind: Option<AbstractValue> = None;
        for value_id in values {
            let kind = self.values.get(value_id)?;
            merged_kind = Some(match merged_kind {
                Some(prev) => merge_abstract_values(&prev, kind),
                None => kind.clone(),
            });
        }
        merged_kind
    }

    fn kind(&self, place_id: IdentifierId) -> AbstractValue {
        self.kind_with_loc(place_id, None)
    }

    fn freeze(&mut self, place_id: IdentifierId, reason: ValueReason) -> bool {
        // Check if defined first to avoid recording uninitialized access error.
        // Freeze on undefined identifiers is a no-op — this matches the TS
        // behavior where freeze() is never called on undefined identifiers
        // (the invariant in kind() catches this before freeze is reached).
        if !self.variables.contains_key(&place_id) {
            return false;
        }
        let value = self.kind(place_id);
        match value.kind {
            ValueKind::Context | ValueKind::Mutable | ValueKind::MaybeFrozen => {
                let value_ids: Vec<ValueId> = self.values_for(place_id);
                for vid in value_ids {
                    self.freeze_value(vid, reason);
                }
                true
            }
            ValueKind::Frozen | ValueKind::Global | ValueKind::Primitive => false,
        }
    }

    fn freeze_value(&mut self, value_id: ValueId, reason: ValueReason) {
        self.values.insert(
            value_id,
            AbstractValue {
                kind: ValueKind::Frozen,
                reason: hashset_of(reason),
            },
        );
        // Note: In TS, this also transitively freezes FunctionExpression captures
        // if enableTransitivelyFreezeFunctionExpressions is set. We skip that here
        // since we don't have access to the function arena from within state.
    }

    #[allow(dead_code)]
    fn mutate(
        &self,
        variant: MutateVariant,
        place_id: IdentifierId,
        env: &Environment,
    ) -> MutationResult {
        self.mutate_with_loc(variant, place_id, env, None)
    }

    fn mutate_with_loc(
        &self,
        variant: MutateVariant,
        place_id: IdentifierId,
        env: &Environment,
        usage_loc: Option<SourceLocation>,
    ) -> MutationResult {
        let ty = &env.types[env.identifiers[place_id.0 as usize].type_.0 as usize];
        if react_compiler_hir::is_ref_or_ref_value(ty) {
            return MutationResult::MutateRef;
        }
        let kind = self.kind_with_loc(place_id, usage_loc).kind;
        match variant {
            MutateVariant::MutateConditionally | MutateVariant::MutateTransitiveConditionally => {
                match kind {
                    ValueKind::Mutable | ValueKind::Context => MutationResult::Mutate,
                    _ => MutationResult::None,
                }
            }
            MutateVariant::Mutate | MutateVariant::MutateTransitive => match kind {
                ValueKind::Mutable | ValueKind::Context => MutationResult::Mutate,
                ValueKind::Primitive => MutationResult::None,
                ValueKind::Frozen | ValueKind::MaybeFrozen => MutationResult::MutateFrozen,
                ValueKind::Global => MutationResult::MutateGlobal,
            },
        }
    }

    fn merge(&self, other: &InferenceState) -> Option<InferenceState> {
        let mut next_values: Option<HashMap<ValueId, AbstractValue>> = None;
        let mut next_variables: Option<HashMap<IdentifierId, HashSet<ValueId>>> = None;

        // Merge values present in both
        for (id, this_value) in &self.values {
            if let Some(other_value) = other.values.get(id) {
                let merged = merge_abstract_values(this_value, other_value);
                if merged.kind != this_value.kind
                    || !is_superset(&this_value.reason, &merged.reason)
                {
                    let nv = next_values.get_or_insert_with(|| self.values.clone());
                    nv.insert(*id, merged);
                }
            }
        }
        // Add values only in other
        for (id, other_value) in &other.values {
            if !self.values.contains_key(id) {
                let nv = next_values.get_or_insert_with(|| self.values.clone());
                nv.insert(*id, other_value.clone());
            }
        }

        // Merge variables present in both
        for (id, this_values) in &self.variables {
            if let Some(other_values) = other.variables.get(id) {
                let mut has_new = false;
                for ov in other_values {
                    if !this_values.contains(ov) {
                        has_new = true;
                        break;
                    }
                }
                if has_new {
                    let nvars = next_variables.get_or_insert_with(|| self.variables.clone());
                    let merged: HashSet<ValueId> =
                        this_values.union(other_values).copied().collect();
                    nvars.insert(*id, merged);
                }
            }
        }
        // Add variables only in other
        for (id, other_values) in &other.variables {
            if !self.variables.contains_key(id) {
                let nvars = next_variables.get_or_insert_with(|| self.variables.clone());
                nvars.insert(*id, other_values.clone());
            }
        }

        if next_variables.is_none() && next_values.is_none() {
            None
        } else {
            Some(InferenceState {
                is_function_expression: self.is_function_expression,
                values: next_values.unwrap_or_else(|| self.values.clone()),
                variables: next_variables.unwrap_or_else(|| self.variables.clone()),
                uninitialized_access: std::cell::Cell::new(None),
            })
        }
    }

    fn infer_phi(
        &mut self,
        phi_place_id: IdentifierId,
        phi_operands: &indexmap::IndexMap<BlockId, Place>,
    ) {
        let mut values: HashSet<ValueId> = HashSet::new();
        for (_, operand) in phi_operands {
            if let Some(operand_values) = self.variables.get(&operand.identifier) {
                for v in operand_values {
                    values.insert(*v);
                }
            }
            // If not found, it's a backedge that will be handled later by merge
        }
        if !values.is_empty() {
            self.variables.insert(phi_place_id, values);
        }
    }
}

fn is_superset(a: &IndexSet<ValueReason>, b: &IndexSet<ValueReason>) -> bool {
    b.iter().all(|x| a.contains(x))
}

#[derive(Debug, Clone, Copy)]
enum MutateVariant {
    Mutate,
    MutateConditionally,
    MutateTransitive,
    MutateTransitiveConditionally,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MutationResult {
    None,
    Mutate,
    MutateFrozen,
    MutateGlobal,
    MutateRef,
}

// =============================================================================
// Context
// =============================================================================

struct Context {
    interned_effects: HashMap<String, AliasingEffect>,
    instruction_signature_cache: HashMap<u32, InstructionSignature>,
    catch_handlers: HashMap<BlockId, Place>,
    is_function_expression: bool,
    hoisted_context_declarations: HashMap<DeclarationId, Option<Place>>,
    non_mutating_spreads: HashSet<IdentifierId>,
    /// Cache of ValueIds keyed by effect hash, ensuring stable allocation-site identity
    /// across fixpoint iterations. Mirrors TS `effectInstructionValueCache`.
    effect_value_id_cache: HashMap<String, ValueId>,
    /// Maps ValueId to FunctionId for function expressions, so we can look up
    /// locally-declared functions when processing Apply effects.
    function_values: HashMap<ValueId, FunctionId>,
    /// Cache of function expression signatures, keyed by FunctionId
    function_signature_cache: HashMap<FunctionId, AliasingSignature>,
    /// Cache of temporary places created for aliasing signature config temporaries.
    /// Keyed by (lvalue_identifier_id, temp_name) to ensure stable allocation
    /// across fixpoint iterations.
    aliasing_config_temp_cache: HashMap<(IdentifierId, String), Place>,
}

impl Context {
    fn intern_effect(&mut self, effect: AliasingEffect) -> AliasingEffect {
        let hash = hash_effect(&effect);
        self.interned_effects.entry(hash).or_insert(effect).clone()
    }

    /// Get or create a stable ValueId for a given effect, ensuring fixpoint convergence.
    fn get_or_create_value_id(&mut self, effect: &AliasingEffect) -> ValueId {
        let hash = hash_effect(effect);
        *self
            .effect_value_id_cache
            .entry(hash)
            .or_insert_with(ValueId::new)
    }
}

struct InstructionSignature {
    effects: Vec<AliasingEffect>,
}

// =============================================================================
// Helper: hash_effect
// =============================================================================

fn hash_effect(effect: &AliasingEffect) -> String {
    match effect {
        AliasingEffect::Apply {
            receiver,
            function,
            mutates_function,
            args,
            into,
            ..
        } => {
            let args_str: Vec<String> = args
                .iter()
                .map(|a| match a {
                    PlaceOrSpreadOrHole::Hole => String::new(),
                    PlaceOrSpreadOrHole::Place(p) => format!("{}", p.identifier.0),
                    PlaceOrSpreadOrHole::Spread(s) => format!("...{}", s.place.identifier.0),
                })
                .collect();
            format!(
                "Apply:{}:{}:{}:{}:{}",
                receiver.identifier.0,
                function.identifier.0,
                mutates_function,
                args_str.join(","),
                into.identifier.0
            )
        }
        AliasingEffect::CreateFrom { from, into } => {
            format!("CreateFrom:{}:{}", from.identifier.0, into.identifier.0)
        }
        AliasingEffect::ImmutableCapture { from, into } => format!(
            "ImmutableCapture:{}:{}",
            from.identifier.0, into.identifier.0
        ),
        AliasingEffect::Assign { from, into } => {
            format!("Assign:{}:{}", from.identifier.0, into.identifier.0)
        }
        AliasingEffect::Alias { from, into } => {
            format!("Alias:{}:{}", from.identifier.0, into.identifier.0)
        }
        AliasingEffect::Capture { from, into } => {
            format!("Capture:{}:{}", from.identifier.0, into.identifier.0)
        }
        AliasingEffect::MaybeAlias { from, into } => {
            format!("MaybeAlias:{}:{}", from.identifier.0, into.identifier.0)
        }
        AliasingEffect::Create {
            into,
            value,
            reason,
        } => format!("Create:{}:{:?}:{:?}", into.identifier.0, value, reason),
        AliasingEffect::Freeze { value, reason } => {
            format!("Freeze:{}:{:?}", value.identifier.0, reason)
        }
        AliasingEffect::Impure { place, .. } => format!("Impure:{}", place.identifier.0),
        AliasingEffect::Render { place } => format!("Render:{}", place.identifier.0),
        AliasingEffect::MutateFrozen { place, error } => format!(
            "MutateFrozen:{}:{}:{:?}",
            place.identifier.0, error.reason, error.description
        ),
        AliasingEffect::MutateGlobal { place, error } => format!(
            "MutateGlobal:{}:{}:{:?}",
            place.identifier.0, error.reason, error.description
        ),
        AliasingEffect::Mutate { value, .. } => format!("Mutate:{}", value.identifier.0),
        AliasingEffect::MutateConditionally { value } => {
            format!("MutateConditionally:{}", value.identifier.0)
        }
        AliasingEffect::MutateTransitive { value } => {
            format!("MutateTransitive:{}", value.identifier.0)
        }
        AliasingEffect::MutateTransitiveConditionally { value } => {
            format!("MutateTransitiveConditionally:{}", value.identifier.0)
        }
        AliasingEffect::CreateFunction {
            into,
            function_id,
            captures,
        } => {
            let cap_str: Vec<String> = captures
                .iter()
                .map(|p| format!("{}", p.identifier.0))
                .collect();
            format!(
                "CreateFunction:{}:{}:{}",
                into.identifier.0,
                function_id.0,
                cap_str.join(",")
            )
        }
    }
}

// =============================================================================
// merge helpers
// =============================================================================

fn merge_abstract_values(a: &AbstractValue, b: &AbstractValue) -> AbstractValue {
    let kind = merge_value_kinds(a.kind, b.kind);
    if kind == a.kind && kind == b.kind && is_superset(&a.reason, &b.reason) {
        return a.clone();
    }
    let mut reason = a.reason.clone();
    for r in &b.reason {
        reason.insert(*r);
    }
    AbstractValue { kind, reason }
}

fn merge_value_kinds(a: ValueKind, b: ValueKind) -> ValueKind {
    if a == b {
        return a;
    }
    if a == ValueKind::MaybeFrozen || b == ValueKind::MaybeFrozen {
        return ValueKind::MaybeFrozen;
    }
    if a == ValueKind::Mutable || b == ValueKind::Mutable {
        if a == ValueKind::Frozen || b == ValueKind::Frozen {
            return ValueKind::MaybeFrozen;
        } else if a == ValueKind::Context || b == ValueKind::Context {
            return ValueKind::Context;
        } else {
            return ValueKind::Mutable;
        }
    }
    if a == ValueKind::Context || b == ValueKind::Context {
        if a == ValueKind::Frozen || b == ValueKind::Frozen {
            return ValueKind::MaybeFrozen;
        } else {
            return ValueKind::Context;
        }
    }
    if a == ValueKind::Frozen || b == ValueKind::Frozen {
        return ValueKind::Frozen;
    }
    if a == ValueKind::Global || b == ValueKind::Global {
        return ValueKind::Global;
    }
    ValueKind::Primitive
}

// =============================================================================
// Pre-passes
// =============================================================================

fn find_hoisted_context_declarations(
    func: &HirFunction,
    env: &Environment,
) -> HashMap<DeclarationId, Option<Place>> {
    let mut hoisted: HashMap<DeclarationId, Option<Place>> = HashMap::new();

    fn visit(
        hoisted: &mut HashMap<DeclarationId, Option<Place>>,
        place: &Place,
        env: &Environment,
    ) {
        let decl_id = env.identifiers[place.identifier.0 as usize].declaration_id;
        if hoisted.contains_key(&decl_id) && hoisted.get(&decl_id).unwrap().is_none() {
            hoisted.insert(decl_id, Some(place.clone()));
        }
    }

    for (_block_id, block) in &func.body.blocks {
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::DeclareContext { lvalue, .. } => {
                    let kind = lvalue.kind;
                    if kind == InstructionKind::HoistedConst
                        || kind == InstructionKind::HoistedFunction
                        || kind == InstructionKind::HoistedLet
                    {
                        let decl_id =
                            env.identifiers[lvalue.place.identifier.0 as usize].declaration_id;
                        hoisted.insert(decl_id, None);
                    }
                }
                _ => {
                    for operand in visitors::each_instruction_value_operand(&instr.value, env) {
                        visit(&mut hoisted, &operand, env);
                    }
                }
            }
        }
        for operand in visitors::each_terminal_operand(&block.terminal) {
            visit(&mut hoisted, &operand, env);
        }
    }
    hoisted
}

fn find_non_mutated_destructure_spreads(
    func: &HirFunction,
    env: &Environment,
) -> HashSet<IdentifierId> {
    let mut known_frozen: HashSet<IdentifierId> = HashSet::new();
    if func.fn_type == ReactFunctionType::Component {
        if let Some(param) = func.params.first() {
            if let ParamPattern::Place(p) = param {
                known_frozen.insert(p.identifier);
            }
        }
    } else {
        for param in &func.params {
            if let ParamPattern::Place(p) = param {
                known_frozen.insert(p.identifier);
            }
        }
    }

    let mut candidate_non_mutating_spreads: HashMap<IdentifierId, IdentifierId> = HashMap::new();
    for (_block_id, block) in &func.body.blocks {
        if !candidate_non_mutating_spreads.is_empty() {
            for phi in &block.phis {
                for (_, operand) in &phi.operands {
                    if let Some(spread) = candidate_non_mutating_spreads
                        .get(&operand.identifier)
                        .copied()
                    {
                        candidate_non_mutating_spreads.remove(&spread);
                    }
                }
            }
        }
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let lvalue_id = instr.lvalue.identifier;
            match &instr.value {
                InstructionValue::Destructure { lvalue, value, .. } => {
                    if !known_frozen.contains(&value.identifier) {
                        continue;
                    }
                    if !(lvalue.kind == InstructionKind::Let
                        || lvalue.kind == InstructionKind::Const)
                    {
                        continue;
                    }
                    match &lvalue.pattern {
                        react_compiler_hir::Pattern::Object(obj_pat) => {
                            for prop in &obj_pat.properties {
                                if let react_compiler_hir::ObjectPropertyOrSpread::Spread(s) = prop
                                {
                                    candidate_non_mutating_spreads
                                        .insert(s.place.identifier, s.place.identifier);
                                }
                            }
                        }
                        _ => continue,
                    }
                }
                InstructionValue::LoadLocal { place, .. } => {
                    if let Some(spread) = candidate_non_mutating_spreads
                        .get(&place.identifier)
                        .copied()
                    {
                        candidate_non_mutating_spreads.insert(lvalue_id, spread);
                    }
                }
                InstructionValue::StoreLocal {
                    lvalue: sl,
                    value: sv,
                    ..
                } => {
                    if let Some(spread) =
                        candidate_non_mutating_spreads.get(&sv.identifier).copied()
                    {
                        candidate_non_mutating_spreads.insert(lvalue_id, spread);
                        candidate_non_mutating_spreads.insert(sl.place.identifier, spread);
                    }
                }
                InstructionValue::JsxFragment { .. } | InstructionValue::JsxExpression { .. } => {
                    // Passing objects created with spread to jsx can't mutate them
                }
                InstructionValue::PropertyLoad { .. } => {
                    // Properties must be frozen since the original value was frozen
                }
                InstructionValue::CallExpression { callee, .. }
                | InstructionValue::MethodCall {
                    property: callee, ..
                } => {
                    let callee_ty =
                        &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                    if get_hook_kind_for_type(env, callee_ty)
                        .ok()
                        .flatten()
                        .is_some()
                    {
                        if !is_ref_or_ref_value_for_id(env, lvalue_id) {
                            known_frozen.insert(lvalue_id);
                        }
                    } else if !candidate_non_mutating_spreads.is_empty() {
                        for operand in visitors::each_instruction_value_operand(&instr.value, env) {
                            if let Some(spread) = candidate_non_mutating_spreads
                                .get(&operand.identifier)
                                .copied()
                            {
                                candidate_non_mutating_spreads.remove(&spread);
                            }
                        }
                    }
                }
                _ => {
                    if !candidate_non_mutating_spreads.is_empty() {
                        for operand in visitors::each_instruction_value_operand(&instr.value, env) {
                            if let Some(spread) = candidate_non_mutating_spreads
                                .get(&operand.identifier)
                                .copied()
                            {
                                candidate_non_mutating_spreads.remove(&spread);
                            }
                        }
                    }
                }
            }
        }
    }

    let mut non_mutating: HashSet<IdentifierId> = HashSet::new();
    for (key, value) in &candidate_non_mutating_spreads {
        if key == value {
            non_mutating.insert(*key);
        }
    }
    non_mutating
}

// =============================================================================
// inferParam
// =============================================================================

fn infer_param(param: &ParamPattern, state: &mut InferenceState, param_kind: &AbstractValue) {
    let place = match param {
        ParamPattern::Place(p) => p,
        ParamPattern::Spread(s) => &s.place,
    };
    let value_id = ValueId::new();
    state.initialize(value_id, param_kind.clone());
    state.define(place.identifier, value_id);
}

// =============================================================================
// inferBlock
// =============================================================================

fn infer_block(
    context: &mut Context,
    state: &mut InferenceState,
    block_id: BlockId,
    func: &mut HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerDiagnostic> {
    let block = &func.body.blocks[&block_id];

    // Process phis
    let phis: Vec<(IdentifierId, indexmap::IndexMap<BlockId, Place>)> = block
        .phis
        .iter()
        .map(|phi| (phi.place.identifier, phi.operands.clone()))
        .collect();
    for (place_id, operands) in &phis {
        state.infer_phi(*place_id, operands);
    }

    // Process instructions
    let instr_ids: Vec<u32> = block.instructions.iter().map(|id| id.0).collect();
    for instr_idx in &instr_ids {
        let instr_index = *instr_idx as usize;

        // Compute signature if not cached
        if !context.instruction_signature_cache.contains_key(instr_idx) {
            let sig = compute_signature_for_instruction(
                context,
                env,
                &func.instructions[instr_index],
                func,
            );
            context.instruction_signature_cache.insert(*instr_idx, sig);
        }

        // Apply signature
        let effects = apply_signature(
            context,
            state,
            *instr_idx,
            &func.instructions[instr_index],
            env,
            func,
        )?;
        func.instructions[instr_index].effects = effects;
    }

    // Process terminal
    // Determine what terminal action to take without holding borrows
    enum TerminalAction {
        Try { handler: BlockId, binding: Place },
        MaybeThrow { handler_id: BlockId },
        Return,
        None,
    }
    let action = {
        let block = &func.body.blocks[&block_id];
        match &block.terminal {
            react_compiler_hir::Terminal::Try {
                handler,
                handler_binding: Some(binding),
                ..
            } => TerminalAction::Try {
                handler: *handler,
                binding: binding.clone(),
            },
            react_compiler_hir::Terminal::MaybeThrow {
                handler: Some(handler_id),
                ..
            } => TerminalAction::MaybeThrow {
                handler_id: *handler_id,
            },
            react_compiler_hir::Terminal::Return { .. } => TerminalAction::Return,
            _ => TerminalAction::None,
        }
    };

    match action {
        TerminalAction::Try { handler, binding } => {
            context.catch_handlers.insert(handler, binding);
        }
        TerminalAction::MaybeThrow { handler_id } => {
            if let Some(handler_param) = context.catch_handlers.get(&handler_id).cloned() {
                if state.is_defined(handler_param.identifier) {
                    let mut terminal_effects: Vec<AliasingEffect> = Vec::new();
                    for instr_idx in &instr_ids {
                        let instr = &func.instructions[*instr_idx as usize];
                        match &instr.value {
                            InstructionValue::CallExpression { .. }
                            | InstructionValue::MethodCall { .. } => {
                                state.append_alias(
                                    handler_param.identifier,
                                    instr.lvalue.identifier,
                                );
                                let kind = state.kind(instr.lvalue.identifier).kind;
                                if kind == ValueKind::Mutable || kind == ValueKind::Context {
                                    terminal_effects.push(context.intern_effect(
                                        AliasingEffect::Alias {
                                            from: instr.lvalue.clone(),
                                            into: handler_param.clone(),
                                        },
                                    ));
                                }
                            }
                            _ => {}
                        }
                    }
                    let block_mut = func.body.blocks.get_mut(&block_id).unwrap();
                    if let react_compiler_hir::Terminal::MaybeThrow {
                        effects: ref mut term_effects,
                        ..
                    } = block_mut.terminal
                    {
                        *term_effects = if terminal_effects.is_empty() {
                            None
                        } else {
                            Some(terminal_effects)
                        };
                    }
                }
            }
        }
        TerminalAction::Return => {
            if !context.is_function_expression {
                let block_mut = func.body.blocks.get_mut(&block_id).unwrap();
                if let react_compiler_hir::Terminal::Return {
                    ref value,
                    effects: ref mut term_effects,
                    ..
                } = block_mut.terminal
                {
                    *term_effects = Some(vec![context.intern_effect(AliasingEffect::Freeze {
                        value: value.clone(),
                        reason: ValueReason::JsxCaptured,
                    })]);
                }
            }
        }
        TerminalAction::None => {}
    }
    Ok(())
}

// =============================================================================
// applySignature
// =============================================================================

fn apply_signature(
    context: &mut Context,
    state: &mut InferenceState,
    instr_idx: u32,
    instr: &react_compiler_hir::Instruction,
    env: &mut Environment,
    func: &HirFunction,
) -> Result<Option<Vec<AliasingEffect>>, CompilerDiagnostic> {
    let mut effects: Vec<AliasingEffect> = Vec::new();

    // For function instructions, validate frozen mutation
    match &instr.value {
        InstructionValue::FunctionExpression { lowered_func, .. }
        | InstructionValue::ObjectMethod { lowered_func, .. } => {
            let inner_func = &env.functions[lowered_func.func.0 as usize];
            if let Some(ref aliasing_effects) = inner_func.aliasing_effects {
                let context_ids: HashSet<IdentifierId> =
                    inner_func.context.iter().map(|p| p.identifier).collect();
                for effect in aliasing_effects {
                    let (mutate_value, is_mutate) = match effect {
                        AliasingEffect::Mutate { value, .. } => (value, true),
                        AliasingEffect::MutateTransitive { value } => (value, false),
                        _ => continue,
                    };
                    if !context_ids.contains(&mutate_value.identifier) {
                        continue;
                    }
                    if !state.is_defined(mutate_value.identifier) {
                        continue;
                    }
                    let value_abstract = state.kind(mutate_value.identifier);
                    if value_abstract.kind == ValueKind::Frozen {
                        let reason_str = get_write_error_reason(&value_abstract);
                        let ident = &env.identifiers[mutate_value.identifier.0 as usize];
                        let variable = match &ident.name {
                            Some(react_compiler_hir::IdentifierName::Named(n)) => {
                                format!("`{}`", n)
                            }
                            _ => "value".to_string(),
                        };
                        let mut diagnostic = CompilerDiagnostic::new(
                            ErrorCategory::Immutability,
                            "This value cannot be modified",
                            Some(reason_str),
                        );
                        diagnostic.details.push(
                            react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
                                loc: mutate_value.loc,
                                message: Some(format!("{} cannot be modified", variable)),
                                identifier_name: None,
                            },
                        );
                        if is_mutate {
                            if let AliasingEffect::Mutate {
                                reason: Some(MutationReason::AssignCurrentProperty),
                                ..
                            } = effect
                            {
                                diagnostic.details.push(react_compiler_diagnostics::CompilerDiagnosticDetail::Hint {
                                    message: "Hint: If this value is a Ref (value returned by `useRef()`), rename the variable to end in \"Ref\".".to_string()
                                });
                            }
                        }
                        effects.push(AliasingEffect::MutateFrozen {
                            place: mutate_value.clone(),
                            error: diagnostic,
                        });
                    }
                }
            }
        }
        _ => {}
    }

    // Track which values we've already initialized
    let mut initialized: HashSet<IdentifierId> = HashSet::new();

    // Get the cached signature effects
    let sig = context.instruction_signature_cache.get(&instr_idx).unwrap();
    let sig_effects: Vec<AliasingEffect> = sig.effects.clone();

    for effect in &sig_effects {
        apply_effect(
            context,
            state,
            effect.clone(),
            &mut initialized,
            &mut effects,
            env,
            func,
        )?;
    }

    // If lvalue is not yet defined, initialize it with a default value.
    // The TS version asserts this as an invariant, but the Rust port may have
    // edge cases where effects don't cover the lvalue (e.g. missing signature entries).
    if !state.is_defined(instr.lvalue.identifier) {
        let vid = ValueId(instr.lvalue.identifier.0 | 0x80000000);
        state.initialize(
            vid,
            AbstractValue {
                kind: ValueKind::Mutable,
                reason: hashset_of(ValueReason::Other),
            },
        );
        state.define(instr.lvalue.identifier, vid);
    }

    Ok(if effects.is_empty() {
        None
    } else {
        Some(effects)
    })
}

// =============================================================================
// Transitive freeze helper
// =============================================================================

/// Recursively freeze through FunctionExpression captures. If `value_id`
/// corresponds to a FunctionExpression, freeze each of its context captures
/// and recurse into any that are themselves FunctionExpressions. This matches
/// the TS `freezeValue` → `freeze` → `freezeValue` recursion chain.
fn freeze_function_captures_transitive(
    state: &mut InferenceState,
    context: &Context,
    env: &Environment,
    value_id: ValueId,
    reason: ValueReason,
) {
    if let Some(&func_id) = context.function_values.get(&value_id) {
        let ctx_ids: Vec<IdentifierId> = env.functions[func_id.0 as usize]
            .context
            .iter()
            .map(|p| p.identifier)
            .collect();
        for ctx_id in ctx_ids {
            // Replicate InferenceState::freeze() logic inline —
            // we need to recurse with context/env which freeze() doesn't have.
            if !state.variables.contains_key(&ctx_id) {
                continue;
            }
            let kind = state.kind(ctx_id).kind;
            match kind {
                ValueKind::Context | ValueKind::Mutable | ValueKind::MaybeFrozen => {
                    let vids: Vec<ValueId> = state.values_for(ctx_id);
                    for vid in vids {
                        state.freeze_value(vid, reason);
                        // Recurse into nested function captures
                        freeze_function_captures_transitive(state, context, env, vid, reason);
                    }
                }
                ValueKind::Frozen | ValueKind::Global | ValueKind::Primitive => {
                    // Already frozen or immutable — no-op
                }
            }
        }
    }
}

// =============================================================================
// applyEffect
// =============================================================================

fn apply_effect(
    context: &mut Context,
    state: &mut InferenceState,
    effect: AliasingEffect,
    initialized: &mut HashSet<IdentifierId>,
    effects: &mut Vec<AliasingEffect>,
    env: &mut Environment,
    func: &HirFunction,
) -> Result<(), CompilerDiagnostic> {
    let effect = context.intern_effect(effect);
    match effect {
        AliasingEffect::Freeze { ref value, reason } => {
            let did_freeze = state.freeze(value.identifier, reason);
            if did_freeze {
                effects.push(effect.clone());
                // Transitively freeze FunctionExpression captures if enabled
                // (matches TS freezeValue which recurses into func.context)
                let enable_transitive = env.config.enable_preserve_existing_memoization_guarantees
                    || env.config.enable_transitively_freeze_function_expressions;
                if enable_transitive {
                    // Recursively freeze through function captures. The TS
                    // freezeValue() calls freeze() on each capture, which
                    // calls freezeValue() again — creating a transitive
                    // closure through arbitrarily nested function captures.
                    let value_ids: Vec<ValueId> = state.values_for(value.identifier);
                    for vid in &value_ids {
                        freeze_function_captures_transitive(state, context, env, *vid, reason);
                    }
                }
            }
        }
        AliasingEffect::Create {
            ref into,
            value: kind,
            reason,
        } => {
            assert!(
                !initialized.contains(&into.identifier),
                "[InferMutationAliasingEffects] Cannot re-initialize variable within an instruction"
            );
            initialized.insert(into.identifier);
            let value_id = context.get_or_create_value_id(&effect);
            state.initialize(
                value_id,
                AbstractValue {
                    kind,
                    reason: hashset_of(reason),
                },
            );
            state.define(into.identifier, value_id);
            effects.push(effect.clone());
        }
        AliasingEffect::ImmutableCapture { ref from, .. } => {
            let kind = state.kind(from.identifier).kind;
            match kind {
                ValueKind::Global | ValueKind::Primitive => {
                    // no-op: don't track data flow for copy types
                }
                _ => {
                    effects.push(effect.clone());
                }
            }
        }
        AliasingEffect::CreateFrom { ref from, ref into } => {
            assert!(
                !initialized.contains(&into.identifier),
                "[InferMutationAliasingEffects] Cannot re-initialize variable within an instruction"
            );
            initialized.insert(into.identifier);
            let from_value = state.kind(from.identifier);
            let value_id = context.get_or_create_value_id(&effect);
            state.initialize(
                value_id,
                AbstractValue {
                    kind: from_value.kind,
                    reason: from_value.reason.clone(),
                },
            );
            state.define(into.identifier, value_id);
            match from_value.kind {
                ValueKind::Primitive | ValueKind::Global => {
                    let first_reason = primary_reason(&from_value.reason);
                    effects.push(AliasingEffect::Create {
                        value: from_value.kind,
                        into: into.clone(),
                        reason: first_reason,
                    });
                }
                ValueKind::Frozen => {
                    let first_reason = primary_reason(&from_value.reason);
                    effects.push(AliasingEffect::Create {
                        value: from_value.kind,
                        into: into.clone(),
                        reason: first_reason,
                    });
                    apply_effect(
                        context,
                        state,
                        AliasingEffect::ImmutableCapture {
                            from: from.clone(),
                            into: into.clone(),
                        },
                        initialized,
                        effects,
                        env,
                        func,
                    )?;
                }
                _ => {
                    effects.push(effect.clone());
                }
            }
        }
        AliasingEffect::CreateFunction {
            ref captures,
            function_id,
            ref into,
        } => {
            assert!(
                !initialized.contains(&into.identifier),
                "[InferMutationAliasingEffects] Cannot re-initialize variable within an instruction"
            );
            initialized.insert(into.identifier);
            effects.push(effect.clone());

            // Check if function is mutable
            let has_captures = captures.iter().any(|capture| {
                if !state.is_defined(capture.identifier) {
                    return false;
                }
                let k = state.kind(capture.identifier).kind;
                k == ValueKind::Context || k == ValueKind::Mutable
            });

            let inner_func = &env.functions[function_id.0 as usize];
            let has_tracked_side_effects = inner_func
                .aliasing_effects
                .as_ref()
                .map(|effs| {
                    effs.iter().any(|e| {
                        matches!(
                            e,
                            AliasingEffect::MutateFrozen { .. }
                                | AliasingEffect::MutateGlobal { .. }
                                | AliasingEffect::Impure { .. }
                        )
                    })
                })
                .unwrap_or(false);

            let captures_ref = inner_func
                .context
                .iter()
                .any(|operand| is_ref_or_ref_value_for_id(env, operand.identifier));

            let is_mutable = has_captures || has_tracked_side_effects || captures_ref;

            // Update context variable effects
            let context_places: Vec<Place> = inner_func.context.clone();
            for operand in &context_places {
                if operand.effect != Effect::Capture {
                    continue;
                }
                if !state.is_defined(operand.identifier) {
                    continue;
                }
                let kind = state.kind(operand.identifier).kind;
                if kind == ValueKind::Primitive
                    || kind == ValueKind::Frozen
                    || kind == ValueKind::Global
                {
                    // Downgrade to Read - we need to mutate the inner function
                    let inner_func_mut = &mut env.functions[function_id.0 as usize];
                    for ctx in &mut inner_func_mut.context {
                        if ctx.identifier == operand.identifier && ctx.effect == Effect::Capture {
                            ctx.effect = Effect::Read;
                        }
                    }
                }
            }

            let value_id = context.get_or_create_value_id(&effect);
            // Track this value as a function expression so Apply can look it up
            context.function_values.insert(value_id, function_id);
            state.initialize(
                value_id,
                AbstractValue {
                    kind: if is_mutable {
                        ValueKind::Mutable
                    } else {
                        ValueKind::Frozen
                    },
                    reason: IndexSet::new(),
                },
            );
            state.define(into.identifier, value_id);

            for capture in captures {
                apply_effect(
                    context,
                    state,
                    AliasingEffect::Capture {
                        from: capture.clone(),
                        into: into.clone(),
                    },
                    initialized,
                    effects,
                    env,
                    func,
                )?;
            }
        }
        AliasingEffect::MaybeAlias { ref from, ref into }
        | AliasingEffect::Alias { ref from, ref into }
        | AliasingEffect::Capture { ref from, ref into } => {
            let is_capture = matches!(effect, AliasingEffect::Capture { .. });
            let is_maybe_alias = matches!(effect, AliasingEffect::MaybeAlias { .. });
            // For Alias, destination must already be initialized (Capture/MaybeAlias are exempt)
            assert!(
                is_capture || is_maybe_alias || initialized.contains(&into.identifier),
                "[InferMutationAliasingEffects] Expected destination to already be initialized within this instruction"
            );

            // Check destination kind
            let into_kind = state.kind_with_loc(into.identifier, into.loc).kind;
            let destination_type = match into_kind {
                ValueKind::Context => Some("context"),
                ValueKind::Mutable | ValueKind::MaybeFrozen => Some("mutable"),
                _ => None,
            };

            let from_kind = state.kind_with_loc(from.identifier, from.loc).kind;
            let source_type = match from_kind {
                ValueKind::Context => Some("context"),
                ValueKind::Global | ValueKind::Primitive => None,
                ValueKind::MaybeFrozen | ValueKind::Frozen => Some("frozen"),
                ValueKind::Mutable => Some("mutable"),
            };

            if source_type == Some("frozen") {
                apply_effect(
                    context,
                    state,
                    AliasingEffect::ImmutableCapture {
                        from: from.clone(),
                        into: into.clone(),
                    },
                    initialized,
                    effects,
                    env,
                    func,
                )?;
            } else if (source_type == Some("mutable") && destination_type == Some("mutable"))
                || is_maybe_alias
            {
                effects.push(effect.clone());
            } else if (source_type == Some("context") && destination_type.is_some())
                || (source_type == Some("mutable") && destination_type == Some("context"))
            {
                apply_effect(
                    context,
                    state,
                    AliasingEffect::MaybeAlias {
                        from: from.clone(),
                        into: into.clone(),
                    },
                    initialized,
                    effects,
                    env,
                    func,
                )?;
            }
        }
        AliasingEffect::Assign { ref from, ref into } => {
            assert!(
                !initialized.contains(&into.identifier),
                "[InferMutationAliasingEffects] Cannot re-initialize variable within an instruction"
            );
            initialized.insert(into.identifier);
            let from_value = state.kind_with_loc(from.identifier, from.loc);
            match from_value.kind {
                ValueKind::Frozen => {
                    apply_effect(
                        context,
                        state,
                        AliasingEffect::ImmutableCapture {
                            from: from.clone(),
                            into: into.clone(),
                        },
                        initialized,
                        effects,
                        env,
                        func,
                    )?;
                    let cache_key =
                        format!("Assign_frozen:{}:{}", from.identifier.0, into.identifier.0);
                    let value_id = *context
                        .effect_value_id_cache
                        .entry(cache_key)
                        .or_insert_with(ValueId::new);
                    state.initialize(
                        value_id,
                        AbstractValue {
                            kind: from_value.kind,
                            reason: from_value.reason.clone(),
                        },
                    );
                    state.define(into.identifier, value_id);
                }
                ValueKind::Global | ValueKind::Primitive => {
                    let cache_key =
                        format!("Assign_copy:{}:{}", from.identifier.0, into.identifier.0);
                    let value_id = *context
                        .effect_value_id_cache
                        .entry(cache_key)
                        .or_insert_with(ValueId::new);
                    state.initialize(
                        value_id,
                        AbstractValue {
                            kind: from_value.kind,
                            reason: from_value.reason.clone(),
                        },
                    );
                    state.define(into.identifier, value_id);
                }
                _ => {
                    state.assign(into.identifier, from.identifier);
                    effects.push(effect.clone());
                }
            }
        }
        AliasingEffect::Apply {
            ref receiver,
            ref function,
            mutates_function,
            ref args,
            ref into,
            ref signature,
            ref loc,
        } => {
            // First, check if the callee is a locally-declared function expression
            // whose aliasing effects we already know (TS lines 1016-1068)
            if state.is_defined(function.identifier) {
                let function_values = state.values_for(function.identifier);
                if function_values.len() == 1 {
                    let value_id = function_values[0];
                    if let Some(func_id) = context.function_values.get(&value_id).copied() {
                        let inner_func = &env.functions[func_id.0 as usize];
                        if inner_func.aliasing_effects.is_some() {
                            // Build or retrieve the signature from the function expression
                            if !context.function_signature_cache.contains_key(&func_id) {
                                let sig = build_signature_from_function_expression(env, func_id);
                                context.function_signature_cache.insert(func_id, sig);
                            }
                            let sig = context
                                .function_signature_cache
                                .get(&func_id)
                                .unwrap()
                                .clone();
                            let inner_func = &env.functions[func_id.0 as usize];
                            let context_places: Vec<Place> = inner_func.context.clone();
                            let sig_effects = compute_effects_for_aliasing_signature(
                                env,
                                &sig,
                                into,
                                receiver,
                                args,
                                &context_places,
                                loc.as_ref(),
                            )?;
                            if let Some(sig_effs) = sig_effects {
                                // Conditionally mutate the function itself first
                                apply_effect(
                                    context,
                                    state,
                                    AliasingEffect::MutateTransitiveConditionally {
                                        value: function.clone(),
                                    },
                                    initialized,
                                    effects,
                                    env,
                                    func,
                                )?;
                                for se in sig_effs {
                                    apply_effect(
                                        context,
                                        state,
                                        se,
                                        initialized,
                                        effects,
                                        env,
                                        func,
                                    )?;
                                }
                                return Ok(());
                            }
                        }
                    }
                }
            }
            if let Some(sig) = signature {
                // Check known_incompatible (TS line 2351-2370)
                if let Some(ref incompatible_msg) = sig.known_incompatible {
                    if env.enable_validations() {
                        let mut diagnostic = CompilerDiagnostic::new(
                            ErrorCategory::IncompatibleLibrary,
                            "Use of incompatible library",
                            Some(
                                "This API returns functions which cannot be memoized without leading to stale UI. \
                                 To prevent this, by default React Compiler will skip memoizing this component/hook. \
                                 However, you may see issues if values from this API are passed to other components/hooks that are \
                                 memoized".to_string(),
                            ),
                        );
                        diagnostic.details.push(CompilerDiagnosticDetail::Error {
                            loc: receiver.loc,
                            message: Some(incompatible_msg.clone()),
                            identifier_name: None,
                        });
                        // TS throws here, aborting compilation for this function
                        return Err(diagnostic);
                    }
                }

                if let Some(ref aliasing) = sig.aliasing {
                    let sig_effects = compute_effects_for_aliasing_signature_config(
                        env,
                        aliasing,
                        into,
                        receiver,
                        args,
                        &[],
                        loc.as_ref(),
                        &mut context.aliasing_config_temp_cache,
                    )?;
                    if let Some(sig_effs) = sig_effects {
                        for se in sig_effs {
                            apply_effect(context, state, se, initialized, effects, env, func)?;
                        }
                        return Ok(());
                    }
                }

                // Legacy signature
                let mut todo_errors: Vec<react_compiler_diagnostics::CompilerErrorDetail> =
                    Vec::new();
                let legacy_effects = compute_effects_for_legacy_signature(
                    state,
                    sig,
                    into,
                    receiver,
                    args,
                    loc.as_ref(),
                    env,
                    &context.function_values,
                    &mut todo_errors,
                );
                // Todo errors should short-circuit (TS throws throwTodo)
                if let Some(err_detail) = todo_errors.into_iter().next() {
                    return Err(CompilerDiagnostic::from_detail(err_detail));
                }
                for le in legacy_effects {
                    apply_effect(context, state, le, initialized, effects, env, func)?;
                }
            } else {
                // No signature: default behavior
                apply_effect(
                    context,
                    state,
                    AliasingEffect::Create {
                        into: into.clone(),
                        value: ValueKind::Mutable,
                        reason: ValueReason::Other,
                    },
                    initialized,
                    effects,
                    env,
                    func,
                )?;

                let all_operands = build_apply_operands(receiver, function, args);
                for (operand, _is_function_operand, is_spread) in &all_operands {
                    // In TS, the check is `operand !== effect.function || effect.mutatesFunction`.
                    // This compares by reference identity, so for CallExpression/NewExpression
                    // where receiver === function, BOTH are skipped when !mutatesFunction.
                    if operand.identifier == function.identifier && !mutates_function {
                        // Don't mutate callee for non-mutating calls
                    } else {
                        apply_effect(
                            context,
                            state,
                            AliasingEffect::MutateTransitiveConditionally {
                                value: operand.clone(),
                            },
                            initialized,
                            effects,
                            env,
                            func,
                        )?;
                    }

                    if *is_spread {
                        let ty = &env.types
                            [env.identifiers[operand.identifier.0 as usize].type_.0 as usize];
                        if let Some(mutate_iter) = conditionally_mutate_iterator(operand, ty) {
                            apply_effect(
                                context,
                                state,
                                mutate_iter,
                                initialized,
                                effects,
                                env,
                                func,
                            )?;
                        }
                    }

                    apply_effect(
                        context,
                        state,
                        AliasingEffect::MaybeAlias {
                            from: operand.clone(),
                            into: into.clone(),
                        },
                        initialized,
                        effects,
                        env,
                        func,
                    )?;

                    // In TS, `other === arg` compares the Place extracted from
                    // `otherArg` with the original `arg` element. For Identifier
                    // args, the extracted Place IS the arg, so this is a reference
                    // identity check. For Spread args, the extracted Place is
                    // `.place` which is never `===` the Spread wrapper object,
                    // so NO pairs are skipped when the outer arg is a Spread
                    // (including self-pairs, producing self-captures).
                    for (other, _other_is_func, _other_is_spread) in &all_operands {
                        if !is_spread && other.identifier == operand.identifier {
                            continue;
                        }
                        apply_effect(
                            context,
                            state,
                            AliasingEffect::Capture {
                                from: operand.clone(),
                                into: other.clone(),
                            },
                            initialized,
                            effects,
                            env,
                            func,
                        )?;
                    }
                }
            }
        }
        ref eff @ (AliasingEffect::Mutate { .. }
        | AliasingEffect::MutateConditionally { .. }
        | AliasingEffect::MutateTransitive { .. }
        | AliasingEffect::MutateTransitiveConditionally { .. }) => {
            let (mutate_place, variant) = match eff {
                AliasingEffect::Mutate { value, .. } => (value, MutateVariant::Mutate),
                AliasingEffect::MutateConditionally { value } => {
                    (value, MutateVariant::MutateConditionally)
                }
                AliasingEffect::MutateTransitive { value } => {
                    (value, MutateVariant::MutateTransitive)
                }
                AliasingEffect::MutateTransitiveConditionally { value } => {
                    (value, MutateVariant::MutateTransitiveConditionally)
                }
                _ => unreachable!(),
            };
            let value = mutate_place;
            let mutation_kind = state.mutate_with_loc(variant, value.identifier, env, value.loc);
            if mutation_kind == MutationResult::Mutate {
                effects.push(effect.clone());
            } else if mutation_kind == MutationResult::MutateRef {
                // no-op
            } else if mutation_kind != MutationResult::None
                && matches!(
                    variant,
                    MutateVariant::Mutate | MutateVariant::MutateTransitive
                )
            {
                let abstract_value = state.kind(value.identifier);

                let ident = &env.identifiers[value.identifier.0 as usize];
                let decl_id = ident.declaration_id;

                if mutation_kind == MutationResult::MutateFrozen
                    && context.hoisted_context_declarations.contains_key(&decl_id)
                {
                    let variable = match &ident.name {
                        Some(react_compiler_hir::IdentifierName::Named(n)) => {
                            Some(format!("`{}`", n))
                        }
                        _ => None,
                    };
                    let hoisted_access = context
                        .hoisted_context_declarations
                        .get(&decl_id)
                        .cloned()
                        .flatten();
                    let mut diagnostic = CompilerDiagnostic::new(
                        ErrorCategory::Immutability,
                        "Cannot access variable before it is declared",
                        Some(format!(
                            "{} is accessed before it is declared, which prevents the earlier access from updating when this value changes over time",
                            variable.as_deref().unwrap_or("This variable")
                        )),
                    );
                    if let Some(ref access) = hoisted_access {
                        if access.loc != value.loc {
                            diagnostic.details.push(
                                react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
                                    loc: access.loc,
                                    message: Some(format!(
                                        "{} accessed before it is declared",
                                        variable.as_deref().unwrap_or("variable")
                                    )),
                                    identifier_name: None,
                                },
                            );
                        }
                    }
                    diagnostic.details.push(
                        react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
                            loc: value.loc,
                            message: Some(format!(
                                "{} is declared here",
                                variable.as_deref().unwrap_or("variable")
                            )),
                            identifier_name: None,
                        },
                    );
                    apply_effect(
                        context,
                        state,
                        AliasingEffect::MutateFrozen {
                            place: value.clone(),
                            error: diagnostic,
                        },
                        initialized,
                        effects,
                        env,
                        func,
                    )?;
                } else {
                    let reason_str = get_write_error_reason(&abstract_value);
                    let variable = match &ident.name {
                        Some(react_compiler_hir::IdentifierName::Named(n)) => format!("`{}`", n),
                        _ => "value".to_string(),
                    };
                    let mut diagnostic = CompilerDiagnostic::new(
                        ErrorCategory::Immutability,
                        "This value cannot be modified",
                        Some(reason_str),
                    );
                    diagnostic.details.push(
                        react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
                            loc: value.loc,
                            message: Some(format!("{} cannot be modified", variable)),
                            identifier_name: None,
                        },
                    );

                    if let AliasingEffect::Mutate {
                        reason: Some(MutationReason::AssignCurrentProperty),
                        ..
                    } = &effect
                    {
                        diagnostic.details.push(react_compiler_diagnostics::CompilerDiagnosticDetail::Hint {
                            message: "Hint: If this value is a Ref (value returned by `useRef()`), rename the variable to end in \"Ref\".".to_string(),
                        });
                    }

                    let error_kind = if abstract_value.kind == ValueKind::Frozen {
                        AliasingEffect::MutateFrozen {
                            place: value.clone(),
                            error: diagnostic,
                        }
                    } else {
                        AliasingEffect::MutateGlobal {
                            place: value.clone(),
                            error: diagnostic,
                        }
                    };
                    apply_effect(context, state, error_kind, initialized, effects, env, func)?;
                }
            }
        }
        AliasingEffect::Impure { .. }
        | AliasingEffect::Render { .. }
        | AliasingEffect::MutateFrozen { .. }
        | AliasingEffect::MutateGlobal { .. } => {
            effects.push(effect.clone());
        }
    }
    Ok(())
}

// =============================================================================
// computeSignatureForInstruction
// =============================================================================

fn compute_signature_for_instruction(
    context: &mut Context,
    env: &Environment,
    instr: &react_compiler_hir::Instruction,
    _func: &HirFunction,
) -> InstructionSignature {
    let lvalue = &instr.lvalue;
    let value = &instr.value;
    let mut effects: Vec<AliasingEffect> = Vec::new();

    match value {
        InstructionValue::ArrayExpression { elements, .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Mutable,
                reason: ValueReason::Other,
            });
            for element in elements {
                match element {
                    react_compiler_hir::ArrayElement::Place(p) => {
                        effects.push(AliasingEffect::Capture {
                            from: p.clone(),
                            into: lvalue.clone(),
                        });
                    }
                    react_compiler_hir::ArrayElement::Spread(s) => {
                        let ty = &env.types
                            [env.identifiers[s.place.identifier.0 as usize].type_.0 as usize];
                        if let Some(mutate_iter) = conditionally_mutate_iterator(&s.place, ty) {
                            effects.push(mutate_iter);
                        }
                        effects.push(AliasingEffect::Capture {
                            from: s.place.clone(),
                            into: lvalue.clone(),
                        });
                    }
                    react_compiler_hir::ArrayElement::Hole => {}
                }
            }
        }
        InstructionValue::ObjectExpression { properties, .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Mutable,
                reason: ValueReason::Other,
            });
            for property in properties {
                match property {
                    react_compiler_hir::ObjectPropertyOrSpread::Property(p) => {
                        effects.push(AliasingEffect::Capture {
                            from: p.place.clone(),
                            into: lvalue.clone(),
                        });
                    }
                    react_compiler_hir::ObjectPropertyOrSpread::Spread(s) => {
                        effects.push(AliasingEffect::Capture {
                            from: s.place.clone(),
                            into: lvalue.clone(),
                        });
                    }
                }
            }
        }
        InstructionValue::Await {
            value: await_value, ..
        } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Mutable,
                reason: ValueReason::Other,
            });
            effects.push(AliasingEffect::MutateTransitiveConditionally {
                value: await_value.clone(),
            });
            effects.push(AliasingEffect::Capture {
                from: await_value.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::NewExpression { callee, args, loc } => {
            let sig = get_function_call_signature(env, callee.identifier)
                .ok()
                .flatten();
            effects.push(AliasingEffect::Apply {
                receiver: callee.clone(),
                function: callee.clone(),
                mutates_function: false,
                args: args.iter().map(place_or_spread_to_hole).collect(),
                into: lvalue.clone(),
                signature: sig,
                loc: *loc,
            });
        }
        InstructionValue::CallExpression { callee, args, loc } => {
            let sig = get_function_call_signature(env, callee.identifier)
                .ok()
                .flatten();
            effects.push(AliasingEffect::Apply {
                receiver: callee.clone(),
                function: callee.clone(),
                mutates_function: true,
                args: args.iter().map(place_or_spread_to_hole).collect(),
                into: lvalue.clone(),
                signature: sig,
                loc: *loc,
            });
        }
        InstructionValue::MethodCall {
            receiver,
            property,
            args,
            loc,
        } => {
            let sig = get_function_call_signature(env, property.identifier)
                .ok()
                .flatten();
            effects.push(AliasingEffect::Apply {
                receiver: receiver.clone(),
                function: property.clone(),
                mutates_function: false,
                args: args.iter().map(place_or_spread_to_hole).collect(),
                into: lvalue.clone(),
                signature: sig,
                loc: *loc,
            });
        }
        InstructionValue::PropertyDelete { object, .. }
        | InstructionValue::ComputedDelete { object, .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
            effects.push(AliasingEffect::Mutate {
                value: object.clone(),
                reason: None,
            });
        }
        InstructionValue::PropertyLoad { object, .. }
        | InstructionValue::ComputedLoad { object, .. } => {
            let ty = &env.types[env.identifiers[lvalue.identifier.0 as usize].type_.0 as usize];
            if react_compiler_hir::is_primitive_type(ty) {
                effects.push(AliasingEffect::Create {
                    into: lvalue.clone(),
                    value: ValueKind::Primitive,
                    reason: ValueReason::Other,
                });
            } else {
                effects.push(AliasingEffect::CreateFrom {
                    from: object.clone(),
                    into: lvalue.clone(),
                });
            }
        }
        InstructionValue::PropertyStore {
            object,
            property,
            value: store_value,
            ..
        } => {
            let mutation_reason: Option<MutationReason> = {
                let obj_ty =
                    &env.types[env.identifiers[object.identifier.0 as usize].type_.0 as usize];
                if let react_compiler_hir::PropertyLiteral::String(prop_name) = property {
                    if prop_name == "current" && matches!(obj_ty, Type::TypeVar { .. }) {
                        Some(MutationReason::AssignCurrentProperty)
                    } else {
                        None
                    }
                } else {
                    None
                }
            };
            effects.push(AliasingEffect::Mutate {
                value: object.clone(),
                reason: mutation_reason,
            });
            effects.push(AliasingEffect::Capture {
                from: store_value.clone(),
                into: object.clone(),
            });
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
        InstructionValue::ComputedStore {
            object,
            value: store_value,
            ..
        } => {
            effects.push(AliasingEffect::Mutate {
                value: object.clone(),
                reason: None,
            });
            effects.push(AliasingEffect::Capture {
                from: store_value.clone(),
                into: object.clone(),
            });
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
        InstructionValue::FunctionExpression { lowered_func, .. }
        | InstructionValue::ObjectMethod { lowered_func, .. } => {
            let inner_func = &env.functions[lowered_func.func.0 as usize];
            let captures: Vec<Place> = inner_func
                .context
                .iter()
                .filter(|operand| operand.effect == Effect::Capture)
                .cloned()
                .collect();
            effects.push(AliasingEffect::CreateFunction {
                into: lvalue.clone(),
                function_id: lowered_func.func,
                captures,
            });
        }
        InstructionValue::GetIterator { collection, .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Mutable,
                reason: ValueReason::Other,
            });
            let ty = &env.types[env.identifiers[collection.identifier.0 as usize].type_.0 as usize];
            if is_builtin_collection_type(ty) {
                effects.push(AliasingEffect::Capture {
                    from: collection.clone(),
                    into: lvalue.clone(),
                });
            } else {
                effects.push(AliasingEffect::Alias {
                    from: collection.clone(),
                    into: lvalue.clone(),
                });
                effects.push(AliasingEffect::MutateTransitiveConditionally {
                    value: collection.clone(),
                });
            }
        }
        InstructionValue::IteratorNext {
            iterator,
            collection,
            ..
        } => {
            effects.push(AliasingEffect::MutateConditionally {
                value: iterator.clone(),
            });
            effects.push(AliasingEffect::CreateFrom {
                from: collection.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::NextPropertyOf { .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
        InstructionValue::JsxExpression {
            tag,
            props,
            children,
            ..
        } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Frozen,
                reason: ValueReason::JsxCaptured,
            });
            for operand in visitors::each_instruction_value_operand(value, env) {
                effects.push(AliasingEffect::Freeze {
                    value: operand.clone(),
                    reason: ValueReason::JsxCaptured,
                });
                effects.push(AliasingEffect::Capture {
                    from: operand.clone(),
                    into: lvalue.clone(),
                });
            }
            if let JsxTag::Place(tag_place) = tag {
                effects.push(AliasingEffect::Render {
                    place: tag_place.clone(),
                });
            }
            if let Some(ch) = children {
                for child in ch {
                    effects.push(AliasingEffect::Render {
                        place: child.clone(),
                    });
                }
            }
            for prop in props {
                if let react_compiler_hir::JsxAttribute::Attribute {
                    place: prop_place, ..
                } = prop
                {
                    let prop_ty = &env.types
                        [env.identifiers[prop_place.identifier.0 as usize].type_.0 as usize];
                    if let Type::Function { return_type, .. } = prop_ty {
                        if react_compiler_hir::is_jsx_type(return_type)
                            || is_phi_with_jsx(return_type)
                        {
                            effects.push(AliasingEffect::Render {
                                place: prop_place.clone(),
                            });
                        }
                    }
                }
            }
        }
        InstructionValue::JsxFragment { children: _, .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Frozen,
                reason: ValueReason::JsxCaptured,
            });
            for operand in visitors::each_instruction_value_operand(value, env) {
                effects.push(AliasingEffect::Freeze {
                    value: operand.clone(),
                    reason: ValueReason::JsxCaptured,
                });
                effects.push(AliasingEffect::Capture {
                    from: operand.clone(),
                    into: lvalue.clone(),
                });
            }
        }
        InstructionValue::DeclareLocal { lvalue: dl, .. } => {
            effects.push(AliasingEffect::Create {
                into: dl.place.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
        InstructionValue::Destructure {
            lvalue: dl,
            value: dest_value,
            ..
        } => {
            for pat_item in each_pattern_items(&dl.pattern) {
                match pat_item {
                    PatternItem::Place(place) => {
                        let ty = &env.types
                            [env.identifiers[place.identifier.0 as usize].type_.0 as usize];
                        if react_compiler_hir::is_primitive_type(ty) {
                            effects.push(AliasingEffect::Create {
                                into: place.clone(),
                                value: ValueKind::Primitive,
                                reason: ValueReason::Other,
                            });
                        } else {
                            effects.push(AliasingEffect::CreateFrom {
                                from: dest_value.clone(),
                                into: place.clone(),
                            });
                        }
                    }
                    PatternItem::Spread(place) => {
                        let value_kind = if context.non_mutating_spreads.contains(&place.identifier)
                        {
                            ValueKind::Frozen
                        } else {
                            ValueKind::Mutable
                        };
                        effects.push(AliasingEffect::Create {
                            into: place.clone(),
                            reason: ValueReason::Other,
                            value: value_kind,
                        });
                        effects.push(AliasingEffect::Capture {
                            from: dest_value.clone(),
                            into: place.clone(),
                        });
                    }
                }
            }
            effects.push(AliasingEffect::Assign {
                from: dest_value.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::LoadContext { place, .. } => {
            effects.push(AliasingEffect::CreateFrom {
                from: place.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::DeclareContext { lvalue: dcl, .. } => {
            let decl_id = env.identifiers[dcl.place.identifier.0 as usize].declaration_id;
            let kind = dcl.kind;
            if !context.hoisted_context_declarations.contains_key(&decl_id)
                || kind == InstructionKind::HoistedConst
                || kind == InstructionKind::HoistedFunction
                || kind == InstructionKind::HoistedLet
            {
                effects.push(AliasingEffect::Create {
                    into: dcl.place.clone(),
                    value: ValueKind::Mutable,
                    reason: ValueReason::Other,
                });
            } else {
                effects.push(AliasingEffect::Mutate {
                    value: dcl.place.clone(),
                    reason: None,
                });
            }
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
        InstructionValue::StoreContext {
            lvalue: scl,
            value: sc_value,
            ..
        } => {
            let decl_id = env.identifiers[scl.place.identifier.0 as usize].declaration_id;
            if scl.kind == InstructionKind::Reassign
                || context.hoisted_context_declarations.contains_key(&decl_id)
            {
                effects.push(AliasingEffect::Mutate {
                    value: scl.place.clone(),
                    reason: None,
                });
            } else {
                effects.push(AliasingEffect::Create {
                    into: scl.place.clone(),
                    value: ValueKind::Mutable,
                    reason: ValueReason::Other,
                });
            }
            effects.push(AliasingEffect::Capture {
                from: sc_value.clone(),
                into: scl.place.clone(),
            });
            effects.push(AliasingEffect::Assign {
                from: sc_value.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::LoadLocal { place, .. } => {
            effects.push(AliasingEffect::Assign {
                from: place.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::StoreLocal {
            lvalue: sl,
            value: sl_value,
            ..
        } => {
            effects.push(AliasingEffect::Assign {
                from: sl_value.clone(),
                into: sl.place.clone(),
            });
            effects.push(AliasingEffect::Assign {
                from: sl_value.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::PostfixUpdate {
            lvalue: pf_lvalue, ..
        }
        | InstructionValue::PrefixUpdate {
            lvalue: pf_lvalue, ..
        } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
            effects.push(AliasingEffect::Create {
                into: pf_lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
        InstructionValue::StoreGlobal {
            name,
            value: sg_value,
            loc: _,
            ..
        } => {
            let variable = format!("`{}`", name);
            let mut diagnostic = CompilerDiagnostic::new(
                ErrorCategory::Globals,
                "Cannot reassign variables declared outside of the component/hook",
                Some(format!(
                    "Variable {} is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render)",
                    variable
                )),
            );
            diagnostic.details.push(
                react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
                    loc: instr.loc,
                    message: Some(format!("{} cannot be reassigned", variable)),
                    identifier_name: None,
                },
            );
            effects.push(AliasingEffect::MutateGlobal {
                place: sg_value.clone(),
                error: diagnostic,
            });
            effects.push(AliasingEffect::Assign {
                from: sg_value.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::TypeCastExpression {
            value: tc_value, ..
        } => {
            effects.push(AliasingEffect::Assign {
                from: tc_value.clone(),
                into: lvalue.clone(),
            });
        }
        InstructionValue::LoadGlobal { .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Global,
                reason: ValueReason::Global,
            });
        }
        InstructionValue::StartMemoize { .. } | InstructionValue::FinishMemoize { .. } => {
            if env.config.enable_preserve_existing_memoization_guarantees {
                for operand in visitors::each_instruction_value_operand(value, env) {
                    effects.push(AliasingEffect::Freeze {
                        value: operand.clone(),
                        reason: ValueReason::HookCaptured,
                    });
                }
            }
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
        // All primitive-creating instructions
        InstructionValue::TaggedTemplateExpression { .. }
        | InstructionValue::BinaryExpression { .. }
        | InstructionValue::Debugger { .. }
        | InstructionValue::JSXText { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::RegExpLiteral { .. }
        | InstructionValue::TemplateLiteral { .. }
        | InstructionValue::UnaryExpression { .. }
        | InstructionValue::UnsupportedNode { .. } => {
            effects.push(AliasingEffect::Create {
                into: lvalue.clone(),
                value: ValueKind::Primitive,
                reason: ValueReason::Other,
            });
        }
    }

    InstructionSignature { effects }
}

// =============================================================================
// Legacy signature support
// =============================================================================

fn compute_effects_for_legacy_signature(
    state: &InferenceState,
    signature: &FunctionSignature,
    lvalue: &Place,
    receiver: &Place,
    args: &[PlaceOrSpreadOrHole],
    _loc: Option<&SourceLocation>,
    env: &Environment,
    function_values: &HashMap<ValueId, FunctionId>,
    todo_errors: &mut Vec<react_compiler_diagnostics::CompilerErrorDetail>,
) -> Vec<AliasingEffect> {
    let return_value_reason = signature.return_value_reason.unwrap_or(ValueReason::Other);
    let mut effects: Vec<AliasingEffect> = Vec::new();

    effects.push(AliasingEffect::Create {
        into: lvalue.clone(),
        value: signature.return_value_kind,
        reason: return_value_reason,
    });

    if signature.impure && env.config.validate_no_impure_functions_in_render {
        let mut diagnostic = CompilerDiagnostic::new(
            ErrorCategory::Purity,
            "Cannot call impure function during render",
            Some(format!(
                "{}Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent)",
                if let Some(ref name) = signature.canonical_name {
                    format!("`{}` is an impure function. ", name)
                } else {
                    String::new()
                }
            )),
        );
        diagnostic.details.push(
            react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
                loc: _loc.copied(),
                message: Some("Cannot call impure function".to_string()),
                identifier_name: None,
            },
        );
        effects.push(AliasingEffect::Impure {
            place: receiver.clone(),
            error: diagnostic,
        });
    }

    // TODO: check signature.known_incompatible and throw (TS line 2351-2370)
    // This requires threading Result through apply_effect/apply_signature.

    // If the function is mutable only if operands are mutable, and all
    // arguments are immutable/non-mutating, short-circuit with simple aliasing.
    if signature.mutable_only_if_operands_are_mutable
        && are_arguments_immutable_and_non_mutating(state, args, env, function_values)
    {
        effects.push(AliasingEffect::Alias {
            from: receiver.clone(),
            into: lvalue.clone(),
        });
        for arg in args {
            match arg {
                PlaceOrSpreadOrHole::Hole => continue,
                PlaceOrSpreadOrHole::Place(place)
                | PlaceOrSpreadOrHole::Spread(react_compiler_hir::SpreadPattern { place }) => {
                    effects.push(AliasingEffect::ImmutableCapture {
                        from: place.clone(),
                        into: lvalue.clone(),
                    });
                }
            }
        }
        return effects;
    }

    let mut stores: Vec<Place> = Vec::new();
    let mut captures: Vec<Place> = Vec::new();

    let mut visit = |place: &Place, effect: Effect, effects: &mut Vec<AliasingEffect>| match effect
    {
        Effect::Store => {
            effects.push(AliasingEffect::Mutate {
                value: place.clone(),
                reason: None,
            });
            stores.push(place.clone());
        }
        Effect::Capture => {
            captures.push(place.clone());
        }
        Effect::ConditionallyMutate => {
            effects.push(AliasingEffect::MutateTransitiveConditionally {
                value: place.clone(),
            });
        }
        Effect::ConditionallyMutateIterator => {
            let ty = &env.types[env.identifiers[place.identifier.0 as usize].type_.0 as usize];
            if let Some(mutate_iter) = conditionally_mutate_iterator(place, ty) {
                effects.push(mutate_iter);
            }
            effects.push(AliasingEffect::Capture {
                from: place.clone(),
                into: lvalue.clone(),
            });
        }
        Effect::Freeze => {
            effects.push(AliasingEffect::Freeze {
                value: place.clone(),
                reason: return_value_reason,
            });
        }
        Effect::Mutate => {
            effects.push(AliasingEffect::MutateTransitive {
                value: place.clone(),
            });
        }
        Effect::Read => {
            effects.push(AliasingEffect::ImmutableCapture {
                from: place.clone(),
                into: lvalue.clone(),
            });
        }
        _ => {}
    };

    if signature.callee_effect != Effect::Capture {
        effects.push(AliasingEffect::Alias {
            from: receiver.clone(),
            into: lvalue.clone(),
        });
    }

    visit(receiver, signature.callee_effect, &mut effects);
    for (i, arg) in args.iter().enumerate() {
        match arg {
            PlaceOrSpreadOrHole::Hole => continue,
            PlaceOrSpreadOrHole::Place(place)
            | PlaceOrSpreadOrHole::Spread(react_compiler_hir::SpreadPattern { place }) => {
                let is_spread = matches!(arg, PlaceOrSpreadOrHole::Spread(_));
                let sig_effect = if !is_spread && i < signature.positional_params.len() {
                    signature.positional_params[i]
                } else {
                    signature.rest_param.unwrap_or(Effect::ConditionallyMutate)
                };
                let (effect, err_detail) = get_argument_effect(sig_effect, is_spread, place.loc);
                if let Some(d) = err_detail {
                    todo_errors.push(d);
                }
                visit(place, effect, &mut effects);
            }
        }
    }

    if !captures.is_empty() {
        if stores.is_empty() {
            for capture in &captures {
                effects.push(AliasingEffect::Alias {
                    from: capture.clone(),
                    into: lvalue.clone(),
                });
            }
        } else {
            for capture in &captures {
                for store in &stores {
                    effects.push(AliasingEffect::Capture {
                        from: capture.clone(),
                        into: store.clone(),
                    });
                }
            }
        }
    }

    effects
}

fn get_argument_effect(
    sig_effect: Effect,
    is_spread: bool,
    spread_loc: Option<SourceLocation>,
) -> (
    Effect,
    Option<react_compiler_diagnostics::CompilerErrorDetail>,
) {
    if !is_spread {
        (sig_effect, None)
    } else if sig_effect == Effect::Mutate || sig_effect == Effect::ConditionallyMutate {
        (sig_effect, None)
    } else {
        // Spread with Freeze effect is unsupported for hook arguments
        // (matches TS CompilerError.throwTodo)
        let detail = if sig_effect == Effect::Freeze {
            Some(react_compiler_diagnostics::CompilerErrorDetail {
                reason: "Support spread syntax for hook arguments".to_string(),
                description: None,
                category: ErrorCategory::Todo,
                loc: spread_loc,
                suggestions: None,
            })
        } else {
            None
        };
        (Effect::ConditionallyMutateIterator, detail)
    }
}

/// Returns true if all of the arguments are both non-mutable (immutable or frozen)
/// _and_ are not functions which might mutate their arguments.
///
/// Corresponds to TS `areArgumentsImmutableAndNonMutating`.
fn are_arguments_immutable_and_non_mutating(
    state: &InferenceState,
    args: &[PlaceOrSpreadOrHole],
    env: &Environment,
    function_values: &HashMap<ValueId, FunctionId>,
) -> bool {
    for arg in args {
        match arg {
            PlaceOrSpreadOrHole::Hole => continue,
            PlaceOrSpreadOrHole::Place(place)
            | PlaceOrSpreadOrHole::Spread(react_compiler_hir::SpreadPattern { place }) => {
                // Check if it's a function type with a known signature
                let is_place = matches!(arg, PlaceOrSpreadOrHole::Place(_));
                if is_place {
                    let ty =
                        &env.types[env.identifiers[place.identifier.0 as usize].type_.0 as usize];
                    if let Type::Function { .. } = ty {
                        let fn_shape = env.get_function_signature(ty).ok().flatten();
                        if let Some(fn_sig) = fn_shape {
                            let has_mutable_param = fn_sig
                                .positional_params
                                .iter()
                                .any(|e| is_known_mutable_effect(*e));
                            let has_mutable_rest = fn_sig
                                .rest_param
                                .map_or(false, |e| is_known_mutable_effect(e));
                            return !has_mutable_param && !has_mutable_rest;
                        }
                    }
                }

                let kind = state.kind(place.identifier);
                match kind.kind {
                    ValueKind::Primitive | ValueKind::Frozen => {
                        // Immutable values are ok, continue checking
                    }
                    _ => {
                        return false;
                    }
                }

                // Check if any value for this place is a function expression
                // that mutates its parameters (TS lines 2545-2557)
                let value_ids = state.values_for(place.identifier);
                for vid in &value_ids {
                    if let Some(&func_id) = function_values.get(vid) {
                        let inner_func = &env.functions[func_id.0 as usize];
                        let mutates_params = inner_func.params.iter().any(|param| {
                            let param_id = match param {
                                ParamPattern::Place(p) => p.identifier,
                                ParamPattern::Spread(s) => s.place.identifier,
                            };
                            let ident = &env.identifiers[param_id.0 as usize];
                            ident.mutable_range.end.0 > ident.mutable_range.start.0 + 1
                        });
                        if mutates_params {
                            return false;
                        }
                    }
                }
            }
        }
    }
    true
}

fn is_known_mutable_effect(effect: Effect) -> bool {
    matches!(
        effect,
        Effect::Store
            | Effect::Mutate
            | Effect::ConditionallyMutate
            | Effect::ConditionallyMutateIterator
    )
}

// =============================================================================
// Aliasing signature config support (new-style signatures)
// =============================================================================

fn compute_effects_for_aliasing_signature_config(
    env: &mut Environment,
    config: &react_compiler_hir::type_config::AliasingSignatureConfig,
    lvalue: &Place,
    receiver: &Place,
    args: &[PlaceOrSpreadOrHole],
    context: &[Place],
    _loc: Option<&SourceLocation>,
    temp_cache: &mut HashMap<(IdentifierId, String), Place>,
) -> Result<Option<Vec<AliasingEffect>>, CompilerDiagnostic> {
    // Build substitutions from config strings to places
    let mut substitutions: HashMap<String, Vec<Place>> = HashMap::new();
    substitutions.insert(config.receiver.clone(), vec![receiver.clone()]);
    substitutions.insert(config.returns.clone(), vec![lvalue.clone()]);

    let mut mutable_spreads: HashSet<IdentifierId> = HashSet::new();

    for (i, arg) in args.iter().enumerate() {
        match arg {
            PlaceOrSpreadOrHole::Hole => continue,
            PlaceOrSpreadOrHole::Place(place)
            | PlaceOrSpreadOrHole::Spread(react_compiler_hir::SpreadPattern { place }) => {
                if i < config.params.len() && !matches!(arg, PlaceOrSpreadOrHole::Spread(_)) {
                    substitutions.insert(config.params[i].clone(), vec![place.clone()]);
                } else if let Some(ref rest) = config.rest {
                    substitutions
                        .entry(rest.clone())
                        .or_default()
                        .push(place.clone());
                } else {
                    return Ok(None);
                }

                if matches!(arg, PlaceOrSpreadOrHole::Spread(_)) {
                    let ty =
                        &env.types[env.identifiers[place.identifier.0 as usize].type_.0 as usize];
                    let mutate_iterator = conditionally_mutate_iterator(place, ty);
                    if mutate_iterator.is_some() {
                        mutable_spreads.insert(place.identifier);
                    }
                }
            }
        }
    }

    for operand in context {
        let ident = &env.identifiers[operand.identifier.0 as usize];
        if let Some(ref name) = ident.name {
            substitutions.insert(format!("@{}", name.value()), vec![operand.clone()]);
        }
    }

    // Create temporaries (cached by lvalue + temp_name to be stable across fixpoint iterations)
    for temp_name in &config.temporaries {
        let cache_key = (lvalue.identifier, temp_name.clone());
        let temp_place = temp_cache
            .entry(cache_key)
            .or_insert_with(|| create_temp_place(env, receiver.loc))
            .clone();
        substitutions.insert(temp_name.clone(), vec![temp_place]);
    }

    let mut effects: Vec<AliasingEffect> = Vec::new();

    for eff_config in &config.effects {
        match eff_config {
            react_compiler_hir::type_config::AliasingEffectConfig::Freeze { value, reason } => {
                let values = substitutions.get(value).cloned().unwrap_or_default();
                for v in values {
                    if mutable_spreads.contains(&v.identifier) {
                        return Err(CompilerDiagnostic::todo(
                            "Support spread syntax for hook arguments",
                            v.loc,
                        ));
                    }
                    effects.push(AliasingEffect::Freeze { value: v, reason: *reason });
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::Create { into, value, reason } => {
                let intos = substitutions.get(into).cloned().unwrap_or_default();
                for v in intos {
                    effects.push(AliasingEffect::Create { into: v, value: *value, reason: *reason });
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::CreateFrom { from, into } => {
                let froms = substitutions.get(from).cloned().unwrap_or_default();
                let intos = substitutions.get(into).cloned().unwrap_or_default();
                for f in &froms {
                    for t in &intos {
                        effects.push(AliasingEffect::CreateFrom { from: f.clone(), into: t.clone() });
                    }
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::Assign { from, into } => {
                let froms = substitutions.get(from).cloned().unwrap_or_default();
                let intos = substitutions.get(into).cloned().unwrap_or_default();
                for f in &froms {
                    for t in &intos {
                        effects.push(AliasingEffect::Assign { from: f.clone(), into: t.clone() });
                    }
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::Alias { from, into } => {
                let froms = substitutions.get(from).cloned().unwrap_or_default();
                let intos = substitutions.get(into).cloned().unwrap_or_default();
                for f in &froms {
                    for t in &intos {
                        effects.push(AliasingEffect::Alias { from: f.clone(), into: t.clone() });
                    }
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::Capture { from, into } => {
                let froms = substitutions.get(from).cloned().unwrap_or_default();
                let intos = substitutions.get(into).cloned().unwrap_or_default();
                for f in &froms {
                    for t in &intos {
                        effects.push(AliasingEffect::Capture { from: f.clone(), into: t.clone() });
                    }
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::ImmutableCapture { from, into } => {
                let froms = substitutions.get(from).cloned().unwrap_or_default();
                let intos = substitutions.get(into).cloned().unwrap_or_default();
                for f in &froms {
                    for t in &intos {
                        effects.push(AliasingEffect::ImmutableCapture { from: f.clone(), into: t.clone() });
                    }
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::Impure { place } => {
                let values = substitutions.get(place).cloned().unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::Impure {
                        place: v,
                        error: CompilerDiagnostic::new(ErrorCategory::Purity, "Impure function call", None),
                    });
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::Mutate { value } => {
                let values = substitutions.get(value).cloned().unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::Mutate { value: v, reason: None });
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::MutateTransitiveConditionally { value } => {
                let values = substitutions.get(value).cloned().unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::MutateTransitiveConditionally { value: v });
                }
            }
            react_compiler_hir::type_config::AliasingEffectConfig::Apply { receiver: r, function: f, mutates_function, args: a, into: i } => {
                let recv = substitutions.get(r).and_then(|v| v.first()).cloned();
                let func = substitutions.get(f).and_then(|v| v.first()).cloned();
                let into = substitutions.get(i).and_then(|v| v.first()).cloned();
                if let (Some(recv), Some(func), Some(into)) = (recv, func, into) {
                    let mut apply_args: Vec<PlaceOrSpreadOrHole> = Vec::new();
                    for arg in a {
                        match arg {
                            react_compiler_hir::type_config::ApplyArgConfig::Hole { .. } => {
                                apply_args.push(PlaceOrSpreadOrHole::Hole);
                            }
                            react_compiler_hir::type_config::ApplyArgConfig::Place(name) => {
                                if let Some(places) = substitutions.get(name) {
                                    if let Some(p) = places.first() {
                                        apply_args.push(PlaceOrSpreadOrHole::Place(p.clone()));
                                    }
                                }
                            }
                            react_compiler_hir::type_config::ApplyArgConfig::Spread { place: name, .. } => {
                                if let Some(places) = substitutions.get(name) {
                                    if let Some(p) = places.first() {
                                        apply_args.push(PlaceOrSpreadOrHole::Spread(react_compiler_hir::SpreadPattern { place: p.clone() }));
                                    }
                                }
                            }
                        }
                    }
                    effects.push(AliasingEffect::Apply {
                        receiver: recv,
                        function: func,
                        mutates_function: *mutates_function,
                        args: apply_args,
                        into,
                        signature: None,
                        loc: _loc.copied(),
                    });
                } else {
                    return Ok(None);
                }
            }
        }
    }

    Ok(Some(effects))
}

// =============================================================================
// Function expression signature building
// =============================================================================

/// Build an AliasingSignature from a function expression's params/returns/aliasing effects.
/// Corresponds to TS `buildSignatureFromFunctionExpression`.
fn build_signature_from_function_expression(
    env: &mut Environment,
    func_id: FunctionId,
) -> AliasingSignature {
    let inner_func = &env.functions[func_id.0 as usize];
    let mut params: Vec<IdentifierId> = Vec::new();
    let mut rest: Option<IdentifierId> = None;
    for param in &inner_func.params {
        match param {
            ParamPattern::Place(p) => params.push(p.identifier),
            ParamPattern::Spread(s) => rest = Some(s.place.identifier),
        }
    }
    let returns = inner_func.returns.identifier;
    let aliasing_effects = inner_func.aliasing_effects.clone().unwrap_or_default();
    let loc = inner_func.loc;

    if rest.is_none() {
        let temp = create_temp_place(env, loc);
        rest = Some(temp.identifier);
    }

    AliasingSignature {
        receiver: IdentifierId(0),
        params,
        rest,
        returns,
        effects: aliasing_effects,
        temporaries: Vec::new(),
    }
}

/// Compute effects by substituting an AliasingSignature (IdentifierId-based)
/// with actual arguments. Corresponds to TS `computeEffectsForSignature`.
fn compute_effects_for_aliasing_signature(
    env: &mut Environment,
    signature: &AliasingSignature,
    lvalue: &Place,
    receiver: &Place,
    args: &[PlaceOrSpreadOrHole],
    context: &[Place],
    _loc: Option<&SourceLocation>,
) -> Result<Option<Vec<AliasingEffect>>, CompilerDiagnostic> {
    if signature.params.len() > args.len()
        || (args.len() > signature.params.len() && signature.rest.is_none())
    {
        return Ok(None);
    }

    let mut mutable_spreads: HashSet<IdentifierId> = HashSet::new();
    let mut substitutions: HashMap<IdentifierId, Vec<Place>> = HashMap::new();
    substitutions.insert(signature.receiver, vec![receiver.clone()]);
    substitutions.insert(signature.returns, vec![lvalue.clone()]);

    for (i, arg) in args.iter().enumerate() {
        match arg {
            PlaceOrSpreadOrHole::Hole => continue,
            PlaceOrSpreadOrHole::Place(place)
            | PlaceOrSpreadOrHole::Spread(react_compiler_hir::SpreadPattern { place }) => {
                let is_spread = matches!(arg, PlaceOrSpreadOrHole::Spread(_));
                if !is_spread && i < signature.params.len() {
                    substitutions.insert(signature.params[i], vec![place.clone()]);
                } else if let Some(rest_id) = signature.rest {
                    substitutions
                        .entry(rest_id)
                        .or_default()
                        .push(place.clone());
                } else {
                    return Ok(None);
                }

                if is_spread {
                    let ty =
                        &env.types[env.identifiers[place.identifier.0 as usize].type_.0 as usize];
                    let mutate_iterator = conditionally_mutate_iterator(place, ty);
                    if mutate_iterator.is_some() {
                        mutable_spreads.insert(place.identifier);
                    }
                }
            }
        }
    }

    // Add context variable substitutions (identity mapping)
    for operand in context {
        substitutions.insert(operand.identifier, vec![operand.clone()]);
    }

    // Create temporaries
    for temp in &signature.temporaries {
        let temp_place = create_temp_place(env, receiver.loc);
        substitutions.insert(temp.identifier, vec![temp_place]);
    }

    let mut effects: Vec<AliasingEffect> = Vec::new();

    for eff in &signature.effects {
        match eff {
            AliasingEffect::MaybeAlias { from, into }
            | AliasingEffect::Assign { from, into }
            | AliasingEffect::ImmutableCapture { from, into }
            | AliasingEffect::Alias { from, into }
            | AliasingEffect::CreateFrom { from, into }
            | AliasingEffect::Capture { from, into } => {
                let from_places = substitutions
                    .get(&from.identifier)
                    .cloned()
                    .unwrap_or_default();
                let to_places = substitutions
                    .get(&into.identifier)
                    .cloned()
                    .unwrap_or_default();
                for f in &from_places {
                    for t in &to_places {
                        effects.push(match eff {
                            AliasingEffect::MaybeAlias { .. } => AliasingEffect::MaybeAlias {
                                from: f.clone(),
                                into: t.clone(),
                            },
                            AliasingEffect::Assign { .. } => AliasingEffect::Assign {
                                from: f.clone(),
                                into: t.clone(),
                            },
                            AliasingEffect::ImmutableCapture { .. } => {
                                AliasingEffect::ImmutableCapture {
                                    from: f.clone(),
                                    into: t.clone(),
                                }
                            }
                            AliasingEffect::Alias { .. } => AliasingEffect::Alias {
                                from: f.clone(),
                                into: t.clone(),
                            },
                            AliasingEffect::CreateFrom { .. } => AliasingEffect::CreateFrom {
                                from: f.clone(),
                                into: t.clone(),
                            },
                            AliasingEffect::Capture { .. } => AliasingEffect::Capture {
                                from: f.clone(),
                                into: t.clone(),
                            },
                            _ => unreachable!(),
                        });
                    }
                }
            }
            AliasingEffect::Impure { place, error } => {
                let values = substitutions
                    .get(&place.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::Impure {
                        place: v,
                        error: error.clone(),
                    });
                }
            }
            AliasingEffect::MutateFrozen { place, error } => {
                let values = substitutions
                    .get(&place.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::MutateFrozen {
                        place: v,
                        error: error.clone(),
                    });
                }
            }
            AliasingEffect::MutateGlobal { place, error } => {
                let values = substitutions
                    .get(&place.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::MutateGlobal {
                        place: v,
                        error: error.clone(),
                    });
                }
            }
            AliasingEffect::Render { place } => {
                let values = substitutions
                    .get(&place.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::Render { place: v });
                }
            }
            AliasingEffect::Mutate { value, reason } => {
                let values = substitutions
                    .get(&value.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::Mutate {
                        value: v,
                        reason: reason.clone(),
                    });
                }
            }
            AliasingEffect::MutateConditionally { value } => {
                let values = substitutions
                    .get(&value.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::MutateConditionally { value: v });
                }
            }
            AliasingEffect::MutateTransitive { value } => {
                let values = substitutions
                    .get(&value.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::MutateTransitive { value: v });
                }
            }
            AliasingEffect::MutateTransitiveConditionally { value } => {
                let values = substitutions
                    .get(&value.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    effects.push(AliasingEffect::MutateTransitiveConditionally { value: v });
                }
            }
            AliasingEffect::Freeze { value, reason } => {
                let values = substitutions
                    .get(&value.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in values {
                    if mutable_spreads.contains(&v.identifier) {
                        return Err(CompilerDiagnostic::todo(
                            "Support spread syntax for hook arguments",
                            v.loc,
                        ));
                    }
                    effects.push(AliasingEffect::Freeze {
                        value: v,
                        reason: *reason,
                    });
                }
            }
            AliasingEffect::Create {
                into,
                value,
                reason,
            } => {
                let intos = substitutions
                    .get(&into.identifier)
                    .cloned()
                    .unwrap_or_default();
                for v in intos {
                    effects.push(AliasingEffect::Create {
                        into: v,
                        value: *value,
                        reason: *reason,
                    });
                }
            }
            AliasingEffect::Apply {
                receiver: r,
                function: f,
                mutates_function: mf,
                args: a,
                into: i,
                signature: s,
                loc: _l,
            } => {
                let recv = substitutions
                    .get(&r.identifier)
                    .and_then(|v| v.first())
                    .cloned();
                let func = substitutions
                    .get(&f.identifier)
                    .and_then(|v| v.first())
                    .cloned();
                let apply_into = substitutions
                    .get(&i.identifier)
                    .and_then(|v| v.first())
                    .cloned();
                if let (Some(recv), Some(func), Some(apply_into)) = (recv, func, apply_into) {
                    let mut apply_args: Vec<PlaceOrSpreadOrHole> = Vec::new();
                    for arg in a {
                        match arg {
                            PlaceOrSpreadOrHole::Hole => apply_args.push(PlaceOrSpreadOrHole::Hole),
                            PlaceOrSpreadOrHole::Place(p) => {
                                if let Some(places) = substitutions.get(&p.identifier) {
                                    if let Some(place) = places.first() {
                                        apply_args.push(PlaceOrSpreadOrHole::Place(place.clone()));
                                    }
                                }
                            }
                            PlaceOrSpreadOrHole::Spread(sp) => {
                                if let Some(places) = substitutions.get(&sp.place.identifier) {
                                    if let Some(place) = places.first() {
                                        apply_args.push(PlaceOrSpreadOrHole::Spread(
                                            react_compiler_hir::SpreadPattern {
                                                place: place.clone(),
                                            },
                                        ));
                                    }
                                }
                            }
                        }
                    }
                    effects.push(AliasingEffect::Apply {
                        receiver: recv,
                        function: func,
                        mutates_function: *mf,
                        args: apply_args,
                        into: apply_into,
                        signature: s.clone(),
                        loc: _loc.copied(),
                    });
                } else {
                    return Ok(None);
                }
            }
            AliasingEffect::CreateFunction { .. } => {
                // Not supported in signature substitution
                return Ok(None);
            }
        }
    }

    Ok(Some(effects))
}

// =============================================================================
// Helpers
// =============================================================================

/// Select the primary (most specific) reason from a set of reasons.
/// TS uses `[...set][0]` which returns the first-inserted element;
/// since the primary reason is always inserted first, this effectively
/// picks the most specific non-Other reason. We replicate this by
/// preferring any non-Other reason over Other.
fn primary_reason(reasons: &IndexSet<ValueReason>) -> ValueReason {
    for &r in reasons {
        if r != ValueReason::Other {
            return r;
        }
    }
    ValueReason::Other
}

fn get_write_error_reason(abstract_value: &AbstractValue) -> String {
    if abstract_value.reason.contains(&ValueReason::Global) {
        "Modifying a variable defined outside a component or hook is not allowed. Consider using an effect".to_string()
    } else if abstract_value.reason.contains(&ValueReason::JsxCaptured) {
        "Modifying a value used previously in JSX is not allowed. Consider moving the modification before the JSX".to_string()
    } else if abstract_value.reason.contains(&ValueReason::Context) {
        "Modifying a value returned from 'useContext()' is not allowed.".to_string()
    } else if abstract_value
        .reason
        .contains(&ValueReason::KnownReturnSignature)
    {
        "Modifying a value returned from a function whose return value should not be mutated"
            .to_string()
    } else if abstract_value
        .reason
        .contains(&ValueReason::ReactiveFunctionArgument)
    {
        "Modifying component props or hook arguments is not allowed. Consider using a local variable instead".to_string()
    } else if abstract_value.reason.contains(&ValueReason::State) {
        "Modifying a value returned from 'useState()', which should not be modified directly. Use the setter function to update instead".to_string()
    } else if abstract_value.reason.contains(&ValueReason::ReducerState) {
        "Modifying a value returned from 'useReducer()', which should not be modified directly. Use the dispatch function to update instead".to_string()
    } else if abstract_value.reason.contains(&ValueReason::Effect) {
        "Modifying a value used previously in an effect function or as an effect dependency is not allowed. Consider moving the modification before calling useEffect()".to_string()
    } else if abstract_value.reason.contains(&ValueReason::HookCaptured) {
        "Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook".to_string()
    } else if abstract_value.reason.contains(&ValueReason::HookReturn) {
        "Modifying a value returned from a hook is not allowed. Consider moving the modification into the hook where the value is constructed".to_string()
    } else {
        "This modifies a variable that React considers immutable".to_string()
    }
}

fn conditionally_mutate_iterator(place: &Place, ty: &Type) -> Option<AliasingEffect> {
    if !is_builtin_collection_type(ty) {
        Some(AliasingEffect::MutateTransitiveConditionally {
            value: place.clone(),
        })
    } else {
        None
    }
}

fn is_builtin_collection_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) }
        if id == BUILT_IN_ARRAY_ID || id == BUILT_IN_SET_ID || id == BUILT_IN_MAP_ID
    )
}

fn get_function_call_signature(
    env: &Environment,
    callee_id: IdentifierId,
) -> Result<Option<FunctionSignature>, CompilerDiagnostic> {
    let ty = &env.types[env.identifiers[callee_id.0 as usize].type_.0 as usize];
    Ok(env.get_function_signature(ty)?.cloned())
}

fn is_ref_or_ref_value_for_id(env: &Environment, id: IdentifierId) -> bool {
    let ty = &env.types[env.identifiers[id.0 as usize].type_.0 as usize];
    react_compiler_hir::is_ref_or_ref_value(ty)
}

fn get_hook_kind_for_type<'a>(
    env: &'a Environment,
    ty: &Type,
) -> Result<Option<&'a HookKind>, CompilerDiagnostic> {
    env.get_hook_kind_for_type(ty)
}

/// Format a Type for printPlace-style output, matching TS's `printType()`.
fn format_type_for_print(ty: &Type) -> String {
    match ty {
        Type::Primitive => String::new(),
        Type::Function {
            shape_id,
            return_type,
            ..
        } => {
            if let Some(sid) = shape_id {
                let ret = format_type_for_print(return_type);
                if ret.is_empty() {
                    format!(":TFunction<{}>()", sid)
                } else {
                    format!(":TFunction<{}>():  {}", sid, ret)
                }
            } else {
                ":TFunction".to_string()
            }
        }
        Type::Object { shape_id } => {
            if let Some(sid) = shape_id {
                format!(":TObject<{}>", sid)
            } else {
                ":TObject".to_string()
            }
        }
        Type::Poly => ":TPoly".to_string(),
        Type::Phi { .. } => ":TPhi".to_string(),
        Type::Property { .. } => ":TProperty".to_string(),
        Type::TypeVar { .. } => String::new(),
        Type::ObjectMethod => ":TObjectMethod".to_string(),
    }
}

fn is_phi_with_jsx(ty: &Type) -> bool {
    if let Type::Phi { operands } = ty {
        operands
            .iter()
            .any(|op| react_compiler_hir::is_jsx_type(op))
    } else {
        false
    }
}

fn place_or_spread_to_hole(pos: &PlaceOrSpread) -> PlaceOrSpreadOrHole {
    match pos {
        PlaceOrSpread::Place(p) => PlaceOrSpreadOrHole::Place(p.clone()),
        PlaceOrSpread::Spread(s) => PlaceOrSpreadOrHole::Spread(s.clone()),
    }
}

use react_compiler_hir::JsxTag;

fn build_apply_operands(
    receiver: &Place,
    function: &Place,
    args: &[PlaceOrSpreadOrHole],
) -> Vec<(Place, bool, bool)> {
    let mut result = vec![
        (receiver.clone(), false, false),
        (function.clone(), true, false),
    ];
    for arg in args {
        match arg {
            PlaceOrSpreadOrHole::Hole => continue,
            PlaceOrSpreadOrHole::Place(p) => result.push((p.clone(), false, false)),
            PlaceOrSpreadOrHole::Spread(s) => result.push((s.place.clone(), false, true)),
        }
    }
    result
}

fn create_temp_place(env: &mut Environment, loc: Option<SourceLocation>) -> Place {
    let id = env.next_identifier_id();
    env.identifiers[id.0 as usize].loc = loc;
    Place {
        identifier: id,
        effect: Effect::Unknown,
        reactive: false,
        loc,
    }
}

// =============================================================================
// Terminal successor helper
// =============================================================================

/// Returns the successor blocks used for traversal in mutation/aliasing inference.
///
/// Matches the TS `eachTerminalSuccessor` which yields standard control-flow
/// successors but NOT pseudo-successors (fallthroughs). Fallthroughs for
/// Logical/Ternary/Optional and Try/Scope/PrunedScope are reached naturally
/// via the block iteration order (blocks are stored in topological order).
fn terminal_successors(terminal: &react_compiler_hir::Terminal) -> Vec<BlockId> {
    use react_compiler_hir::Terminal;
    match terminal {
        Terminal::Goto { block, .. } => vec![*block],
        Terminal::If {
            consequent,
            alternate,
            ..
        } => vec![*consequent, *alternate],
        Terminal::Branch {
            consequent,
            alternate,
            ..
        } => vec![*consequent, *alternate],
        Terminal::Switch { cases, .. } => cases.iter().map(|c| c.block).collect(),
        Terminal::For { init, .. } => vec![*init],
        Terminal::ForOf { init, .. } | Terminal::ForIn { init, .. } => vec![*init],
        Terminal::DoWhile { loop_block, .. } => vec![*loop_block],
        Terminal::While { test, .. } => vec![*test],
        Terminal::Return { .. }
        | Terminal::Throw { .. }
        | Terminal::Unreachable { .. }
        | Terminal::Unsupported { .. } => vec![],
        Terminal::Try { block, .. } => vec![*block],
        Terminal::MaybeThrow {
            continuation,
            handler,
            ..
        } => {
            let mut v = vec![*continuation];
            if let Some(h) = handler {
                v.push(*h);
            }
            v
        }
        Terminal::Label { block, .. } | Terminal::Sequence { block, .. } => vec![*block],
        Terminal::Logical { test, .. } | Terminal::Ternary { test, .. } => vec![*test],
        Terminal::Optional { test, .. } => vec![*test],
        Terminal::Scope { block, .. } | Terminal::PrunedScope { block, .. } => vec![*block],
    }
}

/// Pattern item helper for Destructure.
///
/// NOTE: This cannot use `visitors::each_pattern_operand` because callers need
/// to distinguish Place from Spread elements — Spread elements get different
/// aliasing effects (Create + Capture) vs Place elements (Create or CreateFrom).
enum PatternItem<'a> {
    Place(&'a Place),
    Spread(&'a Place),
}

fn each_pattern_items(pattern: &react_compiler_hir::Pattern) -> Vec<PatternItem<'_>> {
    let mut items = Vec::new();
    match pattern {
        react_compiler_hir::Pattern::Array(arr) => {
            for el in &arr.items {
                match el {
                    react_compiler_hir::ArrayPatternElement::Place(p) => {
                        items.push(PatternItem::Place(p))
                    }
                    react_compiler_hir::ArrayPatternElement::Spread(s) => {
                        items.push(PatternItem::Spread(&s.place))
                    }
                    react_compiler_hir::ArrayPatternElement::Hole => {}
                }
            }
        }
        react_compiler_hir::Pattern::Object(obj) => {
            for prop in &obj.properties {
                match prop {
                    react_compiler_hir::ObjectPropertyOrSpread::Property(p) => {
                        items.push(PatternItem::Place(&p.place))
                    }
                    react_compiler_hir::ObjectPropertyOrSpread::Spread(s) => {
                        items.push(PatternItem::Spread(&s.place))
                    }
                }
            }
        }
    }
    items
}

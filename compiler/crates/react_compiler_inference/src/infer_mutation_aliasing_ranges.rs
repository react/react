// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Infers mutable ranges for identifiers and populates Place effects.
//!
//! Ported from TypeScript `src/Inference/InferMutationAliasingRanges.ts`.
//!
//! This pass builds an abstract model of the heap and interprets the effects of
//! the given function in order to determine:
//! - The mutable ranges of all identifiers in the function
//! - The externally-visible effects of the function (mutations of params/context
//!   vars, aliasing between params/context-vars/return-value)
//! - The legacy `Effect` to store on each Place

use std::collections::{HashMap, HashSet};

use indexmap::IndexMap;

use react_compiler_diagnostics::{CompilerDiagnostic, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::type_config::{ValueKind, ValueReason};
use react_compiler_hir::visitors::{
    each_instruction_value_lvalue, for_each_instruction_value_lvalue_mut,
    for_each_instruction_value_operand_mut, for_each_terminal_operand_mut,
};
use react_compiler_hir::{
    AliasingEffect, BlockId, Effect, EvaluationOrder, FunctionId, HirFunction, IdentifierId,
    InstructionValue, MutationReason, Place, SourceLocation, is_jsx_type, is_primitive_type,
};

// =============================================================================
// MutationKind
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
#[allow(dead_code)]
enum MutationKind {
    None = 0,
    Conditional = 1,
    Definite = 2,
}

// =============================================================================
// Node and AliasingState
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EdgeKind {
    Capture,
    Alias,
    MaybeAlias,
}

#[derive(Debug, Clone)]
struct Edge {
    index: usize,
    node: IdentifierId,
    kind: EdgeKind,
}

#[derive(Debug, Clone)]
struct MutationInfo {
    kind: MutationKind,
    loc: Option<SourceLocation>,
}

#[derive(Debug, Clone)]
enum NodeValue {
    Object,
    Phi,
    Function { function_id: FunctionId },
}

#[derive(Debug, Clone)]
struct Node {
    id: IdentifierId,
    created_from: IndexMap<IdentifierId, usize>,
    captures: IndexMap<IdentifierId, usize>,
    aliases: IndexMap<IdentifierId, usize>,
    maybe_aliases: IndexMap<IdentifierId, usize>,
    edges: Vec<Edge>,
    transitive: Option<MutationInfo>,
    local: Option<MutationInfo>,
    last_mutated: usize,
    mutation_reason: Option<MutationReason>,
    value: NodeValue,
}

impl Node {
    fn new(id: IdentifierId, value: NodeValue) -> Self {
        Node {
            id,
            created_from: IndexMap::new(),
            captures: IndexMap::new(),
            aliases: IndexMap::new(),
            maybe_aliases: IndexMap::new(),
            edges: Vec::new(),
            transitive: None,
            local: None,
            last_mutated: 0,
            mutation_reason: None,
            value,
        }
    }
}

struct AliasingState {
    nodes: IndexMap<IdentifierId, Node>,
}

impl AliasingState {
    fn new() -> Self {
        AliasingState {
            nodes: IndexMap::new(),
        }
    }

    fn create(&mut self, place: &Place, value: NodeValue) {
        self.nodes
            .insert(place.identifier, Node::new(place.identifier, value));
    }

    fn create_from(&mut self, index: usize, from: &Place, into: &Place) {
        self.create(into, NodeValue::Object);
        let from_id = from.identifier;
        let into_id = into.identifier;
        // Add forward edge from -> into on the from node
        if let Some(from_node) = self.nodes.get_mut(&from_id) {
            from_node.edges.push(Edge {
                index,
                node: into_id,
                kind: EdgeKind::Alias,
            });
        }
        // Add created_from on the into node
        if let Some(to_node) = self.nodes.get_mut(&into_id) {
            to_node.created_from.entry(from_id).or_insert(index);
        }
    }

    fn capture(&mut self, index: usize, from: &Place, into: &Place) {
        let from_id = from.identifier;
        let into_id = into.identifier;
        if !self.nodes.contains_key(&from_id) || !self.nodes.contains_key(&into_id) {
            return;
        }
        self.nodes.get_mut(&from_id).unwrap().edges.push(Edge {
            index,
            node: into_id,
            kind: EdgeKind::Capture,
        });
        self.nodes
            .get_mut(&into_id)
            .unwrap()
            .captures
            .entry(from_id)
            .or_insert(index);
    }

    fn assign(&mut self, index: usize, from: &Place, into: &Place) {
        let from_id = from.identifier;
        let into_id = into.identifier;
        if !self.nodes.contains_key(&from_id) || !self.nodes.contains_key(&into_id) {
            return;
        }
        self.nodes.get_mut(&from_id).unwrap().edges.push(Edge {
            index,
            node: into_id,
            kind: EdgeKind::Alias,
        });
        self.nodes
            .get_mut(&into_id)
            .unwrap()
            .aliases
            .entry(from_id)
            .or_insert(index);
    }

    fn maybe_alias(&mut self, index: usize, from: &Place, into: &Place) {
        let from_id = from.identifier;
        let into_id = into.identifier;
        if !self.nodes.contains_key(&from_id) || !self.nodes.contains_key(&into_id) {
            return;
        }
        self.nodes.get_mut(&from_id).unwrap().edges.push(Edge {
            index,
            node: into_id,
            kind: EdgeKind::MaybeAlias,
        });
        self.nodes
            .get_mut(&into_id)
            .unwrap()
            .maybe_aliases
            .entry(from_id)
            .or_insert(index);
    }

    fn render(&self, index: usize, start: IdentifierId, env: &mut Environment) {
        let mut seen = HashSet::new();
        let mut queue: Vec<IdentifierId> = vec![start];
        while let Some(current) = queue.pop() {
            if !seen.insert(current) {
                continue;
            }
            let node = match self.nodes.get(&current) {
                Some(n) => n,
                None => continue,
            };
            if node.transitive.is_some() || node.local.is_some() {
                continue;
            }
            if let NodeValue::Function { function_id } = &node.value {
                append_function_errors(env, *function_id);
            }
            for (&alias, &when) in &node.created_from {
                if when >= index {
                    continue;
                }
                queue.push(alias);
            }
            for (&alias, &when) in &node.aliases {
                if when >= index {
                    continue;
                }
                queue.push(alias);
            }
            for (&capture, &when) in &node.captures {
                if when >= index {
                    continue;
                }
                queue.push(capture);
            }
        }
    }

    fn mutate(
        &mut self,
        index: usize,
        start: IdentifierId,
        end: Option<EvaluationOrder>, // None for simulated mutations
        transitive: bool,
        start_kind: MutationKind,
        loc: Option<SourceLocation>,
        reason: Option<MutationReason>,
        env: &mut Environment,
        should_record_errors: bool,
    ) {
        #[derive(Clone)]
        struct QueueEntry {
            place: IdentifierId,
            transitive: bool,
            direction: Direction,
            kind: MutationKind,
        }
        #[derive(Clone, Copy, PartialEq)]
        enum Direction {
            Backwards,
            Forwards,
        }

        let mut seen: HashMap<IdentifierId, MutationKind> = HashMap::new();
        let mut queue: Vec<QueueEntry> = vec![QueueEntry {
            place: start,
            transitive,
            direction: Direction::Backwards,
            kind: start_kind,
        }];

        while let Some(entry) = queue.pop() {
            let current = entry.place;
            let previous_kind = seen.get(&current).copied();
            if let Some(prev) = previous_kind {
                if prev >= entry.kind {
                    continue;
                }
            }
            seen.insert(current, entry.kind);

            let node = match self.nodes.get_mut(&current) {
                Some(n) => n,
                None => continue,
            };

            if node.mutation_reason.is_none() {
                node.mutation_reason = reason.clone();
            }
            node.last_mutated = node.last_mutated.max(index);

            if let Some(end_val) = end {
                let ident = &mut env.identifiers[node.id.0 as usize];
                ident.mutable_range.end = EvaluationOrder(ident.mutable_range.end.0.max(end_val.0));
            }

            if let NodeValue::Function { function_id } = &node.value {
                if node.transitive.is_none() && node.local.is_none() {
                    if should_record_errors {
                        append_function_errors(env, *function_id);
                    }
                }
            }

            if entry.transitive {
                match &node.transitive {
                    None => {
                        node.transitive = Some(MutationInfo {
                            kind: entry.kind,
                            loc,
                        });
                    }
                    Some(existing) if existing.kind < entry.kind => {
                        node.transitive = Some(MutationInfo {
                            kind: entry.kind,
                            loc,
                        });
                    }
                    _ => {}
                }
            } else {
                match &node.local {
                    None => {
                        node.local = Some(MutationInfo {
                            kind: entry.kind,
                            loc,
                        });
                    }
                    Some(existing) if existing.kind < entry.kind => {
                        node.local = Some(MutationInfo {
                            kind: entry.kind,
                            loc,
                        });
                    }
                    _ => {}
                }
            }

            // Forward edges: Capture a -> b, Alias a -> b: mutate(a) => mutate(b)
            // Collect edges to avoid borrow conflict
            let edges: Vec<Edge> = node.edges.clone();
            let node_value_kind = match &node.value {
                NodeValue::Phi => "Phi",
                _ => "Other",
            };
            let node_aliases: Vec<(IdentifierId, usize)> =
                node.aliases.iter().map(|(&k, &v)| (k, v)).collect();
            let node_maybe_aliases: Vec<(IdentifierId, usize)> =
                node.maybe_aliases.iter().map(|(&k, &v)| (k, v)).collect();
            let node_captures: Vec<(IdentifierId, usize)> =
                node.captures.iter().map(|(&k, &v)| (k, v)).collect();
            let node_created_from: Vec<(IdentifierId, usize)> =
                node.created_from.iter().map(|(&k, &v)| (k, v)).collect();

            for edge in &edges {
                if edge.index >= index {
                    break;
                }
                queue.push(QueueEntry {
                    place: edge.node,
                    transitive: entry.transitive,
                    direction: Direction::Forwards,
                    // MaybeAlias edges downgrade to conditional mutation
                    kind: if edge.kind == EdgeKind::MaybeAlias {
                        MutationKind::Conditional
                    } else {
                        entry.kind
                    },
                });
            }

            for (alias, when) in &node_created_from {
                if *when >= index {
                    continue;
                }
                queue.push(QueueEntry {
                    place: *alias,
                    transitive: true,
                    direction: Direction::Backwards,
                    kind: entry.kind,
                });
            }

            if entry.direction == Direction::Backwards || node_value_kind != "Phi" {
                // Backward alias edges
                for (alias, when) in &node_aliases {
                    if *when >= index {
                        continue;
                    }
                    queue.push(QueueEntry {
                        place: *alias,
                        transitive: entry.transitive,
                        direction: Direction::Backwards,
                        kind: entry.kind,
                    });
                }
                // MaybeAlias backward edges (downgrade to conditional)
                for (alias, when) in &node_maybe_aliases {
                    if *when >= index {
                        continue;
                    }
                    queue.push(QueueEntry {
                        place: *alias,
                        transitive: entry.transitive,
                        direction: Direction::Backwards,
                        kind: MutationKind::Conditional,
                    });
                }
            }

            // Only transitive mutations affect captures backward
            if entry.transitive {
                for (capture, when) in &node_captures {
                    if *when >= index {
                        continue;
                    }
                    queue.push(QueueEntry {
                        place: *capture,
                        transitive: entry.transitive,
                        direction: Direction::Backwards,
                        kind: entry.kind,
                    });
                }
            }
        }
    }
}

// =============================================================================
// Helper: append function errors
// =============================================================================

fn append_function_errors(env: &mut Environment, function_id: FunctionId) {
    let func = &env.functions[function_id.0 as usize];
    if let Some(ref effects) = func.aliasing_effects {
        // Collect errors first to avoid borrow conflict
        let errors: Vec<_> = effects
            .iter()
            .filter_map(|effect| match effect {
                AliasingEffect::Impure { error, .. }
                | AliasingEffect::MutateFrozen { error, .. }
                | AliasingEffect::MutateGlobal { error, .. } => Some(error.clone()),
                _ => None,
            })
            .collect();
        for error in errors {
            env.record_diagnostic(error);
        }
    }
}

// =============================================================================
// Public entry point
// =============================================================================

/// Infers mutable ranges for identifiers and populates Place effects.
///
/// Returns the externally-visible effects of the function (mutations of
/// params/context-vars, aliasing between params/context-vars/return).
///
/// Corresponds to TS `inferMutationAliasingRanges(fn, {isFunctionExpression})`.
pub fn infer_mutation_aliasing_ranges(
    func: &mut HirFunction,
    env: &mut Environment,
    is_function_expression: bool,
) -> Result<Vec<AliasingEffect>, CompilerDiagnostic> {
    let mut function_effects: Vec<AliasingEffect> = Vec::new();

    // =========================================================================
    // Part 1: Build data flow graph and infer mutable ranges
    // =========================================================================
    let mut state = AliasingState::new();

    struct PendingPhiOperand {
        from: Place,
        into: Place,
        index: usize,
    }
    let mut pending_phis: HashMap<BlockId, Vec<PendingPhiOperand>> = HashMap::new();

    struct PendingMutation {
        index: usize,
        id: EvaluationOrder,
        transitive: bool,
        kind: MutationKind,
        place: Place,
        reason: Option<MutationReason>,
    }
    let mut mutations: Vec<PendingMutation> = Vec::new();

    struct PendingRender {
        index: usize,
        place: Place,
    }
    let mut renders: Vec<PendingRender> = Vec::new();

    let mut index: usize = 0;

    let should_record_errors = !is_function_expression && env.enable_validations();

    // Create nodes for params, context vars, and return
    for param in &func.params {
        let place = match param {
            react_compiler_hir::ParamPattern::Place(p) => p,
            react_compiler_hir::ParamPattern::Spread(s) => &s.place,
        };
        state.create(place, NodeValue::Object);
    }
    for ctx in &func.context {
        state.create(ctx, NodeValue::Object);
    }
    state.create(&func.returns, NodeValue::Object);

    let mut seen_blocks: HashSet<BlockId> = HashSet::new();

    // Collect block iteration data to avoid borrow conflicts
    let block_order: Vec<BlockId> = func.body.blocks.keys().cloned().collect();

    for &block_id in &block_order {
        let block = &func.body.blocks[&block_id];

        // Process phis
        for phi in &block.phis {
            state.create(&phi.place, NodeValue::Phi);
            for (&pred, operand) in &phi.operands {
                if !seen_blocks.contains(&pred) {
                    pending_phis
                        .entry(pred)
                        .or_insert_with(Vec::new)
                        .push(PendingPhiOperand {
                            from: operand.clone(),
                            into: phi.place.clone(),
                            index: index,
                        });
                    index += 1;
                } else {
                    state.assign(index, operand, &phi.place);
                    index += 1;
                }
            }
        }
        seen_blocks.insert(block_id);

        // Process instruction effects
        let instr_ids: Vec<_> = block.instructions.clone();
        for instr_id in &instr_ids {
            let instr = &func.instructions[instr_id.0 as usize];
            let instr_eval_order = instr.id;
            let effects = match &instr.effects {
                Some(e) => e.clone(),
                None => continue,
            };
            for effect in &effects {
                match effect {
                    AliasingEffect::Create { into, .. } => {
                        state.create(into, NodeValue::Object);
                    }
                    AliasingEffect::CreateFunction {
                        into, function_id, ..
                    } => {
                        state.create(
                            into,
                            NodeValue::Function {
                                function_id: *function_id,
                            },
                        );
                    }
                    AliasingEffect::CreateFrom { from, into } => {
                        state.create_from(index, from, into);
                        index += 1;
                    }
                    AliasingEffect::Assign { from, into } => {
                        if !state.nodes.contains_key(&into.identifier) {
                            state.create(into, NodeValue::Object);
                        }
                        state.assign(index, from, into);
                        index += 1;
                    }
                    AliasingEffect::Alias { from, into } => {
                        state.assign(index, from, into);
                        index += 1;
                    }
                    AliasingEffect::MaybeAlias { from, into } => {
                        state.maybe_alias(index, from, into);
                        index += 1;
                    }
                    AliasingEffect::Capture { from, into } => {
                        state.capture(index, from, into);
                        index += 1;
                    }
                    AliasingEffect::MutateTransitive { value }
                    | AliasingEffect::MutateTransitiveConditionally { value } => {
                        let is_transitive_conditional =
                            matches!(effect, AliasingEffect::MutateTransitiveConditionally { .. });
                        mutations.push(PendingMutation {
                            index: index,
                            id: instr_eval_order,
                            transitive: true,
                            kind: if is_transitive_conditional {
                                MutationKind::Conditional
                            } else {
                                MutationKind::Definite
                            },
                            reason: None,
                            place: value.clone(),
                        });
                        index += 1;
                    }
                    AliasingEffect::Mutate { value, reason } => {
                        mutations.push(PendingMutation {
                            index: index,
                            id: instr_eval_order,
                            transitive: false,
                            kind: MutationKind::Definite,
                            reason: reason.clone(),
                            place: value.clone(),
                        });
                        index += 1;
                    }
                    AliasingEffect::MutateConditionally { value } => {
                        mutations.push(PendingMutation {
                            index: index,
                            id: instr_eval_order,
                            transitive: false,
                            kind: MutationKind::Conditional,
                            reason: None,
                            place: value.clone(),
                        });
                        index += 1;
                    }
                    AliasingEffect::MutateFrozen { .. }
                    | AliasingEffect::MutateGlobal { .. }
                    | AliasingEffect::Impure { .. } => {
                        if should_record_errors {
                            match effect {
                                AliasingEffect::MutateFrozen { error, .. }
                                | AliasingEffect::MutateGlobal { error, .. }
                                | AliasingEffect::Impure { error, .. } => {
                                    env.record_diagnostic(error.clone());
                                }
                                _ => unreachable!(),
                            }
                        }
                        function_effects.push(effect.clone());
                    }
                    AliasingEffect::Render { place } => {
                        renders.push(PendingRender {
                            index: index,
                            place: place.clone(),
                        });
                        index += 1;
                        function_effects.push(effect.clone());
                    }
                    // Other effects (Freeze, ImmutableCapture, Apply) are no-ops here
                    _ => {}
                }
            }
        }

        // Process pending phis for this block
        let block = &func.body.blocks[&block_id];
        if let Some(block_phis) = pending_phis.remove(&block_id) {
            for pending in block_phis {
                state.assign(pending.index, &pending.from, &pending.into);
            }
        }

        // Handle return terminal
        let terminal = &block.terminal;
        if let react_compiler_hir::Terminal::Return { value, .. } = terminal {
            state.assign(index, value, &func.returns);
            index += 1;
        }

        // Handle terminal effects (MaybeThrow and Return)
        let terminal_effects = match terminal {
            react_compiler_hir::Terminal::MaybeThrow { effects, .. }
            | react_compiler_hir::Terminal::Return { effects, .. } => effects.clone(),
            _ => None,
        };
        if let Some(effects) = terminal_effects {
            for effect in &effects {
                match effect {
                    AliasingEffect::Alias { from, into } => {
                        state.assign(index, from, into);
                        index += 1;
                    }
                    AliasingEffect::Freeze { .. } => {
                        // Expected for MaybeThrow terminals, skip
                    }
                    _ => {
                        // TS: CompilerError.invariant(effect.kind === 'Freeze', ...)
                        // We skip non-Alias, non-Freeze effects
                    }
                }
            }
        }
    }

    // Process mutations
    for mutation in &mutations {
        state.mutate(
            mutation.index,
            mutation.place.identifier,
            Some(EvaluationOrder(mutation.id.0 + 1)),
            mutation.transitive,
            mutation.kind,
            mutation.place.loc,
            mutation.reason.clone(),
            env,
            should_record_errors,
        );
    }

    // Process renders
    for render in &renders {
        if should_record_errors {
            state.render(render.index, render.place.identifier, env);
        }
    }

    // Collect function effects for context vars and params
    // NOTE: TS iterates [...fn.context, ...fn.params] — context first, then params
    for ctx in &func.context {
        collect_param_effects(&state, ctx, &mut function_effects);
    }
    for param in &func.params {
        let place = match param {
            react_compiler_hir::ParamPattern::Place(p) => p,
            react_compiler_hir::ParamPattern::Spread(s) => &s.place,
        };
        collect_param_effects(&state, place, &mut function_effects);
    }

    // Set effect on mutated params/context vars
    // We need to do this in a separate pass because we need to know which params
    // were mutated before setting effects
    let mut captured_params: HashSet<IdentifierId> = HashSet::new();
    for param in &func.params {
        let place = match param {
            react_compiler_hir::ParamPattern::Place(p) => p,
            react_compiler_hir::ParamPattern::Spread(s) => &s.place,
        };
        if let Some(node) = state.nodes.get(&place.identifier) {
            if node.local.is_some() || node.transitive.is_some() {
                captured_params.insert(place.identifier);
            }
        }
    }
    for ctx in &func.context {
        if let Some(node) = state.nodes.get(&ctx.identifier) {
            if node.local.is_some() || node.transitive.is_some() {
                captured_params.insert(ctx.identifier);
            }
        }
    }

    // Now mutate the effects on params/context in place
    for param in &mut func.params {
        let place = match param {
            react_compiler_hir::ParamPattern::Place(p) => p,
            react_compiler_hir::ParamPattern::Spread(s) => &mut s.place,
        };
        if captured_params.contains(&place.identifier) {
            place.effect = Effect::Capture;
        }
    }
    for ctx in &mut func.context {
        if captured_params.contains(&ctx.identifier) {
            ctx.effect = Effect::Capture;
        }
    }

    // =========================================================================
    // Part 2: Add legacy operand-specific effects based on instruction effects
    //         and mutable ranges. Also fix up mutable range start values.
    // =========================================================================
    // Part 2 loop
    for &block_id in &block_order {
        let block = &func.body.blocks[&block_id];

        // Process phis
        let phi_data: Vec<_> = block
            .phis
            .iter()
            .map(|phi| {
                let first_instr_id = block
                    .instructions
                    .first()
                    .map(|id| func.instructions[id.0 as usize].id)
                    .unwrap_or_else(|| block.terminal.evaluation_order());

                let is_mutated_after_creation = env.identifiers[phi.place.identifier.0 as usize]
                    .mutable_range
                    .end
                    > first_instr_id;

                (
                    phi.place.identifier,
                    phi.operands
                        .values()
                        .map(|o| o.identifier)
                        .collect::<Vec<_>>(),
                    is_mutated_after_creation,
                    first_instr_id,
                )
            })
            .collect();

        for (phi_id, _operand_ids, is_mutated_after_creation, first_instr_id) in &phi_data {
            // Set phi place effect to Store
            // We need to find this phi in the block and set it
            let block = func.body.blocks.get_mut(&block_id).unwrap();
            for phi in &mut block.phis {
                if phi.place.identifier == *phi_id {
                    phi.place.effect = Effect::Store;
                    for operand in phi.operands.values_mut() {
                        operand.effect = if *is_mutated_after_creation {
                            Effect::Capture
                        } else {
                            Effect::Read
                        };
                    }
                    break;
                }
            }

            if *is_mutated_after_creation {
                let ident = &mut env.identifiers[phi_id.0 as usize];
                if ident.mutable_range.start == EvaluationOrder(0) {
                    ident.mutable_range.start = EvaluationOrder(first_instr_id.0.saturating_sub(1));
                }
            }
        }

        let block = &func.body.blocks[&block_id];
        let instr_ids: Vec<_> = block.instructions.clone();

        for instr_id in &instr_ids {
            let instr = &func.instructions[instr_id.0 as usize];
            let eval_order = instr.id;

            // Set lvalue effect to ConditionallyMutate and fix up mutable range
            // This covers the top-level lvalue
            let lvalue_id = instr.lvalue.identifier;
            {
                let ident = &mut env.identifiers[lvalue_id.0 as usize];
                if ident.mutable_range.start == EvaluationOrder(0) {
                    ident.mutable_range.start = eval_order;
                }
                if ident.mutable_range.end == EvaluationOrder(0) {
                    ident.mutable_range.end =
                        EvaluationOrder((eval_order.0 + 1).max(ident.mutable_range.end.0));
                }
            }
            func.instructions[instr_id.0 as usize].lvalue.effect = Effect::ConditionallyMutate;

            // Also handle value-level lvalues (DeclareLocal, StoreLocal, etc.)
            let value_lvalue_ids: Vec<IdentifierId> =
                each_instruction_value_lvalue(&func.instructions[instr_id.0 as usize].value)
                    .into_iter()
                    .map(|p| p.identifier)
                    .collect();
            for vlid in &value_lvalue_ids {
                let ident = &mut env.identifiers[vlid.0 as usize];
                if ident.mutable_range.start == EvaluationOrder(0) {
                    ident.mutable_range.start = eval_order;
                }
                if ident.mutable_range.end == EvaluationOrder(0) {
                    ident.mutable_range.end =
                        EvaluationOrder((eval_order.0 + 1).max(ident.mutable_range.end.0));
                }
            }
            for_each_instruction_value_lvalue_mut(
                &mut func.instructions[instr_id.0 as usize].value,
                &mut |place| {
                    place.effect = Effect::ConditionallyMutate;
                },
            );

            // Set operand effects to Read
            for_each_instruction_value_operand_mut(
                &mut func.instructions[instr_id.0 as usize].value,
                &mut |place| {
                    place.effect = Effect::Read;
                },
            );

            let instr = &func.instructions[instr_id.0 as usize];
            if instr.effects.is_none() {
                continue;
            }

            // Compute operand effects from instruction effects
            let effects = instr.effects.as_ref().unwrap().clone();
            let mut operand_effects: HashMap<IdentifierId, Effect> = HashMap::new();

            for effect in &effects {
                match effect {
                    AliasingEffect::Assign { from, into, .. }
                    | AliasingEffect::Alias { from, into }
                    | AliasingEffect::Capture { from, into }
                    | AliasingEffect::CreateFrom { from, into }
                    | AliasingEffect::MaybeAlias { from, into } => {
                        let is_mutated_or_reassigned = env.identifiers[into.identifier.0 as usize]
                            .mutable_range
                            .end
                            > eval_order;
                        if is_mutated_or_reassigned {
                            operand_effects.insert(from.identifier, Effect::Capture);
                            operand_effects.insert(into.identifier, Effect::Store);
                        } else {
                            operand_effects.insert(from.identifier, Effect::Read);
                            operand_effects.insert(into.identifier, Effect::Store);
                        }
                    }
                    AliasingEffect::CreateFunction { .. } | AliasingEffect::Create { .. } => {
                        // no-op
                    }
                    AliasingEffect::Mutate { value, .. } => {
                        operand_effects.insert(value.identifier, Effect::Store);
                    }
                    AliasingEffect::Apply { .. } => {
                        return Err(CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "[AnalyzeFunctions] Expected Apply effects to be replaced with more precise effects",
                            None,
                        ));
                    }
                    AliasingEffect::MutateTransitive { value, .. }
                    | AliasingEffect::MutateConditionally { value }
                    | AliasingEffect::MutateTransitiveConditionally { value } => {
                        operand_effects.insert(value.identifier, Effect::ConditionallyMutate);
                    }
                    AliasingEffect::Freeze { value, .. } => {
                        operand_effects.insert(value.identifier, Effect::Freeze);
                    }
                    AliasingEffect::ImmutableCapture { .. } => {
                        // no-op, Read is the default
                    }
                    AliasingEffect::Impure { .. }
                    | AliasingEffect::Render { .. }
                    | AliasingEffect::MutateFrozen { .. }
                    | AliasingEffect::MutateGlobal { .. } => {
                        // no-op
                    }
                }
            }

            // Apply operand effects to top-level lvalue
            let instr = &mut func.instructions[instr_id.0 as usize];
            let lvalue_id = instr.lvalue.identifier;
            if let Some(&effect) = operand_effects.get(&lvalue_id) {
                instr.lvalue.effect = effect;
            }
            // Apply operand effects to value-level lvalues
            for_each_instruction_value_lvalue_mut(&mut instr.value, &mut |place| {
                if let Some(&effect) = operand_effects.get(&place.identifier) {
                    place.effect = effect;
                }
            });

            // Apply operand effects to value operands and fix up mutable ranges
            {
                let mut apply = |place: &mut Place| {
                    // Fix up mutable range start
                    let ident = &env.identifiers[place.identifier.0 as usize];
                    if ident.mutable_range.end > eval_order
                        && ident.mutable_range.start == EvaluationOrder(0)
                    {
                        env.identifiers[place.identifier.0 as usize]
                            .mutable_range
                            .start = eval_order;
                    }
                    // Apply effect
                    if let Some(&effect) = operand_effects.get(&place.identifier) {
                        place.effect = effect;
                    }
                };
                for_each_instruction_value_operand_mut(&mut instr.value, &mut apply);

                // FunctionExpression/ObjectMethod context variables are operands that
                // require env access (they live in env.functions[func_id].context).
                if let InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } = &instr.value
                {
                    let func_id = lowered_func.func;
                    let ctx_ids: Vec<IdentifierId> = env.functions[func_id.0 as usize]
                        .context
                        .iter()
                        .map(|c| c.identifier)
                        .collect();
                    for ctx_id in &ctx_ids {
                        let ident = &env.identifiers[ctx_id.0 as usize];
                        if ident.mutable_range.end > eval_order
                            && ident.mutable_range.start == EvaluationOrder(0)
                        {
                            env.identifiers[ctx_id.0 as usize].mutable_range.start = eval_order;
                        }
                        let effect = operand_effects.get(ctx_id).copied().unwrap_or(Effect::Read);
                        let inner_func = &mut env.functions[func_id.0 as usize];
                        for ctx_place in &mut inner_func.context {
                            if ctx_place.identifier == *ctx_id {
                                ctx_place.effect = effect;
                            }
                        }
                    }
                }
            }

            // Handle StoreContext case: extend rvalue range if needed
            let instr = &func.instructions[instr_id.0 as usize];
            if let InstructionValue::StoreContext { value, .. } = &instr.value {
                let val_id = value.identifier;
                let val_range_end = env.identifiers[val_id.0 as usize].mutable_range.end;
                if val_range_end <= eval_order {
                    env.identifiers[val_id.0 as usize].mutable_range.end =
                        EvaluationOrder(eval_order.0 + 1);
                }
            }
        }

        // Set terminal operand effects
        let block = func.body.blocks.get_mut(&block_id).unwrap();
        match &mut block.terminal {
            react_compiler_hir::Terminal::Return { value, .. } => {
                value.effect = if is_function_expression {
                    Effect::Read
                } else {
                    Effect::Freeze
                };
            }
            terminal => {
                for_each_terminal_operand_mut(terminal, &mut |place| {
                    place.effect = Effect::Read;
                });
            }
        }
    }

    // =========================================================================
    // Part 3: Finish populating the externally visible effects
    // =========================================================================
    let returns_id = func.returns.identifier;
    let returns_type_id = env.identifiers[returns_id.0 as usize].type_;
    let returns_type = &env.types[returns_type_id.0 as usize];
    let return_value_kind = if is_primitive_type(returns_type) {
        ValueKind::Primitive
    } else if is_jsx_type(returns_type) {
        ValueKind::Frozen
    } else {
        ValueKind::Mutable
    };

    function_effects.push(AliasingEffect::Create {
        into: func.returns.clone(),
        value: return_value_kind,
        reason: ValueReason::KnownReturnSignature,
    });

    // Determine precise data-flow effects by simulating transitive mutations
    let mut tracked: Vec<Place> = Vec::new();
    for param in &func.params {
        let place = match param {
            react_compiler_hir::ParamPattern::Place(p) => p.clone(),
            react_compiler_hir::ParamPattern::Spread(s) => s.place.clone(),
        };
        tracked.push(place);
    }
    for ctx in &func.context {
        tracked.push(ctx.clone());
    }
    tracked.push(func.returns.clone());

    let returns_identifier_id = func.returns.identifier;

    for i in 0..tracked.len() {
        let into = tracked[i].clone();
        let mutation_index = index;
        index += 1;

        state.mutate(
            mutation_index,
            into.identifier,
            None, // simulated mutation
            true,
            MutationKind::Conditional,
            into.loc,
            None,
            env,
            false, // never record errors for simulated mutations
        );

        for j in 0..tracked.len() {
            let from = &tracked[j];
            if from.identifier == into.identifier || from.identifier == returns_identifier_id {
                continue;
            }

            let from_node = state.nodes.get(&from.identifier);
            assert!(
                from_node.is_some(),
                "Expected a node to exist for all parameters and context variables"
            );
            let from_node = from_node.unwrap();

            if from_node.last_mutated == mutation_index {
                if into.identifier == returns_identifier_id {
                    function_effects.push(AliasingEffect::Alias {
                        from: from.clone(),
                        into: into.clone(),
                    });
                } else {
                    function_effects.push(AliasingEffect::Capture {
                        from: from.clone(),
                        into: into.clone(),
                    });
                }
            }
        }
    }

    Ok(function_effects)
}

// =============================================================================
// Helper: collect param/context mutation effects
// =============================================================================

fn collect_param_effects(
    state: &AliasingState,
    place: &Place,
    function_effects: &mut Vec<AliasingEffect>,
) {
    let node = match state.nodes.get(&place.identifier) {
        Some(n) => n,
        None => return,
    };

    if let Some(ref local) = node.local {
        match local.kind {
            MutationKind::Conditional => {
                function_effects.push(AliasingEffect::MutateConditionally {
                    value: Place {
                        loc: local.loc,
                        ..place.clone()
                    },
                });
            }
            MutationKind::Definite => {
                function_effects.push(AliasingEffect::Mutate {
                    value: Place {
                        loc: local.loc,
                        ..place.clone()
                    },
                    reason: node.mutation_reason.clone(),
                });
            }
            MutationKind::None => {}
        }
    }

    if let Some(ref transitive) = node.transitive {
        match transitive.kind {
            MutationKind::Conditional => {
                function_effects.push(AliasingEffect::MutateTransitiveConditionally {
                    value: Place {
                        loc: transitive.loc,
                        ..place.clone()
                    },
                });
            }
            MutationKind::Definite => {
                function_effects.push(AliasingEffect::MutateTransitive {
                    value: Place {
                        loc: transitive.loc,
                        ..place.clone()
                    },
                });
            }
            MutationKind::None => {}
        }
    }
}

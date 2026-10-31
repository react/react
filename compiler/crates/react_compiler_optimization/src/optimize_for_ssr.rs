// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Optimizes the code for running in an SSR environment.
//!
//! Assumes that event handlers (functions that call setState or startTransition)
//! are not called during render, which allows removing them.
//!
//! Optimizations:
//! - Inline useState/useReducer whose setter or dispatch function is not read
//!   once the optimizations below are applied, and whose value is the same in
//!   every render pass
//! - Remove effects (useEffect, useLayoutEffect, useInsertionEffect)
//! - Remove event handlers (functions that call setState or startTransition)
//! - Remove known event handler props and ref props from builtin JSX tags
//! - Inline useEffectEvent to its argument
//!
//! Ported from TypeScript `src/Optimization/OptimizeForSSR.ts`.

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_hir::environment::Environment;
use react_compiler_hir::object_shape::HookKind;
use react_compiler_hir::visitors::{each_instruction_value_operand, each_terminal_operand};
use react_compiler_hir::{
    ArrayPatternElement, HirFunction, IdentifierId, InstructionValue, PlaceOrSpread,
    PrimitiveValue, is_set_state_type, is_start_transition_type,
};

use crate::dead_code_elimination::{find_referenced_identifiers, is_id_or_name_used, is_id_used};

/// Optimizes a function for SSR by inlining state hooks, removing effects,
/// removing event handlers, and stripping known event handler / ref JSX props.
///
/// Corresponds to TS `optimizeForSSR(fn: HIRFunction): void`.
pub fn optimize_for_ssr(func: &mut HirFunction, env: &Environment) {
    // Phase 1: Identify useState/useReducer calls that can be safely inlined.
    //
    // For useState(initialValue) where initialValue is primitive/object/array,
    // store a LoadLocal of the initial value.
    //
    // For useReducer(reducer, initialArg) store a LoadLocal of initialArg.
    // For useReducer(reducer, initialArg, init) store a CallExpression of init(initialArg).
    //
    // Any use of the hook return other than the expected destructuring pattern
    // prevents inlining (we delete from inlined_state if we see the identifier used
    // as an operand elsewhere).
    let mut inlined_state: FxHashMap<IdentifierId, InlinedStateReplacement> = FxHashMap::default();
    // The results of every useState/useReducer call, whether or not it can be inlined, mapped to
    // the identifier their liveness is tracked by
    let mut state_hooks: FxHashMap<IdentifierId, IdentifierId> = FxHashMap::default();
    // State hook results used other than by `[state, ...] = <result>` destructuring
    let mut exposed_state_hooks: FxHashSet<IdentifierId> = FxHashSet::default();
    // Inlinable state whose initial value is a primitive literal
    let mut constant_state: FxHashSet<IdentifierId> = FxHashSet::default();
    // Inlinable useReducer calls with an initializer, which React calls only on mount
    let mut reducer_initializers: FxHashSet<IdentifierId> = FxHashSet::default();
    let mut primitives: FxHashSet<IdentifierId> = FxHashSet::default();
    // A custom hook may update its own state during render, or return a setter that is called
    let mut calls_custom_hook = false;

    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::Primitive { .. } => {
                    primitives.insert(env.identifiers[instr.lvalue.identifier.0 as usize].id);
                }
                InstructionValue::Destructure { value, lvalue, .. } => {
                    if state_hooks.contains_key(&env.identifiers[value.identifier.0 as usize].id) {
                        if let react_compiler_hir::Pattern::Array(arr) = &lvalue.pattern {
                            if !arr.items.is_empty() {
                                if let ArrayPatternElement::Place(_) = &arr.items[0] {
                                    // Allow destructuring of inlined states
                                    continue;
                                }
                            }
                        }
                    }
                }
                InstructionValue::MethodCall { property, args, .. }
                | InstructionValue::CallExpression {
                    callee: property,
                    args,
                    ..
                } => {
                    // Determine callee based on instruction kind
                    let callee_id = property.identifier;
                    let hook_kind = get_hook_kind(env, callee_id);
                    if matches!(hook_kind, Some(HookKind::UseState | HookKind::UseReducer)) {
                        state_hooks.insert(
                            env.identifiers[instr.lvalue.identifier.0 as usize].id,
                            instr.lvalue.identifier,
                        );
                    } else if matches!(hook_kind, Some(HookKind::Custom)) {
                        calls_custom_hook = true;
                    }
                    match hook_kind {
                        Some(HookKind::UseReducer) => {
                            if args.len() == 2 {
                                if let (PlaceOrSpread::Place(_), PlaceOrSpread::Place(arg)) =
                                    (&args[0], &args[1])
                                {
                                    let lvalue_id =
                                        env.identifiers[instr.lvalue.identifier.0 as usize].id;
                                    inlined_state.insert(
                                        lvalue_id,
                                        InlinedStateReplacement::LoadLocal {
                                            place: arg.clone(),
                                            loc: arg.loc,
                                        },
                                    );
                                    if primitives
                                        .contains(&env.identifiers[arg.identifier.0 as usize].id)
                                    {
                                        constant_state.insert(lvalue_id);
                                    }
                                }
                            } else if args.len() == 3 {
                                if let (
                                    PlaceOrSpread::Place(_),
                                    PlaceOrSpread::Place(arg),
                                    PlaceOrSpread::Place(initializer),
                                ) = (&args[0], &args[1], &args[2])
                                {
                                    let lvalue_id =
                                        env.identifiers[instr.lvalue.identifier.0 as usize].id;
                                    let call_loc = instr.value.loc().copied();
                                    inlined_state.insert(
                                        lvalue_id,
                                        InlinedStateReplacement::CallExpression {
                                            callee: initializer.clone(),
                                            arg: arg.clone(),
                                            loc: call_loc,
                                        },
                                    );
                                    reducer_initializers.insert(lvalue_id);
                                }
                            }
                        }
                        Some(HookKind::UseState) => {
                            if args.len() == 1 {
                                if let PlaceOrSpread::Place(arg) = &args[0] {
                                    let arg_type = &env.types[env.identifiers
                                        [arg.identifier.0 as usize]
                                        .type_
                                        .0
                                        as usize];
                                    if react_compiler_hir::is_primitive_type(arg_type)
                                        || react_compiler_hir::is_plain_object_type(arg_type)
                                        || react_compiler_hir::is_array_type(arg_type)
                                    {
                                        let lvalue_id =
                                            env.identifiers[instr.lvalue.identifier.0 as usize].id;
                                        inlined_state.insert(
                                            lvalue_id,
                                            InlinedStateReplacement::LoadLocal {
                                                place: arg.clone(),
                                                loc: arg.loc,
                                            },
                                        );
                                        if primitives.contains(
                                            &env.identifiers[arg.identifier.0 as usize].id,
                                        ) {
                                            constant_state.insert(lvalue_id);
                                        }
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }

            // Any use of useState/useReducer return besides destructuring prevents inlining
            if !state_hooks.is_empty() {
                let operands = each_instruction_value_operand(&instr.value, env);
                for operand in &operands {
                    let id = env.identifiers[operand.identifier.0 as usize].id;
                    if state_hooks.contains_key(&id) {
                        inlined_state.remove(&id);
                        exposed_state_hooks.insert(id);
                    }
                }
            }
        }
        if !state_hooks.is_empty() {
            let operands = each_terminal_operand(&block.terminal);
            for operand in &operands {
                let id = env.identifiers[operand.identifier.0 as usize].id;
                if state_hooks.contains_key(&id) {
                    inlined_state.remove(&id);
                    exposed_state_hooks.insert(id);
                }
            }
        }
    }

    // Phase 2: Remove code that does not run during SSR
    //
    // - Replace FunctionExpression with Primitive(undefined) if it calls setState/startTransition
    // - Remove known event handler props and ref props from builtin JSX tags
    // - Replace useEffectEvent(fn) with LoadLocal(fn)
    // - Replace useEffect/useLayoutEffect/useInsertionEffect with Primitive(undefined)
    for (_block_id, block) in &mut func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &mut func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression {
                    lowered_func, loc, ..
                } => {
                    let inner_func = &env.functions[lowered_func.func.0 as usize];
                    if has_known_non_render_call(inner_func, env) {
                        let loc = *loc;
                        instr.value = InstructionValue::Primitive {
                            value: PrimitiveValue::Undefined,
                            loc,
                        };
                    }
                }
                InstructionValue::JsxExpression { tag, .. } => {
                    if let react_compiler_hir::JsxTag::Builtin(builtin) = tag {
                        // Only optimize non-custom-element builtin tags
                        if !builtin.name.contains('-') {
                            let tag_name = builtin.name.clone();
                            // Retain only props that are not known event handlers and not "ref"
                            if let InstructionValue::JsxExpression { props, .. } = &mut instr.value
                            {
                                props.retain(|prop| match prop {
                                    react_compiler_hir::JsxAttribute::SpreadAttribute {
                                        ..
                                    } => true,
                                    react_compiler_hir::JsxAttribute::Attribute {
                                        name, ..
                                    } => !is_known_event_handler(&tag_name, name) && name != "ref",
                                });
                            }
                        }
                    }
                }
                InstructionValue::MethodCall {
                    property,
                    args,
                    loc,
                    ..
                }
                | InstructionValue::CallExpression {
                    callee: property,
                    args,
                    loc,
                    ..
                } => {
                    let callee_id = property.identifier;
                    let hook_kind = get_hook_kind(env, callee_id);
                    match hook_kind {
                        Some(HookKind::UseEffectEvent) => {
                            if args.len() == 1 {
                                if let PlaceOrSpread::Place(arg) = &args[0] {
                                    let loc = *loc;
                                    instr.value = InstructionValue::LoadLocal {
                                        place: arg.clone(),
                                        loc,
                                    };
                                }
                            }
                        }
                        Some(
                            HookKind::UseEffect
                            | HookKind::UseLayoutEffect
                            | HookKind::UseInsertionEffect,
                        ) => {
                            let loc = *loc;
                            instr.value = InstructionValue::Primitive {
                                value: PrimitiveValue::Undefined,
                                loc,
                            };
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        }
    }

    if inlined_state.is_empty() {
        return;
    }

    // Inlining state drops its setter (or dispatch function) and evaluates its initial value on
    // every render pass, so it needs two guarantees. Liveness is computed the way dead code
    // elimination would see it after the removals above, without removing anything:
    //
    // - The setter is no longer read. A setter passed to a child, provided through context,
    //   returned from a custom hook, or called during render (which React supports) would be
    //   left undeclared, so that state keeps its hook.
    // - The value is the same in every render pass. A setter that is still read may update state
    //   during render, and React then renders the component again with the state it already
    //   has. Inlined state would instead recompute its initial value, so while any setter is
    //   still read, or a custom hook is called, state that is read keeps its hook unless it
    //   starts at a primitive literal. A reducer with an initializer keeps its hook even if its
    //   state is unread: React calls `init` only on the first pass, and dead code elimination
    //   keeps it.
    let live = find_referenced_identifiers(func, env);
    let mut render_phase_updates_possible = calls_custom_hook
        || state_hooks.iter().any(|(id, identifier)| {
            exposed_state_hooks.contains(id) && is_id_used(&live, *identifier)
        });
    let mut state_read: FxHashSet<IdentifierId> = FxHashSet::default();
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let InstructionValue::Destructure { value, lvalue, .. } = &instr.value else {
                continue;
            };
            let value_id = env.identifiers[value.identifier.0 as usize].id;
            let react_compiler_hir::Pattern::Array(arr) = &lvalue.pattern else {
                continue;
            };
            if !state_hooks.contains_key(&value_id) {
                continue;
            }
            let is_setter_read = arr.items.iter().skip(1).any(|item| match item {
                ArrayPatternElement::Place(place) => {
                    is_id_or_name_used(&live, &env.identifiers, place.identifier)
                }
                ArrayPatternElement::Spread(spread) => {
                    is_id_or_name_used(&live, &env.identifiers, spread.place.identifier)
                }
                ArrayPatternElement::Hole => false,
            });
            if is_setter_read {
                render_phase_updates_possible = true;
                inlined_state.remove(&value_id);
            }
            if let Some(ArrayPatternElement::Place(state)) = arr.items.first() {
                if is_id_or_name_used(&live, &env.identifiers, state.identifier) {
                    state_read.insert(value_id);
                }
            }
        }
    }
    if render_phase_updates_possible {
        inlined_state.retain(|id, _| {
            !reducer_initializers.contains(id)
                && (!state_read.contains(id) || constant_state.contains(id))
        });
    }
    inline_state(func, env, &inlined_state);
}

/// Replaces the given useState/useReducer calls with their initial value, and their
/// `[state, ...]` destructuring with a StoreLocal of the state.
fn inline_state(
    func: &mut HirFunction,
    env: &Environment,
    inline: &FxHashMap<IdentifierId, InlinedStateReplacement>,
) {
    for (_block_id, block) in &mut func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &mut func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::Destructure { value, lvalue, loc } => {
                    let value_id = env.identifiers[value.identifier.0 as usize].id;
                    if inline.contains_key(&value_id) {
                        // Invariant: destructuring pattern must be ArrayPattern with at least one Identifier item
                        if let react_compiler_hir::Pattern::Array(arr) = &lvalue.pattern {
                            if !arr.items.is_empty() {
                                if let ArrayPatternElement::Place(first_place) = &arr.items[0] {
                                    let loc = *loc;
                                    let kind = lvalue.kind;
                                    let store = InstructionValue::StoreLocal {
                                        lvalue: react_compiler_hir::LValue {
                                            place: first_place.clone(),
                                            kind,
                                        },
                                        value: value.clone(),
                                        type_annotation: None,
                                        loc,
                                    };
                                    instr.value = store;
                                }
                            }
                        }
                    }
                }
                InstructionValue::MethodCall { property, .. }
                | InstructionValue::CallExpression {
                    callee: property, ..
                } => {
                    let callee_id = property.identifier;
                    let hook_kind = get_hook_kind(env, callee_id);
                    if let Some(HookKind::UseReducer | HookKind::UseState) = hook_kind {
                        let lvalue_id = env.identifiers[instr.lvalue.identifier.0 as usize].id;
                        if let Some(replacement) = inline.get(&lvalue_id) {
                            instr.value = match replacement {
                                InlinedStateReplacement::LoadLocal { place, loc } => {
                                    InstructionValue::LoadLocal {
                                        place: place.clone(),
                                        loc: *loc,
                                    }
                                }
                                InlinedStateReplacement::CallExpression { callee, arg, loc } => {
                                    InstructionValue::CallExpression {
                                        callee: callee.clone(),
                                        args: vec![PlaceOrSpread::Place(arg.clone())],
                                        loc: *loc,
                                    }
                                }
                            };
                        }
                    }
                }
                _ => {}
            }
        }
    }
}

/// Replacement values for inlined useState/useReducer calls.
#[derive(Debug, Clone)]
enum InlinedStateReplacement {
    /// Replace with `LoadLocal { place }` — used for useState and useReducer(reducer, initialArg)
    LoadLocal {
        place: react_compiler_hir::Place,
        loc: Option<react_compiler_hir::SourceLocation>,
    },
    /// Replace with `CallExpression { callee, args: [arg] }` — used for useReducer(reducer, initialArg, init)
    CallExpression {
        callee: react_compiler_hir::Place,
        arg: react_compiler_hir::Place,
        loc: Option<react_compiler_hir::SourceLocation>,
    },
}

/// Returns true if the function body contains a call to setState or startTransition.
/// This identifies functions that are event handlers and can be replaced with undefined
/// during SSR.
///
/// Corresponds to TS `hasKnownNonRenderCall(fn: HIRFunction): boolean`.
fn has_known_non_render_call(func: &HirFunction, env: &Environment) -> bool {
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            if let InstructionValue::CallExpression { callee, .. } = &instr.value {
                let callee_type =
                    &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                if is_set_state_type(callee_type) || is_start_transition_type(callee_type) {
                    return true;
                }
            }
        }
    }
    false
}

/// Returns true if the prop name matches the known event handler pattern `on[A-Z]`.
fn is_known_event_handler(_tag: &str, prop: &str) -> bool {
    if prop.len() < 3 {
        return false;
    }
    if !prop.starts_with("on") {
        return false;
    }
    let third_char = prop.as_bytes()[2];
    third_char.is_ascii_uppercase()
}

/// Get the hook kind for an identifier, if its type represents a hook.
fn get_hook_kind(env: &Environment, identifier_id: IdentifierId) -> Option<HookKind> {
    env.get_hook_kind_for_id(identifier_id)
        .ok()
        .flatten()
        .cloned()
}

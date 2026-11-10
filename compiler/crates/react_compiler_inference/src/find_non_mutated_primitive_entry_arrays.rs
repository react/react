// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

use react_compiler_hir::environment::Environment;
use react_compiler_hir::object_shape::BUILT_IN_OBJECT_FROM_ENTRIES_ID;
use react_compiler_hir::visitors::each_instruction_value_operand;
use react_compiler_hir::{ArrayElement, HirFunction, IdentifierId, InstructionValue, Place, Type};
use rustc_hash::{FxHashMap, FxHashSet};

pub(crate) fn is_object_from_entries(value: &InstructionValue, env: &Environment) -> bool {
    let callee = match value {
        InstructionValue::CallExpression { callee, .. } => callee,
        InstructionValue::MethodCall { property, .. } => property,
        _ => return false,
    };
    matches!(
        &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize],
        Type::Function { shape_id: Some(id), .. } if id == BUILT_IN_OBJECT_FROM_ENTRIES_ID
    )
}

/// Prove that iteration and key coercion cannot mutate an entries array.
/// Follow local aliases and container captures, rejecting every allocation
/// reachable from a potentially mutating use. Unknown aliases, including phis
/// and property loads, lose the proof. Each instruction and capture is visited
/// a constant number of times.
pub(crate) fn find_non_mutated_primitive_entry_arrays(
    func: &HirFunction,
    env: &Environment,
) -> FxHashSet<IdentifierId> {
    if !func.body.blocks.values().any(|block| {
        block
            .instructions
            .iter()
            .any(|id| is_object_from_entries(&func.instructions[id.0 as usize].value, env))
    }) {
        return FxHashSet::default();
    }
    let mut origins = FxHashMap::default();
    let mut captures = FxHashMap::<IdentifierId, Vec<IdentifierId>>::default();
    let mut primitive_key_arrays = FxHashSet::default();
    let mut entries = FxHashMap::<IdentifierId, Vec<IdentifierId>>::default();
    for block in func.body.blocks.values() {
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let id = instr.lvalue.identifier;
            match &instr.value {
                InstructionValue::LoadLocal { place, .. }
                | InstructionValue::TypeCastExpression { value: place, .. } => {
                    if let Some(origin) = origins.get(&place.identifier).copied() {
                        origins.insert(id, origin);
                    }
                }
                InstructionValue::StoreLocal { lvalue, value, .. } => {
                    if let Some(origin) = origins.get(&value.identifier).copied() {
                        origins.insert(id, origin);
                        origins.insert(lvalue.place.identifier, origin);
                    }
                }
                value => {
                    if !matches!(
                        value,
                        InstructionValue::ArrayExpression { .. }
                            | InstructionValue::ObjectExpression { .. }
                    ) && !is_object_from_entries(value, env)
                    {
                        continue;
                    }
                    origins.insert(id, id);
                    captures.insert(
                        id,
                        each_instruction_value_operand(value, env)
                            .iter()
                            .filter_map(|operand| origins.get(&operand.identifier).copied())
                            .collect(),
                    );
                    let InstructionValue::ArrayExpression { elements, .. } = value else {
                        continue;
                    };
                    if let Some(ArrayElement::Place(first)) = elements.first() {
                        if matches!(
                            env.types
                                [env.identifiers[first.identifier.0 as usize].type_.0 as usize],
                            Type::Primitive
                        ) {
                            primitive_key_arrays.insert(id);
                        }
                    }
                    let mut known_elements = Vec::with_capacity(elements.len());
                    let mut known_entries = true;
                    for element in elements {
                        let origin = match element {
                            ArrayElement::Place(place) => origins.get(&place.identifier),
                            _ => None,
                        };
                        let Some(origin) = origin.filter(|id| primitive_key_arrays.contains(id))
                        else {
                            known_entries = false;
                            break;
                        };
                        known_elements.push(*origin);
                    }
                    if known_entries {
                        entries.insert(id, known_elements);
                    }
                }
            }
        }
    }
    let mut invalid = FxHashSet::default();
    let mut pending = Vec::new();
    let invalidate = |place: &Place, invalid: &mut FxHashSet<_>, pending: &mut Vec<_>| {
        if let Some(origin) = origins.get(&place.identifier) {
            if invalid.insert(*origin) {
                pending.push(*origin);
            }
        }
    };
    for block in func.body.blocks.values() {
        for phi in &block.phis {
            for operand in phi.operands.values() {
                invalidate(operand, &mut invalid, &mut pending);
            }
        }
        for instr_id in &block.instructions {
            let value = &func.instructions[instr_id.0 as usize].value;
            match value {
                InstructionValue::LoadLocal { .. }
                | InstructionValue::StoreLocal { .. }
                | InstructionValue::TypeCastExpression { .. }
                | InstructionValue::ArrayExpression { .. }
                | InstructionValue::ObjectExpression { .. }
                | InstructionValue::JsxExpression { .. }
                | InstructionValue::JsxFragment { .. } => continue,
                _ => {}
            }
            let first_arg = match value {
                InstructionValue::CallExpression { args, .. }
                | InstructionValue::MethodCall { args, .. } => args.first(),
                _ => None,
            };
            if is_object_from_entries(value, env)
                && matches!(first_arg,
                    Some(react_compiler_hir::PlaceOrSpread::Place(arg))
                        if origins.get(&arg.identifier).is_some_and(|id| entries.contains_key(id))
                )
            {
                continue;
            }
            for operand in each_instruction_value_operand(value, env) {
                invalidate(&operand, &mut invalid, &mut pending);
            }
        }
    }
    let mut index = 0;
    while index < pending.len() {
        if let Some(children) = captures.get(&pending[index]) {
            for child in children {
                if invalid.insert(*child) {
                    pending.push(*child);
                }
            }
        }
        index += 1;
    }
    let safe_entries: FxHashSet<_> = entries
        .iter()
        .filter(|(id, elements)| {
            !invalid.contains(id) && elements.iter().all(|element| !invalid.contains(element))
        })
        .map(|(id, _)| *id)
        .collect();
    origins
        .into_iter()
        .filter(|(_, origin)| safe_entries.contains(origin))
        .map(|(id, _)| id)
        .collect()
}

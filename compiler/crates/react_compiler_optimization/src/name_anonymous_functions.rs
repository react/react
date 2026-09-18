// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Port of NameAnonymousFunctions from TypeScript.
//!
//! Generates descriptive names for anonymous function expressions based on
//! how they are used (assigned to variables, passed as arguments to hooks/functions,
//! used as JSX props, etc.). These names appear in React DevTools and error stacks.
//!
//! Conditional on `env.config.enable_name_anonymous_functions`.

use rustc_hash::FxHashMap;

use react_compiler_hir::environment::Environment;
use react_compiler_hir::object_shape::HookKind;
use react_compiler_hir::{
    FunctionId, HirFunction, IdentifierId, IdentifierName, Instruction, InstructionValue,
    JsxAttribute, JsxTag, PlaceOrSpread,
};

/// Assign generated names to anonymous function expressions.
///
/// Ported from TS `nameAnonymousFunctions` in `Transform/NameAnonymousFunctions.ts`.
pub fn name_anonymous_functions(func: &mut HirFunction, env: &mut Environment) {
    let fn_id = match &func.id {
        Some(id) => id.clone(),
        None => return,
    };

    let nodes = name_anonymous_functions_impl(func, env);

    fn visit(node: &Node, prefix: &str, updates: &mut Vec<(FunctionId, String)>) {
        if node.generated_name.is_some() && node.existing_name_hint.is_none() {
            // Only add the prefix to anonymous functions regardless of nesting depth
            let name = format!("{}{}]", prefix, node.generated_name.as_ref().unwrap());
            updates.push((node.function_id, name));
        }
        // Whether or not we generated a name for the function at this node,
        // traverse into its nested functions to assign them names
        let fallback;
        let label = if let Some(ref gen_name) = node.generated_name {
            gen_name.as_str()
        } else if let Some(ref existing) = node.fn_name {
            existing.as_str()
        } else {
            fallback = "<anonymous>";
            fallback
        };
        let next_prefix = format!("{}{} > ", prefix, label);
        for inner in &node.inner {
            visit(inner, &next_prefix, updates);
        }
    }

    let mut updates: Vec<(FunctionId, String)> = Vec::new();
    let prefix = format!("{}[", fn_id);
    for node in &nodes {
        visit(node, &prefix, &mut updates);
    }

    if updates.is_empty() {
        return;
    }
    let update_map: FxHashMap<FunctionId, &String> =
        updates.iter().map(|(fid, name)| (*fid, name)).collect();

    // Apply name updates to the inner HirFunction in the arena
    for (function_id, name) in &updates {
        env.functions[function_id.0 as usize].name_hint = Some(name.clone());
    }

    // Update name_hint on FunctionExpression instruction values in the outer function
    apply_name_hints_to_instructions(&mut func.instructions, &update_map);

    // Update name_hint on FunctionExpression instruction values in all arena functions
    for i in 0..env.functions.len() {
        // We need to temporarily take the instructions to avoid borrow issues
        let mut instructions = std::mem::take(&mut env.functions[i].instructions);
        apply_name_hints_to_instructions(&mut instructions, &update_map);
        env.functions[i].instructions = instructions;
    }
}

/// Apply name hints to FunctionExpression instruction values.
fn apply_name_hints_to_instructions(
    instructions: &mut [Instruction],
    update_map: &FxHashMap<FunctionId, &String>,
) {
    for instr in instructions.iter_mut() {
        if let InstructionValue::FunctionExpression {
            lowered_func,
            name_hint,
            ..
        } = &mut instr.value
        {
            if let Some(new_name) = update_map.get(&lowered_func.func) {
                *name_hint = Some((*new_name).clone());
            }
        }
    }
}

struct Node {
    /// The FunctionId for the inner function (via lowered_func.func)
    function_id: FunctionId,
    /// The generated name for this anonymous function (set based on usage context)
    generated_name: Option<String>,
    /// The existing `name` on the FunctionExpression (non-anonymous functions have this)
    fn_name: Option<String>,
    /// Whether the inner HirFunction already has a name_hint
    existing_name_hint: Option<String>,
    /// Nested function nodes
    inner: Vec<Node>,
}

fn name_anonymous_functions_impl(func: &HirFunction, env: &Environment) -> Vec<Node> {
    // Functions that we track to generate names for
    let mut functions: FxHashMap<IdentifierId, usize> = FxHashMap::default();
    // Tracks temporaries that read from variables/globals/properties
    let mut names: FxHashMap<IdentifierId, String> = FxHashMap::default();
    // Tracks all function nodes
    let mut nodes: Vec<Node> = Vec::new();

    for block in func.body.blocks.values() {
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let lvalue_id = instr.lvalue.identifier;
            match &instr.value {
                InstructionValue::LoadGlobal { binding, .. } => {
                    names.insert(lvalue_id, binding.name().to_string());
                }
                InstructionValue::LoadContext { place, .. }
                | InstructionValue::LoadLocal { place, .. } => {
                    let ident = &env.identifiers[place.identifier.0 as usize];
                    if let Some(IdentifierName::Named(ref name)) = ident.name {
                        names.insert(lvalue_id, name.clone());
                    }
                    // If the loaded place was tracked as a function, propagate
                    if let Some(&node_idx) = functions.get(&place.identifier) {
                        functions.insert(lvalue_id, node_idx);
                    }
                }
                InstructionValue::PropertyLoad {
                    object, property, ..
                } => {
                    if let Some(object_name) = names.get(&object.identifier) {
                        names.insert(lvalue_id, format!("{}.{}", object_name, property));
                    }
                }
                InstructionValue::FunctionExpression {
                    name, lowered_func, ..
                } => {
                    let inner_func = &env.functions[lowered_func.func.0 as usize];
                    let inner = name_anonymous_functions_impl(inner_func, env);
                    let node = Node {
                        function_id: lowered_func.func,
                        generated_name: None,
                        fn_name: name.clone(),
                        existing_name_hint: inner_func.name_hint.clone(),
                        inner,
                    };
                    let idx = nodes.len();
                    nodes.push(node);
                    if name.is_none() {
                        // Only generate names for anonymous functions
                        functions.insert(lvalue_id, idx);
                    }
                }
                InstructionValue::StoreContext {
                    lvalue: store_lvalue,
                    value,
                    ..
                }
                | InstructionValue::StoreLocal {
                    lvalue: store_lvalue,
                    value,
                    ..
                } => {
                    if let Some(&node_idx) = functions.get(&value.identifier) {
                        let node = &mut nodes[node_idx];
                        let var_ident = &env.identifiers[store_lvalue.place.identifier.0 as usize];
                        if node.generated_name.is_none() {
                            if let Some(IdentifierName::Named(ref var_name)) = var_ident.name {
                                node.generated_name = Some(var_name.clone());
                                functions.remove(&value.identifier);
                            }
                        }
                    }
                }
                InstructionValue::CallExpression { callee, args, .. } => {
                    handle_call(
                        env,
                        func,
                        callee.identifier,
                        args,
                        &mut functions,
                        &names,
                        &mut nodes,
                    );
                }
                InstructionValue::MethodCall { property, args, .. } => {
                    handle_call(
                        env,
                        func,
                        property.identifier,
                        args,
                        &mut functions,
                        &names,
                        &mut nodes,
                    );
                }
                InstructionValue::JsxExpression { tag, props, .. } => {
                    for attr in props {
                        match attr {
                            JsxAttribute::SpreadAttribute { .. } => continue,
                            JsxAttribute::Attribute {
                                name: attr_name,
                                place,
                            } => {
                                if let Some(&node_idx) = functions.get(&place.identifier) {
                                    let node = &mut nodes[node_idx];
                                    if node.generated_name.is_none() {
                                        let element_name = match tag {
                                            JsxTag::Builtin(builtin) => Some(builtin.name.clone()),
                                            JsxTag::Place(tag_place) => {
                                                names.get(&tag_place.identifier).cloned()
                                            }
                                        };
                                        let prop_name = match element_name {
                                            None => attr_name.clone(),
                                            Some(ref el_name) => {
                                                format!("<{}>.{}", el_name, attr_name)
                                            }
                                        };
                                        node.generated_name = Some(prop_name);
                                        functions.remove(&place.identifier);
                                    }
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    nodes
}

/// Handle CallExpression / MethodCall to generate names for function arguments.
fn handle_call(
    env: &Environment,
    _func: &HirFunction,
    callee_id: IdentifierId,
    args: &[PlaceOrSpread],
    functions: &mut FxHashMap<IdentifierId, usize>,
    names: &FxHashMap<IdentifierId, String>,
    nodes: &mut Vec<Node>,
) {
    let callee_ident = &env.identifiers[callee_id.0 as usize];
    let callee_ty = &env.types[callee_ident.type_.0 as usize];
    let hook_kind = env.get_hook_kind_for_type(callee_ty).ok().flatten();

    let callee_name: String = if let Some(hk) = hook_kind {
        if *hk != HookKind::Custom {
            hk.to_string()
        } else {
            names
                .get(&callee_id)
                .cloned()
                .unwrap_or_else(|| "(anonymous)".to_string())
        }
    } else {
        names
            .get(&callee_id)
            .cloned()
            .unwrap_or_else(|| "(anonymous)".to_string())
    };

    // Count how many args are tracked functions
    let fn_arg_count = args
        .iter()
        .filter(|arg| {
            if let PlaceOrSpread::Place(p) = arg {
                functions.contains_key(&p.identifier)
            } else {
                false
            }
        })
        .count();

    for (i, arg) in args.iter().enumerate() {
        let place = match arg {
            PlaceOrSpread::Spread(_) => continue,
            PlaceOrSpread::Place(p) => p,
        };
        if let Some(&node_idx) = functions.get(&place.identifier) {
            let node = &mut nodes[node_idx];
            if node.generated_name.is_none() {
                let generated_name = if fn_arg_count > 1 {
                    format!("{}(arg{})", callee_name, i)
                } else {
                    format!("{}()", callee_name)
                };
                node.generated_name = Some(generated_name);
                functions.remove(&place.identifier);
            }
        }
    }
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Port of OutlineJsx from TypeScript.
//!
//! Outlines JSX expressions in callbacks into separate component functions.
//! This pass is conditional on `env.config.enable_jsx_outlining` (defaults to false).

use indexmap::{IndexMap, IndexSet};
use rustc_hash::{FxBuildHasher, FxHashMap, FxHashSet};

use react_compiler_hir::environment::Environment;
use react_compiler_hir::{
    BasicBlock, BlockId, BlockKind, EvaluationOrder, FunctionId, HIR, HirFunction, IdentifierId,
    IdentifierName, Instruction, InstructionId, InstructionKind, InstructionValue, JsxAttribute,
    JsxTag, LValuePattern, NonLocalBinding, ObjectPattern, ObjectProperty, ObjectPropertyKey,
    ObjectPropertyOrSpread, ObjectPropertyType, ParamPattern, Pattern, Place, ReactFunctionType,
    ReturnVariant, Terminal,
};

/// Outline JSX expressions in inner functions into separate outlined components.
///
/// Ported from TS `outlineJSX` in `Optimization/OutlineJsx.ts`.
pub fn outline_jsx(func: &mut HirFunction, env: &mut Environment) {
    let mut outlined_fns: Vec<HirFunction> = Vec::new();
    outline_jsx_impl(func, env, &mut outlined_fns);

    for outlined_fn in outlined_fns {
        env.outline_function(outlined_fn, Some(ReactFunctionType::Component));
    }
}

/// Data about a JSX instruction for outlining
struct JsxInstrInfo {
    instr_idx: usize, // index into func.instructions
    #[allow(dead_code)]
    instr_id: InstructionId, // the InstructionId
    lvalue_id: IdentifierId,
    eval_order: EvaluationOrder,
}

struct OutlinedJsxAttribute {
    original_name: String,
    new_name: String,
    place: Place,
}

struct OutlinedResult {
    instrs: Vec<Instruction>,
    func: HirFunction,
}

fn outline_jsx_impl(
    func: &mut HirFunction,
    env: &mut Environment,
    outlined_fns: &mut Vec<HirFunction>,
) {
    // Collect LoadGlobal instructions (tag -> instr)
    let mut globals: FxHashMap<IdentifierId, usize> = FxHashMap::default(); // id -> instr_idx

    // Process each block
    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();
    for block_id in &block_ids {
        let block = &func.body.blocks[block_id];
        let instr_ids = block.instructions.clone();

        let mut rewrite_instr: FxHashMap<EvaluationOrder, Vec<Instruction>> = FxHashMap::default();
        let mut jsx_group: Vec<JsxInstrInfo> = Vec::new();
        let mut children_ids: FxHashSet<IdentifierId> = FxHashSet::default();

        // First pass: collect all instruction info without borrowing func mutably
        enum InstrAction {
            LoadGlobal {
                lvalue_id: IdentifierId,
                instr_idx: usize,
            },
            FunctionExpr {
                func_id: FunctionId,
            },
            JsxExpr {
                lvalue_id: IdentifierId,
                instr_idx: usize,
                eval_order: EvaluationOrder,
                child_ids: Vec<IdentifierId>,
            },
            Other,
        }

        let mut actions: Vec<InstrAction> = Vec::new();
        for i in (0..instr_ids.len()).rev() {
            let iid = instr_ids[i];
            let instr = &func.instructions[iid.0 as usize];
            let lvalue_id = instr.lvalue.identifier;

            match &instr.value {
                InstructionValue::LoadGlobal { .. } => {
                    actions.push(InstrAction::LoadGlobal {
                        lvalue_id,
                        instr_idx: iid.0 as usize,
                    });
                }
                InstructionValue::FunctionExpression { lowered_func, .. } => {
                    actions.push(InstrAction::FunctionExpr {
                        func_id: lowered_func.func,
                    });
                }
                InstructionValue::JsxExpression { children, .. } => {
                    let child_ids = children
                        .as_ref()
                        .map(|kids| kids.iter().map(|c| c.identifier).collect())
                        .unwrap_or_default();
                    actions.push(InstrAction::JsxExpr {
                        lvalue_id,
                        instr_idx: iid.0 as usize,
                        eval_order: instr.id,
                        child_ids,
                    });
                }
                _ => {
                    actions.push(InstrAction::Other);
                }
            }
        }

        // Second pass: process actions
        for action in actions {
            match action {
                InstrAction::LoadGlobal {
                    lvalue_id,
                    instr_idx,
                } => {
                    globals.insert(lvalue_id, instr_idx);
                }
                InstrAction::FunctionExpr { func_id } => {
                    let mut inner_func = std::mem::replace(
                        &mut env.functions[func_id.0 as usize],
                        react_compiler_ssa::enter_ssa::placeholder_function(),
                    );
                    outline_jsx_impl(&mut inner_func, env, outlined_fns);
                    env.functions[func_id.0 as usize] = inner_func;
                }
                InstrAction::JsxExpr {
                    lvalue_id,
                    instr_idx,
                    eval_order,
                    child_ids,
                } => {
                    if !children_ids.contains(&lvalue_id) {
                        process_and_outline_jsx(
                            func,
                            env,
                            &mut jsx_group,
                            &globals,
                            &mut rewrite_instr,
                            outlined_fns,
                        );
                        jsx_group.clear();
                        children_ids.clear();
                    }
                    jsx_group.push(JsxInstrInfo {
                        instr_idx,
                        instr_id: InstructionId(instr_idx as u32),
                        lvalue_id,
                        eval_order,
                    });
                    for child_id in child_ids {
                        children_ids.insert(child_id);
                    }
                }
                InstrAction::Other => {}
            }
        }
        // Process remaining JSX group after the loop
        process_and_outline_jsx(
            func,
            env,
            &mut jsx_group,
            &globals,
            &mut rewrite_instr,
            outlined_fns,
        );
        if !rewrite_instr.is_empty() {
            let block = func.body.blocks.get_mut(block_id).unwrap();
            let old_instr_ids = block.instructions.clone();
            let mut new_instr_ids = Vec::new();
            for &iid in &old_instr_ids {
                let eval_order = func.instructions[iid.0 as usize].id;
                if let Some(replacement_instrs) = rewrite_instr.get(&eval_order) {
                    // Add replacement instructions to the instruction table and reference them
                    for new_instr in replacement_instrs {
                        let new_idx = func.instructions.len();
                        func.instructions.push(new_instr.clone());
                        new_instr_ids.push(InstructionId(new_idx as u32));
                    }
                } else {
                    new_instr_ids.push(iid);
                }
            }
            let block = func.body.blocks.get_mut(block_id).unwrap();
            block.instructions = new_instr_ids;

            // Run dead code elimination after rewriting
            super::dead_code_elimination(func, env);
        }
    }
}

fn process_and_outline_jsx(
    func: &mut HirFunction,
    env: &mut Environment,
    jsx_group: &mut Vec<JsxInstrInfo>,
    globals: &FxHashMap<IdentifierId, usize>,
    rewrite_instr: &mut FxHashMap<EvaluationOrder, Vec<Instruction>>,
    outlined_fns: &mut Vec<HirFunction>,
) {
    if jsx_group.len() <= 1 {
        return;
    }
    // Sort by eval order ascending (TS: sort by a.id - b.id)
    jsx_group.sort_by_key(|j| j.eval_order);

    let result = process_jsx_group(func, env, jsx_group, globals);
    if let Some(result) = result {
        outlined_fns.push(result.func);
        // Map from the LAST JSX instruction's eval order to the replacement instructions
        // In the TS code, `state.jsx.at(0)` is the first element pushed during reverse iteration,
        // which is the last JSX in forward block order (highest eval order).
        // After sorting by eval_order ascending, that's jsx_group.last().
        let last_eval_order = jsx_group.last().unwrap().eval_order;
        rewrite_instr.insert(last_eval_order, result.instrs);
    }
}

fn process_jsx_group(
    func: &HirFunction,
    env: &mut Environment,
    jsx_group: &[JsxInstrInfo],
    globals: &FxHashMap<IdentifierId, usize>,
) -> Option<OutlinedResult> {
    // Only outline in callbacks, not top-level components
    if func.fn_type == ReactFunctionType::Component {
        return None;
    }

    let props = collect_props(func, env, jsx_group)?;

    let outlined_tag = env.generate_globally_unique_identifier_name(None);
    let new_instrs = emit_outlined_jsx(func, env, jsx_group, &props, &outlined_tag)?;
    let outlined_fn = emit_outlined_fn(func, env, jsx_group, &props, globals)?;

    // Set the outlined function's id
    let mut outlined_fn = outlined_fn;
    outlined_fn.id = Some(outlined_tag);

    Some(OutlinedResult {
        instrs: new_instrs,
        func: outlined_fn,
    })
}

fn collect_props(
    func: &HirFunction,
    env: &mut Environment,
    jsx_group: &[JsxInstrInfo],
) -> Option<Vec<OutlinedJsxAttribute>> {
    let mut id_counter = 1u32;
    let mut seen: FxHashSet<String> = FxHashSet::default();
    let mut attributes = Vec::new();
    let jsx_ids: FxHashSet<IdentifierId> = jsx_group.iter().map(|j| j.lvalue_id).collect();

    let mut generate_name = |old_name: &str, _env: &mut Environment| -> String {
        let mut new_name = old_name.to_string();
        while seen.contains(&new_name) {
            new_name = format!("{}{}", old_name, id_counter);
            id_counter += 1;
        }
        seen.insert(new_name.clone());
        // TS: env.programContext.addNewReference(newName)
        // We don't have programContext in Rust, but this is needed for unique name tracking
        new_name
    };

    for info in jsx_group {
        let instr = &func.instructions[info.instr_idx];
        if let InstructionValue::JsxExpression {
            props, children, ..
        } = &instr.value
        {
            for attr in props {
                match attr {
                    JsxAttribute::SpreadAttribute { .. } => return None,
                    JsxAttribute::Attribute { name, place } => {
                        let new_name = generate_name(name, env);
                        attributes.push(OutlinedJsxAttribute {
                            original_name: name.clone(),
                            new_name,
                            place: place.clone(),
                        });
                    }
                }
            }

            if let Some(kids) = children {
                for child in kids {
                    if jsx_ids.contains(&child.identifier) {
                        continue;
                    }
                    // Promote the child's identifier to a named temporary
                    let child_id = child.identifier;
                    let decl_id = env.identifiers[child_id.0 as usize].declaration_id;
                    if env.identifiers[child_id.0 as usize].name.is_none() {
                        env.identifiers[child_id.0 as usize].name =
                            Some(IdentifierName::Promoted(format!("#t{}", decl_id.0)));
                    }

                    let child_name = match &env.identifiers[child_id.0 as usize].name {
                        Some(IdentifierName::Named(n)) => n.clone(),
                        Some(IdentifierName::Promoted(n)) => n.clone(),
                        None => format!("#t{}", decl_id.0),
                    };
                    let new_name = generate_name("t", env);
                    attributes.push(OutlinedJsxAttribute {
                        original_name: child_name,
                        new_name,
                        place: child.clone(),
                    });
                }
            }
        }
    }

    Some(attributes)
}

fn emit_outlined_jsx(
    func: &HirFunction,
    env: &mut Environment,
    jsx_group: &[JsxInstrInfo],
    outlined_props: &[OutlinedJsxAttribute],
    outlined_tag: &str,
) -> Option<Vec<Instruction>> {
    let props: Vec<JsxAttribute> = outlined_props
        .iter()
        .map(|p| JsxAttribute::Attribute {
            name: p.new_name.clone(),
            place: p.place.clone(),
        })
        .collect();

    // Create LoadGlobal for the outlined component
    let load_id = env.next_identifier_id();
    // Promote it as a JSX tag temporary
    let decl_id = env.identifiers[load_id.0 as usize].declaration_id;
    env.identifiers[load_id.0 as usize].name =
        Some(IdentifierName::Promoted(format!("#T{}", decl_id.0)));

    let load_place = Place {
        identifier: load_id,
        effect: react_compiler_hir::Effect::Unknown,
        reactive: false,
        loc: None,
    };

    let load_jsx = Instruction {
        id: EvaluationOrder(0),
        lvalue: load_place.clone(),
        value: InstructionValue::LoadGlobal {
            binding: NonLocalBinding::ModuleLocal {
                name: outlined_tag.to_string(),
            },
            loc: None,
        },
        loc: None,
        effects: None,
    };

    // Create the replacement JsxExpression using the last JSX instruction's lvalue
    let last_info = jsx_group.last().unwrap();
    let last_instr = &func.instructions[last_info.instr_idx];
    let jsx_expr = Instruction {
        id: EvaluationOrder(0),
        lvalue: last_instr.lvalue.clone(),
        value: InstructionValue::JsxExpression {
            tag: JsxTag::Place(load_place),
            props,
            children: None,
            loc: None,
            opening_loc: None,
            closing_loc: None,
        },
        loc: None,
        effects: None,
    };

    Some(vec![load_jsx, jsx_expr])
}

fn emit_outlined_fn(
    func: &HirFunction,
    env: &mut Environment,
    jsx_group: &[JsxInstrInfo],
    old_props: &[OutlinedJsxAttribute],
    globals: &FxHashMap<IdentifierId, usize>,
) -> Option<HirFunction> {
    let old_to_new_props = create_old_to_new_props_mapping(env, old_props);

    // Create props parameter
    let props_obj_id = env.next_identifier_id();
    let decl_id = env.identifiers[props_obj_id.0 as usize].declaration_id;
    env.identifiers[props_obj_id.0 as usize].name =
        Some(IdentifierName::Promoted(format!("#t{}", decl_id.0)));
    let props_obj = Place {
        identifier: props_obj_id,
        effect: react_compiler_hir::Effect::Unknown,
        reactive: false,
        loc: None,
    };

    // Create destructure instruction
    let destructure_instr = emit_destructure_props(env, &props_obj, &old_to_new_props);

    // Emit load globals for JSX tags
    let load_global_instrs = emit_load_globals(func, jsx_group, globals)?;

    // Emit updated JSX instructions
    let updated_jsx_instrs = emit_updated_jsx(func, jsx_group, &old_to_new_props);

    // Build instructions list
    let mut instructions = Vec::new();
    instructions.push(destructure_instr);
    instructions.extend(load_global_instrs);
    instructions.extend(updated_jsx_instrs);

    // Build instruction table and instruction IDs
    let mut instr_table = Vec::new();
    let mut instr_ids = Vec::new();
    for instr in instructions {
        let idx = instr_table.len();
        instr_table.push(instr);
        instr_ids.push(InstructionId(idx as u32));
    }

    // Return terminal uses the last instruction's lvalue
    let last_lvalue = instr_table.last().unwrap().lvalue.clone();

    // Create return place
    let returns_id = env.next_identifier_id();
    let returns_place = Place {
        identifier: returns_id,
        effect: react_compiler_hir::Effect::Unknown,
        reactive: false,
        loc: None,
    };

    let block = BasicBlock {
        kind: BlockKind::Block,
        id: BlockId(0),
        instructions: instr_ids,
        preds: IndexSet::default(),
        terminal: Terminal::Return {
            value: last_lvalue,
            return_variant: ReturnVariant::Explicit,
            id: EvaluationOrder(0),
            loc: None,
            effects: None,
        },
        phis: Vec::new(),
    };

    let mut blocks = IndexMap::default();
    blocks.insert(BlockId(0), block);

    let outlined_fn = HirFunction {
        id: None,
        name_hint: None,
        fn_type: ReactFunctionType::Other,
        params: vec![ParamPattern::Place(props_obj)],
        return_type_annotation: None,
        returns: returns_place,
        context: Vec::new(),
        body: HIR {
            entry: BlockId(0),
            blocks,
        },
        instructions: instr_table,
        generator: false,
        is_async: false,
        directives: Vec::new(),
        aliasing_effects: Some(vec![]),
        loc: None,
    };

    Some(outlined_fn)
}

fn emit_load_globals(
    func: &HirFunction,
    jsx_group: &[JsxInstrInfo],
    globals: &FxHashMap<IdentifierId, usize>,
) -> Option<Vec<Instruction>> {
    let mut instructions = Vec::new();
    for info in jsx_group {
        let instr = &func.instructions[info.instr_idx];
        if let InstructionValue::JsxExpression { tag, .. } = &instr.value {
            if let JsxTag::Place(tag_place) = tag {
                let global_instr_idx = globals.get(&tag_place.identifier)?;
                instructions.push(func.instructions[*global_instr_idx].clone());
            }
        }
    }
    Some(instructions)
}

fn emit_updated_jsx(
    func: &HirFunction,
    jsx_group: &[JsxInstrInfo],
    old_to_new_props: &IndexMap<IdentifierId, OutlinedJsxAttribute, FxBuildHasher>,
) -> Vec<Instruction> {
    let jsx_ids: FxHashSet<IdentifierId> = jsx_group.iter().map(|j| j.lvalue_id).collect();
    let mut new_instrs = Vec::new();

    for info in jsx_group {
        let instr = &func.instructions[info.instr_idx];
        if let InstructionValue::JsxExpression {
            tag,
            props,
            children,
            loc,
            opening_loc,
            closing_loc,
        } = &instr.value
        {
            let mut new_props = Vec::new();
            for prop in props {
                // TS: invariant(prop.kind === 'JsxAttribute', ...)
                // Spread attributes would have caused collectProps to return null earlier
                let (name, place) = match prop {
                    JsxAttribute::Attribute { name, place } => (name, place),
                    JsxAttribute::SpreadAttribute { .. } => {
                        unreachable!("Expected only JsxAttribute, not spread")
                    }
                };
                if name == "key" {
                    continue;
                }
                // TS: invariant(newProp !== undefined, ...)
                let new_prop = old_to_new_props
                    .get(&place.identifier)
                    .expect("Expected a new property for identifier");
                new_props.push(JsxAttribute::Attribute {
                    name: new_prop.original_name.clone(),
                    place: new_prop.place.clone(),
                });
            }

            let new_children = children.as_ref().map(|kids| {
                kids.iter()
                    .map(|child| {
                        if jsx_ids.contains(&child.identifier) {
                            child.clone()
                        } else {
                            // TS: invariant(newChild !== undefined, ...)
                            let new_prop = old_to_new_props
                                .get(&child.identifier)
                                .expect("Expected a new prop for child identifier");
                            new_prop.place.clone()
                        }
                    })
                    .collect()
            });

            new_instrs.push(Instruction {
                id: instr.id,
                lvalue: instr.lvalue.clone(),
                value: InstructionValue::JsxExpression {
                    tag: tag.clone(),
                    props: new_props,
                    children: new_children,
                    loc: *loc,
                    opening_loc: *opening_loc,
                    closing_loc: *closing_loc,
                },
                loc: instr.loc,
                effects: instr.effects.clone(),
            });
        }
    }

    new_instrs
}

fn create_old_to_new_props_mapping(
    env: &mut Environment,
    old_props: &[OutlinedJsxAttribute],
) -> IndexMap<IdentifierId, OutlinedJsxAttribute, FxBuildHasher> {
    let mut old_to_new = IndexMap::default();

    for old_prop in old_props {
        if old_prop.original_name == "key" {
            continue;
        }

        let new_id = env.next_identifier_id();
        env.identifiers[new_id.0 as usize].name =
            Some(IdentifierName::Named(old_prop.new_name.clone()));

        let new_place = Place {
            identifier: new_id,
            effect: react_compiler_hir::Effect::Unknown,
            reactive: false,
            loc: None,
        };

        old_to_new.insert(
            old_prop.place.identifier,
            OutlinedJsxAttribute {
                original_name: old_prop.original_name.clone(),
                new_name: old_prop.new_name.clone(),
                place: new_place,
            },
        );
    }

    old_to_new
}

fn emit_destructure_props(
    env: &mut Environment,
    props_obj: &Place,
    old_to_new_props: &IndexMap<IdentifierId, OutlinedJsxAttribute, FxBuildHasher>,
) -> Instruction {
    let mut properties = Vec::new();
    for prop in old_to_new_props.values() {
        properties.push(ObjectPropertyOrSpread::Property(ObjectProperty {
            key: ObjectPropertyKey::String {
                name: prop.new_name.clone(),
            },
            property_type: ObjectPropertyType::Property,
            place: prop.place.clone(),
        }));
    }

    let lvalue_id = env.next_identifier_id();
    let lvalue = Place {
        identifier: lvalue_id,
        effect: react_compiler_hir::Effect::Unknown,
        reactive: false,
        loc: None,
    };

    Instruction {
        id: EvaluationOrder(0),
        lvalue,
        value: InstructionValue::Destructure {
            lvalue: LValuePattern {
                pattern: Pattern::Object(ObjectPattern {
                    properties,
                    loc: None,
                }),
                kind: InstructionKind::Let,
            },
            value: props_obj.clone(),
            loc: None,
        },
        loc: None,
        effects: None,
    }
}

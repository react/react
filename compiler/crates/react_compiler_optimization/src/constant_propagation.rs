// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Constant propagation/folding pass.
//!
//! Applies Sparse Conditional Constant Propagation to the given function.
//! We use abstract interpretation to record known constant values for identifiers,
//! with lack of a value indicating that the identifier does not have a known
//! constant value.
//!
//! Instructions which can be compile-time evaluated *and* whose operands are known
//! constants are replaced with the resulting constant value.
//!
//! This pass also exploits SSA form, tracking constant values of local variables.
//! For example, in `let x = 4; let y = x + 1` we know that `x = 4` in the binary
//! expression and can replace it with `Constant 5`.
//!
//! This pass also visits conditionals (currently only IfTerminal) and can prune
//! unreachable branches when the condition is a known truthy/falsey constant.
//! The pass uses fixpoint iteration, looping until no additional updates can be
//! performed.
//!
//! Analogous to TS `Optimization/ConstantPropagation.ts`.

use rustc_hash::FxHashMap;

use react_compiler_diagnostics::JsString;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{
    BinaryOperator, BlockKind, FloatValue, FunctionId, GotoVariant, HirFunction, IdentifierId,
    InstructionValue, NonLocalBinding, Phi, Place, PrimitiveValue, PropertyLiteral, SourceLocation,
    Terminal, UnaryOperator, UpdateOperator, format_js_number,
};
use react_compiler_lowering::{
    get_reverse_postordered_blocks, mark_instruction_ids, mark_predecessors,
    remove_dead_do_while_statements, remove_unnecessary_try_catch, remove_unreachable_for_updates,
};
use react_compiler_ssa::enter_ssa::placeholder_function;

use crate::merge_consecutive_blocks::merge_consecutive_blocks;

// =============================================================================
// Constant type — mirrors TS `type Constant = Primitive | LoadGlobal`
// The loc is preserved so that when we replace an instruction value with the
// constant, we use the loc from the original definition site (matching TS).
// =============================================================================

#[derive(Debug, Clone)]
enum Constant {
    Primitive {
        value: PrimitiveValue,
        loc: Option<SourceLocation>,
    },
    LoadGlobal {
        binding: NonLocalBinding,
        loc: Option<SourceLocation>,
    },
}

impl Constant {
    fn into_instruction_value(self) -> InstructionValue {
        match self {
            Constant::Primitive { value, loc } => InstructionValue::Primitive { value, loc },
            Constant::LoadGlobal { binding, loc } => InstructionValue::LoadGlobal { binding, loc },
        }
    }
}

/// Map of known constant values. Uses FxHashMap (not IndexMap) since iteration
/// order does not affect correctness — this map is only used for lookups.
type Constants = FxHashMap<IdentifierId, Constant>;

// =============================================================================
// Public entry point
// =============================================================================

pub fn constant_propagation(func: &mut HirFunction, env: &mut Environment) {
    let mut constants: Constants = FxHashMap::default();
    constant_propagation_impl(func, env, &mut constants);
}

fn constant_propagation_impl(
    func: &mut HirFunction,
    env: &mut Environment,
    constants: &mut Constants,
) {
    loop {
        let have_terminals_changed = apply_constant_propagation(func, env, constants);
        if !have_terminals_changed {
            break;
        }
        /*
         * If terminals have changed then blocks may have become newly unreachable.
         * Re-run minification of the graph (incl reordering instruction ids)
         */
        func.body.blocks = get_reverse_postordered_blocks(&func.body, &func.instructions);
        remove_unreachable_for_updates(&mut func.body);
        remove_dead_do_while_statements(&mut func.body);
        remove_unnecessary_try_catch(&mut func.body);
        mark_instruction_ids(&mut func.body, &mut func.instructions);
        mark_predecessors(&mut func.body);

        // Now that predecessors are updated, prune phi operands that can never be reached
        for (_block_id, block) in func.body.blocks.iter_mut() {
            for phi in &mut block.phis {
                phi.operands
                    .retain(|pred, _operand| block.preds.contains(pred));
            }
        }

        /*
         * By removing some phi operands, there may be phis that were not previously
         * redundant but now are
         */
        react_compiler_ssa::eliminate_redundant_phi(func, env);

        /*
         * Finally, merge together any blocks that are now guaranteed to execute
         * consecutively
         */
        merge_consecutive_blocks(func, &mut env.functions);

        // TODO: port assertConsistentIdentifiers(fn) and assertTerminalSuccessorsExist(fn)
        // from TS HIR validation. These are debug assertions that verify structural
        // invariants after the CFG cleanup helpers run.
    }
}

fn apply_constant_propagation(
    func: &mut HirFunction,
    env: &mut Environment,
    constants: &mut Constants,
) -> bool {
    let mut has_changes = false;

    let block_ids: Vec<_> = func.body.blocks.keys().copied().collect();
    for block_id in block_ids {
        let block = &func.body.blocks[&block_id];

        // Initialize phi values if all operands have the same known constant value
        let phi_updates: Vec<(IdentifierId, Constant)> = block
            .phis
            .iter()
            .filter_map(|phi| {
                let value = evaluate_phi(phi, constants)?;
                Some((phi.place.identifier, value))
            })
            .collect();
        for (id, value) in phi_updates {
            constants.insert(id, value);
        }

        let block = &func.body.blocks[&block_id];
        let instr_ids = block.instructions.clone();
        let block_kind = block.kind;
        let instr_count = instr_ids.len();

        for (i, instr_id) in instr_ids.iter().enumerate() {
            if block_kind == BlockKind::Sequence && i == instr_count - 1 {
                /*
                 * evaluating the last value of a value block can break order of evaluation,
                 * skip these instructions
                 */
                continue;
            }
            let result = evaluate_instruction(constants, func, env, *instr_id);
            if let Some(value) = result {
                let lvalue_id = func.instructions[instr_id.0 as usize].lvalue.identifier;
                constants.insert(lvalue_id, value);
            }
        }

        let block = &func.body.blocks[&block_id];
        match &block.terminal {
            Terminal::If {
                test,
                consequent,
                alternate,
                id,
                loc,
                ..
            } => {
                let test_value = read(constants, test);
                if let Some(Constant::Primitive {
                    value: ref prim, ..
                }) = test_value
                {
                    has_changes = true;
                    let target_block_id = if is_truthy(prim) {
                        *consequent
                    } else {
                        *alternate
                    };
                    let terminal = Terminal::Goto {
                        variant: GotoVariant::Break,
                        block: target_block_id,
                        id: *id,
                        loc: *loc,
                    };
                    func.body.blocks.get_mut(&block_id).unwrap().terminal = terminal;
                }
            }
            Terminal::Unsupported { .. }
            | Terminal::Unreachable { .. }
            | Terminal::Throw { .. }
            | Terminal::Return { .. }
            | Terminal::Goto { .. }
            | Terminal::Branch { .. }
            | Terminal::Switch { .. }
            | Terminal::DoWhile { .. }
            | Terminal::While { .. }
            | Terminal::For { .. }
            | Terminal::ForOf { .. }
            | Terminal::ForIn { .. }
            | Terminal::Logical { .. }
            | Terminal::Ternary { .. }
            | Terminal::Optional { .. }
            | Terminal::Label { .. }
            | Terminal::Sequence { .. }
            | Terminal::MaybeThrow { .. }
            | Terminal::Try { .. }
            | Terminal::Scope { .. }
            | Terminal::PrunedScope { .. } => {
                // no-op
            }
        }
    }

    has_changes
}

// =============================================================================
// Phi evaluation
// =============================================================================

fn evaluate_phi(phi: &Phi, constants: &Constants) -> Option<Constant> {
    let mut value: Option<Constant> = None;
    for (_pred, operand) in &phi.operands {
        let operand_value = constants.get(&operand.identifier)?;

        match &value {
            None => {
                // first iteration of the loop
                value = Some(operand_value.clone());
                continue;
            }
            Some(current) => match (current, operand_value) {
                (Constant::Primitive { value: a, .. }, Constant::Primitive { value: b, .. }) => {
                    // Use JS strict equality semantics: NaN !== NaN
                    if !js_strict_equal(a, b) {
                        return None;
                    }
                }
                (
                    Constant::LoadGlobal { binding: a, .. },
                    Constant::LoadGlobal { binding: b, .. },
                ) => {
                    // different global values, can't constant propagate
                    if a.name() != b.name() {
                        return None;
                    }
                }
                // found different kinds of constants, can't constant propagate
                (Constant::Primitive { .. }, Constant::LoadGlobal { .. })
                | (Constant::LoadGlobal { .. }, Constant::Primitive { .. }) => {
                    return None;
                }
            },
        }
    }
    value
}

// =============================================================================
// Instruction evaluation
// =============================================================================

fn evaluate_instruction(
    constants: &mut Constants,
    func: &mut HirFunction,
    env: &mut Environment,
    instr_id: react_compiler_hir::InstructionId,
) -> Option<Constant> {
    let instr = &func.instructions[instr_id.0 as usize];
    match &instr.value {
        InstructionValue::Primitive { value, loc } => Some(Constant::Primitive {
            value: value.clone(),
            loc: *loc,
        }),
        InstructionValue::LoadGlobal { binding, loc } => Some(Constant::LoadGlobal {
            binding: binding.clone(),
            loc: *loc,
        }),
        InstructionValue::ComputedLoad {
            object,
            property,
            loc,
        } => {
            let prop_value = read(constants, property);
            if let Some(Constant::Primitive {
                value: ref prim, ..
            }) = prop_value
            {
                match prim {
                    PrimitiveValue::String(s) if s.as_str().is_some_and(is_valid_identifier) => {
                        let object = object.clone();
                        let loc = *loc;
                        let new_property =
                            PropertyLiteral::String(s.as_str().expect("guarded utf8").to_string());
                        func.instructions[instr_id.0 as usize].value =
                            InstructionValue::PropertyLoad {
                                object,
                                property: new_property,
                                loc,
                            };
                    }
                    PrimitiveValue::Number(n) => {
                        let object = object.clone();
                        let loc = *loc;
                        let new_property = PropertyLiteral::Number(*n);
                        func.instructions[instr_id.0 as usize].value =
                            InstructionValue::PropertyLoad {
                                object,
                                property: new_property,
                                loc,
                            };
                    }
                    PrimitiveValue::Null
                    | PrimitiveValue::Undefined
                    | PrimitiveValue::Boolean(_)
                    | PrimitiveValue::String(_) => {}
                }
            }
            None
        }
        InstructionValue::ComputedStore {
            object,
            property,
            value,
            loc,
        } => {
            let prop_value = read(constants, property);
            if let Some(Constant::Primitive {
                value: ref prim, ..
            }) = prop_value
            {
                match prim {
                    PrimitiveValue::String(s) if s.as_str().is_some_and(is_valid_identifier) => {
                        let object = object.clone();
                        let store_value = value.clone();
                        let loc = *loc;
                        let new_property =
                            PropertyLiteral::String(s.as_str().expect("guarded utf8").to_string());
                        func.instructions[instr_id.0 as usize].value =
                            InstructionValue::PropertyStore {
                                object,
                                property: new_property,
                                value: store_value,
                                loc,
                            };
                    }
                    PrimitiveValue::Number(n) => {
                        let object = object.clone();
                        let store_value = value.clone();
                        let loc = *loc;
                        let new_property = PropertyLiteral::Number(*n);
                        func.instructions[instr_id.0 as usize].value =
                            InstructionValue::PropertyStore {
                                object,
                                property: new_property,
                                value: store_value,
                                loc,
                            };
                    }
                    PrimitiveValue::Null
                    | PrimitiveValue::Undefined
                    | PrimitiveValue::Boolean(_)
                    | PrimitiveValue::String(_) => {}
                }
            }
            None
        }
        InstructionValue::PostfixUpdate {
            lvalue,
            operation,
            value,
            loc,
        } => {
            let previous = read(constants, value);
            if let Some(Constant::Primitive {
                value: PrimitiveValue::Number(n),
                loc: prev_loc,
            }) = previous
            {
                let prev_val = n.value();
                let next_val = match operation {
                    UpdateOperator::Increment => prev_val + 1.0,
                    UpdateOperator::Decrement => prev_val - 1.0,
                };
                // Store the updated value for the lvalue
                let lvalue_id = lvalue.identifier;
                constants.insert(
                    lvalue_id,
                    Constant::Primitive {
                        value: PrimitiveValue::Number(FloatValue::new(next_val)),
                        loc: *loc,
                    },
                );
                // But return the value prior to the update (preserving its original loc)
                return Some(Constant::Primitive {
                    value: PrimitiveValue::Number(n),
                    loc: prev_loc,
                });
            }
            None
        }
        InstructionValue::PrefixUpdate {
            lvalue,
            operation,
            value,
            loc,
        } => {
            let previous = read(constants, value);
            if let Some(Constant::Primitive {
                value: PrimitiveValue::Number(n),
                ..
            }) = previous
            {
                let prev_val = n.value();
                let next_val = match operation {
                    UpdateOperator::Increment => prev_val + 1.0,
                    UpdateOperator::Decrement => prev_val - 1.0,
                };
                let result = Constant::Primitive {
                    value: PrimitiveValue::Number(FloatValue::new(next_val)),
                    loc: *loc,
                };
                // Store and return the updated value
                let lvalue_id = lvalue.identifier;
                constants.insert(lvalue_id, result.clone());
                return Some(result);
            }
            None
        }
        InstructionValue::UnaryExpression {
            operator,
            value,
            loc,
        } => match operator {
            UnaryOperator::Not => {
                let operand = read(constants, value);
                if let Some(Constant::Primitive {
                    value: ref prim, ..
                }) = operand
                {
                    let negated = !is_truthy(prim);
                    let loc = *loc;
                    let result = Constant::Primitive {
                        value: PrimitiveValue::Boolean(negated),
                        loc,
                    };
                    func.instructions[instr_id.0 as usize].value = InstructionValue::Primitive {
                        value: PrimitiveValue::Boolean(negated),
                        loc,
                    };
                    return Some(result);
                }
                None
            }
            UnaryOperator::Minus => {
                let operand = read(constants, value);
                if let Some(Constant::Primitive {
                    value: PrimitiveValue::Number(n),
                    ..
                }) = operand
                {
                    let negated = n.value() * -1.0;
                    let loc = *loc;
                    let result = Constant::Primitive {
                        value: PrimitiveValue::Number(FloatValue::new(negated)),
                        loc,
                    };
                    func.instructions[instr_id.0 as usize].value = InstructionValue::Primitive {
                        value: PrimitiveValue::Number(FloatValue::new(negated)),
                        loc,
                    };
                    return Some(result);
                }
                None
            }
            UnaryOperator::Plus
            | UnaryOperator::BitwiseNot
            | UnaryOperator::TypeOf
            | UnaryOperator::Void => None,
        },
        InstructionValue::BinaryExpression {
            operator,
            left,
            right,
            loc,
        } => {
            let lhs_value = read(constants, left);
            let rhs_value = read(constants, right);
            if let (
                Some(Constant::Primitive { value: lhs, .. }),
                Some(Constant::Primitive { value: rhs, .. }),
            ) = (&lhs_value, &rhs_value)
            {
                let result = evaluate_binary_op(*operator, lhs, rhs);
                if let Some(ref prim) = result {
                    let loc = *loc;
                    func.instructions[instr_id.0 as usize].value = InstructionValue::Primitive {
                        value: prim.clone(),
                        loc,
                    };
                    return Some(Constant::Primitive {
                        value: prim.clone(),
                        loc,
                    });
                }
            }
            None
        }
        InstructionValue::PropertyLoad {
            object,
            property,
            loc,
        } => {
            let object_value = read(constants, object);
            if let Some(Constant::Primitive {
                value: PrimitiveValue::String(ref s),
                ..
            }) = object_value
            {
                if let PropertyLiteral::String(prop_name) = property {
                    if prop_name == "length" {
                        // Use UTF-16 code unit count to match JS .length semantics
                        let len = s.len_utf16() as f64;
                        let loc = *loc;
                        let result = Constant::Primitive {
                            value: PrimitiveValue::Number(FloatValue::new(len)),
                            loc,
                        };
                        func.instructions[instr_id.0 as usize].value =
                            InstructionValue::Primitive {
                                value: PrimitiveValue::Number(FloatValue::new(len)),
                                loc,
                            };
                        return Some(result);
                    }
                }
            }
            None
        }
        InstructionValue::TemplateLiteral {
            subexprs,
            quasis,
            loc,
        } => {
            if subexprs.is_empty() {
                // No subexpressions: join all cooked quasis
                let mut result_string = String::new();
                for q in quasis {
                    match &q.cooked {
                        Some(cooked) => result_string.push_str(cooked),
                        None => return None,
                    }
                }
                let loc = *loc;
                let result = Constant::Primitive {
                    value: PrimitiveValue::String(JsString::from_marker_string(&result_string)),
                    loc,
                };
                func.instructions[instr_id.0 as usize].value = InstructionValue::Primitive {
                    value: PrimitiveValue::String(JsString::from_marker_string(&result_string)),
                    loc,
                };
                return Some(result);
            }

            if subexprs.len() != quasis.len() - 1 {
                return None;
            }

            if quasis.iter().any(|q| q.cooked.is_none()) {
                return None;
            }

            let mut quasi_index = 0usize;
            let mut result_string = quasis[quasi_index].cooked.as_ref().unwrap().clone();
            quasi_index += 1;

            for sub_expr in subexprs {
                let sub_expr_value = read(constants, sub_expr);
                let sub_prim = match sub_expr_value {
                    Some(Constant::Primitive { ref value, .. }) => value,
                    _ => return None,
                };

                let expression_str = match sub_prim {
                    PrimitiveValue::Null => "null".to_string(),
                    PrimitiveValue::Boolean(b) => b.to_string(),
                    PrimitiveValue::Number(n) => format_js_number(n.value()),
                    PrimitiveValue::String(s) => s.to_marker_string(),
                    // TS rejects undefined subexpression values
                    PrimitiveValue::Undefined => return None,
                };

                let suffix = match &quasis[quasi_index].cooked {
                    Some(s) => s.clone(),
                    None => return None,
                };
                quasi_index += 1;

                result_string.push_str(&expression_str);
                result_string.push_str(&suffix);
            }

            let loc = *loc;
            let result = Constant::Primitive {
                value: PrimitiveValue::String(JsString::from_marker_string(&result_string)),
                loc,
            };
            func.instructions[instr_id.0 as usize].value = InstructionValue::Primitive {
                value: PrimitiveValue::String(JsString::from_marker_string(&result_string)),
                loc,
            };
            Some(result)
        }
        InstructionValue::LoadLocal { place, .. } => {
            let place_value = read(constants, place);
            if let Some(ref constant) = place_value {
                // Replace the LoadLocal with the constant value (including the constant's original loc)
                func.instructions[instr_id.0 as usize].value =
                    constant.clone().into_instruction_value();
            }
            place_value
        }
        InstructionValue::StoreLocal { lvalue, value, .. } => {
            let place_value = read(constants, value);
            if let Some(ref constant) = place_value {
                let lvalue_id = lvalue.place.identifier;
                constants.insert(lvalue_id, constant.clone());
            }
            place_value
        }
        InstructionValue::FunctionExpression { lowered_func, .. } => {
            let func_id = lowered_func.func;
            process_inner_function(func_id, env, constants);
            None
        }
        InstructionValue::ObjectMethod { lowered_func, .. } => {
            let func_id = lowered_func.func;
            process_inner_function(func_id, env, constants);
            None
        }
        InstructionValue::StartMemoize { deps, .. } => {
            if let Some(deps) = deps {
                // Two-phase: collect which deps are constant, then mutate
                let const_dep_indices: Vec<usize> = deps
                    .iter()
                    .enumerate()
                    .filter_map(|(i, dep)| {
                        if let react_compiler_hir::ManualMemoDependencyRoot::NamedLocal {
                            value,
                            ..
                        } = &dep.root
                        {
                            let pv = read(constants, value);
                            if matches!(pv, Some(Constant::Primitive { .. })) {
                                return Some(i);
                            }
                        }
                        None
                    })
                    .collect();
                for idx in const_dep_indices {
                    if let InstructionValue::StartMemoize {
                        deps: Some(ref mut deps),
                        ..
                    } = func.instructions[instr_id.0 as usize].value
                    {
                        if let react_compiler_hir::ManualMemoDependencyRoot::NamedLocal {
                            constant,
                            ..
                        } = &mut deps[idx].root
                        {
                            *constant = true;
                        }
                    }
                }
            }
            None
        }
        // All other instruction kinds: no constant folding
        InstructionValue::LoadContext { .. }
        | InstructionValue::DeclareLocal { .. }
        | InstructionValue::DeclareContext { .. }
        | InstructionValue::StoreContext { .. }
        | InstructionValue::Destructure { .. }
        | InstructionValue::JSXText { .. }
        | InstructionValue::NewExpression { .. }
        | InstructionValue::CallExpression { .. }
        | InstructionValue::MethodCall { .. }
        | InstructionValue::TypeCastExpression { .. }
        | InstructionValue::JsxExpression { .. }
        | InstructionValue::ObjectExpression { .. }
        | InstructionValue::ArrayExpression { .. }
        | InstructionValue::JsxFragment { .. }
        | InstructionValue::RegExpLiteral { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::PropertyStore { .. }
        | InstructionValue::PropertyDelete { .. }
        | InstructionValue::ComputedDelete { .. }
        | InstructionValue::StoreGlobal { .. }
        | InstructionValue::TaggedTemplateExpression { .. }
        | InstructionValue::Await { .. }
        | InstructionValue::GetIterator { .. }
        | InstructionValue::IteratorNext { .. }
        | InstructionValue::NextPropertyOf { .. }
        | InstructionValue::Debugger { .. }
        | InstructionValue::FinishMemoize { .. }
        | InstructionValue::UnsupportedNode { .. } => None,
    }
}

// =============================================================================
// Inner function processing
// =============================================================================

fn process_inner_function(func_id: FunctionId, env: &mut Environment, constants: &mut Constants) {
    let mut inner = std::mem::replace(
        &mut env.functions[func_id.0 as usize],
        placeholder_function(),
    );
    constant_propagation_impl(&mut inner, env, constants);
    env.functions[func_id.0 as usize] = inner;
}

// =============================================================================
// Helper: read constant for a place
// =============================================================================

fn read(constants: &Constants, place: &Place) -> Option<Constant> {
    constants.get(&place.identifier).cloned()
}

// =============================================================================
// Helper: is_valid_identifier
// =============================================================================

/// Check if a string is a valid JavaScript identifier.
/// Supports Unicode identifier characters per ECMAScript spec (ID_Start / ID_Continue).
/// Rejects JS reserved words (matching Babel's `isValidIdentifier` default behavior).
fn is_valid_identifier(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }
    let mut chars = s.chars();
    match chars.next() {
        Some(c) if is_id_start(c) => {}
        _ => return false,
    }
    if !chars.all(is_id_continue) {
        return false;
    }
    !is_reserved_word(s)
}

/// JS reserved words that cannot be used as identifiers.
/// Includes keywords, future reserved words, and strict mode reserved words.
fn is_reserved_word(s: &str) -> bool {
    matches!(
        s,
        "break"
            | "case"
            | "catch"
            | "continue"
            | "debugger"
            | "default"
            | "do"
            | "else"
            | "finally"
            | "for"
            | "function"
            | "if"
            | "in"
            | "instanceof"
            | "new"
            | "return"
            | "switch"
            | "this"
            | "throw"
            | "try"
            | "typeof"
            | "var"
            | "void"
            | "while"
            | "with"
            | "class"
            | "const"
            | "enum"
            | "export"
            | "extends"
            | "import"
            | "super"
            | "implements"
            | "interface"
            | "let"
            | "package"
            | "private"
            | "protected"
            | "public"
            | "static"
            | "yield"
            | "await"
            | "delete"
            | "null"
            | "true"
            | "false"
    )
}

/// Check if a character is valid as the start of a JS identifier (ID_Start + _ + $).
fn is_id_start(c: char) -> bool {
    c == '_' || c == '$' || c.is_alphabetic()
}

/// Check if a character is valid as a continuation of a JS identifier (ID_Continue + $ + \u200C + \u200D).
fn is_id_continue(c: char) -> bool {
    c == '$'
        || c == '_'
        || c.is_alphanumeric()
        || c == '\u{200C}' // ZWNJ
        || c == '\u{200D}' // ZWJ
}

// =============================================================================
// Helper: is_truthy for PrimitiveValue
// =============================================================================

fn is_truthy(value: &PrimitiveValue) -> bool {
    match value {
        PrimitiveValue::Null => false,
        PrimitiveValue::Undefined => false,
        PrimitiveValue::Boolean(b) => *b,
        PrimitiveValue::Number(n) => {
            let v = n.value();
            v != 0.0 && !v.is_nan()
        }
        PrimitiveValue::String(s) => s.len_utf16() != 0,
    }
}

// =============================================================================
// Binary operation evaluation
// =============================================================================

fn evaluate_binary_op(
    operator: BinaryOperator,
    lhs: &PrimitiveValue,
    rhs: &PrimitiveValue,
) -> Option<PrimitiveValue> {
    match operator {
        BinaryOperator::Add => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => Some(PrimitiveValue::Number(
                FloatValue::new(l.value() + r.value()),
            )),
            (PrimitiveValue::String(l), PrimitiveValue::String(r)) => {
                // Concatenate as code units: JS `+` can pair up surrogate
                // halves split across the operands.
                let mut units = l.code_units();
                units.extend(r.code_units());
                Some(PrimitiveValue::String(
                    react_compiler_diagnostics::JsString::from_code_units(units),
                ))
            }
            _ => None,
        },
        BinaryOperator::Subtract => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => Some(PrimitiveValue::Number(
                FloatValue::new(l.value() - r.value()),
            )),
            _ => None,
        },
        BinaryOperator::Multiply => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => Some(PrimitiveValue::Number(
                FloatValue::new(l.value() * r.value()),
            )),
            _ => None,
        },
        BinaryOperator::Divide => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => Some(PrimitiveValue::Number(
                FloatValue::new(l.value() / r.value()),
            )),
            _ => None,
        },
        BinaryOperator::Modulo => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => Some(PrimitiveValue::Number(
                FloatValue::new(l.value() % r.value()),
            )),
            _ => None,
        },
        BinaryOperator::Exponent => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => Some(PrimitiveValue::Number(
                FloatValue::new(l.value().powf(r.value())),
            )),
            _ => None,
        },
        BinaryOperator::BitwiseOr => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                let result = js_to_int32(l.value()) | js_to_int32(r.value());
                Some(PrimitiveValue::Number(FloatValue::new(result as f64)))
            }
            _ => None,
        },
        BinaryOperator::BitwiseAnd => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                let result = js_to_int32(l.value()) & js_to_int32(r.value());
                Some(PrimitiveValue::Number(FloatValue::new(result as f64)))
            }
            _ => None,
        },
        BinaryOperator::BitwiseXor => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                let result = js_to_int32(l.value()) ^ js_to_int32(r.value());
                Some(PrimitiveValue::Number(FloatValue::new(result as f64)))
            }
            _ => None,
        },
        BinaryOperator::ShiftLeft => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                let result = js_to_int32(l.value()) << (js_to_uint32(r.value()) & 0x1f);
                Some(PrimitiveValue::Number(FloatValue::new(result as f64)))
            }
            _ => None,
        },
        BinaryOperator::ShiftRight => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                let result = js_to_int32(l.value()) >> (js_to_uint32(r.value()) & 0x1f);
                Some(PrimitiveValue::Number(FloatValue::new(result as f64)))
            }
            _ => None,
        },
        BinaryOperator::UnsignedShiftRight => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                let result = js_to_uint32(l.value()) >> (js_to_uint32(r.value()) & 0x1f);
                Some(PrimitiveValue::Number(FloatValue::new(result as f64)))
            }
            _ => None,
        },
        BinaryOperator::LessThan => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                Some(PrimitiveValue::Boolean(l.value() < r.value()))
            }
            _ => None,
        },
        BinaryOperator::LessEqual => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                Some(PrimitiveValue::Boolean(l.value() <= r.value()))
            }
            _ => None,
        },
        BinaryOperator::GreaterThan => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                Some(PrimitiveValue::Boolean(l.value() > r.value()))
            }
            _ => None,
        },
        BinaryOperator::GreaterEqual => match (lhs, rhs) {
            (PrimitiveValue::Number(l), PrimitiveValue::Number(r)) => {
                Some(PrimitiveValue::Boolean(l.value() >= r.value()))
            }
            _ => None,
        },
        BinaryOperator::StrictEqual => Some(PrimitiveValue::Boolean(js_strict_equal(lhs, rhs))),
        BinaryOperator::StrictNotEqual => Some(PrimitiveValue::Boolean(!js_strict_equal(lhs, rhs))),
        BinaryOperator::Equal => Some(PrimitiveValue::Boolean(js_abstract_equal(lhs, rhs))),
        BinaryOperator::NotEqual => Some(PrimitiveValue::Boolean(!js_abstract_equal(lhs, rhs))),
        BinaryOperator::In | BinaryOperator::InstanceOf => None,
    }
}

// =============================================================================
// JavaScript equality semantics
// =============================================================================

fn js_strict_equal(lhs: &PrimitiveValue, rhs: &PrimitiveValue) -> bool {
    match (lhs, rhs) {
        (PrimitiveValue::Null, PrimitiveValue::Null) => true,
        (PrimitiveValue::Undefined, PrimitiveValue::Undefined) => true,
        (PrimitiveValue::Boolean(a), PrimitiveValue::Boolean(b)) => a == b,
        (PrimitiveValue::Number(a), PrimitiveValue::Number(b)) => {
            let av = a.value();
            let bv = b.value();
            // NaN !== NaN in JS
            if av.is_nan() || bv.is_nan() {
                return false;
            }
            av == bv
        }
        (PrimitiveValue::String(a), PrimitiveValue::String(b)) => a == b,
        // Different types => false
        _ => false,
    }
}

/// Convert a string to a number using JS `ToNumber` semantics.
/// In JS: `""` → 0, `" "` → 0, `" 42 "` → 42, `"0x1A"` → 26, `"Infinity"` → Infinity.
fn js_to_number(s: &str) -> f64 {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return 0.0;
    }
    if trimmed == "Infinity" || trimmed == "+Infinity" {
        return f64::INFINITY;
    }
    if trimmed == "-Infinity" {
        return f64::NEG_INFINITY;
    }
    // Handle hex literals (0x/0X)
    if trimmed.starts_with("0x") || trimmed.starts_with("0X") {
        return match u64::from_str_radix(&trimmed[2..], 16) {
            Ok(v) => v as f64,
            Err(_) => f64::NAN,
        };
    }
    // Handle octal literals (0o/0O)
    if trimmed.starts_with("0o") || trimmed.starts_with("0O") {
        return match u64::from_str_radix(&trimmed[2..], 8) {
            Ok(v) => v as f64,
            Err(_) => f64::NAN,
        };
    }
    // Handle binary literals (0b/0B)
    if trimmed.starts_with("0b") || trimmed.starts_with("0B") {
        return match u64::from_str_radix(&trimmed[2..], 2) {
            Ok(v) => v as f64,
            Err(_) => f64::NAN,
        };
    }
    trimmed.parse::<f64>().unwrap_or(f64::NAN)
}

fn js_abstract_equal(lhs: &PrimitiveValue, rhs: &PrimitiveValue) -> bool {
    match (lhs, rhs) {
        (PrimitiveValue::Null, PrimitiveValue::Null) => true,
        (PrimitiveValue::Undefined, PrimitiveValue::Undefined) => true,
        (PrimitiveValue::Null, PrimitiveValue::Undefined)
        | (PrimitiveValue::Undefined, PrimitiveValue::Null) => true,
        (PrimitiveValue::Boolean(a), PrimitiveValue::Boolean(b)) => a == b,
        (PrimitiveValue::Number(a), PrimitiveValue::Number(b)) => {
            let av = a.value();
            let bv = b.value();
            if av.is_nan() || bv.is_nan() {
                return false;
            }
            av == bv
        }
        (PrimitiveValue::String(a), PrimitiveValue::String(b)) => a == b,
        // Cross-type coercions for primitives
        (PrimitiveValue::Number(n), PrimitiveValue::String(s))
        | (PrimitiveValue::String(s), PrimitiveValue::Number(n)) => {
            // String is coerced to number using JS ToNumber semantics.
            // Ill-formed strings coerce to NaN, like any non-numeric text.
            let sv = match s.as_str() {
                Some(utf8) => js_to_number(utf8),
                None => f64::NAN,
            };
            let nv = n.value();
            if nv.is_nan() || sv.is_nan() {
                false
            } else {
                nv == sv
            }
        }
        (PrimitiveValue::Boolean(b), other) => {
            let num = if *b { 1.0 } else { 0.0 };
            js_abstract_equal(&PrimitiveValue::Number(FloatValue::new(num)), other)
        }
        (other, PrimitiveValue::Boolean(b)) => {
            let num = if *b { 1.0 } else { 0.0 };
            js_abstract_equal(other, &PrimitiveValue::Number(FloatValue::new(num)))
        }
        // null/undefined vs number/string => false
        _ => false,
    }
}

// =============================================================================
// JavaScript Number.toString() approximation
// =============================================================================

/// ECMAScript ToInt32: convert f64 to i32 with modular (wrapping) semantics.
fn js_to_int32(n: f64) -> i32 {
    if n.is_nan() || n.is_infinite() || n == 0.0 {
        return 0;
    }
    // Truncate, then wrap to 32 bits
    let int64 = (n.trunc() as i64) & 0xFFFFFFFF;
    // Reinterpret as signed i32
    if int64 >= 0x80000000 {
        (int64 as u32) as i32
    } else {
        int64 as i32
    }
}

/// ECMAScript ToUint32: convert f64 to u32 with modular (wrapping) semantics.
fn js_to_uint32(n: f64) -> u32 {
    js_to_int32(n) as u32
}

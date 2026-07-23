/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
use rustc_hash::FxHashMap;

use crate::environment::Environment;
use crate::{
    ArrayElement, ArrayPatternElement, BasicBlock, BlockId, HirFunction, IdentifierId, Instruction,
    InstructionKind, InstructionValue, JsxAttribute, JsxTag, ManualMemoDependencyRoot,
    ObjectPropertyKey, ObjectPropertyOrSpread, Pattern, Place, PlaceOrSpread, ScopeId, Terminal,
};

// =============================================================================
// Iterator functions (return Vec instead of generators)
// =============================================================================

/// Yields `instr.lvalue` plus the value's lvalues.
/// Equivalent to TS `eachInstructionLValue`.
pub fn each_instruction_lvalue(instr: &Instruction) -> Vec<Place> {
    let mut result = Vec::new();
    result.push(instr.lvalue.clone());
    result.extend(each_instruction_value_lvalue(&instr.value));
    result
}

/// Yields lvalues from DeclareLocal/StoreLocal/DeclareContext/StoreContext/Destructure/PostfixUpdate/PrefixUpdate.
/// Equivalent to TS `eachInstructionValueLValue`.
pub fn each_instruction_value_lvalue(value: &InstructionValue) -> Vec<Place> {
    let mut result = Vec::new();
    match value {
        InstructionValue::DeclareContext { lvalue, .. }
        | InstructionValue::StoreContext { lvalue, .. }
        | InstructionValue::DeclareLocal { lvalue, .. }
        | InstructionValue::StoreLocal { lvalue, .. } => {
            result.push(lvalue.place.clone());
        }
        InstructionValue::Destructure { lvalue, .. } => {
            result.extend(each_pattern_operand(&lvalue.pattern));
        }
        InstructionValue::PostfixUpdate { lvalue, .. }
        | InstructionValue::PrefixUpdate { lvalue, .. } => {
            result.push(lvalue.clone());
        }
        // All other variants have no lvalues
        InstructionValue::LoadLocal { .. }
        | InstructionValue::LoadContext { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::JSXText { .. }
        | InstructionValue::BinaryExpression { .. }
        | InstructionValue::NewExpression { .. }
        | InstructionValue::CallExpression { .. }
        | InstructionValue::MethodCall { .. }
        | InstructionValue::UnaryExpression { .. }
        | InstructionValue::TypeCastExpression { .. }
        | InstructionValue::NonNullExpression { .. }
        | InstructionValue::JsxExpression { .. }
        | InstructionValue::ObjectExpression { .. }
        | InstructionValue::ObjectMethod { .. }
        | InstructionValue::ArrayExpression { .. }
        | InstructionValue::JsxFragment { .. }
        | InstructionValue::RegExpLiteral { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::PropertyStore { .. }
        | InstructionValue::PropertyLoad { .. }
        | InstructionValue::PropertyDelete { .. }
        | InstructionValue::ComputedStore { .. }
        | InstructionValue::ComputedLoad { .. }
        | InstructionValue::ComputedDelete { .. }
        | InstructionValue::LoadGlobal { .. }
        | InstructionValue::StoreGlobal { .. }
        | InstructionValue::FunctionExpression { .. }
        | InstructionValue::TaggedTemplateExpression { .. }
        | InstructionValue::TemplateLiteral { .. }
        | InstructionValue::Await { .. }
        | InstructionValue::GetIterator { .. }
        | InstructionValue::IteratorNext { .. }
        | InstructionValue::NextPropertyOf { .. }
        | InstructionValue::Debugger { .. }
        | InstructionValue::StartMemoize { .. }
        | InstructionValue::FinishMemoize { .. }
        | InstructionValue::UnsupportedNode { .. } => {}
    }
    result
}

/// Yields lvalues with their InstructionKind.
/// Equivalent to TS `eachInstructionLValueWithKind`.
pub fn each_instruction_lvalue_with_kind(
    value: &InstructionValue,
) -> Vec<(Place, InstructionKind)> {
    let mut result = Vec::new();
    match value {
        InstructionValue::DeclareContext { lvalue, .. }
        | InstructionValue::StoreContext { lvalue, .. }
        | InstructionValue::DeclareLocal { lvalue, .. }
        | InstructionValue::StoreLocal { lvalue, .. } => {
            result.push((lvalue.place.clone(), lvalue.kind));
        }
        InstructionValue::Destructure { lvalue, .. } => {
            let kind = lvalue.kind;
            for place in each_pattern_operand(&lvalue.pattern) {
                result.push((place, kind));
            }
        }
        InstructionValue::PostfixUpdate { lvalue, .. }
        | InstructionValue::PrefixUpdate { lvalue, .. } => {
            result.push((lvalue.clone(), InstructionKind::Reassign));
        }
        // All other variants have no lvalues with kind
        InstructionValue::LoadLocal { .. }
        | InstructionValue::LoadContext { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::JSXText { .. }
        | InstructionValue::BinaryExpression { .. }
        | InstructionValue::NewExpression { .. }
        | InstructionValue::CallExpression { .. }
        | InstructionValue::MethodCall { .. }
        | InstructionValue::UnaryExpression { .. }
        | InstructionValue::TypeCastExpression { .. }
        | InstructionValue::NonNullExpression { .. }
        | InstructionValue::JsxExpression { .. }
        | InstructionValue::ObjectExpression { .. }
        | InstructionValue::ObjectMethod { .. }
        | InstructionValue::ArrayExpression { .. }
        | InstructionValue::JsxFragment { .. }
        | InstructionValue::RegExpLiteral { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::PropertyStore { .. }
        | InstructionValue::PropertyLoad { .. }
        | InstructionValue::PropertyDelete { .. }
        | InstructionValue::ComputedStore { .. }
        | InstructionValue::ComputedLoad { .. }
        | InstructionValue::ComputedDelete { .. }
        | InstructionValue::LoadGlobal { .. }
        | InstructionValue::StoreGlobal { .. }
        | InstructionValue::FunctionExpression { .. }
        | InstructionValue::TaggedTemplateExpression { .. }
        | InstructionValue::TemplateLiteral { .. }
        | InstructionValue::Await { .. }
        | InstructionValue::GetIterator { .. }
        | InstructionValue::IteratorNext { .. }
        | InstructionValue::NextPropertyOf { .. }
        | InstructionValue::Debugger { .. }
        | InstructionValue::StartMemoize { .. }
        | InstructionValue::FinishMemoize { .. }
        | InstructionValue::UnsupportedNode { .. } => {}
    }
    result
}

/// Delegates to each_instruction_value_operand.
/// Equivalent to TS `eachInstructionOperand`.
pub fn each_instruction_operand(instr: &Instruction, env: &Environment) -> Vec<Place> {
    each_instruction_value_operand(&instr.value, env)
}

/// Like `each_instruction_operand` but takes `functions` directly instead of `env`.
/// Useful when borrow splitting prevents passing the full `Environment`.
pub fn each_instruction_operand_with_functions(
    instr: &Instruction,
    functions: &[HirFunction],
) -> Vec<Place> {
    each_instruction_value_operand_with_functions(&instr.value, functions)
}

/// Yields operand places from an InstructionValue.
/// Equivalent to TS `eachInstructionValueOperand`.
pub fn each_instruction_value_operand(value: &InstructionValue, env: &Environment) -> Vec<Place> {
    each_instruction_value_operand_with_functions(value, &env.functions)
}

/// Like `each_instruction_value_operand` but takes `functions` directly instead of `env`.
/// Useful when borrow splitting prevents passing the full `Environment`.
pub fn each_instruction_value_operand_with_functions(
    value: &InstructionValue,
    functions: &[HirFunction],
) -> Vec<Place> {
    let mut result = Vec::new();
    match value {
        InstructionValue::NewExpression { callee, args, .. }
        | InstructionValue::CallExpression { callee, args, .. } => {
            result.push(callee.clone());
            result.extend(each_call_argument(args));
        }
        InstructionValue::BinaryExpression { left, right, .. } => {
            result.push(left.clone());
            result.push(right.clone());
        }
        InstructionValue::MethodCall {
            receiver,
            property,
            args,
            ..
        } => {
            result.push(receiver.clone());
            result.push(property.clone());
            result.extend(each_call_argument(args));
        }
        InstructionValue::DeclareContext { .. } | InstructionValue::DeclareLocal { .. } => {
            // no operands
        }
        InstructionValue::LoadLocal { place, .. } | InstructionValue::LoadContext { place, .. } => {
            result.push(place.clone());
        }
        InstructionValue::StoreLocal { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::StoreContext {
            lvalue, value: val, ..
        } => {
            result.push(lvalue.place.clone());
            result.push(val.clone());
        }
        InstructionValue::StoreGlobal { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::Destructure { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::PropertyLoad { object, .. } => {
            result.push(object.clone());
        }
        InstructionValue::PropertyDelete { object, .. } => {
            result.push(object.clone());
        }
        InstructionValue::PropertyStore {
            object, value: val, ..
        } => {
            result.push(object.clone());
            result.push(val.clone());
        }
        InstructionValue::ComputedLoad {
            object, property, ..
        } => {
            result.push(object.clone());
            result.push(property.clone());
        }
        InstructionValue::ComputedDelete {
            object, property, ..
        } => {
            result.push(object.clone());
            result.push(property.clone());
        }
        InstructionValue::ComputedStore {
            object,
            property,
            value: val,
            ..
        } => {
            result.push(object.clone());
            result.push(property.clone());
            result.push(val.clone());
        }
        InstructionValue::UnaryExpression { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::JsxExpression {
            tag,
            props,
            children,
            ..
        } => {
            if let JsxTag::Place(place) = tag {
                result.push(place.clone());
            }
            for attribute in props {
                match attribute {
                    JsxAttribute::Attribute { place, .. } => {
                        result.push(place.clone());
                    }
                    JsxAttribute::SpreadAttribute { argument, .. } => {
                        result.push(argument.clone());
                    }
                }
            }
            if let Some(children) = children {
                for child in children {
                    result.push(child.clone());
                }
            }
        }
        InstructionValue::JsxFragment { children, .. } => {
            for child in children {
                result.push(child.clone());
            }
        }
        InstructionValue::ObjectExpression { properties, .. } => {
            for property in properties {
                match property {
                    ObjectPropertyOrSpread::Property(prop) => {
                        if let ObjectPropertyKey::Computed { name } = &prop.key {
                            result.push(name.clone());
                        }
                        result.push(prop.place.clone());
                    }
                    ObjectPropertyOrSpread::Spread(spread) => {
                        result.push(spread.place.clone());
                    }
                }
            }
        }
        InstructionValue::ArrayExpression { elements, .. } => {
            for element in elements {
                match element {
                    ArrayElement::Place(place) => {
                        result.push(place.clone());
                    }
                    ArrayElement::Spread(spread) => {
                        result.push(spread.place.clone());
                    }
                    ArrayElement::Hole => {}
                }
            }
        }
        InstructionValue::ObjectMethod { lowered_func, .. }
        | InstructionValue::FunctionExpression { lowered_func, .. } => {
            let func = &functions[lowered_func.func.0 as usize];
            for ctx_place in &func.context {
                result.push(ctx_place.clone());
            }
        }
        InstructionValue::TaggedTemplateExpression { tag, .. } => {
            result.push(tag.clone());
        }
        InstructionValue::TypeCastExpression { value: val, .. }
        | InstructionValue::NonNullExpression { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::TemplateLiteral { subexprs, .. } => {
            for subexpr in subexprs {
                result.push(subexpr.clone());
            }
        }
        InstructionValue::Await { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::GetIterator { collection, .. } => {
            result.push(collection.clone());
        }
        InstructionValue::IteratorNext {
            iterator,
            collection,
            ..
        } => {
            result.push(iterator.clone());
            result.push(collection.clone());
        }
        InstructionValue::NextPropertyOf { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::PostfixUpdate { value: val, .. }
        | InstructionValue::PrefixUpdate { value: val, .. } => {
            result.push(val.clone());
        }
        InstructionValue::StartMemoize { deps, .. } => {
            if let Some(deps) = deps {
                for dep in deps {
                    if let ManualMemoDependencyRoot::NamedLocal { value, .. } = &dep.root {
                        result.push(value.clone());
                    }
                }
            }
        }
        InstructionValue::FinishMemoize { decl, .. } => {
            result.push(decl.clone());
        }
        InstructionValue::Debugger { .. }
        | InstructionValue::RegExpLiteral { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::LoadGlobal { .. }
        | InstructionValue::UnsupportedNode { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::JSXText { .. } => {
            // no operands
        }
    }
    result
}

/// Yields each arg's place.
/// Equivalent to TS `eachCallArgument`.
pub fn each_call_argument(args: &[PlaceOrSpread]) -> Vec<Place> {
    let mut result = Vec::new();
    for arg in args {
        match arg {
            PlaceOrSpread::Place(place) => {
                result.push(place.clone());
            }
            PlaceOrSpread::Spread(spread) => {
                result.push(spread.place.clone());
            }
        }
    }
    result
}

/// Yields places from array/object patterns.
/// Equivalent to TS `eachPatternOperand`.
pub fn each_pattern_operand(pattern: &Pattern) -> Vec<Place> {
    let mut result = Vec::new();
    match pattern {
        Pattern::Array(arr) => {
            for item in &arr.items {
                match item {
                    ArrayPatternElement::Place(place) => {
                        result.push(place.clone());
                    }
                    ArrayPatternElement::Spread(spread) => {
                        result.push(spread.place.clone());
                    }
                    ArrayPatternElement::Hole => {}
                }
            }
        }
        Pattern::Object(obj) => {
            for property in &obj.properties {
                match property {
                    ObjectPropertyOrSpread::Property(prop) => {
                        result.push(prop.place.clone());
                    }
                    ObjectPropertyOrSpread::Spread(spread) => {
                        result.push(spread.place.clone());
                    }
                }
            }
        }
    }
    result
}

/// Returns true if the pattern contains a spread element.
/// Equivalent to TS `doesPatternContainSpreadElement`.
pub fn does_pattern_contain_spread_element(pattern: &Pattern) -> bool {
    match pattern {
        Pattern::Array(arr) => {
            for item in &arr.items {
                if matches!(item, ArrayPatternElement::Spread(_)) {
                    return true;
                }
            }
        }
        Pattern::Object(obj) => {
            for property in &obj.properties {
                if matches!(property, ObjectPropertyOrSpread::Spread(_)) {
                    return true;
                }
            }
        }
    }
    false
}

/// Yields successor block IDs (NOT fallthroughs, this is intentional).
/// Equivalent to TS `eachTerminalSuccessor`.
pub fn each_terminal_successor(terminal: &Terminal) -> Vec<BlockId> {
    let mut result = Vec::new();
    match terminal {
        Terminal::Goto { block, .. } => {
            result.push(*block);
        }
        Terminal::If {
            consequent,
            alternate,
            ..
        } => {
            result.push(*consequent);
            result.push(*alternate);
        }
        Terminal::Branch {
            consequent,
            alternate,
            ..
        } => {
            result.push(*consequent);
            result.push(*alternate);
        }
        Terminal::Switch { cases, .. } => {
            for case in cases {
                result.push(case.block);
            }
        }
        Terminal::Optional { test, .. }
        | Terminal::Ternary { test, .. }
        | Terminal::Logical { test, .. } => {
            result.push(*test);
        }
        Terminal::Return { .. } => {}
        Terminal::Throw { .. } => {}
        Terminal::DoWhile { loop_block, .. } => {
            result.push(*loop_block);
        }
        Terminal::While { test, .. } => {
            result.push(*test);
        }
        Terminal::For { init, .. } => {
            result.push(*init);
        }
        Terminal::ForOf { init, .. } => {
            result.push(*init);
        }
        Terminal::ForIn { init, .. } => {
            result.push(*init);
        }
        Terminal::Label { block, .. } => {
            result.push(*block);
        }
        Terminal::Sequence { block, .. } => {
            result.push(*block);
        }
        Terminal::MaybeThrow {
            continuation,
            handler,
            ..
        } => {
            result.push(*continuation);
            if let Some(handler) = handler {
                result.push(*handler);
            }
        }
        Terminal::Try { block, .. } => {
            result.push(*block);
        }
        Terminal::Scope { block, .. } | Terminal::PrunedScope { block, .. } => {
            result.push(*block);
        }
        Terminal::Unreachable { .. } | Terminal::Unsupported { .. } => {}
    }
    result
}

/// Yields places used by terminal.
/// Equivalent to TS `eachTerminalOperand`.
pub fn each_terminal_operand(terminal: &Terminal) -> Vec<Place> {
    let mut result = Vec::new();
    match terminal {
        Terminal::If { test, .. } => {
            result.push(test.clone());
        }
        Terminal::Branch { test, .. } => {
            result.push(test.clone());
        }
        Terminal::Switch { test, cases, .. } => {
            result.push(test.clone());
            for case in cases {
                if let Some(test) = &case.test {
                    result.push(test.clone());
                }
            }
        }
        Terminal::Return { value, .. } | Terminal::Throw { value, .. } => {
            result.push(value.clone());
        }
        Terminal::Try {
            handler_binding, ..
        } => {
            if let Some(binding) = handler_binding {
                result.push(binding.clone());
            }
        }
        Terminal::MaybeThrow { .. }
        | Terminal::Sequence { .. }
        | Terminal::Label { .. }
        | Terminal::Optional { .. }
        | Terminal::Ternary { .. }
        | Terminal::Logical { .. }
        | Terminal::DoWhile { .. }
        | Terminal::While { .. }
        | Terminal::For { .. }
        | Terminal::ForOf { .. }
        | Terminal::ForIn { .. }
        | Terminal::Goto { .. }
        | Terminal::Unreachable { .. }
        | Terminal::Unsupported { .. }
        | Terminal::Scope { .. }
        | Terminal::PrunedScope { .. } => {
            // no-op
        }
    }
    result
}

// =============================================================================
// Mapping functions (mutate in place)
// =============================================================================

/// Maps the instruction's lvalue and value's lvalues.
/// Equivalent to TS `mapInstructionLValues`.
pub fn map_instruction_lvalues(instr: &mut Instruction, f: &mut impl FnMut(Place) -> Place) {
    match &mut instr.value {
        InstructionValue::DeclareLocal { lvalue, .. }
        | InstructionValue::StoreLocal { lvalue, .. }
        | InstructionValue::DeclareContext { lvalue, .. }
        | InstructionValue::StoreContext { lvalue, .. } => {
            lvalue.place = f(lvalue.place.clone());
        }
        InstructionValue::Destructure { lvalue, .. } => {
            map_pattern_operands(&mut lvalue.pattern, f);
        }
        InstructionValue::PostfixUpdate { lvalue, .. }
        | InstructionValue::PrefixUpdate { lvalue, .. } => {
            *lvalue = f(lvalue.clone());
        }
        _ => {}
    }
    instr.lvalue = f(instr.lvalue.clone());
}

/// Maps operands of an instruction.
/// Equivalent to TS `mapInstructionOperands`.
pub fn map_instruction_operands(
    instr: &mut Instruction,
    env: &mut Environment,
    f: &mut impl FnMut(Place) -> Place,
) {
    map_instruction_value_operands(&mut instr.value, env, f);
}

/// Maps operand places in an InstructionValue.
/// Equivalent to TS `mapInstructionValueOperands`.
pub fn map_instruction_value_operands(
    value: &mut InstructionValue,
    env: &mut Environment,
    f: &mut impl FnMut(Place) -> Place,
) {
    match value {
        InstructionValue::BinaryExpression { left, right, .. } => {
            *left = f(left.clone());
            *right = f(right.clone());
        }
        InstructionValue::PropertyLoad { object, .. } => {
            *object = f(object.clone());
        }
        InstructionValue::PropertyDelete { object, .. } => {
            *object = f(object.clone());
        }
        InstructionValue::PropertyStore {
            object, value: val, ..
        } => {
            *object = f(object.clone());
            *val = f(val.clone());
        }
        InstructionValue::ComputedLoad {
            object, property, ..
        } => {
            *object = f(object.clone());
            *property = f(property.clone());
        }
        InstructionValue::ComputedDelete {
            object, property, ..
        } => {
            *object = f(object.clone());
            *property = f(property.clone());
        }
        InstructionValue::ComputedStore {
            object,
            property,
            value: val,
            ..
        } => {
            *object = f(object.clone());
            *property = f(property.clone());
            *val = f(val.clone());
        }
        InstructionValue::DeclareContext { .. } | InstructionValue::DeclareLocal { .. } => {
            // no operands
        }
        InstructionValue::LoadLocal { place, .. } | InstructionValue::LoadContext { place, .. } => {
            *place = f(place.clone());
        }
        InstructionValue::StoreLocal { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::StoreContext {
            lvalue, value: val, ..
        } => {
            lvalue.place = f(lvalue.place.clone());
            *val = f(val.clone());
        }
        InstructionValue::StoreGlobal { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::Destructure { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::NewExpression { callee, args, .. }
        | InstructionValue::CallExpression { callee, args, .. } => {
            *callee = f(callee.clone());
            map_call_arguments(args, f);
        }
        InstructionValue::MethodCall {
            receiver,
            property,
            args,
            ..
        } => {
            *receiver = f(receiver.clone());
            *property = f(property.clone());
            map_call_arguments(args, f);
        }
        InstructionValue::UnaryExpression { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::JsxExpression {
            tag,
            props,
            children,
            ..
        } => {
            if let JsxTag::Place(place) = tag {
                *place = f(place.clone());
            }
            for attribute in props.iter_mut() {
                match attribute {
                    JsxAttribute::Attribute { place, .. } => {
                        *place = f(place.clone());
                    }
                    JsxAttribute::SpreadAttribute { argument, .. } => {
                        *argument = f(argument.clone());
                    }
                }
            }
            if let Some(children) = children {
                *children = children.iter().map(|p| f(p.clone())).collect();
            }
        }
        InstructionValue::ObjectExpression { properties, .. } => {
            for property in properties.iter_mut() {
                match property {
                    ObjectPropertyOrSpread::Property(prop) => {
                        if let ObjectPropertyKey::Computed { name } = &mut prop.key {
                            *name = f(name.clone());
                        }
                        prop.place = f(prop.place.clone());
                    }
                    ObjectPropertyOrSpread::Spread(spread) => {
                        spread.place = f(spread.place.clone());
                    }
                }
            }
        }
        InstructionValue::ArrayExpression { elements, .. } => {
            *elements = elements
                .iter()
                .map(|element| match element {
                    ArrayElement::Place(place) => ArrayElement::Place(f(place.clone())),
                    ArrayElement::Spread(spread) => {
                        let mut spread = spread.clone();
                        spread.place = f(spread.place.clone());
                        ArrayElement::Spread(spread)
                    }
                    ArrayElement::Hole => ArrayElement::Hole,
                })
                .collect();
        }
        InstructionValue::JsxFragment { children, .. } => {
            *children = children.iter().map(|e| f(e.clone())).collect();
        }
        InstructionValue::ObjectMethod { lowered_func, .. }
        | InstructionValue::FunctionExpression { lowered_func, .. } => {
            let func = &mut env.functions[lowered_func.func.0 as usize];
            func.context = func.context.iter().map(|d| f(d.clone())).collect();
        }
        InstructionValue::TaggedTemplateExpression { tag, .. } => {
            *tag = f(tag.clone());
        }
        InstructionValue::TypeCastExpression { value: val, .. }
        | InstructionValue::NonNullExpression { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::TemplateLiteral { subexprs, .. } => {
            *subexprs = subexprs.iter().map(|s| f(s.clone())).collect();
        }
        InstructionValue::Await { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::GetIterator { collection, .. } => {
            *collection = f(collection.clone());
        }
        InstructionValue::IteratorNext {
            iterator,
            collection,
            ..
        } => {
            *iterator = f(iterator.clone());
            *collection = f(collection.clone());
        }
        InstructionValue::NextPropertyOf { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::PostfixUpdate { value: val, .. }
        | InstructionValue::PrefixUpdate { value: val, .. } => {
            *val = f(val.clone());
        }
        InstructionValue::StartMemoize { deps, .. } => {
            if let Some(deps) = deps {
                for dep in deps.iter_mut() {
                    if let ManualMemoDependencyRoot::NamedLocal { value, .. } = &mut dep.root {
                        *value = f(value.clone());
                    }
                }
            }
        }
        InstructionValue::FinishMemoize { decl, .. } => {
            *decl = f(decl.clone());
        }
        InstructionValue::Debugger { .. }
        | InstructionValue::RegExpLiteral { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::LoadGlobal { .. }
        | InstructionValue::UnsupportedNode { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::JSXText { .. } => {
            // no operands
        }
    }
}

/// Maps call arguments in place.
/// Equivalent to TS `mapCallArguments`.
pub fn map_call_arguments(args: &mut Vec<PlaceOrSpread>, f: &mut impl FnMut(Place) -> Place) {
    for arg in args.iter_mut() {
        match arg {
            PlaceOrSpread::Place(place) => {
                *place = f(place.clone());
            }
            PlaceOrSpread::Spread(spread) => {
                spread.place = f(spread.place.clone());
            }
        }
    }
}

/// Maps pattern operands in place.
/// Equivalent to TS `mapPatternOperands`.
pub fn map_pattern_operands(pattern: &mut Pattern, f: &mut impl FnMut(Place) -> Place) {
    match pattern {
        Pattern::Array(arr) => {
            arr.items = arr
                .items
                .iter()
                .map(|item| match item {
                    ArrayPatternElement::Place(place) => {
                        ArrayPatternElement::Place(f(place.clone()))
                    }
                    ArrayPatternElement::Spread(spread) => {
                        let mut spread = spread.clone();
                        spread.place = f(spread.place.clone());
                        ArrayPatternElement::Spread(spread)
                    }
                    ArrayPatternElement::Hole => ArrayPatternElement::Hole,
                })
                .collect();
        }
        Pattern::Object(obj) => {
            for property in obj.properties.iter_mut() {
                match property {
                    ObjectPropertyOrSpread::Property(prop) => {
                        prop.place = f(prop.place.clone());
                    }
                    ObjectPropertyOrSpread::Spread(spread) => {
                        spread.place = f(spread.place.clone());
                    }
                }
            }
        }
    }
}

/// Maps a terminal node's block assignments in place.
/// Equivalent to TS `mapTerminalSuccessors` — but mutates in place instead of returning a new terminal.
pub fn map_terminal_successors(terminal: &mut Terminal, f: &mut impl FnMut(BlockId) -> BlockId) {
    match terminal {
        Terminal::Goto { block, .. } => {
            *block = f(*block);
        }
        Terminal::If {
            consequent,
            alternate,
            fallthrough,
            ..
        } => {
            *consequent = f(*consequent);
            *alternate = f(*alternate);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Branch {
            consequent,
            alternate,
            fallthrough,
            ..
        } => {
            *consequent = f(*consequent);
            *alternate = f(*alternate);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Switch {
            cases, fallthrough, ..
        } => {
            for case in cases.iter_mut() {
                case.block = f(case.block);
            }
            *fallthrough = f(*fallthrough);
        }
        Terminal::Logical {
            test, fallthrough, ..
        } => {
            *test = f(*test);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Ternary {
            test, fallthrough, ..
        } => {
            *test = f(*test);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Optional {
            test, fallthrough, ..
        } => {
            *test = f(*test);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Return { .. } => {}
        Terminal::Throw { .. } => {}
        Terminal::DoWhile {
            loop_block,
            test,
            fallthrough,
            ..
        } => {
            *loop_block = f(*loop_block);
            *test = f(*test);
            *fallthrough = f(*fallthrough);
        }
        Terminal::While {
            test,
            loop_block,
            fallthrough,
            ..
        } => {
            *test = f(*test);
            *loop_block = f(*loop_block);
            *fallthrough = f(*fallthrough);
        }
        Terminal::For {
            init,
            test,
            update,
            loop_block,
            fallthrough,
            ..
        } => {
            *init = f(*init);
            *test = f(*test);
            if let Some(update) = update {
                *update = f(*update);
            }
            *loop_block = f(*loop_block);
            *fallthrough = f(*fallthrough);
        }
        Terminal::ForOf {
            init,
            test,
            loop_block,
            fallthrough,
            ..
        } => {
            *init = f(*init);
            *test = f(*test);
            *loop_block = f(*loop_block);
            *fallthrough = f(*fallthrough);
        }
        Terminal::ForIn {
            init,
            loop_block,
            fallthrough,
            ..
        } => {
            *init = f(*init);
            *loop_block = f(*loop_block);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Label {
            block, fallthrough, ..
        } => {
            *block = f(*block);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Sequence {
            block, fallthrough, ..
        } => {
            *block = f(*block);
            *fallthrough = f(*fallthrough);
        }
        Terminal::MaybeThrow {
            continuation,
            handler,
            ..
        } => {
            *continuation = f(*continuation);
            if let Some(handler) = handler {
                *handler = f(*handler);
            }
        }
        Terminal::Try {
            block,
            handler,
            fallthrough,
            ..
        } => {
            *block = f(*block);
            *handler = f(*handler);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Scope {
            block, fallthrough, ..
        }
        | Terminal::PrunedScope {
            block, fallthrough, ..
        } => {
            *block = f(*block);
            *fallthrough = f(*fallthrough);
        }
        Terminal::Unreachable { .. } | Terminal::Unsupported { .. } => {}
    }
}

/// Maps a terminal node's operand places in place.
/// Equivalent to TS `mapTerminalOperands`.
pub fn map_terminal_operands(terminal: &mut Terminal, f: &mut impl FnMut(Place) -> Place) {
    match terminal {
        Terminal::If { test, .. } => {
            *test = f(test.clone());
        }
        Terminal::Branch { test, .. } => {
            *test = f(test.clone());
        }
        Terminal::Switch { test, cases, .. } => {
            *test = f(test.clone());
            for case in cases.iter_mut() {
                if let Some(t) = &mut case.test {
                    *t = f(t.clone());
                }
            }
        }
        Terminal::Return { value, .. } | Terminal::Throw { value, .. } => {
            *value = f(value.clone());
        }
        Terminal::Try {
            handler_binding, ..
        } => {
            if let Some(binding) = handler_binding {
                *binding = f(binding.clone());
            }
        }
        Terminal::MaybeThrow { .. }
        | Terminal::Sequence { .. }
        | Terminal::Label { .. }
        | Terminal::Optional { .. }
        | Terminal::Ternary { .. }
        | Terminal::Logical { .. }
        | Terminal::DoWhile { .. }
        | Terminal::While { .. }
        | Terminal::For { .. }
        | Terminal::ForOf { .. }
        | Terminal::ForIn { .. }
        | Terminal::Goto { .. }
        | Terminal::Unreachable { .. }
        | Terminal::Unsupported { .. }
        | Terminal::Scope { .. }
        | Terminal::PrunedScope { .. } => {
            // no-op
        }
    }
}

/// Yields ALL block IDs referenced by a terminal (successors + fallthroughs + internal blocks).
/// Unlike `each_terminal_successor` which yields only standard control flow successors,
/// this function yields every block ID that `map_terminal_successors` would visit.
pub fn each_terminal_all_successors(terminal: &Terminal) -> Vec<BlockId> {
    let mut result = Vec::new();
    match terminal {
        Terminal::Goto { block, .. } => {
            result.push(*block);
        }
        Terminal::If {
            consequent,
            alternate,
            fallthrough,
            ..
        } => {
            result.push(*consequent);
            result.push(*alternate);
            result.push(*fallthrough);
        }
        Terminal::Branch {
            consequent,
            alternate,
            fallthrough,
            ..
        } => {
            result.push(*consequent);
            result.push(*alternate);
            result.push(*fallthrough);
        }
        Terminal::Switch {
            cases, fallthrough, ..
        } => {
            for case in cases {
                result.push(case.block);
            }
            result.push(*fallthrough);
        }
        Terminal::Logical {
            test, fallthrough, ..
        }
        | Terminal::Ternary {
            test, fallthrough, ..
        }
        | Terminal::Optional {
            test, fallthrough, ..
        } => {
            result.push(*test);
            result.push(*fallthrough);
        }
        Terminal::Return { .. } | Terminal::Throw { .. } => {}
        Terminal::DoWhile {
            loop_block,
            test,
            fallthrough,
            ..
        } => {
            result.push(*loop_block);
            result.push(*test);
            result.push(*fallthrough);
        }
        Terminal::While {
            test,
            loop_block,
            fallthrough,
            ..
        } => {
            result.push(*test);
            result.push(*loop_block);
            result.push(*fallthrough);
        }
        Terminal::For {
            init,
            test,
            update,
            loop_block,
            fallthrough,
            ..
        } => {
            result.push(*init);
            result.push(*test);
            if let Some(update) = update {
                result.push(*update);
            }
            result.push(*loop_block);
            result.push(*fallthrough);
        }
        Terminal::ForOf {
            init,
            test,
            loop_block,
            fallthrough,
            ..
        } => {
            result.push(*init);
            result.push(*test);
            result.push(*loop_block);
            result.push(*fallthrough);
        }
        Terminal::ForIn {
            init,
            loop_block,
            fallthrough,
            ..
        } => {
            result.push(*init);
            result.push(*loop_block);
            result.push(*fallthrough);
        }
        Terminal::Label {
            block, fallthrough, ..
        }
        | Terminal::Sequence {
            block, fallthrough, ..
        } => {
            result.push(*block);
            result.push(*fallthrough);
        }
        Terminal::MaybeThrow {
            continuation,
            handler,
            ..
        } => {
            result.push(*continuation);
            if let Some(handler) = handler {
                result.push(*handler);
            }
        }
        Terminal::Try {
            block,
            handler,
            fallthrough,
            ..
        } => {
            result.push(*block);
            result.push(*handler);
            result.push(*fallthrough);
        }
        Terminal::Scope {
            block, fallthrough, ..
        }
        | Terminal::PrunedScope {
            block, fallthrough, ..
        } => {
            result.push(*block);
            result.push(*fallthrough);
        }
        Terminal::Unreachable { .. } | Terminal::Unsupported { .. } => {}
    }
    result
}

// =============================================================================
// Terminal fallthrough functions
// =============================================================================

/// Returns the fallthrough block ID for terminals that have one.
/// Equivalent to TS `terminalFallthrough`.
pub fn terminal_fallthrough(terminal: &Terminal) -> Option<BlockId> {
    match terminal {
        // These terminals do NOT have a fallthrough
        Terminal::MaybeThrow { .. }
        | Terminal::Goto { .. }
        | Terminal::Return { .. }
        | Terminal::Throw { .. }
        | Terminal::Unreachable { .. }
        | Terminal::Unsupported { .. } => None,

        // These terminals DO have a fallthrough
        Terminal::Branch { fallthrough, .. }
        | Terminal::Try { fallthrough, .. }
        | Terminal::DoWhile { fallthrough, .. }
        | Terminal::ForOf { fallthrough, .. }
        | Terminal::ForIn { fallthrough, .. }
        | Terminal::For { fallthrough, .. }
        | Terminal::If { fallthrough, .. }
        | Terminal::Label { fallthrough, .. }
        | Terminal::Logical { fallthrough, .. }
        | Terminal::Optional { fallthrough, .. }
        | Terminal::Sequence { fallthrough, .. }
        | Terminal::Switch { fallthrough, .. }
        | Terminal::Ternary { fallthrough, .. }
        | Terminal::While { fallthrough, .. }
        | Terminal::Scope { fallthrough, .. }
        | Terminal::PrunedScope { fallthrough, .. } => Some(*fallthrough),
    }
}

/// Returns true if the terminal has a fallthrough block.
/// Equivalent to TS `terminalHasFallthrough`.
pub fn terminal_has_fallthrough(terminal: &Terminal) -> bool {
    terminal_fallthrough(terminal).is_some()
}

// =============================================================================
// ScopeBlockTraversal
// =============================================================================

/// Block info entry for ScopeBlockTraversal.
#[derive(Debug, Clone)]
pub enum ScopeBlockInfo {
    Begin {
        scope: ScopeId,
        pruned: bool,
        fallthrough: BlockId,
    },
    End {
        scope: ScopeId,
        pruned: bool,
    },
}

/// Helper struct for traversing scope blocks in HIR-form.
/// Equivalent to TS `ScopeBlockTraversal` class.
pub struct ScopeBlockTraversal {
    /// Live stack of active scopes
    active_scopes: Vec<ScopeId>,
    /// Map from block ID to scope block info
    pub block_infos: FxHashMap<BlockId, ScopeBlockInfo>,
}

impl ScopeBlockTraversal {
    pub fn new() -> Self {
        ScopeBlockTraversal {
            active_scopes: Vec::new(),
            block_infos: FxHashMap::default(),
        }
    }

    /// Record scope information for a block's terminal.
    /// Equivalent to TS `recordScopes`.
    pub fn record_scopes(&mut self, block: &BasicBlock) {
        if let Some(block_info) = self.block_infos.get(&block.id) {
            match block_info {
                ScopeBlockInfo::Begin { scope, .. } => {
                    self.active_scopes.push(*scope);
                }
                ScopeBlockInfo::End { scope, .. } => {
                    let top = self.active_scopes.last();
                    assert_eq!(
                        Some(scope),
                        top,
                        "Expected traversed block fallthrough to match top-most active scope"
                    );
                    self.active_scopes.pop();
                }
            }
        }

        match &block.terminal {
            Terminal::Scope {
                block: scope_block,
                fallthrough,
                scope,
                ..
            } => {
                assert!(
                    !self.block_infos.contains_key(scope_block)
                        && !self.block_infos.contains_key(fallthrough),
                    "Expected unique scope blocks and fallthroughs"
                );
                self.block_infos.insert(
                    *scope_block,
                    ScopeBlockInfo::Begin {
                        scope: *scope,
                        pruned: false,
                        fallthrough: *fallthrough,
                    },
                );
                self.block_infos.insert(
                    *fallthrough,
                    ScopeBlockInfo::End {
                        scope: *scope,
                        pruned: false,
                    },
                );
            }
            Terminal::PrunedScope {
                block: scope_block,
                fallthrough,
                scope,
                ..
            } => {
                assert!(
                    !self.block_infos.contains_key(scope_block)
                        && !self.block_infos.contains_key(fallthrough),
                    "Expected unique scope blocks and fallthroughs"
                );
                self.block_infos.insert(
                    *scope_block,
                    ScopeBlockInfo::Begin {
                        scope: *scope,
                        pruned: true,
                        fallthrough: *fallthrough,
                    },
                );
                self.block_infos.insert(
                    *fallthrough,
                    ScopeBlockInfo::End {
                        scope: *scope,
                        pruned: true,
                    },
                );
            }
            _ => {}
        }
    }

    /// Returns true if the given scope is currently 'active', i.e. if the scope start
    /// block but not the scope fallthrough has been recorded.
    pub fn is_scope_active(&self, scope_id: ScopeId) -> bool {
        self.active_scopes.contains(&scope_id)
    }

    /// The current, innermost active scope.
    pub fn current_scope(&self) -> Option<ScopeId> {
        self.active_scopes.last().copied()
    }
}

impl Default for ScopeBlockTraversal {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// Convenience wrappers: extract IdentifierIds from Places
// =============================================================================

/// Collect all lvalue IdentifierIds from an instruction.
/// Convenience wrapper around `each_instruction_lvalue` that maps to ids.
pub fn each_instruction_lvalue_ids(instr: &Instruction) -> Vec<IdentifierId> {
    each_instruction_lvalue(instr)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

/// Collect all operand IdentifierIds from an instruction.
/// Convenience wrapper around `each_instruction_operand` that maps to ids.
pub fn each_instruction_operand_ids(instr: &Instruction, env: &Environment) -> Vec<IdentifierId> {
    each_instruction_operand(instr, env)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

/// Collect all operand IdentifierIds from an instruction value.
/// Convenience wrapper around `each_instruction_value_operand` that maps to ids.
pub fn each_instruction_value_operand_ids(
    value: &InstructionValue,
    env: &Environment,
) -> Vec<IdentifierId> {
    each_instruction_value_operand(value, env)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

/// Collect all operand IdentifierIds from a terminal.
/// Convenience wrapper around `each_terminal_operand` that maps to ids.
pub fn each_terminal_operand_ids(terminal: &Terminal) -> Vec<IdentifierId> {
    each_terminal_operand(terminal)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

/// Collect all IdentifierIds from a pattern.
/// Convenience wrapper around `each_pattern_operand` that maps to ids.
pub fn each_pattern_operand_ids(pattern: &Pattern) -> Vec<IdentifierId> {
    each_pattern_operand(pattern)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

// =============================================================================
// In-place mutation variants (f(&mut Place) callbacks)
// =============================================================================
//
// These variants use `f(&mut Place)` instead of `f(Place) -> Place`, which is
// more natural for Rust in-place mutation patterns. They do NOT handle
// FunctionExpression/ObjectMethod context (since that requires env access).
// Callers that need to process inner function context should handle it
// separately, e.g.:
//
//   for_each_instruction_value_operand_mut(&mut instr.value, &mut |place| { ... });
//   if let InstructionValue::FunctionExpression { lowered_func, .. }
//       | InstructionValue::ObjectMethod { lowered_func, .. } = &mut instr.value {
//       let func = &mut env.functions[lowered_func.func.0 as usize];
//       for ctx in func.context.iter_mut() { ... }
//   }
//

/// In-place mutation of all operand places in an InstructionValue.
/// Does NOT handle FunctionExpression/ObjectMethod context — callers handle those separately.
pub fn for_each_instruction_value_operand_mut(
    value: &mut InstructionValue,
    f: &mut impl FnMut(&mut Place),
) {
    match value {
        InstructionValue::BinaryExpression { left, right, .. } => {
            f(left);
            f(right);
        }
        InstructionValue::PropertyLoad { object, .. }
        | InstructionValue::PropertyDelete { object, .. } => {
            f(object);
        }
        InstructionValue::PropertyStore {
            object, value: val, ..
        } => {
            f(object);
            f(val);
        }
        InstructionValue::ComputedLoad {
            object, property, ..
        }
        | InstructionValue::ComputedDelete {
            object, property, ..
        } => {
            f(object);
            f(property);
        }
        InstructionValue::ComputedStore {
            object,
            property,
            value: val,
            ..
        } => {
            f(object);
            f(property);
            f(val);
        }
        InstructionValue::DeclareContext { .. } | InstructionValue::DeclareLocal { .. } => {}
        InstructionValue::LoadLocal { place, .. } | InstructionValue::LoadContext { place, .. } => {
            f(place);
        }
        InstructionValue::StoreLocal { value: val, .. } => {
            f(val);
        }
        InstructionValue::StoreContext {
            lvalue, value: val, ..
        } => {
            f(&mut lvalue.place);
            f(val);
        }
        InstructionValue::StoreGlobal { value: val, .. } => {
            f(val);
        }
        InstructionValue::Destructure { value: val, .. } => {
            f(val);
        }
        InstructionValue::NewExpression { callee, args, .. }
        | InstructionValue::CallExpression { callee, args, .. } => {
            f(callee);
            for_each_call_argument_mut(args, f);
        }
        InstructionValue::MethodCall {
            receiver,
            property,
            args,
            ..
        } => {
            f(receiver);
            f(property);
            for_each_call_argument_mut(args, f);
        }
        InstructionValue::UnaryExpression { value: val, .. } => {
            f(val);
        }
        InstructionValue::JsxExpression {
            tag,
            props,
            children,
            ..
        } => {
            if let JsxTag::Place(place) = tag {
                f(place);
            }
            for attribute in props.iter_mut() {
                match attribute {
                    JsxAttribute::Attribute { place, .. } => f(place),
                    JsxAttribute::SpreadAttribute { argument, .. } => f(argument),
                }
            }
            if let Some(children) = children {
                for child in children.iter_mut() {
                    f(child);
                }
            }
        }
        InstructionValue::ObjectExpression { properties, .. } => {
            for property in properties.iter_mut() {
                match property {
                    ObjectPropertyOrSpread::Property(prop) => {
                        if let ObjectPropertyKey::Computed { name } = &mut prop.key {
                            f(name);
                        }
                        f(&mut prop.place);
                    }
                    ObjectPropertyOrSpread::Spread(spread) => {
                        f(&mut spread.place);
                    }
                }
            }
        }
        InstructionValue::ArrayExpression { elements, .. } => {
            for elem in elements.iter_mut() {
                match elem {
                    ArrayElement::Place(p) => f(p),
                    ArrayElement::Spread(s) => f(&mut s.place),
                    ArrayElement::Hole => {}
                }
            }
        }
        InstructionValue::JsxFragment { children, .. } => {
            for child in children.iter_mut() {
                f(child);
            }
        }
        InstructionValue::FunctionExpression { .. } | InstructionValue::ObjectMethod { .. } => {
            // Context places require env access — callers handle separately.
        }
        InstructionValue::TaggedTemplateExpression { tag, .. } => {
            f(tag);
        }
        InstructionValue::TypeCastExpression { value: val, .. }
        | InstructionValue::NonNullExpression { value: val, .. } => {
            f(val);
        }
        InstructionValue::TemplateLiteral { subexprs, .. } => {
            for expr in subexprs.iter_mut() {
                f(expr);
            }
        }
        InstructionValue::Await { value: val, .. } => {
            f(val);
        }
        InstructionValue::GetIterator { collection, .. } => {
            f(collection);
        }
        InstructionValue::IteratorNext {
            iterator,
            collection,
            ..
        } => {
            f(iterator);
            f(collection);
        }
        InstructionValue::NextPropertyOf { value: val, .. } => {
            f(val);
        }
        InstructionValue::PostfixUpdate { value: val, .. }
        | InstructionValue::PrefixUpdate { value: val, .. } => {
            f(val);
        }
        InstructionValue::StartMemoize { deps, .. } => {
            if let Some(deps) = deps {
                for dep in deps.iter_mut() {
                    if let ManualMemoDependencyRoot::NamedLocal { value, .. } = &mut dep.root {
                        f(value);
                    }
                }
            }
        }
        InstructionValue::FinishMemoize { decl, .. } => {
            f(decl);
        }
        InstructionValue::Debugger { .. }
        | InstructionValue::RegExpLiteral { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::LoadGlobal { .. }
        | InstructionValue::UnsupportedNode { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::JSXText { .. } => {}
    }
}

/// In-place mutation of call arguments.
pub fn for_each_call_argument_mut(args: &mut [PlaceOrSpread], f: &mut impl FnMut(&mut Place)) {
    for arg in args.iter_mut() {
        match arg {
            PlaceOrSpread::Place(place) => f(place),
            PlaceOrSpread::Spread(spread) => f(&mut spread.place),
        }
    }
}

/// In-place mutation of an InstructionValue's lvalues (DeclareLocal, StoreLocal, DeclareContext,
/// StoreContext, Destructure, PostfixUpdate, PrefixUpdate). Does NOT include the instruction's
/// top-level lvalue — use `for_each_instruction_lvalue_mut` for that.
pub fn for_each_instruction_value_lvalue_mut(
    value: &mut InstructionValue,
    f: &mut impl FnMut(&mut Place),
) {
    match value {
        InstructionValue::DeclareContext { lvalue, .. }
        | InstructionValue::StoreContext { lvalue, .. }
        | InstructionValue::DeclareLocal { lvalue, .. }
        | InstructionValue::StoreLocal { lvalue, .. } => {
            f(&mut lvalue.place);
        }
        InstructionValue::Destructure { lvalue, .. } => {
            for_each_pattern_operand_mut(&mut lvalue.pattern, f);
        }
        InstructionValue::PostfixUpdate { lvalue, .. }
        | InstructionValue::PrefixUpdate { lvalue, .. } => {
            f(lvalue);
        }
        _ => {}
    }
}

/// In-place mutation of the instruction's lvalue and value's lvalues.
/// Matches the same variants as TS `mapInstructionLValues` (skips DeclareContext/StoreContext).
pub fn for_each_instruction_lvalue_mut(instr: &mut Instruction, f: &mut impl FnMut(&mut Place)) {
    match &mut instr.value {
        InstructionValue::DeclareLocal { lvalue, .. }
        | InstructionValue::StoreLocal { lvalue, .. } => {
            f(&mut lvalue.place);
        }
        InstructionValue::Destructure { lvalue, .. } => {
            for_each_pattern_operand_mut(&mut lvalue.pattern, f);
        }
        InstructionValue::PostfixUpdate { lvalue, .. }
        | InstructionValue::PrefixUpdate { lvalue, .. } => {
            f(lvalue);
        }
        _ => {}
    }
    f(&mut instr.lvalue);
}

/// In-place mutation of pattern operands.
pub fn for_each_pattern_operand_mut(pattern: &mut Pattern, f: &mut impl FnMut(&mut Place)) {
    match pattern {
        Pattern::Array(arr) => {
            for item in arr.items.iter_mut() {
                match item {
                    ArrayPatternElement::Place(p) => f(p),
                    ArrayPatternElement::Spread(s) => f(&mut s.place),
                    ArrayPatternElement::Hole => {}
                }
            }
        }
        Pattern::Object(obj) => {
            for property in obj.properties.iter_mut() {
                match property {
                    ObjectPropertyOrSpread::Property(prop) => f(&mut prop.place),
                    ObjectPropertyOrSpread::Spread(spread) => f(&mut spread.place),
                }
            }
        }
    }
}

/// In-place mutation of terminal operand places.
pub fn for_each_terminal_operand_mut(terminal: &mut Terminal, f: &mut impl FnMut(&mut Place)) {
    match terminal {
        Terminal::If { test, .. } | Terminal::Branch { test, .. } => {
            f(test);
        }
        Terminal::Switch { test, cases, .. } => {
            f(test);
            for case in cases.iter_mut() {
                if let Some(t) = &mut case.test {
                    f(t);
                }
            }
        }
        Terminal::Return { value, .. } | Terminal::Throw { value, .. } => {
            f(value);
        }
        Terminal::Try {
            handler_binding, ..
        } => {
            if let Some(binding) = handler_binding {
                f(binding);
            }
        }
        Terminal::MaybeThrow { .. }
        | Terminal::Sequence { .. }
        | Terminal::Label { .. }
        | Terminal::Optional { .. }
        | Terminal::Ternary { .. }
        | Terminal::Logical { .. }
        | Terminal::DoWhile { .. }
        | Terminal::While { .. }
        | Terminal::For { .. }
        | Terminal::ForOf { .. }
        | Terminal::ForIn { .. }
        | Terminal::Goto { .. }
        | Terminal::Unreachable { .. }
        | Terminal::Unsupported { .. }
        | Terminal::Scope { .. }
        | Terminal::PrunedScope { .. } => {}
    }
}

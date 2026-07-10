// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Converts `MethodCall` instructions on props objects into `CallExpression`
//! instructions.
//!
//! When the receiver of a method call is typed as the component's props object,
//! we can safely convert the method call `props.foo(args)` into a direct call
//! `foo(args)` using the property as the callee. This simplifies downstream
//! analysis by removing the receiver dependency.
//!
//! Analogous to TS `Optimization/OptimizePropsMethodCalls.ts`.

use react_compiler_hir::environment::Environment;
use react_compiler_hir::{HirFunction, InstructionValue, is_props_type};

pub fn optimize_props_method_calls(func: &mut HirFunction, env: &Environment) {
    for (_block_id, block) in &func.body.blocks {
        let instruction_ids: Vec<_> = block.instructions.clone();
        for instr_id in instruction_ids {
            let instr = &mut func.instructions[instr_id.0 as usize];
            let should_replace = matches!(
                &instr.value,
                InstructionValue::MethodCall { receiver, .. }
                    if {
                        let identifier = &env.identifiers[receiver.identifier.0 as usize];
                        let ty = &env.types[identifier.type_.0 as usize];
                        is_props_type(ty)
                    }
            );
            if should_replace {
                // Take the old value out, replacing with a temporary.
                // The if-let is guaranteed to match since we checked above.
                let old =
                    std::mem::replace(&mut instr.value, InstructionValue::Debugger { loc: None });
                match old {
                    InstructionValue::MethodCall {
                        property,
                        args,
                        loc,
                        ..
                    } => {
                        instr.value = InstructionValue::CallExpression {
                            callee: property,
                            args,
                            loc,
                        };
                    }
                    _ => unreachable!(),
                }
            }
        }
    }
}

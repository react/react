// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! ExtractScopeDeclarationsFromDestructuring — handles destructuring patterns
//! where some bindings are scope declarations and others aren't.
//!
//! Corresponds to `src/ReactiveScopes/ExtractScopeDeclarationsFromDestructuring.ts`.

use std::collections::HashSet;

use react_compiler_hir::{
    DeclarationId, IdentifierId, IdentifierName, InstructionKind, InstructionValue, LValue,
    ParamPattern, Place, ReactiveFunction, ReactiveInstruction, ReactiveScopeBlock,
    ReactiveStatement, ReactiveValue, environment::Environment, visitors,
};

use crate::visitors::{ReactiveFunctionTransform, Transformed, transform_reactive_function};

// =============================================================================
// Public entry point
// =============================================================================

/// Extracts scope declarations from destructuring patterns where some bindings
/// are scope declarations and others aren't.
/// TS: `extractScopeDeclarationsFromDestructuring`
pub fn extract_scope_declarations_from_destructuring(
    func: &mut ReactiveFunction,
    env: &mut Environment,
) -> Result<(), react_compiler_diagnostics::CompilerError> {
    let mut declared: HashSet<DeclarationId> = HashSet::new();
    for param in &func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(s) => &s.place,
        };
        let identifier = &env.identifiers[place.identifier.0 as usize];
        declared.insert(identifier.declaration_id);
    }
    let mut transform = Transform { env };
    let mut state = ExtractState { declared };
    transform_reactive_function(func, &mut transform, &mut state)
}

struct ExtractState {
    declared: HashSet<DeclarationId>,
}

struct Transform<'a> {
    env: &'a mut Environment,
}

impl<'a> ReactiveFunctionTransform for Transform<'a> {
    type State = ExtractState;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut ExtractState,
    ) -> Result<(), react_compiler_diagnostics::CompilerError> {
        let scope_data = &self.env.scopes[scope.scope.0 as usize];
        let decl_ids: Vec<DeclarationId> = scope_data
            .declarations
            .iter()
            .map(|(_, d)| {
                let identifier = &self.env.identifiers[d.identifier.0 as usize];
                identifier.declaration_id
            })
            .collect();
        for decl_id in decl_ids {
            state.declared.insert(decl_id);
        }
        self.traverse_scope(scope, state)
    }

    fn transform_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        state: &mut ExtractState,
    ) -> Result<Transformed<ReactiveStatement>, react_compiler_diagnostics::CompilerError> {
        self.visit_instruction(instruction, state)?;

        let mut extra_instructions: Option<Vec<ReactiveInstruction>> = None;

        if let ReactiveValue::Instruction(InstructionValue::Destructure {
            lvalue,
            value: _destr_value,
            loc,
        }) = &mut instruction.value
        {
            // Check if this is a mixed destructuring (some declared, some not)
            let mut reassigned: HashSet<IdentifierId> = HashSet::new();
            let mut has_declaration = false;

            for place in visitors::each_pattern_operand(&lvalue.pattern) {
                let identifier = &self.env.identifiers[place.identifier.0 as usize];
                if state.declared.contains(&identifier.declaration_id) {
                    reassigned.insert(place.identifier);
                } else {
                    has_declaration = true;
                }
            }

            if !has_declaration {
                // All reassignments
                lvalue.kind = InstructionKind::Reassign;
            } else if !reassigned.is_empty() {
                // Mixed: replace reassigned items with temporaries and emit separate assignments
                let mut renamed: Vec<(Place, Place)> = Vec::new();
                let instr_loc = instruction.loc.clone();
                let destr_loc = loc.clone();

                let env = &mut *self.env; // reborrow
                visitors::map_pattern_operands(&mut lvalue.pattern, &mut |place: Place| {
                    if !reassigned.contains(&place.identifier) {
                        return place;
                    }
                    // Create a temporary place (matches TS clonePlaceToTemporary)
                    let temp_id = env.next_identifier_id();
                    let decl_id = env.identifiers[temp_id.0 as usize].declaration_id;
                    // Copy type from original identifier to temporary
                    let original_type = env.identifiers[place.identifier.0 as usize].type_;
                    env.identifiers[temp_id.0 as usize].type_ = original_type;
                    // Set identifier loc to the place's source location
                    // (matches TS makeTemporaryIdentifier which receives place.loc)
                    env.identifiers[temp_id.0 as usize].loc = place.loc.clone();
                    // Promote the temporary
                    env.identifiers[temp_id.0 as usize].name =
                        Some(IdentifierName::Promoted(format!("#t{}", decl_id.0)));
                    let temporary = Place {
                        identifier: temp_id,
                        effect: place.effect,
                        reactive: place.reactive,
                        loc: None, // GeneratedSource — matches TS createTemporaryPlace
                    };
                    let original = place;
                    renamed.push((original.clone(), temporary.clone()));
                    temporary
                });

                // Build extra StoreLocal instructions for each renamed place
                let mut extra = Vec::new();
                for (original, temporary) in renamed {
                    extra.push(ReactiveInstruction {
                        id: instruction.id,
                        lvalue: None,
                        value: ReactiveValue::Instruction(InstructionValue::StoreLocal {
                            lvalue: LValue {
                                kind: InstructionKind::Reassign,
                                place: original,
                            },
                            value: temporary,
                            type_annotation: None,
                            loc: destr_loc.clone(),
                        }),
                        effects: None,
                        loc: instr_loc.clone(),
                    });
                }
                extra_instructions = Some(extra);
            }
        }

        // Update state.declared with declarations from the instruction(s)
        if let Some(ref extras) = extra_instructions {
            // Process the original instruction
            update_declared_from_instruction(instruction, &self.env, state);
            // Process extra instructions
            for extra_instr in extras {
                update_declared_from_instruction(extra_instr, &self.env, state);
            }
        } else {
            update_declared_from_instruction(instruction, &self.env, state);
        }

        if let Some(extras) = extra_instructions {
            // Clone the original instruction and build the replacement list
            let mut all_instructions = Vec::new();
            all_instructions.push(ReactiveStatement::Instruction(instruction.clone()));
            for extra in extras {
                all_instructions.push(ReactiveStatement::Instruction(extra));
            }
            Ok(Transformed::ReplaceMany(all_instructions))
        } else {
            Ok(Transformed::Keep)
        }
    }
}

fn update_declared_from_instruction(
    instr: &ReactiveInstruction,
    env: &Environment,
    state: &mut ExtractState,
) {
    if let ReactiveValue::Instruction(iv) = &instr.value {
        match iv {
            InstructionValue::DeclareContext { lvalue, .. }
            | InstructionValue::StoreContext { lvalue, .. }
            | InstructionValue::DeclareLocal { lvalue, .. }
            | InstructionValue::StoreLocal { lvalue, .. } => {
                if lvalue.kind != InstructionKind::Reassign {
                    let identifier = &env.identifiers[lvalue.place.identifier.0 as usize];
                    state.declared.insert(identifier.declaration_id);
                }
            }
            InstructionValue::Destructure { lvalue, .. } => {
                if lvalue.kind != InstructionKind::Reassign {
                    for place in visitors::each_pattern_operand(&lvalue.pattern) {
                        let identifier = &env.identifiers[place.identifier.0 as usize];
                        state.declared.insert(identifier.declaration_id);
                    }
                }
            }
            _ => {}
        }
    }
}

// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! PruneNonEscapingScopes — prunes reactive scopes that are not necessary
//! to bound downstream computation.
//!
//! Corresponds to `src/ReactiveScopes/PruneNonEscapingScopes.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use indexmap::IndexSet;
use react_compiler_hir::ArrayPatternElement;
use react_compiler_hir::DeclarationId;
use react_compiler_hir::Effect;
use react_compiler_hir::EvaluationOrder;
use react_compiler_hir::IdentifierId;
use react_compiler_hir::InstructionKind;
use react_compiler_hir::InstructionValue;
use react_compiler_hir::JsxAttribute;
use react_compiler_hir::JsxTag;
use react_compiler_hir::ObjectPropertyOrSpread;
use react_compiler_hir::Pattern;
use react_compiler_hir::Place;
use react_compiler_hir::PlaceOrSpread;
use react_compiler_hir::ReactiveFunction;
use react_compiler_hir::ReactiveInstruction;
use react_compiler_hir::ReactiveScopeBlock;
use react_compiler_hir::ReactiveStatement;
use react_compiler_hir::ReactiveTerminal;
use react_compiler_hir::ReactiveTerminalStatement;
use react_compiler_hir::ReactiveValue;
use react_compiler_hir::ScopeId;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::each_instruction_value_operand;

use crate::visitors::ReactiveFunctionTransform;
use crate::visitors::ReactiveFunctionVisitor;
use crate::visitors::Transformed;
use crate::visitors::transform_reactive_function;
use crate::visitors::visit_reactive_function;

// =============================================================================
// Public entry point
// =============================================================================

/// Prunes reactive scopes whose outputs don't escape.
/// TS: `pruneNonEscapingScopes`
pub fn prune_non_escaping_scopes(
    func: &mut ReactiveFunction,
    env: &mut Environment,
) -> Result<(), react_compiler_diagnostics::CompilerError> {
    // First build up a map of which instructions are involved in creating which values,
    // and which values are returned.
    let mut state = CollectState::new();
    for param in &func.params {
        let place = match param {
            react_compiler_hir::ParamPattern::Place(p) => p,
            react_compiler_hir::ParamPattern::Spread(s) => &s.place,
        };
        let identifier = &env.identifiers[place.identifier.0 as usize];
        state.declare(identifier.declaration_id);
    }
    let visitor = CollectDependenciesVisitor::new(env);
    let mut visitor_state = (state, Vec::<ScopeId>::new());
    visit_reactive_function(func, &visitor, &mut visitor_state);
    let (state, _) = visitor_state;

    // Then walk outward from the returned values and find all captured operands.
    let memoized = compute_memoized_identifiers(&state);

    // Prune scopes that do not declare/reassign any escaping values
    let mut transform = PruneScopesTransform {
        env,
        pruned_scopes: HashSet::new(),
        reassignments: HashMap::new(),
    };
    let mut memoized_state = memoized;
    transform_reactive_function(func, &mut transform, &mut memoized_state)
}

// =============================================================================
// MemoizationLevel
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MemoizationLevel {
    /// The value should be memoized if it escapes
    Memoized,
    /// Values that are memoized if their dependencies are memoized
    Conditional,
    /// Values that cannot be compared with Object.is, but which by default don't need to be memoized
    Unmemoized,
    /// The value will never be memoized: used for values that can be cheaply compared w Object.is
    Never,
}

/// Given an identifier that appears as an lvalue multiple times with different memoization levels,
/// determines the final memoization level.
fn join_aliases(kind1: MemoizationLevel, kind2: MemoizationLevel) -> MemoizationLevel {
    if kind1 == MemoizationLevel::Memoized || kind2 == MemoizationLevel::Memoized {
        MemoizationLevel::Memoized
    } else if kind1 == MemoizationLevel::Conditional || kind2 == MemoizationLevel::Conditional {
        MemoizationLevel::Conditional
    } else if kind1 == MemoizationLevel::Unmemoized || kind2 == MemoizationLevel::Unmemoized {
        MemoizationLevel::Unmemoized
    } else {
        MemoizationLevel::Never
    }
}

// =============================================================================
// Graph nodes
// =============================================================================

/// A node in the graph describing the memoization level of a given identifier
/// as well as its dependencies and scopes.
struct IdentifierNode {
    level: MemoizationLevel,
    memoized: bool,
    dependencies: IndexSet<DeclarationId>,
    scopes: IndexSet<ScopeId>,
    seen: bool,
}

/// A scope node describing its dependencies.
struct ScopeNode {
    dependencies: Vec<DeclarationId>,
    seen: bool,
}

// =============================================================================
// CollectState (TS: State class)
// =============================================================================

struct CollectState {
    /// Maps lvalues for LoadLocal to the identifier being loaded, to resolve indirections.
    definitions: HashMap<DeclarationId, DeclarationId>,
    identifiers: HashMap<DeclarationId, IdentifierNode>,
    scopes: HashMap<ScopeId, ScopeNode>,
    escaping_values: IndexSet<DeclarationId>,
}

impl CollectState {
    fn new() -> Self {
        CollectState {
            definitions: HashMap::new(),
            identifiers: HashMap::new(),
            scopes: HashMap::new(),
            escaping_values: IndexSet::new(),
        }
    }

    /// Declare a new identifier, used for function id and params.
    fn declare(&mut self, id: DeclarationId) {
        self.identifiers.insert(
            id,
            IdentifierNode {
                level: MemoizationLevel::Never,
                memoized: false,
                dependencies: IndexSet::new(),
                scopes: IndexSet::new(),
                seen: false,
            },
        );
    }

    /// Associates the identifier with its scope, if there is one and it is active for
    /// the given instruction id.
    fn visit_operand(
        &mut self,
        env: &Environment,
        id: EvaluationOrder,
        place: &Place,
        identifier: DeclarationId,
    ) {
        if let Some(scope_id) = get_place_scope(env, id, place.identifier) {
            let node = self.scopes.entry(scope_id).or_insert_with(|| {
                let scope_data = &env.scopes[scope_id.0 as usize];
                let dependencies = scope_data
                    .dependencies
                    .iter()
                    .map(|dep| env.identifiers[dep.identifier.0 as usize].declaration_id)
                    .collect();
                ScopeNode {
                    dependencies,
                    seen: false,
                }
            });
            // Avoid unused variable warning — we needed the entry to exist
            let _ = node;
            let identifier_node = self
                .identifiers
                .get_mut(&identifier)
                .expect("Expected identifier to be initialized");
            identifier_node.scopes.insert(scope_id);
        }
    }

    /// Resolve an identifier through definitions (LoadLocal indirections).
    fn resolve(&self, id: DeclarationId) -> DeclarationId {
        self.definitions.get(&id).copied().unwrap_or(id)
    }
}

// =============================================================================
// MemoizationOptions
// =============================================================================

struct MemoizationOptions {
    memoize_jsx_elements: bool,
    force_memoize_primitives: bool,
}

// =============================================================================
// LValueMemoization
// =============================================================================

struct LValueMemoization {
    place_identifier: IdentifierId,
    level: MemoizationLevel,
}

// =============================================================================
// Helper: get_place_scope
// =============================================================================

fn get_place_scope(
    env: &Environment,
    id: EvaluationOrder,
    identifier_id: IdentifierId,
) -> Option<ScopeId> {
    let scope_id = env.identifiers[identifier_id.0 as usize].scope?;
    if env.scopes[scope_id.0 as usize].range.contains(id) {
        Some(scope_id)
    } else {
        None
    }
}

// =============================================================================
// Helper: get_function_call_signature (for noAlias check)
// =============================================================================

// =============================================================================
// Helper: compute pattern lvalues
// =============================================================================

fn compute_pattern_lvalues(pattern: &Pattern) -> Vec<LValueMemoization> {
    let mut lvalues = Vec::new();
    match pattern {
        Pattern::Array(array_pattern) => {
            for item in &array_pattern.items {
                match item {
                    ArrayPatternElement::Place(place) => {
                        lvalues.push(LValueMemoization {
                            place_identifier: place.identifier,
                            level: MemoizationLevel::Conditional,
                        });
                    }
                    ArrayPatternElement::Spread(spread) => {
                        lvalues.push(LValueMemoization {
                            place_identifier: spread.place.identifier,
                            level: MemoizationLevel::Memoized,
                        });
                    }
                    ArrayPatternElement::Hole => {}
                }
            }
        }
        Pattern::Object(object_pattern) => {
            for property in &object_pattern.properties {
                match property {
                    ObjectPropertyOrSpread::Property(prop) => {
                        lvalues.push(LValueMemoization {
                            place_identifier: prop.place.identifier,
                            level: MemoizationLevel::Conditional,
                        });
                    }
                    ObjectPropertyOrSpread::Spread(spread) => {
                        lvalues.push(LValueMemoization {
                            place_identifier: spread.place.identifier,
                            level: MemoizationLevel::Memoized,
                        });
                    }
                }
            }
        }
    }
    lvalues
}

// =============================================================================
// CollectDependenciesVisitor
// =============================================================================

struct CollectDependenciesVisitor<'a> {
    env: &'a Environment,
    options: MemoizationOptions,
}

impl<'a> CollectDependenciesVisitor<'a> {
    fn new(env: &'a Environment) -> Self {
        CollectDependenciesVisitor {
            env,
            options: MemoizationOptions {
                memoize_jsx_elements: !env.config.enable_forest,
                force_memoize_primitives: env.config.enable_forest
                    || env.enable_preserve_existing_memoization_guarantees,
            },
        }
    }

    /// Given a value, returns a description of how it should be memoized.
    fn compute_memoization_inputs(
        &self,
        id: EvaluationOrder,
        value: &ReactiveValue,
        lvalue: Option<IdentifierId>,
        state: &mut CollectState,
    ) -> (Vec<LValueMemoization>, Vec<(IdentifierId, EvaluationOrder)>) {
        match value {
            ReactiveValue::ConditionalExpression {
                consequent,
                alternate,
                ..
            } => {
                let (_, cons_rvalues) =
                    self.compute_memoization_inputs(id, consequent, None, state);
                let (_, alt_rvalues) = self.compute_memoization_inputs(id, alternate, None, state);
                let mut rvalues = cons_rvalues;
                rvalues.extend(alt_rvalues);
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, rvalues)
            }
            ReactiveValue::LogicalExpression { left, right, .. } => {
                let (_, left_rvalues) = self.compute_memoization_inputs(id, left, None, state);
                let (_, right_rvalues) = self.compute_memoization_inputs(id, right, None, state);
                let mut rvalues = left_rvalues;
                rvalues.extend(right_rvalues);
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, rvalues)
            }
            ReactiveValue::SequenceExpression {
                instructions,
                value: inner,
                ..
            } => {
                for instr in instructions {
                    self.visit_value_for_memoization(
                        instr.id,
                        &instr.value,
                        instr.lvalue.as_ref().map(|lv| lv.identifier),
                        state,
                    );
                }
                let (_, rvalues) = self.compute_memoization_inputs(id, inner, None, state);
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, rvalues)
            }
            ReactiveValue::OptionalExpression { value: inner, .. } => {
                let (_, rvalues) = self.compute_memoization_inputs(id, inner, None, state);
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, rvalues)
            }
            ReactiveValue::Instruction(instr_value) => {
                self.compute_instruction_memoization_inputs(id, instr_value, lvalue)
            }
        }
    }

    /// Compute memoization inputs for an InstructionValue.
    fn compute_instruction_memoization_inputs(
        &self,
        id: EvaluationOrder,
        value: &InstructionValue,
        lvalue: Option<IdentifierId>,
    ) -> (Vec<LValueMemoization>, Vec<(IdentifierId, EvaluationOrder)>) {
        let env = self.env;
        let options = &self.options;

        match value {
            InstructionValue::JsxExpression {
                tag,
                props,
                children,
                ..
            } => {
                let mut rvalues: Vec<(IdentifierId, EvaluationOrder)> = Vec::new();
                if let JsxTag::Place(place) = tag {
                    rvalues.push((place.identifier, id));
                }
                for prop in props {
                    match prop {
                        JsxAttribute::Attribute { place, .. } => {
                            rvalues.push((place.identifier, id));
                        }
                        JsxAttribute::SpreadAttribute { argument, .. } => {
                            rvalues.push((argument.identifier, id));
                        }
                    }
                }
                if let Some(children) = children {
                    for child in children {
                        rvalues.push((child.identifier, id));
                    }
                }
                let level = if options.memoize_jsx_elements {
                    MemoizationLevel::Memoized
                } else {
                    MemoizationLevel::Unmemoized
                };
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level,
                    }]
                } else {
                    vec![]
                };
                (lvalues, rvalues)
            }
            InstructionValue::JsxFragment { children, .. } => {
                let level = if options.memoize_jsx_elements {
                    MemoizationLevel::Memoized
                } else {
                    MemoizationLevel::Unmemoized
                };
                let rvalues: Vec<(IdentifierId, EvaluationOrder)> =
                    children.iter().map(|c| (c.identifier, id)).collect();
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level,
                    }]
                } else {
                    vec![]
                };
                (lvalues, rvalues)
            }
            InstructionValue::NextPropertyOf { .. }
            | InstructionValue::StartMemoize { .. }
            | InstructionValue::FinishMemoize { .. }
            | InstructionValue::Debugger { .. }
            | InstructionValue::ComputedDelete { .. }
            | InstructionValue::PropertyDelete { .. }
            | InstructionValue::LoadGlobal { .. }
            | InstructionValue::MetaProperty { .. }
            | InstructionValue::TemplateLiteral { .. }
            | InstructionValue::Primitive { .. }
            | InstructionValue::JSXText { .. }
            | InstructionValue::BinaryExpression { .. }
            | InstructionValue::UnaryExpression { .. } => {
                if options.force_memoize_primitives {
                    let level = MemoizationLevel::Conditional;
                    let operands = each_instruction_value_operand(value, env);
                    let rvalues: Vec<(IdentifierId, EvaluationOrder)> =
                        operands.iter().map(|p| (p.identifier, id)).collect();
                    let lvalues = if let Some(lv) = lvalue {
                        vec![LValueMemoization {
                            place_identifier: lv,
                            level,
                        }]
                    } else {
                        vec![]
                    };
                    (lvalues, rvalues)
                } else {
                    let level = MemoizationLevel::Never;
                    let lvalues = if let Some(lv) = lvalue {
                        vec![LValueMemoization {
                            place_identifier: lv,
                            level,
                        }]
                    } else {
                        vec![]
                    };
                    (lvalues, vec![])
                }
            }
            InstructionValue::Await { value: inner, .. }
            | InstructionValue::TypeCastExpression { value: inner, .. } => {
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, vec![(inner.identifier, id)])
            }
            InstructionValue::IteratorNext {
                iterator,
                collection,
                ..
            } => {
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (
                    lvalues,
                    vec![(iterator.identifier, id), (collection.identifier, id)],
                )
            }
            InstructionValue::GetIterator { collection, .. } => {
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, vec![(collection.identifier, id)])
            }
            InstructionValue::LoadLocal { place, .. } => {
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, vec![(place.identifier, id)])
            }
            InstructionValue::LoadContext { place, .. } => {
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    }]
                } else {
                    vec![]
                };
                (lvalues, vec![(place.identifier, id)])
            }
            InstructionValue::DeclareContext {
                lvalue: decl_lvalue,
                ..
            } => {
                let mut lvalues = vec![LValueMemoization {
                    place_identifier: decl_lvalue.place.identifier,
                    level: MemoizationLevel::Memoized,
                }];
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Unmemoized,
                    });
                }
                (lvalues, vec![])
            }
            InstructionValue::DeclareLocal {
                lvalue: decl_lvalue,
                ..
            } => {
                let mut lvalues = vec![LValueMemoization {
                    place_identifier: decl_lvalue.place.identifier,
                    level: MemoizationLevel::Unmemoized,
                }];
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Unmemoized,
                    });
                }
                (lvalues, vec![])
            }
            InstructionValue::PrefixUpdate {
                lvalue: upd_lvalue,
                value: upd_value,
                ..
            }
            | InstructionValue::PostfixUpdate {
                lvalue: upd_lvalue,
                value: upd_value,
                ..
            } => {
                let mut lvalues = vec![LValueMemoization {
                    place_identifier: upd_lvalue.identifier,
                    level: MemoizationLevel::Conditional,
                }];
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    });
                }
                (lvalues, vec![(upd_value.identifier, id)])
            }
            InstructionValue::StoreLocal {
                lvalue: store_lvalue,
                value: store_value,
                ..
            } => {
                let mut lvalues = vec![LValueMemoization {
                    place_identifier: store_lvalue.place.identifier,
                    level: MemoizationLevel::Conditional,
                }];
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    });
                }
                (lvalues, vec![(store_value.identifier, id)])
            }
            InstructionValue::StoreContext {
                lvalue: store_lvalue,
                value: store_value,
                ..
            } => {
                let mut lvalues = vec![LValueMemoization {
                    place_identifier: store_lvalue.place.identifier,
                    level: MemoizationLevel::Memoized,
                }];
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    });
                }
                (lvalues, vec![(store_value.identifier, id)])
            }
            InstructionValue::StoreGlobal {
                value: store_value, ..
            } => {
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Unmemoized,
                    }]
                } else {
                    vec![]
                };
                (lvalues, vec![(store_value.identifier, id)])
            }
            InstructionValue::Destructure {
                lvalue: dest_lvalue,
                value: dest_value,
                ..
            } => {
                let mut lvalues = Vec::new();
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    });
                }
                lvalues.extend(compute_pattern_lvalues(&dest_lvalue.pattern));
                (lvalues, vec![(dest_value.identifier, id)])
            }
            InstructionValue::ComputedLoad { object, .. }
            | InstructionValue::PropertyLoad { object, .. } => {
                let level = MemoizationLevel::Conditional;
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level,
                    }]
                } else {
                    vec![]
                };
                (lvalues, vec![(object.identifier, id)])
            }
            InstructionValue::ComputedStore {
                object,
                value: store_value,
                ..
            } => {
                let mut lvalues = vec![LValueMemoization {
                    place_identifier: object.identifier,
                    level: MemoizationLevel::Conditional,
                }];
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Conditional,
                    });
                }
                (lvalues, vec![(store_value.identifier, id)])
            }
            InstructionValue::TaggedTemplateExpression { tag, .. } => {
                let no_alias = env.has_no_alias_signature(tag.identifier);
                let mut lvalues = Vec::new();
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Memoized,
                    });
                }
                if no_alias {
                    return (lvalues, vec![]);
                }
                let operands = each_instruction_value_operand(value, env);
                for op in &operands {
                    if op.effect.is_mutable() {
                        lvalues.push(LValueMemoization {
                            place_identifier: op.identifier,
                            level: MemoizationLevel::Memoized,
                        });
                    }
                }
                let rvalues: Vec<(IdentifierId, EvaluationOrder)> =
                    operands.iter().map(|p| (p.identifier, id)).collect();
                (lvalues, rvalues)
            }
            InstructionValue::CallExpression { callee, .. } => {
                let no_alias = env.has_no_alias_signature(callee.identifier);
                let mut lvalues = Vec::new();
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Memoized,
                    });
                }
                if no_alias {
                    return (lvalues, vec![]);
                }
                let operands = each_instruction_value_operand(value, env);
                for op in &operands {
                    if op.effect.is_mutable() {
                        lvalues.push(LValueMemoization {
                            place_identifier: op.identifier,
                            level: MemoizationLevel::Memoized,
                        });
                    }
                }
                let rvalues: Vec<(IdentifierId, EvaluationOrder)> =
                    operands.iter().map(|p| (p.identifier, id)).collect();
                (lvalues, rvalues)
            }
            InstructionValue::MethodCall { property, .. } => {
                let no_alias = env.has_no_alias_signature(property.identifier);
                let mut lvalues = Vec::new();
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Memoized,
                    });
                }
                if no_alias {
                    return (lvalues, vec![]);
                }
                let operands = each_instruction_value_operand(value, env);
                for op in &operands {
                    if op.effect.is_mutable() {
                        lvalues.push(LValueMemoization {
                            place_identifier: op.identifier,
                            level: MemoizationLevel::Memoized,
                        });
                    }
                }
                let rvalues: Vec<(IdentifierId, EvaluationOrder)> =
                    operands.iter().map(|p| (p.identifier, id)).collect();
                (lvalues, rvalues)
            }
            InstructionValue::RegExpLiteral { .. }
            | InstructionValue::ArrayExpression { .. }
            | InstructionValue::NewExpression { .. }
            | InstructionValue::ObjectExpression { .. }
            | InstructionValue::PropertyStore { .. } => {
                let operands = each_instruction_value_operand(value, env);
                let mut lvalues: Vec<LValueMemoization> = operands
                    .iter()
                    .filter(|op| op.effect.is_mutable())
                    .map(|op| LValueMemoization {
                        place_identifier: op.identifier,
                        level: MemoizationLevel::Memoized,
                    })
                    .collect();
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Memoized,
                    });
                }
                let rvalues: Vec<(IdentifierId, EvaluationOrder)> =
                    operands.iter().map(|p| (p.identifier, id)).collect();
                (lvalues, rvalues)
            }
            InstructionValue::ObjectMethod { .. } | InstructionValue::FunctionExpression { .. } => {
                // The canonical each_instruction_value_operand already includes context
                // (captured variables) for FunctionExpression/ObjectMethod.
                let operands = each_instruction_value_operand(value, env);
                let mut lvalues: Vec<LValueMemoization> = operands
                    .iter()
                    .filter(|op| op.effect.is_mutable())
                    .map(|op| LValueMemoization {
                        place_identifier: op.identifier,
                        level: MemoizationLevel::Memoized,
                    })
                    .collect();
                if let Some(lv) = lvalue {
                    lvalues.push(LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Memoized,
                    });
                }
                let rvalues: Vec<(IdentifierId, EvaluationOrder)> =
                    operands.iter().map(|p| (p.identifier, id)).collect();
                (lvalues, rvalues)
            }
            InstructionValue::UnsupportedNode { .. } => {
                let lvalues = if let Some(lv) = lvalue {
                    vec![LValueMemoization {
                        place_identifier: lv,
                        level: MemoizationLevel::Never,
                    }]
                } else {
                    vec![]
                };
                (lvalues, vec![])
            }
        }
    }

    fn visit_value_for_memoization(
        &self,
        id: EvaluationOrder,
        value: &ReactiveValue,
        lvalue: Option<IdentifierId>,
        state: &mut CollectState,
    ) {
        let env = self.env;
        // Determine the level of memoization for this value and the lvalues/rvalues
        let (aliasing_lvalues, aliasing_rvalues) =
            self.compute_memoization_inputs(id, value, lvalue, state);

        // Associate all the rvalues with the instruction's scope if it has one
        // We need to collect rvalue data first to avoid borrow issues
        let rvalue_data: Vec<(IdentifierId, DeclarationId)> = aliasing_rvalues
            .iter()
            .map(|(identifier_id, _)| {
                let decl_id = env.identifiers[identifier_id.0 as usize].declaration_id;
                let operand_id = state.resolve(decl_id);
                (*identifier_id, operand_id)
            })
            .collect();

        for (identifier_id, operand_id) in &rvalue_data {
            // Build the Place data needed for get_place_scope
            state.visit_operand(
                env,
                id,
                &Place {
                    identifier: *identifier_id,
                    effect: Effect::Read,
                    reactive: false,
                    loc: None,
                },
                *operand_id,
            );
        }

        // Add the operands as dependencies of all lvalues
        for lv in &aliasing_lvalues {
            let lvalue_decl_id = env.identifiers[lv.place_identifier.0 as usize].declaration_id;
            let lvalue_id = state.resolve(lvalue_decl_id);
            let node = state
                .identifiers
                .entry(lvalue_id)
                .or_insert_with(|| IdentifierNode {
                    level: MemoizationLevel::Never,
                    memoized: false,
                    dependencies: IndexSet::new(),
                    scopes: IndexSet::new(),
                    seen: false,
                });
            node.level = join_aliases(node.level, lv.level);
            for (_, operand_id) in &rvalue_data {
                if *operand_id == lvalue_id {
                    continue;
                }
                node.dependencies.insert(*operand_id);
            }

            state.visit_operand(
                env,
                id,
                &Place {
                    identifier: lv.place_identifier,
                    effect: Effect::Read,
                    reactive: false,
                    loc: None,
                },
                lvalue_id,
            );
        }

        // Handle LoadLocal definitions and hook calls
        if let ReactiveValue::Instruction(instr_value) = value {
            if let InstructionValue::LoadLocal { place, .. } = instr_value {
                if let Some(lv_id) = lvalue {
                    let lv_decl = env.identifiers[lv_id.0 as usize].declaration_id;
                    let place_decl = env.identifiers[place.identifier.0 as usize].declaration_id;
                    state.definitions.insert(lv_decl, place_decl);
                }
            } else if let InstructionValue::CallExpression { callee, args, .. } = instr_value {
                if env
                    .get_hook_kind_for_id(callee.identifier)
                    .ok()
                    .flatten()
                    .is_some()
                {
                    let no_alias = env.has_no_alias_signature(callee.identifier);
                    if !no_alias {
                        for arg in args {
                            let place = match arg {
                                PlaceOrSpread::Spread(spread) => &spread.place,
                                PlaceOrSpread::Place(place) => place,
                            };
                            let decl = env.identifiers[place.identifier.0 as usize].declaration_id;
                            state.escaping_values.insert(decl);
                        }
                    }
                }
            } else if let InstructionValue::MethodCall { property, args, .. } = instr_value {
                if env
                    .get_hook_kind_for_id(property.identifier)
                    .ok()
                    .flatten()
                    .is_some()
                {
                    let no_alias = env.has_no_alias_signature(property.identifier);
                    if !no_alias {
                        for arg in args {
                            let place = match arg {
                                PlaceOrSpread::Spread(spread) => &spread.place,
                                PlaceOrSpread::Place(place) => place,
                            };
                            let decl = env.identifiers[place.identifier.0 as usize].declaration_id;
                            state.escaping_values.insert(decl);
                        }
                    }
                }
            }
        }
    }
}

// =============================================================================
// ReactiveFunctionVisitor impl for CollectDependenciesVisitor
// =============================================================================

impl<'a> ReactiveFunctionVisitor for CollectDependenciesVisitor<'a> {
    type State = (CollectState, Vec<ScopeId>);

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_instruction(&self, instruction: &ReactiveInstruction, state: &mut Self::State) {
        self.visit_value_for_memoization(
            instruction.id,
            &instruction.value,
            instruction.lvalue.as_ref().map(|lv| lv.identifier),
            &mut state.0,
        );
    }

    fn visit_terminal(&self, stmt: &ReactiveTerminalStatement, state: &mut Self::State) {
        // Traverse terminal blocks first (TS: this.traverseTerminal(stmt, scopes))
        self.traverse_terminal(stmt, state);

        // Handle return terminals
        if let ReactiveTerminal::Return { value, .. } = &stmt.terminal {
            let env = self.env;
            let decl = env.identifiers[value.identifier.0 as usize].declaration_id;
            state.0.escaping_values.insert(decl);

            // If the return is within a scope, associate those scopes with the returned value
            let identifier_node = state
                .0
                .identifiers
                .get_mut(&decl)
                .expect("Expected identifier to be initialized");
            for scope_id in &state.1 {
                identifier_node.scopes.insert(*scope_id);
            }
        }
    }

    fn visit_scope(&self, scope: &ReactiveScopeBlock, state: &mut Self::State) {
        let env = self.env;
        let scope_id = scope.scope;
        let scope_data = &env.scopes[scope_id.0 as usize];

        // If a scope reassigns any variables, set the chain of active scopes as a dependency
        // of those variables.
        for reassignment_id in &scope_data.reassignments {
            let decl = env.identifiers[reassignment_id.0 as usize].declaration_id;
            let identifier_node = state
                .0
                .identifiers
                .get_mut(&decl)
                .expect("Expected identifier to be initialized");
            for s in &state.1 {
                identifier_node.scopes.insert(*s);
            }
            identifier_node.scopes.insert(scope_id);
        }

        // TS: this.traverseScope(scope, [...scopes, scope.scope])
        state.1.push(scope_id);
        self.traverse_scope(scope, state);
        state.1.pop();
    }
}

// =============================================================================
// computeMemoizedIdentifiers
// =============================================================================

fn compute_memoized_identifiers(state: &CollectState) -> HashSet<DeclarationId> {
    let mut memoized = HashSet::new();

    // We need mutable access to the nodes, so we clone the state into mutable structures
    let mut identifier_nodes: HashMap<
        DeclarationId,
        (
            MemoizationLevel,
            bool,
            IndexSet<DeclarationId>,
            IndexSet<ScopeId>,
            bool,
        ),
    > = state
        .identifiers
        .iter()
        .map(|(id, node)| {
            (
                *id,
                (
                    node.level,
                    node.memoized,
                    node.dependencies.clone(),
                    node.scopes.clone(),
                    node.seen,
                ),
            )
        })
        .collect();

    let mut scope_nodes: HashMap<ScopeId, (Vec<DeclarationId>, bool)> = state
        .scopes
        .iter()
        .map(|(id, node)| (*id, (node.dependencies.clone(), node.seen)))
        .collect();

    fn visit(
        id: DeclarationId,
        force_memoize: bool,
        identifier_nodes: &mut HashMap<
            DeclarationId,
            (
                MemoizationLevel,
                bool,
                IndexSet<DeclarationId>,
                IndexSet<ScopeId>,
                bool,
            ),
        >,
        scope_nodes: &mut HashMap<ScopeId, (Vec<DeclarationId>, bool)>,
        memoized: &mut HashSet<DeclarationId>,
    ) -> bool {
        let Some(&(level, _, _, _, seen)) = identifier_nodes.get(&id) else {
            return false;
        };
        if seen {
            return identifier_nodes.get(&id).unwrap().1;
        }

        // Mark as seen, temporarily mark as non-memoized
        identifier_nodes.get_mut(&id).unwrap().4 = true; // seen = true
        identifier_nodes.get_mut(&id).unwrap().1 = false; // memoized = false

        // Visit dependencies
        let deps: Vec<DeclarationId> = identifier_nodes
            .get(&id)
            .unwrap()
            .2
            .iter()
            .copied()
            .collect();
        let mut has_memoized_dependency = false;
        for dep in deps {
            let is_dep_memoized = visit(dep, false, identifier_nodes, scope_nodes, memoized);
            has_memoized_dependency |= is_dep_memoized;
        }

        if level == MemoizationLevel::Memoized
            || (level == MemoizationLevel::Conditional
                && (has_memoized_dependency || force_memoize))
            || (level == MemoizationLevel::Unmemoized && force_memoize)
        {
            identifier_nodes.get_mut(&id).unwrap().1 = true; // memoized = true
            memoized.insert(id);
            let scopes: Vec<ScopeId> = identifier_nodes
                .get(&id)
                .unwrap()
                .3
                .iter()
                .copied()
                .collect();
            for scope_id in scopes {
                force_memoize_scope_dependencies(scope_id, identifier_nodes, scope_nodes, memoized);
            }
        }
        identifier_nodes.get(&id).unwrap().1
    }

    fn force_memoize_scope_dependencies(
        id: ScopeId,
        identifier_nodes: &mut HashMap<
            DeclarationId,
            (
                MemoizationLevel,
                bool,
                IndexSet<DeclarationId>,
                IndexSet<ScopeId>,
                bool,
            ),
        >,
        scope_nodes: &mut HashMap<ScopeId, (Vec<DeclarationId>, bool)>,
        memoized: &mut HashSet<DeclarationId>,
    ) {
        let seen = scope_nodes
            .get(&id)
            .expect("Expected a node for all scopes")
            .1;
        if seen {
            return;
        }
        scope_nodes.get_mut(&id).unwrap().1 = true; // seen = true

        let deps: Vec<DeclarationId> = scope_nodes.get(&id).unwrap().0.clone();
        for dep in deps {
            visit(dep, true, identifier_nodes, scope_nodes, memoized);
        }
    }

    // Walk from the "roots" aka returned/escaping identifiers
    let escaping: Vec<DeclarationId> = state.escaping_values.iter().copied().collect();
    for value in escaping {
        visit(
            value,
            false,
            &mut identifier_nodes,
            &mut scope_nodes,
            &mut memoized,
        );
    }

    memoized
}

// =============================================================================
// PruneScopesTransform
// =============================================================================

struct PruneScopesTransform<'a> {
    env: &'a Environment,
    pruned_scopes: HashSet<ScopeId>,
    reassignments: HashMap<DeclarationId, HashSet<IdentifierId>>,
}

impl<'a> ReactiveFunctionTransform for PruneScopesTransform<'a> {
    type State = HashSet<DeclarationId>;

    fn env(&self) -> &Environment {
        self.env
    }

    fn transform_scope(
        &mut self,
        scope: &mut ReactiveScopeBlock,
        state: &mut HashSet<DeclarationId>,
    ) -> Result<Transformed<ReactiveStatement>, react_compiler_diagnostics::CompilerError> {
        self.visit_scope(scope, state)?;

        let scope_id = scope.scope;
        let scope_data = &self.env.scopes[scope_id.0 as usize];

        // Keep scopes that appear empty (value being memoized may be early-returned)
        // or have early return values
        if (scope_data.declarations.is_empty() && scope_data.reassignments.is_empty())
            || scope_data.early_return_value.is_some()
        {
            return Ok(Transformed::Keep);
        }

        let has_memoized_output = scope_data.declarations.iter().any(|(_, decl)| {
            let decl_id = self.env.identifiers[decl.identifier.0 as usize].declaration_id;
            state.contains(&decl_id)
        }) || scope_data.reassignments.iter().any(|reassign_id| {
            let decl_id = self.env.identifiers[reassign_id.0 as usize].declaration_id;
            state.contains(&decl_id)
        });

        if has_memoized_output {
            Ok(Transformed::Keep)
        } else {
            self.pruned_scopes.insert(scope_id);
            Ok(Transformed::ReplaceMany(std::mem::take(
                &mut scope.instructions,
            )))
        }
    }

    fn transform_instruction(
        &mut self,
        instruction: &mut ReactiveInstruction,
        state: &mut HashSet<DeclarationId>,
    ) -> Result<Transformed<ReactiveStatement>, react_compiler_diagnostics::CompilerError> {
        self.traverse_instruction(instruction, state)?;

        match &mut instruction.value {
            ReactiveValue::Instruction(InstructionValue::StoreLocal {
                value: store_value,
                lvalue: store_lvalue,
                ..
            }) if store_lvalue.kind == InstructionKind::Reassign => {
                let decl_id =
                    self.env.identifiers[store_lvalue.place.identifier.0 as usize].declaration_id;
                let ids = self
                    .reassignments
                    .entry(decl_id)
                    .or_insert_with(HashSet::new);
                ids.insert(store_value.identifier);
            }
            ReactiveValue::Instruction(InstructionValue::LoadLocal { place, .. }) => {
                let has_scope = self.env.identifiers[place.identifier.0 as usize]
                    .scope
                    .is_some();
                let lvalue_no_scope = instruction
                    .lvalue
                    .as_ref()
                    .map(|lv| {
                        self.env.identifiers[lv.identifier.0 as usize]
                            .scope
                            .is_none()
                    })
                    .unwrap_or(false);
                if has_scope && lvalue_no_scope {
                    if let Some(lv) = &instruction.lvalue {
                        let decl_id = self.env.identifiers[lv.identifier.0 as usize].declaration_id;
                        let ids = self
                            .reassignments
                            .entry(decl_id)
                            .or_insert_with(HashSet::new);
                        ids.insert(place.identifier);
                    }
                }
            }
            ReactiveValue::Instruction(InstructionValue::FinishMemoize {
                decl, pruned, ..
            }) => {
                let decl_has_scope = self.env.identifiers[decl.identifier.0 as usize]
                    .scope
                    .is_some();
                if !decl_has_scope {
                    // If the manual memo was a useMemo that got inlined, iterate through
                    // all reassignments to the iife temporary to ensure they're memoized.
                    let decl_id = self.env.identifiers[decl.identifier.0 as usize].declaration_id;
                    let decls: Vec<IdentifierId> = self
                        .reassignments
                        .get(&decl_id)
                        .map(|ids| ids.iter().copied().collect())
                        .unwrap_or_else(|| vec![decl.identifier]);

                    if decls.iter().all(|d| {
                        let scope = self.env.identifiers[d.0 as usize].scope;
                        scope.is_none() || self.pruned_scopes.contains(&scope.unwrap())
                    }) {
                        *pruned = true;
                    }
                } else {
                    let scope = self.env.identifiers[decl.identifier.0 as usize].scope;
                    if let Some(scope_id) = scope {
                        if self.pruned_scopes.contains(&scope_id) {
                            *pruned = true;
                        }
                    }
                }
            }
            _ => {}
        }

        Ok(Transformed::Keep)
    }
}

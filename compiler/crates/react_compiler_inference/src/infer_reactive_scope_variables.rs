// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Infers which variables belong to reactive scopes.
//!
//! Ported from TypeScript `src/ReactiveScopes/InferReactiveScopeVariables.ts`.
//!
//! This is the 1st of 4 passes that determine how to break a function into
//! discrete reactive scopes (independently memoizable units of code):
//! 1. InferReactiveScopeVariables (this pass, on HIR) determines operands that
//!    mutate together and assigns them a unique reactive scope.
//! 2. AlignReactiveScopesToBlockScopes aligns reactive scopes to block scopes.
//! 3. MergeOverlappingReactiveScopes ensures scopes do not overlap.
//! 4. BuildReactiveBlocks groups the statements for each scope.

use rustc_hash::FxHashMap;

use react_compiler_diagnostics::{CompilerDiagnostic, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors;
use react_compiler_hir::{
    DeclarationId, EvaluationOrder, HirFunction, IdentifierId, InstructionValue, Pattern, Position,
    SourceLocation,
};
use react_compiler_utils::DisjointSet;

// =============================================================================
// Public API
// =============================================================================

/// Infer reactive scope variables for a function.
///
/// For each mutable variable, infers a reactive scope which will construct that
/// variable. Variables that co-mutate are assigned to the same reactive scope.
///
/// Corresponds to TS `inferReactiveScopeVariables(fn: HIRFunction): void`.
pub fn infer_reactive_scope_variables(
    func: &mut HirFunction,
    env: &mut Environment,
) -> Result<(), CompilerDiagnostic> {
    // Phase 1: find disjoint sets of co-mutating identifiers
    let mut scope_identifiers = find_disjoint_mutable_values(func, env);

    // Phase 2: assign scopes
    // Maps each group root identifier to the ScopeId assigned to that group.
    let mut scopes: FxHashMap<IdentifierId, ScopeState> = FxHashMap::default();

    scope_identifiers.for_each(|identifier_id, group_id| {
        let ident_range = env.identifiers[identifier_id.0 as usize]
            .mutable_range
            .clone();
        let ident_loc = env.identifiers[identifier_id.0 as usize].loc;

        let state = scopes.entry(group_id).or_insert_with(|| {
            let scope_id = env.next_scope_id();
            // Initialize scope range from the first member
            let scope = &mut env.scopes[scope_id.0 as usize];
            scope.range = ident_range.clone();
            ScopeState {
                scope_id,
                loc: ident_loc,
            }
        });

        // Update scope range
        let scope = &mut env.scopes[state.scope_id.0 as usize];

        // If this is not the first identifier (scope was already created), merge ranges
        if scope.range.start != ident_range.start || scope.range.end != ident_range.end {
            if scope.range.start == EvaluationOrder(0) {
                scope.range.start = ident_range.start;
            } else if ident_range.start != EvaluationOrder(0) {
                scope.range.start = EvaluationOrder(scope.range.start.0.min(ident_range.start.0));
            }
            scope.range.end = EvaluationOrder(scope.range.end.0.max(ident_range.end.0));
        }

        // Merge location
        state.loc = merge_location(state.loc, ident_loc);

        // Assign the scope to this identifier
        let scope_id = state.scope_id;
        env.identifiers[identifier_id.0 as usize].scope = Some(scope_id);
    });

    // Set loc on each scope
    for (_group_id, state) in &scopes {
        env.scopes[state.scope_id.0 as usize].loc = state.loc;
    }

    // Update each identifier's mutable_range to match its scope's range
    for (&_identifier_id, state) in &scopes {
        let scope_range = env.scopes[state.scope_id.0 as usize].range.clone();
        // Find all identifiers with this scope and update their mutable_range
        // We iterate through all identifiers and check their scope
        for ident in &mut env.identifiers {
            if ident.scope == Some(state.scope_id) {
                ident.mutable_range = scope_range.clone();
            }
        }
    }

    // Validate scope ranges
    let mut max_instruction = EvaluationOrder(0);
    for (_block_id, block) in &func.body.blocks {
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            max_instruction = EvaluationOrder(max_instruction.0.max(instr.id.0));
        }
        max_instruction =
            EvaluationOrder(max_instruction.0.max(block.terminal.evaluation_order().0));
    }

    for (_group_id, state) in &scopes {
        let scope = &env.scopes[state.scope_id.0 as usize];
        if scope.range.start == EvaluationOrder(0)
            || scope.range.end == EvaluationOrder(0)
            || max_instruction == EvaluationOrder(0)
            || scope.range.end.0 > max_instruction.0 + 1
        {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                &format!(
                    "Invalid mutable range for scope: Scope @{} has range [{}:{}] but the valid range is [1:{}]",
                    scope.id.0,
                    scope.range.start.0,
                    scope.range.end.0,
                    max_instruction.0 + 1,
                ),
                None,
            ));
        }
    }

    Ok(())
}

struct ScopeState {
    scope_id: react_compiler_hir::ScopeId,
    loc: Option<SourceLocation>,
}

/// Merge two source locations, preferring non-None values.
/// Corresponds to TS `mergeLocation`.
fn merge_location(l: Option<SourceLocation>, r: Option<SourceLocation>) -> Option<SourceLocation> {
    match (l, r) {
        (None, r) => r,
        (l, None) => l,
        (Some(l), Some(r)) => Some(SourceLocation {
            start: Position {
                line: l.start.line.min(r.start.line),
                column: l.start.column.min(r.start.column),
                index: match (l.start.index, r.start.index) {
                    (Some(a), Some(b)) => Some(a.min(b)),
                    (a, b) => a.or(b),
                },
            },
            end: Position {
                line: l.end.line.max(r.end.line),
                column: l.end.column.max(r.end.column),
                index: match (l.end.index, r.end.index) {
                    (Some(a), Some(b)) => Some(a.max(b)),
                    (a, b) => a.or(b),
                },
            },
            start_offset: match (l.start_offset, r.start_offset) {
                (Some(a), Some(b)) => Some(a.min(b)),
                (a, b) => a.or(b),
            },
            end_offset: match (l.end_offset, r.end_offset) {
                (Some(a), Some(b)) => Some(a.max(b)),
                (a, b) => a.or(b),
            },
        }),
    }
}

// =============================================================================
// is_mutable / in_range helpers
// =============================================================================

// =============================================================================
// may_allocate
// =============================================================================

/// Check if an instruction may allocate. Corresponds to TS `mayAllocate`.
fn may_allocate(value: &InstructionValue, lvalue_type_is_primitive: bool) -> bool {
    match value {
        InstructionValue::Destructure { lvalue, .. } => {
            visitors::does_pattern_contain_spread_element(&lvalue.pattern)
        }
        InstructionValue::PostfixUpdate { .. }
        | InstructionValue::PrefixUpdate { .. }
        | InstructionValue::Await { .. }
        | InstructionValue::DeclareLocal { .. }
        | InstructionValue::DeclareContext { .. }
        | InstructionValue::StoreLocal { .. }
        | InstructionValue::LoadGlobal { .. }
        | InstructionValue::MetaProperty { .. }
        | InstructionValue::TypeCastExpression { .. }
        | InstructionValue::LoadLocal { .. }
        | InstructionValue::LoadContext { .. }
        | InstructionValue::StoreContext { .. }
        | InstructionValue::PropertyDelete { .. }
        | InstructionValue::ComputedLoad { .. }
        | InstructionValue::ComputedDelete { .. }
        | InstructionValue::JSXText { .. }
        | InstructionValue::TemplateLiteral { .. }
        | InstructionValue::Primitive { .. }
        | InstructionValue::GetIterator { .. }
        | InstructionValue::IteratorNext { .. }
        | InstructionValue::NextPropertyOf { .. }
        | InstructionValue::Debugger { .. }
        | InstructionValue::StartMemoize { .. }
        | InstructionValue::FinishMemoize { .. }
        | InstructionValue::UnaryExpression { .. }
        | InstructionValue::BinaryExpression { .. }
        | InstructionValue::PropertyLoad { .. }
        | InstructionValue::StoreGlobal { .. } => false,

        InstructionValue::TaggedTemplateExpression { .. }
        | InstructionValue::CallExpression { .. }
        | InstructionValue::MethodCall { .. } => !lvalue_type_is_primitive,

        InstructionValue::RegExpLiteral { .. }
        | InstructionValue::PropertyStore { .. }
        | InstructionValue::ComputedStore { .. }
        | InstructionValue::ArrayExpression { .. }
        | InstructionValue::JsxExpression { .. }
        | InstructionValue::JsxFragment { .. }
        | InstructionValue::NewExpression { .. }
        | InstructionValue::ObjectExpression { .. }
        | InstructionValue::UnsupportedNode { .. }
        | InstructionValue::ObjectMethod { .. }
        | InstructionValue::FunctionExpression { .. } => true,
    }
}

// =============================================================================
// Pattern helpers
// =============================================================================

/// Collect all Place identifiers from a destructure pattern.
/// Corresponds to TS `eachPatternOperand`.
fn each_pattern_operand(pattern: &Pattern) -> Vec<IdentifierId> {
    visitors::each_pattern_operand(pattern)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

/// Collect all operand identifiers from an instruction value.
/// Corresponds to TS `eachInstructionValueOperand`.
fn each_instruction_value_operand(
    value: &InstructionValue,
    env: &Environment,
) -> Vec<IdentifierId> {
    visitors::each_instruction_value_operand(value, env)
        .into_iter()
        .map(|p| p.identifier)
        .collect()
}

// =============================================================================
// findDisjointMutableValues
// =============================================================================

/// Find disjoint sets of co-mutating identifier IDs.
///
/// Corresponds to TS `findDisjointMutableValues(fn: HIRFunction): DisjointSet<Identifier>`.
pub(crate) fn find_disjoint_mutable_values(
    func: &HirFunction,
    env: &Environment,
) -> DisjointSet<IdentifierId> {
    let mut scope_identifiers = DisjointSet::<IdentifierId>::new();
    let mut declarations: FxHashMap<DeclarationId, IdentifierId> = FxHashMap::default();

    let enable_forest = env.config.enable_forest;

    for (_block_id, block) in &func.body.blocks {
        // Handle phi nodes
        for phi in &block.phis {
            let phi_id = phi.place.identifier;
            let phi_range = &env.identifiers[phi_id.0 as usize].mutable_range;
            let phi_decl_id = env.identifiers[phi_id.0 as usize].declaration_id;

            let first_instr_id = block
                .instructions
                .first()
                .map(|iid| func.instructions[iid.0 as usize].id)
                .unwrap_or(block.terminal.evaluation_order());

            let is_phi_mutated_after_creation =
                phi_range.start.0 + 1 != phi_range.end.0 && phi_range.end > first_instr_id;
            // A phi operand defined at or after the phi's block is a loop
            // back-edge: the variable is reassigned within the loop (eg a
            // counter `a++` or `a = a + 1`). The reassignment must count as
            // the loop's scope reassigning the variable, so union the phi
            // with its operands and declaration. Otherwise the variable's
            // pre-loop value would become a dependency of the scope even
            // though the scope changes the value as it executes, making the
            // scope's dependencies unstable (the cached dependency would be
            // the post-loop value, which can never match the pre-loop value
            // compared at the top of the scope).
            let is_loop_carried_reassignment = !is_phi_mutated_after_creation
                && phi.operands.iter().any(|(_pred_id, operand)| {
                    env.identifiers[operand.identifier.0 as usize]
                        .mutable_range
                        .start
                        >= first_instr_id
                });
            if is_phi_mutated_after_creation || is_loop_carried_reassignment {
                let mut operands = vec![phi_id];
                if let Some(&decl_id) = declarations.get(&phi_decl_id) {
                    operands.push(decl_id);
                }
                for (_pred_id, phi_operand) in &phi.operands {
                    operands.push(phi_operand.identifier);
                }
                scope_identifiers.union(&operands);
            } else if enable_forest {
                for (_pred_id, phi_operand) in &phi.operands {
                    scope_identifiers.union(&[phi_id, phi_operand.identifier]);
                }
            }
        }

        // Handle instructions
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let mut operands: Vec<IdentifierId> = Vec::new();

            let lvalue_id = instr.lvalue.identifier;
            let lvalue_range = &env.identifiers[lvalue_id.0 as usize].mutable_range;
            let lvalue_type = &env.types[env.identifiers[lvalue_id.0 as usize].type_.0 as usize];
            let lvalue_type_is_primitive = react_compiler_hir::is_primitive_type(lvalue_type);

            if lvalue_range.end.0 > lvalue_range.start.0 + 1
                || may_allocate(&instr.value, lvalue_type_is_primitive)
            {
                operands.push(lvalue_id);
            }

            match &instr.value {
                InstructionValue::DeclareLocal { lvalue, .. }
                | InstructionValue::DeclareContext { lvalue, .. } => {
                    let place_id = lvalue.place.identifier;
                    let decl_id = env.identifiers[place_id.0 as usize].declaration_id;
                    declarations.entry(decl_id).or_insert(place_id);
                }
                InstructionValue::StoreLocal { lvalue, value, .. }
                | InstructionValue::StoreContext { lvalue, value, .. } => {
                    let place_id = lvalue.place.identifier;
                    let decl_id = env.identifiers[place_id.0 as usize].declaration_id;
                    declarations.entry(decl_id).or_insert(place_id);

                    let place_range = &env.identifiers[place_id.0 as usize].mutable_range;
                    if place_range.end.0 > place_range.start.0 + 1 {
                        operands.push(place_id);
                    }

                    let value_range = &env.identifiers[value.identifier.0 as usize].mutable_range;
                    if value_range.contains(instr.id) && value_range.start.0 > 0 {
                        operands.push(value.identifier);
                    }
                }
                InstructionValue::Destructure { lvalue, value, .. } => {
                    let pattern_places = each_pattern_operand(&lvalue.pattern);
                    for place_id in &pattern_places {
                        let decl_id = env.identifiers[place_id.0 as usize].declaration_id;
                        declarations.entry(decl_id).or_insert(*place_id);

                        let place_range = &env.identifiers[place_id.0 as usize].mutable_range;
                        if place_range.end.0 > place_range.start.0 + 1 {
                            operands.push(*place_id);
                        }
                    }

                    let value_range = &env.identifiers[value.identifier.0 as usize].mutable_range;
                    if value_range.contains(instr.id) && value_range.start.0 > 0 {
                        operands.push(value.identifier);
                    }
                }
                InstructionValue::MethodCall { property, .. } => {
                    // For MethodCall: include all mutable operands plus the computed property
                    let all_operands = each_instruction_value_operand(&instr.value, env);
                    for op_id in &all_operands {
                        let op_range = &env.identifiers[op_id.0 as usize].mutable_range;
                        if op_range.contains(instr.id) && op_range.start.0 > 0 {
                            operands.push(*op_id);
                        }
                    }
                    // Ensure method property is in the same scope as the call
                    operands.push(property.identifier);
                }
                _ => {
                    // For all other instructions: include mutable operands
                    let all_operands = each_instruction_value_operand(&instr.value, env);
                    for op_id in &all_operands {
                        let op_range = &env.identifiers[op_id.0 as usize].mutable_range;
                        if op_range.contains(instr.id) && op_range.start.0 > 0 {
                            operands.push(*op_id);
                        }
                    }
                }
            }

            if !operands.is_empty() {
                scope_identifiers.union(&operands);
            }
        }
    }
    scope_identifiers
}

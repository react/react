// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Port of ValidatePreservedManualMemoization.ts
//!
//! Validates that all explicit manual memoization (useMemo/useCallback) was
//! accurately preserved, and that no originally memoized values became
//! unmemoized in the output.

use std::collections::{HashMap, HashSet};

use react_compiler_diagnostics::{
    CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory, SourceLocation,
};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::{
    DeclarationId, DependencyPathEntry, Identifier, IdentifierId, IdentifierName, InstructionKind,
    InstructionValue, ManualMemoDependency, ManualMemoDependencyRoot, Place, ReactiveBlock,
    ReactiveFunction, ReactiveInstruction, ReactiveScopeBlock, ReactiveStatement, ReactiveValue,
    ScopeId,
};

/// State tracked during manual memo validation within a StartMemoize..FinishMemoize range.
struct ManualMemoBlockState {
    /// Reassigned temporaries (declaration_id -> set of identifier ids that were reassigned to it).
    reassignments: HashMap<DeclarationId, HashSet<IdentifierId>>,
    /// Source location of the StartMemoize instruction.
    loc: Option<SourceLocation>,
    /// Declarations produced within this manual memo block.
    decls: HashSet<DeclarationId>,
    /// Normalized deps from source (useMemo/useCallback dep array).
    deps_from_source: Option<Vec<ManualMemoDependency>>,
    /// Manual memo id from StartMemoize.
    manual_memo_id: u32,
}

/// Top-level visitor state.
struct VisitorState<'a> {
    env: &'a mut Environment,
    manual_memo_state: Option<ManualMemoBlockState>,
    /// Completed (non-pruned) scope IDs.
    scopes: HashSet<ScopeId>,
    /// Completed pruned scope IDs.
    pruned_scopes: HashSet<ScopeId>,
    /// Map from identifier ID to its normalized manual memo dependency.
    temporaries: HashMap<IdentifierId, ManualMemoDependency>,
}

/// Validate that manual memoization (useMemo/useCallback) is preserved.
///
/// Walks the reactive function looking for StartMemoize/FinishMemoize instructions
/// and checks that:
/// 1. Dependencies' scopes have completed before the memo block starts
/// 2. Memoized values are actually within scopes (not unmemoized)
/// 3. Inferred scope dependencies match the source dependencies
pub fn validate_preserved_manual_memoization(func: &ReactiveFunction, env: &mut Environment) {
    let mut state = VisitorState {
        env,
        manual_memo_state: None,
        scopes: HashSet::new(),
        pruned_scopes: HashSet::new(),
        temporaries: HashMap::new(),
    };
    visit_block(&func.body, &mut state);
}

fn is_named(ident: &Identifier) -> bool {
    matches!(ident.name, Some(IdentifierName::Named(_)))
}

fn visit_block(block: &ReactiveBlock, state: &mut VisitorState) {
    for stmt in block {
        visit_statement(stmt, state);
    }
}

fn visit_statement(stmt: &ReactiveStatement, state: &mut VisitorState) {
    match stmt {
        ReactiveStatement::Instruction(instr) => {
            visit_instruction(instr, state);
        }
        ReactiveStatement::Terminal(terminal) => {
            visit_terminal(terminal, state);
        }
        ReactiveStatement::Scope(scope_block) => {
            visit_scope(scope_block, state);
        }
        ReactiveStatement::PrunedScope(pruned) => {
            visit_pruned_scope(pruned, state);
        }
    }
}

fn visit_terminal(
    terminal: &react_compiler_hir::ReactiveTerminalStatement,
    state: &mut VisitorState,
) {
    use react_compiler_hir::ReactiveTerminal;
    match &terminal.terminal {
        ReactiveTerminal::If {
            consequent,
            alternate,
            ..
        } => {
            visit_block(consequent, state);
            if let Some(alt) = alternate {
                visit_block(alt, state);
            }
        }
        ReactiveTerminal::Switch { cases, .. } => {
            for case in cases {
                if let Some(ref block) = case.block {
                    visit_block(block, state);
                }
            }
        }
        ReactiveTerminal::For { loop_block, .. }
        | ReactiveTerminal::ForOf { loop_block, .. }
        | ReactiveTerminal::ForIn { loop_block, .. }
        | ReactiveTerminal::While { loop_block, .. }
        | ReactiveTerminal::DoWhile { loop_block, .. } => {
            visit_block(loop_block, state);
        }
        ReactiveTerminal::Label { block, .. } => {
            visit_block(block, state);
        }
        ReactiveTerminal::Try { block, handler, .. } => {
            visit_block(block, state);
            visit_block(handler, state);
        }
        _ => {}
    }
}

fn visit_scope(scope_block: &ReactiveScopeBlock, state: &mut VisitorState) {
    // Traverse the scope's instructions first
    visit_block(&scope_block.instructions, state);

    // After traversing, validate scope dependencies against manual memo deps
    if let Some(ref memo_state) = state.manual_memo_state {
        if let Some(ref deps_from_source) = memo_state.deps_from_source {
            let scope = &state.env.scopes[scope_block.scope.0 as usize];
            let deps = scope.dependencies.clone();
            let memo_loc = memo_state.loc;
            let decls = memo_state.decls.clone();
            let deps_from_source = deps_from_source.clone();
            let temporaries = state.temporaries.clone();
            for dep in &deps {
                validate_inferred_dep(
                    dep.identifier,
                    &dep.path,
                    &temporaries,
                    &decls,
                    &deps_from_source,
                    state.env,
                    memo_loc,
                );
            }
        }
    }

    // Mark scope and merged scopes as completed
    let scope = &state.env.scopes[scope_block.scope.0 as usize];
    let merged = scope.merged.clone();
    state.scopes.insert(scope_block.scope);
    for merged_id in merged {
        state.scopes.insert(merged_id);
    }
}

fn visit_pruned_scope(
    pruned: &react_compiler_hir::PrunedReactiveScopeBlock,
    state: &mut VisitorState,
) {
    visit_block(&pruned.instructions, state);
    state.pruned_scopes.insert(pruned.scope);
}

fn visit_instruction(instr: &ReactiveInstruction, state: &mut VisitorState) {
    // Record temporaries and deps in the instruction's value
    record_temporaries(instr, state);

    match &instr.value {
        ReactiveValue::Instruction(InstructionValue::StartMemoize {
            manual_memo_id,
            deps,
            has_invalid_deps,
            ..
        }) => {
            // TS: CompilerError.invariant(state.manualMemoState == null, ...)
            if state.manual_memo_state.is_some() {
                return;
            }

            // TS: if (value.hasInvalidDeps === true) { return; }
            if *has_invalid_deps {
                return;
            }

            let deps_from_source = deps.clone();

            state.manual_memo_state = Some(ManualMemoBlockState {
                loc: instr.loc,
                decls: HashSet::new(),
                deps_from_source,
                manual_memo_id: *manual_memo_id,
                reassignments: HashMap::new(),
            });

            // Check that each dependency's scope has completed before the memo
            // TS: for (const {identifier, loc} of eachInstructionValueOperand(value))
            let operand_places = start_memoize_operands(deps);
            for place in &operand_places {
                let ident = &state.env.identifiers[place.identifier.0 as usize];
                if let Some(scope_id) = ident.scope {
                    if !state.scopes.contains(&scope_id) && !state.pruned_scopes.contains(&scope_id)
                    {
                        let diag = CompilerDiagnostic::new(
                            ErrorCategory::PreserveManualMemo,
                            "Existing memoization could not be preserved",
                            Some(
                                "React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. \
                                 This dependency may be mutated later, which could cause the value to change unexpectedly".to_string(),
                            ),
                        )
                        .with_detail(CompilerDiagnosticDetail::Error {
                            loc: place.loc,
                            message: Some(
                                "This dependency may be modified later".to_string(),
                            ),
                            identifier_name: None,
                        });
                        state.env.record_diagnostic(diag);
                    }
                }
            }
        }
        ReactiveValue::Instruction(InstructionValue::FinishMemoize {
            decl,
            pruned,
            manual_memo_id,
            ..
        }) => {
            if state.manual_memo_state.is_none() {
                // StartMemoize had invalid deps, skip validation
                return;
            }

            // TS: CompilerError.invariant(state.manualMemoState.manualMemoId === value.manualMemoId, ...)
            if state
                .manual_memo_state
                .as_ref()
                .map_or(true, |s| s.manual_memo_id != *manual_memo_id)
            {
                state.manual_memo_state = None;
                return;
            }

            let memo_state = state.manual_memo_state.take().unwrap();

            if !pruned {
                // Check if the declared value is unmemoized
                let decl_ident = &state.env.identifiers[decl.identifier.0 as usize];

                if decl_ident.scope.is_none() {
                    // If the manual memo was inlined (useMemo -> IIFE), check reassignments
                    let decls_to_check = memo_state
                        .reassignments
                        .get(&decl_ident.declaration_id)
                        .map(|ids| ids.iter().copied().collect::<Vec<_>>())
                        .unwrap_or_else(|| vec![decl.identifier]);

                    for id in decls_to_check {
                        if is_unmemoized(id, &state.scopes, &state.env.identifiers) {
                            record_unmemoized_error(decl.loc, state.env);
                        }
                    }
                } else {
                    // Single identifier with scope
                    if is_unmemoized(decl.identifier, &state.scopes, &state.env.identifiers) {
                        record_unmemoized_error(decl.loc, state.env);
                    }
                }
            }
        }
        ReactiveValue::Instruction(InstructionValue::StoreLocal { lvalue, value, .. }) => {
            // Track reassignments from inlining of manual memo
            if state.manual_memo_state.is_some() && lvalue.kind == InstructionKind::Reassign {
                let decl_id =
                    state.env.identifiers[lvalue.place.identifier.0 as usize].declaration_id;
                state
                    .manual_memo_state
                    .as_mut()
                    .unwrap()
                    .reassignments
                    .entry(decl_id)
                    .or_default()
                    .insert(value.identifier);
            }
        }
        ReactiveValue::Instruction(InstructionValue::LoadLocal { place, .. }) => {
            if state.manual_memo_state.is_some() {
                let place_ident = &state.env.identifiers[place.identifier.0 as usize];
                if let Some(ref lvalue) = instr.lvalue {
                    let lvalue_ident = &state.env.identifiers[lvalue.identifier.0 as usize];
                    if place_ident.scope.is_some() && lvalue_ident.scope.is_none() {
                        state
                            .manual_memo_state
                            .as_mut()
                            .unwrap()
                            .reassignments
                            .entry(lvalue_ident.declaration_id)
                            .or_default()
                            .insert(place.identifier);
                    }
                }
            }
        }
        _ => {}
    }
}

fn record_unmemoized_error(loc: Option<SourceLocation>, env: &mut Environment) {
    let diag = CompilerDiagnostic::new(
        ErrorCategory::PreserveManualMemo,
        "Existing memoization could not be preserved",
        Some(
            "React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output".to_string(),
        ),
    )
    .with_detail(CompilerDiagnosticDetail::Error {
        loc,
        message: Some("Could not preserve existing memoization".to_string()),
        identifier_name: None,
    });
    env.record_diagnostic(diag);
}

/// Record temporaries from an instruction.
/// TS: `recordTemporaries`
fn record_temporaries(instr: &ReactiveInstruction, state: &mut VisitorState) {
    let lvalue = &instr.lvalue;
    let lv_id = lvalue.as_ref().map(|lv| lv.identifier);
    if let Some(id) = lv_id {
        if state.temporaries.contains_key(&id) {
            return;
        }
    }

    if let Some(ref lvalue) = instr.lvalue {
        let lv_ident = &state.env.identifiers[lvalue.identifier.0 as usize];
        if is_named(lv_ident) && state.manual_memo_state.is_some() {
            state
                .manual_memo_state
                .as_mut()
                .unwrap()
                .decls
                .insert(lv_ident.declaration_id);
        }
    }

    // Record deps from the instruction value first (before setting lvalue temporary)
    record_deps_in_value(&instr.value, state);

    // Then set the lvalue temporary (TS always sets this, even for unnamed lvalues)
    if let Some(ref lvalue) = instr.lvalue {
        state.temporaries.insert(
            lvalue.identifier,
            ManualMemoDependency {
                root: ManualMemoDependencyRoot::NamedLocal {
                    value: lvalue.clone(),
                    constant: false,
                },
                path: Vec::new(),
                loc: lvalue.loc,
            },
        );
    }
}

/// Record dependencies from a reactive value.
/// TS: `recordDepsInValue`
fn record_deps_in_value(value: &ReactiveValue, state: &mut VisitorState) {
    match value {
        ReactiveValue::SequenceExpression {
            instructions,
            value,
            ..
        } => {
            for instr in instructions {
                visit_instruction(instr, state);
            }
            record_deps_in_value(value, state);
        }
        ReactiveValue::OptionalExpression { value: inner, .. } => {
            record_deps_in_value(inner, state);
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            record_deps_in_value(test, state);
            record_deps_in_value(consequent, state);
            record_deps_in_value(alternate, state);
        }
        ReactiveValue::LogicalExpression { left, right, .. } => {
            record_deps_in_value(left, state);
            record_deps_in_value(right, state);
        }
        ReactiveValue::Instruction(iv) => {
            // TS: collectMaybeMemoDependencies(value, this.temporaries, false)
            // Called for side-effect of building up the dependency chain through
            // LoadGlobal -> PropertyLoad -> ... The return value is discarded here
            // (only used in DropManualMemoization's caller), but we need to store
            // the result in temporaries for the lvalue of the enclosing instruction.
            // That storage is handled by record_temporaries after this function returns.

            // Track store targets within manual memo blocks
            // TS: if (value.kind === 'StoreLocal' || value.kind === 'StoreContext' || value.kind === 'Destructure')
            match iv {
                InstructionValue::StoreLocal { lvalue, .. }
                | InstructionValue::StoreContext { lvalue, .. } => {
                    if let Some(ref mut memo_state) = state.manual_memo_state {
                        let ident = &state.env.identifiers[lvalue.place.identifier.0 as usize];
                        memo_state.decls.insert(ident.declaration_id);
                        if is_named(ident) {
                            state.temporaries.insert(
                                lvalue.place.identifier,
                                ManualMemoDependency {
                                    root: ManualMemoDependencyRoot::NamedLocal {
                                        value: lvalue.place.clone(),
                                        constant: false,
                                    },
                                    path: Vec::new(),
                                    loc: lvalue.place.loc,
                                },
                            );
                        }
                    }
                }
                InstructionValue::Destructure { lvalue, .. } => {
                    if let Some(ref mut memo_state) = state.manual_memo_state {
                        for place in destructure_lvalue_places(&lvalue.pattern) {
                            let ident = &state.env.identifiers[place.identifier.0 as usize];
                            memo_state.decls.insert(ident.declaration_id);
                            if is_named(ident) {
                                state.temporaries.insert(
                                    place.identifier,
                                    ManualMemoDependency {
                                        root: ManualMemoDependencyRoot::NamedLocal {
                                            value: place.clone(),
                                            constant: false,
                                        },
                                        path: Vec::new(),
                                        loc: place.loc,
                                    },
                                );
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }
}

/// Get operand places from a StartMemoize instruction's deps.
fn start_memoize_operands(deps: &Option<Vec<ManualMemoDependency>>) -> Vec<Place> {
    let mut result = Vec::new();
    if let Some(deps) = deps {
        for dep in deps {
            if let ManualMemoDependencyRoot::NamedLocal { value, .. } = &dep.root {
                result.push(value.clone());
            }
        }
    }
    result
}

/// Get lvalue places from a Destructure pattern.
fn destructure_lvalue_places(pattern: &react_compiler_hir::Pattern) -> Vec<&Place> {
    let mut result = Vec::new();
    match pattern {
        react_compiler_hir::Pattern::Array(arr) => {
            for item in &arr.items {
                match item {
                    react_compiler_hir::ArrayPatternElement::Place(place) => {
                        result.push(place);
                    }
                    react_compiler_hir::ArrayPatternElement::Spread(spread) => {
                        result.push(&spread.place);
                    }
                    react_compiler_hir::ArrayPatternElement::Hole => {}
                }
            }
        }
        react_compiler_hir::Pattern::Object(obj) => {
            for entry in &obj.properties {
                match entry {
                    react_compiler_hir::ObjectPropertyOrSpread::Property(prop) => {
                        result.push(&prop.place);
                    }
                    react_compiler_hir::ObjectPropertyOrSpread::Spread(spread) => {
                        result.push(&spread.place);
                    }
                }
            }
        }
    }
    result
}

/// Check if an identifier is unmemoized (has a scope that hasn't completed).
fn is_unmemoized(
    id: IdentifierId,
    completed_scopes: &HashSet<ScopeId>,
    identifiers: &[Identifier],
) -> bool {
    let ident = &identifiers[id.0 as usize];
    if let Some(scope_id) = ident.scope {
        !completed_scopes.contains(&scope_id)
    } else {
        false
    }
}

// =============================================================================
// Dependency comparison (port of compareDeps / validateInferredDep)
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum CompareDependencyResult {
    Ok = 0,
    RootDifference = 1,
    PathDifference = 2,
    Subpath = 3,
    RefAccessDifference = 4,
}

fn compare_deps(
    inferred: &ManualMemoDependency,
    source: &ManualMemoDependency,
) -> CompareDependencyResult {
    let roots_equal = match (&inferred.root, &source.root) {
        (
            ManualMemoDependencyRoot::Global { identifier_name: a },
            ManualMemoDependencyRoot::Global { identifier_name: b },
        ) => a == b,
        (
            ManualMemoDependencyRoot::NamedLocal { value: a, .. },
            ManualMemoDependencyRoot::NamedLocal { value: b, .. },
        ) => a.identifier == b.identifier,
        _ => false,
    };
    if !roots_equal {
        return CompareDependencyResult::RootDifference;
    }

    let min_len = inferred.path.len().min(source.path.len());
    let mut is_subpath = true;
    for i in 0..min_len {
        if inferred.path[i].property != source.path[i].property {
            is_subpath = false;
            break;
        } else if inferred.path[i].optional != source.path[i].optional {
            return CompareDependencyResult::PathDifference;
        }
    }

    if is_subpath
        && (source.path.len() == inferred.path.len()
            || (inferred.path.len() >= source.path.len()
                && !inferred.path.iter().any(|t| {
                    t.property == react_compiler_hir::PropertyLiteral::String("current".to_string())
                })))
    {
        CompareDependencyResult::Ok
    } else if is_subpath {
        if source.path.iter().any(|t| {
            t.property == react_compiler_hir::PropertyLiteral::String("current".to_string())
        }) || inferred.path.iter().any(|t| {
            t.property == react_compiler_hir::PropertyLiteral::String("current".to_string())
        }) {
            CompareDependencyResult::RefAccessDifference
        } else {
            CompareDependencyResult::Subpath
        }
    } else {
        CompareDependencyResult::PathDifference
    }
}

/// Pretty-print a reactive scope dependency (e.g., `x.a.b?.c`)
fn pretty_print_scope_dependency(
    dep_id: IdentifierId,
    dep_path: &[DependencyPathEntry],
    identifiers: &[react_compiler_hir::Identifier],
) -> String {
    let ident = &identifiers[dep_id.0 as usize];
    let root_str = match &ident.name {
        Some(react_compiler_hir::IdentifierName::Named(n)) => n.clone(),
        Some(react_compiler_hir::IdentifierName::Promoted(n)) => n.clone(),
        None => "[unnamed]".to_string(),
    };
    let path_str: String = dep_path
        .iter()
        .map(|entry| {
            let prop = match &entry.property {
                react_compiler_hir::PropertyLiteral::String(s) => s.clone(),
                react_compiler_hir::PropertyLiteral::Number(n) => format!("{}", n),
            };
            if entry.optional {
                format!("?.{}", prop)
            } else {
                format!(".{}", prop)
            }
        })
        .collect();
    format!("{}{}", root_str, path_str)
}

/// Pretty-print a manual memo dependency for error messages.
fn print_manual_memo_dependency(
    dep: &ManualMemoDependency,
    identifiers: &[react_compiler_hir::Identifier],
    with_optional: bool,
) -> String {
    let root_str = match &dep.root {
        ManualMemoDependencyRoot::NamedLocal { value, .. } => {
            let ident = &identifiers[value.identifier.0 as usize];
            match &ident.name {
                Some(react_compiler_hir::IdentifierName::Named(n)) => n.clone(),
                Some(react_compiler_hir::IdentifierName::Promoted(n)) => n.clone(),
                None => "[unnamed]".to_string(),
            }
        }
        ManualMemoDependencyRoot::Global { identifier_name } => identifier_name.clone(),
    };
    let path_str: String = dep
        .path
        .iter()
        .map(|entry| {
            let prop = match &entry.property {
                react_compiler_hir::PropertyLiteral::String(s) => s.clone(),
                react_compiler_hir::PropertyLiteral::Number(n) => format!("{}", n),
            };
            if with_optional && entry.optional {
                format!("?.{}", prop)
            } else {
                format!(".{}", prop)
            }
        })
        .collect();
    format!("{}{}", root_str, path_str)
}

fn get_compare_dependency_result_description(result: CompareDependencyResult) -> &'static str {
    match result {
        CompareDependencyResult::Ok => "Dependencies equal",
        CompareDependencyResult::RootDifference | CompareDependencyResult::PathDifference => {
            "Inferred different dependency than source"
        }
        CompareDependencyResult::RefAccessDifference => "Differences in ref.current access",
        CompareDependencyResult::Subpath => "Inferred less specific property than source",
    }
}

/// Validate that an inferred dependency matches a source dependency or was produced
/// within the manual memo block.
fn validate_inferred_dep(
    dep_id: IdentifierId,
    dep_path: &[DependencyPathEntry],
    temporaries: &HashMap<IdentifierId, ManualMemoDependency>,
    decls_within_memo_block: &HashSet<DeclarationId>,
    valid_deps_in_memo_block: &[ManualMemoDependency],
    env: &mut Environment,
    memo_location: Option<SourceLocation>,
) {
    // Normalize the dependency through temporaries
    let normalized_dep = if let Some(temp) = temporaries.get(&dep_id) {
        let mut path = temp.path.clone();
        path.extend_from_slice(dep_path);
        ManualMemoDependency {
            root: temp.root.clone(),
            path,
            loc: temp.loc,
        }
    } else {
        let ident = &env.identifiers[dep_id.0 as usize];
        // TS: CompilerError.invariant(dep.identifier.name?.kind === 'named', ...)
        if !is_named(ident) {
            return;
        }
        ManualMemoDependency {
            root: ManualMemoDependencyRoot::NamedLocal {
                value: Place {
                    identifier: dep_id,
                    effect: react_compiler_hir::Effect::Read,
                    reactive: false,
                    loc: ident.loc,
                },
                constant: false,
            },
            path: dep_path.to_vec(),
            loc: ident.loc,
        }
    };

    // Check if the dep was declared within the memo block
    if let ManualMemoDependencyRoot::NamedLocal { value, .. } = &normalized_dep.root {
        let ident = &env.identifiers[value.identifier.0 as usize];
        if decls_within_memo_block.contains(&ident.declaration_id) {
            return;
        }
    }

    // Compare against each valid source dependency
    let mut error_diagnostic: Option<CompareDependencyResult> = None;
    for source_dep in valid_deps_in_memo_block {
        let result = compare_deps(&normalized_dep, source_dep);
        if result == CompareDependencyResult::Ok {
            return;
        }
        error_diagnostic = Some(match error_diagnostic {
            Some(prev) => prev.max(result),
            None => result,
        });
    }

    let ident = &env.identifiers[dep_id.0 as usize];

    let extra = if is_named(ident) {
        // Use the original dep_id/dep_path (matching TS prettyPrintScopeDependency(dep))
        let dep_str = pretty_print_scope_dependency(dep_id, dep_path, &env.identifiers);
        let source_deps_str: String = valid_deps_in_memo_block
            .iter()
            .map(|d| print_manual_memo_dependency(d, &env.identifiers, true))
            .collect::<Vec<_>>()
            .join(", ");
        let result_desc = error_diagnostic
            .map(|d| get_compare_dependency_result_description(d).to_string())
            .unwrap_or_else(|| "Inferred dependency not present in source".to_string());
        format!(
            "The inferred dependency was `{}`, but the source dependencies were [{}]. {}",
            dep_str, source_deps_str, result_desc
        )
    } else {
        String::new()
    };

    let description = format!(
        "React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. \
         The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. {}",
        extra
    );

    let diag = CompilerDiagnostic::new(
        ErrorCategory::PreserveManualMemo,
        "Existing memoization could not be preserved",
        Some(description.trim().to_string()),
    )
    .with_detail(CompilerDiagnosticDetail::Error {
        loc: memo_location,
        message: Some("Could not preserve existing manual memoization".to_string()),
        identifier_name: None,
    });
    env.record_diagnostic(diag);
}

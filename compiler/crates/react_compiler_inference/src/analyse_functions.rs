// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Recursively analyzes nested function expressions and object methods to infer
//! their aliasing effect signatures.
//!
//! Ported from TypeScript `src/Inference/AnalyseFunctions.ts`.
//!
//! Runs inferMutationAliasingEffects, deadCodeElimination,
//! inferMutationAliasingRanges, rewriteInstructionKindsBasedOnReassignment,
//! and inferReactiveScopeVariables on each inner function.

use indexmap::IndexMap;
use react_compiler_diagnostics::{CompilerDiagnostic, ErrorCategory};
use react_compiler_hir::environment::Environment;
use rustc_hash::FxHashSet;

use react_compiler_hir::{
    AliasingEffect, BlockId, Effect, EvaluationOrder, FunctionId, HIR, HirFunction, IdentifierId,
    InstructionValue, Place, ReactFunctionType,
};

/// Analyse all nested function expressions and object methods in `func`.
///
/// For each inner function found, runs `lower_with_mutation_aliasing` to infer
/// its aliasing effects, then resets context variable mutable ranges.
///
/// The optional `debug_logger` callback is invoked after processing each inner
/// function, receiving `(&HirFunction, &Environment)` so the caller can produce
/// debug output. This mirrors the TS `fn.env.logger?.debugLogIRs` call inside
/// `lowerWithMutationAliasing`.
///
/// Corresponds to TS `analyseFunctions(func: HIRFunction): void`.
pub fn analyse_functions<F>(
    func: &mut HirFunction,
    env: &mut Environment,
    debug_logger: &mut F,
) -> Result<(), CompilerDiagnostic>
where
    F: FnMut(&HirFunction, &Environment),
{
    // Collect FunctionIds from FunctionExpression/ObjectMethod instructions.
    // We collect first to avoid borrow conflicts with env.functions.
    let mut inner_func_ids: Vec<FunctionId> = Vec::new();
    for (_block_id, block) in &func.body.blocks {
        for instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    inner_func_ids.push(lowered_func.func);
                }
                _ => {}
            }
        }
    }

    // Process each inner function
    for func_id in inner_func_ids {
        // Take the inner function out of the arena to avoid borrow conflicts
        let mut inner_func = std::mem::replace(
            &mut env.functions[func_id.0 as usize],
            placeholder_function(),
        );

        lower_with_mutation_aliasing(&mut inner_func, env, debug_logger)?;

        // If an invariant error was recorded, put the function back and stop processing
        if env.has_invariant_errors() {
            env.functions[func_id.0 as usize] = inner_func;
            return Ok(());
        }

        // Reset mutable range for outer inferMutationAliasingEffects.
        //
        // NOTE: inferReactiveScopeVariables makes identifiers in the scope
        // point to the *same* mutableRange instance (in TS). In Rust, scopes
        // are stored in an arena, so we reset both the identifier's range
        // and clear its scope.
        for operand in &inner_func.context {
            let new_range = env.new_mutable_range(EvaluationOrder(0), EvaluationOrder(0));
            let ident = &mut env.identifiers[operand.identifier.0 as usize];
            ident.mutable_range = new_range;
            ident.scope = None;
        }

        // Put the function back
        env.functions[func_id.0 as usize] = inner_func;
    }

    Ok(())
}

/// Run mutation/aliasing inference on an inner function.
///
/// Corresponds to TS `lowerWithMutationAliasing(fn: HIRFunction): void`.
fn lower_with_mutation_aliasing<F>(
    func: &mut HirFunction,
    env: &mut Environment,
    debug_logger: &mut F,
) -> Result<(), CompilerDiagnostic>
where
    F: FnMut(&HirFunction, &Environment),
{
    // Phase 1: Recursively analyse nested functions first (depth-first)
    analyse_functions(func, env, debug_logger)?;

    // inferMutationAliasingEffects on the inner function
    crate::infer_mutation_aliasing_effects::infer_mutation_aliasing_effects(func, env, true)?;

    // Check for invariant errors (e.g., uninitialized value kind)
    // In TS, these throw from within inferMutationAliasingEffects, aborting
    // the rest of the function processing.
    if env.has_invariant_errors() {
        return Ok(());
    }

    // deadCodeElimination for inner functions
    react_compiler_optimization::dead_code_elimination(func, env);

    // inferMutationAliasingRanges — returns the externally-visible function effects
    let function_effects =
        crate::infer_mutation_aliasing_ranges::infer_mutation_aliasing_ranges(func, env, true)?;

    // rewriteInstructionKindsBasedOnReassignment
    if let Err(err) = react_compiler_ssa::rewrite_instruction_kinds_based_on_reassignment(func, env)
    {
        env.errors.merge(err);
        return Ok(());
    }

    // inferReactiveScopeVariables on the inner function
    crate::infer_reactive_scope_variables::infer_reactive_scope_variables(func, env)?;

    func.aliasing_effects = Some(function_effects.clone());

    // Phase 2: Populate the Effect of each context variable to use in inferring
    // the outer function. Corresponds to TS Phase 2 in lowerWithMutationAliasing.
    let mut captured_or_mutated: FxHashSet<IdentifierId> = FxHashSet::default();
    for effect in &function_effects {
        match effect {
            AliasingEffect::Assign { from, .. }
            | AliasingEffect::Alias { from, .. }
            | AliasingEffect::Capture { from, .. }
            | AliasingEffect::CreateFrom { from, .. }
            | AliasingEffect::MaybeAlias { from, .. } => {
                captured_or_mutated.insert(from.identifier);
            }
            AliasingEffect::Mutate { value, .. }
            | AliasingEffect::MutateConditionally { value }
            | AliasingEffect::MutateTransitive { value }
            | AliasingEffect::MutateTransitiveConditionally { value } => {
                captured_or_mutated.insert(value.identifier);
            }
            AliasingEffect::Impure { .. }
            | AliasingEffect::Render { .. }
            | AliasingEffect::MutateFrozen { .. }
            | AliasingEffect::MutateGlobal { .. }
            | AliasingEffect::CreateFunction { .. }
            | AliasingEffect::Create { .. }
            | AliasingEffect::Freeze { .. }
            | AliasingEffect::ImmutableCapture { .. } => {
                // no-op
            }
            AliasingEffect::Apply { .. } => {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "[AnalyzeFunctions] Expected Apply effects to be replaced with more precise effects",
                    None,
                ));
            }
        }
    }

    for operand in &mut func.context {
        if captured_or_mutated.contains(&operand.identifier) || operand.effect == Effect::Capture {
            operand.effect = Effect::Capture;
        } else {
            operand.effect = Effect::Read;
        }
    }

    // Log the inner function's state (mirrors TS: fn.env.logger?.debugLogIRs)
    debug_logger(func, env);

    Ok(())
}

/// Create a placeholder HirFunction for temporarily swapping an inner function
/// out of `env.functions` via `std::mem::replace`. The placeholder is never
/// read — the real function is swapped back immediately after processing.
fn placeholder_function() -> HirFunction {
    HirFunction {
        loc: None,
        id: None,
        name_hint: None,
        fn_type: ReactFunctionType::Other,
        params: Vec::new(),
        return_type_annotation: None,
        returns: Place {
            identifier: IdentifierId(0),
            effect: Effect::Unknown,
            reactive: false,
            loc: None,
        },
        context: Vec::new(),
        body: HIR {
            entry: BlockId(0),
            blocks: IndexMap::default(),
        },
        instructions: Vec::new(),
        generator: false,
        is_async: false,
        directives: Vec::new(),
        aliasing_effects: None,
    }
}

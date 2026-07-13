/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath} from '@babel/traverse';
import * as t from '@babel/types';
import prettyFormat from 'pretty-format';
import {CompilerOutputMode, Logger, ProgramContext} from '.';
import {CompilerError} from '../CompilerError';
import {Err, Ok, Result} from '../Utils/Result';
import {
  HIRFunction,
  ReactiveFunction,
  assertConsistentIdentifiers,
  assertTerminalPredsExist,
  assertTerminalSuccessorsExist,
  assertValidBlockNesting,
  assertValidMutableRanges,
  buildReactiveScopeTerminalsHIR,
  lower,
  mergeConsecutiveBlocks,
  mergeOverlappingReactiveScopesHIR,
  pruneUnusedLabelsHIR,
} from '../HIR';
import {
  Environment,
  EnvironmentConfig,
  ReactFunctionType,
} from '../HIR/Environment';
import {findContextIdentifiers} from '../HIR/FindContextIdentifiers';
import {
  analyseFunctions,
  dropManualMemoization,
  inferReactivePlaces,
  inlineImmediatelyInvokedFunctionExpressions,
} from '../Inference';
import {
  constantPropagation,
  deadCodeElimination,
  pruneMaybeThrows,
} from '../Optimization';
import {
  CodegenFunction,
  alignObjectMethodScopes,
  assertScopeInstructionsWithinScopes,
  assertWellFormedBreakTargets,
  buildReactiveFunction,
  codegenFunction,
  extractScopeDeclarationsFromDestructuring,
  inferReactiveScopeVariables,
  memoizeFbtAndMacroOperandsInSameScope,
  mergeReactiveScopesThatInvalidateTogether,
  promoteUsedTemporaries,
  propagateEarlyReturns,
  pruneHoistedContexts,
  pruneNonEscapingScopes,
  pruneNonReactiveDependencies,
  pruneUnusedLValues,
  pruneUnusedLabels,
  pruneUnusedScopes,
  renameVariables,
} from '../ReactiveScopes';
import {alignMethodCallScopes} from '../ReactiveScopes/AlignMethodCallScopes';
import {alignReactiveScopesToBlockScopesHIR} from '../ReactiveScopes/AlignReactiveScopesToBlockScopesHIR';
import {flattenReactiveLoopsHIR} from '../ReactiveScopes/FlattenReactiveLoopsHIR';
import {flattenScopesWithHooksOrUseHIR} from '../ReactiveScopes/FlattenScopesWithHooksOrUseHIR';
import {pruneAlwaysInvalidatingScopes} from '../ReactiveScopes/PruneAlwaysInvalidatingScopes';
import {stabilizeBlockIds} from '../ReactiveScopes/StabilizeBlockIds';
import {
  eliminateRedundantPhi,
  enterSSA,
  rewriteInstructionKindsBasedOnReassignment,
} from '../SSA';
import {inferTypes} from '../TypeInference';
import {
  validateContextVariableLValues,
  validateHooksUsage,
  validateNoCapitalizedCalls,
  validateNoRefAccessInRender,
  validateNoSetStateInRender,
  validatePreservedManualMemoization,
  validateUseMemo,
} from '../Validation';
import {validateLocalsNotReassignedAfterRender} from '../Validation/ValidateLocalsNotReassignedAfterRender';
import {outlineFunctions} from '../Optimization/OutlineFunctions';
import {validateNoSetStateInEffects} from '../Validation/ValidateNoSetStateInEffects';
import {validateNoJSXInTryStatement} from '../Validation/ValidateNoJSXInTryStatement';
import {propagateScopeDependenciesHIR} from '../HIR/PropagateScopeDependenciesHIR';
import {outlineJSX} from '../Optimization/OutlineJsx';
import {optimizePropsMethodCalls} from '../Optimization/OptimizePropsMethodCalls';
import {validateStaticComponents} from '../Validation/ValidateStaticComponents';
import {validateNoFreezingKnownMutableFunctions} from '../Validation/ValidateNoFreezingKnownMutableFunctions';
import {inferMutationAliasingEffects} from '../Inference/InferMutationAliasingEffects';
import {inferMutationAliasingRanges} from '../Inference/InferMutationAliasingRanges';
import {validateNoDerivedComputationsInEffects} from '../Validation/ValidateNoDerivedComputationsInEffects';
import {validateNoDerivedComputationsInEffects_exp} from '../Validation/ValidateNoDerivedComputationsInEffects_exp';
import {nameAnonymousFunctions} from '../Transform/NameAnonymousFunctions';
import {optimizeForSSR} from '../Optimization/OptimizeForSSR';
import {validateExhaustiveDependencies} from '../Validation/ValidateExhaustiveDependencies';
import {validateSourceLocations} from '../Validation/ValidateSourceLocations';

export type CompilerPipelineValue =
  | {kind: 'ast'; name: string; value: CodegenFunction}
  | {kind: 'hir'; name: string; value: HIRFunction}
  | {kind: 'reactive'; name: string; value: ReactiveFunction}
  | {kind: 'debug'; name: string; value: string};

function run(
  func: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
  config: EnvironmentConfig,
  fnType: ReactFunctionType,
  mode: CompilerOutputMode,
  programContext: ProgramContext,
  logger: Logger | null,
  filename: string | null,
  code: string | null,
): Result<CodegenFunction, CompilerError> {
  const contextIdentifiers = findContextIdentifiers(func);
  const env = new Environment(
    func.scope,
    fnType,
    mode,
    config,
    contextIdentifiers,
    func,
    logger,
    filename,
    code,
    programContext,
  );
  env.logger?.debugLogIRs?.({
    kind: 'debug',
    name: 'EnvironmentConfig',
    value: prettyFormat(env.config),
  });
  return runWithEnvironment(func, env);
}

/*
 * Note: this is split from run() to make `config` out of scope, so that all
 * access to feature flags has to be through the Environment for consistency.
 */
function runWithEnvironment(
  func: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
  env: Environment,
): Result<CodegenFunction, CompilerError> {
  const log = (value: CompilerPipelineValue): void => {
    env.logger?.debugLogIRs?.(value);
  };
  const hir = lower(func, env);
  log({kind: 'hir', name: 'HIR', value: hir});

  pruneMaybeThrows(hir);
  log({kind: 'hir', name: 'PruneMaybeThrows', value: hir});

  validateContextVariableLValues(hir);
  log({kind: 'debug', name: 'ValidateContextVariableLValues', value: 'ok'});
  validateUseMemo(hir);
  log({kind: 'debug', name: 'ValidateUseMemo', value: 'ok'});

  if (env.enableDropManualMemoization) {
    dropManualMemoization(hir);
    log({kind: 'hir', name: 'DropManualMemoization', value: hir});
  }

  inlineImmediatelyInvokedFunctionExpressions(hir);
  log({
    kind: 'hir',
    name: 'InlineImmediatelyInvokedFunctionExpressions',
    value: hir,
  });

  mergeConsecutiveBlocks(hir);
  log({kind: 'hir', name: 'MergeConsecutiveBlocks', value: hir});

  assertConsistentIdentifiers(hir);
  log({kind: 'debug', name: 'AssertConsistentIdentifiers', value: 'ok'});
  assertTerminalSuccessorsExist(hir);
  log({kind: 'debug', name: 'AssertTerminalSuccessorsExist', value: 'ok'});

  enterSSA(hir);
  log({kind: 'hir', name: 'SSA', value: hir});

  eliminateRedundantPhi(hir);
  log({kind: 'hir', name: 'EliminateRedundantPhi', value: hir});

  assertConsistentIdentifiers(hir);
  log({kind: 'debug', name: 'AssertConsistentIdentifiers', value: 'ok'});

  constantPropagation(hir);
  log({kind: 'hir', name: 'ConstantPropagation', value: hir});

  inferTypes(hir);
  log({kind: 'hir', name: 'InferTypes', value: hir});

  if (env.enableValidations) {
    if (env.config.validateHooksUsage) {
      validateHooksUsage(hir);
      log({kind: 'debug', name: 'ValidateHooksUsage', value: 'ok'});
    }
    if (env.config.validateNoCapitalizedCalls) {
      validateNoCapitalizedCalls(hir);
      log({kind: 'debug', name: 'ValidateNoCapitalizedCalls', value: 'ok'});
    }
  }

  optimizePropsMethodCalls(hir);
  log({kind: 'hir', name: 'OptimizePropsMethodCalls', value: hir});

  analyseFunctions(hir);
  log({kind: 'hir', name: 'AnalyseFunctions', value: hir});

  inferMutationAliasingEffects(hir);
  log({kind: 'hir', name: 'InferMutationAliasingEffects', value: hir});

  if (env.outputMode === 'ssr') {
    optimizeForSSR(hir);
    log({kind: 'hir', name: 'OptimizeForSSR', value: hir});
  }

  // Note: Has to come after infer reference effects because "dead" code may still affect inference
  deadCodeElimination(hir);
  log({kind: 'hir', name: 'DeadCodeElimination', value: hir});
  pruneMaybeThrows(hir);
  log({kind: 'hir', name: 'PruneMaybeThrows', value: hir});

  inferMutationAliasingRanges(hir, {
    isFunctionExpression: false,
  });
  log({kind: 'hir', name: 'InferMutationAliasingRanges', value: hir});
  if (env.enableValidations) {
    validateLocalsNotReassignedAfterRender(hir);
    log({
      kind: 'debug',
      name: 'ValidateLocalsNotReassignedAfterRender',
      value: 'ok',
    });

    if (env.config.assertValidMutableRanges) {
      assertValidMutableRanges(hir);
      log({kind: 'debug', name: 'AssertValidMutableRanges', value: 'ok'});
    }

    if (env.config.validateRefAccessDuringRender) {
      validateNoRefAccessInRender(hir);
      log({kind: 'debug', name: 'ValidateNoRefAccessInRender', value: 'ok'});
    }

    if (env.config.validateNoSetStateInRender) {
      validateNoSetStateInRender(hir);
      log({kind: 'debug', name: 'ValidateNoSetStateInRender', value: 'ok'});
    }

    if (
      env.config.validateNoDerivedComputationsInEffects_exp &&
      env.outputMode === 'lint'
    ) {
      env.logErrors(validateNoDerivedComputationsInEffects_exp(hir));
      log({
        kind: 'debug',
        name: 'ValidateNoDerivedComputationsInEffects',
        value: 'ok',
      });
    } else if (env.config.validateNoDerivedComputationsInEffects) {
      validateNoDerivedComputationsInEffects(hir);
      log({
        kind: 'debug',
        name: 'ValidateNoDerivedComputationsInEffects',
        value: 'ok',
      });
    }

    if (env.config.validateNoSetStateInEffects && env.outputMode === 'lint') {
      env.logErrors(validateNoSetStateInEffects(hir, env));
      log({kind: 'debug', name: 'ValidateNoSetStateInEffects', value: 'ok'});
    }

    if (env.config.validateNoJSXInTryStatements && env.outputMode === 'lint') {
      env.logErrors(validateNoJSXInTryStatement(hir));
      log({kind: 'debug', name: 'ValidateNoJSXInTryStatement', value: 'ok'});
    }

    validateNoFreezingKnownMutableFunctions(hir);
    log({
      kind: 'debug',
      name: 'ValidateNoFreezingKnownMutableFunctions',
      value: 'ok',
    });
  }

  inferReactivePlaces(hir);
  log({kind: 'hir', name: 'InferReactivePlaces', value: hir});

  if (env.enableValidations) {
    if (
      env.config.validateExhaustiveMemoizationDependencies ||
      env.config.validateExhaustiveEffectDependencies
    ) {
      // NOTE: this relies on reactivity inference running first
      validateExhaustiveDependencies(hir);
      log({kind: 'debug', name: 'ValidateExhaustiveDependencies', value: 'ok'});
    }
  }

  rewriteInstructionKindsBasedOnReassignment(hir);
  log({
    kind: 'hir',
    name: 'RewriteInstructionKindsBasedOnReassignment',
    value: hir,
  });

  if (
    env.enableValidations &&
    env.config.validateStaticComponents &&
    env.outputMode === 'lint'
  ) {
    env.logErrors(validateStaticComponents(hir));
    log({kind: 'debug', name: 'ValidateStaticComponents', value: 'ok'});
  }

  if (env.enableMemoization) {
    /**
     * Only create reactive scopes (which directly map to generated memo blocks)
     * if inferred memoization is enabled. This makes all later passes which
     * transform reactive-scope labeled instructions no-ops.
     */
    inferReactiveScopeVariables(hir);
    log({kind: 'hir', name: 'InferReactiveScopeVariables', value: hir});
  }

  const fbtOperands = memoizeFbtAndMacroOperandsInSameScope(hir);
  log({
    kind: 'hir',
    name: 'MemoizeFbtAndMacroOperandsInSameScope',
    value: hir,
  });

  if (env.config.enableJsxOutlining) {
    outlineJSX(hir);
  }

  if (env.config.enableNameAnonymousFunctions) {
    nameAnonymousFunctions(hir);
    log({
      kind: 'hir',
      name: 'NameAnonymousFunctions',
      value: hir,
    });
  }

  if (env.config.enableFunctionOutlining) {
    outlineFunctions(hir, fbtOperands);
    log({kind: 'hir', name: 'OutlineFunctions', value: hir});
  }

  alignMethodCallScopes(hir);
  log({
    kind: 'hir',
    name: 'AlignMethodCallScopes',
    value: hir,
  });

  alignObjectMethodScopes(hir);
  log({
    kind: 'hir',
    name: 'AlignObjectMethodScopes',
    value: hir,
  });

  pruneUnusedLabelsHIR(hir);
  log({
    kind: 'hir',
    name: 'PruneUnusedLabelsHIR',
    value: hir,
  });

  alignReactiveScopesToBlockScopesHIR(hir);
  log({
    kind: 'hir',
    name: 'AlignReactiveScopesToBlockScopesHIR',
    value: hir,
  });

  mergeOverlappingReactiveScopesHIR(hir);
  log({
    kind: 'hir',
    name: 'MergeOverlappingReactiveScopesHIR',
    value: hir,
  });
  assertValidBlockNesting(hir);
  log({kind: 'debug', name: 'AssertValidBlockNesting', value: 'ok'});

  buildReactiveScopeTerminalsHIR(hir);
  log({
    kind: 'hir',
    name: 'BuildReactiveScopeTerminalsHIR',
    value: hir,
  });

  assertValidBlockNesting(hir);
  log({kind: 'debug', name: 'AssertValidBlockNesting', value: 'ok'});

  flattenReactiveLoopsHIR(hir);
  log({
    kind: 'hir',
    name: 'FlattenReactiveLoopsHIR',
    value: hir,
  });

  flattenScopesWithHooksOrUseHIR(hir);
  log({
    kind: 'hir',
    name: 'FlattenScopesWithHooksOrUseHIR',
    value: hir,
  });
  assertTerminalSuccessorsExist(hir);
  log({kind: 'debug', name: 'AssertTerminalSuccessorsExist', value: 'ok'});
  assertTerminalPredsExist(hir);
  log({kind: 'debug', name: 'AssertTerminalPredsExist', value: 'ok'});

  propagateScopeDependenciesHIR(hir);
  log({
    kind: 'hir',
    name: 'PropagateScopeDependenciesHIR',
    value: hir,
  });

  const reactiveFunction = buildReactiveFunction(hir);
  log({
    kind: 'reactive',
    name: 'BuildReactiveFunction',
    value: reactiveFunction,
  });

  assertWellFormedBreakTargets(reactiveFunction);
  log({kind: 'debug', name: 'AssertWellFormedBreakTargets', value: 'ok'});

  pruneUnusedLabels(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PruneUnusedLabels',
    value: reactiveFunction,
  });
  assertScopeInstructionsWithinScopes(reactiveFunction);
  log({
    kind: 'debug',
    name: 'AssertScopeInstructionsWithinScopes',
    value: 'ok',
  });

  pruneNonEscapingScopes(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PruneNonEscapingScopes',
    value: reactiveFunction,
  });

  pruneNonReactiveDependencies(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PruneNonReactiveDependencies',
    value: reactiveFunction,
  });

  pruneUnusedScopes(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PruneUnusedScopes',
    value: reactiveFunction,
  });

  mergeReactiveScopesThatInvalidateTogether(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'MergeReactiveScopesThatInvalidateTogether',
    value: reactiveFunction,
  });

  pruneAlwaysInvalidatingScopes(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PruneAlwaysInvalidatingScopes',
    value: reactiveFunction,
  });

  propagateEarlyReturns(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PropagateEarlyReturns',
    value: reactiveFunction,
  });

  pruneUnusedLValues(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PruneUnusedLValues',
    value: reactiveFunction,
  });

  promoteUsedTemporaries(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PromoteUsedTemporaries',
    value: reactiveFunction,
  });

  extractScopeDeclarationsFromDestructuring(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'ExtractScopeDeclarationsFromDestructuring',
    value: reactiveFunction,
  });

  stabilizeBlockIds(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'StabilizeBlockIds',
    value: reactiveFunction,
  });

  const uniqueIdentifiers = renameVariables(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'RenameVariables',
    value: reactiveFunction,
  });

  pruneHoistedContexts(reactiveFunction);
  log({
    kind: 'reactive',
    name: 'PruneHoistedContexts',
    value: reactiveFunction,
  });

  if (
    env.config.enablePreserveExistingMemoizationGuarantees ||
    env.config.validatePreserveExistingMemoizationGuarantees
  ) {
    validatePreservedManualMemoization(reactiveFunction);
    log({
      kind: 'debug',
      name: 'ValidatePreservedManualMemoization',
      value: 'ok',
    });
  }

  const ast = codegenFunction(reactiveFunction, {
    uniqueIdentifiers,
    fbtOperands,
  });
  log({kind: 'ast', name: 'Codegen', value: ast});
  for (const outlined of ast.outlined) {
    log({kind: 'ast', name: 'Codegen (outlined)', value: outlined.fn});
  }

  if (env.config.validateSourceLocations) {
    validateSourceLocations(func, ast, env);
  }

  /**
   * This flag should be only set for unit / fixture tests to check
   * that Forget correctly handles unexpected errors (e.g. exceptions
   * thrown by babel functions or other unexpected exceptions).
   */
  if (env.config.throwUnknownException__testonly) {
    throw new Error('unexpected error');
  }

  if (env.hasErrors()) {
    return Err(env.aggregateErrors());
  }
  return Ok(ast);
}

export function compileFn(
  func: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
  config: EnvironmentConfig,
  fnType: ReactFunctionType,
  mode: CompilerOutputMode,
  programContext: ProgramContext,
  logger: Logger | null,
  filename: string | null,
  code: string | null,
): Result<CodegenFunction, CompilerError> {
  return run(
    func,
    config,
    fnType,
    mode,
    programContext,
    logger,
    filename,
    code,
  );
}

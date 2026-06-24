/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * TS test binary for the Rust port testing infrastructure.
 *
 * Implements the compiler pipeline independently (NOT using compile() or
 * runWithEnvironment()), calling each pass function directly in the same
 * sequence as the Rust binary. This ensures both sides have exactly matching
 * behavior.
 *
 * Takes a compiler pass name and a fixture path, finds every top-level
 * function, runs the pipeline up to the target pass for each, and prints
 * a detailed debug representation to stdout.
 *
 * Usage: npx tsx compiler/scripts/ts-compile-fixture.mjs <pass> <fixture-path>
 */

import {parse} from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse: typeof _traverse = (_traverse as any).default || _traverse;
import * as t from '@babel/types';
import {type NodePath} from '@babel/traverse';
import fs from 'fs';
import path from 'path';

// --- Import pass functions directly from compiler source ---
import {lower} from '../packages/babel-plugin-react-compiler/src/HIR/BuildHIR';
import {
  Environment,
  type EnvironmentConfig,
  type ReactFunctionType,
} from '../packages/babel-plugin-react-compiler/src/HIR/Environment';
import {findContextIdentifiers} from '../packages/babel-plugin-react-compiler/src/HIR/FindContextIdentifiers';
import {mergeConsecutiveBlocks} from '../packages/babel-plugin-react-compiler/src/HIR/MergeConsecutiveBlocks';
import {
  assertConsistentIdentifiers,
  assertTerminalSuccessorsExist,
  assertTerminalPredsExist,
} from '../packages/babel-plugin-react-compiler/src/HIR';
import {assertValidBlockNesting} from '../packages/babel-plugin-react-compiler/src/HIR/AssertValidBlockNesting';
import {assertValidMutableRanges} from '../packages/babel-plugin-react-compiler/src/HIR/AssertValidMutableRanges';
import {pruneUnusedLabelsHIR} from '../packages/babel-plugin-react-compiler/src/HIR/PruneUnusedLabelsHIR';
import {mergeOverlappingReactiveScopesHIR} from '../packages/babel-plugin-react-compiler/src/HIR/MergeOverlappingReactiveScopesHIR';
import {buildReactiveScopeTerminalsHIR} from '../packages/babel-plugin-react-compiler/src/HIR/BuildReactiveScopeTerminalsHIR';
import {alignReactiveScopesToBlockScopesHIR} from '../packages/babel-plugin-react-compiler/src/ReactiveScopes/AlignReactiveScopesToBlockScopesHIR';
import {flattenReactiveLoopsHIR} from '../packages/babel-plugin-react-compiler/src/ReactiveScopes/FlattenReactiveLoopsHIR';
import {flattenScopesWithHooksOrUseHIR} from '../packages/babel-plugin-react-compiler/src/ReactiveScopes/FlattenScopesWithHooksOrUseHIR';
import {propagateScopeDependenciesHIR} from '../packages/babel-plugin-react-compiler/src/HIR/PropagateScopeDependenciesHIR';

import {
  pruneMaybeThrows,
  constantPropagation,
  deadCodeElimination,
} from '../packages/babel-plugin-react-compiler/src/Optimization';
import {optimizePropsMethodCalls} from '../packages/babel-plugin-react-compiler/src/Optimization/OptimizePropsMethodCalls';
import {outlineFunctions} from '../packages/babel-plugin-react-compiler/src/Optimization/OutlineFunctions';
import {optimizeForSSR} from '../packages/babel-plugin-react-compiler/src/Optimization/OptimizeForSSR';

import {
  enterSSA,
  eliminateRedundantPhi,
  rewriteInstructionKindsBasedOnReassignment,
} from '../packages/babel-plugin-react-compiler/src/SSA';
import {inferTypes} from '../packages/babel-plugin-react-compiler/src/TypeInference';

import {
  analyseFunctions,
  dropManualMemoization,
  inferReactivePlaces,
  inlineImmediatelyInvokedFunctionExpressions,
} from '../packages/babel-plugin-react-compiler/src/Inference';
import {inferMutationAliasingEffects} from '../packages/babel-plugin-react-compiler/src/Inference/InferMutationAliasingEffects';
import {inferMutationAliasingRanges} from '../packages/babel-plugin-react-compiler/src/Inference/InferMutationAliasingRanges';

import {
  buildReactiveFunction,
  inferReactiveScopeVariables,
  memoizeFbtAndMacroOperandsInSameScope,
  promoteUsedTemporaries,
  propagateEarlyReturns,
  pruneHoistedContexts,
  pruneNonEscapingScopes,
  pruneNonReactiveDependencies,
  pruneUnusedLValues,
  pruneUnusedLabels,
  pruneUnusedScopes,
  mergeReactiveScopesThatInvalidateTogether,
  renameVariables,
  extractScopeDeclarationsFromDestructuring,
  codegenFunction,
  alignObjectMethodScopes,
} from '../packages/babel-plugin-react-compiler/src/ReactiveScopes';
import {alignMethodCallScopes} from '../packages/babel-plugin-react-compiler/src/ReactiveScopes/AlignMethodCallScopes';
import {pruneAlwaysInvalidatingScopes} from '../packages/babel-plugin-react-compiler/src/ReactiveScopes/PruneAlwaysInvalidatingScopes';
import {stabilizeBlockIds} from '../packages/babel-plugin-react-compiler/src/ReactiveScopes/StabilizeBlockIds';

import {nameAnonymousFunctions} from '../packages/babel-plugin-react-compiler/src/Transform/NameAnonymousFunctions';

import {
  validateContextVariableLValues,
  validateHooksUsage,
  validateNoCapitalizedCalls,
  validateNoRefAccessInRender,
  validateNoSetStateInRender,
  validatePreservedManualMemoization,
  validateUseMemo,
} from '../packages/babel-plugin-react-compiler/src/Validation';
import {validateLocalsNotReassignedAfterRender} from '../packages/babel-plugin-react-compiler/src/Validation/ValidateLocalsNotReassignedAfterRender';
import {validateNoFreezingKnownMutableFunctions} from '../packages/babel-plugin-react-compiler/src/Validation/ValidateNoFreezingKnownMutableFunctions';

import {CompilerError} from '../packages/babel-plugin-react-compiler/src/CompilerError';
import {type HIRFunction} from '../packages/babel-plugin-react-compiler/src/HIR/HIR';

import {parseConfigPragmaForTests} from '../packages/babel-plugin-react-compiler/src/Utils/TestUtils';
import {
  parsePluginOptions,
  ProgramContext,
} from '../packages/babel-plugin-react-compiler/src/Entrypoint';

import {debugPrintHIR} from './debug-print-hir.mjs';
import {debugPrintReactive} from './debug-print-reactive.mjs';
import {debugPrintError} from './debug-print-error.mjs';

// --- Arguments ---
const [passArg, fixturePath] = process.argv.slice(2);

if (!passArg || !fixturePath) {
  console.error(
    'Usage: npx tsx compiler/scripts/ts-compile-fixture.mjs <pass> <fixture-path>',
  );
  process.exit(1);
}

// --- Valid pass names (checkpoint names) ---
const VALID_PASSES = new Set([
  'HIR',
  'PruneMaybeThrows',
  'DropManualMemoization',
  'InlineIIFEs',
  'MergeConsecutiveBlocks',
  'SSA',
  'EliminateRedundantPhi',
  'ConstantPropagation',
  'InferTypes',
  'OptimizePropsMethodCalls',
  'AnalyseFunctions',
  'InferMutationAliasingEffects',
  'OptimizeForSSR',
  'DeadCodeElimination',
  'PruneMaybeThrows2',
  'InferMutationAliasingRanges',
  'InferReactivePlaces',
  'RewriteInstructionKinds',
  'InferReactiveScopeVariables',
  'MemoizeFbtOperands',
  'NameAnonymousFunctions',
  'OutlineFunctions',
  'AlignMethodCallScopes',
  'AlignObjectMethodScopes',
  'PruneUnusedLabelsHIR',
  'AlignReactiveScopesToBlockScopes',
  'MergeOverlappingReactiveScopes',
  'BuildReactiveScopeTerminals',
  'FlattenReactiveLoops',
  'FlattenScopesWithHooksOrUse',
  'PropagateScopeDependencies',
  'BuildReactiveFunction',
  'PruneUnusedLabels',
  'PruneNonEscapingScopes',
  'PruneNonReactiveDependencies',
  'PruneUnusedScopes',
  'MergeReactiveScopesThatInvalidateTogether',
  'PruneAlwaysInvalidatingScopes',
  'PropagateEarlyReturns',
  'PruneUnusedLValues',
  'PromoteUsedTemporaries',
  'ExtractScopeDeclarationsFromDestructuring',
  'StabilizeBlockIds',
  'RenameVariables',
  'PruneHoistedContexts',
  'Codegen',
]);

if (!VALID_PASSES.has(passArg)) {
  console.error(`Unknown pass: ${passArg}`);
  console.error(`Valid passes: ${[...VALID_PASSES].join(', ')}`);
  process.exit(1);
}

// --- Read fixture source ---
const source = fs.readFileSync(fixturePath, 'utf8');
const firstLine = source.substring(0, source.indexOf('\n'));

// Determine language and source type
const language = firstLine.includes('@flow') ? 'flow' : 'typescript';
const sourceType = firstLine.includes('@script') ? 'script' : 'module';

// --- Parse config pragmas ---
const parsedOpts = parseConfigPragmaForTests(firstLine, {
  compilationMode: 'all',
});
const envConfig: EnvironmentConfig = {
  ...parsedOpts.environment,
  assertValidMutableRanges: true,
};

// --- Parse the fixture ---
const plugins: Array<any> =
  language === 'flow' ? ['flow', 'jsx'] : ['typescript', 'jsx'];
const inputAst = parse(source, {
  sourceFilename: path.basename(fixturePath),
  plugins,
  sourceType,
  errorRecovery: true,
});

// --- Find ALL top-level functions ---
const functionPaths: Array<
  NodePath<
    t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
  >
> = [];
let programPath: NodePath<t.Program> | null = null;

traverse(inputAst, {
  Program(nodePath: NodePath<t.Program>) {
    programPath = nodePath;
  },
  'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(
    nodePath: NodePath<
      t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
    >,
  ) {
    if (isTopLevelFunction(nodePath)) {
      functionPaths.push(nodePath);
      nodePath.skip();
    }
  },
  ClassDeclaration(nodePath: NodePath<t.ClassDeclaration>) {
    nodePath.skip();
  },
  ClassExpression(nodePath: NodePath<t.ClassExpression>) {
    nodePath.skip();
  },
});

function isTopLevelFunction(fnPath: NodePath): boolean {
  let current = fnPath;
  while (current.parentPath) {
    const parent = current.parentPath;
    if (parent.isProgram()) {
      return true;
    }
    if (parent.isVariableDeclarator()) {
      current = parent;
      continue;
    }
    if (parent.isVariableDeclaration()) {
      current = parent;
      continue;
    }
    if (
      parent.isExportNamedDeclaration() ||
      parent.isExportDefaultDeclaration()
    ) {
      current = parent;
      continue;
    }
    return false;
  }
  return false;
}

if (functionPaths.length === 0) {
  console.error('No top-level functions found in fixture');
  process.exit(1);
}

// --- Compile each function ---
const filename = '/' + path.basename(fixturePath);
const allOutputs: string[] = [];

for (const fnPath of functionPaths) {
  const output = compileOneFunction(fnPath);
  if (output != null) {
    allOutputs.push(output);
  }
}

// --- Write output ---
if (allOutputs.length === 0) {
  console.error('No functions produced output');
  process.exit(1);
}
const finalOutput = allOutputs.join('\n---\n');
process.stdout.write(finalOutput);
if (!finalOutput.endsWith('\n')) {
  process.stdout.write('\n');
}

// --- Run the pipeline for a single function, mirroring Rust's run_pipeline ---
function compileOneFunction(
  fnPath: NodePath<
    t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
  >,
): string | null {
  const contextIdentifiers = findContextIdentifiers(fnPath);
  const env = new Environment(
    fnPath.scope,
    'Other' as ReactFunctionType,
    'client', // outputMode
    envConfig,
    contextIdentifiers,
    fnPath,
    null, // logger
    filename,
    source,
    new ProgramContext({
      program: programPath!,
      opts: parsedOpts,
      filename,
      code: source,
      suppressions: [],
      hasModuleScopeOptOut: false,
    }),
  );

  const pass = passArg;

  function formatEnvErrors(): string {
    return debugPrintError(env.aggregateErrors());
  }

  function printHIR(hir: HIRFunction): string {
    return debugPrintHIR(null, hir);
  }

  function checkpointHIR(hir: HIRFunction): string {
    if (env.hasErrors()) {
      return formatEnvErrors();
    }
    return printHIR(hir);
  }

  try {
    // --- HIR Phase ---
    const hir = lower(fnPath, env);
    if (pass === 'HIR') {
      return checkpointHIR(hir);
    }

    pruneMaybeThrows(hir);
    if (pass === 'PruneMaybeThrows') {
      return checkpointHIR(hir);
    }

    validateContextVariableLValues(hir);
    validateUseMemo(hir);

    if (env.enableDropManualMemoization) {
      dropManualMemoization(hir);
    }
    if (pass === 'DropManualMemoization') {
      return checkpointHIR(hir);
    }

    inlineImmediatelyInvokedFunctionExpressions(hir);
    if (pass === 'InlineIIFEs') {
      return checkpointHIR(hir);
    }

    mergeConsecutiveBlocks(hir);
    if (pass === 'MergeConsecutiveBlocks') {
      return checkpointHIR(hir);
    }

    assertConsistentIdentifiers(hir);
    assertTerminalSuccessorsExist(hir);

    enterSSA(hir);
    if (pass === 'SSA') {
      return checkpointHIR(hir);
    }

    eliminateRedundantPhi(hir);
    if (pass === 'EliminateRedundantPhi') {
      return checkpointHIR(hir);
    }

    assertConsistentIdentifiers(hir);

    constantPropagation(hir);
    if (pass === 'ConstantPropagation') {
      return checkpointHIR(hir);
    }

    inferTypes(hir);
    if (pass === 'InferTypes') {
      return checkpointHIR(hir);
    }

    if (env.enableValidations) {
      if (env.config.validateHooksUsage) {
        validateHooksUsage(hir);
      }
      if (env.config.validateNoCapitalizedCalls) {
        validateNoCapitalizedCalls(hir);
      }
    }

    optimizePropsMethodCalls(hir);
    if (pass === 'OptimizePropsMethodCalls') {
      return checkpointHIR(hir);
    }

    analyseFunctions(hir);
    if (pass === 'AnalyseFunctions') {
      return checkpointHIR(hir);
    }

    inferMutationAliasingEffects(hir);
    if (pass === 'InferMutationAliasingEffects') {
      return checkpointHIR(hir);
    }

    if (env.outputMode === 'ssr') {
      optimizeForSSR(hir);
    }
    if (pass === 'OptimizeForSSR') {
      return checkpointHIR(hir);
    }

    deadCodeElimination(hir);
    if (pass === 'DeadCodeElimination') {
      return checkpointHIR(hir);
    }

    pruneMaybeThrows(hir);
    if (pass === 'PruneMaybeThrows2') {
      return checkpointHIR(hir);
    }

    inferMutationAliasingRanges(hir, {isFunctionExpression: false});
    if (pass === 'InferMutationAliasingRanges') {
      return checkpointHIR(hir);
    }

    if (env.enableValidations) {
      validateLocalsNotReassignedAfterRender(hir);

      if (env.config.assertValidMutableRanges) {
        assertValidMutableRanges(hir);
      }

      if (env.config.validateRefAccessDuringRender) {
        validateNoRefAccessInRender(hir);
      }

      if (env.config.validateNoSetStateInRender) {
        validateNoSetStateInRender(hir);
      }

      validateNoFreezingKnownMutableFunctions(hir);
    }

    inferReactivePlaces(hir);
    if (pass === 'InferReactivePlaces') {
      return checkpointHIR(hir);
    }

    rewriteInstructionKindsBasedOnReassignment(hir);
    if (pass === 'RewriteInstructionKinds') {
      return checkpointHIR(hir);
    }

    if (env.enableMemoization) {
      inferReactiveScopeVariables(hir);
    }
    if (pass === 'InferReactiveScopeVariables') {
      return checkpointHIR(hir);
    }

    const fbtOperands = memoizeFbtAndMacroOperandsInSameScope(hir);
    if (pass === 'MemoizeFbtOperands') {
      return checkpointHIR(hir);
    }

    if (env.config.enableNameAnonymousFunctions) {
      nameAnonymousFunctions(hir);
    }
    if (pass === 'NameAnonymousFunctions') {
      return checkpointHIR(hir);
    }

    if (env.config.enableFunctionOutlining) {
      outlineFunctions(hir, fbtOperands);
    }
    if (pass === 'OutlineFunctions') {
      return checkpointHIR(hir);
    }

    alignMethodCallScopes(hir);
    if (pass === 'AlignMethodCallScopes') {
      return checkpointHIR(hir);
    }

    alignObjectMethodScopes(hir);
    if (pass === 'AlignObjectMethodScopes') {
      return checkpointHIR(hir);
    }

    pruneUnusedLabelsHIR(hir);
    if (pass === 'PruneUnusedLabelsHIR') {
      return checkpointHIR(hir);
    }

    alignReactiveScopesToBlockScopesHIR(hir);
    if (pass === 'AlignReactiveScopesToBlockScopes') {
      return checkpointHIR(hir);
    }

    mergeOverlappingReactiveScopesHIR(hir);
    if (pass === 'MergeOverlappingReactiveScopes') {
      return checkpointHIR(hir);
    }

    assertValidBlockNesting(hir);

    buildReactiveScopeTerminalsHIR(hir);
    if (pass === 'BuildReactiveScopeTerminals') {
      return checkpointHIR(hir);
    }

    assertValidBlockNesting(hir);

    flattenReactiveLoopsHIR(hir);
    if (pass === 'FlattenReactiveLoops') {
      return checkpointHIR(hir);
    }

    flattenScopesWithHooksOrUseHIR(hir);
    if (pass === 'FlattenScopesWithHooksOrUse') {
      return checkpointHIR(hir);
    }

    assertTerminalSuccessorsExist(hir);
    assertTerminalPredsExist(hir);

    propagateScopeDependenciesHIR(hir);
    if (pass === 'PropagateScopeDependencies') {
      return checkpointHIR(hir);
    }

    // --- Reactive Phase ---
    const reactiveFunction = buildReactiveFunction(hir);
    if (pass === 'BuildReactiveFunction') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    pruneUnusedLabels(reactiveFunction);
    if (pass === 'PruneUnusedLabels') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    pruneNonEscapingScopes(reactiveFunction);
    if (pass === 'PruneNonEscapingScopes') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    pruneNonReactiveDependencies(reactiveFunction);
    if (pass === 'PruneNonReactiveDependencies') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    pruneUnusedScopes(reactiveFunction);
    if (pass === 'PruneUnusedScopes') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    mergeReactiveScopesThatInvalidateTogether(reactiveFunction);
    if (pass === 'MergeReactiveScopesThatInvalidateTogether') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    pruneAlwaysInvalidatingScopes(reactiveFunction);
    if (pass === 'PruneAlwaysInvalidatingScopes') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    propagateEarlyReturns(reactiveFunction);
    if (pass === 'PropagateEarlyReturns') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    pruneUnusedLValues(reactiveFunction);
    if (pass === 'PruneUnusedLValues') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    promoteUsedTemporaries(reactiveFunction);
    if (pass === 'PromoteUsedTemporaries') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    extractScopeDeclarationsFromDestructuring(reactiveFunction);
    if (pass === 'ExtractScopeDeclarationsFromDestructuring') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    stabilizeBlockIds(reactiveFunction);
    if (pass === 'StabilizeBlockIds') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    const uniqueIdentifiers = renameVariables(reactiveFunction);
    if (pass === 'RenameVariables') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    pruneHoistedContexts(reactiveFunction);
    if (pass === 'PruneHoistedContexts') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return debugPrintReactive(null, reactiveFunction);
    }

    if (
      env.config.enablePreserveExistingMemoizationGuarantees ||
      env.config.validatePreserveExistingMemoizationGuarantees
    ) {
      validatePreservedManualMemoization(reactiveFunction);
    }

    const ast = codegenFunction(reactiveFunction, {
      uniqueIdentifiers,
      fbtOperands,
    });
    if (pass === 'Codegen') {
      if (env.hasErrors()) {
        return formatEnvErrors();
      }
      return '(codegen ast)';
    }

    return null;
  } catch (e) {
    if (e instanceof CompilerError) {
      return debugPrintError(e);
    }
    throw e;
  }
}

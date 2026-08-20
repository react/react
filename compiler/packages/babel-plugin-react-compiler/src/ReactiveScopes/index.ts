/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export {alignObjectMethodScopes} from './AlignObjectMethodScopes';
export {assertScopeInstructionsWithinScopes} from './AssertScopeInstructionsWithinScope';
export {assertWellFormedBreakTargets} from './AssertWellFormedBreakTargets';
export {buildReactiveFunction} from './BuildReactiveFunction';
export {codegenFunction, type CodegenFunction} from './CodegenReactiveFunction';
export {extractScopeDeclarationsFromDestructuring} from './ExtractScopeDeclarationsFromDestructuring';
export {inferReactiveScopeVariables} from './InferReactiveScopeVariables';
export {memoizeFbtAndMacroOperandsInSameScope} from './MemoizeFbtAndMacroOperandsInSameScope';
export {mergeReactiveScopesThatInvalidateTogether} from './MergeReactiveScopesThatInvalidateTogether';
export {
  printReactiveFunction,
  printReactiveFunctionWithOutlined,
} from './PrintReactiveFunction';
export {promoteUsedTemporaries} from './PromoteUsedTemporaries';
export {propagateEarlyReturns} from './PropagateEarlyReturns';
export {pruneAllReactiveScopes} from './PruneAllReactiveScopes';
export {pruneHoistedContexts} from './PruneHoistedContexts';
export {pruneNonEscapingScopes} from './PruneNonEscapingScopes';
export {pruneNonReactiveDependencies} from './PruneNonReactiveDependencies';
export {pruneUnusedLValues} from './PruneTemporaryLValues';
export {pruneUnusedLabels} from './PruneUnusedLabels';
export {pruneUnusedScopes} from './PruneUnusedScopes';
export {renameVariables} from './RenameVariables';
export {stabilizeBlockIds} from './StabilizeBlockIds';
export {
  ReactiveFunctionTransform,
  eachReactiveValueOperand,
  visitReactiveFunction,
  type Transformed,
} from './visitors';

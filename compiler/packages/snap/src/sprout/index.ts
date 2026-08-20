/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {EvaluatorResult, doEval} from './evaluator';

export type SproutResult =
  | {kind: 'success'; value: string}
  | {kind: 'invalid'; value: string};

function stringify(result: EvaluatorResult): string {
  return `(kind: ${result.kind}) ${result.value}${
    result.logs.length > 0 ? `\nlogs: [${result.logs.toString()}]` : ''
  }`;
}
function makeError(description: string, value: string): SproutResult {
  return {
    kind: 'invalid',
    value: description + '\n' + value,
  };
}
function logsEqual(a: Array<string>, b: Array<string>) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((val, idx) => val === b[idx]);
}
export function runSprout(
  originalCode: string,
  forgetCode: string,
): SproutResult {
  let forgetResult;
  try {
    (globalThis as any).__SNAP_EVALUATOR_MODE = 'forget';
    forgetResult = doEval(forgetCode);
  } catch (e) {
    throw e;
  } finally {
    (globalThis as any).__SNAP_EVALUATOR_MODE = undefined;
  }
  if (forgetResult.kind === 'UnexpectedError') {
    return makeError('Unexpected error in Forget runner', forgetResult.value);
  }
  if (originalCode.indexOf('@disableNonForgetInSprout') === -1) {
    const nonForgetResult = doEval(originalCode);

    if (nonForgetResult.kind === 'UnexpectedError') {
      return makeError(
        'Unexpected error in non-forget runner',
        nonForgetResult.value,
      );
    } else if (
      forgetResult.kind !== nonForgetResult.kind ||
      forgetResult.value !== nonForgetResult.value ||
      !logsEqual(forgetResult.logs, nonForgetResult.logs)
    ) {
      return makeError(
        'Found differences in evaluator results',
        `Non-forget (expected):
${stringify(nonForgetResult)}
Forget:
${stringify(forgetResult)}
`,
      );
    }
  }
  return {
    kind: 'success',
    value: stringify(forgetResult),
  };
}

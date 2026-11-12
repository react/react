/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Some environments disallow eval() but can still evaluate code in a scoped way
// during development, such as workerd's UnsafeEval binding. Dev tooling can install
// such an evaluator on this global so that React can use it for its debug-only
// features without having to enable eval() for all code.
const DEBUG_EVAL_HOOK: symbol = Symbol.for('react.debug_eval');

// Evaluates code in the global scope like an indirect eval.
export function evalInDEV(code: string): any {
  if (__DEV__) {
    const debugEval = (globalThis as any)[DEBUG_EVAL_HOOK];
    if (typeof debugEval === 'function') {
      return debugEval(code);
    }
    // eslint-disable-next-line no-eval
    return (0, eval)(code);
  } else {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'evalInDEV should never be called in production mode. This is a bug in React.',
    );
  }
}

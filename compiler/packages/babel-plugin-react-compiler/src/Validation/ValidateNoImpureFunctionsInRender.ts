/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerDiagnostic} from '..';
import {ErrorCategory} from '../CompilerError';
import {HIRFunction} from '../HIR';
import {getFunctionCallSignature} from '../Inference/InferMutationAliasingEffects';

/**
 * Checks that known-impure functions are not called during render. Examples of invalid functions to
 * call during render are `Math.random()` and `Date.now()`. Users may extend this set of
 * impure functions via a module type provider and specifying functions with `impure: true`.
 *
 * TODO: add best-effort analysis of functions which are called during render. We have variations of
 * this in several of our validation passes and should unify those analyses into a reusable helper
 * and use it here.
 */
export function validateNoImpureFunctionsInRender(fn: HIRFunction): void {
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const value = instr.value;
      if (value.kind === 'MethodCall' || value.kind == 'CallExpression') {
        const callee =
          value.kind === 'MethodCall' ? value.property : value.callee;
        const signature = getFunctionCallSignature(
          fn.env,
          callee.identifier.type,
        );
        if (signature != null && signature.impure === true) {
          fn.env.recordError(
            CompilerDiagnostic.create({
              category: ErrorCategory.Purity,
              reason: 'Cannot call impure function during render',
              description:
                (signature.canonicalName != null
                  ? `\`${signature.canonicalName}\` is an impure function. `
                  : '') +
                'Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent)',
              suggestions: null,
            }).withDetails({
              kind: 'error',
              loc: callee.loc,
              message: 'Cannot call impure function',
            }),
          );
        }
      }
    }
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerDiagnostic, CompilerError} from '..';
import {ErrorCategory} from '../CompilerError';
import {BlockId, HIRFunction} from '../HIR';
import {Result} from '../Utils/Result';
import {retainWhere} from '../Utils/utils';

/**
 * Developers may not be aware of error boundaries and lazy evaluation of JSX, leading them
 * to use patterns such as `let el; try { el = <Component /> } catch { ... }` to attempt to
 * catch rendering errors. Such code will fail to catch errors in rendering, but developers
 * may not realize this right away.
 *
 * This validation pass validates against this pattern: specifically, it errors for JSX
 * created within a try block. JSX is allowed within a catch statement, unless that catch
 * is itself nested inside an outer try.
 */
export function validateNoJSXInTryStatement(
  fn: HIRFunction,
): Result<void, CompilerError> {
  const activeTryBlocks: Array<BlockId> = [];
  const errors = new CompilerError();
  for (const [, block] of fn.body.blocks) {
    retainWhere(activeTryBlocks, id => id !== block.id);

    if (activeTryBlocks.length !== 0) {
      for (const instr of block.instructions) {
        const {value} = instr;
        switch (value.kind) {
          case 'JsxExpression':
          case 'JsxFragment': {
            errors.pushDiagnostic(
              CompilerDiagnostic.create({
                category: ErrorCategory.ErrorBoundaries,
                reason: 'Avoid constructing JSX within try/catch',
                description: `React does not immediately render components when JSX is rendered, so any errors from this component will not be caught by the try/catch. To catch errors in rendering a given component, wrap that component in an error boundary. (https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)`,
              }).withDetails({
                kind: 'error',
                loc: value.loc,
                message: 'Avoid constructing JSX within try/catch',
              }),
            );
            break;
          }
        }
      }
    }

    if (block.terminal.kind === 'try') {
      activeTryBlocks.push(block.terminal.handler);
    }
  }
  return errors.asResult();
}

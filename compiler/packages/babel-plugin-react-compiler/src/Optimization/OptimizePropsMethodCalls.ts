/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {HIRFunction, isPropsType} from '../HIR';

/**
 * Converts method calls into regular calls where the receiver is the props object:
 *
 * Example:
 *
 * ```
 * // INPUT
 * props.foo();
 *
 * // OUTPUT
 * const t0 = props.foo;
 * t0();
 * ```
 *
 * Counter example:
 *
 * Here the receiver is `props.foo`, not the props object, so we don't rewrite it:
 *
 * // INPUT
 * props.foo.bar();
 *
 * // OUTPUT
 * props.foo.bar();
 * ```
 */
export function optimizePropsMethodCalls(fn: HIRFunction): void {
  for (const [, block] of fn.body.blocks) {
    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i]!;
      if (
        instr.value.kind === 'MethodCall' &&
        isPropsType(instr.value.receiver.identifier)
      ) {
        instr.value = {
          kind: 'CallExpression',
          callee: instr.value.property,
          args: instr.value.args,
          loc: instr.value.loc,
        };
      }
    }
  }
}

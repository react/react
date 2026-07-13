/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {BlockId, ReactiveFunction, ReactiveTerminalStatement} from '../HIR';
import {ReactiveFunctionVisitor, visitReactiveFunction} from './visitors';

/**
 * Assert that all break/continue targets reference existent labels.
 */
export function assertWellFormedBreakTargets(fn: ReactiveFunction): void {
  visitReactiveFunction(fn, new Visitor(), new Set());
}

class Visitor extends ReactiveFunctionVisitor<Set<BlockId>> {
  override visitTerminal(
    stmt: ReactiveTerminalStatement,
    seenLabels: Set<BlockId>,
  ): void {
    if (stmt.label != null) {
      seenLabels.add(stmt.label.id);
    }
    const terminal = stmt.terminal;
    if (terminal.kind === 'break' || terminal.kind === 'continue') {
      CompilerError.invariant(seenLabels.has(terminal.target), {
        reason: 'Unexpected break to invalid label',
        loc: stmt.terminal.loc,
      });
    }
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {BlockId, HIRFunction, PrunedScopeTerminal} from '../HIR';
import {assertExhaustive, retainWhere} from '../Utils/utils';

/**
 * Prunes any reactive scopes that are within a loop (for, while, etc). We don't yet
 * support memoization within loops because this would require an extra layer of reconciliation
 * (plus a way to identify values across runs, similar to how we use `key` in JSX for lists).
 * Eventually we may integrate more deeply into the runtime so that we can do a single level
 * of reconciliation, but for now we've found it's sufficient to memoize *around* the loop.
 */
export function flattenReactiveLoopsHIR(fn: HIRFunction): void {
  const activeLoops = Array<BlockId>();
  for (const [, block] of fn.body.blocks) {
    retainWhere(activeLoops, id => id !== block.id);
    const {terminal} = block;
    switch (terminal.kind) {
      case 'do-while':
      case 'for':
      case 'for-in':
      case 'for-of':
      case 'while': {
        activeLoops.push(terminal.fallthrough);
        break;
      }
      case 'scope': {
        if (activeLoops.length !== 0) {
          block.terminal = {
            kind: 'pruned-scope',
            block: terminal.block,
            fallthrough: terminal.fallthrough,
            id: terminal.id,
            loc: terminal.loc,
            scope: terminal.scope,
          } as PrunedScopeTerminal;
        }
        break;
      }
      case 'branch':
      case 'goto':
      case 'if':
      case 'label':
      case 'logical':
      case 'maybe-throw':
      case 'optional':
      case 'pruned-scope':
      case 'return':
      case 'sequence':
      case 'switch':
      case 'ternary':
      case 'throw':
      case 'try':
      case 'unreachable':
      case 'unsupported': {
        break;
      }
      default: {
        assertExhaustive(
          terminal,
          `Unexpected terminal kind \`${(terminal as any).kind}\``,
        );
      }
    }
  }
}

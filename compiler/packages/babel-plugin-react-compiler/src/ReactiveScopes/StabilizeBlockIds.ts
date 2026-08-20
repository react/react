/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  BlockId,
  ReactiveFunction,
  ReactiveScopeBlock,
  ReactiveTerminalStatement,
  makeBlockId,
} from '../HIR';
import {getOrInsertDefault} from '../Utils/utils';
import {ReactiveFunctionVisitor, visitReactiveFunction} from './visitors';

export function stabilizeBlockIds(fn: ReactiveFunction): void {
  const referenced: Set<BlockId> = new Set();
  visitReactiveFunction(fn, new CollectReferencedLabels(), referenced);

  const mappings = new Map<BlockId, BlockId>();
  for (const blockId of referenced) {
    mappings.set(blockId, makeBlockId(mappings.size));
  }

  visitReactiveFunction(fn, new RewriteBlockIds(), mappings);
}

class CollectReferencedLabels extends ReactiveFunctionVisitor<Set<BlockId>> {
  override visitScope(scope: ReactiveScopeBlock, state: Set<BlockId>): void {
    const {earlyReturnValue} = scope.scope;
    if (earlyReturnValue != null) {
      state.add(earlyReturnValue.label);
    }
    this.traverseScope(scope, state);
  }
  override visitTerminal(
    stmt: ReactiveTerminalStatement,
    state: Set<BlockId>,
  ): void {
    if (stmt.label != null) {
      if (!stmt.label.implicit) {
        state.add(stmt.label.id);
      }
    }
    this.traverseTerminal(stmt, state);
  }
}

class RewriteBlockIds extends ReactiveFunctionVisitor<Map<BlockId, BlockId>> {
  override visitScope(
    scope: ReactiveScopeBlock,
    state: Map<BlockId, BlockId>,
  ): void {
    const {earlyReturnValue} = scope.scope;
    if (earlyReturnValue != null) {
      const rewrittenId = getOrInsertDefault(
        state,
        earlyReturnValue.label,
        state.size,
      );
      earlyReturnValue.label = makeBlockId(rewrittenId);
    }
    this.traverseScope(scope, state);
  }
  override visitTerminal(
    stmt: ReactiveTerminalStatement,
    state: Map<BlockId, BlockId>,
  ): void {
    if (stmt.label != null) {
      const rewrittenId = getOrInsertDefault(state, stmt.label.id, state.size);
      stmt.label.id = makeBlockId(rewrittenId);
    }

    const terminal = stmt.terminal;
    if (terminal.kind === 'break' || terminal.kind === 'continue') {
      const rewrittenId = getOrInsertDefault(
        state,
        terminal.target,
        state.size,
      );
      terminal.target = makeBlockId(rewrittenId);
    }
    this.traverseTerminal(stmt, state);
  }
}

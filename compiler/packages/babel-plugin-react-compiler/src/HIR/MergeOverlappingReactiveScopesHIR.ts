/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  HIRFunction,
  InstructionId,
  Place,
  ReactiveScope,
  makeInstructionId,
} from '.';
import {getPlaceScope} from '../HIR/HIR';
import {isMutable} from '../ReactiveScopes/InferReactiveScopeVariables';
import DisjointSet from '../Utils/DisjointSet';
import {getOrInsertDefault} from '../Utils/utils';
import {
  eachInstructionLValue,
  eachInstructionOperand,
  eachTerminalOperand,
} from './visitors';

/**
 * While previous passes ensure that reactive scopes span valid sets of program
 * blocks, pairs of reactive scopes may still be inconsistent with respect to
 * each other.
 *
 * (a) Reactive scopes ranges must form valid blocks in the resulting javascript
 * program. Any two scopes must either be entirely disjoint or one scope must be
 * nested within the other.
 *   ```js
 *   // Scopes 1:3 and 3:5 are valid because they contain no common instructions
 *   [1] ⌝
 *   [2] ⌟
 *   [3] ⌝
 *   [4] ⌟
 *   // Scopes 1:3 and 1:5 are valid because the former is nested within the other
 *   [1] ⌝  ⌝
 *   [2] ⌟  |
 *   [3]    |
 *   [4]    ⌟
 *   // Scopes 1:4 and 2:5 are invalid because we cannot produce if-else memo
 *   // blocks representing these scopes in the output program.
 *   [1] ⌝
 *   [2] |  ⌝
 *   [3] ⌟  |
 *   [4]    ⌟
 *   ```
 *
 * (b) A scope's own instructions may only mutate that scope.
 * For each reactive scope, we currently produce exactly one if-block which
 * spans the instruction range of the scope. In this simple example, instr [2]
 * does not mutate any values but is included within scope @0.
 * ```js
 *   // IR instructions
 *   [1] (writes to scope @0's values)
 *   [2] (does not mutate anything)
 *   [3] (writes to scope @0's values)
 *
 *   // javascript output
 *   if (( scope @0's dependencies changed )) {
 *     [1]
 *     [2]
 *     [3]
 *   }
 * ```
 * Nested scopes may be modeled as a tree in which child scopes are contained
 * within parent scopes. This corresponds to nested if-else memo blocks in the
 * output program). An instruction may only mutate its own "active" scope.
 *   ```js
 *   // Active scopes for a simple program
 *   scope @0 {
 *     [0] (active scope=@0)
 *     scope @1 {
 *       [1] (active scope=@1)
 *       [2] (active scope=@1)
 *     }
 *     [3] (active scope=@0)
 *   }
 *   [4] (no active scope)
 *
 *   // In this example, scopes @0 and @1 must be merged because instr [2]'s
 *   // active scope is scope@1 but it mutates scope@0.
 *   scope @0, produces x {
 *     [0] x = []
 *     scope @1, produces y {
 *       [1] y = []
 *       [2] x.push(2)
 *       [3] y.push(3)
 *     }
 *     [3] x.push(1)
 *   }
 * ```
 *
 * As mentioned, these constraints arise entirely from the current design of
 * compiler output.
 * - instruction ordering is preserved (otherwise, disjoint ranges for scopes
 *   may be produced by reordering their mutating instructions)
 * - exactly one if-else block per scope, which does not allow the composition
 *   of a reactive scope from disconnected instruction ranges.
 */

export function mergeOverlappingReactiveScopesHIR(fn: HIRFunction): void {
  /**
   * Collect all scopes eagerly because some scopes begin before the first
   * instruction that references them (due to alignReactiveScopesToBlocks)
   */
  const scopesInfo = collectScopeInfo(fn);

  /**
   * Iterate through scopes and instructions to find which should be merged
   */
  const joinedScopes = getOverlappingReactiveScopes(fn, scopesInfo);

  /**
   * Merge scopes and rewrite all references
   */
  joinedScopes.forEach((scope, groupScope) => {
    if (scope !== groupScope) {
      groupScope.range.start = makeInstructionId(
        Math.min(groupScope.range.start, scope.range.start),
      );
      groupScope.range.end = makeInstructionId(
        Math.max(groupScope.range.end, scope.range.end),
      );
    }
  });
  for (const [place, originalScope] of scopesInfo.placeScopes) {
    const nextScope = joinedScopes.find(originalScope);
    if (nextScope !== null && nextScope !== originalScope) {
      place.identifier.scope = nextScope;
    }
  }
}

type ScopeInfo = {
  scopeStarts: Array<{id: InstructionId; scopes: Set<ReactiveScope>}>;
  scopeEnds: Array<{id: InstructionId; scopes: Set<ReactiveScope>}>;
  placeScopes: Map<Place, ReactiveScope>;
};

type TraversalState = {
  joined: DisjointSet<ReactiveScope>;
  activeScopes: Array<ReactiveScope>;
};

function collectScopeInfo(fn: HIRFunction): ScopeInfo {
  const scopeStarts: Map<InstructionId, Set<ReactiveScope>> = new Map();
  const scopeEnds: Map<InstructionId, Set<ReactiveScope>> = new Map();
  const placeScopes: Map<Place, ReactiveScope> = new Map();

  function collectPlaceScope(place: Place): void {
    const scope = place.identifier.scope;
    if (scope != null) {
      placeScopes.set(place, scope);
      /**
       * Record both mutating and non-mutating scopes to merge scopes with
       * still-mutating values with inner scopes that alias those values
       * (see `nonmutating-capture-in-unsplittable-memo-block`)
       *
       * Note that this isn't perfect, as it also leads to merging of mutating
       * scopes with JSX single-instruction scopes (see `mutation-within-jsx`)
       */
      if (scope.range.start !== scope.range.end) {
        getOrInsertDefault(scopeStarts, scope.range.start, new Set()).add(
          scope,
        );
        getOrInsertDefault(scopeEnds, scope.range.end, new Set()).add(scope);
      }
    }
  }

  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      for (const operand of eachInstructionLValue(instr)) {
        collectPlaceScope(operand);
      }
      for (const operand of eachInstructionOperand(instr)) {
        collectPlaceScope(operand);
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      collectPlaceScope(operand);
    }
  }

  return {
    scopeStarts: [...scopeStarts.entries()]
      .map(([id, scopes]) => ({id, scopes}))
      .sort((a, b) => b.id - a.id),
    scopeEnds: [...scopeEnds.entries()]
      .map(([id, scopes]) => ({id, scopes}))
      .sort((a, b) => b.id - a.id),
    placeScopes,
  };
}

function visitInstructionId(
  id: InstructionId,
  {scopeEnds, scopeStarts}: ScopeInfo,
  {activeScopes, joined}: TraversalState,
): void {
  /**
   * Handle all scopes that end at this instruction.
   */
  const scopeEndTop = scopeEnds.at(-1);
  if (scopeEndTop != null && scopeEndTop.id <= id) {
    scopeEnds.pop();

    /**
     * Match scopes that end at this instruction with our stack of active
     * scopes (from traversal state). We need to sort these in descending
     * order of start IDs because the scopes stack is ordered as such
     */
    const scopesSortedStartDescending = [...scopeEndTop.scopes].sort(
      (a, b) => b.range.start - a.range.start,
    );
    for (const scope of scopesSortedStartDescending) {
      const idx = activeScopes.indexOf(scope);
      if (idx !== -1) {
        /**
         * Detect and merge all overlapping scopes. `activeScopes` is ordered
         * by scope start, so every active scope between a completed scope s
         * and the top of the stack (1) started later than s and (2) completes after s.
         */
        if (idx !== activeScopes.length - 1) {
          joined.union([scope, ...activeScopes.slice(idx + 1)]);
        }
        activeScopes.splice(idx, 1);
      }
    }
  }

  /**
   * Handle all scopes that begin at this instruction by adding them
   * to the scopes stack
   */
  const scopeStartTop = scopeStarts.at(-1);
  if (scopeStartTop != null && scopeStartTop.id <= id) {
    scopeStarts.pop();

    const scopesSortedEndDescending = [...scopeStartTop.scopes].sort(
      (a, b) => b.range.end - a.range.end,
    );
    activeScopes.push(...scopesSortedEndDescending);
    /**
     * Merge all identical scopes (ones with the same start and end),
     * as they end up with the same reactive block
     */
    for (let i = 1; i < scopesSortedEndDescending.length; i++) {
      const prev = scopesSortedEndDescending[i - 1];
      const curr = scopesSortedEndDescending[i];
      if (prev.range.end === curr.range.end) {
        joined.union([prev, curr]);
      }
    }
  }
}

function visitPlace(
  id: InstructionId,
  place: Place,
  {activeScopes, joined}: TraversalState,
): void {
  /**
   * If an instruction mutates an outer scope, flatten all scopes from the top
   * of the stack to the mutated outer scope.
   */
  const placeScope = getPlaceScope(id, place);
  if (placeScope != null && isMutable({id}, place)) {
    const placeScopeIdx = activeScopes.indexOf(placeScope);
    if (placeScopeIdx !== -1 && placeScopeIdx !== activeScopes.length - 1) {
      joined.union([placeScope, ...activeScopes.slice(placeScopeIdx + 1)]);
    }
  }
}

function getOverlappingReactiveScopes(
  fn: HIRFunction,
  context: ScopeInfo,
): DisjointSet<ReactiveScope> {
  const state: TraversalState = {
    joined: new DisjointSet<ReactiveScope>(),
    activeScopes: [],
  };

  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      visitInstructionId(instr.id, context, state);
      for (const place of eachInstructionOperand(instr)) {
        if (
          (instr.value.kind === 'FunctionExpression' ||
            instr.value.kind === 'ObjectMethod') &&
          place.identifier.type.kind === 'Primitive'
        ) {
          continue;
        }
        visitPlace(instr.id, place, state);
      }
      for (const place of eachInstructionLValue(instr)) {
        visitPlace(instr.id, place, state);
      }
    }
    visitInstructionId(block.terminal.id, context, state);
    for (const place of eachTerminalOperand(block.terminal)) {
      visitPlace(block.terminal.id, place, state);
    }
  }

  return state.joined;
}

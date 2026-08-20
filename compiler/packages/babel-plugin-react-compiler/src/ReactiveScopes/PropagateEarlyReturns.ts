/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {visitReactiveFunction} from '.';
import {Effect} from '..';
import {
  Environment,
  GeneratedSource,
  InstructionKind,
  ReactiveFunction,
  ReactiveScope,
  ReactiveScopeBlock,
  ReactiveStatement,
  ReactiveTerminalStatement,
  makeInstructionId,
  makePropertyLiteral,
  promoteTemporary,
} from '../HIR';
import {createTemporaryPlace} from '../HIR/HIRBuilder';
import {EARLY_RETURN_SENTINEL} from './CodegenReactiveFunction';
import {ReactiveFunctionTransform, Transformed} from './visitors';

/**
 * This pass ensures that reactive blocks honor the control flow behavior of the
 * original code including early return semantics. Specifically, if a reactive
 * scope early returned during the previous execution and the inputs to that block
 * have not changed, then the code should early return (with the same value) again.
 *
 * Example:
 *
 * ```javascript
 * let x = [];
 * if (props.cond) {
 *   x.push(12);
 *   return x;
 * } else {
 *   return foo();
 * }
 * ```
 *
 * Imagine that this code is called twice in a row with props.cond = true. Both
 * times it should return the same object (===), an array `[12]`.
 *
 * The compilation strategy is as follows. For each top-level reactive scope
 * that contains (transitively) an early return:
 *
 * - Label the scope
 * - Synthesize a new temporary, eg `t0`, and set it as a declaration of the scope.
 *   This will represent the possibly-unset return value for that scope.
 * - Make the first instruction of the scope the declaration of that temporary,
 *   assigning a sentinel value (can reuse the same symbol as we use for cache slots).
 *   This assignment ensures that if we don't take an early return, that the value
 *   is the sentinel.
 * - Replace all `return` statements with:
 *   - An assignment of the temporary with the value being returned.
 *   - A `break` to the reactive scope's label.
 *
 * Finally, CodegenReactiveScope adds an if check following the reactive scope:
 * if the early return temporary value is *not* the sentinel value, we early return
 * it. Otherwise, execution continues.
 *
 * For the above example that looks roughly like:
 *
 * ```
 * let t0;
 * if (props.cond !== $[0]) {
 *   t0 = Symbol.for('react.memo_cache_sentinel');
 *   bb0: {
 *     let x = [];
 *     if (props.cond) {
 *       x.push(12);
 *       t0 = x;
 *       break bb0;
 *     } else {
 *       let t1;
 *       if ($[1] === Symbol.for('react.memo_cache_sentinel')) {
 *         t1 = foo();
 *         $[1] = t1;
 *       } else {
 *         t1 = $[1];
 *       }
 *       t0 = t1;
 *       break bb0;
 *     }
 *   }
 *   $[0] = props.cond;
 *   $[2] = t0;
 * } else {
 *   t0 = $[2];
 * }
 * // This part added in CodegenReactiveScope:
 * if (t0 !== Symbol.for('react.memo_cache_sentinel')) {
 *   return t0;
 * }
 * ```
 */
export function propagateEarlyReturns(fn: ReactiveFunction): void {
  visitReactiveFunction(fn, new Transform(fn.env), {
    withinReactiveScope: false,
    earlyReturnValue: null,
  });
}

type State = {
  /**
   * Are we within a reactive scope? We use this for two things:
   * - When we find an early return, transform it to an assign+break
   *   only if we're in a reactive scope
   * - Annotate reactive scopes that contain early returns...but only
   *   the outermost reactive scope, we can't do this for nested
   *   scopes.
   */
  withinReactiveScope: boolean;

  /**
   * Store early return information to bubble it back up to the outermost
   * reactive scope
   */
  earlyReturnValue: ReactiveScope['earlyReturnValue'];
};

class Transform extends ReactiveFunctionTransform<State> {
  env: Environment;
  constructor(env: Environment) {
    super();
    this.env = env;
  }

  override visitScope(
    scopeBlock: ReactiveScopeBlock,
    parentState: State,
  ): void {
    /**
     * Exit early if an earlier pass has already created an early return,
     * which may happen in alternate compiler configurations.
     */
    if (scopeBlock.scope.earlyReturnValue !== null) {
      return;
    }

    const innerState: State = {
      withinReactiveScope: true,
      earlyReturnValue: parentState.earlyReturnValue,
    };
    this.traverseScope(scopeBlock, innerState);

    const earlyReturnValue = innerState.earlyReturnValue;
    if (earlyReturnValue !== null) {
      if (!parentState.withinReactiveScope) {
        // This is the outermost scope wrapping an early return, store the early return information
        scopeBlock.scope.earlyReturnValue = earlyReturnValue;
        scopeBlock.scope.declarations.set(earlyReturnValue.value.id, {
          identifier: earlyReturnValue.value,
          scope: scopeBlock.scope,
        });

        const instructions = scopeBlock.instructions;
        const loc = earlyReturnValue.loc;
        const sentinelTemp = createTemporaryPlace(this.env, loc);
        const symbolTemp = createTemporaryPlace(this.env, loc);
        const forTemp = createTemporaryPlace(this.env, loc);
        const argTemp = createTemporaryPlace(this.env, loc);
        scopeBlock.instructions = [
          {
            kind: 'instruction',
            instruction: {
              id: makeInstructionId(0),
              loc,
              lvalue: {...symbolTemp},
              value: {
                kind: 'LoadGlobal',
                binding: {
                  kind: 'Global',
                  name: 'Symbol',
                },
                loc,
              },
            },
          },
          {
            kind: 'instruction',
            instruction: {
              id: makeInstructionId(0),
              loc,
              lvalue: {...forTemp},
              value: {
                kind: 'PropertyLoad',
                object: {...symbolTemp},
                property: makePropertyLiteral('for'),
                loc,
              },
            },
          },
          {
            kind: 'instruction',
            instruction: {
              id: makeInstructionId(0),
              loc,
              lvalue: {...argTemp},
              value: {
                kind: 'Primitive',
                value: EARLY_RETURN_SENTINEL,
                loc,
              },
            },
          },
          {
            kind: 'instruction',
            instruction: {
              id: makeInstructionId(0),
              loc,
              lvalue: {...sentinelTemp},
              value: {
                kind: 'MethodCall',
                receiver: symbolTemp,
                property: forTemp,
                args: [argTemp],
                loc,
              },
            },
          },
          {
            kind: 'instruction',
            instruction: {
              id: makeInstructionId(0),
              loc,
              lvalue: null,
              value: {
                kind: 'StoreLocal',
                loc,
                type: null,
                lvalue: {
                  kind: InstructionKind.Let,
                  place: {
                    kind: 'Identifier',
                    effect: Effect.ConditionallyMutate,
                    loc,
                    reactive: true,
                    identifier: earlyReturnValue.value,
                  },
                },
                value: {...sentinelTemp},
              },
            },
          },
          {
            kind: 'terminal',
            label: {
              id: earlyReturnValue.label,
              implicit: false,
            },
            terminal: {
              kind: 'label',
              id: makeInstructionId(0),
              loc: GeneratedSource,
              block: instructions,
            },
          },
        ];
      } else {
        /*
         * Not the outermost scope, but we save the early return information in case there are other
         * early returns within the same outermost scope
         */
        parentState.earlyReturnValue = earlyReturnValue;
      }
    }
  }

  override transformTerminal(
    stmt: ReactiveTerminalStatement,
    state: State,
  ): Transformed<ReactiveStatement> {
    if (state.withinReactiveScope && stmt.terminal.kind === 'return') {
      const loc = stmt.terminal.value.loc;
      let earlyReturnValue: ReactiveScope['earlyReturnValue'];
      if (state.earlyReturnValue !== null) {
        earlyReturnValue = state.earlyReturnValue;
      } else {
        const identifier = createTemporaryPlace(this.env, loc).identifier;
        promoteTemporary(identifier);
        earlyReturnValue = {
          label: this.env.nextBlockId,
          loc,
          value: identifier,
        };
      }
      state.earlyReturnValue = earlyReturnValue;
      return {
        kind: 'replace-many',
        value: [
          {
            kind: 'instruction',
            instruction: {
              id: makeInstructionId(0),
              loc,
              lvalue: null,
              value: {
                kind: 'StoreLocal',
                loc,
                type: null,
                lvalue: {
                  kind: InstructionKind.Reassign,
                  place: {
                    kind: 'Identifier',
                    identifier: earlyReturnValue.value,
                    effect: Effect.Capture,
                    loc,
                    reactive: true,
                  },
                },
                value: stmt.terminal.value,
              },
            },
          },
          {
            kind: 'terminal',
            label: null,
            terminal: {
              kind: 'break',
              id: makeInstructionId(0),
              loc,
              targetKind: 'labeled',
              target: earlyReturnValue.label,
            },
          },
        ],
      };
    }
    this.traverseTerminal(stmt, state);
    return {kind: 'keep'};
  }
}

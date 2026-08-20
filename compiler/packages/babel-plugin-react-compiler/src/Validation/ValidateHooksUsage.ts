/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import {CompilerErrorDetail, ErrorCategory} from '../CompilerError';
import {computeUnconditionalBlocks} from '../HIR/ComputeUnconditionalBlocks';
import {Environment, isHookName} from '../HIR/Environment';
import {
  HIRFunction,
  IdentifierId,
  Place,
  SourceLocation,
  getHookKind,
} from '../HIR/HIR';
import {
  eachInstructionLValue,
  eachInstructionOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {assertExhaustive} from '../Utils/utils';

/**
 * Represents the possible kinds of value which may be stored at a given Place during
 * abstract interpretation. The kinds form a lattice, with earlier items taking
 * precedence over later items (see joinKinds()).
 */
enum Kind {
  // A potential/known hook which was already used in an invalid way
  Error = 'Error',

  /*
   * A known hook. Sources include:
   * - LoadGlobal instructions whose type was inferred as a hook
   * - PropertyLoad, ComputedLoad, and Destructuring instructions
   *   where the object is a KnownHook
   * - PropertyLoad, ComputedLoad, and Destructuring instructions
   *   where the object is a Global and the property name is hook-like
   */
  KnownHook = 'KnownHook',

  /*
   * A potential hook. Sources include:
   * - LValues (other than LoadGlobal) where the name is hook-like
   * - PropertyLoad, ComputedLoad, and Destructuring instructions
   *   where the object is a potential hook or the property name
   *   is hook-like
   */
  PotentialHook = 'PotentialHook',

  // LoadGlobal values whose type was not inferred as a hook
  Global = 'Global',

  // All other values, ie local variables
  Local = 'Local',
}

function joinKinds(a: Kind, b: Kind): Kind {
  if (a === Kind.Error || b === Kind.Error) {
    return Kind.Error;
  } else if (a === Kind.KnownHook || b === Kind.KnownHook) {
    return Kind.KnownHook;
  } else if (a === Kind.PotentialHook || b === Kind.PotentialHook) {
    return Kind.PotentialHook;
  } else if (a === Kind.Global || b === Kind.Global) {
    return Kind.Global;
  } else {
    return Kind.Local;
  }
}

/*
 * Validates that the function honors the [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)
 * rule that hooks may only be called and not otherwise referenced as first-class values.
 *
 * Specifically this pass implements the following rules:
 * - Known hooks may only be called unconditionally, and cannot be used as first-class values.
 *   See the note for Kind.KnownHook for sources of known hooks
 * - Potential hooks may be referenced as first-class values, with the exception that they
 *   may not appear as the callee of a conditional call.
 *   See the note for Kind.PotentialHook for sources of potential hooks
 */
export function validateHooksUsage(fn: HIRFunction): void {
  const unconditionalBlocks = computeUnconditionalBlocks(fn);

  const errorsByPlace = new Map<t.SourceLocation, CompilerErrorDetail>();

  function trackError(
    loc: SourceLocation,
    errorDetail: CompilerErrorDetail,
  ): void {
    if (typeof loc === 'symbol') {
      fn.env.recordError(errorDetail);
    } else {
      errorsByPlace.set(loc, errorDetail);
    }
  }

  function recordConditionalHookError(place: Place): void {
    // Once a particular hook has a conditional call error, don't report any further issues for this hook
    setKind(place, Kind.Error);

    const reason =
      'Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)';
    const previousError =
      typeof place.loc !== 'symbol' ? errorsByPlace.get(place.loc) : undefined;

    /*
     * In some circumstances such as optional calls, we may first encounter a "hook may not be referenced as normal values" error.
     * If that same place is also used as a conditional call, upgrade the error to a conditonal hook error
     */
    if (previousError === undefined || previousError.reason !== reason) {
      trackError(
        place.loc,
        new CompilerErrorDetail({
          category: ErrorCategory.Hooks,
          description: null,
          reason,
          loc: place.loc,
          suggestions: null,
        }),
      );
    }
  }
  function recordInvalidHookUsageError(place: Place): void {
    const previousError =
      typeof place.loc !== 'symbol' ? errorsByPlace.get(place.loc) : undefined;
    if (previousError === undefined) {
      trackError(
        place.loc,
        new CompilerErrorDetail({
          category: ErrorCategory.Hooks,
          description: null,
          reason:
            'Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values',
          loc: place.loc,
          suggestions: null,
        }),
      );
    }
  }
  function recordDynamicHookUsageError(place: Place): void {
    const previousError =
      typeof place.loc !== 'symbol' ? errorsByPlace.get(place.loc) : undefined;
    if (previousError === undefined) {
      trackError(
        place.loc,
        new CompilerErrorDetail({
          category: ErrorCategory.Hooks,
          description: null,
          reason:
            'Hooks must be the same function on every render, but this value may change over time to a different function. See https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hooks',
          loc: place.loc,
          suggestions: null,
        }),
      );
    }
  }

  const valueKinds = new Map<IdentifierId, Kind>();
  function getKindForPlace(place: Place): Kind {
    const knownKind = valueKinds.get(place.identifier.id);
    if (
      place.identifier.name !== null &&
      isHookName(place.identifier.name.value)
    ) {
      return joinKinds(knownKind ?? Kind.Local, Kind.PotentialHook);
    } else {
      return knownKind ?? Kind.Local;
    }
  }

  function visitPlace(place: Place): void {
    const kind = valueKinds.get(place.identifier.id);
    if (kind === Kind.KnownHook) {
      recordInvalidHookUsageError(place);
    }
  }

  function setKind(place: Place, kind: Kind): void {
    valueKinds.set(place.identifier.id, kind);
  }

  for (const param of fn.params) {
    const place = param.kind === 'Identifier' ? param : param.place;
    const kind = getKindForPlace(place);
    setKind(place, kind);
  }

  for (const [, block] of fn.body.blocks) {
    for (const phi of block.phis) {
      let kind: Kind =
        phi.place.identifier.name !== null &&
        isHookName(phi.place.identifier.name.value)
          ? Kind.PotentialHook
          : Kind.Local;
      for (const [, operand] of phi.operands) {
        const operandKind = valueKinds.get(operand.identifier.id);
        /*
         * NOTE: we currently skip operands whose value is unknown
         * (which can only occur for functions with loops), we may
         * cause us to miss invalid code in some cases. We should
         * expand this to a fixpoint iteration in a follow-up.
         */
        if (operandKind !== undefined) {
          kind = joinKinds(kind, operandKind);
        }
      }
      valueKinds.set(phi.place.identifier.id, kind);
    }
    for (const instr of block.instructions) {
      switch (instr.value.kind) {
        case 'LoadGlobal': {
          /*
           * Globals are the one source of known hooks: they are either
           * directly a hook, or infer a Global kind from which knownhooks
           * can be derived later via property access (PropertyLoad etc)
           */
          if (getHookKind(fn.env, instr.lvalue.identifier) != null) {
            setKind(instr.lvalue, Kind.KnownHook);
          } else {
            setKind(instr.lvalue, Kind.Global);
          }
          break;
        }
        case 'LoadContext':
        case 'LoadLocal': {
          visitPlace(instr.value.place);
          const kind = getKindForPlace(instr.value.place);
          setKind(instr.lvalue, kind);
          break;
        }
        case 'StoreLocal':
        case 'StoreContext': {
          visitPlace(instr.value.value);
          const kind = joinKinds(
            getKindForPlace(instr.value.value),
            getKindForPlace(instr.value.lvalue.place),
          );
          setKind(instr.value.lvalue.place, kind);
          setKind(instr.lvalue, kind);
          break;
        }
        case 'ComputedLoad': {
          visitPlace(instr.value.object);
          const kind = getKindForPlace(instr.value.object);
          setKind(instr.lvalue, joinKinds(getKindForPlace(instr.lvalue), kind));
          break;
        }
        case 'PropertyLoad': {
          const objectKind = getKindForPlace(instr.value.object);
          const isHookProperty =
            typeof instr.value.property === 'string' &&
            isHookName(instr.value.property);
          let kind: Kind;
          switch (objectKind) {
            case Kind.Error: {
              kind = Kind.Error;
              break;
            }
            case Kind.KnownHook: {
              /**
               * const useFoo;
               * function Component() {
               *   let x = useFoo.useBar; // useFoo is KnownHook, any property from it inherits KnownHook
               * }
               */
              kind = isHookProperty ? Kind.KnownHook : Kind.Local;
              break;
            }
            case Kind.PotentialHook: {
              /**
               * function Component(props) {
               *   let useFoo;
               *   let x = useFoo.useBar; // useFoo is PotentialHook, any property from it inherits PotentialHook
               * }
               */
              kind = Kind.PotentialHook;
              break;
            }
            case Kind.Global: {
              /**
               * function Component() {
               *   let x = React.useState; // hook-named property of global is knownhook
               *   let y = React.foo; // else inherit Global
               * }
               */
              kind = isHookProperty ? Kind.KnownHook : Kind.Global;
              break;
            }
            case Kind.Local: {
              /**
               * function Component() {
               *   let o = createObject();
               *   let x = o.useState; // hook-named property of local is potentialhook
               *   let y = o.foo; // else inherit local
               * }
               */
              kind = isHookProperty ? Kind.PotentialHook : Kind.Local;
              break;
            }
            default: {
              assertExhaustive(objectKind, `Unexpected kind \`${objectKind}\``);
            }
          }
          setKind(instr.lvalue, kind);
          break;
        }
        case 'CallExpression': {
          const calleeKind = getKindForPlace(instr.value.callee);
          const isHookCallee =
            calleeKind === Kind.KnownHook || calleeKind === Kind.PotentialHook;
          if (isHookCallee && !unconditionalBlocks.has(block.id)) {
            recordConditionalHookError(instr.value.callee);
          } else if (calleeKind === Kind.PotentialHook) {
            recordDynamicHookUsageError(instr.value.callee);
          }
          /**
           * We intentionally skip the callee because it's validated above
           */
          for (const operand of eachInstructionOperand(instr)) {
            if (operand === instr.value.callee) {
              continue;
            }
            visitPlace(operand);
          }
          break;
        }
        case 'MethodCall': {
          const calleeKind = getKindForPlace(instr.value.property);
          const isHookCallee =
            calleeKind === Kind.KnownHook || calleeKind === Kind.PotentialHook;
          if (isHookCallee && !unconditionalBlocks.has(block.id)) {
            recordConditionalHookError(instr.value.property);
          } else if (calleeKind === Kind.PotentialHook) {
            recordDynamicHookUsageError(instr.value.property);
          }
          /*
           * We intentionally skip the property because it's validated above
           */
          for (const operand of eachInstructionOperand(instr)) {
            if (operand === instr.value.property) {
              continue;
            }
            visitPlace(operand);
          }
          break;
        }
        case 'Destructure': {
          visitPlace(instr.value.value);
          const objectKind = getKindForPlace(instr.value.value);
          for (const lvalue of eachInstructionLValue(instr)) {
            const isHookProperty =
              lvalue.identifier.name !== null &&
              isHookName(lvalue.identifier.name.value);
            let kind: Kind;
            switch (objectKind) {
              case Kind.Error: {
                kind = Kind.Error;
                break;
              }
              case Kind.KnownHook: {
                kind = Kind.KnownHook;
                break;
              }
              case Kind.PotentialHook: {
                kind = Kind.PotentialHook;
                break;
              }
              case Kind.Global: {
                kind = isHookProperty ? Kind.KnownHook : Kind.Global;
                break;
              }
              case Kind.Local: {
                kind = isHookProperty ? Kind.PotentialHook : Kind.Local;
                break;
              }
              default: {
                assertExhaustive(
                  objectKind,
                  `Unexpected kind \`${objectKind}\``,
                );
              }
            }
            setKind(lvalue, kind);
          }
          break;
        }
        case 'ObjectMethod':
        case 'FunctionExpression': {
          visitFunctionExpression(fn.env, instr.value.loweredFunc.func);
          break;
        }
        default: {
          /*
           * Else check usages of operands, but do *not* flow properties
           * from operands into the lvalues. For example, `let x = identity(y)`
           * does not infer `x` as a potential hook even if `y` is a potential hook.
           */
          for (const operand of eachInstructionOperand(instr)) {
            visitPlace(operand);
          }
          for (const lvalue of eachInstructionLValue(instr)) {
            const kind = getKindForPlace(lvalue);
            setKind(lvalue, kind);
          }
        }
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      visitPlace(operand);
    }
  }

  for (const [, error] of errorsByPlace) {
    fn.env.recordError(error);
  }
}

function visitFunctionExpression(env: Environment, fn: HIRFunction): void {
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      switch (instr.value.kind) {
        case 'ObjectMethod':
        case 'FunctionExpression': {
          visitFunctionExpression(env, instr.value.loweredFunc.func);
          break;
        }
        case 'MethodCall':
        case 'CallExpression': {
          const callee =
            instr.value.kind === 'CallExpression'
              ? instr.value.callee
              : instr.value.property;
          const hookKind = getHookKind(fn.env, callee.identifier);
          if (hookKind != null) {
            env.recordError(
              new CompilerErrorDetail({
                category: ErrorCategory.Hooks,
                reason:
                  'Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)',
                loc: callee.loc,
                description: `Cannot call ${hookKind === 'Custom' ? 'hook' : hookKind} within a function expression`,
                suggestions: null,
              }),
            );
          }
          break;
        }
      }
    }
  }
}

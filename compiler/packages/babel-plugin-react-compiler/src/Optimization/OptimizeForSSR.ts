/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {
  CallExpression,
  getHookKind,
  HIRFunction,
  IdentifierId,
  InstructionValue,
  isArrayType,
  isPlainObjectType,
  isPrimitiveType,
  isSetStateType,
  isStartTransitionType,
  LoadLocal,
  StoreLocal,
} from '../HIR';
import {
  eachInstructionValueOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {retainWhere} from '../Utils/utils';

/**
 * Optimizes the code for running specifically in an SSR environment. This optimization
 * asssumes that setState will not be called during render during initial mount, which
 * allows inlining useState/useReducer.
 *
 * Optimizations:
 * - Inline useState/useReducer
 * - Remove effects
 * - Remove refs where known to be unused during render (eg directly passed to a dom node)
 * - Remove event handlers
 *
 * Note that an earlier pass already inlines useMemo/useCallback
 */
export function optimizeForSSR(fn: HIRFunction): void {
  const inlinedState = new Map<IdentifierId, InstructionValue>();
  /**
   * First pass identifies useState/useReducer which can be safely inlined. Any use
   * of the hook return other than destructuring (with a specific pattern) prevents
   * inlining.
   *
   * Supported cases:
   * - `const [state, ] = useState( <primitive-array-or-object> )`
   * - `const [state, ] = useReducer(..., <value>)`
   * - `const [state, ] = useReducer[..., <value>, <init>]`
   */
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'Destructure': {
          if (
            inlinedState.has(value.value.identifier.id) &&
            value.lvalue.pattern.kind === 'ArrayPattern' &&
            value.lvalue.pattern.items.length >= 1 &&
            value.lvalue.pattern.items[0].kind === 'Identifier'
          ) {
            // Allow destructuring of inlined states
            continue;
          }
          break;
        }
        case 'MethodCall':
        case 'CallExpression': {
          const calleee =
            value.kind === 'CallExpression' ? value.callee : value.property;
          const hookKind = getHookKind(fn.env, calleee.identifier);
          switch (hookKind) {
            case 'useReducer': {
              if (
                value.args.length === 2 &&
                value.args[1].kind === 'Identifier'
              ) {
                const arg = value.args[1];
                const replace: LoadLocal = {
                  kind: 'LoadLocal',
                  place: arg,
                  loc: arg.loc,
                };
                inlinedState.set(instr.lvalue.identifier.id, replace);
              } else if (
                value.args.length === 3 &&
                value.args[1].kind === 'Identifier' &&
                value.args[2].kind === 'Identifier'
              ) {
                const arg = value.args[1];
                const initializer = value.args[2];
                const replace: CallExpression = {
                  kind: 'CallExpression',
                  callee: initializer,
                  args: [arg],
                  loc: value.loc,
                };
                inlinedState.set(instr.lvalue.identifier.id, replace);
              }
              break;
            }
            case 'useState': {
              if (
                value.args.length === 1 &&
                value.args[0].kind === 'Identifier'
              ) {
                const arg = value.args[0];
                if (
                  isPrimitiveType(arg.identifier) ||
                  isPlainObjectType(arg.identifier) ||
                  isArrayType(arg.identifier)
                ) {
                  const replace: LoadLocal = {
                    kind: 'LoadLocal',
                    place: arg,
                    loc: arg.loc,
                  };
                  inlinedState.set(instr.lvalue.identifier.id, replace);
                }
              }
              break;
            }
          }
        }
      }
      // Any use of useState/useReducer return besides destructuring prevents inlining
      if (inlinedState.size !== 0) {
        for (const operand of eachInstructionValueOperand(value)) {
          inlinedState.delete(operand.identifier.id);
        }
      }
    }
    if (inlinedState.size !== 0) {
      for (const operand of eachTerminalOperand(block.terminal)) {
        inlinedState.delete(operand.identifier.id);
      }
    }
  }
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'FunctionExpression': {
          if (hasKnownNonRenderCall(value.loweredFunc.func)) {
            instr.value = {
              kind: 'Primitive',
              value: undefined,
              loc: value.loc,
            };
          }
          break;
        }
        case 'JsxExpression': {
          if (
            value.tag.kind === 'BuiltinTag' &&
            value.tag.name.indexOf('-') === -1
          ) {
            const tag = value.tag.name;
            retainWhere(value.props, prop => {
              return (
                prop.kind === 'JsxSpreadAttribute' ||
                (!isKnownEventHandler(tag, prop.name) && prop.name !== 'ref')
              );
            });
          }
          break;
        }
        case 'Destructure': {
          if (inlinedState.has(value.value.identifier.id)) {
            // Canonical check is part of determining if state can inline, this is for TS
            CompilerError.invariant(
              value.lvalue.pattern.kind === 'ArrayPattern' &&
                value.lvalue.pattern.items.length >= 1 &&
                value.lvalue.pattern.items[0].kind === 'Identifier',
              {
                reason:
                  'Expected a valid destructuring pattern for inlined state',
                message: 'Expected a valid destructuring pattern',
                loc: value.loc,
              },
            );
            const store: StoreLocal = {
              kind: 'StoreLocal',
              loc: value.loc,
              type: null,
              lvalue: {
                kind: value.lvalue.kind,
                place: value.lvalue.pattern.items[0],
              },
              value: value.value,
            };
            instr.value = store;
          }
          break;
        }
        case 'MethodCall':
        case 'CallExpression': {
          const calleee =
            value.kind === 'CallExpression' ? value.callee : value.property;
          const hookKind = getHookKind(fn.env, calleee.identifier);
          switch (hookKind) {
            case 'useEffectEvent': {
              if (
                value.args.length === 1 &&
                value.args[0].kind === 'Identifier'
              ) {
                const load: LoadLocal = {
                  kind: 'LoadLocal',
                  place: value.args[0],
                  loc: value.loc,
                };
                instr.value = load;
              }
              break;
            }
            case 'useEffect':
            case 'useLayoutEffect':
            case 'useInsertionEffect': {
              // Drop effects
              instr.value = {
                kind: 'Primitive',
                value: undefined,
                loc: value.loc,
              };
              break;
            }
            case 'useReducer':
            case 'useState': {
              const replace = inlinedState.get(instr.lvalue.identifier.id);
              if (replace != null) {
                instr.value = replace;
              }
              break;
            }
          }
        }
      }
    }
  }
}

function hasKnownNonRenderCall(fn: HIRFunction): boolean {
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      if (
        instr.value.kind === 'CallExpression' &&
        (isSetStateType(instr.value.callee.identifier) ||
          isStartTransitionType(instr.value.callee.identifier))
      ) {
        return true;
      }
    }
  }
  return false;
}

const EVENT_HANDLER_PATTERN = /^on[A-Z]/;
function isKnownEventHandler(_tag: string, prop: string): boolean {
  return EVENT_HANDLER_PATTERN.test(prop);
}

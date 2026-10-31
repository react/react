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
  Identifier,
  IdentifierId,
  InstructionValue,
  isArrayType,
  isPlainObjectType,
  isPrimitiveType,
  isSetStateType,
  isStartTransitionType,
  LoadLocal,
  Place,
  StoreLocal,
} from '../HIR';
import {
  eachInstructionValueOperand,
  eachPatternOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {retainWhere} from '../Utils/utils';
import {findReferencedIdentifiers} from './DeadCodeElimination';

/**
 * Optimizes the code for running specifically in an SSR environment. Functions that call
 * setState or startTransition are treated as event handlers and removed, unless code that
 * runs during render calls or otherwise uses them (see findRemovableFunctions).
 *
 * Optimizations:
 * - Inline useState/useReducer whose setter or dispatch function is not read once the
 *   optimizations below are applied, and whose value is the same in every render pass
 * - Remove effects
 * - Remove refs where known to be unused during render (eg directly passed to a dom node)
 * - Remove event handlers
 *
 * Note that an earlier pass already inlines useMemo/useCallback
 */
export function optimizeForSSR(fn: HIRFunction): void {
  const inlinedState = new Map<IdentifierId, InstructionValue>();
  // The results of every useState/useReducer call, whether or not it can be inlined
  const stateHooks = new Map<IdentifierId, Identifier>();
  // State hook results used other than by `[state, ...] = <result>` destructuring
  const exposedStateHooks = new Set<IdentifierId>();
  // Inlinable state whose initial value is a primitive literal
  const constantState = new Set<IdentifierId>();
  // Inlinable useReducer calls with an initializer, which React calls only on mount
  const reducerInitializers = new Set<IdentifierId>();
  const primitives = new Set<IdentifierId>();
  // A custom hook may update its own state during render, or return a setter that is called
  let callsCustomHook = false;
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
        case 'Primitive': {
          primitives.add(instr.lvalue.identifier.id);
          break;
        }
        case 'Destructure': {
          if (
            stateHooks.has(value.value.identifier.id) &&
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
          if (hookKind === 'useState' || hookKind === 'useReducer') {
            stateHooks.set(instr.lvalue.identifier.id, instr.lvalue.identifier);
          } else if (hookKind === 'Custom') {
            callsCustomHook = true;
          }
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
                if (primitives.has(arg.identifier.id)) {
                  constantState.add(instr.lvalue.identifier.id);
                }
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
                reducerInitializers.add(instr.lvalue.identifier.id);
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
                  if (primitives.has(arg.identifier.id)) {
                    constantState.add(instr.lvalue.identifier.id);
                  }
                }
              }
              break;
            }
          }
        }
      }
      // Any use of useState/useReducer return besides destructuring prevents inlining
      if (stateHooks.size !== 0) {
        for (const operand of eachInstructionValueOperand(value)) {
          if (stateHooks.has(operand.identifier.id)) {
            inlinedState.delete(operand.identifier.id);
            exposedStateHooks.add(operand.identifier.id);
          }
        }
      }
    }
    if (stateHooks.size !== 0) {
      for (const operand of eachTerminalOperand(block.terminal)) {
        if (stateHooks.has(operand.identifier.id)) {
          inlinedState.delete(operand.identifier.id);
          exposedStateHooks.add(operand.identifier.id);
        }
      }
    }
  }
  /**
   * Second pass removes code that does not run during SSR: event handlers, effects, and the
   * event handler and ref props of builtin elements.
   */
  const removableFunctions = findRemovableFunctions(fn);
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'FunctionExpression': {
          if (removableFunctions.has(value.loweredFunc.func)) {
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
          }
        }
      }
    }
  }

  if (inlinedState.size === 0) {
    return;
  }

  /**
   * Inlining state drops its setter (or dispatch function) and evaluates its initial value on
   * every render pass, so it needs two guarantees. Liveness is computed the way dead code
   * elimination would see it after the removals above, without removing anything:
   *
   * - The setter is no longer read. A setter passed to a child, provided through context,
   *   returned from a custom hook, or called during render (which React supports) would be left
   *   undeclared, so that state keeps its hook.
   * - The value is the same in every render pass. A setter that is still read may update state
   *   during render, and React then renders the component again with the state it already has.
   *   Inlined state would instead recompute its initial value, so while any setter is still read,
   *   or a custom hook is called, state that is read keeps its hook unless it starts at a
   *   primitive literal. A reducer with an initializer keeps its hook even if its state is
   *   unread: React calls `init` only on the first pass, and dead code elimination keeps it.
   */
  const live = findReferencedIdentifiers(fn);
  let renderPhaseUpdatesPossible = callsCustomHook;
  for (const [id, identifier] of stateHooks) {
    if (exposedStateHooks.has(id) && live.isIdUsed(identifier)) {
      renderPhaseUpdatesPossible = true;
    }
  }
  const stateRead = new Set<IdentifierId>();
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {value} = instr;
      if (
        value.kind !== 'Destructure' ||
        !stateHooks.has(value.value.identifier.id) ||
        value.lvalue.pattern.kind !== 'ArrayPattern'
      ) {
        continue;
      }
      const [state, ...rest] = value.lvalue.pattern.items;
      const isSetterRead = rest.some(item =>
        item.kind === 'Identifier'
          ? live.isIdOrNameUsed(item.identifier)
          : item.kind === 'Spread' &&
            live.isIdOrNameUsed(item.place.identifier),
      );
      if (isSetterRead) {
        renderPhaseUpdatesPossible = true;
        inlinedState.delete(value.value.identifier.id);
      }
      if (
        state?.kind === 'Identifier' &&
        live.isIdOrNameUsed(state.identifier)
      ) {
        stateRead.add(value.value.identifier.id);
      }
    }
  }
  if (renderPhaseUpdatesPossible) {
    for (const id of [...inlinedState.keys()]) {
      if (
        reducerInitializers.has(id) ||
        (stateRead.has(id) && !constantState.has(id))
      ) {
        inlinedState.delete(id);
      }
    }
  }
  inlineState(fn, inlinedState);
}

/**
 * Replaces the given useState/useReducer calls with their initial value, and their
 * `[state, ...]` destructuring with a StoreLocal of the state.
 */
function inlineState(
  fn: HIRFunction,
  inline: Map<IdentifierId, InstructionValue>,
): void {
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'Destructure': {
          if (inline.has(value.value.identifier.id)) {
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
          if (hookKind === 'useReducer' || hookKind === 'useState') {
            const replace = inline.get(instr.lvalue.identifier.id);
            if (replace != null) {
              instr.value = replace;
            }
          }
          break;
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

/**
 * Returns the functions to remove as event handlers: those that call setState or
 * startTransition and that nothing running during render can observe.
 *
 * Calling a setter does not make a function an event handler. React supports a component
 * updating its own state while it renders, and code often does so through a helper
 * (`onRenderItem(item)`) or an array callback (`items.forEach(item => setMax(item))`), which
 * would call `undefined` if removed.
 *
 * The compiled function runs during render, and so does every function that code running during
 * render calls, tests, or passes along. Three places are still assumed to receive event handlers,
 * since what happens to a function there is not visible here: JSX attributes, the arguments of
 * hooks other than useState, useReducer, and useMemo, and the compiled function's return value.
 * Functions are followed through locals, context variables, objects, and arrays.
 */
function findRemovableFunctions(fn: HIRFunction): Set<HIRFunction> {
  const functions: Array<HIRFunction> = [];
  collectFunctions(fn, functions);
  const held = new Map<IdentifierId, Set<HIRFunction>>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of functions) {
      changed = propagateHeldFunctions(f, held) || changed;
    }
  }

  const runsDuringRender = new Set<HIRFunction>([fn]);
  const queue: Array<HIRFunction> = [fn];
  while (queue.length !== 0) {
    const current = queue.pop()!;
    for (const place of eachRenderUse(current, current === fn)) {
      for (const used of held.get(place.identifier.id) ?? []) {
        if (!runsDuringRender.has(used)) {
          runsDuringRender.add(used);
          queue.push(used);
        }
      }
    }
  }

  const removable = new Set<HIRFunction>();
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      if (instr.value.kind === 'FunctionExpression') {
        const inner = instr.value.loweredFunc.func;
        if (!runsDuringRender.has(inner) && hasKnownNonRenderCall(inner)) {
          removable.add(inner);
        }
      }
    }
  }
  return removable;
}

function collectFunctions(
  fn: HIRFunction,
  functions: Array<HIRFunction>,
): void {
  functions.push(fn);
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      if (
        instr.value.kind === 'FunctionExpression' ||
        instr.value.kind === 'ObjectMethod'
      ) {
        collectFunctions(instr.value.loweredFunc.func, functions);
      }
    }
  }
}

/**
 * Records the functions each value may hold, following moves through locals, context variables,
 * objects, arrays, iterators, and hooks that return what they are given. Objects and arrays hold
 * every function stored in them. Returns whether anything was added.
 */
function propagateHeldFunctions(
  fn: HIRFunction,
  held: Map<IdentifierId, Set<HIRFunction>>,
): boolean {
  let changed = false;
  const add = (into: Place, functions: Iterable<HIRFunction>): void => {
    for (const f of functions) {
      let target = held.get(into.identifier.id);
      if (target == null) {
        target = new Set();
        held.set(into.identifier.id, target);
      }
      if (!target.has(f)) {
        target.add(f);
        changed = true;
      }
    }
  };
  const flow = (from: Place, into: Place): void => {
    const functions = held.get(from.identifier.id);
    if (functions != null && from.identifier.id !== into.identifier.id) {
      add(into, [...functions]);
    }
  };
  for (const block of fn.body.blocks.values()) {
    for (const phi of block.phis) {
      for (const operand of phi.operands.values()) {
        flow(operand, phi.place);
      }
    }
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'FunctionExpression':
        case 'ObjectMethod': {
          add(lvalue, [value.loweredFunc.func]);
          break;
        }
        case 'LoadLocal':
        case 'LoadContext': {
          flow(value.place, lvalue);
          break;
        }
        case 'StoreLocal':
        case 'StoreContext': {
          flow(value.value, value.lvalue.place);
          flow(value.value, lvalue);
          break;
        }
        case 'Destructure': {
          for (const place of eachPatternOperand(value.lvalue.pattern)) {
            flow(value.value, place);
          }
          flow(value.value, lvalue);
          break;
        }
        case 'PropertyLoad':
        case 'ComputedLoad': {
          flow(value.object, lvalue);
          break;
        }
        case 'PropertyStore':
        case 'ComputedStore': {
          flow(value.value, value.object);
          flow(value.value, lvalue);
          break;
        }
        case 'ObjectExpression': {
          for (const property of value.properties) {
            flow(property.place, lvalue);
          }
          break;
        }
        case 'ArrayExpression': {
          for (const element of value.elements) {
            if (element.kind === 'Identifier') {
              flow(element, lvalue);
            } else if (element.kind === 'Spread') {
              flow(element.place, lvalue);
            }
          }
          break;
        }
        case 'TypeCastExpression': {
          flow(value.value, lvalue);
          break;
        }
        case 'GetIterator': {
          flow(value.collection, lvalue);
          break;
        }
        case 'IteratorNext': {
          flow(value.iterator, lvalue);
          flow(value.collection, lvalue);
          break;
        }
        case 'CallExpression':
        case 'MethodCall': {
          const callee =
            value.kind === 'CallExpression' ? value.callee : value.property;
          const hookKind = getHookKind(fn.env, callee.identifier);
          const [arg] = value.args;
          if (
            (hookKind === 'useCallback' ||
              hookKind === 'useEffectEvent' ||
              hookKind === 'useRef') &&
            arg != null &&
            arg.kind === 'Identifier'
          ) {
            flow(arg, lvalue);
          }
          break;
        }
      }
    }
  }
  return changed;
}

/**
 * Yields the places whose value render may call or otherwise observe when `fn` runs during
 * render. Moves between values are left to propagateHeldFunctions, and a nested function's body
 * is visited only if that function itself runs during render.
 */
function* eachRenderUse(
  fn: HIRFunction,
  isOutermost: boolean,
): Iterable<Place> {
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'FunctionExpression':
        case 'ObjectMethod':
        case 'LoadLocal':
        case 'LoadContext':
        case 'StoreLocal':
        case 'StoreContext':
        case 'Destructure':
        case 'PropertyLoad':
        case 'ComputedLoad':
        case 'PropertyStore':
        case 'ComputedStore':
        case 'ObjectExpression':
        case 'ArrayExpression':
        case 'TypeCastExpression':
        case 'GetIterator':
        case 'IteratorNext':
        // Markers for manual memoization, which does not run
        case 'StartMemoize':
        case 'FinishMemoize': {
          break;
        }
        case 'JsxExpression': {
          // Attributes are assumed to be event handlers; children may be render props
          if (value.tag.kind === 'Identifier') {
            yield value.tag;
          }
          if (value.children != null) {
            yield* value.children;
          }
          break;
        }
        case 'CallExpression':
        case 'MethodCall': {
          const callee =
            value.kind === 'CallExpression' ? value.callee : value.property;
          yield callee;
          if (value.kind === 'MethodCall') {
            yield value.receiver;
          }
          // Hooks are assumed not to call their arguments during render, except these
          const hookKind = getHookKind(fn.env, callee.identifier);
          if (
            hookKind == null ||
            hookKind === 'useState' ||
            hookKind === 'useReducer' ||
            hookKind === 'useMemo'
          ) {
            for (const arg of value.args) {
              yield arg.kind === 'Identifier' ? arg : arg.place;
            }
          }
          break;
        }
        default: {
          yield* eachInstructionValueOperand(value);
        }
      }
    }
    // Functions in the compiled function's return value are assumed to be event handlers
    if (!(isOutermost && block.terminal.kind === 'return')) {
      yield* eachTerminalOperand(block.terminal);
    }
  }
}

const EVENT_HANDLER_PATTERN = /^on[A-Z]/;
function isKnownEventHandler(_tag: string, prop: string): boolean {
  return EVENT_HANDLER_PATTERN.test(prop);
}

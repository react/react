/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react';

const {useRef, useEffect, isValidElement} = React;
const ReactSecretInternals =
  //@ts-ignore
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  //@ts-ignore
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

type MemoCache = Array<number | typeof $empty>;

const $empty = Symbol.for('react.memo_cache_sentinel');

// Re-export React.c if present, otherwise fallback to the userspace polyfill for versions of React
// < 19.
export const c =
  // @ts-expect-error
  typeof React.__COMPILER_RUNTIME?.c === 'function'
    ? // @ts-expect-error
      React.__COMPILER_RUNTIME.c
    : function c(size: number) {
        return React.useMemo<Array<unknown>>(() => {
          const $ = new Array(size);
          for (let ii = 0; ii < size; ii++) {
            $[ii] = $empty;
          }
          // This symbol is added to tell the react devtools that this array is from
          // useMemoCache.
          // @ts-ignore
          $[$empty] = true;
          return $;
        }, []);
      };

const LazyGuardDispatcher: {[key: string]: (...args: Array<any>) => any} = {};
[
  'readContext',
  'useCallback',
  'useContext',
  'useEffect',
  'useImperativeHandle',
  'useInsertionEffect',
  'useLayoutEffect',
  'useMemo',
  'useReducer',
  'useRef',
  'useState',
  'useDebugValue',
  'useDeferredValue',
  'useTransition',
  'useMutableSource',
  'useSyncExternalStore',
  'useId',
  'unstable_isNewReconciler',
  'getCacheSignal',
  'getCacheForType',
  'useCacheRefresh',
].forEach(name => {
  LazyGuardDispatcher[name] = () => {
    throw new Error(
      `[React] Unexpected React hook call (${name}) from a React compiled function. ` +
        "Check that all hooks are called directly and named according to convention ('use[A-Z]') ",
    );
  };
});

let originalDispatcher: unknown = null;

// Allow guards are not emitted for useMemoCache
LazyGuardDispatcher['useMemoCache'] = (count: number) => {
  if (originalDispatcher == null) {
    throw new Error(
      'React Compiler internal invariant violation: unexpected null dispatcher',
    );
  } else {
    return (originalDispatcher as any).useMemoCache(count);
  }
};

enum GuardKind {
  PushGuardContext = 0,
  PopGuardContext = 1,
  PushExpectHook = 2,
  PopExpectHook = 3,
}

function setCurrent(newDispatcher: any) {
  ReactSecretInternals.ReactCurrentDispatcher.current = newDispatcher;
  return ReactSecretInternals.ReactCurrentDispatcher.current;
}

const guardFrames: Array<unknown> = [];

/**
 * When `enableEmitHookGuards` is set, this does runtime validation
 * of the no-conditional-hook-calls rule.
 * As React Compiler needs to statically understand which calls to move out of
 * conditional branches (i.e. React Compiler cannot memoize the results of hook
 * calls), its understanding of "the rules of React" are more restrictive.
 * This validation throws on unsound inputs at runtime.
 *
 * Components should only be invoked through React as React Compiler could memoize
 * the call to AnotherComponent, introducing conditional hook calls in its
 * compiled output.
 * ```js
 * function Invalid(props) {
 *  const myJsx = AnotherComponent(props);
 *  return <div> { myJsx } </div>;
 * }
 *
 * Hooks must be named as hooks.
 * ```js
 * const renamedHook = useState;
 * function Invalid() {
 *   const [state, setState] = renamedHook(0);
 * }
 * ```
 *
 * Hooks must be directly called.
 * ```
 * function call(fn) {
 *  return fn();
 * }
 * function Invalid() {
 *   const result = call(useMyHook);
 * }
 * ```
 */
export function $dispatcherGuard(kind: GuardKind) {
  const curr = ReactSecretInternals.ReactCurrentDispatcher.current;
  if (kind === GuardKind.PushGuardContext) {
    // Push before checking invariant or errors
    guardFrames.push(curr);

    if (guardFrames.length === 1) {
      // save if we're the first guard on the stack
      originalDispatcher = curr;
    }

    if (curr === LazyGuardDispatcher) {
      throw new Error(
        `[React] Unexpected call to custom hook or component from a React compiled function. ` +
          "Check that (1) all hooks are called directly and named according to convention ('use[A-Z]') " +
          'and (2) components are returned as JSX instead of being directly invoked.',
      );
    }
    setCurrent(LazyGuardDispatcher);
  } else if (kind === GuardKind.PopGuardContext) {
    // Pop before checking invariant or errors
    const lastFrame = guardFrames.pop();

    if (lastFrame == null) {
      throw new Error(
        'React Compiler internal error: unexpected null in guard stack',
      );
    }
    if (guardFrames.length === 0) {
      originalDispatcher = null;
    }
    setCurrent(lastFrame);
  } else if (kind === GuardKind.PushExpectHook) {
    // ExpectHooks could be nested, so we save the current dispatcher
    // for the matching PopExpectHook to restore.
    guardFrames.push(curr);
    setCurrent(originalDispatcher);
  } else if (kind === GuardKind.PopExpectHook) {
    const lastFrame = guardFrames.pop();
    if (lastFrame == null) {
      throw new Error(
        'React Compiler internal error: unexpected null in guard stack',
      );
    }
    setCurrent(lastFrame);
  } else {
    throw new Error('React Compiler internal error: unreachable block' + kind);
  }
}

export function $reset($: MemoCache) {
  for (let ii = 0; ii < $.length; ii++) {
    $[ii] = $empty;
  }
}

export function $makeReadOnly() {
  throw new Error('TODO: implement $makeReadOnly in react-compiler-runtime');
}

/**
 * Instrumentation to count rerenders in React components
 */
export const renderCounterRegistry: Map<
  string,
  Set<{count: number}>
> = new Map();
export function clearRenderCounterRegistry() {
  for (const counters of renderCounterRegistry.values()) {
    counters.forEach(counter => {
      counter.count = 0;
    });
  }
}

function registerRenderCounter(name: string, val: {count: number}) {
  let counters = renderCounterRegistry.get(name);
  if (counters == null) {
    counters = new Set();
    renderCounterRegistry.set(name, counters);
  }
  counters.add(val);
}

function removeRenderCounter(name: string, val: {count: number}): void {
  const counters = renderCounterRegistry.get(name);
  if (counters == null) {
    return;
  }
  counters.delete(val);
}

export function useRenderCounter(name: string): void {
  const val = useRef<{count: number}>(null);

  if (val.current != null) {
    val.current.count += 1;
  }
  useEffect(() => {
    // Not counting initial render shouldn't be a problem
    if (val.current == null) {
      const counter = {count: 0};
      registerRenderCounter(name, counter);
      // @ts-ignore
      val.current = counter;
    }
    return () => {
      if (val.current !== null) {
        removeRenderCounter(name, val.current);
      }
    };
  });
}

const seenErrors = new Set();

export function $structuralCheck(
  oldValue: any,
  newValue: any,
  variableName: string,
  fnName: string,
  kind: string,
  loc: string,
): void {
  function error(l: string, r: string, path: string, depth: number) {
    const str = `${fnName}:${loc} [${kind}] ${variableName}${path} changed from ${l} to ${r} at depth ${depth}`;
    if (seenErrors.has(str)) {
      return;
    }
    seenErrors.add(str);
    console.error(str);
  }
  const depthLimit = 2;
  function recur(oldValue: any, newValue: any, path: string, depth: number) {
    if (depth > depthLimit) {
      return;
    } else if (oldValue === newValue) {
      return;
    } else if (typeof oldValue !== typeof newValue) {
      error(`type ${typeof oldValue}`, `type ${typeof newValue}`, path, depth);
    } else if (typeof oldValue === 'object') {
      const oldArray = Array.isArray(oldValue);
      const newArray = Array.isArray(newValue);
      if (oldValue === null && newValue !== null) {
        error('null', `type ${typeof newValue}`, path, depth);
      } else if (newValue === null) {
        error(`type ${typeof oldValue}`, 'null', path, depth);
      } else if (oldValue instanceof Map) {
        if (!(newValue instanceof Map)) {
          error(`Map instance`, `other value`, path, depth);
        } else if (oldValue.size !== newValue.size) {
          error(
            `Map instance with size ${oldValue.size}`,
            `Map instance with size ${newValue.size}`,
            path,
            depth,
          );
        } else {
          for (const [k, v] of oldValue) {
            if (!newValue.has(k)) {
              error(
                `Map instance with key ${k}`,
                `Map instance without key ${k}`,
                path,
                depth,
              );
            } else {
              recur(v, newValue.get(k), `${path}.get(${k})`, depth + 1);
            }
          }
        }
      } else if (newValue instanceof Map) {
        error('other value', `Map instance`, path, depth);
      } else if (oldValue instanceof Set) {
        if (!(newValue instanceof Set)) {
          error(`Set instance`, `other value`, path, depth);
        } else if (oldValue.size !== newValue.size) {
          error(
            `Set instance with size ${oldValue.size}`,
            `Set instance with size ${newValue.size}`,
            path,
            depth,
          );
        } else {
          for (const v of newValue) {
            if (!oldValue.has(v)) {
              error(
                `Set instance without element ${v}`,
                `Set instance with element ${v}`,
                path,
                depth,
              );
            }
          }
        }
      } else if (newValue instanceof Set) {
        error('other value', `Set instance`, path, depth);
      } else if (oldArray || newArray) {
        if (oldArray !== newArray) {
          error(
            `type ${oldArray ? 'array' : 'object'}`,
            `type ${newArray ? 'array' : 'object'}`,
            path,
            depth,
          );
        } else if (oldValue.length !== newValue.length) {
          error(
            `array with length ${oldValue.length}`,
            `array with length ${newValue.length}`,
            path,
            depth,
          );
        } else {
          for (let ii = 0; ii < oldValue.length; ii++) {
            recur(oldValue[ii], newValue[ii], `${path}[${ii}]`, depth + 1);
          }
        }
      } else if (isValidElement(oldValue) || isValidElement(newValue)) {
        if (isValidElement(oldValue) !== isValidElement(newValue)) {
          error(
            `type ${isValidElement(oldValue) ? 'React element' : 'object'}`,
            `type ${isValidElement(newValue) ? 'React element' : 'object'}`,
            path,
            depth,
          );
        } else if (oldValue.type !== newValue.type) {
          error(
            `React element of type ${oldValue.type}`,
            `React element of type ${newValue.type}`,
            path,
            depth,
          );
        } else {
          recur(
            oldValue.props,
            newValue.props,
            `[props of ${path}]`,
            depth + 1,
          );
        }
      } else {
        for (const key in newValue) {
          if (!(key in oldValue)) {
            error(
              `object without key ${key}`,
              `object with key ${key}`,
              path,
              depth,
            );
          }
        }
        for (const key in oldValue) {
          if (!(key in newValue)) {
            error(
              `object with key ${key}`,
              `object without key ${key}`,
              path,
              depth,
            );
          } else {
            recur(oldValue[key], newValue[key], `${path}.${key}`, depth + 1);
          }
        }
      }
    } else if (typeof oldValue === 'function') {
      // Bail on functions for now
      return;
    } else if (isNaN(oldValue) || isNaN(newValue)) {
      if (isNaN(oldValue) !== isNaN(newValue)) {
        error(
          `${isNaN(oldValue) ? 'NaN' : 'non-NaN value'}`,
          `${isNaN(newValue) ? 'NaN' : 'non-NaN value'}`,
          path,
          depth,
        );
      }
    } else if (oldValue !== newValue) {
      error(oldValue, newValue, path, depth);
    }
  }
  recur(oldValue, newValue, '', 0);
}

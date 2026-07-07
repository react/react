/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {
  Family,
  RefreshUpdate,
  ScheduleRefresh,
  ScheduleRoot,
  SetRefreshHandler,
} from 'react-reconciler/src/ReactFiberHotReloading';
import type {ReactNodeList} from 'shared/ReactTypes';

import {REACT_MEMO_TYPE, REACT_FORWARD_REF_TYPE} from 'shared/ReactSymbols';

type Signature = {
  ownKey: string,
  forceReset: boolean,
  fullKey: string | null, // Contains keys of nested Hooks. Computed lazily.
  getCustomHooks: () => Array<Function>,
};

type RendererHelpers = {
  scheduleRefresh: ScheduleRefresh,
  scheduleRoot: ScheduleRoot,
  setRefreshHandler: SetRefreshHandler,
};

if (!__DEV__) {
  throw new Error(
    'React Refresh runtime should not be included in the production bundle.',
  );
}

// In old environments, we'll leak previous types after every edit.
const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;

// We never remove these associations.
// It's OK to reference families, but use WeakMap/Set for types.
const allFamiliesByID: Map<string, Family> = new Map();
const allFamiliesByType: WeakMap<any, Family> | Map<any, Family> =
  new PossiblyWeakMap();
const allSignaturesByType: WeakMap<any, Signature> | Map<any, Signature> =
  new PossiblyWeakMap();
// This WeakMap is read by React, so we only put families
// that have actually been edited here. This keeps checks fast.
const updatedFamiliesByType: WeakMap<any, Family> | Map<any, Family> =
  new PossiblyWeakMap();

// This is cleared on every performReactRefresh() call.
// It is an array of [Family, NextType] tuples.
let pendingUpdates: Array<[Family, any]> = [];

// This is injected by the renderer via DevTools global hook.
const helpersByRendererID: Map<number, RendererHelpers> = new Map();

const helpersByRoot: Map<FiberRoot, RendererHelpers> = new Map();

// We keep track of mounted roots so we can schedule updates.
const mountedRoots: Set<FiberRoot> = new Set();
// If a root captures an error, we remember it so we can retry on edit.
const failedRoots: Set<FiberRoot> = new Set();

// In environments that support WeakMap, we also remember the last element for every root.
// It needs to be weak because we do this even for roots that failed to mount.
// If there is no WeakMap, we won't attempt to do retrying.
const rootElements: WeakMap<any, ReactNodeList> | null =
  typeof WeakMap === 'function' ? new WeakMap() : null;

let isPerformingRefresh = false;

function computeFullKey(signature: Signature): string {
  if (signature.fullKey !== null) {
    return signature.fullKey;
  }

  let fullKey: string = signature.ownKey;
  let hooks;
  try {
    hooks = signature.getCustomHooks();
  } catch (err) {
    // This can happen in an edge case, e.g. if expression like Foo.useSomething
    // depends on Foo which is lazily initialized during rendering.
    // In that case just assume we'll have to remount.
    signature.forceReset = true;
    signature.fullKey = fullKey;
    return fullKey;
  }

  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (typeof hook !== 'function') {
      // Something's wrong. Assume we need to remount.
      signature.forceReset = true;
      signature.fullKey = fullKey;
      return fullKey;
    }
    const nestedHookSignature = allSignaturesByType.get(hook);
    if (nestedHookSignature === undefined) {
      // No signature means Hook wasn't in the source code, e.g. in a library.
      // We'll skip it because we can assume it won't change during this session.
      continue;
    }
    const nestedHookKey = computeFullKey(nestedHookSignature);
    if (nestedHookSignature.forceReset) {
      signature.forceReset = true;
    }
    fullKey += '\n---\n' + nestedHookKey;
  }

  signature.fullKey = fullKey;
  return fullKey;
}

function haveEqualSignatures(prevType: any, nextType: any) {
  const prevSignature = allSignaturesByType.get(prevType);
  const nextSignature = allSignaturesByType.get(nextType);

  if (prevSignature === undefined && nextSignature === undefined) {
    return true;
  }
  if (prevSignature === undefined || nextSignature === undefined) {
    return false;
  }
  if (computeFullKey(prevSignature) !== computeFullKey(nextSignature)) {
    return false;
  }
  if (nextSignature.forceReset) {
    return false;
  }

  return true;
}

function isReactClass(type: any) {
  return type.prototype && type.prototype.isReactComponent;
}

function canPreserveStateBetween(prevType: any, nextType: any) {
  if (isReactClass(prevType) || isReactClass(nextType)) {
    return false;
  }
  // A fiber's tag is derived from the kind of its type (a plain function
  // vs memo vs forwardRef), and the reconciler can only swap implementations
  // in place within the same tag. If the kind changed, the tree must remount.
  if (typeof prevType !== typeof nextType) {
    return false;
  }
  if (typeof prevType === 'object' && prevType !== null && nextType !== null) {
    if (
      getProperty(prevType, '$$typeof') !== getProperty(nextType, '$$typeof')
    ) {
      return false;
    }
  }
  if (haveEqualSignatures(prevType, nextType)) {
    return true;
  }
  return false;
}

function resolveFamily(type: any) {
  // Only check updated types to keep lookups fast.
  return updatedFamiliesByType.get(type);
}

// If we didn't care about IE11, we could use new Map/Set(iterable).
function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  const clone = new Map<K, V>();
  map.forEach((value, key) => {
    clone.set(key, value);
  });
  return clone;
}
function cloneSet<T>(set: Set<T>): Set<T> {
  const clone = new Set<T>();
  set.forEach(value => {
    clone.add(value);
  });
  return clone;
}

// This is a safety mechanism to protect against rogue getters and Proxies.
function getProperty(object: any, property: string) {
  try {
    return object[property];
  } catch (err) {
    // Intentionally ignore.
    return undefined;
  }
}

export function performReactRefresh(): RefreshUpdate | null {
  if (!__DEV__) {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
  if (pendingUpdates.length === 0) {
    return null;
  }
  if (isPerformingRefresh) {
    return null;
  }

  isPerformingRefresh = true;
  try {
    const staleFamilies = new Set<Family>();
    const updatedFamilies = new Set<Family>();

    const updates = pendingUpdates;
    pendingUpdates = [];
    updates.forEach(([family, nextType]) => {
      // Now that we got a real edit, we can create associations
      // that will be read by the React reconciler.
      const prevType = family.current;
      updatedFamiliesByType.set(prevType, family);
      updatedFamiliesByType.set(nextType, family);
      family.current = nextType;

      // Determine whether this should be a re-render or a re-mount.
      if (canPreserveStateBetween(prevType, nextType)) {
        updatedFamilies.add(family);
      } else {
        staleFamilies.add(family);
      }
    });

    // TODO: rename these fields to something more meaningful.
    const update: RefreshUpdate = {
      updatedFamilies, // Families that will re-render preserving state
      staleFamilies, // Families that will be remounted
    };

    helpersByRendererID.forEach(helpers => {
      // Even if there are no roots, set the handler on first update.
      // This ensures that if *new* roots are mounted, they'll use the resolve handler.
      helpers.setRefreshHandler(resolveFamily);
    });

    let didError = false;
    let firstError = null;

    // We snapshot maps and sets that are mutated during commits.
    // If we don't do this, there is a risk they will be mutated while
    // we iterate over them. For example, trying to recover a failed root
    // may cause another root to be added to the failed list -- an infinite loop.
    const failedRootsSnapshot = cloneSet(failedRoots);
    const mountedRootsSnapshot = cloneSet(mountedRoots);
    const helpersByRootSnapshot = cloneMap(helpersByRoot);

    failedRootsSnapshot.forEach(root => {
      const helpers = helpersByRootSnapshot.get(root);
      if (helpers === undefined) {
        throw new Error(
          'Could not find helpers for a root. This is a bug in React Refresh.',
        );
      }
      if (!failedRoots.has(root)) {
        // No longer failed.
      }
      if (rootElements === null) {
        return;
      }
      if (!rootElements.has(root)) {
        return;
      }
      const element = rootElements.get(root);
      try {
        helpers.scheduleRoot(root, element);
      } catch (err) {
        if (!didError) {
          didError = true;
          firstError = err;
        }
        // Keep trying other roots.
      }
    });
    mountedRootsSnapshot.forEach(root => {
      const helpers = helpersByRootSnapshot.get(root);
      if (helpers === undefined) {
        throw new Error(
          'Could not find helpers for a root. This is a bug in React Refresh.',
        );
      }
      if (!mountedRoots.has(root)) {
        // No longer mounted.
      }
      try {
        helpers.scheduleRefresh(root, update);
      } catch (err) {
        if (!didError) {
          didError = true;
          firstError = err;
        }
        // Keep trying other roots.
      }
    });
    if (didError) {
      throw firstError;
    }
    return update;
  } finally {
    isPerformingRefresh = false;
  }
}

export function register(type: any, id: string): void {
  if (__DEV__) {
    if (type === null) {
      return;
    }
    if (typeof type !== 'function' && typeof type !== 'object') {
      return;
    }

    // This can happen in an edge case, e.g. if we register
    // return value of a HOC but it returns a cached component.
    // Ignore anything but the first registration for each type.
    if (allFamiliesByType.has(type)) {
      return;
    }
    // Create family or remember to update it.
    // None of this bookkeeping affects reconciliation
    // until the first performReactRefresh() call above.
    let family = allFamiliesByID.get(id);
    if (family === undefined) {
      family = {current: type};
      allFamiliesByID.set(id, family);
    } else {
      pendingUpdates.push([family, type]);
    }
    allFamiliesByType.set(type, family);

    // Visit inner types because we might not have registered them.
    if (typeof type === 'object' && type !== null) {
      switch (getProperty(type, '$$typeof')) {
        case REACT_FORWARD_REF_TYPE:
          register(type.render, id + '$render');
          break;
        case REACT_MEMO_TYPE:
          register(type.type, id + '$type');
          break;
      }
    }
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

export function setSignature(
  type: any,
  key: string,
  forceReset?: boolean = false,
  getCustomHooks?: () => Array<Function>,
): void {
  if (__DEV__) {
    if (!allSignaturesByType.has(type)) {
      allSignaturesByType.set(type, {
        forceReset,
        ownKey: key,
        fullKey: null,
        getCustomHooks: getCustomHooks || (() => []),
      });
    }
    // Visit inner types because we might not have signed them.
    if (typeof type === 'object' && type !== null) {
      switch (getProperty(type, '$$typeof')) {
        case REACT_FORWARD_REF_TYPE:
          setSignature(type.render, key, forceReset, getCustomHooks);
          break;
        case REACT_MEMO_TYPE:
          setSignature(type.type, key, forceReset, getCustomHooks);
          break;
      }
    }
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

// This is lazily called during first render for a type.
// It captures Hook list at that time so inline requires don't break comparisons.
export function collectCustomHooksForSignature(type: any) {
  if (__DEV__) {
    const signature = allSignaturesByType.get(type);
    if (signature !== undefined) {
      computeFullKey(signature);
    }
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

export function getFamilyByID(id: string): Family | void {
  if (__DEV__) {
    return allFamiliesByID.get(id);
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

export function getFamilyByType(type: any): Family | void {
  if (__DEV__) {
    return allFamiliesByType.get(type);
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

export function injectIntoGlobalHook(globalObject: any): void {
  if (__DEV__) {
    // For React Native, the global hook will be set up by require('react-devtools-core').
    // That code will run before us. So we need to monkeypatch functions on existing hook.

    // For React Web, the global hook will be set up by the extension.
    // This will also run before us.
    let hook = globalObject.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook === undefined) {
      // However, if there is no DevTools extension, we'll need to set up the global hook ourselves.
      // Note that in this case it's important that renderer code runs *after* this method call.
      // Otherwise, the renderer will think that there is no global hook, and won't do the injection.
      let nextID = 0;
      globalObject.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook = {
        renderers: new Map(),
        supportsFiber: true,
        inject: injected => nextID++,
        onScheduleFiberRoot: (
          id: number,
          root: FiberRoot,
          children: ReactNodeList,
        ) => {},
        onCommitFiberRoot: (
          id: number,
          root: FiberRoot,
          maybePriorityLevel: mixed,
          didError: boolean,
        ) => {},
        onCommitFiberUnmount() {},
      };
    }

    if (hook.isDisabled) {
      // This isn't a real property on the hook, but it can be set to opt out
      // of DevTools integration and associated warnings and logs.
      // Using console['warn'] to evade Babel and ESLint
      console['warn'](
        'Something has shimmed the React DevTools global hook (__REACT_DEVTOOLS_GLOBAL_HOOK__). ' +
          'Fast Refresh is not compatible with this shim and will be disabled.',
      );
      return;
    }

    // Here, we just want to get a reference to scheduleRefresh.
    const oldInject = hook.inject;
    hook.inject = function (this: mixed, injected) {
      const id = oldInject.apply(this, arguments);
      if (
        typeof injected.scheduleRefresh === 'function' &&
        typeof injected.setRefreshHandler === 'function'
      ) {
        // This version supports React Refresh.
        helpersByRendererID.set(id, injected as any as RendererHelpers);
      }
      return id;
    };

    // Do the same for any already injected roots.
    // This is useful if ReactDOM has already been initialized.
    // https://github.com/facebook/react/issues/17626
    hook.renderers.forEach((injected, id) => {
      if (
        typeof injected.scheduleRefresh === 'function' &&
        typeof injected.setRefreshHandler === 'function'
      ) {
        // This version supports React Refresh.
        helpersByRendererID.set(id, injected as any as RendererHelpers);
      }
    });

    // We also want to track currently mounted roots.
    const oldOnCommitFiberRoot = hook.onCommitFiberRoot;
    const oldOnScheduleFiberRoot = hook.onScheduleFiberRoot || (() => {});
    hook.onScheduleFiberRoot = function (
      this: mixed,
      id: number,
      root: FiberRoot,
      children: ReactNodeList,
    ) {
      if (!isPerformingRefresh) {
        // If it was intentionally scheduled, don't attempt to restore.
        // This includes intentionally scheduled unmounts.
        failedRoots.delete(root);
        if (rootElements !== null) {
          rootElements.set(root, children);
        }
      }
      return oldOnScheduleFiberRoot.apply(this, arguments);
    };
    hook.onCommitFiberRoot = function (
      this: mixed,
      id: number,
      root: FiberRoot,
      maybePriorityLevel: mixed,
      didError: boolean,
    ) {
      const helpers = helpersByRendererID.get(id);
      if (helpers !== undefined) {
        helpersByRoot.set(root, helpers);

        const current = root.current;
        const alternate = current.alternate;

        // We need to determine whether this root has just (un)mounted.
        // This logic is copy-pasted from similar logic in the DevTools backend.
        // If this breaks with some refactoring, you'll want to update DevTools too.

        if (alternate !== null) {
          const wasMounted =
            alternate.memoizedState != null &&
            alternate.memoizedState.element != null &&
            mountedRoots.has(root);

          const isMounted =
            current.memoizedState != null &&
            current.memoizedState.element != null;

          if (!wasMounted && isMounted) {
            // Mount a new root.
            mountedRoots.add(root);
            failedRoots.delete(root);
          } else if (wasMounted && isMounted) {
            // Update an existing root.
            // This doesn't affect our mounted root Set.
          } else if (wasMounted && !isMounted) {
            // Unmount an existing root.
            mountedRoots.delete(root);
            if (didError) {
              // We'll remount it on future edits.
              failedRoots.add(root);
            } else {
              helpersByRoot.delete(root);
            }
          } else if (!wasMounted && !isMounted) {
            if (didError) {
              // We'll remount it on future edits.
              failedRoots.add(root);
            }
          }
        } else {
          // Mount a new root.
          mountedRoots.add(root);
        }
      }

      // Always call the decorated DevTools hook.
      return oldOnCommitFiberRoot.apply(this, arguments);
    };
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

export function hasUnrecoverableErrors(): boolean {
  // TODO: delete this after removing dependency in RN.
  return false;
}

// Exposed for testing.
export function _getMountedRootCount(): number {
  if (__DEV__) {
    return mountedRoots.size;
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

// This is a wrapper over more primitive functions for setting signature.
// Signatures let us decide whether the Hook order has changed on refresh.
//
// This function is intended to be used as a transform target, e.g.:
// var _s = createSignatureFunctionForTransform()
//
// function Hello() {
//   const [foo, setFoo] = useState(0);
//   const value = useCustomHook();
//   _s(); /* Call without arguments triggers collecting the custom Hook list.
//          * This doesn't happen during the module evaluation because we
//          * don't want to change the module order with inline requires.
//          * Next calls are noops. */
//   return <h1>Hi</h1>;
// }
//
// /* Call with arguments attaches the signature to the type: */
// _s(
//   Hello,
//   'useState{[foo, setFoo]}(0)',
//   () => [useCustomHook], /* Lazy to avoid triggering inline requires */
// );
export function createSignatureFunctionForTransform(): <T>(
  type: T,
  key: string,
  forceReset?: boolean,
  getCustomHooks?: () => Array<Function>,
) => T | void {
  if (__DEV__) {
    let savedType: mixed;
    let hasCustomHooks: boolean;
    let didCollectHooks = false;
    return function <T>(
      type: T,
      key: string,
      forceReset?: boolean,
      getCustomHooks?: () => Array<Function>,
    ): T | void {
      if (typeof key === 'string') {
        // We're in the initial phase that associates signatures
        // with the functions. Note this may be called multiple times
        // in HOC chains like _s(hoc1(_s(hoc2(_s(actualFunction))))).
        if (!savedType) {
          // We're in the innermost call, so this is the actual type.
          savedType = type;
          hasCustomHooks = typeof getCustomHooks === 'function';
        }
        // Set the signature for all types (even wrappers!) in case
        // they have no signatures of their own. This is to prevent
        // problems like https://github.com/facebook/react/issues/20417.
        if (
          type != null &&
          (typeof type === 'function' || typeof type === 'object')
        ) {
          setSignature(type, key, forceReset, getCustomHooks);
        }
        return type;
      } else {
        // We're in the _s() call without arguments, which means
        // this is the time to collect custom Hook signatures.
        // Only do this once. This path is hot and runs *inside* every render!
        if (!didCollectHooks && hasCustomHooks) {
          didCollectHooks = true;
          collectCustomHooksForSignature(savedType);
        }
      }
    };
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

export function isLikelyComponentType(type: any): boolean {
  if (__DEV__) {
    switch (typeof type) {
      case 'function': {
        // First, deal with classes.
        if (type.prototype != null) {
          if (type.prototype.isReactComponent) {
            // React class.
            return true;
          }
          const ownNames = Object.getOwnPropertyNames(type.prototype);
          if (ownNames.length > 1 || ownNames[0] !== 'constructor') {
            // This looks like a class.
            return false;
          }
          if (
            // $FlowFixMe[prop-missing]
            type.prototype.__proto__ !== Object.prototype // eslint-disable-line no-proto
          ) {
            // It has a superclass.
            return false;
          }
          // Pass through.
          // This looks like a regular function with empty prototype.
        }
        // For plain functions and arrows, use name as a heuristic.
        const name = type.name || type.displayName;
        return typeof name === 'string' && /^[A-Z]/.test(name);
      }
      case 'object': {
        if (type != null) {
          switch (getProperty(type, '$$typeof')) {
            case REACT_FORWARD_REF_TYPE:
            case REACT_MEMO_TYPE:
              // Definitely React components.
              return true;
            default:
              return false;
          }
        }
        return false;
      }
      default: {
        return false;
      }
    }
  } else {
    throw new Error(
      'Unexpected call to React Refresh in a production environment.',
    );
  }
}

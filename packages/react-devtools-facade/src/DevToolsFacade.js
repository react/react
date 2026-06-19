/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  DevToolsHook,
  WorkTagMap,
  CurrentDispatcherRef,
} from 'react-devtools-shared/src/backend/types';
import type {FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {
  getDisplayNameForFiberType,
  ReactPriorityLevelsType,
} from 'react-devtools-shared/src/backend/fiber/shared/DevToolsFiberInternalReactConstants';

import {getInternalReactConstants} from 'react-devtools-shared/src/backend/fiber/shared/DevToolsFiberInternalReactConstants';

// Re-export the tools assembler so the full building-block API is available
// from the package entry point (index.js re-exports this module).
export {createTools} from './DevToolsFacadeTools';
export type {Tools} from './DevToolsFacadeTools';

// Per-renderer internal constants, initialized at inject() time. Building
// blocks read these to translate fibers into human-readable output.
export type RendererInternals = {
  getDisplayNameForFiber: getDisplayNameForFiberType,
  ReactTypeOfWork: WorkTagMap,
  ReactPriorityLevels: ReactPriorityLevelsType,
  currentDispatcherRef: CurrentDispatcherRef,
};

// Profiling session state, shared between the hook (which records commits) and
// the profiler building blocks (which start/stop sessions and read results).
export type ProfilingState = {
  isActive: boolean,
  currentTraceName: string | null,
  traces: Map<string, any>,
  onCommit:
    | ((
        rendererID: number,
        root: FiberRoot,
        schedulerPriority: number | void,
      ) => void)
    | null,
  onPostCommit: ((root: FiberRoot) => void) | null,
};

// A self-contained handle over the installed DevTools hook and the runtime
// state it tracks. Building blocks (createTools, the tree/profiler factories)
// read from a Facade and never touch globals, so the integrator fully owns it.
export type Facade = {
  hook: DevToolsHook,
  fiberRoots: Map<number, Set<FiberRoot>>,
  rendererInternals: Map<number, RendererInternals>,
  profilingState: ProfilingState,
};

// Initialize per-renderer internal constants for a renderer registered with the
// hook. Shared by the installed hook's inject() and the attach path.
function initializeRendererInternals(
  rendererInternals: Map<number, RendererInternals>,
  id: number,
  renderer: any,
): void {
  const version = renderer.reconcilerVersion || renderer.version;
  if (version == null) {
    console.error(
      'react-devtools-facade: Renderer %s has no version, internals not initialized.',
      id,
    );
    return;
  }
  const {getDisplayNameForFiber, ReactTypeOfWork, ReactPriorityLevels} =
    getInternalReactConstants(version);
  rendererInternals.set(id, {
    getDisplayNameForFiber,
    ReactTypeOfWork,
    ReactPriorityLevels,
    currentDispatcherRef: renderer.currentDispatcherRef,
  });
}

// Record a commit: keep fiberRoots in sync (add new roots, drop unmounted ones)
// and drive a profiling session when one is active. Shared by the installed
// hook's onCommitFiberRoot and the attach path's wrapper.
function recordCommitFiberRoot(
  fiberRoots: Map<number, Set<FiberRoot>>,
  profilingState: ProfilingState,
  rendererID: number,
  root: any,
  schedulerPriority?: number,
): void {
  let mountedRoots = fiberRoots.get(rendererID);
  if (mountedRoots == null) {
    mountedRoots = new Set();
    fiberRoots.set(rendererID, mountedRoots);
  }
  const current = root.current;
  const isKnownRoot = mountedRoots.has(root);
  const isUnmounting =
    current.memoizedState == null || current.memoizedState.element == null;
  if (!isKnownRoot && !isUnmounting) {
    mountedRoots.add(root);
  } else if (isKnownRoot && isUnmounting) {
    mountedRoots.delete(root);
  }

  if (profilingState.isActive && profilingState.onCommit != null) {
    profilingState.onCommit(rendererID, root, schedulerPriority);
  }
}

// Attach to a DevTools hook that is already installed on the page — for example
// the React DevTools browser extension. Rather than replacing it (React would
// ignore a second hook), read the renderers and fiber roots it is already
// tracking, then wrap inject / onCommitFiberRoot / onPostCommitFiberRoot so
// future renderers, commits, and passive passes also feed the facade's state.
// The existing hook's own bookkeeping is preserved — we always call through to
// it first.
function attachToExistingHook(
  hook: any,
  fiberRoots: Map<number, Set<FiberRoot>>,
  rendererInternals: Map<number, RendererInternals>,
  profilingState: ProfilingState,
): void {
  // Back-fill renderers and roots registered before we attached (React may have
  // initialized first).
  if (hook.renderers instanceof Map) {
    hook.renderers.forEach((renderer: any, id: number) => {
      if (!rendererInternals.has(id)) {
        initializeRendererInternals(rendererInternals, id, renderer);
      }
      if (typeof hook.getFiberRoots === 'function') {
        let roots = fiberRoots.get(id);
        if (roots == null) {
          roots = new Set();
          fiberRoots.set(id, roots);
        }
        // Alias to a const so the non-null refinement survives into the closure.
        const mountedRoots = roots;
        hook.getFiberRoots(id).forEach((root: FiberRoot) => {
          mountedRoots.add(root);
        });
      }
    });
  }

  const originalInject = hook.inject;
  hook.inject = function inject(renderer: any, ...rest: Array<mixed>): number {
    const id = originalInject.call(hook, renderer, ...rest);
    if (typeof id === 'number') {
      initializeRendererInternals(rendererInternals, id, renderer);
    }
    return id;
  };

  const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
  hook.onCommitFiberRoot = function onCommitFiberRoot(
    rendererID: number,
    root: any,
    schedulerPriority?: number,
    ...rest: Array<mixed>
  ) {
    if (typeof originalOnCommitFiberRoot === 'function') {
      originalOnCommitFiberRoot.call(
        hook,
        rendererID,
        root,
        schedulerPriority,
        ...rest,
      );
    }
    recordCommitFiberRoot(
      fiberRoots,
      profilingState,
      rendererID,
      root,
      schedulerPriority,
    );
  };

  const originalOnPostCommitFiberRoot = hook.onPostCommitFiberRoot;
  hook.onPostCommitFiberRoot = function onPostCommitFiberRoot(
    rendererID: number,
    root: any,
    ...rest: Array<mixed>
  ) {
    if (typeof originalOnPostCommitFiberRoot === 'function') {
      originalOnPostCommitFiberRoot.call(hook, rendererID, root, ...rest);
    }
    if (profilingState.isActive && profilingState.onPostCommit != null) {
      profilingState.onPostCommit(root);
    }
  };
}

/**
 * Install the React DevTools facade and return a Facade handle.
 *
 * If `__REACT_DEVTOOLS_GLOBAL_HOOK__` is not yet present, this installs the
 * facade's own minimal hook (the global React looks for at init). If a hook is
 * already installed — e.g. the user has the React DevTools browser extension —
 * the facade attaches to that hook instead of installing a second one.
 *
 * Either way the returned Facade exposes the same `{hook, fiberRoots,
 * rendererInternals, profilingState}` that building blocks such as
 * `createTools(facade)` read from. Install before React initializes so the first
 * commit is captured; when attaching, roots committed before attach are
 * back-filled from the existing hook.
 */
export function installFacade(target?: any = globalThis): Facade {
  const fiberRoots: Map<number, Set<FiberRoot>> = new Map();
  const rendererInternals: Map<number, RendererInternals> = new Map();
  const profilingState: ProfilingState = {
    isActive: false,
    currentTraceName: null,
    traces: new Map(),
    onCommit: null,
    onPostCommit: null,
  };

  // A hook is already installed (e.g. the React DevTools extension). Attach to
  // it rather than replacing it.
  const existingHook = target.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (existingHook != null) {
    attachToExistingHook(
      existingHook,
      fiberRoots,
      rendererInternals,
      profilingState,
    );
    return {hook: existingHook, fiberRoots, rendererInternals, profilingState};
  }

  let registeredRenderersCount = 0;

  // $FlowFixMe[incompatible-type] the facade provides a minimal subset of DevToolsHook
  const hook: DevToolsHook = {
    listeners: {},
    rendererInterfaces: new Map(),
    renderers: new Map(),
    hasUnsupportedRendererAttached: false,
    backends: new Map(),
    emit() {},
    getFiberRoots(rendererID: number) {
      let roots = fiberRoots.get(rendererID);
      if (roots == null) {
        roots = new Set();
        fiberRoots.set(rendererID, roots);
      }
      return roots;
    },
    inject(renderer: any): number {
      const id = registeredRenderersCount++;
      hook.renderers.set(id, renderer);
      initializeRendererInternals(rendererInternals, id, renderer);
      return id;
    },
    on() {},
    off() {},
    sub() {
      return () => {};
    },
    supportsFiber: true,
    supportsFlight: true,
    checkDCE() {},
    onCommitFiberRoot(
      rendererID: number,
      root: any,
      schedulerPriority?: number,
    ) {
      recordCommitFiberRoot(
        fiberRoots,
        profilingState,
        rendererID,
        root,
        schedulerPriority,
      );
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot(rendererID: number, root: any) {
      if (profilingState.isActive && profilingState.onPostCommit != null) {
        profilingState.onPostCommit(root);
      }
    },
    getInternalModuleRanges(): Array<[string, string]> {
      return [];
    },
    registerInternalModuleStart() {},
    registerInternalModuleStop() {},
  };

  Object.defineProperty(target, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
    configurable: __DEV__,
    enumerable: false,
    get() {
      return hook;
    },
  });

  return {hook, fiberRoots, rendererInternals, profilingState};
}

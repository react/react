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

/**
 * Install the React DevTools facade: install `__REACT_DEVTOOLS_GLOBAL_HOOK__`
 * on `target` (defaults to globalThis) and return a Facade handle.
 *
 * This installs ONLY `__REACT_DEVTOOLS_GLOBAL_HOOK__` — the global React looks
 * for at initialization time. It does not install any tool globals: the
 * returned Facade is passed to building blocks such as `createTools(facade)`,
 * and the integrator decides whether to expose the resulting tools on globals.
 *
 * Must run BEFORE React initializes so the hook captures the first commit.
 */
export function installFacade(target?: any = globalThis): Facade {
  // Guard against double-install (e.g. bundled twice or mixed with full DevTools).
  if (target.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    throw new Error(
      'React DevTools global hook is already installed. ' +
        'react-devtools-facade should not be used with any other React DevTools package.',
    );
  }

  // Fiber root tracking — the only runtime state the hook maintains.
  // onCommitFiberRoot adds/removes entries so that unmounted roots are
  // garbage-collected. Building blocks walk from these roots on demand.
  const fiberRoots: Map<number, Set<FiberRoot>> = new Map();

  const rendererInternals: Map<number, RendererInternals> = new Map();

  const profilingState: ProfilingState = {
    isActive: false,
    currentTraceName: null,
    traces: new Map(),
    onCommit: null,
    onPostCommit: null,
  };

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
      // Initialize internal constants for this renderer's React version.
      const version = renderer.reconcilerVersion || renderer.version;
      if (version == null) {
        console.error(
          'react-devtools-facade: Renderer %s has no version, internals not initialized.',
          id,
        );
      } else {
        const {getDisplayNameForFiber, ReactTypeOfWork, ReactPriorityLevels} =
          getInternalReactConstants(version);
        rendererInternals.set(id, {
          getDisplayNameForFiber,
          ReactTypeOfWork,
          ReactPriorityLevels,
          currentDispatcherRef: renderer.currentDispatcherRef,
        });
      }
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
      // Hot path — called on every React commit. Keep minimal: just
      // add or remove the root so building blocks can find it later.
      const mountedRoots = hook.getFiberRoots(rendererID);
      const current = root.current;
      const isKnownRoot = mountedRoots.has(root);
      const isUnmounting =
        current.memoizedState == null || current.memoizedState.element == null;
      if (!isKnownRoot && !isUnmounting) {
        mountedRoots.add(root);
      } else if (isKnownRoot && isUnmounting) {
        mountedRoots.delete(root);
      }

      // Profiling: record commit durations when a session is active.
      if (profilingState.isActive && profilingState.onCommit != null) {
        profilingState.onCommit(rendererID, root, schedulerPriority);
      }
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

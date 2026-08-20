/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Lane, Lanes} from './ReactFiberLane';
import type {Fiber, FiberRoot} from './ReactInternalTypes';
import type {ReactNodeList, Wakeable} from 'shared/ReactTypes';
import type {EventPriority} from './ReactEventPriorities';
// import type {DevToolsProfilingHooks} from 'react-devtools-shared/src/backend/types';
// TODO: This import doesn't work because the DevTools depend on the DOM version of React
// and to properly type check against DOM React we can't also type check again non-DOM
// React which this hook might be in.
type DevToolsProfilingHooks = any;

import {DidCapture} from './ReactFiberFlags';
import {
  enableProfilerTimer,
  enableSchedulingProfiler,
} from 'shared/ReactFeatureFlags';
import {
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
} from './ReactEventPriorities';
import {
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
  log,
  unstable_setDisableYieldValue,
} from './Scheduler';

declare const __REACT_DEVTOOLS_GLOBAL_HOOK__: Object | void;

let rendererID = null;
let injectedHook = null;
let injectedProfilingHooks: DevToolsProfilingHooks | null = null;
let hasLoggedError = false;

export const isDevToolsPresent =
  typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';

export function injectInternals(internals: Object): boolean {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
    // No DevTools
    return false;
  }
  const hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook.isDisabled) {
    // This isn't a real property on the hook, but it can be set to opt out
    // of DevTools integration and associated warnings and logs.
    // https://github.com/facebook/react/issues/3877
    return true;
  }
  if (!hook.supportsFiber) {
    if (__DEV__) {
      console.error(
        'The installed version of React DevTools is too old and will not work ' +
          'with the current version of React. Please update React DevTools. ' +
          'https://react.dev/link/react-devtools',
      );
    }
    // DevTools exists, even though it doesn't support Fiber.
    return true;
  }
  try {
    rendererID = hook.inject(internals);

    // We have successfully injected, so now it is safe to set up hooks.
    injectedHook = hook;
  } catch (err) {
    // Catch all errors because it is unsafe to throw during initialization.
    if (__DEV__) {
      console.error('React instrumentation encountered an error: %o.', err);
    }
  }
  if (hook.checkDCE) {
    // This is the real DevTools.
    return true;
  } else {
    // This is likely a hook installed by Fast Refresh runtime.
    return false;
  }
}

export function onScheduleRoot(root: FiberRoot, children: ReactNodeList) {
  if (__DEV__) {
    if (
      injectedHook &&
      typeof injectedHook.onScheduleFiberRoot === 'function'
    ) {
      try {
        injectedHook.onScheduleFiberRoot(rendererID, root, children);
      } catch (err) {
        if (__DEV__ && !hasLoggedError) {
          hasLoggedError = true;
          console.error('React instrumentation encountered an error: %o', err);
        }
      }
    }
  }
}

export function onCommitRoot(root: FiberRoot, eventPriority: EventPriority) {
  if (injectedHook && typeof injectedHook.onCommitFiberRoot === 'function') {
    try {
      const didError = (root.current.flags & DidCapture) === DidCapture;
      if (enableProfilerTimer) {
        let schedulerPriority;
        switch (eventPriority) {
          case DiscreteEventPriority:
            schedulerPriority = ImmediateSchedulerPriority;
            break;
          case ContinuousEventPriority:
            schedulerPriority = UserBlockingSchedulerPriority;
            break;
          case DefaultEventPriority:
            schedulerPriority = NormalSchedulerPriority;
            break;
          case IdleEventPriority:
            schedulerPriority = IdleSchedulerPriority;
            break;
          default:
            schedulerPriority = NormalSchedulerPriority;
            break;
        }
        injectedHook.onCommitFiberRoot(
          rendererID,
          root,
          schedulerPriority,
          didError,
        );
      } else {
        injectedHook.onCommitFiberRoot(rendererID, root, undefined, didError);
      }
    } catch (err) {
      if (__DEV__) {
        if (!hasLoggedError) {
          hasLoggedError = true;
          console.error('React instrumentation encountered an error: %o', err);
        }
      }
    }
  }
}

export function onPostCommitRoot(root: FiberRoot) {
  if (
    injectedHook &&
    typeof injectedHook.onPostCommitFiberRoot === 'function'
  ) {
    try {
      injectedHook.onPostCommitFiberRoot(rendererID, root);
    } catch (err) {
      if (__DEV__) {
        if (!hasLoggedError) {
          hasLoggedError = true;
          console.error('React instrumentation encountered an error: %o', err);
        }
      }
    }
  }
}

export function onCommitUnmount(fiber: Fiber) {
  if (injectedHook && typeof injectedHook.onCommitFiberUnmount === 'function') {
    try {
      injectedHook.onCommitFiberUnmount(rendererID, fiber);
    } catch (err) {
      if (__DEV__) {
        if (!hasLoggedError) {
          hasLoggedError = true;
          console.error('React instrumentation encountered an error: %o', err);
        }
      }
    }
  }
}

export function setIsStrictModeForDevtools(newIsStrictMode: boolean) {
  if (typeof log === 'function') {
    // We're in a test because Scheduler.log only exists
    // in SchedulerMock. To reduce the noise in strict mode tests,
    // suppress warnings and disable scheduler yielding during the double render
    unstable_setDisableYieldValue(newIsStrictMode);
  }

  if (injectedHook && typeof injectedHook.setStrictMode === 'function') {
    try {
      injectedHook.setStrictMode(rendererID, newIsStrictMode);
    } catch (err) {
      if (__DEV__) {
        if (!hasLoggedError) {
          hasLoggedError = true;
          console.error('React instrumentation encountered an error: %o', err);
        }
      }
    }
  }
}

// Profiler API hooks

export function injectProfilingHooks(
  profilingHooks: DevToolsProfilingHooks,
): void {
  injectedProfilingHooks = profilingHooks;
}

export function markCommitStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markCommitStarted === 'function'
    ) {
      injectedProfilingHooks.markCommitStarted(lanes);
    }
  }
}

export function markCommitStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markCommitStopped === 'function'
    ) {
      injectedProfilingHooks.markCommitStopped();
    }
  }
}

export function markComponentRenderStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentRenderStarted === 'function'
    ) {
      injectedProfilingHooks.markComponentRenderStarted(fiber);
    }
  }
}

export function markComponentRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentRenderStopped === 'function'
    ) {
      injectedProfilingHooks.markComponentRenderStopped();
    }
  }
}

export function markComponentPassiveEffectMountStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentPassiveEffectMountStarted ===
        'function'
    ) {
      injectedProfilingHooks.markComponentPassiveEffectMountStarted(fiber);
    }
  }
}

export function markComponentPassiveEffectMountStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentPassiveEffectMountStopped ===
        'function'
    ) {
      injectedProfilingHooks.markComponentPassiveEffectMountStopped();
    }
  }
}

export function markComponentPassiveEffectUnmountStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStarted ===
        'function'
    ) {
      injectedProfilingHooks.markComponentPassiveEffectUnmountStarted(fiber);
    }
  }
}

export function markComponentPassiveEffectUnmountStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStopped ===
        'function'
    ) {
      injectedProfilingHooks.markComponentPassiveEffectUnmountStopped();
    }
  }
}

export function markComponentLayoutEffectMountStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentLayoutEffectMountStarted ===
        'function'
    ) {
      injectedProfilingHooks.markComponentLayoutEffectMountStarted(fiber);
    }
  }
}

export function markComponentLayoutEffectMountStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentLayoutEffectMountStopped ===
        'function'
    ) {
      injectedProfilingHooks.markComponentLayoutEffectMountStopped();
    }
  }
}

export function markComponentLayoutEffectUnmountStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStarted ===
        'function'
    ) {
      injectedProfilingHooks.markComponentLayoutEffectUnmountStarted(fiber);
    }
  }
}

export function markComponentLayoutEffectUnmountStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStopped ===
        'function'
    ) {
      injectedProfilingHooks.markComponentLayoutEffectUnmountStopped();
    }
  }
}

export function markComponentErrored(
  fiber: Fiber,
  thrownValue: mixed,
  lanes: Lanes,
): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentErrored === 'function'
    ) {
      injectedProfilingHooks.markComponentErrored(fiber, thrownValue, lanes);
    }
  }
}

export function markComponentSuspended(
  fiber: Fiber,
  wakeable: Wakeable,
  lanes: Lanes,
): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markComponentSuspended === 'function'
    ) {
      injectedProfilingHooks.markComponentSuspended(fiber, wakeable, lanes);
    }
  }
}

export function markLayoutEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markLayoutEffectsStarted === 'function'
    ) {
      injectedProfilingHooks.markLayoutEffectsStarted(lanes);
    }
  }
}

export function markLayoutEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markLayoutEffectsStopped === 'function'
    ) {
      injectedProfilingHooks.markLayoutEffectsStopped();
    }
  }
}

export function markPassiveEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markPassiveEffectsStarted === 'function'
    ) {
      injectedProfilingHooks.markPassiveEffectsStarted(lanes);
    }
  }
}

export function markPassiveEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markPassiveEffectsStopped === 'function'
    ) {
      injectedProfilingHooks.markPassiveEffectsStopped();
    }
  }
}

export function markRenderStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markRenderStarted === 'function'
    ) {
      injectedProfilingHooks.markRenderStarted(lanes);
    }
  }
}

export function markRenderYielded(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markRenderYielded === 'function'
    ) {
      injectedProfilingHooks.markRenderYielded();
    }
  }
}

export function markRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markRenderStopped === 'function'
    ) {
      injectedProfilingHooks.markRenderStopped();
    }
  }
}

export function markRenderScheduled(lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markRenderScheduled === 'function'
    ) {
      injectedProfilingHooks.markRenderScheduled(lane);
    }
  }
}

export function markForceUpdateScheduled(fiber: Fiber, lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markForceUpdateScheduled === 'function'
    ) {
      injectedProfilingHooks.markForceUpdateScheduled(fiber, lane);
    }
  }
}

export function markStateUpdateScheduled(fiber: Fiber, lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (
      injectedProfilingHooks !== null &&
      typeof injectedProfilingHooks.markStateUpdateScheduled === 'function'
    ) {
      injectedProfilingHooks.markStateUpdateScheduled(fiber, lane);
    }
  }
}

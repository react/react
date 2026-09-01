/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactComponentInfo} from 'shared/ReactTypes';

import type {DevToolsHook, ReactRenderer, RendererInterface} from '../types';

import {getOwnerStackByComponentInfoInDev} from './DevToolsComponentInfoStack';

import {formatOwnerStack} from '../shared/DevToolsOwnerStack';

import {componentInfoToComponentLogsMap} from '../shared/DevToolsServerComponentLogs';

import {formatConsoleArgumentsToSingleString} from 'react-devtools-shared/src/backend/utils';

function supportsConsoleTasks(componentInfo: ReactComponentInfo): boolean {
  // If this ReactComponentInfo supports native console.createTask then we are already running
  // inside a native async stack trace if it's active - meaning the DevTools is open.
  // Ideally we'd detect if this task was created while the DevTools was open or not.
  return !!componentInfo.debugTask;
}

export function attach(
  hook: DevToolsHook,
  rendererID: number,
  renderer: ReactRenderer,
  global: Object,
): RendererInterface {
  const {getCurrentComponentInfo} = renderer;

  function getComponentStack(
    topFrame: Error,
  ): null | {enableOwnerStacks: boolean, componentStack: string} {
    if (getCurrentComponentInfo === undefined) {
      // Expected this to be part of the renderer. Ignore.
      return null;
    }
    const current = getCurrentComponentInfo();
    if (current === null) {
      // Outside of our render scope.
      return null;
    }

    if (supportsConsoleTasks(current)) {
      // This will be handled natively by console.createTask. No need for
      // DevTools to add it.
      return null;
    }

    const enableOwnerStacks = current.debugStack != null;
    let componentStack = '';
    if (enableOwnerStacks) {
      // Prefix the owner stack with the current stack. I.e. what called
      // console.error. While this will also be part of the native stack,
      // it is hidden and not presented alongside this argument so we print
      // them all together.
      const topStackFrames = formatOwnerStack(topFrame);
      if (topStackFrames) {
        componentStack += '\n' + topStackFrames;
      }
      componentStack += getOwnerStackByComponentInfoInDev(current);
    }
    return {enableOwnerStacks, componentStack};
  }

  // Called when an error or warning is logged during render, commit, or passive (including unmount functions).
  function onErrorOrWarning(
    type: 'error' | 'warn',
    args: $ReadOnlyArray<any>,
  ): void {
    if (getCurrentComponentInfo === undefined) {
      // Expected this to be part of the renderer. Ignore.
      return;
    }
    const componentInfo = getCurrentComponentInfo();
    if (componentInfo === null) {
      // Outside of our render scope.
      return;
    }

    if (
      args.length > 3 &&
      typeof args[0] === 'string' &&
      args[0].startsWith('%c%s%c ') &&
      typeof args[1] === 'string' &&
      typeof args[2] === 'string' &&
      typeof args[3] === 'string'
    ) {
      // This looks like the badge we prefixed to the log. Our UI doesn't support formatted logs.
      // We remove the formatting. If the environment of the log is the same as the environment of
      // the component (the common case) we remove the badge completely otherwise leave it plain
      const format = args[0].slice(7);
      const env = args[2].trim();
      args = args.slice(4);
      if (env !== componentInfo.env) {
        args.unshift('[' + env + '] ' + format);
      } else {
        args.unshift(format);
      }
    }

    // We can't really use this message as a unique key, since we can't distinguish
    // different objects in this implementation. We have to delegate displaying of the objects
    // to the environment, the browser console, for example, so this is why this should be kept
    // as an array of arguments, instead of the plain string.
    // [Warning: %o, {...}] and [Warning: %o, {...}] will be considered as the same message,
    // even if objects are different
    const message = formatConsoleArgumentsToSingleString(...args);

    // Track the warning/error for later.
    let componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
    if (componentLogsEntry === undefined) {
      componentLogsEntry = {
        errors: new Map(),
        errorsCount: 0 as number,
        warnings: new Map(),
        warningsCount: 0 as number,
      };
      componentInfoToComponentLogsMap.set(componentInfo, componentLogsEntry);
    }

    const messageMap =
      type === 'error'
        ? componentLogsEntry.errors
        : componentLogsEntry.warnings;
    const count = messageMap.get(message) || 0;
    messageMap.set(message, count + 1);
    if (type === 'error') {
      componentLogsEntry.errorsCount++;
    } else {
      componentLogsEntry.warningsCount++;
    }

    // The changes will be flushed later when we commit this tree to Fiber.
  }

  const supportsTogglingSuspense = false;

  return {
    cleanup() {},
    clearErrorsAndWarnings() {},
    clearErrorsForElementID() {},
    clearWarningsForElementID() {},
    getSerializedElementValueByPath() {},
    deletePath() {},
    findHostInstancesForElementID() {
      return null;
    },
    findLastKnownRectsForID() {
      return null;
    },
    flushInitialOperations() {},
    getBestMatchForTrackedPath() {
      return null;
    },
    getComponentStack,
    getDisplayNameForElementID() {
      return null;
    },
    getNearestMountedDOMNode() {
      return null;
    },
    getElementIDForHostInstance() {
      return null;
    },
    getSuspenseNodeIDForHostInstance() {
      return null;
    },
    getInstanceAndStyle() {
      return {
        instance: null,
        style: null,
      };
    },
    getOwnersList() {
      return null;
    },
    getPathForElement() {
      return null;
    },
    getProfilingData() {
      throw new Error('getProfilingData not supported by this renderer');
    },
    handleCommitFiberRoot() {},
    handleCommitFiberUnmount() {},
    handlePostCommitFiberRoot() {},
    hasElementWithId() {
      return false;
    },
    inspectElement(
      requestID: number,
      id: number,
      path: Array<string | number> | null,
    ) {
      return {
        id,
        responseID: requestID,
        type: 'not-found',
      };
    },
    logElementToConsole() {},
    getElementAttributeByPath() {},
    getElementSourceFunctionById() {},
    onErrorOrWarning,
    overrideError() {},
    overrideSuspense() {},
    overrideSuspenseMilestone() {},
    overrideValueAtPath() {},
    renamePath() {},
    renderer,
    setTraceUpdatesEnabled() {},
    setTrackedPath() {},
    startProfiling() {},
    stopProfiling() {},
    storeAsGlobal() {},
    supportsTogglingSuspense,
    updateComponentFilters() {},
    getEnvironmentNames() {
      return [];
    },
  };
}

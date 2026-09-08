/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {hydrate, fillInPath} from 'react-devtools-shared/src/hydration';
import {backendToFrontendSerializedElementMapper} from 'react-devtools-shared/src/utils';
import Store from 'react-devtools-shared/src/devtools/store';
import TimeoutError from 'react-devtools-shared/src/errors/TimeoutError';
import ElementPollingCancellationError from 'react-devtools-shared/src/errors/ElementPollingCancellationError';

import type {
  InspectedElement as InspectedElementBackend,
  InspectedElementPayload,
  SerializedAsyncInfo as SerializedAsyncInfoBackend,
} from 'react-devtools-shared/src/backend/types';
import type {
  BackendEvents,
  FrontendBridge,
} from 'react-devtools-shared/src/bridge';
import type {
  DehydratedData,
  InspectedElement as InspectedElementFrontend,
  SerializedAsyncInfo as SerializedAsyncInfoFrontend,
} from 'react-devtools-shared/src/frontend/types';
import type {InspectedElementPath} from 'react-devtools-shared/src/frontend/types';

export function clearErrorsAndWarnings({
  bridge,
  store,
}: {
  bridge: FrontendBridge,
  store: Store,
}): void {
  store.rootIDToRendererID.forEach(rendererID => {
    bridge.send('clearErrorsAndWarnings', {rendererID});
  });
}

export function clearErrorsForElement({
  bridge,
  id,
  rendererID,
}: {
  bridge: FrontendBridge,
  id: number,
  rendererID: number,
}): void {
  bridge.send('clearErrorsForElementID', {
    rendererID,
    id,
  });
}

export function clearWarningsForElement({
  bridge,
  id,
  rendererID,
}: {
  bridge: FrontendBridge,
  id: number,
  rendererID: number,
}): void {
  bridge.send('clearWarningsForElementID', {
    rendererID,
    id,
  });
}

export function copyInspectedElementPath({
  bridge,
  id,
  path,
  rendererID,
}: {
  bridge: FrontendBridge,
  id: number,
  path: Array<string | number>,
  rendererID: number,
}): void {
  bridge.send('copyElementPath', {
    id,
    path,
    rendererID,
  });
}

export function inspectElement(
  bridge: FrontendBridge,
  forceFullData: boolean,
  id: number,
  path: InspectedElementPath | null,
  rendererID: number,
  shouldListenToPauseEvents: boolean,
): Promise<InspectedElementPayload> {
  const requestID = requestCounter++;
  const promise = getPromiseForRequestID<InspectedElementPayload>(
    requestID,
    'inspectedElement',
    bridge,
    `Timed out while inspecting element ${id}.`,
    shouldListenToPauseEvents,
  );

  bridge.send('inspectElement', {
    forceFullData,
    id,
    path,
    rendererID,
    requestID,
  });

  return promise;
}

export function inspectScreen(
  bridge: FrontendBridge,
  forceFullData: boolean,
  arbitraryRootID: number,
  path: InspectedElementPath | null,
  shouldListenToPauseEvents: boolean,
): Promise<InspectedElementPayload> {
  const requestID = requestCounter++;
  const promise = getPromiseForRequestID<InspectedElementPayload>(
    requestID,
    'inspectedScreen',
    bridge,
    `Timed out while inspecting screen.`,
    shouldListenToPauseEvents,
  );

  bridge.send('inspectScreen', {
    requestID,
    id: arbitraryRootID,
    path,
    forceFullData,
  });

  return promise;
}

let storeAsGlobalCount = 0;

export function storeAsGlobal({
  bridge,
  id,
  path,
  rendererID,
}: {
  bridge: FrontendBridge,
  id: number,
  path: Array<string | number>,
  rendererID: number,
}): void {
  bridge.send('storeAsGlobal', {
    count: storeAsGlobalCount++,
    id,
    path,
    rendererID,
  });
}

const TIMEOUT_DELAY = 10_000;

let requestCounter = 0;

function getPromiseForRequestID<T>(
  requestID: number,
  eventType: $Keys<BackendEvents>,
  bridge: FrontendBridge,
  timeoutMessage: string,
  shouldListenToPauseEvents: boolean = false,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      bridge.removeListener(eventType, onInspectedElement);
      bridge.removeListener('shutdown', onShutdown);

      if (shouldListenToPauseEvents) {
        bridge.removeListener('pauseElementPolling', onDisconnect);
      }

      clearTimeout(timeoutID);
    };

    const onShutdown = () => {
      cleanup();
      reject(
        new Error(
          'Failed to inspect element. Try again or restart React DevTools.',
        ),
      );
    };

    const onDisconnect = () => {
      cleanup();
      reject(new ElementPollingCancellationError());
    };

    const onInspectedElement = (data: any) => {
      if (data.responseID === requestID) {
        cleanup();
        resolve(data as T);
      }
    };

    const onTimeout = () => {
      cleanup();
      reject(new TimeoutError(timeoutMessage));
    };

    bridge.addListener(eventType, onInspectedElement);
    bridge.addListener('shutdown', onShutdown);

    if (shouldListenToPauseEvents) {
      bridge.addListener('pauseElementPolling', onDisconnect);
    }

    const timeoutID = setTimeout(onTimeout, TIMEOUT_DELAY);
  });
}

export function cloneInspectedElementWithPath(
  inspectedElement: InspectedElementFrontend,
  path: Array<string | number>,
  value: Object,
): InspectedElementFrontend {
  const hydratedValue = hydrateHelper(value, path);
  const clonedInspectedElement = {...inspectedElement};

  fillInPath(clonedInspectedElement, value, path, hydratedValue);

  return clonedInspectedElement;
}

function backendToFrontendSerializedAsyncInfo(
  asyncInfo: SerializedAsyncInfoBackend,
): SerializedAsyncInfoFrontend {
  const ioInfo = asyncInfo.awaited;
  return {
    awaited: {
      name: ioInfo.name,
      description: ioInfo.description,
      start: ioInfo.start,
      end: ioInfo.end,
      byteSize: ioInfo.byteSize,
      value: ioInfo.value,
      env: ioInfo.env,
      owner:
        ioInfo.owner === null
          ? null
          : backendToFrontendSerializedElementMapper(ioInfo.owner),
      stack: ioInfo.stack,
    },
    env: asyncInfo.env,
    owner:
      asyncInfo.owner === null
        ? null
        : backendToFrontendSerializedElementMapper(asyncInfo.owner),
    stack: asyncInfo.stack,
  };
}

export function convertInspectedElementBackendToFrontend(
  inspectedElementBackend: InspectedElementBackend,
): InspectedElementFrontend {
  const {
    canEditFunctionProps,
    canEditFunctionPropsDeletePaths,
    canEditFunctionPropsRenamePaths,
    canEditHooks,
    canEditHooksAndDeletePaths,
    canEditHooksAndRenamePaths,
    canToggleError,
    isErrored,
    canToggleSuspense,
    isSuspended,
    hasLegacyContext,
    id,
    type,
    owners,
    env,
    source,
    stack,
    context,
    hooks,
    plugins,
    props,
    rendererPackageName,
    rendererVersion,
    rootType,
    state,
    key,
    errors,
    warnings,
    suspendedBy,
    suspendedByRange,
    unknownSuspenders,
    nativeTag,
  } = inspectedElementBackend;

  const hydratedSuspendedBy: null | Array<SerializedAsyncInfoBackend> =
    hydrateHelper(suspendedBy);

  const inspectedElement: InspectedElementFrontend = {
    canEditFunctionProps,
    canEditFunctionPropsDeletePaths,
    canEditFunctionPropsRenamePaths,
    canEditHooks,
    canEditHooksAndDeletePaths,
    canEditHooksAndRenamePaths,
    canToggleError,
    isErrored,
    canToggleSuspense,
    isSuspended,
    hasLegacyContext,
    id,
    key,
    plugins,
    rendererPackageName,
    rendererVersion,
    rootType,
    // Previous backend implementations (<= 6.1.5) have a different interface for Source.
    // This gates the source features for only compatible backends: >= 6.1.6
    source: Array.isArray(source) ? source : null,
    stack: stack,
    type,
    owners:
      owners === null
        ? null
        : owners.map(backendToFrontendSerializedElementMapper),
    env,
    context: hydrateHelper(context),
    hooks: hydrateHelper(hooks),
    props: hydrateHelper(props),
    state: hydrateHelper(state),
    errors,
    warnings,
    suspendedBy:
      hydratedSuspendedBy == null // backwards compat
        ? []
        : hydratedSuspendedBy.map(backendToFrontendSerializedAsyncInfo),
    suspendedByRange,
    unknownSuspenders,
    nativeTag,
  };

  return inspectedElement;
}

export function hydrateHelper(
  dehydratedData: DehydratedData | null,
  path: ?InspectedElementPath,
): Object | null {
  if (dehydratedData !== null) {
    const {cleaned, data, unserializable} = dehydratedData;

    if (path) {
      const {length} = path;
      if (length > 0) {
        // Hydration helper requires full paths, but inspection dehydrates with relative paths.
        // In that event it's important that we adjust the "cleaned" paths to match.
        return hydrate(
          data,
          cleaned.map(cleanedPath => cleanedPath.slice(length)),
          unserializable.map(unserializablePath =>
            unserializablePath.slice(length),
          ),
        );
      }
    }

    return hydrate(data, cleaned, unserializable);
  } else {
    return null;
  }
}

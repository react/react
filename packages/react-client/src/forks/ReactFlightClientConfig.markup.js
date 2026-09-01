/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export {default as rendererVersion} from 'shared/ReactVersion';
export const rendererPackageName = 'react-markup';

import type {Thenable} from 'shared/ReactTypes';

export * from 'react-markup/src/ReactMarkupLegacyClientStreamConfig.js';
export * from 'react-client/src/ReactClientConsoleConfigPlain';
export * from 'react-client/src/ReactClientDebugConfigPlain';

export type ModuleLoading = null;
export type ServerConsumerModuleMap = null;
export opaque type ServerManifest = null;
export type ServerReferenceId = string;
export opaque type ClientReferenceMetadata = null;
export opaque type ClientReference<T> = null; // eslint-disable-line no-unused-vars

export function prepareDestinationForModule(
  moduleLoading: ModuleLoading,
  nonce: ?string,
  metadata: ClientReferenceMetadata,
) {
  throw new Error(
    'renderToHTML should not have emitted Client References. This is a bug in React.',
  );
}

export function resolveClientReference<T>(
  bundlerConfig: ServerConsumerModuleMap,
  metadata: ClientReferenceMetadata,
): ClientReference<T> {
  throw new Error(
    'renderToHTML should not have emitted Client References. This is a bug in React.',
  );
}

export function resolveServerReference<T>(
  config: ServerManifest,
  id: ServerReferenceId,
): ClientReference<T> {
  throw new Error(
    'renderToHTML should not have emitted Server References. This is a bug in React.',
  );
}

export function preloadModule<T>(
  metadata: ClientReference<T>,
): null | Thenable<T> {
  return null;
}

export function requireModule<T>(metadata: ClientReference<T>): T {
  throw new Error(
    'renderToHTML should not have emitted Client References. This is a bug in React.',
  );
}

export function getModuleDebugInfo<T>(metadata: ClientReference<T>): null {
  throw new Error(
    'renderToHTML should not have emitted Client References. This is a bug in React.',
  );
}

export const usedWithSSR = true;

type HintCode = string;
type HintModel<T: HintCode> = null; // eslint-disable-line no-unused-vars

export function dispatchHint<Code: HintCode>(
  code: Code,
  model: HintModel<Code>,
): void {
  // Should never happen.
}

export function preinitModuleForSSR(
  href: string,
  nonce: ?string,
  crossOrigin: ?string,
) {
  // Should never happen.
}

export function preinitScriptForSSR(
  href: string,
  nonce: ?string,
  crossOrigin: ?string,
) {
  // Should never happen.
}

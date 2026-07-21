/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Request} from 'react-server/src/ReactFlightServer';
import type {ReactComponentInfo} from 'shared/ReactTypes';
import type {ReactClientValue} from 'react-server/src/ReactFlightServer';

export type HintCode = string;
export type HintModel<T: HintCode> = null; // eslint-disable-line no-unused-vars
export type Hints = null;

export function createHints(): Hints {
  return null;
}

export type FormatContext = null;

export function createRootFormatContext(): FormatContext {
  return null;
}

export function getChildFormatContext(
  parentContext: FormatContext,
  type: string,
  props: Object,
): FormatContext {
  return parentContext;
}

export const supportsRequestStorage = false;
export const requestStorage: AsyncLocalStorage<Request | void> = null as any;

export const supportsComponentStorage = false;
export const componentStorage: AsyncLocalStorage<ReactComponentInfo | void> =
  null as any;

export * from '../ReactFlightServerConfigDebugNoop';

export * from '../ReactFlightStackConfigV8';
export * from '../ReactServerConsoleConfigPlain';

export type ClientManifest = null;
export opaque type ClientReference<T> = null; // eslint-disable-line no-unused-vars
export opaque type ServerReference<T> = null; // eslint-disable-line no-unused-vars
export type ClientReferenceMetadata =
  | [string, string]
  | [string, string, $ReadOnlyArray<mixed>]
  | [string, string, $ReadOnlyArray<mixed>, mixed];
export opaque type ServerReferenceId: string = string;
export opaque type ClientReferenceKey: any = string;

const CLIENT_REFERENCE_TAG = Symbol.for('react.client.reference');
const SERVER_REFERENCE_TAG = Symbol.for('react.server.reference');

export function isClientReference(reference: Object): boolean {
  return reference.$$typeof === CLIENT_REFERENCE_TAG;
}

export function isServerReference(reference: Object): boolean {
  return reference.$$typeof === SERVER_REFERENCE_TAG;
}

export function getClientReferenceKey(
  reference: ClientReference<any>,
): ClientReferenceKey {
  throw new Error(
    'Attempted to render a Client Component from renderToHTML. ' +
      'This is not supported since it will never hydrate. ' +
      'Only render Server Components with renderToHTML.',
  );
}

export function resolveClientReferenceMetadata<T>(
  config: ClientManifest,
  clientReference: ClientReference<T>,
): ClientReferenceMetadata {
  throw new Error(
    'Attempted to render a Client Component from renderToHTML. ' +
      'This is not supported since it will never hydrate. ' +
      'Only render Server Components with renderToHTML.',
  );
}

export function getServerReferenceId<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): ServerReferenceId {
  throw new Error(
    'Attempted to render a Server Action from renderToHTML. ' +
      'This is not supported since it varies by version of the app. ' +
      'Use a fixed URL for any forms instead.',
  );
}

export function getServerReferenceBoundArguments<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): null | Array<ReactClientValue> {
  throw new Error(
    'Attempted to render a Server Action from renderToHTML. ' +
      'This is not supported since it varies by version of the app. ' +
      'Use a fixed URL for any forms instead.',
  );
}

export function getServerReferenceLocation<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): void {
  return undefined;
}

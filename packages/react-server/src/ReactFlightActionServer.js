/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactFormState} from 'shared/ReactTypes';

import type {
  ServerManifest,
  ClientReference as ServerReference,
} from 'react-client/src/ReactFlightClientConfig';

import {
  resolveServerReference,
  preloadModule,
  requireModule,
} from 'react-client/src/ReactFlightClientConfig';

import {
  createResponse,
  close,
  getRoot,
  MAX_BOUND_ARGS,
} from './ReactFlightReplyServer';

type ServerReferenceId = any;

function bindArgs(fn: any, args: any) {
  if (args.length > MAX_BOUND_ARGS) {
    throw new Error(
      'Server Function has too many bound arguments. Received ' +
        args.length +
        ' but the limit is ' +
        MAX_BOUND_ARGS +
        '.',
    );
  }

  return fn.bind.apply(fn, [null].concat(args));
}

function loadServerReference<T>(
  bundlerConfig: ServerManifest,
  metaData: {
    id: string,
    bound: null | Promise<Array<any>>,
  },
): Promise<T> {
  const id: ServerReferenceId = metaData.id;
  if (typeof id !== 'string') {
    return (null: any);
  }
  const serverReference: ServerReference<T> =
    resolveServerReference<$FlowFixMe>(bundlerConfig, id);
  // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.
  const preloadPromise = preloadModule(serverReference);
  const bound = metaData.bound;
  if (bound instanceof Promise) {
    return Promise.all([(bound: any), preloadPromise]).then(
      ([args]: Array<any>) => bindArgs(requireModule(serverReference), args),
    );
  } else if (preloadPromise) {
    return Promise.resolve(preloadPromise).then(() =>
      requireModule(serverReference),
    );
  } else {
    // Synchronously available
    return Promise.resolve(requireModule(serverReference));
  }
}

function decodeBoundActionMetaData(
  body: FormData,
  serverManifest: ServerManifest,
  formFieldPrefix: string,
  arraySizeLimit: void | number,
): {id: ServerReferenceId, bound: null | Promise<Array<any>>} {
  // The data for this reference is encoded in multiple fields under this prefix.
  const actionResponse = createResponse(
    serverManifest,
    formFieldPrefix,
    undefined,
    body,
    arraySizeLimit,
  );
  close(actionResponse);
  const refPromise = getRoot<{
    id: ServerReferenceId,
    bound: null | Promise<Array<any>>,
  }>(actionResponse);
  // Force it to initialize
  // $FlowFixMe
  refPromise.then(() => {});
  if (refPromise.status !== 'fulfilled') {
    // $FlowFixMe
    throw refPromise.reason;
  }
  return refPromise.value;
}

export function decodeAction<T>(
  body: FormData,
  serverManifest: ServerManifest,
): Promise<() => T> | null {
  // We're going to create a new formData object that holds all the fields except
  // the implementation details of the action data.
  const formData = new FormData();

  let maybeActionKey: null | string = null;

  // $FlowFixMe[prop-missing]
  body.forEach((value: string | File, key: string) => {
    if (!key.startsWith('$ACTION_')) {
      // $FlowFixMe[incompatible-call]
      formData.append(key, value);
    } else if (key.startsWith('$ACTION_REF_')) {
      // Later actions may override earlier actions if a button is used to
      // override the default form action. However, we don't expect the same
      // action ref field to be sent multiple times in legitimate form data.
      maybeActionKey = key;
    } else if (key.startsWith('$ACTION_ID_')) {
      // A simple action with no bound arguments may appear twice in the form data
      // if a button specifies the same action as the default form action.
      maybeActionKey = key;
    }
  });

  if (maybeActionKey === null) {
    return null;
  }
  const actionKey = maybeActionKey;

  let action: Promise<(formData: FormData) => T> | null = null;
  if (actionKey.startsWith('$ACTION_REF_')) {
    const formFieldPrefix =
      '$ACTION_' + actionKey.slice('$ACTION_REF_'.length) + ':';
    const metaData = decodeBoundActionMetaData(
      body,
      serverManifest,
      formFieldPrefix,
    );
    action = loadServerReference(serverManifest, metaData);
  } else if (actionKey.startsWith('$ACTION_ID_')) {
    const id = actionKey.slice('$ACTION_ID_'.length);
    action = loadServerReference(serverManifest, {
      id,
      bound: null,
    });
  } else {
    throw new Error('Cannot handle action key. This is a bug in React.');
  }

  // Return the action with the remaining FormData bound to the first argument.
  return action.then(fn => fn.bind(null, formData));
}

export function decodeFormState<S>(
  actionResult: S,
  body: FormData,
  serverManifest: ServerManifest,
): Promise<ReactFormState<S, ServerReferenceId> | null> {
  const keyPath = body.get('$ACTION_KEY');
  if (typeof keyPath !== 'string') {
    // This form submission did not include any form state.
    return Promise.resolve(null);
  }
  // Search through the form data object to get the reference id and the number
  // of bound arguments. This repeats some of the work done in decodeAction.
  let actionKey: null | string = null;
  // $FlowFixMe[prop-missing]
  body.forEach((value: string | File, key: string) => {
    if (key.startsWith('$ACTION_REF_')) {
      actionKey = key;
    }
    // We don't check for the simple $ACTION_ID_ case because form state actions
    // are always bound to the state argument.
  });
  if (actionKey === null) {
    // Should be unreachable.
    return Promise.resolve(null);
  }

  const formFieldPrefix =
    '$ACTION_' + actionKey.slice('$ACTION_REF_'.length) + ':';
  const metaData = decodeBoundActionMetaData(
    body,
    serverManifest,
    formFieldPrefix,
  );

  const referenceId = metaData.id;
  return Promise.resolve(metaData.bound).then(bound => {
    if (bound === null) {
      // Should be unreachable because form state actions are always bound to the
      // state argument.
      return null;
    }
    // The form action dispatch method is always bound to the initial state.
    // But when comparing signatures, we compare to the original unbound action.
    // Subtract one from the arity to account for this.
    const boundArity = bound.length - 1;
    return [actionResult, keyPath, referenceId, boundArity];
  });
}

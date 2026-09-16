/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type Store from './store';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';

import {logErrorEvent} from 'react-devtools-shared/src/Logger';

export function subscribeToStoreErrors(
  store: Store,
  bridge: FrontendBridge,
): () => void {
  const onError = (error: Error) => logErrorEvent(error, null);
  let isSubscribed = true;

  const unsubscribe = () => {
    if (isSubscribed) {
      isSubscribed = false;
      store.removeListener('error', onError);
      bridge.removeListener('shutdown', unsubscribe);
    }
  };

  store.addListener('error', onError);
  bridge.addListener('shutdown', unsubscribe);
  return unsubscribe;
}

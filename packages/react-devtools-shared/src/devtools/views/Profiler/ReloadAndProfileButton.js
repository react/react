/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useCallback, useContext, useMemo} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {BridgeContext, StoreContext} from '../context';
import {useSubscription} from '../hooks';

type SubscriptionData = {
  recordChangeDescriptions: boolean,
  supportsReloadAndProfile: boolean,
};

export default function ReloadAndProfileButton({
  disabled,
}: {
  disabled: boolean,
}): React.Node {
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);

  const subscription = useMemo(
    () => ({
      getCurrentValue: () => ({
        recordChangeDescriptions: store.recordChangeDescriptions,
        supportsReloadAndProfile: store.supportsReloadAndProfile,
      }),
      subscribe: (callback: Function) => {
        store.addListener('recordChangeDescriptions', callback);
        store.addListener('supportsReloadAndProfile', callback);
        return () => {
          store.removeListener('recordChangeDescriptions', callback);
          store.removeListener('supportsReloadAndProfile', callback);
        };
      },
    }),
    [store],
  );
  const {recordChangeDescriptions, supportsReloadAndProfile} =
    useSubscription<SubscriptionData>(subscription);

  const reloadAndProfile = useCallback(() => {
    // TODO If we want to support reload-and-profile for e.g. React Native,
    // we might need to also start profiling here before reloading the app (since DevTools itself isn't reloaded).
    // We'd probably want to do this before reloading though, to avoid sending a message on a disconnected port in the browser.
    // For now, let's just skip doing it entirely to avoid paying snapshot costs for data we don't need.
    // startProfiling();

    bridge.send('reloadAndProfile', {
      recordChangeDescriptions,
    });
  }, [bridge, recordChangeDescriptions]);

  if (!supportsReloadAndProfile) {
    return null;
  }

  return (
    <Button
      disabled={disabled}
      onClick={reloadAndProfile}
      title="Reload and start profiling">
      <ButtonIcon type="reload" />
    </Button>
  );
}

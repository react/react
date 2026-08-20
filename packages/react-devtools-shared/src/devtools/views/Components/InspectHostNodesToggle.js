/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useCallback, useContext, useEffect, useState} from 'react';
import {BridgeContext} from '../context';
import Toggle from '../Toggle';
import ButtonIcon from '../ButtonIcon';
import {logEvent} from 'react-devtools-shared/src/Logger';

export default function InspectHostNodesToggle({
  onlySuspenseNodes,
}: {
  onlySuspenseNodes?: boolean,
}): React.Node {
  const [isInspecting, setIsInspecting] = useState(false);
  const bridge = useContext(BridgeContext);

  const handleChange = useCallback(
    (isChecked: boolean) => {
      setIsInspecting(isChecked);

      if (isChecked) {
        logEvent({event_name: 'inspect-element-button-clicked'});
        bridge.send('startInspectingHost', !!onlySuspenseNodes);
      } else {
        bridge.send('stopInspectingHost');
      }
    },
    [bridge],
  );

  useEffect(() => {
    const onStopInspectingHost = () => setIsInspecting(false);
    bridge.addListener('stopInspectingHost', onStopInspectingHost);
    return () =>
      bridge.removeListener('stopInspectingHost', onStopInspectingHost);
  }, [bridge]);

  return (
    <Toggle
      onChange={handleChange}
      isChecked={isInspecting}
      title="Select an element in the page to inspect it">
      <ButtonIcon type="search" />
    </Toggle>
  );
}

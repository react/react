/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {SchedulingEvent} from 'react-devtools-timeline/src/types';
import type {ReactFunctionLocation} from 'shared/ReactTypes';

import * as React from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {useContext} from 'react';
import {TimelineContext} from 'react-devtools-timeline/src/TimelineContext';
import {
  formatTimestamp,
  getSchedulingEventLabel,
} from 'react-devtools-timeline/src/utils/formatting';
import {stackToComponentLocations} from 'react-devtools-shared/src/devtools/utils';
import {copy} from 'clipboard-js';
import {withPermissionsCheck} from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';
import useOpenResource from '../useOpenResource';

import styles from './SidebarEventInfo.css';

export type Props = {};

type FunctionLocationProps = {
  location: ReactFunctionLocation,
  displayName: string,
};
function FunctionLocation({location, displayName}: FunctionLocationProps) {
  // TODO: We should support symbolication here as well, but
  // symbolicating the whole stack can be expensive
  const [canViewSource, viewSource] = useOpenResource(location, null);
  return (
    <li>
      <Button
        className={
          canViewSource ? styles.ClickableSource : styles.UnclickableSource
        }
        disabled={!canViewSource}
        onClick={viewSource}>
        {displayName}
      </Button>
    </li>
  );
}

type SchedulingEventProps = {
  eventInfo: SchedulingEvent,
};

function SchedulingEventInfo({eventInfo}: SchedulingEventProps) {
  const {componentName, timestamp} = eventInfo;
  const componentStack = eventInfo.componentStack || null;

  return (
    <>
      <div className={styles.Toolbar}>
        {componentName} {getSchedulingEventLabel(eventInfo)}
      </div>
      <div className={styles.Content} tabIndex={0}>
        <ul className={styles.List}>
          <li className={styles.ListItem}>
            <label className={styles.Label}>Timestamp</label>:{' '}
            <span className={styles.Value}>{formatTimestamp(timestamp)}</span>
          </li>
          {componentStack && (
            <li className={styles.ListItem}>
              <div className={styles.Row}>
                <label className={styles.Label}>Rendered by</label>
                <Button
                  onClick={withPermissionsCheck(
                    {permissions: ['clipboardWrite']},
                    () => copy(componentStack),
                  )}
                  title="Copy component stack to clipboard">
                  <ButtonIcon type="copy" />
                </Button>
              </div>
              <ul className={styles.List}>
                {stackToComponentLocations(componentStack).map(
                  ([displayName, location], index) => {
                    if (location == null) {
                      return (
                        <li key={index}>
                          <Button
                            className={styles.UnclickableSource}
                            disabled={true}>
                            {displayName}
                          </Button>
                        </li>
                      );
                    }

                    return (
                      <FunctionLocation
                        key={index}
                        displayName={displayName}
                        location={location}
                      />
                    );
                  },
                )}
              </ul>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}

export default function SidebarEventInfo(_: Props): React.Node {
  const {selectedEvent} = useContext(TimelineContext);
  // (TODO) Refactor in next PR so this supports multiple types of events
  if (selectedEvent && selectedEvent.schedulingEvent) {
    return <SchedulingEventInfo eventInfo={selectedEvent.schedulingEvent} />;
  }

  return null;
}

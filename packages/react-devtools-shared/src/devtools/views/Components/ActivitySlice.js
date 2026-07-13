/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import * as React from 'react';
import {startTransition, useContext} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {StoreContext} from '../context';
import {useChangeActivitySliceAction} from '../SuspenseTab/ActivityList';
import {TreeDispatcherContext, TreeStateContext} from './TreeContext';
import styles from './ActivitySlice.css';

export default function ActivitySlice(): React.Node {
  const dispatch = useContext(TreeDispatcherContext);
  const {activityID} = useContext(TreeStateContext);
  const store = useContext(StoreContext);

  const activity =
    activityID === null ? null : store.getElementByID(activityID);
  const name = activity ? activity.nameProp : null;

  const changeActivitySliceAction = useChangeActivitySliceAction();

  return (
    <div className={styles.ActivitySlice}>
      <div className={styles.Bar}>
        <Button
          className={styles.ActivitySliceButton}
          onClick={dispatch.bind(null, {
            type: 'SELECT_ELEMENT_BY_ID',
            payload: activityID,
          })}>
          "{name || 'Unknown'}"
        </Button>
      </div>
      <div className={styles.VRule} />
      <Button
        onClick={startTransition.bind(
          null,
          changeActivitySliceAction.bind(null, null),
        )}
        title="Back to tree view">
        <ButtonIcon type="close" />
      </Button>
    </div>
  );
}

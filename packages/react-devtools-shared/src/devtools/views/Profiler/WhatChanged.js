/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext} from 'react';

import {ProfilerContext} from './ProfilerContext';
import {StoreContext} from '../context';

import styles from './WhatChanged.css';
import HookChangeSummary from './HookChangeSummary';

type Props = {
  fiberID: number,
  displayMode?: 'detailed' | 'compact',
};

export default function WhatChanged({
  fiberID,
  displayMode = 'detailed',
}: Props): React.Node {
  const {profilerStore} = useContext(StoreContext);
  const {rootID, selectedCommitIndex} = useContext(ProfilerContext);

  // TRICKY
  // Handle edge case where no commit is selected because of a min-duration filter update.
  // If the commit index is null, suspending for data below would throw an error.
  // TODO (ProfilerContext) This check should not be necessary.
  if (selectedCommitIndex === null) {
    return null;
  }

  const {changeDescriptions} = profilerStore.getCommitData(
    rootID as any as number,
    selectedCommitIndex,
  );

  if (changeDescriptions === null) {
    return null;
  }

  const changeDescription = changeDescriptions.get(fiberID);
  if (changeDescription == null) {
    return null;
  }

  const {context, didHooksChange, hooks, isFirstMount, props, state} =
    changeDescription;

  if (isFirstMount) {
    return (
      <div className={styles.Component}>
        <label className={styles.Label}>Why did this render?</label>
        <div className={styles.Item}>
          This is the first time the component rendered.
        </div>
      </div>
    );
  }

  const changes = [];

  if (context === true) {
    changes.push(
      <div key="context" className={styles.Item}>
        • Context changed
      </div>,
    );
  } else if (
    typeof context === 'object' &&
    context !== null &&
    context.length !== 0
  ) {
    changes.push(
      <div key="context" className={styles.Item}>
        • Context changed:
        {context.map(key => (
          <span key={key} className={styles.Key}>
            {key}
          </span>
        ))}
      </div>,
    );
  }

  if (didHooksChange) {
    if (Array.isArray(hooks)) {
      changes.push(
        <div key="hooks" className={styles.Item}>
          <HookChangeSummary
            hooks={hooks}
            fiberID={fiberID}
            state={state}
            displayMode={displayMode}
          />
        </div>,
      );
    } else {
      changes.push(
        <div key="hooks" className={styles.Item}>
          • Hooks changed
        </div>,
      );
    }
  }

  if (props !== null && props.length !== 0) {
    changes.push(
      <div key="props" className={styles.Item}>
        • Props changed:
        {props.map(key => (
          <span key={key} className={styles.Key}>
            {key}
          </span>
        ))}
      </div>,
    );
  }

  if (state !== null && state.length !== 0) {
    changes.push(
      <div key="state" className={styles.Item}>
        • State changed:
        {state.map(key => (
          <span key={key} className={styles.Key}>
            {key}
          </span>
        ))}
      </div>,
    );
  }

  if (changes.length === 0) {
    changes.push(
      <div key="nothing" className={styles.Item}>
        The parent component rendered.
      </div>,
    );
  }

  return (
    <div>
      <label className={styles.Label}>Why did this render?</label>
      {changes}
    </div>
  );
}

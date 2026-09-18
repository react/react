/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useContext} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {ProfilerContext} from './ProfilerContext';
import SnapshotCommitList from './SnapshotCommitList';
import {maxBarWidth} from './constants';
import {StoreContext} from '../context';

import styles from './SnapshotSelector.css';

export type Props = {};

export default function SnapshotSelector(_: Props): React.Node {
  const {
    rootID,
    selectedCommitIndex,
    selectCommitIndex,
    selectPrevCommitIndex,
    selectNextCommitIndex,
    filteredCommitIndices,
    selectedFilteredCommitIndex,
  } = useContext(ProfilerContext);

  const {profilerStore} = useContext(StoreContext);
  const {commitData} = profilerStore.getDataForRoot(rootID as any as number);

  const totalDurations: Array<number> = [];
  const commitTimes: Array<number> = [];
  commitData.forEach(commitDatum => {
    totalDurations.push(
      commitDatum.duration +
        (commitDatum.effectDuration || 0) +
        (commitDatum.passiveEffectDuration || 0),
    );
    commitTimes.push(commitDatum.timestamp);
  });

  const numFilteredCommits = filteredCommitIndices.length;

  let label = null;
  if (numFilteredCommits > 0) {
    // $FlowFixMe[missing-local-annot]
    const handleCommitInputChange = event => {
      const value = parseInt(event.currentTarget.value, 10);
      if (!isNaN(value)) {
        const filteredIndex = Math.min(
          Math.max(value - 1, 0),

          // Snashots are shown to the user as 1-based
          // but the indices within the profiler data array ar 0-based.
          numFilteredCommits - 1,
        );
        selectCommitIndex(filteredCommitIndices[filteredIndex]);
      }
    };

    // $FlowFixMe[missing-local-annot]
    const handleClick = event => {
      event.currentTarget.select();
    };

    // $FlowFixMe[missing-local-annot]
    const handleKeyDown = event => {
      switch (event.key) {
        case 'ArrowDown':
          selectPrevCommitIndex();
          event.stopPropagation();
          break;
        case 'ArrowUp':
          selectNextCommitIndex();
          event.stopPropagation();
          break;
        default:
          break;
      }
    };

    const input = (
      <input
        className={styles.Input}
        data-testname="SnapshotSelector-Input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={
          // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
          selectedFilteredCommitIndex + 1
        }
        size={`${numFilteredCommits}`.length}
        onChange={handleCommitInputChange}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
    );

    label = (
      <Fragment>
        {input} / {numFilteredCommits}
      </Fragment>
    );
  }

  // $FlowFixMe[missing-local-annot]
  const handleKeyDown = event => {
    switch (event.key) {
      case 'ArrowLeft':
        selectPrevCommitIndex();
        event.stopPropagation();
        break;
      case 'ArrowRight':
        selectNextCommitIndex();
        event.stopPropagation();
        break;
      default:
        break;
    }
  };

  if (commitData.length === 0) {
    return null;
  }

  return (
    <Fragment>
      <span
        className={styles.IndexLabel}
        data-testname="SnapshotSelector-Label">
        {label}
      </span>
      <Button
        className={styles.Button}
        data-testname="SnapshotSelector-PreviousButton"
        disabled={numFilteredCommits === 0}
        onClick={selectPrevCommitIndex}
        title="Select previous commit ←">
        <ButtonIcon type="previous" />
      </Button>
      <div
        className={styles.Commits}
        onKeyDown={handleKeyDown}
        style={{
          flex: numFilteredCommits > 0 ? '1 1 auto' : '0 0 auto',
          maxWidth:
            numFilteredCommits > 0
              ? numFilteredCommits * maxBarWidth
              : undefined,
        }}
        tabIndex={0}>
        {numFilteredCommits > 0 && (
          <SnapshotCommitList
            commitData={commitData}
            commitTimes={commitTimes}
            filteredCommitIndices={filteredCommitIndices}
            selectedCommitIndex={selectedCommitIndex}
            selectedFilteredCommitIndex={selectedFilteredCommitIndex}
            selectCommitIndex={selectCommitIndex}
            totalDurations={totalDurations}
          />
        )}
        {numFilteredCommits === 0 && (
          <div className={styles.NoCommits}>No commits</div>
        )}
      </div>
      <Button
        className={styles.Button}
        data-testname="SnapshotSelector-NextButton"
        disabled={numFilteredCommits === 0}
        onClick={selectNextCommitIndex}
        title="Select next commit →">
        <ButtonIcon type="next" />
      </Button>
    </Fragment>
  );
}

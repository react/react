/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {CommitDataFrontend} from './types';

import * as React from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeList} from 'react-window';
import SnapshotCommitListItem from './SnapshotCommitListItem';
import {minBarWidth} from './constants';
import {formatDuration, formatTime} from './utils';
import Tooltip from './Tooltip';

import styles from './SnapshotCommitList.css';

export type ItemData = {
  commitTimes: Array<number>,
  filteredCommitIndices: Array<number>,
  maxDuration: number,
  selectedCommitIndex: number | null,
  selectedFilteredCommitIndex: number | null,
  selectCommitIndex: (index: number) => void,
  setHoveredCommitIndex: (index: number) => void,
  startCommitDrag: (newDragState: DragState) => void,
  totalDurations: Array<number>,
};

type Props = {
  commitData: $ReadOnlyArray<CommitDataFrontend>,
  commitTimes: Array<number>,
  filteredCommitIndices: Array<number>,
  selectedCommitIndex: number | null,
  selectedFilteredCommitIndex: number | null,
  selectCommitIndex: (index: number) => void,
  totalDurations: Array<number>,
};

export default function SnapshotCommitList({
  commitData,
  commitTimes,
  filteredCommitIndices,
  selectedCommitIndex,
  selectedFilteredCommitIndex,
  selectCommitIndex,
  totalDurations,
}: Props): React.Node {
  return (
    <AutoSizer>
      {({height, width}) => (
        <List
          commitData={commitData}
          commitTimes={commitTimes}
          height={height}
          filteredCommitIndices={filteredCommitIndices}
          selectedCommitIndex={selectedCommitIndex}
          selectedFilteredCommitIndex={selectedFilteredCommitIndex}
          selectCommitIndex={selectCommitIndex}
          totalDurations={totalDurations}
          width={width}
        />
      )}
    </AutoSizer>
  );
}

type ListProps = {
  commitData: $ReadOnlyArray<CommitDataFrontend>,
  commitTimes: Array<number>,
  height: number,
  filteredCommitIndices: Array<number>,
  selectedCommitIndex: number | null,
  selectedFilteredCommitIndex: number | null,
  selectCommitIndex: (index: number) => void,
  totalDurations: Array<number>,
  width: number,
};

type DragState = {
  commitIndex: number,
  left: number,
  sizeIncrement: number,
};

function List({
  commitData,
  selectedCommitIndex,
  commitTimes,
  height,
  filteredCommitIndices,
  selectedFilteredCommitIndex,
  selectCommitIndex,
  totalDurations,
  width,
}: ListProps) {
  // $FlowFixMe[incompatible-use]
  const listRef = useRef<FixedSizeList<ItemData> | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const prevCommitIndexRef = useRef<number | null>(null);

  // Make sure a newly selected snapshot is fully visible within the list.
  useEffect(() => {
    if (selectedFilteredCommitIndex !== prevCommitIndexRef.current) {
      prevCommitIndexRef.current = selectedFilteredCommitIndex;
      if (selectedFilteredCommitIndex !== null && listRef.current !== null) {
        listRef.current.scrollToItem(selectedFilteredCommitIndex);
      }
    }
  }, [listRef, selectedFilteredCommitIndex]);

  const itemSize = useMemo(
    () => Math.max(minBarWidth, width / filteredCommitIndices.length),
    [filteredCommitIndices, width],
  );
  const maxDuration = useMemo(
    () => totalDurations.reduce((max, duration) => Math.max(max, duration), 0),
    [totalDurations],
  );

  const maxCommitIndex = filteredCommitIndices.length - 1;

  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleDragCommit = ({buttons, pageX}: any) => {
    if (buttons === 0) {
      setDragState(null);
      return;
    }

    if (dragState !== null) {
      const {commitIndex, left, sizeIncrement} = dragState;

      let newCommitIndex = commitIndex;
      let newCommitLeft = left;

      if (pageX < newCommitLeft) {
        while (pageX < newCommitLeft) {
          newCommitLeft -= sizeIncrement;
          newCommitIndex -= 1;
        }
      } else {
        let newCommitRectRight = newCommitLeft + sizeIncrement;
        while (pageX > newCommitRectRight) {
          newCommitRectRight += sizeIncrement;
          newCommitIndex += 1;
        }
      }

      if (newCommitIndex < 0) {
        newCommitIndex = 0;
      } else if (newCommitIndex > maxCommitIndex) {
        newCommitIndex = maxCommitIndex;
      }

      selectCommitIndex(newCommitIndex);
    }
  };

  useEffect(() => {
    if (dragState === null) {
      return;
    }

    const element = divRef.current;
    if (element !== null) {
      const ownerDocument = element.ownerDocument;
      ownerDocument.addEventListener('mousemove', handleDragCommit);
      return () => {
        ownerDocument.removeEventListener('mousemove', handleDragCommit);
      };
    }
  }, [dragState]);

  const [hoveredCommitIndex, setHoveredCommitIndex] = useState<number | null>(
    null,
  );

  // Pass required contextual data down to the ListItem renderer.
  const itemData = useMemo<ItemData>(
    () => ({
      commitTimes,
      filteredCommitIndices,
      maxDuration,
      selectedCommitIndex,
      selectedFilteredCommitIndex,
      selectCommitIndex,
      setHoveredCommitIndex,
      startCommitDrag: setDragState,
      totalDurations,
    }),
    [
      commitTimes,
      filteredCommitIndices,
      maxDuration,
      selectedCommitIndex,
      selectedFilteredCommitIndex,
      selectCommitIndex,
      setHoveredCommitIndex,
      totalDurations,
    ],
  );

  let tooltipLabel = null;
  if (hoveredCommitIndex !== null) {
    const {
      duration,
      effectDuration,
      passiveEffectDuration,
      priorityLevel,
      timestamp,
    } = commitData[hoveredCommitIndex];

    // Only some React versions include commit durations.
    // Show a richer tooltip only for builds that have that info.
    if (
      effectDuration !== null ||
      passiveEffectDuration !== null ||
      priorityLevel !== null
    ) {
      tooltipLabel = (
        <ul className={styles.TooltipList}>
          {priorityLevel !== null && (
            <li className={styles.TooltipListItem}>
              <label className={styles.TooltipLabel}>Priority</label>
              <span className={styles.TooltipValue}>{priorityLevel}</span>
            </li>
          )}
          <li className={styles.TooltipListItem}>
            <label className={styles.TooltipLabel}>Committed at</label>
            <span className={styles.TooltipValue}>
              {formatTime(timestamp)}s
            </span>
          </li>
          <li className={styles.TooltipListItem}>
            <div className={styles.DurationsWrapper}>
              <label className={styles.TooltipLabel}>Durations</label>
              <ul className={styles.DurationsList}>
                <li className={styles.DurationsListItem}>
                  <label className={styles.DurationsLabel}>Render</label>
                  <span className={styles.DurationsValue}>
                    {formatDuration(duration)}ms
                  </span>
                </li>
                {effectDuration !== null && (
                  <li className={styles.DurationsListItem}>
                    <label className={styles.DurationsLabel}>
                      Layout effects
                    </label>
                    <span className={styles.DurationsValue}>
                      {formatDuration(effectDuration)}ms
                    </span>
                  </li>
                )}
                {passiveEffectDuration !== null && (
                  <li className={styles.DurationsListItem}>
                    <label className={styles.DurationsLabel}>
                      Passive effects
                    </label>
                    <span className={styles.DurationsValue}>
                      {formatDuration(passiveEffectDuration)}ms
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </li>
        </ul>
      );
    } else {
      tooltipLabel = `${formatDuration(duration)}ms at ${formatTime(
        timestamp,
      )}s`;
    }
  }

  return (
    <Tooltip className={styles.Tooltip} label={tooltipLabel}>
      <div
        ref={divRef}
        style={{height, width}}
        onMouseLeave={() => setHoveredCommitIndex(null)}>
        <FixedSizeList
          className={styles.List}
          layout="horizontal"
          height={height}
          itemCount={filteredCommitIndices.length}
          itemData={itemData}
          itemSize={itemSize}
          ref={
            listRef as any

            /* Flow bug? */
          }
          width={width}>
          {SnapshotCommitListItem}
        </FixedSizeList>
      </div>
    </Tooltip>
  );
}

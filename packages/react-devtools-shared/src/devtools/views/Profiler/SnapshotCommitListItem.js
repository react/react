/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {memo} from 'react';
import {areEqual} from 'react-window';
import {getGradientColor} from './utils';

import styles from './SnapshotCommitListItem.css';

import type {ItemData} from './SnapshotCommitList';

type Props = {
  data: ItemData,
  index: number,
  style: Object,
  ...
};

function SnapshotCommitListItem({data: itemData, index, style}: Props) {
  const {
    filteredCommitIndices,
    maxDuration,
    selectedCommitIndex,
    selectCommitIndex,
    setHoveredCommitIndex,
    startCommitDrag,
    totalDurations,
  } = itemData;

  index = filteredCommitIndices[index];

  const totalDuration = totalDurations[index];

  // Use natural cbrt for bar height.
  // This prevents one (or a few) outliers from squishing the majority of other commits.
  // So rather than e.g. _█_ we get something more like e.g. ▄█_
  const heightScale =
    Math.min(
      1,
      Math.max(0, Math.cbrt(totalDuration) / Math.cbrt(maxDuration)),
    ) || 0;

  // Use a linear scale for color.
  // This gives some visual contrast between cheaper and more expensive commits
  // and somewhat compensates for the cbrt scale height.
  const colorScale = Math.min(1, Math.max(0, totalDuration / maxDuration)) || 0;

  const isSelected = selectedCommitIndex === index;

  // Leave a 1px gap between snapshots
  const width = parseFloat(style.width) - 1;

  const handleMouseDown = ({buttons, target}: any) => {
    if (buttons === 1) {
      selectCommitIndex(index);
      startCommitDrag({
        commitIndex: index,
        left: target.getBoundingClientRect().left,
        sizeIncrement: parseFloat(style.width),
      });
    }
  };

  let backgroundColor;
  if (!isSelected && totalDuration > 0) {
    backgroundColor = getGradientColor(colorScale);
  }

  return (
    <div
      className={styles.Outer}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHoveredCommitIndex(index)}
      style={{
        ...style,
        width,
        borderBottom: isSelected
          ? '3px solid var(--color-tab-selected-border)'
          : undefined,
      }}>
      <div
        className={isSelected ? styles.InnerSelected : styles.Inner}
        style={{
          height: `${Math.round(heightScale * 100)}%`,
          backgroundColor,
        }}
      />
    </div>
  );
}

export default memo(SnapshotCommitListItem, areEqual) as component(
  ...props: Props
);

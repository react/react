/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  ElementTypeForwardRef,
  ElementTypeMemo,
} from 'react-devtools-shared/src/frontend/types';
import {formatDuration} from './utils';
import ProfilerStore from 'react-devtools-shared/src/devtools/ProfilerStore';

import type {CommitTree} from './types';

export type ChartNode = {
  id: number,
  label: string,
  name: string,
  value: number,
};

export type ChartData = {
  maxValue: number,
  nodes: Array<ChartNode>,
};

const cachedChartData: Map<string, ChartData> = new Map();

export function getChartData({
  commitIndex,
  commitTree,
  profilerStore,
  rootID,
}: {
  commitIndex: number,
  commitTree: CommitTree,
  profilerStore: ProfilerStore,
  rootID: number,
}): ChartData {
  const commitDatum = profilerStore.getCommitData(rootID, commitIndex);

  const {fiberActualDurations, fiberSelfDurations} = commitDatum;
  const {nodes} = commitTree;

  const chartDataKey = `${rootID}-${commitIndex}`;
  if (cachedChartData.has(chartDataKey)) {
    return cachedChartData.get(chartDataKey) as any as ChartData;
  }

  let maxSelfDuration = 0;

  const chartNodes: Array<ChartNode> = [];
  fiberActualDurations.forEach((actualDuration, id) => {
    const node = nodes.get(id);

    if (node == null) {
      throw Error(`Could not find node with id "${id}" in commit tree`);
    }

    const {displayName, key, parentID, type, compiledWithForget} = node;

    // Don't show the root node in this chart.
    if (parentID === 0) {
      return;
    }
    const selfDuration = fiberSelfDurations.get(id) || 0;
    maxSelfDuration = Math.max(maxSelfDuration, selfDuration);

    const name = displayName || 'Anonymous';
    const maybeKey = key !== null ? ` key="${key}"` : '';
    const maybeForgetBadge = compiledWithForget ? '✨ ' : '';

    let maybeBadge = '';
    if (type === ElementTypeForwardRef) {
      maybeBadge = ' (ForwardRef)';
    } else if (type === ElementTypeMemo) {
      maybeBadge = ' (Memo)';
    }

    const label = `${maybeForgetBadge}${name}${maybeBadge}${maybeKey} (${formatDuration(
      selfDuration,
    )}ms)`;
    chartNodes.push({
      id,
      label,
      name,
      value: selfDuration,
    });
  });

  const chartData = {
    maxValue: maxSelfDuration,
    nodes: chartNodes.sort((a, b) => b.value - a.value),
  };

  cachedChartData.set(chartDataKey, chartData);

  return chartData;
}

export function invalidateChartData(): void {
  cachedChartData.clear();
}

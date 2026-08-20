/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ProfilerStore from './ProfilerStore';
import {
  getCommitTree,
  invalidateCommitTrees,
} from 'react-devtools-shared/src/devtools/views/Profiler/CommitTreeBuilder';
import {
  getChartData as getFlamegraphChartData,
  invalidateChartData as invalidateFlamegraphChartData,
} from 'react-devtools-shared/src/devtools/views/Profiler/FlamegraphChartBuilder';
import {
  getChartData as getRankedChartData,
  invalidateChartData as invalidateRankedChartData,
} from 'react-devtools-shared/src/devtools/views/Profiler/RankedChartBuilder';

import type {CommitTree} from 'react-devtools-shared/src/devtools/views/Profiler/types';
import type {ChartData as FlamegraphChartData} from 'react-devtools-shared/src/devtools/views/Profiler/FlamegraphChartBuilder';
import type {ChartData as RankedChartData} from 'react-devtools-shared/src/devtools/views/Profiler/RankedChartBuilder';

export default class ProfilingCache {
  _fiberCommits: Map<number, Array<number>> = new Map();
  _profilerStore: ProfilerStore;

  constructor(profilerStore: ProfilerStore) {
    this._profilerStore = profilerStore;
  }

  getCommitTree: ({commitIndex: number, rootID: number}) => CommitTree = ({
    commitIndex,
    rootID,
  }) =>
    getCommitTree({
      commitIndex,
      profilerStore: this._profilerStore,
      rootID,
    });

  getFiberCommits: ({fiberID: number, rootID: number}) => Array<number> = ({
    fiberID,
    rootID,
  }) => {
    const cachedFiberCommits = this._fiberCommits.get(fiberID);
    if (cachedFiberCommits != null) {
      return cachedFiberCommits;
    }

    const fiberCommits = [];
    const dataForRoot = this._profilerStore.getDataForRoot(rootID);
    dataForRoot.commitData.forEach((commitDatum, commitIndex) => {
      if (commitDatum.fiberActualDurations.has(fiberID)) {
        fiberCommits.push(commitIndex);
      }
    });

    this._fiberCommits.set(fiberID, fiberCommits);

    return fiberCommits;
  };

  getFlamegraphChartData: ({
    commitIndex: number,
    commitTree: CommitTree,
    rootID: number,
  }) => FlamegraphChartData = ({commitIndex, commitTree, rootID}) =>
    getFlamegraphChartData({
      commitIndex,
      commitTree,
      profilerStore: this._profilerStore,
      rootID,
    });

  getRankedChartData: ({
    commitIndex: number,
    commitTree: CommitTree,
    rootID: number,
  }) => RankedChartData = ({commitIndex, commitTree, rootID}) =>
    getRankedChartData({
      commitIndex,
      commitTree,
      profilerStore: this._profilerStore,
      rootID,
    });

  invalidate() {
    this._fiberCommits.clear();

    invalidateCommitTrees();
    invalidateFlamegraphChartData();
    invalidateRankedChartData();
  }
}

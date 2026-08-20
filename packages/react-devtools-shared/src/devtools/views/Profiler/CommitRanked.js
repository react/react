/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeList} from 'react-window';
import {ProfilerContext} from './ProfilerContext';
import NoCommitData from './NoCommitData';
import CommitRankedListItem from './CommitRankedListItem';
import HoveredFiberInfo from './HoveredFiberInfo';
import {scale} from './utils';
import {createRegExp} from '../utils';
import {StoreContext} from '../context';
import {SettingsContext} from '../Settings/SettingsContext';
import {useHighlightHostInstance} from '../hooks';
import Tooltip from './Tooltip';

import styles from './CommitRanked.css';

import type {TooltipFiberData} from './HoveredFiberInfo';
import type {ChartData} from './RankedChartBuilder';
import type {CommitTree} from './types';

export type ItemData = {
  chartData: ChartData,
  currentSearchMatchID: number | null,
  matchedFiberIDs: Set<number>,
  onElementMouseEnter: (fiberData: TooltipFiberData) => void,
  onElementMouseLeave: () => void,
  scaleX: (value: number, fallbackValue: number) => number,
  searchRegExp: RegExp | null,
  selectedFiberID: number | null,
  selectedFiberIndex: number,
  selectFiber: (id: number | null, name: string | null) => void,
  width: number,
};

export default function CommitRankedAutoSizer(_: {}): React.Node {
  const {profilerStore} = useContext(StoreContext);
  const {rootID, selectedCommitIndex, selectFiber} =
    useContext(ProfilerContext);
  const {profilingCache} = profilerStore;

  const deselectCurrentFiber = useCallback(
    (event: $FlowFixMe) => {
      event.stopPropagation();
      selectFiber(null, null);
    },
    [selectFiber],
  );

  let commitTree: CommitTree | null = null;
  let chartData: ChartData | null = null;
  if (selectedCommitIndex !== null) {
    commitTree = profilingCache.getCommitTree({
      commitIndex: selectedCommitIndex,
      rootID: rootID as any as number,
    });

    chartData = profilingCache.getRankedChartData({
      commitIndex: selectedCommitIndex,
      commitTree,
      rootID: rootID as any as number,
    });
  }

  if (commitTree != null && chartData != null && chartData.nodes.length > 0) {
    return (
      <div className={styles.Container} onClick={deselectCurrentFiber}>
        <AutoSizer>
          {({height, width}) => (
            <CommitRanked
              chartData={chartData as any as ChartData}
              commitTree={commitTree as any as CommitTree}
              height={height}
              width={width}
            />
          )}
        </AutoSizer>
      </div>
    );
  } else {
    return <NoCommitData />;
  }
}

type Props = {
  chartData: ChartData,
  commitTree: CommitTree,
  height: number,
  width: number,
};

function CommitRanked({chartData, commitTree, height, width}: Props) {
  const [hoveredFiberData, setHoveredFiberData] =
    useState<TooltipFiberData | null>(null);
  const {lineHeight} = useContext(SettingsContext);
  const {selectedFiberID, selectFiber, searchText, searchResults, searchIndex} =
    useContext(ProfilerContext);
  const {highlightHostInstance, clearHighlightHostInstance} =
    useHighlightHostInstance();

  const selectedFiberIndex = useMemo(
    () => getNodeIndex(chartData, selectedFiberID),
    [chartData, selectedFiberID],
  );

  // Search highlighting (see CommitFlamegraph for details).
  const searchRegExp = useMemo(
    () => (searchText === '' ? null : createRegExp(searchText)),
    [searchText],
  );
  const matchedFiberIDs = useMemo(
    () => new Set(searchResults.map(result => result.id)),
    [searchResults],
  );
  const currentSearchMatchID =
    searchIndex >= 0 && searchIndex < searchResults.length
      ? searchResults[searchIndex].id
      : null;

  const handleElementMouseEnter = useCallback(
    ({id, name}: $FlowFixMe) => {
      highlightHostInstance(id); // Highlight last hovered element.
      setHoveredFiberData({id, name}); // Set hovered fiber data for tooltip
    },
    [highlightHostInstance],
  );

  const handleElementMouseLeave = useCallback(() => {
    clearHighlightHostInstance(); // clear highlighting of element on mouse leave
    setHoveredFiberData(null); // clear hovered fiber data for tooltip
  }, [clearHighlightHostInstance]);

  const itemData = useMemo<ItemData>(
    () => ({
      chartData,
      currentSearchMatchID,
      matchedFiberIDs,
      onElementMouseEnter: handleElementMouseEnter,
      onElementMouseLeave: handleElementMouseLeave,
      scaleX: scale(0, chartData.nodes[selectedFiberIndex].value, 0, width),
      searchRegExp,
      selectedFiberID,
      selectedFiberIndex,
      selectFiber,
      width,
    }),
    [
      chartData,
      currentSearchMatchID,
      matchedFiberIDs,
      handleElementMouseEnter,
      handleElementMouseLeave,
      searchRegExp,
      selectedFiberID,
      selectedFiberIndex,
      selectFiber,
      width,
    ],
  );

  // Tooltip used to show summary of fiber info on hover
  const tooltipLabel = useMemo(
    () =>
      hoveredFiberData !== null ? (
        <HoveredFiberInfo fiberData={hoveredFiberData} />
      ) : null,
    [hoveredFiberData],
  );

  // Scroll the selected fiber's row into view when the selection changes (e.g.
  // when navigating between search results). Selection is driven externally
  // (search nav in ProfilerContext, or a node click) and selectedFiberIndex is
  // derived here — no local event handler sets it — so we sync the imperative
  // scroll in a layout effect, which runs before paint to avoid a frame where
  // the scroll position lags the selection.
  const listRef = useRef<FixedSizeList | null>(null);
  const itemIsSelected = selectedFiberID !== null;
  useLayoutEffect(() => {
    // selectedFiberIndex falls back to 0 when nothing is selected, so only
    // scroll when a fiber is actually selected.
    if (itemIsSelected && listRef.current !== null) {
      listRef.current.scrollToItem(selectedFiberIndex, 'smart');
    }
  }, [itemIsSelected, selectedFiberIndex]);

  return (
    <Tooltip label={tooltipLabel}>
      <FixedSizeList
        height={height}
        innerElementType="svg"
        itemCount={chartData.nodes.length}
        itemData={itemData}
        itemSize={lineHeight}
        ref={listRef}
        width={width}>
        {CommitRankedListItem}
      </FixedSizeList>
    </Tooltip>
  );
}

const getNodeIndex = (chartData: ChartData, id: number | null): number => {
  if (id === null) {
    return 0;
  }
  const {nodes} = chartData;
  for (let index = 0; index < nodes.length; index++) {
    if (nodes[index].id === id) {
      return index;
    }
  }
  return 0;
};

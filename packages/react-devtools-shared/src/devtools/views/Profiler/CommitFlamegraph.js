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
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeList} from 'react-window';
import {ProfilerContext} from './ProfilerContext';
import NoCommitData from './NoCommitData';
import CommitFlamegraphListItem from './CommitFlamegraphListItem';
import HoveredFiberInfo from './HoveredFiberInfo';
import {scale} from './utils';
import {useHighlightHostInstance} from '../hooks';
import {StoreContext} from '../context';
import {SettingsContext} from '../Settings/SettingsContext';
import Tooltip from './Tooltip';

import styles from './CommitFlamegraph.css';

import type {TooltipFiberData} from './HoveredFiberInfo';
import type {ChartData, ChartNode} from './FlamegraphChartBuilder';
import type {CommitTree} from './types';

export type ItemData = {
  chartData: ChartData,
  onElementMouseEnter: (fiberData: TooltipFiberData) => void,
  onElementMouseLeave: () => void,
  scaleX: (value: number, fallbackValue: number) => number,
  selectedChartNode: ChartNode | null,
  selectedChartNodeIndex: number,
  selectFiber: (id: number | null, name: string | null) => void,
  width: number,
};

export default function CommitFlamegraphAutoSizer(_: {}): React.Node {
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

    chartData = profilingCache.getFlamegraphChartData({
      commitIndex: selectedCommitIndex,
      commitTree,
      rootID: rootID as any as number,
    });
  }

  if (commitTree != null && chartData != null && chartData.depth > 0) {
    return (
      <div className={styles.Container} onClick={deselectCurrentFiber}>
        <AutoSizer>
          {({height, width}) => (
            // Force Flow types to avoid checking for `null` here because there's no static proof that
            // by the time this render prop function is called, the values of the `let` variables have not changed.
            <CommitFlamegraph
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

function CommitFlamegraph({chartData, commitTree, height, width}: Props) {
  const [hoveredFiberData, setHoveredFiberData] =
    useState<TooltipFiberData | null>(null);
  const {lineHeight} = useContext(SettingsContext);
  const {selectFiber, selectedFiberID} = useContext(ProfilerContext);
  const {highlightHostInstance, clearHighlightHostInstance} =
    useHighlightHostInstance();

  const selectedChartNodeIndex = useMemo<number>(() => {
    if (selectedFiberID === null) {
      return 0;
    }
    // The selected node might not be in the tree for this commit,
    // so it's important that we have a fallback plan.
    const depth = chartData.idToDepthMap.get(selectedFiberID);
    return depth !== undefined ? depth - 1 : 0;
  }, [chartData, selectedFiberID]);

  const selectedChartNode = useMemo(() => {
    if (selectedFiberID !== null) {
      return (
        chartData.rows[selectedChartNodeIndex].find(
          chartNode => chartNode.id === selectedFiberID,
        ) || null
      );
    }
    return null;
  }, [chartData, selectedFiberID, selectedChartNodeIndex]);

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
      onElementMouseEnter: handleElementMouseEnter,
      onElementMouseLeave: handleElementMouseLeave,
      scaleX: scale(
        0,
        selectedChartNode !== null
          ? selectedChartNode.treeBaseDuration
          : chartData.baseDuration,
        0,
        width,
      ),
      selectedChartNode,
      selectedChartNodeIndex,
      selectFiber,
      width,
    }),
    [
      chartData,
      handleElementMouseEnter,
      handleElementMouseLeave,
      selectedChartNode,
      selectedChartNodeIndex,
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

  // Scroll the selected fiber into view (e.g. when navigating search results).
  const listRef = useRef<FixedSizeList | null>(null);
  useEffect(() => {
    if (selectedFiberID !== null && listRef.current !== null) {
      listRef.current.scrollToItem(selectedChartNodeIndex, 'smart');
    }
  }, [selectedFiberID, selectedChartNodeIndex]);

  return (
    <Tooltip label={tooltipLabel}>
      <FixedSizeList
        height={height}
        innerElementType={InnerElementType}
        itemCount={chartData.depth}
        itemData={itemData}
        itemSize={lineHeight}
        ref={listRef}
        width={width}>
        {CommitFlamegraphListItem}
      </FixedSizeList>
    </Tooltip>
  );
}

const InnerElementType = forwardRef(({children, ...rest}, ref) => (
  <svg ref={ref} {...rest}>
    <defs>
      <pattern
        id="didNotRenderPattern"
        patternUnits="userSpaceOnUse"
        width="4"
        height="4">
        <path
          d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2"
          className={styles.PatternPath}
        />
      </pattern>
    </defs>
    {children}
  </svg>
));

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, memo, useCallback, useContext} from 'react';
import {areEqual} from 'react-window';
import {barWidthThreshold} from './constants';
import {getGradientColor} from './utils';
import ChartNode from './ChartNode';
import {SettingsContext} from '../Settings/SettingsContext';

import type {ChartNode as ChartNodeType} from './FlamegraphChartBuilder';
import type {ItemData} from './CommitFlamegraph';
import typeof {SyntheticMouseEvent} from 'react-dom-bindings/src/events/SyntheticEvent';

type Props = {
  data: ItemData,
  index: number,
  style: Object,
  ...
};

function CommitFlamegraphListItem({data, index, style}: Props): React.Node {
  const {
    chartData,
    onElementMouseEnter,
    onElementMouseLeave,
    scaleX,
    selectedChartNode,
    selectedChartNodeIndex,
    selectFiber,
    width,
  } = data;
  const {renderPathNodes, maxSelfDuration, rows} = chartData;

  const {lineHeight} = useContext(SettingsContext);

  const handleClick = useCallback(
    (event: SyntheticMouseEvent, id: number, name: string) => {
      event.stopPropagation();
      selectFiber(id, name);
    },
    [selectFiber],
  );

  const handleMouseEnter = (nodeData: ChartNodeType) => {
    const {id, name} = nodeData;
    onElementMouseEnter({id, name});
  };

  const handleMouseLeave = () => {
    onElementMouseLeave();
  };

  // List items are absolutely positioned using the CSS "top" attribute.
  // The "left" value will always be 0.
  // Since height is fixed, and width is based on the node's duration,
  // We can ignore those values as well.
  const top = parseInt(style.top, 10);

  const row = rows[index];

  const selectedNodeOffset = scaleX(
    selectedChartNode !== null ? selectedChartNode.offset : 0,
    width,
  );

  return (
    <Fragment>
      {row.map(chartNode => {
        const {
          didRender,
          id,
          label,
          name,
          offset,
          selfDuration,
          treeBaseDuration,
        } = chartNode;

        const nodeOffset = scaleX(offset, width);
        const nodeWidth = scaleX(treeBaseDuration, width);

        // Filter out nodes that are too small to see or click.
        // This also helps render large trees faster.
        if (nodeWidth < barWidthThreshold) {
          return null;
        }

        // Filter out nodes that are outside of the horizontal window.
        if (
          nodeOffset + nodeWidth < selectedNodeOffset ||
          nodeOffset > selectedNodeOffset + width
        ) {
          return null;
        }

        let color = 'url(#didNotRenderPattern)';
        let textColor = 'var(--color-commit-did-not-render-pattern-text)';
        if (didRender) {
          color = getGradientColor(selfDuration / maxSelfDuration);
          textColor = 'var(--color-commit-gradient-text)';
        } else if (renderPathNodes.has(id)) {
          color = 'var(--color-commit-did-not-render-fill)';
          textColor = 'var(--color-commit-did-not-render-fill-text)';
        }

        return (
          <ChartNode
            color={color}
            height={lineHeight}
            isDimmed={index < selectedChartNodeIndex}
            key={id}
            label={label}
            onClick={event => handleClick(event, id, name)}
            onMouseEnter={() => handleMouseEnter(chartNode)}
            onMouseLeave={handleMouseLeave}
            textStyle={{color: textColor}}
            width={nodeWidth}
            x={nodeOffset - selectedNodeOffset}
            y={top}
          />
        );
      })}
    </Fragment>
  );
}

export default memo(CommitFlamegraphListItem, areEqual) as component(
  ...props: Props
);

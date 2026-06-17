/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {memo, useCallback, useContext} from 'react';
import {areEqual} from 'react-window';
import {minBarWidth} from './constants';
import {getGradientColor} from './utils';
import ChartNode from './ChartNode';
import {SettingsContext} from '../Settings/SettingsContext';

import type {ItemData} from './CommitRanked';

type Props = {
  data: ItemData,
  index: number,
  style: Object,
};

function CommitRankedListItem({data, index, style}: Props) {
  const {
    chartData,
    onElementMouseEnter,
    onElementMouseLeave,
    scaleX,
    selectedFiberIndex,
    selectFiber,
    width,
  } = data;

  const node = chartData.nodes[index];

  const {lineHeight} = useContext(SettingsContext);

  const handleClick = useCallback(
    (event: $FlowFixMe) => {
      event.stopPropagation();
      const {id, name} = node;
      selectFiber(id, name);
    },
    [node, selectFiber],
  );

  const handleMouseEnter = () => {
    const {id, name} = node;
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

  return (
    <ChartNode
      color={getGradientColor(node.value / chartData.maxValue)}
      height={lineHeight}
      isDimmed={index < selectedFiberIndex}
      key={node.id}
      label={node.label}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      width={Math.max(minBarWidth, scaleX(node.value, width))}
      x={0}
      y={top}
    />
  );
}

export default memo(CommitRankedListItem, areEqual) as component(
  ...props: Props
);

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import styles from './ChartNode.css';
import typeof {SyntheticMouseEvent} from 'react-dom-bindings/src/events/SyntheticEvent';

type Props = {
  color: string,
  height: number,
  isCurrentSearchMatch?: boolean,
  isDimmed?: boolean,
  isSearchMatch?: boolean,
  label: string,
  onClick: (event: SyntheticMouseEvent) => mixed,
  onDoubleClick?: (event: SyntheticMouseEvent) => mixed,
  onMouseEnter: (event: SyntheticMouseEvent) => mixed,
  onMouseLeave: (event: SyntheticMouseEvent) => mixed,
  placeLabelAboveNode?: boolean,
  searchRegExp?: RegExp | null,
  textStyle?: Object,
  width: number,
  x: number,
  y: number,
};

const minWidthToDisplay = 35;

// Wrap the matched substring of `label` in a highlight, like the Components
// panel search does (see IndexableDisplayName).
function highlightLabel(
  label: string,
  searchRegExp: RegExp,
  isCurrentSearchMatch: boolean,
): React.Node {
  const match = searchRegExp.exec(label);
  if (match === null) {
    return label;
  }
  const start = match.index;
  const stop = start + match[0].length;
  return (
    <>
      {start > 0 ? label.slice(0, start) : null}
      <mark
        className={
          isCurrentSearchMatch ? styles.CurrentHighlight : styles.Highlight
        }>
        {label.slice(start, stop)}
      </mark>
      {stop < label.length ? label.slice(stop) : null}
    </>
  );
}

export default function ChartNode({
  color,
  height,
  isCurrentSearchMatch = false,
  isDimmed = false,
  isSearchMatch = false,
  label,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick,
  searchRegExp,
  textStyle,
  width,
  x,
  y,
}: Props): React.Node {
  const content =
    isSearchMatch && searchRegExp != null
      ? highlightLabel(label, searchRegExp, isCurrentSearchMatch)
      : label;
  return (
    <g className={styles.Group} transform={`translate(${x},${y})`}>
      <rect
        width={width}
        height={height}
        fill={color}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        className={styles.Rect}
        style={{
          opacity: isDimmed ? 0.5 : 1,
        }}
      />
      {width >= minWidthToDisplay && (
        <foreignObject
          width={width}
          height={height}
          className={styles.ForeignObject}
          style={{
            paddingLeft: x < 0 ? -x : 0,
            opacity: isDimmed ? 0.75 : 1,
            display: width < minWidthToDisplay ? 'none' : 'block',
          }}
          y={0}>
          <div className={styles.Div} style={textStyle}>
            {content}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Data} from './TraceUpdates/index';
import type {Rect} from './utils';
import {getElementDimensions, getNestedBoundingClientRect} from './utils';
import type {HostInstance} from '../types';
import type Agent from '../agent';

import {isReactNativeEnvironment} from 'react-devtools-shared/src/backend/utils';

// Note these colors are in sync with DevTools Profiler chart colors.
const COLORS = [
  '#37afa9',
  '#63b19e',
  '#80b393',
  '#97b488',
  '#abb67d',
  '#beb771',
  '#cfb965',
  '#dfba57',
  '#efbb49',
  '#febc38',
];

const highlightColors = {
  margin: 'rgba(255, 155, 0, 0.3)',
  border: 'rgba(255, 200, 50, 0.3)',
  padding: 'rgba(77, 200, 0, 0.2)',
  content: 'rgba(120, 170, 210, 0.7)'
};

let canvas: HTMLCanvasElement | null = null;

function drawNative(nodeToData: Map<HostInstance, Data>, agent: Agent) {
  const nodesToDraw = [];
  iterateNodes(nodeToData, ({color, node}) => {
    nodesToDraw.push({node, color});
  });

  agent.emit('drawTraceUpdates', nodesToDraw);

  const mergedNodes = groupAndSortNodes(nodeToData);
  agent.emit('drawGroupedTraceUpdatesWithNames', mergedNodes);
}

function resizeCanvas(
  canvasFlow: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  dpr: number
) {
  // const dpr = window.devicePixelRatio || 1;
  canvasFlow.width = window.innerWidth * dpr;
  canvasFlow.height = window.innerHeight * dpr;
  canvasFlow.style.width = `${window.innerWidth}px`;
  canvasFlow.style.height = `${window.innerHeight}px`;
  context.scale(dpr, dpr);
}

function drawWeb(nodeToData: Map<HostInstance, Data>) {
  if (canvas === null) {
    initialize();
  }


  const dpr = window.devicePixelRatio || 1;
  const canvasFlow: HTMLCanvasElement = canvas as any;
  const context = canvasFlow.getContext('2d');
  if (!context) return;

  resizeCanvas(canvasFlow, context, dpr);


  context.clearRect(0, 0, canvasFlow.width / dpr, canvasFlow.height / dpr);

  const mergedNodes = groupAndSortNodes(nodeToData);

  mergedNodes.forEach(group => {
    drawGroupBorders(context, group);
    drawGroupLabel(context, group);
  });

  if (canvas !== null) {
    if (nodeToData.size === 0 && canvas.matches(':popover-open')) {
      // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
      // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
      canvas.hidePopover();
      return;
    }
    // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
    if (canvas.matches(':popover-open')) {
      // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
      // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
      canvas.hidePopover();
    }
    // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
    // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
    canvas.showPopover();
  }
}

type GroupItem = {
  rect: Rect,
  color: string,
  displayName: string | null,
  count: number,
};

export type {GroupItem};

export function groupAndSortNodes(
  nodeToData: Map<HostInstance, Data>,
): Array<Array<GroupItem>> {
  const positionGroups: Map<string, Array<GroupItem>> = new Map();

  iterateNodes(nodeToData, ({rect, color, displayName, count}) => {
    if (!rect) return;
    const key = `${rect.left},${rect.top}`;
    if (!positionGroups.has(key)) positionGroups.set(key, []);
    positionGroups.get(key)?.push({rect, color, displayName, count});
  });

  return Array.from(positionGroups.values()).sort((groupA, groupB) => {
    const maxCountA = Math.max(...groupA.map(item => item.count));
    const maxCountB = Math.max(...groupB.map(item => item.count));
    return maxCountA - maxCountB;
  });
}

function drawGroupBorders(
  context: CanvasRenderingContext2D,
  group: Array<GroupItem>,
) {
  group.forEach(({color, rect}) => {
    context.beginPath();
    context.strokeStyle = color;
    context.rect(rect.left, rect.top, rect.width - 1, rect.height - 1);
    context.stroke();
  });
}

function drawGroupLabel(
  context: CanvasRenderingContext2D,
  group: Array<GroupItem>,
) {
  const mergedName = group
    .map(({displayName, count}) =>
      displayName ? `${displayName}${count > 1 ? ` x${count}` : ''}` : '',
    )
    .filter(Boolean)
    .join(', ');

  if (mergedName) {
    drawLabel(context, group[0].rect, mergedName, group[0].color);
  }
}

export function draw(nodeToData: Map<HostInstance, Data>, agent: Agent): void {
  return isReactNativeEnvironment()
    ? drawNative(nodeToData, agent)
    : drawWeb(nodeToData);
}

type DataWithColorAndNode = {
  ...Data,
  color: string,
  node: HostInstance,
};

function iterateNodes(
  nodeToData: Map<HostInstance, Data>,
  execute: (data: DataWithColorAndNode) => void,
) {
  nodeToData.forEach((data, node) => {
    const colorIndex = Math.min(COLORS.length - 1, data.count - 1);
    const color = COLORS[colorIndex];
    execute({
      color,
      node,
      count: data.count,
      displayName: data.displayName,
      expirationTime: data.expirationTime,
      lastMeasuredAt: data.lastMeasuredAt,
      rect: data.rect,
    });
  });
}

function drawLabel(
  context: CanvasRenderingContext2D,
  rect: Rect,
  text: string,
  color: string,
): void {
  const {left, top} = rect;
  context.font = '10px monospace';
  context.textBaseline = 'middle';
  context.textAlign = 'center';

  const padding = 2;
  const textHeight = 14;

  const metrics = context.measureText(text);
  const backgroundWidth = metrics.width + padding * 2;
  const backgroundHeight = textHeight;
  const labelX = left;
  const labelY = top - backgroundHeight;

  context.fillStyle = color;
  context.fillRect(labelX, labelY, backgroundWidth, backgroundHeight);

  context.fillStyle = '#000000';
  context.fillText(
    text,
    labelX + backgroundWidth / 2,
    labelY + backgroundHeight / 2,
  );
}

function destroyNative(agent: Agent) {
  agent.emit('disableTraceUpdates');
}

function destroyWeb() {
  if (canvas !== null) {
    if (canvas.matches(':popover-open')) {
      // $FlowFixMe[prop-missing]: Flow doesn't recognize Popover API
      // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
      canvas.hidePopover();
    }

    // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API and loses canvas nullability tracking
    if (canvas.parentNode != null) {
      // $FlowFixMe[incompatible-type]: Flow doesn't track that canvas is non-null here
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
  }
}

export function destroy(agent: Agent): void {
  return isReactNativeEnvironment() ? destroyNative(agent) : destroyWeb();
}

export function drawHighlighter(
  elements: $ReadOnlyArray<HTMLElement>,
  componentName: string | null
) {
  if (canvas == null) {
    initialize();
  }


  const canvasFlow: HTMLCanvasElement = canvas as any;
  const context = canvasFlow.getContext('2d');
  if (!context) return;

  const dpr = window.devicePixelRatio || 1;
  resizeCanvas(canvasFlow, context, dpr);

  context.clearRect(0, 0, canvasFlow.width / dpr, canvasFlow.height / dpr);

  const targetWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;

  const outerBox = {
    top: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
    left: Number.POSITIVE_INFINITY,
  }

  elements.forEach(element => {
    if (element.nodeType !== Node.ELEMENT_NODE) return;

    const box = getNestedBoundingClientRect(element, targetWindow);
    const dims = getElementDimensions(element);

    // Compute macro bounding tracking coordinates across all multi-node updates
    outerBox.top = Math.min(outerBox.top, box.top - dims.marginTop);
    outerBox.right = Math.max(
      outerBox.right,
      box.left + box.width + dims.marginRight,
    );
    outerBox.bottom = Math.max(
      outerBox.bottom,
      box.top + box.height + dims.marginBottom,
    );
    outerBox.left = Math.min(outerBox.left, box.left - dims.marginLeft);

    // 1. Margin (Orange)
    const marginLeft = box.left - dims.marginLeft;
    const marginTop = box.top - dims.marginTop;
    const marginWidth = box.width + dims.marginLeft + dims.marginRight;
    const marginHeight = box.height + dims.marginTop + dims.marginBottom;
    context.fillStyle = highlightColors.margin;
    context.fillRect(marginLeft, marginTop, marginWidth, marginHeight);

    // 2. Border (Yellow)
    context.fillStyle = highlightColors.border;
    context.fillRect(box.left, box.top, box.width, box.height);

    // 3. Padding (Green)
    const paddingLeft = box.left + dims.borderLeft;
    const paddingTop = box.top + dims.borderTop;
    const paddingWidth = box.width - dims.borderLeft - dims.borderRight;
    const paddingHeight = box.height - dims.borderTop - dims.borderBottom;
    context.fillStyle = highlightColors.padding;
    context.fillRect(paddingLeft, paddingTop, paddingWidth, paddingHeight);

    // 4. Content (Blue)
    const contentLeft = paddingLeft + dims.paddingLeft;
    const contentTop = paddingTop + dims.paddingTop;
    const contentWidth = paddingWidth - dims.paddingLeft - dims.paddingRight;
    const contentHeight = paddingHeight - dims.paddingTop - dims.paddingBottom;
    context.fillStyle = highlightColors.content;
    context.fillRect(contentLeft, contentTop, contentWidth, contentHeight);
  });

  // Render the unified tooltip label box frame if valid element selections exist
  if (elements.length > 0 && outerBox.top !== Number.POSITIVE_INFINITY) {
    const finalName = componentName || elements[0].nodeName.toLowerCase();
    const finalWidth = outerBox.right - outerBox.left;
    const finalHeight = outerBox.bottom - outerBox.top;

    drawOverlayTip(context, finalName, finalWidth, finalHeight, {
      top: outerBox.top,
      left: outerBox.left,
      width: finalWidth,
      height: finalHeight,
    });
  }

  if (!canvasFlow.matches(':popover-open')) {
    // $FlowFixMe[prop-missing]
    canvasFlow.showPopover();
  }
}

function drawOverlayTip(
  context: CanvasRenderingContext2D,
  name: string,
  width: number,
  height: number,
  targetBox: {top: number; left: number; width: number; height: number},
) {
  context.font =
    'bold 12px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace';
  context.textBaseline = 'top';
  context.textAlign = 'left';

  const dimText = `${Math.round(width)}px × ${Math.round(height)}px`;

  const nameMetrics = context.measureText(name);
  const dimMetrics = context.measureText(dimText);

  // Layout spacing metrics
  const paddingX = 5;
  const paddingY = 3;
  const gap = 8;
  const textHeight = 14;

  const tipWidth = nameMetrics.width + dimMetrics.width + paddingX * 2 + gap;
  const tipHeight = textHeight + paddingY * 2;
  const margin = 5;

  // Determine ideal position relative to target bounding box variables
  let top = targetBox.top + targetBox.height + margin;
  if (top + tipHeight > window.innerHeight) {
    if (targetBox.top - tipHeight - margin >= 0) {
      top = targetBox.top - tipHeight - margin;
    } else {
      top = margin;
    }
  }

  let left = targetBox.left + margin;
  if (left + tipWidth > window.innerWidth) {
    left = window.innerWidth - tipWidth - margin;
  }
  if (left < margin) {
    left = margin;
  }

  // Render container background capsule
  context.fillStyle = '#333740';
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(left, top, tipWidth, tipHeight, 2);
  } else {
    context.rect(left, top, tipWidth, tipHeight);
  }
  context.fill();

  // Draw Component Name Label
  context.fillStyle = '#ee78e6';
  context.fillText(name, left + paddingX, top + paddingY);

  // Draw Separator Line Divider
  context.strokeStyle = '#aaaaaa';
  context.lineWidth = 1;
  context.beginPath();
  const lineX = left + paddingX + nameMetrics.width + gap / 2;
  context.moveTo(lineX, top + paddingY);
  context.lineTo(lineX, top + paddingY + textHeight);
  context.stroke();

  // Draw Dimensions Parameter Label
  context.fillStyle = '#d7d7d7';
  context.fillText(dimText, lineX + gap / 2, top + paddingY);
}

function initialize(): void {
  canvas = window.document.createElement('canvas');
  canvas.setAttribute('popover', 'manual');

  // $FlowFixMe[incompatible-use]: Flow doesn't recognize Popover API
  canvas.style.cssText = `
    xx-background-color: red;
    xx-opacity: 0.5;
    bottom: 0;
    left: 0;
    pointer-events: none;
    position: fixed;
    right: 0;
    top: 0;
    background-color: transparent;
    outline: none;
    box-shadow: none;
    border: none;
  `;

  const root = window.document.documentElement;
  root.insertBefore(canvas, root.firstChild);
}

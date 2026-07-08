/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Data} from './index';
import type {Rect} from '../utils';
import type {HostInstance} from '../../types';
import type Agent from '../../agent';

import {isReactNativeEnvironment} from 'react-devtools-shared/src/backend/utils';
import {getEffectiveZoom} from '../utils';

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

function drawWeb(nodeToData: Map<HostInstance, Data>) {
  if (canvas === null) {
    initialize();
  }

  const dpr = window.devicePixelRatio || 1;
  const canvasFlow: HTMLCanvasElement = canvas as any as HTMLCanvasElement;

  // CSS zoom inherited from the document scales the canvas' size and drawing
  // coordinates, while the rects to draw are unscaled viewport coordinates.
  // Cancel the inherited zoom out so both coordinate systems match.
  const inheritedZoom = getEffectiveZoom(
    canvasFlow.parentElement ?? window.document.documentElement,
  );
  canvasFlow.style.setProperty(
    'zoom',
    inheritedZoom !== 1 ? String(1 / inheritedZoom) : '1',
  );

  canvasFlow.width = window.innerWidth * dpr;
  canvasFlow.height = window.innerHeight * dpr;
  canvasFlow.style.width = `${window.innerWidth}px`;
  canvasFlow.style.height = `${window.innerHeight}px`;

  const context = canvasFlow.getContext('2d');
  context.scale(dpr, dpr);

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

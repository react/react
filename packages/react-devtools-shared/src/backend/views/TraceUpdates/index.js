/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import Agent from 'react-devtools-shared/src/backend/agent';
import {destroy as destroyCanvas, draw} from '../canvas';
import {extractHOCNames, getNestedBoundingClientRect} from '../utils';

import type {HostInstance} from '../../types';
import type {Rect} from '../utils';

// How long the rect should be shown for?
const DISPLAY_DURATION = 250;

// What's the longest we are willing to show the overlay for?
// This can be important if we're getting a flurry of events (e.g. scroll update).
const MAX_DISPLAY_DURATION = 3000;

// How long should a rect be considered valid for?
const REMEASUREMENT_AFTER_DURATION = 250;

// Markers for different types of HOCs
const HOC_MARKERS = new Map([
  ['Forget', '✨'],
  ['Memo', '🧠'],
]);

// Some environments (e.g. React Native / Hermes) don't support the performance API yet.
const getCurrentTime =
  // $FlowFixMe[method-unbinding]
  typeof performance === 'object' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

export type Data = {
  count: number;
  expirationTime: number;
  lastMeasuredAt: number;
  rect: Rect | null;
  displayName: string | null;
};

const nodeToData: Map<HostInstance, Data> = new Map();

let agent: Agent = null as any as Agent;
let drawAnimationFrameID: AnimationFrameID | null = null;
let isEnabled: boolean = false;
let redrawTimeoutID: TimeoutID | null = null;

export function initialize(injectedAgent: Agent): void {
  agent = injectedAgent;
  agent.addListener('traceUpdates', traceUpdates);
}

export function toggleEnabled(value: boolean): void {
  isEnabled = value;

  if (!isEnabled) {
    nodeToData.clear();

    if (drawAnimationFrameID !== null) {
      cancelAnimationFrame(drawAnimationFrameID);
      drawAnimationFrameID = null;
    }

    if (redrawTimeoutID !== null) {
      clearTimeout(redrawTimeoutID);
      redrawTimeoutID = null;
    }

    destroyCanvas(agent);
  }
}

function traceUpdates(nodes: Set<HostInstance>): void {
  if (!isEnabled) return;

  nodes.forEach(node => {
    const data = nodeToData.get(node);
    const now = getCurrentTime();

    let lastMeasuredAt = data != null ? data.lastMeasuredAt : 0;
    let rect = data != null ? data.rect : null;

    if (rect === null || lastMeasuredAt + REMEASUREMENT_AFTER_DURATION < now) {
      lastMeasuredAt = now;
      rect = measureNode(node);
    }

    let displayName = agent.getComponentNameForHostInstance(node);
    if (displayName) {
      const {baseComponentName, hocNames} = extractHOCNames(displayName);

      const markers = hocNames.map(hoc => HOC_MARKERS.get(hoc) || '').join('');

      const enhancedDisplayName = markers
        ? `${markers}${baseComponentName}`
        : baseComponentName;

      displayName = enhancedDisplayName;
    }

    nodeToData.set(node, {
      count: data != null ? data.count + 1 : 1,
      expirationTime:
        data != null
          ? Math.min(
              now + MAX_DISPLAY_DURATION,
              data.expirationTime + DISPLAY_DURATION,
            )
          : now + DISPLAY_DURATION,
      lastMeasuredAt,
      rect,
      displayName,
    });
  });

  if (redrawTimeoutID !== null) {
    clearTimeout(redrawTimeoutID);
    redrawTimeoutID = null;
  }

  if (drawAnimationFrameID === null) {
    drawAnimationFrameID = requestAnimationFrame(prepareToDraw);
  }
}

function prepareToDraw(): void {
  drawAnimationFrameID = null;
  redrawTimeoutID = null;

  const now = getCurrentTime();
  let earliestExpiration = Number.MAX_VALUE;

  // Remove any items that have already expired.
  nodeToData.forEach((data, node) => {
    if (data.expirationTime < now) {
      nodeToData.delete(node);
    } else {
      earliestExpiration = Math.min(earliestExpiration, data.expirationTime);
    }
  });

  draw(nodeToData, agent);

  if (earliestExpiration !== Number.MAX_VALUE) {
    redrawTimeoutID = setTimeout(prepareToDraw, earliestExpiration - now);
  }
}

function measureNode(node: Object): Rect | null {
  if (!node || typeof node.getBoundingClientRect !== 'function') {
    return null;
  }

  const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;

  return getNestedBoundingClientRect(node, currentWindow);
}

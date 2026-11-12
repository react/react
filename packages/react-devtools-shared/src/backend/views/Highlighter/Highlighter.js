/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type Agent from 'react-devtools-shared/src/backend/agent';
import type {HostInstance} from '../../types';

import {isReactNativeEnvironment} from 'react-devtools-shared/src/backend/utils';

import Overlay from './Overlay';

const SHOW_DURATION = 2000;

let timeoutID: TimeoutID | null = null;
let overlay: Overlay | null = null;

function hideOverlayNative(agent: Agent): void {
  agent.emit('hideNativeHighlight');
}

function hideOverlayWeb(): void {
  timeoutID = null;

  if (overlay !== null) {
    overlay.remove();
    overlay = null;
  }
}

export function hideOverlay(agent: Agent): void {
  return isReactNativeEnvironment()
    ? hideOverlayNative(agent)
    : hideOverlayWeb();
}

function showOverlayNative(
  elements: $ReadOnlyArray<HostInstance>,
  agent: Agent,
): void {
  agent.emit('showNativeHighlight', elements);
}

function showOverlayWeb(
  elements: $ReadOnlyArray<HTMLElement>,
  componentName: string | null,
  agent: Agent,
  hideAfterTimeout: boolean,
): void {
  if (timeoutID !== null) {
    clearTimeout(timeoutID);
  }

  if (overlay === null) {
    overlay = new Overlay(agent);
  }

  overlay.inspect(elements, componentName);

  if (hideAfterTimeout) {
    timeoutID = setTimeout(() => hideOverlay(agent), SHOW_DURATION);
  }
}

export function showOverlay(
  elements: $ReadOnlyArray<HostInstance>,
  componentName: string | null,
  agent: Agent,
  hideAfterTimeout: boolean,
): void {
  return isReactNativeEnvironment()
    ? showOverlayNative(elements, agent)
    : showOverlayWeb(
        elements as $ReadOnlyArray<any>,
        componentName,
        agent,
        hideAfterTimeout,
      );
}

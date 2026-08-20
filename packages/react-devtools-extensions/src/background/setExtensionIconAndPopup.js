/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* global chrome */

'use strict';
import type {ReactBuildType} from 'react-devtools-shared/src/backend/types';

function setExtensionIconAndPopup(
  reactBuildType: ReactBuildType,
  tabId: number,
) {
  chrome.action.setIcon({
    tabId,
    path: {
      '16': chrome.runtime.getURL(`icons/16-${reactBuildType}.png`),
      '32': chrome.runtime.getURL(`icons/32-${reactBuildType}.png`),
      '48': chrome.runtime.getURL(`icons/48-${reactBuildType}.png`),
      '128': chrome.runtime.getURL(`icons/128-${reactBuildType}.png`),
    },
  });

  chrome.action.setPopup({
    tabId,
    popup: chrome.runtime.getURL(`popups/${reactBuildType}.html`),
  });
}

export default setExtensionIconAndPopup;

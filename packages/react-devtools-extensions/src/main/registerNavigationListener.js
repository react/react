/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* global chrome */

export default function registerNavigationListener(
  onNavigated: () => void,
): () => void {
  if (__IS_FIREFOX__) {
    // Firefox does not expose webNavigation to DevTools pages.
    const event = chrome.devtools.network.onNavigated;
    event.addListener(onNavigated);
    return () => event.removeListener(onNavigated);
  }

  // network.onNavigated also fires for soft navigations in Chromium.
  const event = chrome.webNavigation.onCommitted;
  const listener = ({tabId, frameId}: {tabId: number, frameId: number}) => {
    if (tabId === chrome.devtools.inspectedWindow.tabId && frameId === 0) {
      onNavigated();
    }
  };
  event.addListener(listener);
  return () => event.removeListener(listener);
}

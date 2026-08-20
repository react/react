/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* global chrome */

export function executeScriptInIsolatedWorld({
  target,
  files,
}: {
  files: any,
  target: any,
}): Promise<void> {
  return chrome.scripting.executeScript({
    target,
    files,
    world: chrome.scripting.ExecutionWorld.ISOLATED,
  });
}

export function executeScriptInMainWorld({
  target,
  files,
  injectImmediately,
}: {
  files: any,
  target: any,
  // It's nice to have this required to make active choices.
  injectImmediately: boolean,
}): Promise<void> {
  return chrome.scripting.executeScript({
    target,
    files,
    injectImmediately,
    world: chrome.scripting.ExecutionWorld.MAIN,
  });
}

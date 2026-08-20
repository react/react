/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import {requestPostPaintCallback} from './ReactFiberConfig';

let postPaintCallbackScheduled = false;
let callbacks: Array<any | ((endTime: number) => void)> = [];

export function schedulePostPaintCallback(callback: (endTime: number) => void) {
  callbacks.push(callback);
  if (!postPaintCallbackScheduled) {
    postPaintCallbackScheduled = true;
    requestPostPaintCallback(endTime => {
      for (let i = 0; i < callbacks.length; i++) {
        callbacks[i](endTime);
      }
      postPaintCallbackScheduled = false;
      callbacks = [];
    });
  }
}

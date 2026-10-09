/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactStackTrace} from 'shared/ReactTypes';

export type StackFrameFilter = (
  url: string,
  functionName: string,
  lineNumber: number,
  columnNumber: number,
) => boolean;

function devirtualizeURL(url: string): string {
  if (url.startsWith('about://React/')) {
    // This callsite is a virtual fake callsite that came from another Flight client.
    // We need to reverse it back into the original location by stripping its prefix
    // and suffix. We don't need the environment name because it's available on the
    // parent object that will contain the stack.
    const envIdx = url.indexOf('/', 'about://React/'.length);
    const suffixIdx = url.lastIndexOf('?');
    if (envIdx > -1 && suffixIdx > -1) {
      return decodeURI(url.slice(envIdx + 1, suffixIdx));
    }
  }
  return url;
}

function isPromiseAwaitInternal(url: string, functionName: string): boolean {
  // Various internals of the JS VM can await internally on a Promise. If those are at
  // the top of the stack then we don't want to consider them as internal frames. The
  // true "await" conceptually is the thing that called the helper.
  // Ideally we'd also include common third party helpers for this.
  if (url === 'node:internal/async_hooks') {
    // Ignore the stack frames from the async hooks themselves.
    return true;
  }
  if (url !== '') {
    return false;
  }
  // V8 used to name the frames of static methods on the Promise constructor
  // "Function.x" but newer versions name them "Promise.x". We match both.
  switch (functionName) {
    case 'Promise.then':
    case 'Promise.catch':
    case 'Promise.finally':
    case 'Function.reject':
    case 'Promise.reject':
    case 'Function.resolve':
    case 'Promise.resolve':
    case 'Function.all':
    case 'Promise.all':
    case 'Function.allSettled':
    case 'Promise.allSettled':
    case 'Function.any':
    case 'Promise.any':
    case 'Function.race':
    case 'Promise.race':
    case 'Function.try':
    case 'Promise.try':
    case 'Function.withResolvers':
    case 'Promise.withResolvers':
      return true;
    default:
      return false;
  }
}

export function isAwaitInUserspace(
  filterStackFrame: StackFrameFilter,
  stack: ReactStackTrace,
): boolean {
  let firstFrame = 0;
  while (
    stack.length > firstFrame &&
    isPromiseAwaitInternal(stack[firstFrame][1], stack[firstFrame][0])
  ) {
    // Skip the internal frame that awaits itself.
    firstFrame++;
  }
  if (stack.length > firstFrame) {
    // Check if the very first stack frame that awaited this Promise was in user space.
    // TODO: This doesn't take into account wrapper functions such as our fake .then()
    // in FlightClient which will always be considered third party awaits if you call
    // .then directly.
    const callsite = stack[firstFrame];
    const functionName = callsite[0];
    const url = devirtualizeURL(callsite[1]);
    const lineNumber = callsite[2];
    const columnNumber = callsite[3];
    return (
      filterStackFrame(url, functionName, lineNumber, columnNumber) &&
      url !== ''
    );
  }
  return false;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {EvalScriptIds} from '../evalScripts';

import {evalScripts} from '../evalScripts';

type ExceptionInfo = {
  code: ?string,
  description: ?string,
  isError: boolean,
  isException: boolean,
  value: any,
};

const EVAL_TIMEOUT = 1000 * 10;

let evalRequestId = 0;
const evalRequestCallbacks = new Map<
  number,
  (value: {result: any, error: any}) => void,
>();

function fallbackEvalInInspectedWindow(
  scriptId: EvalScriptIds,
  args: any[],
  callback: (value: any, exceptionInfo: ?ExceptionInfo) => void,
) {
  if (!evalScripts[scriptId]) {
    throw new Error(`No eval script with id "${scriptId}" exists.`);
  }
  const code = evalScripts[scriptId].code.apply(null, args);
  const tabId = chrome.devtools.inspectedWindow.tabId;
  const requestId = evalRequestId++;
  chrome.runtime.sendMessage({
    source: 'devtools-page',
    payload: {
      type: 'eval-in-inspected-window',
      tabId,
      requestId,
      scriptId,
      args,
    },
  });
  const timeout = setTimeout(() => {
    evalRequestCallbacks.delete(requestId);
    // $FlowFixMe[constant-condition]
    if (callback) {
      callback(null, {
        code,
        description:
          'Timed out while waiting for eval response from the inspected window.',
        isError: true,
        isException: false,
        value: undefined,
      });
    }
  }, EVAL_TIMEOUT);
  evalRequestCallbacks.set(requestId, ({result, error}) => {
    clearTimeout(timeout);
    evalRequestCallbacks.delete(requestId);
    // $FlowFixMe[constant-condition]
    if (callback) {
      if (error) {
        callback(null, {
          code,
          description: undefined,
          isError: false,
          isException: true,
          value: error,
        });
        return;
      }
      callback(result, null);
    }
  });
}

export function evalInInspectedWindow(
  scriptId: EvalScriptIds,
  args: any[],
  callback: (value: any, exceptionInfo: ?ExceptionInfo) => void,
) {
  if (!evalScripts[scriptId]) {
    throw new Error(`No eval script with id "${scriptId}" exists.`);
  }
  const code = evalScripts[scriptId].code.apply(null, args);
  chrome.devtools.inspectedWindow.eval(code, (result, exceptionInfo) => {
    if (!exceptionInfo) {
      callback(result, exceptionInfo);
      return;
    }
    // If an exception (e.g. CSP Blocked) occurred,
    // fallback to the content script eval context
    fallbackEvalInInspectedWindow(scriptId, args, callback);
  });
}

chrome.runtime.onMessage.addListener(({payload, source}) => {
  if (source === 'react-devtools-background') {
    switch (payload?.type) {
      case 'eval-in-inspected-window-response': {
        const {requestId, result, error} = payload;
        const callback = evalRequestCallbacks.get(requestId);
        if (callback) {
          callback({result, error});
        }
        break;
      }
    }
  }
});

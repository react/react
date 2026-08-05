/**
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactStackTrace, ReactFunctionLocation} from 'shared/ReactTypes';

function parseStackTraceFromChromeStack(
  stack: string,
  skipFrames: number,
): ReactStackTrace {
  if (stack.startsWith('Error: react-stack-top-frame\n')) {
    // V8's default formatting prefixes with the error message which we
    // don't want/need.
    stack = stack.slice(29);
  }
  let idx = stack.indexOf('react_stack_bottom_frame');
  if (idx === -1) {
    idx = stack.indexOf('react-stack-bottom-frame');
  }
  if (idx !== -1) {
    idx = stack.lastIndexOf('\n', idx);
  }
  if (idx !== -1) {
    // Cut off everything after the bottom frame since it'll be internals.
    stack = stack.slice(0, idx);
  }
  const frames = stack.split('\n');
  const parsedFrames: ReactStackTrace = [];
  // We skip top frames here since they may or may not be parseable but we
  // want to skip the same number of frames regardless. I.e. we can't do it
  // in the caller.
  for (let i = skipFrames; i < frames.length; i++) {
    const parsed = chromeFrameRegExp.exec(frames[i]);
    if (!parsed) {
      continue;
    }
    let name = parsed[1] || '';
    let isAsync = parsed[8] === 'async ';
    if (name === '<anonymous>') {
      name = '';
    } else if (name.startsWith('async ')) {
      name = name.slice(5);
      isAsync = true;
    }
    let filename = parsed[2] || parsed[5] || '';
    if (filename === '<anonymous>') {
      filename = '';
    }
    const line = +(parsed[3] || parsed[6] || 0);
    const col = +(parsed[4] || parsed[7] || 0);
    parsedFrames.push([name, filename, line, col, 0, 0, isAsync]);
  }
  return parsedFrames;
}

const firefoxFrameRegExp = /^((?:.*".+")?[^@]*)@(.+):(\d+):(\d+)$/;
function parseStackTraceFromFirefoxStack(
  stack: string,
  skipFrames: number,
): ReactStackTrace {
  let idx = stack.indexOf('react_stack_bottom_frame');
  if (idx === -1) {
    idx = stack.indexOf('react-stack-bottom-frame');
  }
  if (idx !== -1) {
    idx = stack.lastIndexOf('\n', idx);
  }
  if (idx !== -1) {
    // Cut off everything after the bottom frame since it'll be internals.
    stack = stack.slice(0, idx);
  }
  const frames = stack.split('\n');
  const parsedFrames: ReactStackTrace = [];
  // We skip top frames here since they may or may not be parseable but we
  // want to skip the same number of frames regardless. I.e. we can't do it
  // in the caller.
  for (let i = skipFrames; i < frames.length; i++) {
    const parsed = firefoxFrameRegExp.exec(frames[i]);
    if (!parsed) {
      continue;
    }
    const name = parsed[1] || '';
    const filename = parsed[2] || '';
    const line = +parsed[3];
    const col = +parsed[4];
    parsedFrames.push([name, filename, line, col, 0, 0, false]);
  }
  return parsedFrames;
}

const CHROME_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
export function parseStackTraceFromString(
  stack: string,
  skipFrames: number,
): ReactStackTrace {
  if (stack.match(CHROME_STACK_REGEXP)) {
    return parseStackTraceFromChromeStack(stack, skipFrames);
  }
  return parseStackTraceFromFirefoxStack(stack, skipFrames);
}

let framesToSkip: number = 0;
let collectedStackTrace: null | ReactStackTrace = null;

const identifierRegExp = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;

function getMethodCallName(callSite: CallSite): string {
  const typeName = callSite.getTypeName();
  const methodName = callSite.getMethodName();
  const functionName = callSite.getFunctionName();
  let result = '';
  if (functionName) {
    if (
      typeName &&
      identifierRegExp.test(functionName) &&
      functionName !== typeName
    ) {
      result += typeName + '.';
    }
    result += functionName;
    if (
      methodName &&
      functionName !== methodName &&
      !functionName.endsWith('.' + methodName) &&
      !functionName.endsWith(' ' + methodName)
    ) {
      result += ' [as ' + methodName + ']';
    }
  } else {
    if (typeName) {
      result += typeName + '.';
    }
    if (methodName) {
      result += methodName;
    } else {
      result += '<anonymous>';
    }
  }
  return result;
}

function collectStackTrace(
  error: Error,
  structuredStackTrace: CallSite[],
): string {
  const result: ReactStackTrace = [];
  // Collect structured stack traces from the callsites.
  // We mirror how V8 serializes stack frames and how we later parse them.
  for (let i = framesToSkip; i < structuredStackTrace.length; i++) {
    const callSite = structuredStackTrace[i];
    let name =
      // $FlowFixMe[method-unbinding]
      typeof callSite.getFunctionName === 'function'
        ? callSite.getFunctionName() || '<anonymous>'
        : '';
    if (
      name.includes('react_stack_bottom_frame') ||
      name.includes('react-stack-bottom-frame')
    ) {
      // Skip everything after the bottom frame since it'll be internals.
      break;
      // $FlowFixMe[method-unbinding]
    } else if (typeof callSite.isNative === 'function' && callSite.isNative()) {
      const isAsync =
        // $FlowFixMe[prop-missing]
        // $FlowFixMe[incompatible-use]
        typeof callSite.isAsync === 'function' && callSite.isAsync();
      result.push([name, '', 0, 0, 0, 0, isAsync]);
    } else {
      // We encode complex function calls as if they're part of the function
      // name since we cannot simulate the complex ones and they look the same
      // as function names in UIs on the client as well as stacks.
      if (
        // $FlowFixMe[method-unbinding]
        typeof callSite.isConstructor === 'function' &&
        callSite.isConstructor()
      ) {
        name = 'new ' + name;
      } else if (
        // $FlowFixMe[method-unbinding]
        typeof callSite.isToplevel === 'function' &&
        !callSite.isToplevel()
      ) {
        name = getMethodCallName(callSite);
      }
      if (name === '<anonymous>') {
        name = '';
      }
      let filename =
        // $FlowFixMe[method-unbinding]
        typeof callSite.getScriptNameOrSourceURL === 'function'
          ? callSite.getScriptNameOrSourceURL() || '<anonymous>'
          : '';
      if (filename === '<anonymous>') {
        filename = '';
        // $FlowFixMe[method-unbinding]
        if (typeof callSite.isEval === 'function' && callSite.isEval()) {
          const origin =
            // $FlowFixMe[method-unbinding]
            typeof callSite.getEvalOrigin === 'function'
              ? callSite.getEvalOrigin()
              : null;
          if (origin) {
            filename = origin.toString() + ', <anonymous>';
          }
        }
      }
      const line =
        // $FlowFixMe[method-unbinding]
        (typeof callSite.getLineNumber === 'function' &&
          callSite.getLineNumber()) ||
        0;
      const col =
        // $FlowFixMe[method-unbinding]
        (typeof callSite.getColumnNumber === 'function' &&
          callSite.getColumnNumber()) ||
        0;
      const enclosingLine: number =
        // $FlowFixMe[prop-missing]
        typeof callSite.getEnclosingLineNumber === 'function'
          ? (callSite as any).getEnclosingLineNumber() || 0
          : 0;
      const enclosingCol: number =
        // $FlowFixMe[prop-missing]
        typeof callSite.getEnclosingColumnNumber === 'function'
          ? (callSite as any).getEnclosingColumnNumber() || 0
          : 0;
      const isAsync =
        // $FlowFixMe[prop-missing]
        // $FlowFixMe[incompatible-use]
        typeof callSite.isAsync === 'function' && callSite.isAsync();
      result.push([
        name,
        filename,
        line,
        col,
        enclosingLine,
        enclosingCol,
        isAsync,
      ]);
    }
  }
  collectedStackTrace = result;

  // At the same time we generate a string stack trace just in case someone
  // else reads it. Ideally, we'd call the previous prepareStackTrace to
  // ensure it's in the expected format but it's common for that to be
  // source mapped and since we do a lot of eager parsing of errors, it
  // would be slow in those environments. We could maybe just rely on those
  // environments having to disable source mapping globally to speed things up.
  // For now, we just generate a default V8 formatted stack trace without
  // source mapping as a fallback.
  const name = error.name || 'Error';
  const message = error.message || '';
  let stack = name + ': ' + message;
  for (let i = 0; i < structuredStackTrace.length; i++) {
    stack += '\n    at ' + structuredStackTrace[i].toString();
  }
  return stack;
}

// This matches either of these V8 formats.
//     at name (filename:0:0)
//     at filename:0:0
//     at async filename:0:0
//     at Array.map (<anonymous>)
const chromeFrameRegExp =
  /^ *at (?:(.+) \((?:(.+):(\d+):(\d+)|\<anonymous\>)\)|(?:async )?(.+):(\d+):(\d+)|\<anonymous\>)$/;

const stackTraceCache: WeakMap<Error, ReactStackTrace> = new WeakMap();

export function parseStackTrace(
  error: Error,
  skipFrames: number,
): ReactStackTrace {
  // We can only get structured data out of error objects once. So we cache the information
  // so we can get it again each time. It also helps performance when the same error is
  // referenced more than once.
  const existing = stackTraceCache.get(error);
  if (existing !== undefined) {
    return existing;
  }
  // We override Error.prepareStackTrace with our own version that collects
  // the structured data. We need more information than the raw stack gives us
  // and we need to ensure that we don't get the source mapped version.
  collectedStackTrace = null;
  framesToSkip = skipFrames;
  const previousPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = collectStackTrace;
  let stack;
  try {
    stack = String(error.stack);
  } finally {
    Error.prepareStackTrace = previousPrepare;
  }

  if (collectedStackTrace !== null) {
    const result = collectedStackTrace;
    collectedStackTrace = null;
    stackTraceCache.set(error, result);
    return result;
  }

  // If the stack has already been read, or this is not actually a V8 compatible
  // engine then we might not get a normalized stack and it might still have been
  // source mapped. Regardless we try our best to parse it.

  const parsedFrames = parseStackTraceFromString(stack, skipFrames);
  stackTraceCache.set(error, parsedFrames);
  return parsedFrames;
}

export function extractLocationFromOwnerStack(
  error: Error,
): ReactFunctionLocation | null {
  const stackTrace = parseStackTrace(error, 1);
  const stack = error.stack;
  if (
    !stack.includes('react_stack_bottom_frame') &&
    !stack.includes('react-stack-bottom-frame')
  ) {
    // This didn't have a bottom to it, we can't trust it.
    return null;
  }
  // We start from the bottom since that will have the best location for the owner itself.
  for (let i = stackTrace.length - 1; i >= 0; i--) {
    const [functionName, fileName, line, col, encLine, encCol] = stackTrace[i];
    // Take the first match with a colon in the file name.
    if (fileName.indexOf(':') !== -1) {
      return [
        functionName,
        fileName,
        // Use enclosing line if available, since that points to the start of the function.
        encLine || line,
        encCol || col,
      ];
    }
  }
  return null;
}

export function extractLocationFromComponentStack(
  stack: string,
): ReactFunctionLocation | null {
  const stackTrace = parseStackTraceFromString(stack, 0);
  for (let i = 0; i < stackTrace.length; i++) {
    const [functionName, fileName, line, col, encLine, encCol] = stackTrace[i];
    // Take the first match with a colon in the file name.
    if (fileName.indexOf(':') !== -1) {
      return [
        functionName,
        fileName,
        // Use enclosing line if available. (Never the case here because we parse from string.)
        encLine || line,
        encCol || col,
      ];
    }
  }
  return null;
}

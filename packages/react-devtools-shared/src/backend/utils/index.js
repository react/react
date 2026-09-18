/**
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {compareVersions} from 'compare-versions';
import {dehydrate} from 'react-devtools-shared/src/hydration';
import isArray from 'shared/isArray';

import type {DehydratedData} from 'react-devtools-shared/src/frontend/types';

export {default as formatWithStyles} from './formatWithStyles';
export {default as formatConsoleArguments} from './formatConsoleArguments';

// TODO: update this to the first React version that has a corresponding DevTools backend
const FIRST_DEVTOOLS_BACKEND_LOCKSTEP_VER = '999.9.9';
export function hasAssignedBackend(version?: string): boolean {
  if (version == null || version === '') {
    return false;
  }
  return gte(version, FIRST_DEVTOOLS_BACKEND_LOCKSTEP_VER);
}

export function cleanForBridge(
  data: Object | null,
  isPathAllowed: (path: Array<string | number>) => boolean,
  path: Array<string | number> = [],
): DehydratedData | null {
  if (data !== null) {
    const cleanedPaths: Array<Array<string | number>> = [];
    const unserializablePaths: Array<Array<string | number>> = [];
    const cleanedData = dehydrate(
      data,
      cleanedPaths,
      unserializablePaths,
      path,
      isPathAllowed,
    );

    return {
      data: cleanedData,
      cleaned: cleanedPaths,
      unserializable: unserializablePaths,
    };
  } else {
    return null;
  }
}

export function copyWithDelete(
  obj: Object | Array<any>,
  path: Array<string | number>,
  index: number = 0,
): Object | Array<any> {
  const key = path[index];
  const updated = isArray(obj) ? obj.slice() : {...obj};
  if (index + 1 === path.length) {
    if (isArray(updated)) {
      updated.splice(key as any as number, 1);
    } else {
      delete updated[key];
    }
  } else {
    // $FlowFixMe[incompatible-use] number or string is fine here
    updated[key] = copyWithDelete(obj[key], path, index + 1);
  }
  return updated;
}

// This function expects paths to be the same except for the final value.
// e.g. ['path', 'to', 'foo'] and ['path', 'to', 'bar']
export function copyWithRename(
  obj: Object | Array<any>,
  oldPath: Array<string | number>,
  newPath: Array<string | number>,
  index: number = 0,
): Object | Array<any> {
  const oldKey = oldPath[index];
  const updated = isArray(obj) ? obj.slice() : {...obj};
  if (index + 1 === oldPath.length) {
    const newKey = newPath[index];
    // $FlowFixMe[incompatible-use] number or string is fine here
    updated[newKey] = updated[oldKey];
    if (isArray(updated)) {
      updated.splice(oldKey as any as number, 1);
    } else {
      delete updated[oldKey];
    }
  } else {
    // $FlowFixMe[incompatible-use] number or string is fine here
    updated[oldKey] = copyWithRename(obj[oldKey], oldPath, newPath, index + 1);
  }
  return updated;
}

export function copyWithSet(
  obj: Object | Array<any>,
  path: Array<string | number>,
  value: any,
  index: number = 0,
): Object | Array<any> {
  if (index >= path.length) {
    return value;
  }
  const key = path[index];
  const updated = isArray(obj) ? obj.slice() : {...obj};
  // $FlowFixMe[incompatible-use] number or string is fine here
  updated[key] = copyWithSet(obj[key], path, value, index + 1);
  return updated;
}

export function getEffectDurations(root: Object): {
  effectDuration: any | null,
  passiveEffectDuration: any | null,
} {
  // Profiling durations are only available for certain builds.
  // If available, they'll be stored on the HostRoot.
  let effectDuration = null;
  let passiveEffectDuration = null;
  const hostRoot = root.current;
  if (hostRoot != null) {
    const stateNode = hostRoot.stateNode;
    if (stateNode != null) {
      effectDuration =
        stateNode.effectDuration != null ? stateNode.effectDuration : null;
      passiveEffectDuration =
        stateNode.passiveEffectDuration != null
          ? stateNode.passiveEffectDuration
          : null;
    }
  }
  return {effectDuration, passiveEffectDuration};
}

export function serializeToString(data: any): string {
  if (data === undefined) {
    return 'undefined';
  }

  if (typeof data === 'function') {
    return data.toString();
  }

  const cache = new Set<mixed>();
  // Use a custom replacer function to protect against circular references.
  return JSON.stringify(
    data,
    (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return;
        }
        cache.add(value);
      }
      if (typeof value === 'bigint') {
        return value.toString() + 'n';
      }
      return value;
    },
    2,
  );
}

function safeToString(val: any): string {
  try {
    return String(val);
  } catch (err) {
    if (typeof val === 'object') {
      // An object with no prototype and no `[Symbol.toPrimitive]()`, `toString()`, and `valueOf()` methods would throw.
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#string_coercion
      return '[object Object]';
    }
    throw err;
  }
}

// based on https://github.com/tmpfs/format-util/blob/0e62d430efb0a1c51448709abd3e2406c14d8401/format.js#L1
// based on https://developer.mozilla.org/en-US/docs/Web/API/console#Using_string_substitutions
// Implements s, d, i and f placeholders
export function formatConsoleArgumentsToSingleString(
  maybeMessage: any,
  ...inputArgs: $ReadOnlyArray<any>
): string {
  const args = inputArgs.slice();

  let formatted: string = safeToString(maybeMessage);

  // If the first argument is a string, check for substitutions.
  if (typeof maybeMessage === 'string') {
    if (args.length) {
      const REGEXP = /(%?)(%([jdisf]))/g;

      // $FlowFixMe[incompatible-type]
      formatted = formatted.replace(REGEXP, (match, escaped, ptn, flag) => {
        let arg = args.shift();
        switch (flag) {
          case 's':
            // $FlowFixMe[unsafe-addition]
            arg += '';
            break;
          case 'd':
          case 'i':
            arg = parseInt(arg, 10).toString();
            break;
          case 'f':
            arg = parseFloat(arg).toString();
            break;
        }
        if (!escaped) {
          return arg;
        }
        args.unshift(arg);
        return match;
      });
    }
  }

  // Arguments that remain after formatting.
  if (args.length) {
    for (let i = 0; i < args.length; i++) {
      formatted += ' ' + safeToString(args[i]);
    }
  }

  // Update escaped %% values.
  formatted = formatted.replace(/%{2,2}/g, '%');

  return String(formatted);
}

export function isSynchronousXHRSupported(): boolean {
  return !!(
    window.document &&
    window.document.featurePolicy &&
    window.document.featurePolicy.allowsFeature('sync-xhr')
  );
}

export function gt(a: string = '', b: string = ''): boolean {
  return compareVersions(a, b) === 1;
}

export function gte(a: string = '', b: string = ''): boolean {
  return compareVersions(a, b) > -1;
}

export const isReactNativeEnvironment = (): boolean => {
  // We've been relying on this for such a long time
  // We should probably define the client for DevTools on the backend side and share it with the frontend
  return window.document == null;
};

// 0.123456789 => 0.123
// Expects high-resolution timestamp in milliseconds, like from performance.now()
// Mainly used for optimizing the size of serialized profiling payload
export function formatDurationToMicrosecondsGranularity(
  duration: number,
): number {
  return Math.round(duration * 1000) / 1000;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Takes a format string (first argument to console) and returns a normalized
// string that has the exact number of arguments as the args. That way it's safe
// to prepend or append to it.
export default function normalizeConsoleFormat(
  formatString: string,
  args: $ReadOnlyArray<mixed>,
  firstArg: number,
): string {
  let j = firstArg;
  let normalizedString = '';
  let last = 0;
  for (let i = 0; i < formatString.length - 1; i++) {
    if (formatString.charCodeAt(i) !== 37 /* "%" */) {
      continue;
    }
    switch (formatString.charCodeAt(++i)) {
      case 79 /* "O" */:
      case 99 /* "c" */:
      case 100 /* "d" */:
      case 102 /* "f" */:
      case 105 /* "i" */:
      case 111 /* "o" */:
      case 115 /* "s" */: {
        if (j < args.length) {
          // We have a matching argument.
          j++;
        } else {
          // We have more format specifiers than arguments.
          // So we need to escape this to print the literal.
          normalizedString += formatString.slice(last, (last = i)) + '%';
        }
      }
    }
  }
  normalizedString += formatString.slice(last, formatString.length);
  // Pad with extra format specifiers for the rest.
  while (j < args.length) {
    if (normalizedString !== '') {
      normalizedString += ' ';
    }
    // Not every environment has the same default.
    // This seems to be what Chrome DevTools defaults to.
    normalizedString += typeof args[j] === 'string' ? '%s' : '%o';
    j++;
  }
  return normalizedString;
}

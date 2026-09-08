/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Do not add / import anything to this file.
// This function could be used from multiple places, including hook.

// Formats an array of args with a style for console methods, using
// the following algorithm:
//     1. The first param is a string that contains %c
//          - Bail out and return the args without modifying the styles.
//            We don't want to affect styles that the developer deliberately set.
//     2. The first param is a string that doesn't contain %c but contains
//        string formatting
//          - [`%c${args[0]}`, style, ...args.slice(1)]
//          - Note: we assume that the string formatting that the developer uses
//            is correct.
//     3. The first param is a string that doesn't contain string formatting
//        OR is not a string
//          - Create a formatting string where:
//                 boolean, string, symbol -> %s
//                 number -> %f OR %i depending on if it's an int or float
//                 default -> %o
export default function formatWithStyles(
  inputArgs: $ReadOnlyArray<any>,
  style?: string,
): $ReadOnlyArray<any> {
  if (
    inputArgs === undefined ||
    // $FlowFixMe[invalid-compare]
    inputArgs === null ||
    inputArgs.length === 0 ||
    // Matches any of %c but not %%c
    (typeof inputArgs[0] === 'string' && inputArgs[0].match(/([^%]|^)(%c)/g)) ||
    style === undefined
  ) {
    return inputArgs;
  }

  // Matches any of %(o|O|d|i|s|f), but not %%(o|O|d|i|s|f)
  const REGEXP = /([^%]|^)((%%)*)(%([oOdisf]))/g;
  if (typeof inputArgs[0] === 'string' && inputArgs[0].match(REGEXP)) {
    return [`%c${inputArgs[0]}`, style, ...inputArgs.slice(1)];
  } else {
    const firstArg = inputArgs.reduce((formatStr, elem, i) => {
      if (i > 0) {
        formatStr += ' ';
      }
      switch (typeof elem) {
        case 'string':
        case 'boolean':
        case 'symbol':
          return (formatStr += '%s');
        case 'number':
          const formatting = Number.isInteger(elem) ? '%i' : '%f';
          return (formatStr += formatting);
        default:
          return (formatStr += '%o');
      }
    }, '%c');
    return [firstArg, style, ...inputArgs];
  }
}

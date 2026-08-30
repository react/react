/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Keep in sync with ReactServerConsoleConfig
// This flips color using ANSI, then sets a color styling, then resets.
const badgeFormat = '\x1b[0m\x1b[7m%c%s\x1b[0m%c';
// Same badge styling as DevTools.
const badgeStyle =
  // We use a fixed background if light-dark is not supported, otherwise
  // we use a transparent background.
  'background: #e6e6e6;' +
  'background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));' +
  'color: #000000;' +
  'color: light-dark(#000000, #ffffff);' +
  'border-radius: 2px';
const resetStyle = '';
const pad = ' ';

const bind = Function.prototype.bind;

export function bindToConsole(
  methodName: string,
  args: Array<any>,
  badgeName: string,
): () => any {
  let offset = 0;
  switch (methodName) {
    case 'dir':
    case 'dirxml':
    case 'groupEnd':
    case 'table': {
      // These methods cannot be colorized because they don't take a formatting string.
      // $FlowFixMe[incompatible-type]
      return bind.apply(console[methodName], [console].concat(args)); // eslint-disable-line react-internal/no-production-logging
    }
    case 'assert': {
      // assert takes formatting options as the second argument.
      offset = 1;
    }
  }

  const newArgs = args.slice(0);
  if (typeof newArgs[offset] === 'string') {
    newArgs.splice(
      offset,
      1,
      badgeFormat + ' ' + newArgs[offset],
      badgeStyle,
      pad + badgeName + pad,
      resetStyle,
    );
  } else {
    newArgs.splice(
      offset,
      0,
      badgeFormat,
      badgeStyle,
      pad + badgeName + pad,
      resetStyle,
    );
  }

  // The "this" binding in the "bind";
  newArgs.unshift(console);

  // $FlowFixMe[incompatible-type]
  // $FlowFixMe[invalid-computed-prop]
  return bind.apply(console[methodName], newArgs); // eslint-disable-line react-internal/no-production-logging
}

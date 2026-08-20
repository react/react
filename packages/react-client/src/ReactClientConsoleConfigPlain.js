/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Keep in sync with ReactServerConsoleConfig
const badgeFormat = '[%s]';
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
      pad + badgeName + pad,
    );
  } else {
    newArgs.splice(offset, 0, badgeFormat, pad + badgeName + pad);
  }

  // The "this" binding in the "bind";
  newArgs.unshift(console);

  // $FlowFixMe[incompatible-type]
  // $FlowFixMe[invalid-computed-prop]
  return bind.apply(console[methodName], newArgs); // eslint-disable-line react-internal/no-production-logging
}

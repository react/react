/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Keep in sync with ReactClientConsoleConfig
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
const padLength = 1;

// This mutates the args to remove any badges that was added by a FlightClient and
// returns the name in the badge. This is used when a FlightClient replays inside
// a FlightServer and we capture those replays.
export function unbadgeConsole(
  methodName: string,
  args: Array<any>,
): null | string {
  let offset = 0;
  switch (methodName) {
    case 'dir':
    case 'dirxml':
    case 'groupEnd':
    case 'table': {
      // These methods cannot be colorized because they don't take a formatting string.
      // So we wouldn't have added any badge in the first place.
      // $FlowFixMe[incompatible-type]
      return null;
    }
    case 'assert': {
      // assert takes formatting options as the second argument.
      offset = 1;
    }
  }
  const format = args[offset];
  const style = args[offset + 1];
  const badge = args[offset + 2];
  if (
    typeof format === 'string' &&
    format.startsWith(badgeFormat) &&
    style === badgeStyle &&
    typeof badge === 'string'
  ) {
    // Remove our badging from the arguments.
    let unbadgedFormat = format.slice(badgeFormat.length);
    if (unbadgedFormat[0] === ' ') {
      // Spacing added on the Client if the original argument was a string.
      unbadgedFormat = unbadgedFormat.slice(1);
    }
    args.splice(offset, 4, unbadgedFormat);
    return badge.slice(padLength, badge.length - padLength);
  }
  return null;
}

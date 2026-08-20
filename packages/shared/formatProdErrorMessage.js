/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Do not require this module directly! Use normal `invariant` calls with
// template literal strings. The messages will be replaced with error codes
// during build.

function formatProdErrorMessage(code) {
  let url = 'https://react.dev/errors/' + code;
  if (arguments.length > 1) {
    url += '?args[]=' + encodeURIComponent(arguments[1]);
    for (let i = 2; i < arguments.length; i++) {
      url += '&args[]=' + encodeURIComponent(arguments[i]);
    }
  }

  return (
    `Minified React error #${code}; visit ${url} for the full message or ` +
    'use the non-minified dev environment for full errors and additional ' +
    'helpful warnings.'
  );
}

export default formatProdErrorMessage;

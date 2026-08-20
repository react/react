/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// `test` is part of Jest's serializer API
export function test(maybeDehydratedValue) {
  const {meta} = require('react-devtools-shared/src/hydration');

  const hasOwnProperty =
    Object.prototype.hasOwnProperty.bind(maybeDehydratedValue);
  return (
    maybeDehydratedValue !== null &&
    typeof maybeDehydratedValue === 'object' &&
    hasOwnProperty(meta.inspectable) &&
    maybeDehydratedValue[meta.inspected] !== true
  );
}

// print() is part of Jest's serializer API
export function print(dehydratedValue, serialize, indent) {
  const {meta} = require('react-devtools-shared/src/hydration');
  const indentation = Math.max(indent('.').indexOf('.') - 2, 0);
  const paddingLeft = ' '.repeat(indentation);
  return (
    'Dehydrated {\n' +
    paddingLeft +
    '  "preview_short": ' +
    dehydratedValue[meta.preview_short] +
    ',\n' +
    paddingLeft +
    '  "preview_long": ' +
    dehydratedValue[meta.preview_long] +
    ',\n' +
    paddingLeft +
    '}'
  );
}

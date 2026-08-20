/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  plugins: [
    ['@babel/plugin-transform-private-property-in-object', {loose: true}],
    ['@babel/plugin-transform-class-properties', {loose: true}],
  ],
};

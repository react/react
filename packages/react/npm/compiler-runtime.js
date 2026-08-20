/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-compiler-runtime.production.js');
} else {
  module.exports = require('./cjs/react-compiler-runtime.development.js');
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const makeE2EConfig = require('../jest/makeE2EConfig');

module.exports = makeE2EConfig('e2e no forget', false);

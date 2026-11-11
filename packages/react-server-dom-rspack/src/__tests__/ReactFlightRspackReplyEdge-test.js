/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

const {
  describeRspackReplySecurityTests,
} = require('./utils/RspackReplySecurityTests');

describeRspackReplySecurityTests(
  () => require('react-server-dom-rspack/server.edge'),
  () => require('react-server-dom-rspack/client.edge'),
);

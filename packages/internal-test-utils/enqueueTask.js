/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const {MessageChannel} = require('node:worker_threads');

export default function enqueueTask(task: () => void): void {
  const channel = new MessageChannel();
  // $FlowFixMe[prop-missing]
  channel.port1.onmessage = () => {
    channel.port1.close();
    task();
  };
  channel.port2.postMessage(undefined);
}

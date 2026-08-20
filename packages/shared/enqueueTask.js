/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

let didWarnAboutMessageChannel = false;
let enqueueTaskImpl = null;

export default function enqueueTask(task: () => void): void {
  if (enqueueTaskImpl === null) {
    try {
      // read require off the module object to get around the bundlers.
      // we don't want them to detect a require and bundle a Node polyfill.
      const requireString = ('require' + Math.random()).slice(0, 7);
      // $FlowFixMe[invalid-computed-prop]
      const nodeRequire = module && module[requireString];
      // assuming we're in node, let's try to get node's
      // version of setImmediate, bypassing fake timers if any.
      enqueueTaskImpl = nodeRequire.call(module, 'timers').setImmediate;
    } catch (_err) {
      // we're in a browser
      // we can't use regular timers because they may still be faked
      // so we try MessageChannel+postMessage instead
      enqueueTaskImpl = function (callback: () => void) {
        if (__DEV__) {
          if (didWarnAboutMessageChannel === false) {
            didWarnAboutMessageChannel = true;
            if (typeof MessageChannel === 'undefined') {
              console.error(
                'This browser does not have a MessageChannel implementation, ' +
                  'so enqueuing tasks via await act(async () => ...) will fail. ' +
                  'Please file an issue at https://github.com/facebook/react/issues ' +
                  'if you encounter this warning.',
              );
            }
          }
        }
        const channel = new MessageChannel();
        channel.port1.onmessage = callback;
        channel.port2.postMessage(undefined);
      };
    }
  }
  return enqueueTaskImpl(task);
}

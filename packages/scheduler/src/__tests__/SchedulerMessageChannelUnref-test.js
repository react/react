/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

// Regression test for https://github.com/facebook/react/issues/26608
// When Scheduler falls through to the MessageChannel path (no setImmediate),
// the ports should be unref'd so they don't keep Node/Jest alive.
describe('SchedulerMessageChannelUnref', () => {
  afterEach(() => {
    jest.resetModules();
    delete global.MessageChannel;
  });

  it('calls unref on MessageChannel ports when available', () => {
    // Remove setImmediate to force the MessageChannel branch.
    const originalSetImmediate = global.setImmediate;
    delete global.setImmediate;

    const port1UnrefMock = jest.fn();
    const port2UnrefMock = jest.fn();

    const port1 = {unref: port1UnrefMock};
    const port2 = {
      postMessage: jest.fn(),
      unref: port2UnrefMock,
    };

    global.MessageChannel = function MessageChannel() {
      this.port1 = port1;
      this.port2 = port2;
    };

    jest.resetModules();
    jest.unmock('scheduler');
    require('scheduler');

    expect(port1UnrefMock).toHaveBeenCalledTimes(1);
    expect(port2UnrefMock).toHaveBeenCalledTimes(1);

    // Restore setImmediate.
    global.setImmediate = originalSetImmediate;
  });

  it('does not throw when unref is not available', () => {
    const originalSetImmediate = global.setImmediate;
    delete global.setImmediate;

    const port1 = {};
    const port2 = {
      postMessage: jest.fn(),
    };

    global.MessageChannel = function MessageChannel() {
      this.port1 = port1;
      this.port2 = port2;
    };

    jest.resetModules();
    jest.unmock('scheduler');

    expect(() => {
      require('scheduler');
    }).not.toThrow();

    global.setImmediate = originalSetImmediate;
  });
});

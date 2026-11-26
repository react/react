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

let logComponentAborted;
let logComponentErrored;

describe('ReactFlightPerformanceTrack', () => {
  beforeEach(() => {
    console.timeStamp = jest.fn();
    jest.spyOn(performance, 'measure');
    jest.spyOn(performance, 'clearMeasures');

    jest.resetModules();
    ({
      logComponentAborted,
      logComponentErrored,
    } = require('../ReactFlightPerformanceTrack'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const componentInfo = {
    name: 'Component',
    env: 'Server',
  };

  it('does not measure an aborted component before its end time is initialized', () => {
    logComponentAborted(componentInfo, 0, 0, 0, -Infinity, 'Server');

    expect(performance.measure).not.toHaveBeenCalled();
    expect(performance.clearMeasures).not.toHaveBeenCalled();
    expect(console.timeStamp).not.toHaveBeenCalled();
  });

  it('does not measure an errored component before its end time is initialized', () => {
    logComponentErrored(
      componentInfo,
      0,
      0,
      0,
      -Infinity,
      'Server',
      new Error('boom'),
    );

    expect(performance.measure).not.toHaveBeenCalled();
    expect(performance.clearMeasures).not.toHaveBeenCalled();
    expect(console.timeStamp).not.toHaveBeenCalled();
  });
});

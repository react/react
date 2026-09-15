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

describe('ReactFlightPerformanceTrack', () => {
  let performanceMeasureCalls;
  let logComponentAborted;
  let logComponentErrored;

  beforeEach(() => {
    performanceMeasureCalls = [];
    jest
      .spyOn(performance, 'measure')
      .mockImplementation((measureName, reusableOptions) => {
        performanceMeasureCalls.push([
          measureName,
          {
            ...reusableOptions,
          },
        ]);
      });
    jest.spyOn(performance, 'clearMeasures').mockImplementation(() => {});
    console.timeStamp = () => {};
    jest.spyOn(console, 'timeStamp').mockImplementation(() => {});

    jest.resetModules();

    const ReactFlightPerformanceTrack = require('../ReactFlightPerformanceTrack');
    logComponentAborted = ReactFlightPerformanceTrack.logComponentAborted;
    logComponentErrored = ReactFlightPerformanceTrack.logComponentErrored;
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('does not measure aborted or errored components when childrenEndTime is negative', () => {
    const componentInfo = {
      name: 'AuthenticatedAdminShell',
      env: 'Server',
      key: null,
      props: null,
    };

    // When childrenEndTime is -Infinity or negative, performance.measure should not be called
    logComponentAborted(
      componentInfo,
      0, // trackIdx
      0, // startTime
      10, // endTime
      -Infinity, // childrenEndTime
      'Server',
    );
    expect(performanceMeasureCalls).toEqual([]);

    logComponentAborted(
      componentInfo,
      0, // trackIdx
      0, // startTime
      10, // endTime
      -1, // childrenEndTime
      'Server',
    );
    expect(performanceMeasureCalls).toEqual([]);

    logComponentErrored(
      componentInfo,
      0, // trackIdx
      0, // startTime
      10, // endTime
      -Infinity, // childrenEndTime
      'Server',
      new Error('Redirect or render error'),
    );
    expect(performanceMeasureCalls).toEqual([]);

    logComponentErrored(
      componentInfo,
      0, // trackIdx
      0, // startTime
      10, // endTime
      -5, // childrenEndTime
      'Server',
      new Error('Redirect or render error'),
    );
    expect(performanceMeasureCalls).toEqual([]);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('measures aborted and errored components when childrenEndTime is non-negative and trackIdx < 10', () => {
    const componentInfo = {
      name: 'AuthenticatedAdminShell',
      env: 'Server',
      key: null,
      props: null,
    };

    logComponentAborted(
      componentInfo,
      0, // trackIdx
      0, // startTime
      10, // endTime
      10, // childrenEndTime
      'Server',
    );
    expect(performanceMeasureCalls.length).toBe(1);
    expect(performanceMeasureCalls[0][0]).toBe('\u200bAuthenticatedAdminShell');
    expect(performanceMeasureCalls[0][1].start).toBe(0);
    expect(performanceMeasureCalls[0][1].end).toBe(10);
    expect(performanceMeasureCalls[0][1].detail.devtools.color).toBe('warning');

    performanceMeasureCalls.length = 0;

    logComponentErrored(
      componentInfo,
      0, // trackIdx
      0, // startTime
      10, // endTime
      10, // childrenEndTime
      'Server',
      new Error('Something failed'),
    );
    expect(performanceMeasureCalls.length).toBe(1);
    expect(performanceMeasureCalls[0][0]).toBe('\u200bAuthenticatedAdminShell');
    expect(performanceMeasureCalls[0][1].start).toBe(0);
    expect(performanceMeasureCalls[0][1].end).toBe(10);
    expect(performanceMeasureCalls[0][1].detail.devtools.color).toBe('error');
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('does not measure when trackIdx >= 10', () => {
    const componentInfo = {
      name: 'DeeplyNestedComponent',
      env: 'Server',
      key: null,
      props: null,
    };

    logComponentAborted(
      componentInfo,
      10, // trackIdx >= 10
      0,
      10,
      10,
      'Server',
    );
    expect(performanceMeasureCalls).toEqual([]);

    logComponentErrored(
      componentInfo,
      10, // trackIdx >= 10
      0,
      10,
      10,
      'Server',
      new Error('Failed'),
    );
    expect(performanceMeasureCalls).toEqual([]);
  });
});

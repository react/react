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

describe('Flight performance metadata', () => {
  let tracks;
  let measure;
  let originalTimeStamp;

  beforeEach(() => {
    jest.resetModules();
    measure = jest.spyOn(performance, 'measure').mockImplementation(() => {});
    originalTimeStamp = console.timeStamp;
    console.timeStamp = jest.fn();
    tracks = require('../ReactFlightPerformanceTrack');
  });

  afterEach(() => {
    measure.mockRestore();
    console.timeStamp = originalTimeStamp;
  });

  function logAll(id) {
    const debugTask = {run: callback => callback()};
    const component = {name: 'Child', env: 'Cache', debugTask};
    const page = {name: 'Page', env: 'Server'};
    const asyncInfo = {awaited: {name: 'fetch', debugTask}, env: 'Server'};
    const error = Error('x');
    tracks.logComponentRender(component, 0, 1, 2, 3, 'Server', id);
    tracks.logComponentAborted(page, 0, 1, 2, 3, 'Server', id);
    tracks.logComponentErrored(page, 0, 1, 2, 3, 'Server', error, id);
    tracks.logComponentAwait(asyncInfo, 0, 1, 3, 'Server', undefined, id);
    tracks.logComponentAwaitAborted(asyncInfo, 0, 1, 3, 'Server', id);
    tracks.logComponentAwaitErrored(asyncInfo, 0, 1, 3, 'Server', error, id);
  }

  // @gate __DEV__ && enableProfilerTimer
  it('tags measures with kind, outcome, environment and performanceId', () => {
    logAll('request');
    expect(measure.mock.calls.map(([, {detail}]) => detail.react)).toEqual(
      [
        ['component', 'completed', 'Cache'],
        ['component', 'aborted', 'Server'],
        ['component', 'errored', 'Server'],
        ['await', 'completed', 'Server'],
        ['await', 'aborted', 'Server'],
        ['await', 'errored', 'Server'],
      ].map(([kind, outcome, environment]) => ({
        version: 1,
        performanceId: 'request',
        kind,
        outcome,
        environment,
      })),
    );
  });

  // @gate __DEV__ && enableProfilerTimer
  it('omits performanceId when not provided', () => {
    logAll(undefined);
    expect(measure).toHaveBeenCalledTimes(6);
    measure.mock.calls.forEach(([, {detail}]) => {
      expect(detail.react.version).toBe(1);
      expect(detail.react.performanceId).toBeUndefined();
    });
  });
});

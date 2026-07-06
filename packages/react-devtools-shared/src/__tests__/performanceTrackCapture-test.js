/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import {createPerformanceTrackCapture} from 'react-devtools-shared/src/backend/performanceTrackCapture';

const COMPONENTS = 'Components ⚛';
const SCHEDULER = 'Scheduler ⚛';

function makeFakeConsole() {
  const calls = [];
  return {
    calls,
    console: {
      timeStamp(...args: Array<mixed>) {
        calls.push(args);
      },
    },
  };
}

describe('performanceTrackCapture', () => {
  it('records React track spans rebased to the profiling clock', () => {
    const {console: fakeConsole, calls} = makeFakeConsole();
    const capture = createPerformanceTrackCapture({getTimeOffset: () => 100});
    capture.start(fakeConsole);

    fakeConsole.timeStamp(
      'Render',
      150,
      170,
      'Blocking',
      SCHEDULER,
      'primary-dark',
    );
    fakeConsole.timeStamp('App', 155, 160, COMPONENTS, undefined, 'primary');

    expect(capture.getSpans()).toEqual([
      {
        name: 'Render',
        start: 50,
        end: 70,
        track: 'Blocking',
        trackGroup: SCHEDULER,
        color: 'primary-dark',
      },
      {
        name: 'App',
        start: 55,
        end: 60,
        track: COMPONENTS,
        trackGroup: null,
        color: 'primary',
      },
    ]);
    // Pass-through: the original console.timeStamp still received both.
    expect(calls).toHaveLength(2);
  });

  it('ignores non-React tracks and plain timeStamp marks', () => {
    const {console: fakeConsole, calls} = makeFakeConsole();
    const capture = createPerformanceTrackCapture({getTimeOffset: () => 0});
    capture.start(fakeConsole);

    fakeConsole.timeStamp('app-mark'); // plain mark
    fakeConsole.timeStamp('custom', 1, 2, 'My Track', 'My Group', 'primary');
    fakeConsole.timeStamp('bad-times', 'x', 'y', 'Blocking', SCHEDULER);

    expect(capture.getSpans()).toEqual([]);
    expect(calls).toHaveLength(3); // all passed through untouched
  });

  it('drops component spans at the cap but keeps scheduler spans', () => {
    const {console: fakeConsole} = makeFakeConsole();
    const capture = createPerformanceTrackCapture({getTimeOffset: () => 0});
    capture.start(fakeConsole);

    for (let i = 0; i < 2600; i++) {
      fakeConsole.timeStamp(`C${i}`, i, i + 1, COMPONENTS, undefined, 'p');
    }
    fakeConsole.timeStamp('Commit', 9000, 9001, 'Blocking', SCHEDULER, 's');

    const spans = capture.getSpans();
    expect(spans).toHaveLength(2501);
    expect(capture.getDroppedCount()).toBe(100);
    expect(spans[spans.length - 1].name).toBe('Commit');
  });

  it('stops capturing and restores the original on stop', () => {
    const {console: fakeConsole, calls} = makeFakeConsole();
    const original = fakeConsole.timeStamp;
    const capture = createPerformanceTrackCapture({getTimeOffset: () => 0});

    capture.start(fakeConsole);
    expect(fakeConsole.timeStamp).not.toBe(original);
    capture.stop();
    expect(fakeConsole.timeStamp).toBe(original);

    fakeConsole.timeStamp('Render', 1, 2, 'Blocking', SCHEDULER);
    expect(capture.getSpans()).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('resets buffers on restart', () => {
    const {console: fakeConsole} = makeFakeConsole();
    const capture = createPerformanceTrackCapture({getTimeOffset: () => 0});

    capture.start(fakeConsole);
    fakeConsole.timeStamp('Render', 1, 2, 'Blocking', SCHEDULER);
    capture.stop();
    expect(capture.getSpans()).toHaveLength(1);

    capture.start(fakeConsole);
    expect(capture.getSpans()).toEqual([]);
    fakeConsole.timeStamp('Commit', 3, 4, 'Blocking', SCHEDULER);
    expect(capture.getSpans()).toHaveLength(1);
    capture.stop();
  });

  it('leaves a stacked wrapper intact but stops its own capture', () => {
    const {console: fakeConsole} = makeFakeConsole();
    const capture = createPerformanceTrackCapture({getTimeOffset: () => 0});
    capture.start(fakeConsole);

    // Someone else patches on top of our wrapper.
    const ourWrapper = fakeConsole.timeStamp;
    const stackedCalls = [];
    fakeConsole.timeStamp = function (...args: Array<mixed>) {
      stackedCalls.push(args);
      return ourWrapper.apply(this, args);
    };
    const stacked = fakeConsole.timeStamp;

    capture.stop();
    // We must NOT clobber the stacked patch by "restoring" underneath it.
    expect(fakeConsole.timeStamp).toBe(stacked);

    // Our inert wrapper still passes through but records nothing.
    fakeConsole.timeStamp('Render', 1, 2, 'Blocking', SCHEDULER);
    expect(stackedCalls).toHaveLength(1);
    expect(capture.getSpans()).toEqual([]);

    // Restarting reuses the still-installed wrapper and captures again.
    capture.start(fakeConsole);
    fakeConsole.timeStamp('Commit', 5, 6, 'Blocking', SCHEDULER);
    expect(capture.getSpans()).toHaveLength(1);
    capture.stop();
  });

  it('handles environments without console.timeStamp', () => {
    const capture = createPerformanceTrackCapture({getTimeOffset: () => 0});
    expect(() => {
      capture.start(({}: any));
      capture.stop();
    }).not.toThrow();
    expect(capture.getSpans()).toEqual([]);
  });

  it('never lets a capture failure break the page logging', () => {
    const {console: fakeConsole, calls} = makeFakeConsole();
    const capture = createPerformanceTrackCapture({
      getTimeOffset: () => {
        throw new Error('offset exploded');
      },
    });
    capture.start(fakeConsole);
    expect(() =>
      fakeConsole.timeStamp('Render', 1, 2, 'Blocking', SCHEDULER),
    ).not.toThrow();
    expect(calls).toHaveLength(1);
    capture.stop();
  });
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import {createProfilerTools} from 'react-devtools-shared/src/devtools/aiChat/profilerTools';

const SCHEDULER = 'Scheduler ⚛';
const COMPONENTS = 'Components ⚛';
const ROOT_ID = 1;

function span(
  name: string,
  start: number,
  end: number,
  track: string,
  trackGroup: string | null = null,
) {
  return {name, start, end, track, trackGroup, color: null};
}

// The perf-track tools only read profilingData + rootID; the live-inspection
// dependencies (stores, bridge) can be stubbed out.
function makeProfilingData(
  performanceTrackSpans: Array<Object>,
  droppedPerformanceTrackSpans: number = 0,
) {
  return ({
    dataForRoots: new Map([
      [
        ROOT_ID,
        {
          commitData: [
            {timestamp: 100, duration: 5},
            {timestamp: 1100, duration: 120},
          ],
          displayName: 'App',
        },
      ],
    ]),
    timelineData: [],
    userInputEvents: [],
    performanceTrackSpans,
    droppedPerformanceTrackSpans,
    imported: false,
  }: any);
}

function makeTools(spans: Array<Object>, dropped: number = 0) {
  const tools = createProfilerTools(
    makeProfilingData(spans, dropped),
    ROOT_ID,
    (null: any),
    (null: any),
    (null: any),
    null,
  );
  const byName: {[string]: any} = {};
  tools.forEach(tool => {
    byName[tool.name] = tool;
  });
  return byName;
}

describe('AI chat performance track tools', () => {
  it('does not register track tools when no spans were captured', () => {
    const tools = makeTools([]);
    expect(tools.get_scheduler_phases).toBeUndefined();
    expect(tools.get_cascading_updates).toBeUndefined();
    expect(tools.get_component_track_spans).toBeUndefined();
    // Baseline tools are unaffected.
    expect(tools.get_commits).toBeDefined();
  });

  it('registers track tools when spans exist', () => {
    const tools = makeTools([
      span('Render', 1000, 1090, 'Blocking', SCHEDULER),
    ]);
    expect(tools.get_scheduler_phases).toBeDefined();
    expect(tools.get_cascading_updates).toBeDefined();
    expect(tools.get_component_track_spans).toBeDefined();
  });

  it('get_scheduler_phases returns lane phase rows around a commit', async () => {
    const tools = makeTools([
      span('Event: click', 1000, 1002, 'Blocking', SCHEDULER),
      span('Update', 1002, 1010, 'Blocking', SCHEDULER),
      span('Render', 1010, 1090, 'Blocking', SCHEDULER),
      // Outside the commit-2 window (commit t=1100, window 100..1600):
      span('Render', 5000, 5050, 'Transition', SCHEDULER),
      // Component spans must not leak into scheduler output:
      span('App', 1010, 1080, COMPONENTS),
    ]);
    const result = await tools.get_scheduler_phases.execute({
      commit_number: 2,
    });
    expect(result).toContain('Blocking;Event: click;1000;1002;2');
    expect(result).toContain('Blocking;Render;1010;1090;80');
    expect(result).not.toContain('Transition');
    expect(result).not.toContain('App');
  });

  it('get_scheduler_phases supports explicit windows and empty results', async () => {
    const tools = makeTools([
      span('Render', 1010, 1090, 'Blocking', SCHEDULER),
    ]);
    const hit = await tools.get_scheduler_phases.execute({
      start_ms: 1000,
      end_ms: 1200,
    });
    expect(hit).toContain('Blocking;Render');
    const miss = await tools.get_scheduler_phases.execute({
      start_ms: 2000,
      end_ms: 3000,
    });
    expect(miss).toContain('No scheduler phase spans');
  });

  it('get_cascading_updates cross-references the next commit', async () => {
    const tools = makeTools([
      span('Cascading Update', 150, 160, 'Blocking', SCHEDULER),
      span('Render', 1010, 1090, 'Blocking', SCHEDULER),
    ]);
    const result = await tools.get_cascading_updates.execute({});
    // Cascading at t=150 -> next commit at t=1100 is commit number 2.
    expect(result).toContain('1 cascading update(s)');
    expect(result).toContain('Blocking;Cascading Update;150;160;10;2');
  });

  it('get_cascading_updates reports a clean session', async () => {
    const tools = makeTools([
      span('Render', 1010, 1090, 'Blocking', SCHEDULER),
    ]);
    const result = await tools.get_cascading_updates.execute({});
    expect(result).toContain('No cascading updates');
  });

  it('get_component_track_spans filters by name and strips the props-diff prefix', async () => {
    const tools = makeTools(
      [
        // Zero-width-space prefix marks DEV entries carrying a props diff.
        span('​TodoList', 1010, 1080, COMPONENTS),
        span('Header', 1010, 1015, COMPONENTS),
        span('Render', 1010, 1090, 'Blocking', SCHEDULER),
      ],
      7,
    );
    const result = await tools.get_component_track_spans.execute({
      component_name: 'todolist',
    });
    expect(result).toContain('Components ⚛;TodoList;1010;1080;70');
    expect(result).not.toContain('Header');
    expect(result).not.toContain('Blocking');
    // Capture-time drops are surfaced, never silent.
    expect(result).toContain('7 component spans were dropped');
  });
});

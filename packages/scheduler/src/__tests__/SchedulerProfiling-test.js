/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-for-of-loops/no-for-of-loops */

'use strict';

let Scheduler;
// let runWithPriority;
let ImmediatePriority;
let UserBlockingPriority;
let NormalPriority;
let LowPriority;
let IdlePriority;
let scheduleCallback;
let cancelCallback;
// let wrapCallback;
// let getCurrentPriorityLevel;
// let shouldYield;
let waitForAll;
let waitFor;
let waitForThrow;

function priorityLevelToString(priorityLevel) {
  switch (priorityLevel) {
    case ImmediatePriority:
      return 'Immediate';
    case UserBlockingPriority:
      return 'User-blocking';
    case NormalPriority:
      return 'Normal';
    case LowPriority:
      return 'Low';
    case IdlePriority:
      return 'Idle';
    default:
      return null;
  }
}

describe('Scheduler', () => {
  const {enableProfiling} = require('scheduler/src/SchedulerFeatureFlags');
  if (!enableProfiling) {
    // The tests in this suite only apply when profiling is on
    it('profiling APIs are not available', () => {
      Scheduler = require('scheduler');
      expect(Scheduler.unstable_Profiling).toBe(null);
    });
    return;
  }

  beforeEach(() => {
    jest.resetModules();
    jest.mock('scheduler', () => require('scheduler/unstable_mock'));
    Scheduler = require('scheduler');

    // runWithPriority = Scheduler.unstable_runWithPriority;
    ImmediatePriority = Scheduler.unstable_ImmediatePriority;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
    NormalPriority = Scheduler.unstable_NormalPriority;
    LowPriority = Scheduler.unstable_LowPriority;
    IdlePriority = Scheduler.unstable_IdlePriority;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    cancelCallback = Scheduler.unstable_cancelCallback;
    // wrapCallback = Scheduler.unstable_wrapCallback;
    // getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel;
    // shouldYield = Scheduler.unstable_shouldYield;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForThrow = InternalTestUtils.waitForThrow;
  });

  const TaskStartEvent = 1;
  const TaskCompleteEvent = 2;
  const TaskErrorEvent = 3;
  const TaskCancelEvent = 4;
  const TaskRunEvent = 5;
  const TaskYieldEvent = 6;
  const SchedulerSuspendEvent = 7;
  const SchedulerResumeEvent = 8;

  function stopProfilingAndPrintFlamegraph() {
    const eventBuffer =
      Scheduler.unstable_Profiling.stopLoggingProfilingEvents();
    if (eventBuffer === null) {
      return '(empty profile)';
    }

    const eventLog = new Int32Array(eventBuffer);

    const tasks = new Map();
    const mainThreadRuns = [];

    let isSuspended = true;
    let i = 0;
    processLog: while (i < eventLog.length) {
      const instruction = eventLog[i];
      const time = eventLog[i + 1];
      switch (instruction) {
        case 0: {
          break processLog;
        }
        case TaskStartEvent: {
          const taskId = eventLog[i + 2];
          const priorityLevel = eventLog[i + 3];
          const task = {
            id: taskId,
            priorityLevel,
            label: null,
            start: time,
            end: -1,
            exitStatus: null,
            runs: [],
          };
          tasks.set(taskId, task);
          i += 4;
          break;
        }
        case TaskCompleteEvent: {
          if (isSuspended) {
            throw Error('Task cannot Complete outside the work loop.');
          }
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.end = time;
          task.exitStatus = 'completed';
          i += 3;
          break;
        }
        case TaskErrorEvent: {
          if (isSuspended) {
            throw Error('Task cannot Error outside the work loop.');
          }
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.end = time;
          task.exitStatus = 'errored';
          i += 3;
          break;
        }
        case TaskCancelEvent: {
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.end = time;
          task.exitStatus = 'canceled';
          i += 3;
          break;
        }
        case TaskRunEvent:
        case TaskYieldEvent: {
          if (isSuspended) {
            throw Error('Task cannot Run or Yield outside the work loop.');
          }
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.runs.push(time);
          i += 4;
          break;
        }
        case SchedulerSuspendEvent: {
          if (isSuspended) {
            throw Error('Scheduler cannot Suspend outside the work loop.');
          }
          isSuspended = true;
          mainThreadRuns.push(time);
          i += 3;
          break;
        }
        case SchedulerResumeEvent: {
          if (!isSuspended) {
            throw Error('Scheduler cannot Resume inside the work loop.');
          }
          isSuspended = false;
          mainThreadRuns.push(time);
          i += 3;
          break;
        }
        default: {
          throw Error('Unknown instruction type: ' + instruction);
        }
      }
    }

    // Now we can render the tasks as a flamegraph.
    const labelColumnWidth = 30;
    // Scheduler event times are in microseconds
    const microsecondsPerChar = 50000;

    let result = '';

    const mainThreadLabelColumn = '!!! Main thread              ';
    let mainThreadTimelineColumn = '';
    let isMainThreadBusy = true;
    for (const time of mainThreadRuns) {
      const index = time / microsecondsPerChar;
      mainThreadTimelineColumn += (isMainThreadBusy ? '█' : '░').repeat(
        index - mainThreadTimelineColumn.length,
      );
      isMainThreadBusy = !isMainThreadBusy;
    }
    result += `${mainThreadLabelColumn}│${mainThreadTimelineColumn}\n`;

    const tasksByPriority = Array.from(tasks.values()).sort(
      (t1, t2) => t1.priorityLevel - t2.priorityLevel,
    );

    for (const task of tasksByPriority) {
      let label = task.label;
      if (label === undefined) {
        label = 'Task';
      }
      let labelColumn = `Task ${task.id} [${priorityLevelToString(
        task.priorityLevel,
      )}]`;
      labelColumn += ' '.repeat(labelColumnWidth - labelColumn.length - 1);

      // Add empty space up until the start mark
      let timelineColumn = ' '.repeat(task.start / microsecondsPerChar);

      let isRunning = false;
      for (const time of task.runs) {
        const index = time / microsecondsPerChar;
        timelineColumn += (isRunning ? '█' : '░').repeat(
          index - timelineColumn.length,
        );
        isRunning = !isRunning;
      }

      const endIndex = task.end / microsecondsPerChar;
      timelineColumn += (isRunning ? '█' : '░').repeat(
        endIndex - timelineColumn.length,
      );

      if (task.exitStatus !== 'completed') {
        timelineColumn += `🡐 ${task.exitStatus}`;
      }

      result += `${labelColumn}│${timelineColumn}\n`;
    }

    return '\n' + result;
  }

  it('creates a basic flamegraph', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    Scheduler.unstable_advanceTime(100);
    scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.unstable_advanceTime(300);
        Scheduler.log('Yield 1');
        scheduleCallback(
          UserBlockingPriority,
          () => {
            Scheduler.log('Yield 2');
            Scheduler.unstable_advanceTime(300);
          },
          {label: 'Bar'},
        );
        Scheduler.unstable_advanceTime(100);
        Scheduler.log('Yield 3');
        return () => {
          Scheduler.log('Yield 4');
          Scheduler.unstable_advanceTime(300);
        };
      },
      {label: 'Foo'},
    );
    await waitFor(['Yield 1', 'Yield 3']);
    Scheduler.unstable_advanceTime(100);
    await waitForAll(['Yield 2', 'Yield 4']);

    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │██░░░░░░░░██░░░░░░░░░░░░
Task 2 [User-blocking]       │        ░░░░██████
Task 1 [Normal]              │  ████████░░░░░░░░██████
`,
    );
  });

  it('marks when a task is canceled', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    const task = scheduleCallback(NormalPriority, () => {
      Scheduler.log('Yield 1');
      Scheduler.unstable_advanceTime(300);
      Scheduler.log('Yield 2');
      return () => {
        Scheduler.log('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });

    await waitFor(['Yield 1', 'Yield 2']);
    Scheduler.unstable_advanceTime(100);

    cancelCallback(task);

    Scheduler.unstable_advanceTime(1000);
    await waitForAll([]);
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░██████████████████████
Task 1 [Normal]              │██████░░🡐 canceled
`,
    );
  });

  it('marks when a task errors', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    scheduleCallback(NormalPriority, () => {
      Scheduler.unstable_advanceTime(300);
      throw Error('Oops');
    });

    await waitForThrow('Oops');
    Scheduler.unstable_advanceTime(100);

    Scheduler.unstable_advanceTime(1000);
    await waitForAll([]);
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░██████████████████████
Task 1 [Normal]              │██████🡐 errored
`,
    );
  });

  it('marks when multiple tasks are canceled', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    const task1 = scheduleCallback(NormalPriority, () => {
      Scheduler.log('Yield 1');
      Scheduler.unstable_advanceTime(300);
      Scheduler.log('Yield 2');
      return () => {
        Scheduler.log('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });
    const task2 = scheduleCallback(NormalPriority, () => {
      Scheduler.log('Yield 3');
      Scheduler.unstable_advanceTime(300);
      Scheduler.log('Yield 4');
      return () => {
        Scheduler.log('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });

    await waitFor(['Yield 1', 'Yield 2']);
    Scheduler.unstable_advanceTime(100);

    cancelCallback(task1);
    cancelCallback(task2);

    // Advance more time. This should not affect the size of the main
    // thread row, since the Scheduler queue is empty.
    Scheduler.unstable_advanceTime(1000);
    await waitForAll([]);

    // The main thread row should end when the callback is cancelled.
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░██████████████████████
Task 1 [Normal]              │██████░░🡐 canceled
Task 2 [Normal]              │░░░░░░░░🡐 canceled
`,
    );
  });

  it('handles cancelling a task that already finished', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    const task = scheduleCallback(NormalPriority, () => {
      Scheduler.log('A');
      Scheduler.unstable_advanceTime(1000);
    });
    await waitForAll(['A']);
    cancelCallback(task);
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░░░░░░░░░░░░░░░
Task 1 [Normal]              │████████████████████
`,
    );
  });

  it('handles cancelling a task multiple times', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.log('A');
        Scheduler.unstable_advanceTime(1000);
      },
      {label: 'A'},
    );
    Scheduler.unstable_advanceTime(200);
    const task = scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.log('B');
        Scheduler.unstable_advanceTime(1000);
      },
      {label: 'B'},
    );
    Scheduler.unstable_advanceTime(400);
    cancelCallback(task);
    cancelCallback(task);
    cancelCallback(task);
    await waitForAll(['A']);
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │████████████░░░░░░░░░░░░░░░░░░░░
Task 1 [Normal]              │░░░░░░░░░░░░████████████████████
Task 2 [Normal]              │    ░░░░░░░░🡐 canceled
`,
    );
  });

  it('handles delayed tasks', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.unstable_advanceTime(1000);
        Scheduler.log('A');
      },
      {
        delay: 1000,
      },
    );
    await waitForAll([]);

    Scheduler.unstable_advanceTime(1000);

    await waitForAll(['A']);

    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │████████████████████░░░░░░░░░░░░░░░░░░░░
Task 1 [Normal]              │                    ████████████████████
`,
    );
  });

  it('handles cancelling a delayed task', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    const task = scheduleCallback(NormalPriority, () => Scheduler.log('A'), {
      delay: 1000,
    });
    cancelCallback(task);
    await waitForAll([]);
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │
`,
    );
  });

  it('automatically stops profiling and warns if event log gets too big', async () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    spyOnDevAndProd(console, 'error').mockImplementation(() => {});

    // Increase infinite loop guard limit
    const originalMaxIterations = global.__MAX_ITERATIONS__;
    global.__MAX_ITERATIONS__ = 120000;

    let taskId = 1;
    while (console.error.mock.calls.length === 0) {
      taskId++;
      const task = scheduleCallback(NormalPriority, () => {});
      cancelCallback(task);
      Scheduler.unstable_flushAll();
    }

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toBe(
      "Scheduler Profiling: Event log exceeded maximum size. Don't forget " +
        'to call `stopLoggingProfilingEvents()`.',
    );

    // Should automatically clear profile
    expect(stopProfilingAndPrintFlamegraph()).toEqual('(empty profile)');

    // Test that we can start a new profile later
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    scheduleCallback(NormalPriority, () => {
      Scheduler.unstable_advanceTime(1000);
    });
    await waitForAll([]);

    // Note: The exact task id is not super important. That just how many tasks
    // it happens to take before the array is resized.
    expect(stopProfilingAndPrintFlamegraph()).toEqual(`
!!! Main thread              │░░░░░░░░░░░░░░░░░░░░
Task ${taskId} [Normal]          │████████████████████
`);

    global.__MAX_ITERATIONS__ = originalMaxIterations;
  });
});

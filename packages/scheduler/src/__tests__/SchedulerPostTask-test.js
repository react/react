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
let runtime;
let performance;
let cancelCallback;
let scheduleCallback;
let ImmediatePriority;
let NormalPriority;
let UserBlockingPriority;
let LowPriority;
let IdlePriority;
let shouldYield;

// The Scheduler postTask implementation uses a new postTask browser API to
// schedule work on the main thread. This test suite mocks all browser methods
// used in our implementation. It assumes as little as possible about the order
// and timing of events.
describe('SchedulerPostTask', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('scheduler', () =>
      jest.requireActual('scheduler/unstable_post_task'),
    );

    runtime = installMockBrowserRuntime();
    performance = window.performance;
    Scheduler = require('scheduler');
    cancelCallback = Scheduler.unstable_cancelCallback;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    ImmediatePriority = Scheduler.unstable_ImmediatePriority;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
    NormalPriority = Scheduler.unstable_NormalPriority;
    LowPriority = Scheduler.unstable_LowPriority;
    IdlePriority = Scheduler.unstable_IdlePriority;
    shouldYield = Scheduler.unstable_shouldYield;
  });

  afterEach(() => {
    if (!runtime.isLogEmpty()) {
      throw Error('Test exited without clearing log.');
    }
  });

  function installMockBrowserRuntime() {
    let taskQueue = new Map();
    let eventLog = [];

    // Mock window functions
    const window = {};
    global.window = window;

    let idCounter = 0;
    let currentTime = 0;
    window.performance = {
      now() {
        return currentTime;
      },
    };

    // Note: setTimeout is used to report errors and nothing else.
    window.setTimeout = cb => {
      try {
        cb();
      } catch (error) {
        runtime.log(`Error: ${error.message}`);
      }
    };

    // Mock browser scheduler.
    const scheduler = {};
    global.scheduler = scheduler;

    scheduler.postTask = function (callback, {signal}) {
      const {priority} = signal;
      const id = idCounter++;
      log(
        `Post Task ${id} [${priority === undefined ? '<default>' : priority}]`,
      );
      const controller = signal._controller;
      return new Promise((resolve, reject) => {
        taskQueue.set(controller, {id, callback, resolve, reject});
      });
    };

    scheduler.yield = function ({signal}) {
      const {priority} = signal;
      const id = idCounter++;
      log(`Yield ${id} [${priority === undefined ? '<default>' : priority}]`);
      const controller = signal._controller;
      let callback;

      return {
        then(cb) {
          callback = cb;
          return new Promise((resolve, reject) => {
            taskQueue.set(controller, {id, callback, resolve, reject});
          });
        },
      };
    };

    global.TaskController = class TaskController {
      constructor({priority}) {
        this.signal = {_controller: this, priority};
      }
      abort() {
        const task = taskQueue.get(this);
        if (task !== undefined) {
          taskQueue.delete(this);
          const reject = task.reject;
          reject(new Error('Aborted'));
        }
      }
    };

    function ensureLogIsEmpty() {
      if (eventLog.length !== 0) {
        throw Error('Log is not empty. Call assertLog before continuing.');
      }
    }
    function advanceTime(ms) {
      currentTime += ms;
    }
    function flushTasks() {
      ensureLogIsEmpty();

      // If there's a continuation, it will call postTask again
      // which will set nextTask. That means we need to clear
      // nextTask before the invocation, otherwise we would
      // delete the continuation task.
      const prevTaskQueue = taskQueue;
      taskQueue = new Map();
      for (const [, {id, callback, resolve}] of prevTaskQueue) {
        log(`Task ${id} Fired`);
        callback(false);
        resolve();
      }
    }
    function log(val) {
      eventLog.push(val);
    }
    function isLogEmpty() {
      return eventLog.length === 0;
    }
    function assertLog(expected) {
      const actual = eventLog;
      eventLog = [];
      expect(actual).toEqual(expected);
    }
    return {
      advanceTime,
      flushTasks,
      log,
      isLogEmpty,
      assertLog,
    };
  }

  it('task that finishes before deadline', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A']);
  });

  it('task with continuation', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('A');
      while (!Scheduler.unstable_shouldYield()) {
        runtime.advanceTime(1);
      }
      runtime.log(`Yield at ${performance.now()}ms`);
      return () => {
        runtime.log('Continuation');
      };
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);

    runtime.flushTasks();
    runtime.assertLog([
      'Task 0 Fired',
      'A',
      'Yield at 5ms',
      'Yield 1 [user-visible]',
    ]);

    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'Continuation']);
  });

  it('multiple tasks', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });
    scheduleCallback(NormalPriority, () => {
      runtime.log('B');
    });
    runtime.assertLog([
      'Post Task 0 [user-visible]',
      'Post Task 1 [user-visible]',
    ]);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A', 'Task 1 Fired', 'B']);
  });

  it('cancels tasks', () => {
    const task = scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);
    cancelCallback(task);
    runtime.flushTasks();
    runtime.assertLog([]);
  });

  it('an error in one task does not affect execution of other tasks', () => {
    scheduleCallback(NormalPriority, () => {
      throw Error('Oops!');
    });
    scheduleCallback(NormalPriority, () => {
      runtime.log('Yay');
    });
    runtime.assertLog([
      'Post Task 0 [user-visible]',
      'Post Task 1 [user-visible]',
    ]);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'Error: Oops!', 'Task 1 Fired', 'Yay']);
  });

  it('schedule new task after queue has emptied', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });

    runtime.assertLog(['Post Task 0 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A']);

    scheduleCallback(NormalPriority, () => {
      runtime.log('B');
    });
    runtime.assertLog(['Post Task 1 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'B']);
  });

  it('schedule new task after a cancellation', () => {
    const handle = scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });

    runtime.assertLog(['Post Task 0 [user-visible]']);
    cancelCallback(handle);

    runtime.flushTasks();
    runtime.assertLog([]);

    scheduleCallback(NormalPriority, () => {
      runtime.log('B');
    });
    runtime.assertLog(['Post Task 1 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'B']);
  });

  it('schedules tasks at different priorities', () => {
    scheduleCallback(ImmediatePriority, () => {
      runtime.log('A');
    });
    scheduleCallback(UserBlockingPriority, () => {
      runtime.log('B');
    });
    scheduleCallback(NormalPriority, () => {
      runtime.log('C');
    });
    scheduleCallback(LowPriority, () => {
      runtime.log('D');
    });
    scheduleCallback(IdlePriority, () => {
      runtime.log('E');
    });
    runtime.assertLog([
      'Post Task 0 [user-blocking]',
      'Post Task 1 [user-blocking]',
      'Post Task 2 [user-visible]',
      'Post Task 3 [user-visible]',
      'Post Task 4 [background]',
    ]);
    runtime.flushTasks();
    runtime.assertLog([
      'Task 0 Fired',
      'A',
      'Task 1 Fired',
      'B',
      'Task 2 Fired',
      'C',
      'Task 3 Fired',
      'D',
      'Task 4 Fired',
      'E',
    ]);
  });

  it('yielding continues in a new task regardless of how much time is remaining', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('Original Task');
      runtime.log('shouldYield: ' + shouldYield());
      runtime.log('Return a continuation');
      return () => {
        runtime.log('Continuation Task');
      };
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);

    runtime.flushTasks();
    runtime.assertLog([
      'Task 0 Fired',
      'Original Task',
      // Immediately before returning a continuation, `shouldYield` returns
      // false, which means there must be time remaining in the frame.
      'shouldYield: false',
      'Return a continuation',

      // The continuation should be scheduled in a separate macrotask even
      // though there's time remaining.
      'Yield 1 [user-visible]',
    ]);

    // No time has elapsed
    expect(performance.now()).toBe(0);

    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'Continuation Task']);
  });

  describe('falls back to postTask for scheduling continuations when scheduler.yield is not available', () => {
    beforeEach(() => {
      delete global.scheduler.yield;
    });

    it('task with continuation', () => {
      scheduleCallback(NormalPriority, () => {
        runtime.log('A');
        while (!Scheduler.unstable_shouldYield()) {
          runtime.advanceTime(1);
        }
        runtime.log(`Yield at ${performance.now()}ms`);
        return () => {
          runtime.log('Continuation');
        };
      });
      runtime.assertLog(['Post Task 0 [user-visible]']);

      runtime.flushTasks();
      runtime.assertLog([
        'Task 0 Fired',
        'A',
        'Yield at 5ms',
        'Post Task 1 [user-visible]',
      ]);

      runtime.flushTasks();
      runtime.assertLog(['Task 1 Fired', 'Continuation']);
    });

    it('yielding continues in a new task regardless of how much time is remaining', () => {
      scheduleCallback(NormalPriority, () => {
        runtime.log('Original Task');
        runtime.log('shouldYield: ' + shouldYield());
        runtime.log('Return a continuation');
        return () => {
          runtime.log('Continuation Task');
        };
      });
      runtime.assertLog(['Post Task 0 [user-visible]']);

      runtime.flushTasks();
      runtime.assertLog([
        'Task 0 Fired',
        'Original Task',
        // Immediately before returning a continuation, `shouldYield` returns
        // false, which means there must be time remaining in the frame.
        'shouldYield: false',
        'Return a continuation',

        // The continuation should be scheduled in a separate macrotask even
        // though there's time remaining.
        'Post Task 1 [user-visible]',
      ]);

      // No time has elapsed
      expect(performance.now()).toBe(0);

      runtime.flushTasks();
      runtime.assertLog(['Task 1 Fired', 'Continuation Task']);
    });
  });
});

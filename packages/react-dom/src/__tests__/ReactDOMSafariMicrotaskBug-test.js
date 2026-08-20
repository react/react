/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;

let ReactDOMClient;
let act;
let assertLog;
let Scheduler;

describe('ReactDOMSafariMicrotaskBug-test', () => {
  let container;
  let overrideQueueMicrotask;
  let flushFakeMicrotasks;

  beforeEach(() => {
    // In Safari, microtasks don't always run on clean stack.
    // This setup crudely approximates it.
    // In reality, the sync flush happens when an iframe is added to the page.
    // https://github.com/facebook/react/issues/22459
    const originalQueueMicrotask = queueMicrotask;
    overrideQueueMicrotask = false;
    const fakeMicrotaskQueue = [];
    global.queueMicrotask = cb => {
      if (overrideQueueMicrotask) {
        fakeMicrotaskQueue.push(cb);
      } else {
        originalQueueMicrotask(cb);
      }
    };
    flushFakeMicrotasks = () => {
      while (fakeMicrotaskQueue.length > 0) {
        const cb = fakeMicrotaskQueue.shift();
        cb();
      }
    };

    jest.resetModules();
    container = document.createElement('div');
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    Scheduler = require('scheduler');

    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should deal with premature microtask in commit phase', async () => {
    let ran = false;
    function Foo() {
      const [state, setState] = React.useState(0);
      return (
        <div
          ref={() => {
            overrideQueueMicrotask = true;
            if (!ran) {
              ran = true;
              setState(1);
              flushFakeMicrotasks();
              Scheduler.log(
                'Content at end of ref callback: ' + container.textContent,
              );
            }
          }}>
          {state}
        </div>
      );
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    assertLog(['Content at end of ref callback: 0']);
    expect(container.textContent).toBe('1');
  });

  it('should deal with premature microtask in event handler', async () => {
    function Foo() {
      const [state, setState] = React.useState(0);
      return (
        <button
          onClick={() => {
            overrideQueueMicrotask = true;
            setState(1);
            flushFakeMicrotasks();
            Scheduler.log(
              'Content at end of click handler: ' + container.textContent,
            );
          }}>
          {state}
        </button>
      );
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toBe('0');
    await act(() => {
      container.firstChild.dispatchEvent(
        new MouseEvent('click', {bubbles: true}),
      );
    });
    // This causes the update to flush earlier than usual. This isn't the ideal
    // behavior but we use this test to document it. The bug is Safari's, not
    // ours, so we just do our best to not crash even though the behavior isn't
    // completely correct.
    assertLog(['Content at end of click handler: 1']);
    expect(container.textContent).toBe('1');
  });
});

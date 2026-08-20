/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {createEventTarget} from 'dom-event-testing-library';

let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let ReactFeatureFlags;
let Scheduler;
let Activity;
let act;
let assertLog;
let waitForAll;
let waitFor;
let waitForPaint;

let IdleEventPriority;
let ContinuousEventPriority;

function dispatchMouseHoverEvent(to, from) {
  if (!to) {
    to = null;
  }
  if (!from) {
    from = null;
  }
  if (from) {
    const mouseOutEvent = document.createEvent('MouseEvents');
    mouseOutEvent.initMouseEvent(
      'mouseout',
      true,
      true,
      window,
      0,
      50,
      50,
      50,
      50,
      false,
      false,
      false,
      false,
      0,
      to,
    );
    from.dispatchEvent(mouseOutEvent);
  }
  if (to) {
    const mouseOverEvent = document.createEvent('MouseEvents');
    mouseOverEvent.initMouseEvent(
      'mouseover',
      true,
      true,
      window,
      0,
      50,
      50,
      50,
      50,
      false,
      false,
      false,
      false,
      0,
      from,
    );
    to.dispatchEvent(mouseOverEvent);
  }
}

function dispatchClickEvent(target) {
  const mouseOutEvent = document.createEvent('MouseEvents');
  mouseOutEvent.initMouseEvent(
    'click',
    true,
    true,
    window,
    0,
    50,
    50,
    50,
    50,
    false,
    false,
    false,
    false,
    0,
    target,
  );
  return target.dispatchEvent(mouseOutEvent);
}

// TODO: There's currently no React DOM API to opt into Idle priority updates,
// and there's no native DOM event that maps to idle priority, so this is a
// temporary workaround. Need something like ReactDOM.unstable_IdleUpdates.
function TODO_scheduleIdleDOMSchedulerTask(fn) {
  ReactDOM.unstable_runWithPriority(IdleEventPriority, () => {
    const prevEvent = window.event;
    window.event = {type: 'message'};
    try {
      fn();
    } finally {
      window.event = prevEvent;
    }
  });
}

function TODO_scheduleContinuousSchedulerTask(fn) {
  ReactDOM.unstable_runWithPriority(ContinuousEventPriority, () => {
    const prevEvent = window.event;
    window.event = {type: 'message'};
    try {
      fn();
    } finally {
      window.event = prevEvent;
    }
  });
}

describe('ReactDOMServerSelectiveHydrationActivity', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableCreateEventHandleAPI = true;
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    Scheduler = require('scheduler');
    Activity = React.Activity;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForPaint = InternalTestUtils.waitForPaint;

    IdleEventPriority = require('react-reconciler/constants').IdleEventPriority;
    ContinuousEventPriority =
      require('react-reconciler/constants').ContinuousEventPriority;
  });

  it('hydrates the target boundary synchronously during a click', async () => {
    function Child({text}) {
      Scheduler.log(text);
      return (
        <span
          onClick={e => {
            e.preventDefault();
            Scheduler.log('Clicked ' + text);
          }}>
          {text}
        </span>
      );
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[1];

    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // This should synchronously hydrate the root App and the second suspense
    // boundary.
    const result = dispatchClickEvent(span);

    // The event should have been canceled because we called preventDefault.
    expect(result).toBe(false);

    // We rendered App, B and then invoked the event without rendering A.
    assertLog(['App', 'B', 'Clicked B']);

    // After continuing the scheduler, we finally hydrate A.
    await waitForAll(['A']);

    document.body.removeChild(container);
  });

  it('hydrates at higher pri if sync did not work first time', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Child({text}) {
      if ((text === 'A' || text === 'D') && suspend) {
        throw promise;
      }
      Scheduler.log(text);
      return (
        <span
          onClick={e => {
            e.preventDefault();
            Scheduler.log('Clicked ' + text);
          }}>
          {text}
        </span>
      );
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
          <Activity>
            <Child text="C" />
          </Activity>
          <Activity>
            <Child text="D" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B', 'C', 'D']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const spanD = container.getElementsByTagName('span')[3];

    suspend = true;

    // A and D will be suspended. We'll click on D which should take
    // priority, after we unsuspend.
    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // This click target cannot be hydrated yet because it's suspended.
    await act(() => {
      const result = dispatchClickEvent(spanD);
      expect(result).toBe(true);
    });
    assertLog([
      'App',
      // Continuing rendering will render B next.
      'B',
      'C',
    ]);

    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    assertLog(['D', 'A']);

    document.body.removeChild(container);
  });

  it('hydrates at higher pri for secondary discrete events', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Child({text}) {
      if ((text === 'A' || text === 'D') && suspend) {
        throw promise;
      }
      Scheduler.log(text);
      return (
        <span
          onClick={e => {
            e.preventDefault();
            Scheduler.log('Clicked ' + text);
          }}>
          {text}
        </span>
      );
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
          <Activity>
            <Child text="C" />
          </Activity>
          <Activity>
            <Child text="D" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B', 'C', 'D']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const spanA = container.getElementsByTagName('span')[0];
    const spanC = container.getElementsByTagName('span')[2];
    const spanD = container.getElementsByTagName('span')[3];

    suspend = true;

    // A and D will be suspended. We'll click on D which should take
    // priority, after we unsuspend.
    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // This click target cannot be hydrated yet because the first is Suspended.
    dispatchClickEvent(spanA);
    dispatchClickEvent(spanC);
    dispatchClickEvent(spanD);

    assertLog(['App', 'C', 'Clicked C']);

    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    assertLog([
      'A',
      'D',
      // B should render last since it wasn't clicked.
      'B',
    ]);

    document.body.removeChild(container);
  });

  // @gate www
  it('hydrates the target boundary synchronously during a click (createEventHandle)', async () => {
    const setClick = ReactDOM.unstable_createEventHandle('click');
    let isServerRendering = true;

    function Child({text}) {
      const ref = React.useRef(null);
      Scheduler.log(text);
      if (!isServerRendering) {
        React.useLayoutEffect(() => {
          return setClick(ref.current, () => {
            Scheduler.log('Clicked ' + text);
          });
        });
      }

      return <span ref={ref}>{text}</span>;
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    isServerRendering = false;

    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    const span = container.getElementsByTagName('span')[1];

    const target = createEventTarget(span);

    // This should synchronously hydrate the root App and the second suspense
    // boundary.
    target.virtualclick();

    // We rendered App, B and then invoked the event without rendering A.
    assertLog(['App', 'B', 'Clicked B']);

    // After continuing the scheduler, we finally hydrate A.
    await waitForAll(['A']);

    document.body.removeChild(container);
  });

  // @gate www
  it('hydrates at higher pri if sync did not work first time (createEventHandle)', async () => {
    let suspend = false;
    let isServerRendering = true;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const setClick = ReactDOM.unstable_createEventHandle('click');

    function Child({text}) {
      const ref = React.useRef(null);
      if ((text === 'A' || text === 'D') && suspend) {
        throw promise;
      }
      Scheduler.log(text);

      if (!isServerRendering) {
        React.useLayoutEffect(() => {
          return setClick(ref.current, () => {
            Scheduler.log('Clicked ' + text);
          });
        });
      }

      return <span ref={ref}>{text}</span>;
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
          <Activity>
            <Child text="C" />
          </Activity>
          <Activity>
            <Child text="D" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B', 'C', 'D']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const spanD = container.getElementsByTagName('span')[3];

    suspend = true;
    isServerRendering = false;

    // A and D will be suspended. We'll click on D which should take
    // priority, after we unsuspend.
    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // Continuing rendering will render B next.
    await act(() => {
      const target = createEventTarget(spanD);
      target.virtualclick();
    });
    assertLog(['App', 'B', 'C']);

    // After the click, we should prioritize D and the Click first,
    // and only after that render A and C.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    // no replay
    assertLog(['D', 'A']);

    document.body.removeChild(container);
  });

  // @gate www
  it('hydrates at higher pri for secondary discrete events (createEventHandle)', async () => {
    const setClick = ReactDOM.unstable_createEventHandle('click');
    let suspend = false;
    let isServerRendering = true;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Child({text}) {
      const ref = React.useRef(null);
      if ((text === 'A' || text === 'D') && suspend) {
        throw promise;
      }
      Scheduler.log(text);

      if (!isServerRendering) {
        React.useLayoutEffect(() => {
          return setClick(ref.current, () => {
            Scheduler.log('Clicked ' + text);
          });
        });
      }
      return <span ref={ref}>{text}</span>;
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
          <Activity>
            <Child text="C" />
          </Activity>
          <Activity>
            <Child text="D" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B', 'C', 'D']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const spanA = container.getElementsByTagName('span')[0];
    const spanC = container.getElementsByTagName('span')[2];
    const spanD = container.getElementsByTagName('span')[3];

    suspend = true;
    isServerRendering = false;

    // A and D will be suspended. We'll click on D which should take
    // priority, after we unsuspend.
    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // This click target cannot be hydrated yet because the first is Suspended.
    createEventTarget(spanA).virtualclick();
    createEventTarget(spanC).virtualclick();
    createEventTarget(spanD).virtualclick();

    assertLog(['App', 'C', 'Clicked C']);

    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    assertLog([
      'A',
      'D',
      // B should render last since it wasn't clicked.
      'B',
    ]);

    document.body.removeChild(container);
  });

  it('hydrates the hovered targets as higher priority for continuous events', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    function Child({text}) {
      if ((text === 'A' || text === 'D') && suspend) {
        throw promise;
      }
      Scheduler.log(text);
      return (
        <span
          onClick={e => {
            e.preventDefault();
            Scheduler.log('Clicked ' + text);
          }}
          onMouseEnter={e => {
            e.preventDefault();
            Scheduler.log('Hover ' + text);
          }}>
          {text}
        </span>
      );
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
          <Activity>
            <Child text="C" />
          </Activity>
          <Activity>
            <Child text="D" />
          </Activity>
        </div>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    assertLog(['App', 'A', 'B', 'C', 'D']);
    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const spanB = container.getElementsByTagName('span')[1];
    const spanC = container.getElementsByTagName('span')[2];
    const spanD = container.getElementsByTagName('span')[3];

    suspend = true;

    // A and D will be suspended. We'll click on D which should take
    // priority, after we unsuspend.
    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    await act(() => {
      // Click D
      dispatchMouseHoverEvent(spanD, null);
      dispatchClickEvent(spanD);

      // Hover over B and then C.
      dispatchMouseHoverEvent(spanB, spanD);
      dispatchMouseHoverEvent(spanC, spanB);

      assertLog(['App']);

      suspend = false;
      resolve();
    });

    // We should prioritize hydrating D first because we clicked it.
    // but event isnt replayed
    assertLog([
      'D',
      'B', // Ideally this should be later.
      'C',
      'Hover C',
      'A',
    ]);

    document.body.removeChild(container);
  });

  it('replays capture phase for continuous events and respects stopPropagation', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Child({text}) {
      if ((text === 'A' || text === 'D') && suspend) {
        throw promise;
      }
      Scheduler.log(text);
      return (
        <span
          id={text}
          onClickCapture={e => {
            e.preventDefault();
            Scheduler.log('Capture Clicked ' + text);
          }}
          onClick={e => {
            e.preventDefault();
            Scheduler.log('Clicked ' + text);
          }}
          onMouseEnter={e => {
            e.preventDefault();
            Scheduler.log('Mouse Enter ' + text);
          }}
          onMouseOut={e => {
            e.preventDefault();
            Scheduler.log('Mouse Out ' + text);
          }}
          onMouseOutCapture={e => {
            e.preventDefault();
            e.stopPropagation();
            Scheduler.log('Mouse Out Capture ' + text);
          }}
          onMouseOverCapture={e => {
            e.preventDefault();
            e.stopPropagation();
            Scheduler.log('Mouse Over Capture ' + text);
          }}
          onMouseOver={e => {
            e.preventDefault();
            Scheduler.log('Mouse Over ' + text);
          }}>
          <div
            onMouseOverCapture={e => {
              e.preventDefault();
              Scheduler.log('Mouse Over Capture Inner ' + text);
            }}>
            {text}
          </div>
        </span>
      );
    }

    function App() {
      Scheduler.log('App');
      return (
        <div
          onClickCapture={e => {
            e.preventDefault();
            Scheduler.log('Capture Clicked Parent');
          }}
          onMouseOverCapture={e => {
            Scheduler.log('Mouse Over Capture Parent');
          }}>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
          <Activity>
            <Child text="C" />
          </Activity>
          <Activity>
            <Child text="D" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B', 'C', 'D']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const spanB = document.getElementById('B').firstChild;
    const spanC = document.getElementById('C').firstChild;
    const spanD = document.getElementById('D').firstChild;

    suspend = true;

    // A and D will be suspended. We'll click on D which should take
    // priority, after we unsuspend.
    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    await act(async () => {
      // Click D
      dispatchMouseHoverEvent(spanD, null);
      dispatchClickEvent(spanD);
      // Hover over B and then C.
      dispatchMouseHoverEvent(spanB, spanD);
      dispatchMouseHoverEvent(spanC, spanB);

      assertLog(['App']);

      suspend = false;
      resolve();
    });

    // We should prioritize hydrating D first because we clicked it.
    // but event isnt replayed
    assertLog([
      'D',
      'B', // Ideally this should be later.
      'C',
      // Mouse out events aren't replayed
      // 'Mouse Out Capture B',
      // 'Mouse Out B',
      'Mouse Over Capture Parent',
      'Mouse Over Capture C',
      // Stop propagation stops these
      // 'Mouse Over Capture Inner C',
      // 'Mouse Over C',
      'A',
    ]);

    // This test shows existing quirk where stopPropagation on mouseout
    // prevents mouseEnter from firing
    dispatchMouseHoverEvent(spanC, spanB);
    assertLog([
      'Mouse Out Capture B',
      // stopPropagation stops these
      // 'Mouse Out B',
      // 'Mouse Enter C',
      'Mouse Over Capture Parent',
      'Mouse Over Capture C',
      // Stop propagation stops these
      // 'Mouse Over Capture Inner C',
      // 'Mouse Over C',
    ]);

    document.body.removeChild(container);
  });

  it('replays event with null target when tree is dismounted', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });

    function Child() {
      if (suspend) {
        throw promise;
      }
      Scheduler.log('Child');
      return (
        <div
          onMouseOver={() => {
            Scheduler.log('on mouse over');
          }}>
          Child
        </div>
      );
    }

    function App() {
      return (
        <Activity>
          <Child />
        </Activity>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);
    assertLog(['Child']);

    const container = document.createElement('div');

    document.body.appendChild(container);
    container.innerHTML = finalHTML;
    suspend = true;

    ReactDOMClient.hydrateRoot(container, <App />);

    const childDiv = container.firstElementChild;

    await act(async () => {
      dispatchMouseHoverEvent(childDiv);

      // Not hydrated so event is saved for replay and stopPropagation is called
      assertLog([]);

      resolve();
      await waitFor(['Child']);

      ReactDOM.flushSync(() => {
        container.removeChild(childDiv);

        const container2 = document.createElement('div');
        container2.addEventListener('mouseover', () => {
          Scheduler.log('container2 mouse over');
        });
        container2.appendChild(childDiv);
      });
    });

    // Even though the tree is remove the event is still dispatched with native event handler
    // on the container firing.
    assertLog(['container2 mouse over']);

    document.body.removeChild(container);
  });

  it('hydrates the last target path first for continuous events', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Child({text}) {
      if ((text === 'A' || text === 'D') && suspend) {
        throw promise;
      }
      Scheduler.log(text);
      return (
        <span
          onMouseEnter={e => {
            e.preventDefault();
            Scheduler.log('Hover ' + text);
          }}>
          {text}
        </span>
      );
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <div>
              <Activity>
                <Child text="B" />
              </Activity>
            </div>
            <Child text="C" />
          </Activity>
          <Activity>
            <Child text="D" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B', 'C', 'D']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const spanB = container.getElementsByTagName('span')[1];
    const spanC = container.getElementsByTagName('span')[2];
    const spanD = container.getElementsByTagName('span')[3];

    suspend = true;

    // A and D will be suspended. We'll click on D which should take
    // priority, after we unsuspend.
    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // Hover over B and then C.
    dispatchMouseHoverEvent(spanB, spanD);
    dispatchMouseHoverEvent(spanC, spanB);

    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    // We should prioritize hydrating D first because we clicked it.
    // Next we should hydrate C since that's the current hover target.
    // Next it doesn't matter if we hydrate A or B first but as an
    // implementation detail we're currently hydrating B first since
    // we at one point hovered over it and we never deprioritized it.
    assertLog(['App', 'C', 'Hover C', 'A', 'B', 'D']);

    document.body.removeChild(container);
  });

  it('hydrates the last explicitly hydrated target at higher priority', async () => {
    function Child({text}) {
      Scheduler.log(text);
      return <span>{text}</span>;
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
          <Activity>
            <Child text="C" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B', 'C']);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const spanB = container.getElementsByTagName('span')[1];
    const spanC = container.getElementsByTagName('span')[2];

    const root = ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // Increase priority of B and then C.
    root.unstable_scheduleHydration(spanB);
    root.unstable_scheduleHydration(spanC);

    // We should prioritize hydrating C first because the last added
    // gets highest priority followed by the next added.
    await waitForAll(['App', 'C', 'B', 'A']);
  });

  // @gate www
  it('hydrates before an update even if hydration moves away from it', async () => {
    function Child({text}) {
      Scheduler.log(text);
      return <span>{text}</span>;
    }
    const ChildWithBoundary = React.memo(function ({text}) {
      return (
        <Activity>
          <Child text={text} />
          <Child text={text.toLowerCase()} />
        </Activity>
      );
    });

    function App({a}) {
      Scheduler.log('App');
      React.useEffect(() => {
        Scheduler.log('Commit');
      });
      return (
        <div>
          <ChildWithBoundary text={a} />
          <ChildWithBoundary text="B" />
          <ChildWithBoundary text="C" />
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App a="A" />);

    assertLog(['App', 'A', 'a', 'B', 'b', 'C', 'c']);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const spanA = container.getElementsByTagName('span')[0];
    const spanB = container.getElementsByTagName('span')[2];
    const spanC = container.getElementsByTagName('span')[4];

    await act(async () => {
      const root = ReactDOMClient.hydrateRoot(container, <App a="A" />);
      // Hydrate the shell.
      await waitFor(['App', 'Commit']);

      // Render an update at Idle priority that needs to update A.

      TODO_scheduleIdleDOMSchedulerTask(() => {
        root.render(<App a="AA" />);
      });

      // Start rendering. This will force the first boundary to hydrate
      // by scheduling it at one higher pri than Idle.
      await waitFor([
        'App',

        // Start hydrating A
        'A',
      ]);

      // Hover over A which (could) schedule at one higher pri than Idle.
      dispatchMouseHoverEvent(spanA, null);

      // Before, we're done we now switch to hover over B.
      // This is meant to test that this doesn't cause us to forget that
      // we still have to hydrate A. The first boundary.
      // This also tests that we don't do the -1 down-prioritization of
      // continuous hover events because that would decrease its priority
      // to Idle.
      dispatchMouseHoverEvent(spanB, spanA);

      // Also click C to prioritize that even higher which resets the
      // priority levels.
      dispatchClickEvent(spanC);

      assertLog([
        // Hydrate C first since we clicked it.
        'C',
        'c',
      ]);

      await waitForAll([
        // Finish hydration of A since we forced it to hydrate.
        'A',
        'a',
        // Also, hydrate B since we hovered over it.
        // It's not important which one comes first. A or B.
        // As long as they both happen before the Idle update.
        'B',
        'b',
        // Begin the Idle update again.
        'App',
        'AA',
        'aa',
        'Commit',
      ]);
    });

    const spanA2 = container.getElementsByTagName('span')[0];
    // This is supposed to have been hydrated, not replaced.
    expect(spanA).toBe(spanA2);

    document.body.removeChild(container);
  });

  it('fires capture event handlers and native events if content is hydratable during discrete event', async () => {
    spyOnDev(console, 'error');
    function Child({text}) {
      Scheduler.log(text);
      const ref = React.useRef();
      React.useLayoutEffect(() => {
        if (!ref.current) {
          return;
        }
        ref.current.onclick = () => {
          Scheduler.log('Native Click ' + text);
        };
      }, [text]);
      return (
        <span
          ref={ref}
          onClickCapture={() => {
            Scheduler.log('Capture Clicked ' + text);
          }}
          onClick={e => {
            Scheduler.log('Clicked ' + text);
          }}>
          {text}
        </span>
      );
    }

    function App() {
      Scheduler.log('App');
      return (
        <div>
          <Activity>
            <Child text="A" />
          </Activity>
          <Activity>
            <Child text="B" />
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'A', 'B']);

    const container = document.createElement('div');
    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[1];

    ReactDOMClient.hydrateRoot(container, <App />);

    // Nothing has been hydrated so far.
    assertLog([]);

    // This should synchronously hydrate the root App and the second suspense
    // boundary.
    dispatchClickEvent(span);

    // We rendered App, B and then invoked the event without rendering A.
    assertLog(['App', 'B', 'Capture Clicked B', 'Native Click B', 'Clicked B']);

    // After continuing the scheduler, we finally hydrate A.
    await waitForAll(['A']);

    document.body.removeChild(container);
  });

  it('does not propagate discrete event if it cannot be synchronously hydrated', async () => {
    let triggeredParent = false;
    let triggeredChild = false;
    let suspend = false;
    const promise = new Promise(() => {});
    function Child() {
      if (suspend) {
        throw promise;
      }
      Scheduler.log('Child');
      return (
        <span
          onClickCapture={e => {
            e.stopPropagation();
            triggeredChild = true;
          }}>
          Click me
        </span>
      );
    }
    function App() {
      const onClick = () => {
        triggeredParent = true;
      };
      Scheduler.log('App');
      return (
        <div
          ref={n => {
            if (n) n.onclick = onClick;
          }}
          onClick={onClick}>
          <Activity>
            <Child />
          </Activity>
        </div>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);

    assertLog(['App', 'Child']);

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = finalHTML;

    suspend = true;

    ReactDOMClient.hydrateRoot(container, <App />);
    // Nothing has been hydrated so far.
    assertLog([]);

    const span = container.getElementsByTagName('span')[0];
    dispatchClickEvent(span);

    assertLog(['App']);

    dispatchClickEvent(span);

    expect(triggeredParent).toBe(false);
    expect(triggeredChild).toBe(false);
  });

  it('can force hydration in response to sync update', async () => {
    function Child({text}) {
      Scheduler.log(`Child ${text}`);
      return <span ref={ref => (spanRef = ref)}>{text}</span>;
    }
    function App({text}) {
      Scheduler.log(`App ${text}`);
      return (
        <div>
          <Activity>
            <Child text={text} />
          </Activity>
        </div>
      );
    }

    let spanRef;
    const finalHTML = ReactDOMServer.renderToString(<App text="A" />);
    assertLog(['App A', 'Child A']);
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = finalHTML;
    const initialSpan = container.getElementsByTagName('span')[0];
    const root = ReactDOMClient.hydrateRoot(container, <App text="A" />);
    await waitForPaint(['App A']);

    await act(() => {
      ReactDOM.flushSync(() => {
        root.render(<App text="B" />);
      });
    });
    assertLog(['App B', 'Child A', 'App B', 'Child B']);
    expect(initialSpan).toBe(spanRef);
  });

  // @gate www
  it('can force hydration in response to continuous update', async () => {
    function Child({text}) {
      Scheduler.log(`Child ${text}`);
      return <span ref={ref => (spanRef = ref)}>{text}</span>;
    }
    function App({text}) {
      Scheduler.log(`App ${text}`);
      return (
        <div>
          <Activity>
            <Child text={text} />
          </Activity>
        </div>
      );
    }

    let spanRef;
    const finalHTML = ReactDOMServer.renderToString(<App text="A" />);
    assertLog(['App A', 'Child A']);
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = finalHTML;
    const initialSpan = container.getElementsByTagName('span')[0];
    const root = ReactDOMClient.hydrateRoot(container, <App text="A" />);
    await waitForPaint(['App A']);

    await act(() => {
      TODO_scheduleContinuousSchedulerTask(() => {
        root.render(<App text="B" />);
      });
    });

    assertLog(['App B', 'Child A', 'App B', 'Child B']);
    expect(initialSpan).toBe(spanRef);
  });

  it('can force hydration in response to default update', async () => {
    function Child({text}) {
      Scheduler.log(`Child ${text}`);
      return <span ref={ref => (spanRef = ref)}>{text}</span>;
    }
    function App({text}) {
      Scheduler.log(`App ${text}`);
      return (
        <div>
          <Activity>
            <Child text={text} />
          </Activity>
        </div>
      );
    }

    let spanRef;
    const finalHTML = ReactDOMServer.renderToString(<App text="A" />);
    assertLog(['App A', 'Child A']);
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = finalHTML;
    const initialSpan = container.getElementsByTagName('span')[0];
    const root = ReactDOMClient.hydrateRoot(container, <App text="A" />);
    await waitForPaint(['App A']);
    await act(() => {
      root.render(<App text="B" />);
    });
    assertLog(['App B', 'Child A', 'App B', 'Child B']);
    expect(initialSpan).toBe(spanRef);
  });

  // @gate www
  it('regression test: can unwind context on selective hydration interruption', async () => {
    const Context = React.createContext('DefaultContext');

    function ContextReader(props) {
      const value = React.useContext(Context);
      Scheduler.log(value);
      return null;
    }

    function Child({text}) {
      Scheduler.log(text);
      return <span>{text}</span>;
    }
    const ChildWithBoundary = React.memo(function ({text}) {
      return (
        <Activity>
          <Child text={text} />
        </Activity>
      );
    });

    function App({a}) {
      Scheduler.log('App');
      React.useEffect(() => {
        Scheduler.log('Commit');
      });
      return (
        <>
          <Context.Provider value="SiblingContext">
            <ChildWithBoundary text={a} />
          </Context.Provider>
          <ContextReader />
        </>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App a="A" />);
    assertLog(['App', 'A', 'DefaultContext']);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;
    document.body.appendChild(container);

    const spanA = container.getElementsByTagName('span')[0];

    await act(async () => {
      const root = ReactDOMClient.hydrateRoot(container, <App a="A" />);
      await waitFor(['App', 'DefaultContext', 'Commit']);

      TODO_scheduleIdleDOMSchedulerTask(() => {
        root.render(<App a="AA" />);
      });
      await waitFor(['App', 'A']);

      dispatchClickEvent(spanA);
      assertLog(['A']);
      await waitForAll(['App', 'AA', 'DefaultContext', 'Commit']);
    });
  });

  it('regression test: can unwind context on selective hydration interruption for sync updates', async () => {
    const Context = React.createContext('DefaultContext');

    function ContextReader(props) {
      const value = React.useContext(Context);
      Scheduler.log(value);
      return null;
    }

    function Child({text}) {
      Scheduler.log(text);
      return <span>{text}</span>;
    }
    const ChildWithBoundary = React.memo(function ({text}) {
      return (
        <Activity>
          <Child text={text} />
        </Activity>
      );
    });

    function App({a}) {
      Scheduler.log('App');
      React.useEffect(() => {
        Scheduler.log('Commit');
      });
      return (
        <>
          <Context.Provider value="SiblingContext">
            <ChildWithBoundary text={a} />
          </Context.Provider>
          <ContextReader />
        </>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App a="A" />);
    assertLog(['App', 'A', 'DefaultContext']);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    await act(async () => {
      const root = ReactDOMClient.hydrateRoot(container, <App a="A" />);
      await waitFor(['App', 'DefaultContext', 'Commit']);

      ReactDOM.flushSync(() => {
        root.render(<App a="AA" />);
      });
      assertLog(['App', 'A', 'App', 'AA', 'DefaultContext', 'Commit']);
    });
  });

  it('regression: selective hydration does not contribute to "maximum update limit" count', async () => {
    const outsideRef = React.createRef(null);
    const insideRef = React.createRef(null);
    function Child() {
      return (
        <Activity>
          <div ref={insideRef} />
        </Activity>
      );
    }

    let setIsMounted = false;
    function App() {
      const [isMounted, setState] = React.useState(false);
      setIsMounted = setState;

      const children = [];
      for (let i = 0; i < 100; i++) {
        children.push(<Child key={i} isMounted={isMounted} />);
      }

      return <div ref={outsideRef}>{children}</div>;
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);

      // Commit just the shell
      await waitForPaint([]);

      // Assert that the shell has hydrated, but not the children
      expect(outsideRef.current).not.toBe(null);
      expect(insideRef.current).toBe(null);

      // Update the shell synchronously. The update will flow into the children,
      // which haven't hydrated yet. This will trigger a cascade of commits
      // caused by selective hydration. However, since there's really only one
      // update, it should not be treated as an update loop.
      // NOTE: It's unfortunate that every sibling boundary is separately
      // committed in this case. We should be able to commit everything in a
      // render phase, which we could do if we had resumable context stacks.
      ReactDOM.flushSync(() => {
        setIsMounted(true);
      });
    });

    // Should have successfully hydrated with no errors.
    expect(insideRef.current).not.toBe(null);
  });
});

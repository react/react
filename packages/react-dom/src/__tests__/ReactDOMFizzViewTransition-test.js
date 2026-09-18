/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';
import {
  insertNodesAndExecuteScripts,
  getVisibleChildren,
} from '../test-utils/FizzTestUtils';

let JSDOM;
let React;
let Suspense;
let ViewTransition;
let ReactDOMClient;
let clientAct;
let ReactDOMFizzServer;
let Stream;
let document;
let writable;
let container;
let buffer = '';
let hasErrored = false;
let fatalError = undefined;

describe('ReactDOMFizzViewTransition', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    clientAct = require('internal-test-utils').act;
    ReactDOMFizzServer = require('react-dom/server');
    Stream = require('stream');

    Suspense = React.Suspense;
    ViewTransition = React.ViewTransition;

    // Test Environment
    const jsdom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body><div id="container">',
      {
        runScripts: 'dangerously',
      },
    );
    document = jsdom.window.document;
    container = document.getElementById('container');
    global.window = jsdom.window;
    // The Fizz runtime assumes requestAnimationFrame exists so we need to polyfill it.
    global.requestAnimationFrame = global.window.requestAnimationFrame = cb =>
      setTimeout(cb);

    buffer = '';
    hasErrored = false;

    writable = new Stream.PassThrough();
    writable.setEncoding('utf8');
    writable.on('data', chunk => {
      buffer += chunk;
    });
    writable.on('error', error => {
      hasErrored = true;
      fatalError = error;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function serverAct(callback) {
    await callback();
    // Await one turn around the event loop.
    // This assumes that we'll flush everything we have so far.
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    if (hasErrored) {
      throw fatalError;
    }
    // JSDOM doesn't support stream HTML parser so we need to give it a proper fragment.
    // We also want to execute any scripts that are embedded.
    // We assume that we have now received a proper fragment of HTML.
    const bufferedContent = buffer;
    buffer = '';
    const temp = document.createElement('body');
    temp.innerHTML = bufferedContent;
    await insertNodesAndExecuteScripts(temp, container, null);
    jest.runAllTimers();
  }

  // @gate enableViewTransition
  it('emits annotations for view transitions', async () => {
    function App() {
      return (
        <div>
          <ViewTransition>
            <div />
          </ViewTransition>
          <ViewTransition name="foo" update="bar">
            <div />
          </ViewTransition>
          <ViewTransition update={{something: 'a', default: 'baz'}}>
            <div />
          </ViewTransition>
          <ViewTransition name="outer" update="bar" share="pair">
            <ViewTransition>
              <div />
            </ViewTransition>
          </ViewTransition>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div vt-update="auto" />
        <div vt-name="foo" vt-update="bar" vt-share="auto" />
        <div vt-update="baz" />
        <div vt-name="outer" vt-update="auto" vt-share="pair" />
      </div>,
    );

    // Hydration should not yield any errors.
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
  });

  // @gate enableViewTransition
  it('emits enter/exit annotations for view transitions inside Suspense', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <ViewTransition>
          <div>
            <ViewTransition>
              <span>Loading</span>
            </ViewTransition>
          </div>
        </ViewTransition>
      );
      return (
        <div>
          <Suspense fallback={fallback}>
            <ViewTransition>
              <Suspend />
            </ViewTransition>
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div vt-update="auto" vt-exit="auto">
          <span vt-update="auto">Loading</span>
        </div>
      </div>,
    );

    await serverAct(async () => {
      await resolve(
        <div>
          <ViewTransition>
            <span>Content</span>
          </ViewTransition>
        </div>,
      );
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div vt-update="auto" vt-enter="auto">
          <span vt-update="auto">Content</span>
        </div>
      </div>,
    );

    // Hydration should not yield any errors.
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
  });

  // @gate enableViewTransition
  it('can emit both enter and exit on the same node', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <Suspense fallback={null}>
          <ViewTransition enter="hello" exit="goodbye">
            <div>
              <ViewTransition>
                <span>Loading</span>
              </ViewTransition>
            </div>
          </ViewTransition>
        </Suspense>
      );
      return (
        <div>
          <Suspense fallback={fallback}>
            <ViewTransition enter="hi">
              <Suspend />
            </ViewTransition>
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div vt-update="auto" vt-enter="hello" vt-exit="goodbye">
          <span vt-update="auto">Loading</span>
        </div>
      </div>,
    );

    await serverAct(async () => {
      await resolve(
        <div>
          <ViewTransition>
            <span>Content</span>
          </ViewTransition>
        </div>,
      );
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div vt-update="auto" vt-enter="hi">
          <span vt-update="auto">Content</span>
        </div>
      </div>,
    );

    // Hydration should not yield any errors.
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
  });

  // @gate enableViewTransition
  it('emits annotations for view transitions outside Suspense', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <div>
          <ViewTransition>
            <span>Loading</span>
          </ViewTransition>
        </div>
      );
      return (
        <div>
          <ViewTransition>
            <Suspense fallback={fallback}>
              <Suspend />
            </Suspense>
          </ViewTransition>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div vt-name="_R_0_" vt-update="auto" vt-share="auto">
          <span vt-update="auto">Loading</span>
        </div>
      </div>,
    );

    await serverAct(async () => {
      await resolve(
        <div>
          <ViewTransition>
            <span>Content</span>
          </ViewTransition>
        </div>,
      );
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div vt-name="_R_0_" vt-update="auto" vt-share="auto">
          <span vt-update="auto">Content</span>
        </div>
      </div>,
    );

    // Hydration should not yield any errors.
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
  });

  // @gate enableViewTransition && enableViewTransitionParentEnterExit
  it('stops the parentExit relay when an intermediate class is "none"', async () => {
    const promise = new Promise(() => {});
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <ViewTransition exit="page-exit">
          <div id="A">
            <ViewTransition parentExit="none">
              <div id="B">
                <ViewTransition parentExit="nested-exit">
                  <div id="C">Deep</div>
                </ViewTransition>
              </div>
            </ViewTransition>
            <ViewTransition parentExit="nested-exit">
              <span id="D">Shallow</span>
            </ViewTransition>
          </div>
        </ViewTransition>
      );
      return (
        <div>
          <Suspense fallback={fallback}>
            <Suspend />
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    // The "none" on the wrapper stops the relay, so the deep child (C) never
    // gets a vt-parent-exit annotation. The sibling (D), which is not behind a
    // "none" boundary, still relays.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div id="A" vt-update="auto" vt-exit="page-exit">
          <div id="B" vt-update="auto">
            <div id="C" vt-update="auto">
              Deep
            </div>
          </div>
          <span id="D" vt-update="auto" vt-parent-exit="nested-exit">
            Shallow
          </span>
        </div>
      </div>,
    );
  });

  // @gate enableViewTransition && enableViewTransitionParentEnterExit
  it('stops the parentEnter relay when an intermediate class is "none"', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      return (
        <div>
          <Suspense fallback={<div>loading</div>}>
            <ViewTransition enter="page-enter">
              <Suspend />
            </ViewTransition>
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    await serverAct(async () => {
      await resolve(
        <div id="A">
          <ViewTransition parentEnter="none">
            <div id="B">
              <ViewTransition parentEnter="nested-enter">
                <div id="C">Deep</div>
              </ViewTransition>
            </div>
          </ViewTransition>
          <ViewTransition parentEnter="nested-enter">
            <span id="D">Shallow</span>
          </ViewTransition>
        </div>,
      );
    });

    // The "none" on the wrapper stops the relay, so the deep child (C) never
    // gets a vt-parent-enter annotation. The sibling (D) still relays.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div id="A" vt-update="auto" vt-enter="page-enter">
          <div id="B" vt-update="auto">
            <div id="C" vt-update="auto">
              Deep
            </div>
          </div>
          <span id="D" vt-update="auto" vt-parent-enter="nested-enter">
            Shallow
          </span>
        </div>
      </div>,
    );

    // Hydration should not yield any errors.
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
  });

  // @gate enableViewTransition
  it('breaks the parentExit relay through a ViewTransition without parentExit', async () => {
    const promise = new Promise(() => {});
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <ViewTransition exit="page-exit">
          <div id="A">
            <ViewTransition>
              <div id="B">
                <ViewTransition parentExit="nested-exit">
                  <div id="C">Deep</div>
                </ViewTransition>
              </div>
            </ViewTransition>
          </div>
        </ViewTransition>
      );
      return (
        <div>
          <Suspense fallback={fallback}>
            <Suspend />
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    // A ViewTransition that doesn't opt in with parentExit breaks the relay,
    // just like the client runtime, so C is not annotated.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div id="A" vt-update="auto" vt-exit="page-exit">
          <div id="B" vt-update="auto">
            <div id="C" vt-update="auto">
              Deep
            </div>
          </div>
        </div>
      </div>,
    );
  });

  // @gate enableViewTransition && enableViewTransitionParentEnterExit
  it('relays the parentExit chain through an "auto" parentExit', async () => {
    const promise = new Promise(() => {});
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <ViewTransition exit="page-exit">
          <div id="A">
            <ViewTransition parentExit="auto">
              <div id="B">
                <ViewTransition parentExit="nested-exit">
                  <div id="C">Deep</div>
                </ViewTransition>
              </div>
            </ViewTransition>
          </div>
        </ViewTransition>
      );
      return (
        <div>
          <Suspense fallback={fallback}>
            <Suspend />
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    // An "auto" parentExit emits no annotation of its own but still relays, so
    // the deep child (C) is annotated.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div id="A" vt-update="auto" vt-exit="page-exit">
          <div id="B" vt-update="auto">
            <div id="C" vt-update="auto" vt-parent-exit="nested-exit">
              Deep
            </div>
          </div>
        </div>
      </div>,
    );
  });

  // @gate enableViewTransition && enableViewTransitionParentEnterExit
  it('relays the parentExit chain through a handler-only ViewTransition', async () => {
    const promise = new Promise(() => {});
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <ViewTransition exit="page-exit">
          <div id="A">
            <ViewTransition onParentExit={() => {}}>
              <div id="B">
                <ViewTransition parentExit="nested-exit">
                  <div id="C">Deep</div>
                </ViewTransition>
              </div>
            </ViewTransition>
          </div>
        </ViewTransition>
      );
      return (
        <div>
          <Suspense fallback={fallback}>
            <Suspend />
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });

    // A ViewTransition with only an onParentExit handler (no class) emits no
    // annotation but still relays, just like the client runtime, so the deep
    // child (C) is annotated.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div id="A" vt-update="auto" vt-exit="page-exit">
          <div id="B" vt-update="auto">
            <div id="C" vt-update="auto" vt-parent-exit="nested-exit">
              Deep
            </div>
          </div>
        </div>
      </div>,
    );
  });

  // @gate enableViewTransition && enableViewTransitionParentEnterExit
  it('relays the parentEnter chain through a handler-only ViewTransition', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      return (
        <div>
          <Suspense fallback={<div>loading</div>}>
            <ViewTransition enter="page-enter">
              <Suspend />
            </ViewTransition>
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    await serverAct(async () => {
      await resolve(
        <div id="A">
          <ViewTransition onParentEnter={() => {}}>
            <div id="B">
              <ViewTransition parentEnter="nested-enter">
                <div id="C">Deep</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        </div>,
      );
    });

    // A ViewTransition with only an onParentEnter handler still relays, so the
    // deep child (C) is annotated.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div id="A" vt-update="auto" vt-enter="page-enter">
          <div id="B" vt-update="auto">
            <div id="C" vt-update="auto" vt-parent-enter="nested-enter">
              Deep
            </div>
          </div>
        </div>
      </div>,
    );
  });

  // @gate enableViewTransition && enableViewTransitionParentEnterExit
  it('applies view-transition-name to nested parentEnter/parentExit on streaming reveal', async () => {
    // Capture the view transition class applied to each element at the moment
    // the reveal starts a view transition (the names are reverted once it
    // begins, so we read them synchronously here).
    const applied = new Map();
    document.startViewTransition = function (arg) {
      const update = typeof arg === 'function' ? arg : arg.update;
      container.querySelectorAll('*').forEach(el => {
        if (el.id && el.style && el.style.viewTransitionName) {
          applied.set(el.id, el.style.viewTransitionClass);
        }
      });
      if (update) {
        update();
      }
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        skipTransition() {},
        types: [],
      };
    };
    if (!global.window.CSS) {
      global.window.CSS = {escape: s => s};
    }
    Object.defineProperty(document, 'fonts', {
      value: {status: 'loaded', ready: Promise.resolve()},
      configurable: true,
    });
    // The reveal skips a boundary whose parent measures as empty, so give
    // elements a non-zero rect.
    global.window.Element.prototype.getBoundingClientRect = function () {
      return {left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20};
    };

    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Suspend() {
      return React.use(promise);
    }
    function App() {
      const fallback = (
        <ViewTransition exit="page-exit">
          <div id="fbA">
            <ViewTransition parentExit="skeleton-exit">
              <div id="fbC">
                <ViewTransition parentExit="skeleton-exit-deep">
                  <div id="fbD">Loading</div>
                </ViewTransition>
              </div>
            </ViewTransition>
          </div>
        </ViewTransition>
      );
      return (
        <div>
          <Suspense fallback={fallback}>
            <ViewTransition enter="page-enter">
              <Suspend />
            </ViewTransition>
          </Suspense>
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    await serverAct(async () => {
      await resolve(
        <div id="A">
          <ViewTransition parentEnter="nested-enter">
            <div id="C">
              <ViewTransition parentEnter="nested-enter-deep">
                <div id="D">Deep</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        </div>,
      );
    });

    // Top-level enter/exit were already applied by the reveal. The nested parent
    // relay is the new behavior, and it relays through multiple levels: the
    // relay continues through C/fbC (non-none classes) down to D/fbD, matching
    // the client runtime's commitParentEnter/ExitViewTransitions.
    expect(applied.get('A')).toBe('page-enter');
    expect(applied.get('C')).toBe('nested-enter');
    expect(applied.get('D')).toBe('nested-enter-deep');
    expect(applied.get('fbA')).toBe('page-exit');
    expect(applied.get('fbC')).toBe('skeleton-exit');
    expect(applied.get('fbD')).toBe('skeleton-exit-deep');
  });
});

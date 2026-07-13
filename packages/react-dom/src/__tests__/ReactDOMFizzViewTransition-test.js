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
});

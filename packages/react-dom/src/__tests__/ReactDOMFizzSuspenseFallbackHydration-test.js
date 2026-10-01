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

import {getVisibleChildren} from '../test-utils/FizzTestUtils';

let JSDOM;
let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMFizzServer;
let Scheduler;
let Stream;
let Suspense;
let use;
let act;
let assertLog;
let waitForAll;
let document;
let container;
let writable;
let buffer = '';
let hasErrored = false;
let fatalError = undefined;

describe('ReactDOMFizzSuspenseFallbackHydration', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMFizzServer = require('react-dom/server');
    Scheduler = require('scheduler');
    Stream = require('stream');
    Suspense = React.Suspense;
    use = React.use;
    ({act, assertLog, waitForAll} = require('internal-test-utils'));

    const jsdom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body><div id="container">',
      {
        runScripts: 'dangerously',
      },
    );
    document = jsdom.window.document;
    container = document.getElementById('container');

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
    // JSDOM doesn't support stream HTML parser so we need to give it a proper
    // fragment.
    const bufferedContent = buffer;
    buffer = '';
    const fakeBody = document.createElement('body');
    fakeBody.innerHTML = bufferedContent;
    while (fakeBody.firstChild) {
      const node = fakeBody.firstChild;
      if (node.nodeName === 'SCRIPT') {
        const script = document.createElement('script');
        script.textContent = node.textContent;
        fakeBody.removeChild(node);
        container.appendChild(script);
      } else {
        container.appendChild(node);
      }
    }
  }

  function observeRemovedNodes(target) {
    const removed = [];
    const observer = new document.defaultView.MutationObserver(records => {
      for (let i = 0; i < records.length; i++) {
        const removedNodes = records[i].removedNodes;
        for (let j = 0; j < removedNodes.length; j++) {
          removed.push(removedNodes[j]);
        }
      }
    });
    observer.observe(target, {childList: true, subtree: true});
    return {
      takeRecords() {
        const records = observer.takeRecords();
        for (let i = 0; i < records.length; i++) {
          const removedNodes = records[i].removedNodes;
          for (let j = 0; j < removedNodes.length; j++) {
            removed.push(removedNodes[j]);
          }
        }
        observer.disconnect();
        return removed;
      },
    };
  }

  // https://github.com/facebook/react/issues/37620
  // @gate enableBrowserAPI
  it('keeps the server fallback when hydration suspends on a client promise after browser()', async () => {
    const browserOnly = ReactDOM.browser('Only render this in a browser');

    let resolveClientPromise;
    let clientPromise = null;
    function getClientPromise() {
      if (clientPromise === null) {
        clientPromise = new Promise(resolve => {
          resolveClientPromise = resolve;
        });
      }
      return clientPromise;
    }

    function ClientPromise() {
      use(browserOnly);
      const text = use(getClientPromise());
      Scheduler.log(text);
      return <span>{text}</span>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>Loading...</p>}>
            <ClientPromise />
          </Suspense>
        </div>
      );
    }

    const browserBailouts = [];
    await serverAct(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />, {
        onBrowserBailout(error) {
          browserBailouts.push(error);
        },
      });
      pipe(writable);
    });
    expect(browserBailouts).toHaveLength(1);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>Loading...</p>
      </div>,
    );

    // The fallback node the server emitted. Its animation and other DOM state
    // live on this exact node.
    const serverFallback = container.getElementsByTagName('p')[0];
    const mutations = observeRemovedNodes(container);

    const recoverableErrors = [];
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        recoverableErrors.push(error);
      },
    });
    await waitForAll([]);

    // Hydration got past browser() and suspended again on a promise that only
    // exists on the client. All we can show is the same fallback, so we should
    // keep the one that is already in the DOM instead of recreating it.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>Loading...</p>
      </div>,
    );
    const clientFallback = container.getElementsByTagName('p')[0];
    expect(clientFallback).toBe(serverFallback);
    expect(mutations.takeRecords()).not.toContain(serverFallback);

    await act(() => {
      resolveClientPromise('Loaded');
    });
    assertLog(['Loaded']);

    expect(recoverableErrors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>Loaded</span>
      </div>,
    );
  });
});

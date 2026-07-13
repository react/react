/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {
  insertNodesAndExecuteScripts,
  getVisibleChildren,
} from '../test-utils/FizzTestUtils';
import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;

let act;
let serverAct;
let assertLog;
let waitForPaint;
let container;
let React;
let Scheduler;
let ReactDOMServer;
let ReactDOMClient;
let useDeferredValue;
let Suspense;

describe('ReactDOMFizzForm', () => {
  beforeEach(() => {
    jest.resetModules();
    Scheduler = require('scheduler');
    patchMessageChannel();
    act = require('internal-test-utils').act;
    serverAct = require('internal-test-utils').serverAct;
    React = require('react');
    ReactDOMServer = require('react-dom/server.browser');
    ReactDOMClient = require('react-dom/client');
    useDeferredValue = React.useDeferredValue;
    Suspense = React.Suspense;
    assertLog = require('internal-test-utils').assertLog;
    waitForPaint = require('internal-test-utils').waitForPaint;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  async function readIntoContainer(stream) {
    const reader = stream.getReader();
    let result = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      result += Buffer.from(value).toString('utf8');
    }
    const temp = document.createElement('div');
    temp.innerHTML = result;
    insertNodesAndExecuteScripts(temp, container, null);
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  it('returns initialValue argument, if provided', async () => {
    function App() {
      return useDeferredValue('Final', 'Initial');
    }

    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<App />),
    );
    await readIntoContainer(stream);
    expect(container.textContent).toEqual('Initial');

    // After hydration, it's updated to the final value
    await act(() => ReactDOMClient.hydrateRoot(container, <App />));
    expect(container.textContent).toEqual('Final');
  });

  it(
    'useDeferredValue during hydration has higher priority than remaining ' +
      'incremental hydration',
    async () => {
      function B() {
        const text = useDeferredValue('B [Final]', 'B [Initial]');
        return <Text text={text} />;
      }

      function App() {
        return (
          <div>
            <span>
              <Text text="A" />
            </span>
            <Suspense fallback={<Text text="Loading..." />}>
              <span>
                <B />
              </span>
              <div>
                <Suspense fallback={<Text text="Loading..." />}>
                  <span id="C" ref={cRef}>
                    <Text text="C" />
                  </span>
                </Suspense>
              </div>
            </Suspense>
          </div>
        );
      }

      const cRef = React.createRef();

      const stream = await serverAct(() =>
        ReactDOMServer.renderToReadableStream(<App />),
      );
      await readIntoContainer(stream);
      assertLog(['A', 'B [Initial]', 'C']);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <span>A</span>
          <span>B [Initial]</span>
          <div>
            <span id="C">C</span>
          </div>
        </div>,
      );

      const serverRenderedC = document.getElementById('C');

      // On the client, we first hydrate the initial value, then upgrade
      // to final.
      await act(async () => {
        ReactDOMClient.hydrateRoot(container, <App />);

        // First the outermost Suspense boundary hydrates.
        await waitForPaint(['A']);
        expect(cRef.current).toBe(null);

        // Then the next level hydrates. This level includes a useDeferredValue,
        // so we should prioritize upgrading it before we proceed to hydrating
        // additional levels.
        await waitForPaint(['B [Initial]']);
        expect(getVisibleChildren(container)).toEqual(
          <div>
            <span>A</span>
            <span>B [Initial]</span>
            <div>
              <span id="C">C</span>
            </div>
          </div>,
        );
        expect(cRef.current).toBe(null);

        // This paint should only update B. C should still be dehydrated.
        await waitForPaint(['B [Final]']);
        expect(getVisibleChildren(container)).toEqual(
          <div>
            <span>A</span>
            <span>B [Final]</span>
            <div>
              <span id="C">C</span>
            </div>
          </div>,
        );
        expect(cRef.current).toBe(null);
      });
      // Finally we can hydrate C
      assertLog(['C']);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <span>A</span>
          <span>B [Final]</span>
          <div>
            <span id="C">C</span>
          </div>
        </div>,
      );
      expect(cRef.current).toBe(serverRenderedC);
    },
  );
});

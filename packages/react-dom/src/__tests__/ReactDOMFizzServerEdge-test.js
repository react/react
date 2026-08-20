/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.AsyncLocalStorage = require('async_hooks').AsyncLocalStorage;

let React;
let ReactDOM;
let ReactDOMFizzServer;
let Suspense;

describe('ReactDOMFizzServerEdge', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    React = require('react');
    Suspense = React.Suspense;
    ReactDOM = require('react-dom');
    ReactDOMFizzServer = require('react-dom/server.edge');
  });

  async function readResult(stream) {
    const reader = stream.getReader();
    let result = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        return result;
      }
      result += Buffer.from(value).toString('utf8');
    }
  }

  // https://github.com/facebook/react/issues/27540
  it('does not try to write to the stream after it has been closed', async () => {
    async function preloadLate() {
      await 1;
      await 1;
      // need to wait a few microtasks to get the stream to close before this is called
      ReactDOM.preconnect('foo');
    }

    function Preload() {
      preloadLate();
      return null;
    }

    function App() {
      return (
        <html>
          <body>
            <main>hello</main>
            <Preload />
          </body>
        </html>
      );
    }
    const stream = await ReactDOMFizzServer.renderToReadableStream(<App />);
    const result = await readResult(stream);
    // need to wait a macrotask to let the scheduled work from the preconnect to execute
    await new Promise(resolve => {
      setTimeout(resolve, 1);
    });

    if (gate(flags => flags.enableFizzBlockingRender)) {
      expect(result).toMatchInlineSnapshot(
        `"<!DOCTYPE html><html><head><link rel="expect" href="#_R_" blocking="render"/></head><body><main>hello</main><template id="_R_"></template></body></html>"`,
      );
    } else {
      expect(result).toMatchInlineSnapshot(
        `"<!DOCTYPE html><html><head></head><body><main>hello</main></body></html>"`,
      );
    }
  });

  it('recoverably errors and does not add rel="expect" for large shells', async () => {
    function Paragraph() {
      return (
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris
          porttitor tortor ac lectus faucibus, eget eleifend elit hendrerit.
          Integer porttitor nisi in leo congue rutrum. Morbi sed ante posuere,
          aliquam lorem ac, imperdiet orci. Duis malesuada gravida pharetra.
          Cras facilisis arcu diam, id dictum lorem imperdiet a. Suspendisse
          aliquet tempus tortor et ultricies. Aliquam libero velit, posuere
          tempus ante sed, pellentesque tincidunt lorem. Nullam iaculis, eros a
          varius aliquet, tortor felis tempor metus, nec cursus felis eros
          aliquam nulla. Vivamus ut orci sed mauris congue lacinia. Cras eget
          blandit neque. Pellentesque a massa in turpis ullamcorper volutpat vel
          at massa. Sed ante est, auctor non diam non, vulputate ultrices metus.
          Maecenas dictum fermentum quam id aliquam. Donec porta risus vitae
          pretium posuere. Fusce facilisis eros in lacus tincidunt congue.
        </p>
      );
    }

    function App({suspense}) {
      const paragraphs = [];
      for (let i = 0; i < 600; i++) {
        paragraphs.push(<Paragraph key={i} />);
      }
      return (
        <html>
          <body>
            {suspense ? (
              // This is ok
              <Suspense fallback="Loading">{paragraphs}</Suspense>
            ) : (
              // This is not
              paragraphs
            )}
          </body>
        </html>
      );
    }
    const errors = [];
    const stream = await ReactDOMFizzServer.renderToReadableStream(
      <App suspense={false} />,
      {
        onError(error) {
          errors.push(error);
        },
      },
    );
    const result = await readResult(stream);
    expect(result).not.toContain('rel="expect"');
    if (gate(flags => flags.enableFizzBlockingRender)) {
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain(
        'This rendered a large document (>512 kB) without any Suspense boundaries around most of it.',
      );
    } else {
      expect(errors.length).toBe(0);
    }

    // If we wrap in a Suspense boundary though, then it should be ok.
    const errors2 = [];
    const stream2 = await ReactDOMFizzServer.renderToReadableStream(
      <App suspense={true} />,
      {
        onError(error) {
          errors2.push(error);
        },
      },
    );
    const result2 = await readResult(stream2);
    if (gate(flags => flags.enableFizzBlockingRender)) {
      expect(result2).toContain('rel="expect"');
    } else {
      expect(result2).not.toContain('rel="expect"');
    }
    expect(errors2.length).toBe(0);

    // Or if we increase the progressiveChunkSize.
    const errors3 = [];
    const stream3 = await ReactDOMFizzServer.renderToReadableStream(
      <App suspense={false} />,
      {
        progressiveChunkSize: 100000,
        onError(error) {
          errors3.push(error);
        },
      },
    );
    const result3 = await readResult(stream3);
    if (gate(flags => flags.enableFizzBlockingRender)) {
      expect(result3).toContain('rel="expect"');
    } else {
      expect(result3).not.toContain('rel="expect"');
    }
    expect(errors3.length).toBe(0);
  });
});

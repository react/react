/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

/* eslint-disable no-script-url */

'use strict';

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');

let React;
let ReactDOMClient;
let ReactDOMServer;
let act;

const EXPECTED_SAFE_URL =
  "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')";

describe('ReactDOMServerIntegration - Untrusted URLs', () => {
  function initModules() {
    jest.resetModules();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;

    // Make them available to the helpers.
    return {
      ReactDOMClient,
      ReactDOMServer,
    };
  }

  const {
    resetModules,
    itRenders,
    clientCleanRender,
    clientRenderOnBadMarkup,
    clientRenderOnServerString,
  } = ReactDOMServerIntegrationUtils(initModules);

  beforeEach(() => {
    resetModules();
  });

  itRenders('a http link with the word javascript in it', async render => {
    const e = await render(
      <a href="http://javascript:0/thisisfine">Click me</a>,
    );
    expect(e.tagName).toBe('A');
    expect(e.href).toBe('http://javascript:0/thisisfine');
  });

  itRenders('a javascript protocol href', async render => {
    // Only the first one warns. The second warning is deduped.
    const e = await render(
      <div>
        <a href="javascript:notfine">p0wned</a>
        <a href="javascript:notfineagain">p0wned again</a>
      </div>,
    );
    expect(e.firstChild.href).toBe(EXPECTED_SAFE_URL);
    expect(e.lastChild.href).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('sanitizes on various tags', async render => {
    const aElement = await render(<a href="javascript:notfine" />);
    expect(aElement.href).toBe(EXPECTED_SAFE_URL);

    const objectElement = await render(<object data="javascript:notfine" />);
    expect(objectElement.data).toBe(EXPECTED_SAFE_URL);

    const embedElement = await render(<embed src="javascript:notfine" />);
    expect(embedElement.src).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('passes through data on non-object tags', async render => {
    const div = await render(<div data="test" />);
    expect(div.getAttribute('data')).toBe('test');

    const a = await render(<a data="javascript:fine" />);
    expect(a.getAttribute('data')).toBe('javascript:fine');
  });

  itRenders('a javascript protocol with leading spaces', async render => {
    const e = await render(
      <a href={'  \t \u0000\u001F\u0003javascript\n: notfine'}>p0wned</a>,
    );
    // We use an approximate comparison here because JSDOM might not parse
    // \u0000 in HTML properly.
    expect(e.href).toBe(EXPECTED_SAFE_URL);
  });

  itRenders(
    'a javascript protocol with intermediate new lines and mixed casing',
    async render => {
      const e = await render(
        <a href={'\t\r\n Jav\rasCr\r\niP\t\n\rt\n:notfine'}>p0wned</a>,
      );
      expect(e.href).toBe(EXPECTED_SAFE_URL);
    },
  );

  itRenders('a javascript protocol area href', async render => {
    const e = await render(
      <map>
        <area href="javascript:notfine" />
      </map>,
    );
    expect(e.firstChild.href).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('a javascript protocol form action', async render => {
    const e = await render(<form action="javascript:notfine">p0wned</form>);
    expect(e.action).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('a javascript protocol input formAction', async render => {
    const e = await render(
      <input type="submit" formAction="javascript:notfine" />,
    );
    expect(e.getAttribute('formAction')).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('a javascript protocol button formAction', async render => {
    const e = await render(
      <button formAction="javascript:notfine">p0wned</button>,
    );
    expect(e.getAttribute('formAction')).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('a javascript protocol iframe src', async render => {
    const e = await render(<iframe src="javascript:notfine" />);
    expect(e.src).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('a javascript protocol frame src', async render => {
    if (render === clientCleanRender || render === clientRenderOnServerString) {
      // React does not hydrate framesets properly because the default hydration scope
      // is the body
      return;
    }
    const e = await render(
      <html>
        <head />
        <frameset>
          <frame src="javascript:notfine" />
        </frameset>
      </html>,
    );
    expect(e.lastChild.firstChild.src).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('a javascript protocol in an SVG link', async render => {
    const e = await render(
      <svg>
        <a href="javascript:notfine" />
      </svg>,
    );
    expect(e.firstChild.getAttribute('href')).toBe(EXPECTED_SAFE_URL);
  });

  itRenders(
    'a javascript protocol in an SVG link with a namespace',
    async render => {
      const e = await render(
        <svg>
          <a xlinkHref="javascript:notfine" />
        </svg>,
      );
      expect(
        e.firstChild.getAttributeNS('http://www.w3.org/1999/xlink', 'href'),
      ).toBe(EXPECTED_SAFE_URL);
    },
  );

  it('rejects a javascript protocol href if it is added during an update', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<a href="http://thisisfine/">click me</a>);
    });
    expect(container.firstChild.href).toBe('http://thisisfine/');
    await act(() => {
      root.render(<a href="javascript:notfine">click me</a>);
    });
    expect(container.firstChild.href).toBe(EXPECTED_SAFE_URL);
  });

  itRenders('only the first invocation of toString', async render => {
    let expectedToStringCalls = 1;
    if (render === clientRenderOnBadMarkup) {
      // It gets called once on the server and once on the client
      // which happens to share the same object in our test runner.
      expectedToStringCalls = 2;
    }
    if (render === clientRenderOnServerString && __DEV__) {
      // The hydration validation calls it one extra time.
      // TODO: It would be good if we only called toString once for
      // consistency but the code structure makes that hard right now.
      expectedToStringCalls = 4;
    } else if (__DEV__) {
      // Checking for string coercion problems results in double the
      // toString calls in DEV
      expectedToStringCalls *= 2;
    }

    if (gate('enableTrustedTypesIntegration') && render === clientCleanRender) {
      // Trusted types does another toString.
      expectedToStringCalls += 1;
    }

    let toStringCalls = 0;
    const firstIsSafe = {
      toString() {
        // This tries to avoid the validation by pretending to be safe
        // the first times it is called and then becomes dangerous.
        toStringCalls++;
        if (toStringCalls <= expectedToStringCalls) {
          return 'https://reactjs.org/';
        }
        return 'javascript:notfine';
      },
    };

    const e = await render(<a href={firstIsSafe} />);
    expect(toStringCalls).toBe(expectedToStringCalls);
    expect(e.href).toBe('https://reactjs.org/');
  });

  it('rejects a javascript protocol href if it is added during an update twice', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<a href="http://thisisfine/">click me</a>);
    });
    expect(container.firstChild.href).toBe('http://thisisfine/');
    await act(async () => {
      root.render(<a href="javascript:notfine">click me</a>);
    });
    expect(container.firstChild.href).toBe(EXPECTED_SAFE_URL);
    // The second update ensures that a global flag hasn't been added to the regex
    // which would fail to match the second time it is called.
    await act(async () => {
      root.render(<a href="javascript:notfine">click me</a>);
    });
    expect(container.firstChild.href).toBe(EXPECTED_SAFE_URL);
  });
});

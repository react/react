/**
 * @jest-environment node
 */
'use strict';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let React;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let observer;

const streamOptions = {
  objectMode: true,
};

describe('ReactFlightResultAsyncDebugInfo', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();
    global.console = require('console');

    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      jest.requireActual('react-server-dom-webpack/server.node'),
    );
    ReactServerDOMServer = require('react-server-dom-webpack/server');

    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();

    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/client', () =>
      jest.requireActual('react-server-dom-webpack/client.node'),
    );

    React = require('react');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Stream = require('stream');
  });

  afterEach(() => {
    observer?.disconnect();
    observer = undefined;
  });

  function finishLoadingStream(readable) {
    return new Promise(resolve => {
      if (readable.readableEnded) {
        resolve();
      } else {
        readable.on('end', () => resolve());
      }
    });
  }

  it('adds a description to I/O', async () => {
    async function getData(url) {
      // just wait a macrotask for this call to get picked up
      await new Promise(resolve => {
        setTimeout(() => {
          const fakeResponse = {url};
          resolve(fakeResponse);
        }, 1);
      });
    }

    async function Component() {
      await getData('http://github.com/facebook/react/pulls');
      await getData('http://github.com/facebook/react/pulls/');
      await getData(
        'https://this-is-a-very-long-domain-name-what-happens.app/test',
      );
      await getData(
        'https://github.com/facebook/react/commit/75897c2dcd1dd3a6ca46284dd37e13d22b4b16b4',
      );
      await getData('/this-is-a-very-long-directory-name-what-happens/');
      await getData('/this-is-not');
      return 'Hi, Sebbie';
    }

    const expanded = ReactServerDOMServer.renderToResult(<Component />);
    const stream = ReactServerDOMServer.renderResultToPipeableStream(
      expanded,
      {},
    );

    const readable = new Stream.PassThrough(streamOptions);

    const result = ReactServerDOMClient.createFromNodeStream(
      readable,
      {
        moduleMap: {},
        moduleLoading: {},
      },
      {replayConsoleLogs: true},
    );
    stream.pipe(readable);

    expect(await result).toBe('Hi, Sebbie');

    if (__DEV__ && gate(flags => flags.enableComponentPerformanceTrack)) {
      let gotEntries;
      const hasEntries = new Promise(resolve => {
        gotEntries = resolve;
      });
      const entries = [];
      observer = new PerformanceObserver(list => {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const entry of list.getEntries()) {
          const {name} = entry;
          entries.push({name});
        }
        gotEntries();
      }).observe({type: 'measure'});

      await hasEntries;
      await finishLoadingStream(readable);

      expect(entries).toMatchInlineSnapshot(`
        [
          {
            "name": "\u200bComponent",
          },
          {
            "name": "await getData (…/pulls)",
          },
          {
            "name": "await getData (…/pulls)",
          },
          {
            "name": "await getData (…/test)",
          },
          {
            "name": "await getData (…/75897c2dcd…13d22b4b16b4)",
          },
          {
            "name": "await getData (/this-is-a-…what-happens)",
          },
          {
            "name": "await getData (/this-is-not)",
          },
        ]
      `);
    } else {
      await finishLoadingStream(readable);
    }
  });
});

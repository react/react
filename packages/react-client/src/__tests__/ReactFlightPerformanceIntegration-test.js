/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

const {
  patchMessageChannel,
} = require('../../../../scripts/jest/patchMessageChannel');

describe.each(['webpack', 'turbopack'])(
  'Flight %s performance attribution',
  bundler => {
    let React;
    let server;
    let client;
    let serverAct;
    let measure;
    let originalCreateTask;
    let originalTimeStamp;

    beforeEach(() => {
      jest.resetModules();
      originalCreateTask = console.createTask;
      originalTimeStamp = console.timeStamp;
      console.timeStamp = jest.fn();
      console.createTask = () => ({run: callback => callback()});
      measure = jest.spyOn(performance, 'measure').mockImplementation(() => {});
      let time = 10;
      jest.spyOn(performance, 'now').mockImplementation(() => time++);

      patchMessageChannel(require('scheduler'));
      serverAct = require('internal-test-utils').serverAct;
      jest.mock('react', () => require('react/react.react-server'));
      React = require('react');
      if (bundler === 'webpack') {
        jest.mock('react-server-dom-webpack/server', () =>
          require('react-server-dom-webpack/server.browser'),
        );
        require('react-server-dom-webpack/src/__tests__/utils/WebpackMock');
        server = require('react-server-dom-webpack/server.browser');
      } else {
        jest.mock('react-server-dom-turbopack/server', () =>
          require('react-server-dom-turbopack/server.browser'),
        );
        require('react-server-dom-turbopack/src/__tests__/utils/TurbopackMock');
        server = require('react-server-dom-turbopack/server.browser');
      }

      __unmockReact();
      jest.resetModules();
      client =
        bundler === 'webpack'
          ? require('react-server-dom-webpack/client.browser')
          : require('react-server-dom-turbopack/client.browser');
    });

    afterEach(() => {
      jest.restoreAllMocks();
      console.createTask = originalCreateTask;
      console.timeStamp = originalTimeStamp;
    });

    // @gate __DEV__ && enableProfilerTimer && enableComponentPerformanceTrack
    it('attributes concurrent stream and fetch responses to their own IDs', async () => {
      function Child({label}) {
        return <span>{label}</span>;
      }
      function Page({label}) {
        return <Child label={label} />;
      }

      const streams = await serverAct(() => [
        server.renderToReadableStream(<Page label="first" />, {}),
        server.renderToReadableStream(<Page label="second" />, {}),
      ]);
      const models = await serverAct(() =>
        Promise.all([
          client.createFromReadableStream(streams[0], {
            unstable_requestId: 'first',
          }),
          client.createFromFetch(Promise.resolve({body: streams[1]}), {
            unstable_requestId: 'second',
          }),
        ]),
      );
      expect(models.map(model => model.props.children)).toEqual([
        'first',
        'second',
      ]);

      const entries = measure.mock.calls.map(([name, options]) => [
        name,
        options.detail.react,
      ]);
      expect(entries).toHaveLength(4);
      ['first', 'second'].forEach(requestId => {
        ['Page', 'Child'].forEach(name => {
          expect(entries).toContainEqual([
            '\u200b' + name,
            {
              version: 1,
              requestId,
              kind: 'component',
              outcome: 'completed',
              environment: 'Server',
            },
          ]);
        });
      });
    });
  },
);

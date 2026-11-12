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
    let ReactClient;
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
      ReactClient = require('react');
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
        options.detail.devtools.properties,
      ]);
      expect(entries).toHaveLength(4);
      ['first', 'second'].forEach(requestId => {
        ['Page', 'Child'].forEach(name => {
          expect(entries).toContainEqual([
            '\u200b' + name,
            {
              version: 1,
              requestId,
              transitionId: undefined,
              kind: 'component',
              outcome: 'completed',
              environment: 'Server',
            },
            [['label', JSON.stringify(requestId)]],
          ]);
        });
      });
    });

    // @gate __DEV__ && enableProfilerTimer && enableComponentPerformanceTrack
    it('captures transition IDs when responses are created and restores nested context', async () => {
      function Page({label}) {
        return <span>{label}</span>;
      }

      const expected = [
        ['outer-before', 'outer'],
        ['inner', 'inner'],
        ['unidentified', undefined],
        ['outer-after', 'outer'],
        ['outside', undefined],
      ];
      const streams = await serverAct(() =>
        expected.map(([label]) =>
          server.renderToReadableStream(<Page label={label} />, {}),
        ),
      );
      let resolveFetch;
      const fetchResponse = new Promise(resolve => {
        resolveFetch = resolve;
      });
      const responses = [];
      const models = await serverAct(() => {
        ReactClient.startTransition(
          () => {
            responses.push(
              client.createFromFetch(fetchResponse, {
                unstable_requestId: 'outer-before',
              }),
            );
            ReactClient.startTransition(
              () => {
                responses.push(
                  client.createFromReadableStream(streams[1], {
                    unstable_requestId: 'inner',
                  }),
                );
              },
              {transitionId: 'inner'},
            );
            ReactClient.startTransition(() => {
              responses.push(
                client.createFromReadableStream(streams[2], {
                  unstable_requestId: 'unidentified',
                }),
              );
            });
            responses.push(
              client.createFromReadableStream(streams[3], {
                unstable_requestId: 'outer-after',
              }),
            );
          },
          {transitionId: 'outer'},
        );
        responses.push(
          client.createFromReadableStream(streams[4], {
            unstable_requestId: 'outside',
          }),
        );
        expect(measure).not.toHaveBeenCalled();
        resolveFetch({body: streams[0]});
        return Promise.all(responses);
      });
      expect(models.map(model => model.props.children)).toEqual(
        expected.map(([label]) => label),
      );

      const entries = measure.mock.calls.map(([name, options]) => [
        name,
        options.detail.react,
        options.detail.devtools.properties,
      ]);
      expect(entries).toHaveLength(expected.length);
      expected.forEach(([label, transitionId]) => {
        expect(entries).toContainEqual([
          '\u200bPage',
          {
            version: 1,
            requestId: label,
            transitionId,
            kind: 'component',
            outcome: 'completed',
            environment: 'Server',
          },
          [['label', JSON.stringify(label)]],
        ]);
      });
    });

    // @gate __DEV__ && enableProfilerTimer && enableComponentPerformanceTrack
    it('does not capture transition IDs across an await', async () => {
      function Page() {
        return <span>hello</span>;
      }
      const stream = await serverAct(() =>
        server.renderToReadableStream(<Page />, {}),
      );
      let response;
      await serverAct(() => {
        ReactClient.startTransition(
          async () => {
            await Promise.resolve();
            response = client.createFromReadableStream(stream, {
              unstable_requestId: 'after-await',
            });
          },
          {transitionId: 'transition'},
        );
      });
      const model = await serverAct(() => response);
      expect(model.props.children).toBe('hello');
      expect(measure.mock.calls).toContainEqual([
        '\u200bPage',
        expect.objectContaining({
          detail: expect.objectContaining({
            react: {
              version: 1,
              requestId: 'after-await',
              transitionId: undefined,
              kind: 'component',
              outcome: 'completed',
              environment: 'Server',
            },
          }),
        }),
      ]);
    });

    // @gate __DEV__ && enableProfilerTimer && enableComponentPerformanceTrack
    it('captures transition IDs from useTransition', async () => {
      const ReactNoop = require('react-noop-renderer');
      const {act} = require('internal-test-utils');
      let startTransition;
      function App() {
        [, startTransition] = ReactClient.useTransition();
        return null;
      }
      await act(() => ReactNoop.render(<App />));

      function Page() {
        return <span>hello</span>;
      }
      const stream = await serverAct(() =>
        server.renderToReadableStream(<Page />, {}),
      );
      measure.mockClear();
      let response;
      await act(() => {
        startTransition(
          () => {
            response = client.createFromReadableStream(stream, {
              unstable_requestId: 'request',
            });
          },
          {transitionId: 'hook-transition'},
        );
      });
      const model = await serverAct(() => response);
      expect(model.props.children).toBe('hello');
      expect(measure.mock.calls).toContainEqual([
        '\u200bPage',
        expect.objectContaining({
          detail: expect.objectContaining({
            react: {
              version: 1,
              requestId: 'request',
              transitionId: 'hook-transition',
              kind: 'component',
              outcome: 'completed',
              environment: 'Server',
            },
          }),
        }),
      ]);
    });
  },
);

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

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

if (typeof Blob === 'undefined') {
  global.Blob = require('buffer').Blob;
}
if (typeof File === 'undefined' || typeof FormData === 'undefined') {
  global.File = require('undici').File;
  global.FormData = require('undici').FormData;
}

let act;
let React;
let ReactNoop;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let serverAct;
let getDebugInfo;

describe('ReactFlightResult debug channel', () => {
  beforeEach(() => {
    // Mock performance.now for timing tests
    let time = 10;
    jest.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(time);
    jest.spyOn(performance, 'now').mockImplementation(() => {
      return time++;
    });

    jest.resetModules();
    jest.mock('react', () => require('react/react.react-server'));
    patchSetImmediate();
    ReactServerDOMServer = require('react-server-dom-webpack/server.node');
    serverAct = require('internal-test-utils').serverAct;
    jest.resetModules();
    __unmockReact();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    ReactServerDOMClient = require('react-server-dom-webpack/client.node');
    Stream = require('stream');
    act = require('internal-test-utils').act;

    getDebugInfo = require('internal-test-utils').getDebugInfo.bind(null, {
      useV8Stack: true,
      ignoreRscStreamInfo: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('can render deep but cut off JSX in debug info', async () => {
    function createDeepJSX(n) {
      if (n <= 0) {
        return null;
      }
      return <div>{createDeepJSX(n - 1)}</div>;
    }

    function ServerComponent(props) {
      return <div>not using props</div>;
    }

    const debugReadable = new Stream.PassThrough();
    const debugChannel = new Stream.Duplex({
      read() {},
      write(chunk, encoding, callback) {
        debugReadable.write(chunk, encoding);
        callback();
      },
      final(callback) {
        debugReadable.end();
        callback();
      },
    });

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult({
        root: (
          <ServerComponent>
            {createDeepJSX(100) /* deper than objectLimit */}
          </ServerComponent>
        ),
      }),
    );
    const transport = new Stream.PassThrough();
    await serverAct(() =>
      ReactServerDOMServer.renderResultToPipeableStream(
        result,
        {},
        {
          debugChannel,
        },
      ).pipe(transport),
    );

    await act(async () => {
      const rootModel = await ReactServerDOMClient.createFromNodeStream(
        transport,
        {moduleMap: null, moduleLoading: null, serverModuleMap: null},
        {debugChannel: debugReadable},
      );
      const root = rootModel.root;
      const children = getDebugInfo(root)[1].props.children;
      expect(children.type).toBe('div');
      expect(children.props.children.type).toBe('div');
      ReactNoop.render(root);
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>not using props</div>);
    debugChannel.push(null);
  });
});

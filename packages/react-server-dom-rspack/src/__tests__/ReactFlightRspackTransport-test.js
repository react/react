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

const {installRspackTestManifest} = require('./utils/RspackTestManifest');
const {
  patchMessageChannel,
} = require('../../../../scripts/jest/patchMessageChannel');
const {
  patchSetImmediate,
} = require('../../../../scripts/jest/patchSetImmediate');

describe.each(['node', 'edge', 'browser'])(
  'Rspack %s binary transport',
  runtime => {
    let server;
    let client;
    let rspack;
    let serverAct;
    let assertConsoleErrorDev;

    beforeEach(() => {
      jest.resetModules();
      patchMessageChannel();
      patchSetImmediate();
      ({serverAct, assertConsoleErrorDev} = require('internal-test-utils'));
      jest.mock('react', () => require('react/react.react-server'));
      rspack = installRspackTestManifest();
      // Load preinit before selecting the server host config. Its react-dom
      // entry point installs the browser host config in source tests.
      require('react-dom');
      server = require('react-server-dom-rspack/server.' + runtime);

      jest.resetModules();
      __unmockReact();
      client = require('react-server-dom-rspack/client.edge');
    });

    afterEach(() => {
      rspack.restore();
    });

    it('transports promised subarrays without detaching their shared buffer', async () => {
      const backing = new ArrayBuffer(10000);
      const first = new Uint8Array(backing, 0, 5000).fill(1);
      const second = new Uint8Array(backing, 5000, 5000).fill(2);
      const stream = await serverAct(() =>
        server.renderToReadableStream({
          first: Promise.resolve(first),
          second: Promise.resolve(second),
        }),
      );
      const result = await client.createFromReadableStream(stream);
      expect(await result.first).toEqual(new Uint8Array(5000).fill(1));
      expect(await result.second).toEqual(new Uint8Array(5000).fill(2));
      expect(backing.byteLength).toBe(10000);
    });

    it('rejects reused buffer-spanning views instead of emitting a corrupt response', async () => {
      const backing = new ArrayBuffer(10000);
      const stream = await serverAct(() =>
        server.renderToReadableStream(
          {
            first: new Uint8Array(backing).fill(1),
            second: new Uint8Array(backing),
          },
          {onError() {}},
        ),
      );
      const result = Promise.resolve(client.createFromReadableStream(stream));
      if (
        Object.prototype.hasOwnProperty.call(ArrayBuffer.prototype, 'detached')
      ) {
        await expect(result).rejects.toThrow(
          'Cannot transport a detached buffer.',
        );
      } else {
        const decoded = await result;
        expect(decoded.first).toEqual(new Uint8Array(10000).fill(1));
        expect(decoded.second).toEqual(new Uint8Array(10000).fill(1));
        const warning =
          runtime === 'node'
            ? 'Please upgrade to a modern Node.js version.'
            : runtime === 'edge'
              ? 'Please upgrade to a modern Edge runtime.'
              : 'Please use a modern browser that supports ArrayBuffer.prototype.detached.';
        assertConsoleErrorDev([
          'React copied a partial view into a fresh buffer as a safety precaution because the environment does not implement ArrayBuffer.prototype.detached. ' +
            'This negatively impacts performance. ' +
            warning,
        ]);
      }
    });
  },
);

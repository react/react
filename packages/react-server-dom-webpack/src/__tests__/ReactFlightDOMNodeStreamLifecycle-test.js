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

const {PassThrough} = require('stream');

describe.each(['webpack', 'turbopack', 'parcel', 'esm', 'unbundled'])(
  'Flight Node stream lifecycle (%s)',
  adapter => {
    let createFromStream;

    beforeEach(() => {
      jest.resetModules();
      const {createFromNodeStream} = require(
        'react-server-dom-' +
          adapter +
          (adapter === 'unbundled' ? '/client' : '/client.node'),
      );
      createFromStream = (stream, options) => {
        if (adapter === 'esm') {
          return createFromNodeStream(
            stream,
            'file:///',
            'http://localhost/',
            options,
          );
        }
        if (adapter === 'parcel') {
          return createFromNodeStream(stream, options);
        }
        return createFromNodeStream(
          stream,
          {
            moduleMap: {},
            moduleLoading: null,
            serverModuleMap: null,
          },
          options,
        );
      };
    });

    it('rejects pending models when the readable closes without an error', async () => {
      const stream = new PassThrough();
      const result = createFromStream(stream);
      let rejection;
      result.then(
        () => {},
        error => {
          rejection = error;
        },
      );
      await new Promise(resolve => {
        stream.once('close', resolve);
        stream.destroy();
      });
      expect(rejection).toBeDefined();
      expect(rejection.code).toBe('ERR_STREAM_PREMATURE_CLOSE');
    });

    it('preserves the original stream error', async () => {
      const stream = new PassThrough();
      const error = new Error('read failed');
      const result = Promise.resolve(createFromStream(stream));
      stream.destroy(error);
      await expect(result).rejects.toBe(error);
    });

    it('resolves a model when a stream ends normally', async () => {
      const stream = new PassThrough();
      const result = Promise.resolve(createFromStream(stream));
      stream.end('0:"hello"\n');
      await expect(result).resolves.toBe('hello');
    });

    it('rejects a stream that was already destroyed before reading', async () => {
      const stream = new PassThrough();
      await new Promise(resolve => {
        stream.once('close', resolve);
        stream.destroy();
      });
      await expect(
        Promise.resolve(createFromStream(stream)),
      ).rejects.toMatchObject({
        code: 'ERR_STREAM_PREMATURE_CLOSE',
      });
    });

    it('handles premature debug channel closure only in development', async () => {
      const stream = new PassThrough();
      const debugChannel = new PassThrough();
      const result = Promise.resolve(createFromStream(stream, {debugChannel}));
      debugChannel.destroy();
      if (__DEV__) {
        await expect(result).rejects.toMatchObject({
          code: 'ERR_STREAM_PREMATURE_CLOSE',
        });
      } else {
        stream.end('0:"hello"\n');
        await expect(result).resolves.toBe('hello');
      }
      stream.destroy();
    });

    it('waits for data after the debug channel ends and closes normally', async () => {
      const stream = new PassThrough();
      const debugChannel = new PassThrough();
      const result = Promise.resolve(createFromStream(stream, {debugChannel}));
      // Production ignores the debug channel, so consume its readable side.
      debugChannel.resume();
      await new Promise(resolve => {
        debugChannel.once('close', resolve);
        debugChannel.end();
      });
      stream.end('0:"hello"\n');
      await expect(result).resolves.toBe('hello');
    });
  },
);

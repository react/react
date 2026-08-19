/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {installRspackTestManifest} = require('./RspackTestManifest');

function describeRspackReplySecurityTests(
  loadServer,
  loadClient,
  supportsAsyncIterable = true,
) {
  let ReactServerDOMServer;
  let ReactServerDOMClient;
  let rspack;

  describe('ReactFlightRspackReply security behavior', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.mock('react', () => require('react/react.react-server'));
      rspack = installRspackTestManifest();
      ReactServerDOMServer = loadServer();

      jest.resetModules();
      __unmockReact();
      ReactServerDOMClient = loadClient();
    });

    afterEach(() => {
      rspack.restore();
    });

    it('uses only the last action when a submitter overrides the form action', async () => {
      const body = new FormData();
      body.append('message', 'hello');
      for (let i = 0; i < 7; i++) {
        const actionId = 'overridden-' + i;
        rspack.registerErroredServerAction(
          actionId,
          new Error('An overridden action must not be loaded.'),
        );
        body.append('$ACTION_ID_' + actionId, '');
      }
      rspack.registerServerAction('submitter', formData => {
        return 'submitter:' + formData.get('message');
      });
      body.append('$ACTION_ID_submitter', '');

      const action = await ReactServerDOMServer.decodeAction(body);

      expect(await action()).toBe('submitter:hello');
      expect(rspack.getModuleLoadCount()).toBe(1);
    });

    it('lazily decodes only the last bound action and form state metadata', async () => {
      rspack.registerServerAction('submitter', (state, formData) => {
        return `${state}:${formData.get('message')}`;
      });

      const body = new FormData();
      body.append('message', 'hello');
      body.append('$ACTION_invalid:0', '{');
      body.append('$ACTION_REF_invalid', '');

      const metadata = await ReactServerDOMClient.encodeReply({
        id: 'submitter',
        bound: Promise.resolve(['initial-state']),
      });
      if (typeof metadata === 'string') {
        body.append('$ACTION_selected:0', metadata);
      } else {
        metadata.forEach((value, key) => {
          body.append('$ACTION_selected:' + key, value);
        });
      }
      body.append('$ACTION_REF_selected', '');
      body.append('$ACTION_KEY', 'state-key');

      const action = await ReactServerDOMServer.decodeAction(body);
      expect(await action()).toBe('initial-state:hello');
      expect(rspack.getModuleLoadCount()).toBe(1);
      await expect(
        ReactServerDOMServer.decodeFormState('result', body),
      ).resolves.toEqual(['result', 'state-key', 'submitter', 0]);
    });

    it('returns null synchronously when a form has no action metadata', () => {
      const body = new FormData();
      body.append('message', 'hello');

      expect(ReactServerDOMServer.decodeAction(body)).toBe(null);
    });

    it('rejects a Blob reference whose backing entry is a string', async () => {
      const body = new FormData();
      body.set('1', '-'.repeat(50000));
      body.set('0', JSON.stringify(['$B1']));

      let error;
      try {
        await ReactServerDOMServer.decodeReply(body);
      } catch (x) {
        error = x;
      }

      expect(error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Referenced Blob is not a Blob.'),
        }),
      );
    });

    it('round trips cyclic objects and arrays without duplicating them', async () => {
      const cyclicObject = {self: null};
      cyclicObject.self = cyclicObject;
      const cyclicArray = [cyclicObject];
      cyclicArray.push(cyclicArray);

      const body = await ReactServerDOMClient.encodeReply({
        cyclicObject,
        cyclicArray,
      });
      const result = await ReactServerDOMServer.decodeReply(body);

      expect(result.cyclicObject.self).toBe(result.cyclicObject);
      expect(result.cyclicArray[0]).toBe(result.cyclicObject);
      expect(result.cyclicArray[1]).toBe(result.cyclicArray);
    });

    it('marks collection models consumed before hostile iteration', async () => {
      const nativeIterator = Array.prototype[Symbol.iterator];
      const iteratorSpy = jest
        .spyOn(Array.prototype, Symbol.iterator)
        .mockImplementation(function () {
          const isMapModel =
            this.length === 1 &&
            Array.isArray(this[0]) &&
            this[0][0] === 'map-marker';
          const isSetOrIteratorModel =
            this.length === 2 &&
            (this[0] === 'set-marker' || this[0] === 'iterator-marker');
          if (
            (isMapModel || isSetOrIteratorModel) &&
            !Object.prototype.hasOwnProperty.call(this, '$$consumed')
          ) {
            throw new Error(
              'Collection model was consumed before it was marked.',
            );
          }
          return nativeIterator.call(this);
        });

      try {
        const cases = [
          ['$Q1', '[["map-marker","$Q1"]]', 'Already initialized Map.'],
          ['$W1', '["set-marker","$W1"]', 'Already initialized Set.'],
          ['$i1', '["iterator-marker","$i1"]', 'Already initialized Iterator.'],
        ];
        for (let i = 0; i < cases.length; i++) {
          const [root, model, expectedError] = cases[i];
          const body = new FormData();
          body.append('0', JSON.stringify(root));
          body.append('1', model);
          await expect(ReactServerDOMServer.decodeReply(body)).rejects.toThrow(
            expectedError,
          );
        }
      } finally {
        iteratorSpy.mockRestore();
      }
    });

    it('does not materialize an own __proto__ property from a reply', async () => {
      const body = new FormData();
      body.set('0', '{"safe":true,"__proto__":{"polluted":true}}');

      const result = await ReactServerDOMServer.decodeReply(body);

      expect(result).toEqual({safe: true});
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect({}.polluted).toBe(undefined);
    });

    if (supportsAsyncIterable) {
      it('throws once into a failed async iterator for either settlement', async () => {
        await Promise.all(
          [false, true].map(async throwRejects => {
            const failure = new Error('input failed');
            let throwCount = 0;
            const iterable = {
              [Symbol.asyncIterator]() {
                return {
                  next() {
                    return Promise.reject(failure);
                  },
                  throw(reason) {
                    throwCount++;
                    if (throwCount > 1) {
                      return new Promise(() => {});
                    }
                    return throwRejects
                      ? Promise.reject(reason)
                      : Promise.resolve();
                  },
                };
              },
            };

            await expect(
              ReactServerDOMServer.decodeReplyFromAsyncIterable(iterable),
            ).rejects.toThrow('input failed');
            await Promise.resolve();
            await Promise.resolve();

            expect(throwCount).toBe(1);
          }),
        );
      });
    }

    it('enforces a caller-provided array size limit', async () => {
      const body = new FormData();
      body.set('0', JSON.stringify([[0, 1]]));

      await expect(
        ReactServerDOMServer.decodeReply(body, {arraySizeLimit: 3}),
      ).rejects.toThrow('Maximum array nesting exceeded');
    });

    if (supportsAsyncIterable) {
      it('enforces the array size limit for async iterable replies', async () => {
        const iterable = {
          async *[Symbol.asyncIterator]() {
            yield ['0', JSON.stringify([[0, 1]])];
          },
        };

        await expect(
          ReactServerDOMServer.decodeReplyFromAsyncIterable(iterable, {
            arraySizeLimit: 3,
          }),
        ).rejects.toThrow('Maximum array nesting exceeded');
      });
    }
  });
}

exports.describeRspackReplySecurityTests = describeRspackReplySecurityTests;

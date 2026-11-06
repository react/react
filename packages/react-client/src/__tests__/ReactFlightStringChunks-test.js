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

describe('processStringChunk', () => {
  let createResponse;
  let createStreamState;
  let processStringChunk;
  let getRoot;
  let close;

  beforeEach(() => {
    jest.resetModules();
    const ReactFlightClient = require('react-client/flight');
    const client = ReactFlightClient({
      createStringDecoder() {
        return new TextEncoder();
      },
      readPartialStringChunk(decoder, buffer) {
        return decoder.decode(buffer, {stream: true});
      },
      readFinalStringChunk(decoder, buffer) {
        return decoder.decode(buffer);
      },
      resolveClientReference(bundlerConfig, idx) {
        return idx;
      },
      prepareDestinationForModule(moduleLoading, metadata) {},
      preloadModule(idx) {},
      requireModule(idx) {
        return {};
      },
      bindToConsole(methodName, args) {
        return Function.prototype.bind.apply(
          console[methodName],
          [console].concat(args),
        );
      },
      checkEvalAvailabilityOnceDev() {},
    });
    createResponse = client.createResponse;
    createStreamState = client.createStreamState;
    processStringChunk = client.processStringChunk;
    getRoot = client.getRoot;
    close = client.close;
  });

  function createTestResponse() {
    return createResponse(
      null, // bundlerConfig
      null, // serverReferenceConfig
      null, // moduleLoading
      null, // callServer
      null, // encodeFormAction
      null, // nonce
      null, // temporaryReferences
      false, // allowPartialStream
    );
  }

  it('resolves a large string row with a matching declared byte length', async () => {
    const response = createTestResponse();
    const streamState = createStreamState(response, null);

    processStringChunk(response, streamState, '0:T6,');
    processStringChunk(response, streamState, 'abcdef');
    close(response);

    expect(await getRoot(response)).toBe('abcdef');
  });

  it('rejects a large string row with an impossibly large declared byte length', () => {
    const response = createTestResponse();
    const streamState = createStreamState(response, null);

    processStringChunk(response, streamState, '0:T1000,');
    expect(() => {
      // A one code unit string cannot be 4096 UTF-8 bytes.
      processStringChunk(response, streamState, 'x');
    }).toThrow('String chunks need to be passed in their original shape.');
  });

  it('rejects a large string row with an impossibly small declared byte length', () => {
    const response = createTestResponse();
    const streamState = createStreamState(response, null);

    processStringChunk(response, streamState, '0:T1,');
    expect(() => {
      // A three code unit string is at least three UTF-8 bytes.
      processStringChunk(response, streamState, 'abc');
    }).toThrow('String chunks need to be passed in their original shape.');
  });
});

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

let webpackServerMap;
let busboy;
let ReactServerDOMServer;
let ReactServerDOMClient;

describe('ReactFlightDOMReplyNode', () => {
  beforeEach(() => {
    jest.resetModules();
    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.node'),
    );
    const WebpackMock = require('./utils/WebpackMock');
    webpackServerMap = WebpackMock.webpackServerMap;
    ReactServerDOMServer = require('react-server-dom-webpack/server.node');
    jest.resetModules();
    ReactServerDOMClient = require('react-server-dom-webpack/client.node');

    busboy = require('busboy');
  });

  // Writes the body to busboy as a multipart stream. Blob entries become
  // `filename`-bearing parts so busboy emits them as 'file' events (with
  // streamed data) rather than 'field' events.
  async function pipeBodyToBusboy(bb, body, boundary) {
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const [name, value] of body) {
      if (typeof value === 'string') {
        bb.write(
          `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"\r\n` +
            `\r\n` +
            `${value}\r\n`,
        );
      } else {
        const filename =
          typeof value.name === 'string' && value.name !== ''
            ? value.name
            : 'blob';
        const mimeType =
          typeof value.type === 'string' && value.type !== ''
            ? value.type
            : 'application/octet-stream';
        const buffer = Buffer.from(await value.arrayBuffer());
        bb.write(
          `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
            `Content-Type: ${mimeType}\r\n` +
            `\r\n`,
        );
        bb.write(buffer);
        bb.write('\r\n');
      }
    }
    bb.end(`--${boundary}--\r\n`);
  }

  // FormData iterates entries in insertion order per spec, so a referenced
  // FormData must round-trip with its entry order intact even when files
  // and text fields are interleaved in the payload.
  it('preserves entry order when referenced FormDatas interleave files and text', async () => {
    const a = new FormData();
    a.append('text_a', 'value_a');
    a.append('file_a', new Blob(['content_a'], {type: 'text/plain'}), 'a.txt');
    const b = new FormData();
    b.append('text_b', 'value_b');
    b.append('file_b', new Blob(['content_b'], {type: 'text/plain'}), 'b.txt');

    const body = await ReactServerDOMClient.encodeReply([a, b]);
    const boundary = 'boundary';
    const bb = busboy({
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
    });
    const reply = ReactServerDOMServer.decodeReplyFromBusboy(
      bb,
      webpackServerMap,
    );
    await pipeBodyToBusboy(bb, body, boundary);

    const result = await reply;
    expect(result).toHaveLength(2);
    const [decodedA, decodedB] = result;

    const aEntries = Array.from(decodedA.entries());
    expect(aEntries.map(([k]) => k)).toEqual(['text_a', 'file_a']);
    expect(aEntries[0][1]).toBe('value_a');
    expect(aEntries[1][1]).toBeInstanceOf(File);
    expect(aEntries[1][1].name).toBe('a.txt');

    const bEntries = Array.from(decodedB.entries());
    expect(bEntries.map(([k]) => k)).toEqual(['text_b', 'file_b']);
    expect(bEntries[0][1]).toBe('value_b');
    expect(bEntries[1][1]).toBeInstanceOf(File);
    expect(bEntries[1][1].name).toBe('b.txt');
  });

  // Every entry of a referenced FormData must be present in the decoded
  // FormData regardless of where files appear in its iteration order.
  it('does not drop entries when referenced FormDatas iterate files before text', async () => {
    const a = new FormData();
    a.append('file_a', new Blob(['content_a'], {type: 'text/plain'}), 'a.txt');
    a.append('text_a', 'value_a');
    const b = new FormData();
    b.append('file_b', new Blob(['content_b'], {type: 'text/plain'}), 'b.txt');
    b.append('text_b', 'value_b');

    const body = await ReactServerDOMClient.encodeReply([a, b]);
    const boundary = 'boundary';
    const bb = busboy({
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
    });
    const reply = ReactServerDOMServer.decodeReplyFromBusboy(
      bb,
      webpackServerMap,
    );
    await pipeBodyToBusboy(bb, body, boundary);

    const result = await reply;
    expect(result).toHaveLength(2);
    const [decodedA, decodedB] = result;

    const aKeys = Array.from(decodedA.keys()).sort();
    expect(aKeys).toEqual(['file_a', 'text_a']);
    expect(decodedA.get('text_a')).toBe('value_a');
    expect(decodedA.get('file_a')).toBeInstanceOf(File);

    const bKeys = Array.from(decodedB.keys()).sort();
    expect(bKeys).toEqual(['file_b', 'text_b']);
    expect(decodedB.get('text_b')).toBe('value_b');
    expect(decodedB.get('file_b')).toBeInstanceOf(File);
  });
});

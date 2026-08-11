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

let busboy;
let ReactServerDOMServer;
let ReactServerDOMClient;
let rspack;

describe('ReactFlightDOMRspackReplyNode', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('react', () => require('react/react.react-server'));
    rspack = installRspackTestManifest();
    ReactServerDOMServer = require('react-server-dom-rspack/server.node');

    jest.resetModules();
    __unmockReact();
    ReactServerDOMClient = require('react-server-dom-rspack/client.browser');
    busboy = require('busboy');
  });

  afterEach(() => {
    rspack.restore();
  });

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

  function createBusboy(boundary) {
    return busboy({
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
    });
  }

  it('preserves interleaved file and field order in referenced FormData', async () => {
    const first = new FormData();
    first.append(
      'first-file',
      new Blob(['first-content'], {type: 'text/plain'}),
      'first.txt',
    );
    first.append('first-text', 'first-value');
    const second = new FormData();
    second.append(
      'second-file',
      new Blob(['second-content'], {type: 'text/plain'}),
      'second.txt',
    );
    second.append('second-text', 'second-value');

    const body = await ReactServerDOMClient.encodeReply([first, second]);
    const boundary = 'rspack-reply-boundary';
    const bb = createBusboy(boundary);
    const reply = ReactServerDOMServer.decodeReplyFromBusboy(bb);
    await pipeBodyToBusboy(bb, body, boundary);

    const [decodedFirst, decodedSecond] = await reply;
    expect(Array.from(decodedFirst.keys())).toEqual([
      'first-file',
      'first-text',
    ]);
    expect(decodedFirst.get('first-text')).toBe('first-value');
    expect(decodedFirst.get('first-file').name).toBe('first.txt');
    expect(Array.from(decodedSecond.keys())).toEqual([
      'second-file',
      'second-text',
    ]);
    expect(decodedSecond.get('second-text')).toBe('second-value');
    expect(decodedSecond.get('second-file').name).toBe('second.txt');
  });

  it('preserves text before file order across referenced FormDatas', async () => {
    const first = new FormData();
    first.append('first-text', 'first-value');
    first.append(
      'first-file',
      new Blob(['first-content'], {type: 'text/plain'}),
      'first.txt',
    );
    const second = new FormData();
    second.append('second-text', 'second-value');
    second.append(
      'second-file',
      new Blob(['second-content'], {type: 'text/plain'}),
      'second.txt',
    );

    const body = await ReactServerDOMClient.encodeReply([first, second]);
    const boundary = 'rspack-text-file-boundary';
    const bb = createBusboy(boundary);
    const reply = ReactServerDOMServer.decodeReplyFromBusboy(bb);
    await pipeBodyToBusboy(bb, body, boundary);

    const [decodedFirst, decodedSecond] = await reply;
    expect(Array.from(decodedFirst.keys())).toEqual([
      'first-text',
      'first-file',
    ]);
    expect(decodedFirst.get('first-text')).toBe('first-value');
    expect(decodedFirst.get('first-file').name).toBe('first.txt');
    expect(Array.from(decodedSecond.keys())).toEqual([
      'second-text',
      'second-file',
    ]);
    expect(decodedSecond.get('second-text')).toBe('second-value');
    expect(decodedSecond.get('second-file').name).toBe('second.txt');
  });

  it('enforces the array size limit for Busboy replies', async () => {
    const body = new FormData();
    body.set('0', JSON.stringify([[0, 1]]));
    const boundary = 'rspack-array-limit-boundary';
    const bb = createBusboy(boundary);
    const reply = ReactServerDOMServer.decodeReplyFromBusboy(bb, {
      arraySizeLimit: 3,
    });
    await pipeBodyToBusboy(bb, body, boundary);

    await expect(reply).rejects.toThrow('Maximum array nesting exceeded');
  });
});

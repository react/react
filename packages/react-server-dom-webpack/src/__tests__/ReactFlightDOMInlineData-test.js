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

// The react-server-dom-webpack/client.browser build patches webpack's chunk
// resolution at module scope, so the webpack runtime global must exist
// before it loads.
global.__webpack_require__ = function () {};

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let React;
let ReactDOMFizzServer;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let ReactServerDOMClientBrowser;
let Stream;
let serverAct;

describe('ReactFlightDOMInlineData', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      jest.requireActual('react-server-dom-webpack/server.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-webpack/server');

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/client', () =>
      jest.requireActual('react-server-dom-webpack/client.node'),
    );

    React = require('react');
    ReactDOMFizzServer = require('react-dom/server.node');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    ReactServerDOMClientBrowser = require('react-server-dom-webpack/client.browser');
    Stream = require('stream');

    delete globalThis.$RF;
  });

  afterEach(() => {
    delete globalThis.$RF;
  });

  function readResult(stream) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const writable = new Stream.PassThrough();
      writable.setEncoding('utf8');
      writable.on('data', chunk => {
        buffer += chunk;
      });
      writable.on('error', reject);
      writable.on('end', () => resolve(buffer));
      stream.pipe(writable);
    });
  }

  // The receiver arguments Fizz writes are valid JSON (string, ["base64"],
  // or null), so the document's data channel can be replayed without a DOM
  // by parsing each argument back out of the script text.
  function extractInlineData(html) {
    const chunks = [];
    const re = /\$RF\(/g;
    let match;
    while ((match = re.exec(html)) !== null) {
      const start = match.index + match[0].length;
      const end = html.indexOf(')</script>', start);
      // The escaped script content is still valid JSON.
      chunks.push(JSON.parse(html.slice(start, end)));
      re.lastIndex = end;
    }
    return chunks;
  }

  // Executes the channel-init script the way a document parser would, so
  // the replay goes through the real receiver definition.
  function installReceiverFromDocument(html) {
    const match = html.match(/<script[^>]*>(self\.\$RF=[^<]*)<\/script>/);
    if (match === null) {
      throw new Error('The document does not define the inline data channel.');
    }
    // eslint-disable-next-line no-new-func
    new Function('self', match[1])(globalThis);
  }

  async function renderDocumentWithInlineData(model) {
    const flight = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, null),
    );
    const flightStream = new Stream.PassThrough();
    flight.pipe(flightStream);
    const htmlStream = await serverAct(
      () =>
        new Promise(resolve => {
          const s = ReactDOMFizzServer.renderToPipeableStream(
            React.createElement('main', null, 'shell'),
            {
              inlineData:
                ReactServerDOMClient.createInlineDataSource(flightStream),
              onShellReady() {
                resolve(s);
              },
            },
          );
        }),
    );
    return readResult(htmlStream);
  }

  async function renderDocumentWithInlineDataFromRender(model) {
    const htmlStream = await serverAct(
      () =>
        new Promise(resolve => {
          // The rows subscription must attach synchronously after render(),
          // so build the source before Fizz starts flushing.
          const result = ReactServerDOMServer.render(model, null);
          const source = ReactServerDOMClient.createInlineDataSource(result);
          const s = ReactDOMFizzServer.renderToPipeableStream(
            React.createElement('main', null, 'shell'),
            {
              inlineData: source,
              onShellReady() {
                resolve(s);
              },
            },
          );
        }),
    );
    return readResult(htmlStream);
  }

  it('round-trips a model through the document', async () => {
    // Adversarial content: script-close sequences, quotes, multibyte, the
    // line terminators JSON permits raw but old JS string literals do not,
    // and a string long enough to leave the row as a length-framed text row.
    const longText =
      '</script><script>alert(1)</script> ✓🙃 "x" '.repeat(40) + '\u2028\u2029';
    const model = {
      element: ReactServer.createElement('p', {className: 'a'}, 'hello'),
      text: longText,
      short: '</script>',
      // A framework transform scanning the byte stream for the document
      // suffix must never find it inside payload text.
      suffix: '</body></html>',
      numbers: [1, 2.5, -3, null, true],
    };
    const html = await renderDocumentWithInlineData(model);

    // The document stays parseable: no live script-close sequences inside
    // the data scripts beyond the real ones.
    const chunks = extractInlineData(html);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1]).toBe(null);
    // The line terminators travel escaped, never raw.
    expect(html).not.toContain('\u2028');
    expect(html).not.toContain('\u2029');

    // Replay through the document channel: queue chunks like a parsed
    // document would, then attach the reader.
    installReceiverFromDocument(html);
    for (let i = 0; i < chunks.length - 1; i++) {
      globalThis.$RF(chunks[i]);
    }
    const response = ReactServerDOMClientBrowser.createFromInlineData();
    // The close marker arrives like a late script would.
    globalThis.$RF(null);
    const result = await response;
    expect(result.text).toBe(longText);
    expect(result.short).toBe('</script>');
    expect(result.suffix).toBe('</body></html>');
    // The document's data scripts carry no raw `<` at all.
    const dataScripts = html.match(/\$RF\("(?:[^"\\]|\\.)*"\)/g) || [];
    expect(dataScripts.length).toBeGreaterThan(0);
    for (let i = 0; i < dataScripts.length; i++) {
      expect(dataScripts[i]).not.toContain('<');
    }
    expect(result.numbers).toEqual([1, 2.5, -3, null, true]);
    expect(result.element.type).toBe('p');
    expect(result.element.props.className).toBe('a');
    expect(result.element.props.children).toBe('hello');
  });

  it('round-trips binary rows as base64 pushes', async () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 250, 255, 128, 64]);
    const model = {buffer: bytes};
    const html = await renderDocumentWithInlineData(model);
    const chunks = extractInlineData(html);
    // At least one binary push (single-element array form).
    expect(chunks.some(c => Array.isArray(c))).toBe(true);
    installReceiverFromDocument(html);
    for (let i = 0; i < chunks.length - 1; i++) {
      globalThis.$RF(chunks[i]);
    }
    const response = ReactServerDOMClientBrowser.createFromInlineData();
    globalThis.$RF(null);
    const result = await response;
    expect(Array.from(result.buffer)).toEqual(Array.from(bytes));
  });

  it('streams pushes that arrive after the reader attached', async () => {
    const model = {greeting: 'late'};
    const html = await renderDocumentWithInlineData(model);
    const chunks = extractInlineData(html);
    // Reader first, document later: every chunk arrives through the
    // replaced receiver.
    installReceiverFromDocument(html);
    const response = ReactServerDOMClientBrowser.createFromInlineData();
    for (let i = 0; i < chunks.length; i++) {
      globalThis.$RF(chunks[i]);
    }
    const result = await response;
    expect(result.greeting).toBe('late');
  });

  it('keeps the document open until the data closes', async () => {
    // The flight stream outlives Fizz's own work: the document must not
    // close before the data does.
    const flightStream = new Stream.PassThrough();
    const htmlStream = await serverAct(
      () =>
        new Promise(resolve => {
          const s = ReactDOMFizzServer.renderToPipeableStream(
            React.createElement('main', null, 'shell'),
            {
              inlineData:
                ReactServerDOMClient.createInlineDataSource(flightStream),
              onShellReady() {
                resolve(s);
              },
            },
          );
        }),
    );
    let html = '';
    let ended = false;
    const out = new Stream.PassThrough();
    out.setEncoding('utf8');
    out.on('data', c => {
      html += c;
    });
    out.on('end', () => {
      ended = true;
    });
    htmlStream.pipe(out);
    await serverAct(() => {
      flightStream.write('0:"still going"\n');
    });
    expect(ended).toBe(false);
    await serverAct(() => {
      flightStream.end();
    });
    if (!ended) {
      await new Promise(resolve => out.on('end', resolve));
    }
    expect(html).toContain('still going');
    expect(html).toContain('$RF(null)');
  });

  it('delivers short rows promptly instead of buffering to the cap', async () => {
    const flightStream = new Stream.PassThrough();
    const htmlStream = await serverAct(
      () =>
        new Promise(resolve => {
          const s = ReactDOMFizzServer.renderToPipeableStream(
            React.createElement('main', null, 'shell'),
            {
              inlineData:
                ReactServerDOMClient.createInlineDataSource(flightStream),
              onShellReady() {
                resolve(s);
              },
            },
          );
        }),
    );
    let html = '';
    const out = new Stream.PassThrough();
    out.setEncoding('utf8');
    out.on('data', c => {
      html += c;
    });
    htmlStream.pipe(out);
    await serverAct(() => {
      flightStream.write('0:"prompt"\n');
    });
    // Far below the segment cap, but already in the document.
    expect(html).toContain('prompt');
    await serverAct(() => flightStream.end());
  });

  it('carries a text row split mid-character into a binary row', async () => {
    // The multi-byte character straddles the chunk boundary and the next
    // chunk begins a binary row: the held-back bytes must not be lost.
    const model = {text: 'end✓', buffer: new Uint8Array([254, 255, 1, 2])};
    const flight = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, null),
    );
    const chunks = [];
    const collect = new Stream.PassThrough();
    collect.on('data', c => chunks.push(Buffer.from(c)));
    flight.pipe(collect);
    await new Promise(resolve => collect.on('end', resolve));
    const wire = Buffer.concat(chunks);
    // Split inside the checkmark (3 bytes) right before the binary row.
    const checkmark = Buffer.from('✓', 'utf8');
    const mark = wire.indexOf(checkmark);
    expect(mark).toBeGreaterThan(-1);
    const replayed = new Stream.PassThrough();
    const htmlStream = await serverAct(
      () =>
        new Promise(resolve => {
          const s = ReactDOMFizzServer.renderToPipeableStream(
            React.createElement('main', null, 'shell'),
            {
              inlineData: ReactServerDOMClient.createInlineDataSource(replayed),
              onShellReady() {
                resolve(s);
              },
            },
          );
        }),
    );
    const htmlPromise = readResult(htmlStream);
    await serverAct(() => {
      replayed.write(wire.subarray(0, mark + 1));
      replayed.write(wire.subarray(mark + 1));
      replayed.end();
    });
    const html = await htmlPromise;
    const chunksOut = extractInlineData(html);
    installReceiverFromDocument(html);
    for (let i = 0; i < chunksOut.length - 1; i++) {
      globalThis.$RF(chunksOut[i]);
    }
    const response = ReactServerDOMClientBrowser.createFromInlineData();
    globalThis.$RF(null);
    const result = await response;
    expect(result.text).toBe('end✓');
    expect(Array.from(result.buffer)).toEqual([254, 255, 1, 2]);
  });

  it('allows only one reader per document', async () => {
    const model = {value: 1};
    const html = await renderDocumentWithInlineData(model);
    const chunks = extractInlineData(html);
    installReceiverFromDocument(html);
    for (let i = 0; i < chunks.length - 1; i++) {
      globalThis.$RF(chunks[i]);
    }
    ReactServerDOMClientBrowser.createFromInlineData();
    expect(() => {
      ReactServerDOMClientBrowser.createFromInlineData();
    }).toThrow('The inline data channel already has a reader.');
  });

  it('throws when the document has no inline data channel', () => {
    expect(() => {
      ReactServerDOMClientBrowser.createFromInlineData();
    }).toThrow('This document does not have an inline data channel.');
  });

  it('rejects a second reader even after the channel closed', async () => {
    const model = {value: 1};
    const html = await renderDocumentWithInlineData(model);
    const chunks = extractInlineData(html);
    installReceiverFromDocument(html);
    for (let i = 0; i < chunks.length; i++) {
      globalThis.$RF(chunks[i]);
    }
    // The whole document already parsed, including the close marker.
    const result = await ReactServerDOMClientBrowser.createFromInlineData();
    expect(result.value).toBe(1);
    expect(() => {
      ReactServerDOMClientBrowser.createFromInlineData();
    }).toThrow('The inline data channel already has a reader.');
  });
  it('takes an object-mode row stream as a source', async () => {
    // A framework may tee the rows door through its own object-mode
    // stream: strings are wire text, buffers are binary row bodies.
    const rows = new Stream.PassThrough({objectMode: true});
    const htmlStream = await serverAct(
      () =>
        new Promise(resolve => {
          const s = ReactDOMFizzServer.renderToPipeableStream(
            React.createElement('main', null, 'shell'),
            {
              inlineData: ReactServerDOMClient.createInlineDataSource(rows),
              onShellReady() {
                resolve(s);
              },
            },
          );
        }),
    );
    const htmlPromise = readResult(htmlStream);
    await serverAct(() => {
      rows.write('1:"text row"\n');
      rows.write(Buffer.from([254, 255, 0, 7]));
      rows.write('2:"after binary"\n');
      rows.end();
    });
    const html = await htmlPromise;
    const chunks = extractInlineData(html);
    // wire order: text, binary body, text, close
    expect(chunks[0]).toBe('1:"text row"\n');
    expect(Array.from(Buffer.from(chunks[1][0], 'base64'))).toEqual([
      254, 255, 0, 7,
    ]);
    expect(chunks[2]).toBe('2:"after binary"\n');
    expect(chunks[3]).toBe(null);
  });

  it('takes a string-emitting byte stream as a source', async () => {
    // setEncoding('utf8') transports deliver the wire as strings.
    const stream = new Stream.PassThrough();
    stream.setEncoding('utf8');
    const htmlStream = await serverAct(
      () =>
        new Promise(resolve => {
          const s = ReactDOMFizzServer.renderToPipeableStream(
            React.createElement('main', null, 'shell'),
            {
              inlineData: ReactServerDOMClient.createInlineDataSource(stream),
              onShellReady() {
                resolve(s);
              },
            },
          );
        }),
    );
    const htmlPromise = readResult(htmlStream);
    await serverAct(() => {
      stream.write('1:"string transport ✓"\n');
      stream.end();
    });
    const html = await htmlPromise;
    const chunks = extractInlineData(html);
    expect(chunks[0]).toBe('1:"string transport ✓"\n');
    expect(chunks[chunks.length - 1]).toBe(null);
  });

  it('round-trips a model through the document from a render result', async () => {
    const longText = '</script></body></html> \u2713\ud83d\ude43 "x" '.repeat(
      200,
    );
    const model = {
      element: ReactServer.createElement('p', {className: 'a'}, 'hello'),
      text: longText,
      buffer: new Uint8Array([0, 1, 250, 255]),
      numbers: [1, 2.5, -3, null, true],
    };
    const html = await renderDocumentWithInlineDataFromRender(model);
    const chunks = extractInlineData(html);
    expect(chunks[chunks.length - 1]).toBe(null);
    // Zero-decode row delivery keeps segments under the cap and aligned to
    // row boundaries where rows fit (length-framed rows carry no newline,
    // so boundary alignment is only observable on delimited rows).
    const textChunks = chunks.filter(c => typeof c === 'string');
    expect(textChunks.length).toBeGreaterThan(1);
    expect(textChunks.every(c => c.length <= 4096)).toBe(true);
    expect(textChunks.some(c => c.endsWith('\n'))).toBe(true);
    installReceiverFromDocument(html);
    for (let i = 0; i < chunks.length; i++) {
      globalThis.$RF(chunks[i]);
    }
    const result = await ReactServerDOMClientBrowser.createFromInlineData();
    expect(result.text).toBe(longText);
    expect(Array.from(result.buffer)).toEqual([0, 1, 250, 255]);
    expect(result.numbers).toEqual([1, 2.5, -3, null, true]);
    expect(result.element.type).toBe('p');
    expect(result.element.props.children).toBe('hello');
  });

  it('carries the same payload from a render result as from its byte stream', async () => {
    function makeModel() {
      return {
        greeting: 'parity',
        buffer: new Uint8Array([7, 8, 9]),
        text: 'rows ✓ '.repeat(500),
      };
    }
    // Request-specific debug rows (timing) differ between two renders;
    // everything else must be identical.
    function normalize(payloadChunks) {
      let text = '';
      const decoder = new TextDecoder();
      for (let i = 0; i < payloadChunks.length; i++) {
        const c = payloadChunks[i];
        text += typeof c === 'string' ? c : decoder.decode(c, {stream: true});
      }
      return text
        .split('\n')
        .filter(row => !/^:N/.test(row) && !/^[0-9a-f]+:D\{"time":/.test(row))
        .join('\n');
    }
    const fromStream = await renderDocumentWithInlineData(makeModel());
    const fromRender =
      await renderDocumentWithInlineDataFromRender(makeModel());
    const streamChunks = extractInlineData(fromStream)
      .filter(c => c !== null)
      .map(c => (Array.isArray(c) ? Buffer.from(c[0], 'base64') : c));
    const renderChunks = extractInlineData(fromRender)
      .filter(c => c !== null)
      .map(c => (Array.isArray(c) ? Buffer.from(c[0], 'base64') : c));
    expect(normalize(renderChunks)).toBe(normalize(streamChunks));
  });
});

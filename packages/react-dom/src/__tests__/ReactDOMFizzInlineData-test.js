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
let React, ReactDOMFizz, Stream;
describe('inlineData smoke', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMFizz = require('react-dom/server.node');
    Stream = require('stream');
  });
  it('emits inline data scripts at flush boundaries and a close marker', async () => {
    let consumer;
    const source = {
      subscribe(c) {
        consumer = c;
      },
    };
    function App() {
      return React.createElement('div', null, 'hello <world> & "quotes"');
    }
    const {pipe} = await new Promise(resolve => {
      const s = ReactDOMFizz.renderToPipeableStream(
        React.createElement(App),
        {
          inlineData: source,
          onShellReady() {
            resolve(s);
          },
        },
      );
    });
    const out = new Stream.PassThrough();
    let html = '';
    out.setEncoding('utf8');
    out.on('data', c => (html += c));
    pipe(out);
    // deliver segments after piping started
    consumer.segment('1:["$","div",null,{}]\n');
    consumer.segment('2:"</script><script>alert(1)</script>"\n');
    consumer.segment(new Uint8Array([1, 2, 3, 255]));
    consumer.close();
    await new Promise(resolve => out.on('end', resolve));
    // the shell defines the receiver, segments arrive as calls to it
    expect(html).toContain('self.$RF=function');
    expect(html).toContain('$RF("');
    expect(html).toContain('1:[\\"$\\",\\"div\\",null,{}]');
    // every `<` in payload text is escaped: nothing HTML-significant
    // (script-close, body-close) survives in the data scripts
    expect(html).not.toContain('</script><script>alert');
    expect(html).toContain('\\u003c/script');
    // binary as base64 array
    expect(html).toContain('$RF(["AQID/w=="])');
    // close marker exactly once, after the segments
    const closeIdx = html.indexOf('$RF(null)');
    expect(closeIdx).toBeGreaterThan(-1);
    expect(html.indexOf('$RF(null)', closeIdx + 1)).toBe(-1);
    // the HTML content precedes the data
    expect(html.indexOf('hello')).toBeLessThan(html.indexOf('$RF'));
  });

  it('defines the receiver before the bootstrap scripts', async () => {
    const source = {
      subscribe(c) {
        c.close();
      },
    };
    const {pipe} = await new Promise(resolve => {
      const s = ReactDOMFizz.renderToPipeableStream(
        React.createElement('main', null, 'shell'),
        {
          inlineData: source,
          bootstrapScriptContent: 'window.__BOOT__=typeof self.$RF;',
          onShellReady() {
            resolve(s);
          },
        },
      );
    });
    const out = new Stream.PassThrough();
    let html = '';
    out.setEncoding('utf8');
    out.on('data', c => (html += c));
    pipe(out);
    await new Promise(resolve => out.on('end', resolve));
    // A synchronous bootstrap reader must be able to find the channel.
    expect(html.indexOf('self.$RF=function')).toBeGreaterThan(-1);
    expect(html.indexOf('self.$RF=function')).toBeLessThan(
      html.indexOf('window.__BOOT__'),
    );
  });

  it('never writes data before the shell', async () => {
    let consumer;
    const source = {
      subscribe(c) {
        consumer = c;
      },
    };
    let resolveShell;
    const shellPromise = new Promise(resolve => (resolveShell = resolve));
    function Blocked() {
      React.use(shellPromise);
      return React.createElement('div', null, 'slow shell');
    }
    const s = ReactDOMFizz.renderToPipeableStream(
      React.createElement(Blocked),
      {inlineData: source},
    );
    const out = new Stream.PassThrough();
    let html = '';
    out.setEncoding('utf8');
    out.on('data', c => (html += c));
    s.pipe(out);
    // Data arrives while the shell is still blocked; flush attempts happen.
    consumer.segment('0:"early"\n');
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    expect(html).not.toContain('$RF');
    resolveShell();
    consumer.close();
    await new Promise(resolve => out.on('end', resolve));
    // The shell precedes every data script.
    expect(html.indexOf('slow shell')).toBeGreaterThan(-1);
    expect(html.indexOf('slow shell')).toBeLessThan(html.indexOf('$RF'));
  });

  it('does not stay open for a source that outlives an abort', async () => {
    let consumer;
    const source = {
      subscribe(c) {
        consumer = c;
      },
    };
    const s = ReactDOMFizz.renderToPipeableStream(
      React.createElement('main', null, 'shell'),
      {inlineData: source, onError() {}},
    );
    const out = new Stream.PassThrough();
    let html = '';
    out.setEncoding('utf8');
    out.on('data', c => (html += c));
    const ended = new Promise(resolve => out.on('end', resolve));
    s.pipe(out);
    consumer.segment('0:"before abort"\n');
    await new Promise(resolve => setImmediate(resolve));
    s.abort(new Error('goodbye'));
    // The source never closes; the aborted document must end anyway, and
    // segments delivered after the abort go nowhere.
    consumer.segment('1:"after abort"\n');
    await ended;
    expect(html).toContain('before abort');
    expect(html).not.toContain('after abort');
  });
});

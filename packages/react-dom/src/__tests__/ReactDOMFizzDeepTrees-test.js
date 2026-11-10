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

let Stream;
let React;
let ReactDOMFizzServer;
let Suspense;
let Activity;

// Deep enough to exhaust the JS stack several times over if every level
// stayed on it.
const VERY_DEEP = 4000;

describe('ReactDOMFizzDeepTrees', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMFizzServer = require('react-dom/server');
    Stream = require('stream');
    Suspense = React.Suspense;
    Activity = React.Activity;
  });

  // Renders to completion and returns the HTML as one string. Everything is
  // flushed at once, so content that completed is inlined where it belongs.
  function render(element) {
    return new Promise((resolve, reject) => {
      const errors = [];
      let html = '';
      const writable = new Stream.PassThrough();
      writable.setEncoding('utf8');
      writable.on('data', chunk => {
        html += chunk;
      });
      writable.on('end', () => resolve({html, errors}));
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(element, {
        onError(error) {
          errors.push(error.message);
        },
        onShellError: reject,
        onAllReady() {
          pipe(writable);
        },
      });
    });
  }

  // Without the depth limit, trees this deep run out of stack. What happens
  // then depends on where exactly that is, so these tests return early when
  // the limit is off instead of asserting on that.

  // Builds the expected HTML iteratively so that the test itself doesn't
  // depend on the stack.
  function nest(depth, open, close, leaf) {
    const opening = [];
    const closing = [];
    for (let n = depth; n > 0; n--) {
      opening.push(open(n));
      closing.push(close(n));
    }
    return opening.join('') + leaf + closing.reverse().join('');
  }

  it('renders the siblings around a very deep child', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    function Level({n}) {
      if (n === 0) {
        return <i>leaf</i>;
      }
      return (
        <div>
          <b>{'before' + n}</b>
          <Level n={n - 1} />
          <u>{'after' + n}</u>
        </div>
      );
    }

    const {html, errors} = await render(<Level n={VERY_DEEP} />);

    expect(errors).toEqual([]);
    expect(html).toBe(
      nest(
        VERY_DEEP,
        n => '<div><b>before' + n + '</b>',
        n => '<u>after' + n + '</u></div>',
        '<i>leaf</i>',
      ),
    );
  });

  it('renders very deep Activity boundaries', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    function Level({n}) {
      if (n === 0) {
        return <i>leaf</i>;
      }
      return (
        <Activity mode="visible">
          <b>{'before' + n}</b>
          <Level n={n - 1} />
        </Activity>
      );
    }

    const {html, errors} = await render(<Level n={VERY_DEEP} />);

    expect(errors).toEqual([]);
    expect(html).toBe(
      nest(
        VERY_DEEP,
        n => '<!--&--><b>before' + n + '</b>',
        () => '<!--/&-->',
        '<i>leaf</i>',
      ),
    );
  });

  it('restores context after a very deep provider', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    const Context = React.createContext('root');

    function Read() {
      return <u>{React.useContext(Context)}</u>;
    }

    function Level({n}) {
      if (n === 0) {
        return <Read />;
      }
      return (
        <div>
          <Context.Provider value={'level' + n}>
            <Level n={n - 1} />
          </Context.Provider>
          <Read />
        </div>
      );
    }

    const {html, errors} = await render(<Level n={VERY_DEEP} />);

    expect(errors).toEqual([]);
    expect(html).toBe(
      nest(
        VERY_DEEP,
        () => '<div>',
        // The sibling after each provider reads the value from the level above.
        n =>
          '<u>' + (n === VERY_DEEP ? 'root' : 'level' + (n + 1)) + '</u></div>',
        '<u>level1</u>',
      ),
    );
  });

  it('completes a Suspense boundary around a very deep tree without rendering the fallback', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    let fallbackRenders = 0;
    function Fallback() {
      fallbackRenders++;
      return 'Loading...';
    }

    // Arrays keep a frame on the stack per level without emitting any HTML,
    // so the boundary stays small enough to be inlined.
    function Level({n}) {
      if (n === 0) {
        return <i>leaf</i>;
      }
      return [null, <Level key="child" n={n - 1} />, null];
    }

    const {html, errors} = await render(
      <div>
        <Suspense fallback={<Fallback />}>
          <Level n={VERY_DEEP} />
        </Suspense>
      </div>,
    );

    expect(errors).toEqual([]);
    expect(html).toBe('<div><!--$--><i>leaf</i><!--/$--></div>');
    expect(fallbackRenders).toBe(0);
  });

  it('renders the same output at every depth', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    function Level({n}) {
      if (n === 0) {
        return <i>leaf</i>;
      }
      return (
        <div>
          <b>{'before' + n}</b>
          <Level n={n - 1} />
          <u>{'after' + n}</u>
        </div>
      );
    }

    // Whatever depth React decides to continue on a fresh stack, the output
    // on either side of it is the same.
    for (let depth = 1; depth <= 200; depth++) {
      const {html, errors} = await render(<Level n={depth} />);
      expect(errors).toEqual([]);
      expect(html).toBe(
        nest(
          depth,
          n => '<div><b>before' + n + '</b>',
          n => '<u>after' + n + '</u></div>',
          '<i>leaf</i>',
        ),
      );
    }
  });

  it('renders an extremely long chain of components', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    // Every time the tree continues in a new task it adds a segment inside
    // the previous one. This is deep enough that writing those out would run
    // out of stack if that was recursive.
    function Level({n}) {
      if (n === 0) {
        return <i>leaf</i>;
      }
      return <Level n={n - 1} />;
    }

    const {html, errors} = await render(<Level n={250000} />);

    expect(errors).toEqual([]);
    expect(html).toBe('<i>leaf</i>');
  });

  it('renders a deep tree in the order that it appears in', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    const depth = 300;
    const log = [];
    function Log({name}) {
      log.push(name);
      return null;
    }
    function Level({n}) {
      if (n === 0) {
        return <Log name="leaf" />;
      }
      return (
        <div>
          <Log name={'before' + n} />
          <Level n={n - 1} />
          <Log name={'after' + n} />
        </div>
      );
    }

    const {errors} = await render(<Level n={depth} />);

    expect(errors).toEqual([]);
    const expected = [];
    for (let n = depth; n > 0; n--) {
      expected.push('before' + n);
    }
    expected.push('leaf');
    for (let n = 1; n <= depth; n++) {
      expected.push('after' + n);
    }
    expect(log).toEqual(expected);
  });

  it('renders the fallback when a deep tree aborts while rendering', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    let abort;
    function Abort() {
      abort('boom');
      return <i>aborted</i>;
    }
    // Nested arrays make the tree deep without making the component stack
    // that's reported with the error long.
    let deep = [<Abort key="abort" />];
    for (let i = 0; i < 100; i++) {
      deep = [deep];
    }

    const errors = [];
    let html = '';
    await new Promise((resolve, reject) => {
      const writable = new Stream.PassThrough();
      writable.setEncoding('utf8');
      writable.on('data', chunk => {
        html += chunk;
      });
      writable.on('end', resolve);
      writable.on('error', reject);
      const stream = ReactDOMFizzServer.renderToPipeableStream(
        <div>
          <Suspense fallback={<p>loading</p>}>
            {deep}
            <b>sibling</b>
          </Suspense>
          <u>after</u>
        </div>,
        {
          onError(error) {
            errors.push(error);
          },
        },
      );
      abort = stream.abort;
      stream.pipe(writable);
    });

    // Only the boundary that was rendering is lost. Everything around it
    // still renders, like it does when the tree isn't deep.
    expect(errors).toEqual(['boom']);
    expect(html).toContain('<p>loading</p>');
    expect(html).toContain('<u>after</u>');
    expect(html).not.toContain('<i>aborted</i>');
  });

  it('generates unique ids in a deep tree', async () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    const depth = 300;
    function Level({n}) {
      const id = React.useId();
      return <div id={id}>{n === 0 ? null : <Level n={n - 1} />}</div>;
    }

    const {html, errors} = await render(<Level n={depth} />);

    expect(errors).toEqual([]);
    const ids = html.match(/id="[^"]*"/g);
    expect(ids.length).toBe(depth + 1);
    expect(new Set(ids).size).toBe(depth + 1);
  });

  it('renders very deep trees with renderToString', () => {
    if (!gate(flags => flags.enableFizzRenderDepthLimit)) {
      return;
    }
    function Level({n}) {
      if (n === 0) {
        return <i>leaf</i>;
      }
      return (
        <div>
          <b>{'before' + n}</b>
          <Level n={n - 1} />
        </div>
      );
    }

    const html = ReactDOMFizzServer.renderToString(<Level n={VERY_DEEP} />);

    expect(html).toBe(
      nest(
        VERY_DEEP,
        n => '<div><b>before' + n + '</b>',
        () => '</div>',
        '<i>leaf</i>',
      ),
    );
  });
});

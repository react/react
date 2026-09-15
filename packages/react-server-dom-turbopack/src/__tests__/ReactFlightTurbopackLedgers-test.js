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

let React;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let serverAct;
let turbopackMap;

const serverConsumerManifest = {moduleMap: null, moduleLoading: null};

describe('ReactFlightTurbopackLedgers', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Load the server entry point for the producer and the client entry point
    // for the consumer.
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      jest.requireActual('react-server-dom-turbopack/server.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    turbopackMap = require('./utils/TurbopackMock').turbopackMap;

    jest.resetModules();
    __unmockReact();
    React = require('react');
    jest.unmock('react-server-dom-turbopack/server');
    jest.mock('react-server-dom-turbopack/client', () =>
      jest.requireActual('react-server-dom-turbopack/client.node'),
    );
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
  });

  async function render(model) {
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(model, turbopackMap),
    );
    return await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
  }

  // @gate enableFlightLedgers
  it('throws when captureLedgers is called outside a Flight render', () => {
    expect(() =>
      ReactServer.captureLedgers('value', [ReactServer.createBitLedger()]),
    ).toThrow(
      'captureLedgers() can only be called in a Server Components environment.',
    );
  });

  // @gate enableFlightLedgers
  it('throws when a ledger total is read on the server', async () => {
    const Dynamic = ReactServer.createBitLedger();
    const attempts = [];

    function Page() {
      return 'page';
    }

    async function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Dynamic]);
      const dynamic = captured.ledgers[0];
      try {
        dynamic.then(() => {});
        attempts.push('no-throw');
      } catch (error) {
        attempts.push(error.message);
      }
      try {
        await dynamic;
        attempts.push('no-throw');
      } catch (error) {
        attempts.push(error.message);
      }
      return captured.data;
    }

    expect(await render(<App />)).toBe('page');
    expect(attempts).toEqual([
      'A ledger total cannot be read in a Server Components environment. ' +
        'Pass it to the client, where it resolves after the response has ' +
        'finished streaming.',
      'A ledger total cannot be read in a Server Components environment. ' +
        'Pass it to the client, where it resolves after the response has ' +
        'finished streaming.',
    ]);
  });

  // @gate enableFlightLedgers
  it('throws when a set entry is not a primitive', async () => {
    const Tags = ReactServer.createSetLedger();
    expect(() => ReactServer.addToLedger(Tags, {foo: 'bar'})).toThrow(
      'Only a primitive can be added to a set ledger.',
    );
    expect(() => ReactServer.addToLedger(Tags, ['tag'])).toThrow(
      'Only a primitive can be added to a set ledger.',
    );
    expect(() => ReactServer.addToLedger(Tags, () => 'tag')).toThrow(
      'Only a primitive can be added to a set ledger.',
    );

    const Dynamic = ReactServer.createBitLedger();
    let dynamic;
    function App() {
      const captured = ReactServer.captureLedgers('page', [Dynamic]);
      dynamic = captured.ledgers[0];
      return captured.data;
    }
    expect(await render(<App />)).toBe('page');
    expect(() => ReactServer.addToLedger(Tags, dynamic)).toThrow(
      'Only a primitive can be added to a set ledger.',
    );
  });

  // @gate enableFlightLedgers
  it('throws when a set entry is a symbol that is not registered', () => {
    const Tags = ReactServer.createSetLedger();
    expect(() => ReactServer.addToLedger(Tags, Symbol('local'))).toThrow(
      'Only a global symbol received from Symbol.for(...) can be added to ' +
        'a set ledger.',
    );
  });

  // Ledger data belongs to the request that captured it. Rendered into a
  // later request it is rejected before its input runs, and the later
  // request's own captures are unaffected.
  // @gate enableFlightLedgers
  it('rejects ledger data from another request before its input runs', async () => {
    const Tags = ReactServer.createSetLedger();
    let foreignData = null;
    let foreignRenders = 0;

    function ForeignPage() {
      foreignRenders++;
      ReactServer.addToLedger(Tags, 'foreign');
      return 'foreign';
    }

    function FirstApp() {
      const captured = ReactServer.captureLedgers(<ForeignPage />, [Tags]);
      // Captured, but never rendered by its own request.
      foreignData = captured.data;
      return 'first';
    }

    expect(await render(<FirstApp />)).toBe('first');

    async function Foreign() {
      // A task of its own, so the rejection stays in this part of the model
      // and the rest keeps rendering.
      await Promise.resolve();
      return foreignData;
    }

    async function Own() {
      ReactServer.addToLedger(Tags, 'own-before');
      await Promise.resolve();
      ReactServer.addToLedger(Tags, 'own-after');
      return 'own';
    }

    function SecondApp() {
      const captured = ReactServer.captureLedgers(<Own />, [Tags]);
      return {bad: <Foreign />, good: captured.data, own: captured.ledgers[0]};
    }

    const errors = [];
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<SecondApp />, turbopackMap, {
        onError(error) {
          errors.push(error.message);
          return 'digest';
        },
      }),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });

    expect(errors).toEqual([
      'Ledger data from another Flight request cannot be rendered.',
    ]);
    expect(foreignRenders).toBe(0);
    expect(Array.from(await result.own).sort()).toEqual([
      'own-after',
      'own-before',
    ]);
  });

  // A ledger total belongs to its request the same way. Serialized into a
  // later request's model it throws before anything reads through it.
  // @gate enableFlightLedgers
  it('rejects a ledger total from another request before anything reads through it', async () => {
    const Tags = ReactServer.createSetLedger();
    let foreignLedger = null;

    function FirstApp() {
      const captured = ReactServer.captureLedgers('first', [Tags]);
      foreignLedger = captured.ledgers[0];
      return captured.data;
    }

    expect(await render(<FirstApp />)).toBe('first');

    async function Foreign() {
      await Promise.resolve();
      return {tags: foreignLedger};
    }

    function Own() {
      ReactServer.addToLedger(Tags, 'own');
      return 'own';
    }

    function SecondApp() {
      const captured = ReactServer.captureLedgers(<Own />, [Tags]);
      return {bad: <Foreign />, good: captured.data, own: captured.ledgers[0]};
    }

    const errors = [];
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<SecondApp />, turbopackMap, {
        onError(error) {
          errors.push(error.message);
          return 'digest';
        },
      }),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain(
      'A ledger total from another Flight request cannot be serialized.',
    );
    expect(result.good).toBe('own');
    expect(Array.from(await result.own)).toEqual(['own']);
  });

  // A repeated declaration is honored twice: each position is its own
  // ledger total, and both resolve to the same total.
  // @gate enableFlightLedgers
  it('gives each repeated declaration of one ledger its own ledger total', async () => {
    const Tags = ReactServer.createSetLedger();
    let distinctOnTheServer = null;

    function Page() {
      ReactServer.addToLedger(Tags, 'shared');
      return 'page';
    }

    function App() {
      const {data, ledgers} = ReactServer.captureLedgers(<Page />, [
        Tags,
        Tags,
      ]);
      distinctOnTheServer = ledgers[0] !== ledgers[1];
      return {page: data, ledgers};
    }

    const result = await render(<App />);
    expect(result.page).toBe('page');
    expect(distinctOnTheServer).toBe(true);
    expect(result.ledgers[0]).not.toBe(result.ledgers[1]);
    expect(Array.from(await result.ledgers[0])).toEqual(['shared']);
    expect(Array.from(await result.ledgers[1])).toEqual(['shared']);
  });

  // @gate enableFlightLedgers
  it('resolves several declared ledgers positionally and independently', async () => {
    const Tags = ReactServer.createSetLedger();
    const Dynamic = ReactServer.createBitLedger();
    const Expiry = ReactServer.createMinLedger();
    const Priority = ReactServer.createMaxLedger();
    const Locales = ReactServer.createSetLedger();

    function Page() {
      ReactServer.addToLedger(Tags, 'a');
      ReactServer.addToLedger(Dynamic);
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [
        Tags,
        Dynamic,
        Expiry,
        Priority,
        Locales,
      ]);
      const [tags, dynamic, expiry, priority, locales] = captured.ledgers;
      return {page: captured.data, tags, dynamic, expiry, priority, locales};
    }

    const result = await render(<App />);
    expect(result.page).toBe('page');
    expect(Array.from(await result.tags)).toEqual(['a']);
    expect(await result.dynamic).toBe(true);
    // Nothing wrote to these three.
    expect(await result.expiry).toBe(undefined);
    expect(await result.priority).toBe(undefined);
    expect(Array.from(await result.locales)).toEqual([]);
  });

  // @gate enableFlightLedgers
  it('round-trips every kind', async () => {
    const Dynamic = ReactServer.createBitLedger();
    const Mask = ReactServer.createMaskLedger();
    const Expiry = ReactServer.createMinLedger();
    const Priority = ReactServer.createMaxLedger();
    const Tags = ReactServer.createSetLedger();

    function Page() {
      ReactServer.addToLedger(Dynamic);
      ReactServer.addToLedger(Mask, 0x80000001);
      ReactServer.addToLedger(Expiry, 10);
      ReactServer.addToLedger(Expiry, 5);
      ReactServer.addToLedger(Priority, -10);
      ReactServer.addToLedger(Priority, 2);
      ReactServer.addToLedger(Tags, undefined);
      ReactServer.addToLedger(Tags, NaN);
      ReactServer.addToLedger(Tags, -0);
      ReactServer.addToLedger(Tags, 0);
      ReactServer.addToLedger(Tags, 12n);
      ReactServer.addToLedger(Tags, Symbol.for('global'));
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [
        Dynamic,
        Mask,
        Expiry,
        Priority,
        Tags,
      ]);
      return {page: captured.data, ledgers: captured.ledgers};
    }

    const result = await render(<App />);
    expect(result.page).toBe('page');
    const [dynamic, mask, expiry, priority, tags] = result.ledgers;
    expect(await dynamic).toBe(true);
    expect(await mask).toBe(0x80000001);
    expect(await expiry).toBe(5);
    expect(await priority).toBe(2);
    // Check membership because Set ledger iteration order is unspecified.
    // The writes of -0 and 0 must produce a single entry.
    const entries = Array.from(await tags);
    expect(entries.length).toBe(5);
    expect(entries).toContain(undefined);
    expect(
      entries.some(entry => typeof entry === 'number' && isNaN(entry)),
    ).toBe(true);
    expect(entries.some(entry => Object.is(entry, 0))).toBe(true);
    expect(entries.some(entry => entry === 12n)).toBe(true);
    expect(entries).toContain(Symbol.for('global'));
  });

  // A ledger total decodes as an ordinary promise, so it composes with
  // `await`, `use` and Suspense with no new vocabulary, and the same captured
  // ledger rendered at several positions decodes to one promise.
  // @gate enableFlightLedgers
  it('decodes a ledger total as one ordinary promise wherever it is rendered', async () => {
    const Dynamic = ReactServer.createBitLedger();

    function Page() {
      ReactServer.addToLedger(Dynamic);
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Dynamic]);
      const dynamic = captured.ledgers[0];
      return {
        page: captured.data,
        first: dynamic,
        second: dynamic,
        nested: {deep: [dynamic]},
      };
    }

    const result = await render(<App />);
    expect(result.page).toBe('page');
    expect(result.first).toBeInstanceOf(Promise);
    expect(result.second).toBe(result.first);
    expect(result.nested.deep[0]).toBe(result.first);
    expect(await result.first).toBe(true);
  });

  // The input need not be an element: any value works, and the writes made
  // serializing it — from a getter, and from a cached read the getter makes
  // — are credited to the capture.
  // @gate enableFlightLedgers
  it('captures any value, not only an element', async () => {
    const Tags = ReactServer.createSetLedger();

    const getSettings = ReactServer.cache(() => {
      ReactServer.addToLedger(Tags, 'settings');
      return {theme: 'dark'};
    });

    function App() {
      const model = {
        get settings() {
          ReactServer.addToLedger(Tags, 'from-getter');
          return getSettings();
        },
        list: ['plain', {nested: true}],
      };
      const captured = ReactServer.captureLedgers(model, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(result.page.settings).toEqual({theme: 'dark'});
    expect(result.page.list).toEqual(['plain', {nested: true}]);
    expect(Array.from(await result.tags).sort()).toEqual([
      'from-getter',
      'settings',
    ]);
  });

  // A capture credits the work its input runs, not the value it holds. A
  // promise created before the call was started by the component that made
  // it, so its write credits that component's enclosing capture and the
  // capture over the promise resolves empty. The same work started by a
  // component rendered inside the capture is credited to it.
  // @gate enableFlightLedgers
  it('attributes work started inside the capture to it, not a promise created outside it', async () => {
    const Tags = ReactServer.createSetLedger();

    async function fetchUser() {
      await Promise.resolve();
      ReactServer.addToLedger(Tags, 'user');
      return 'user';
    }

    function OverPromise() {
      const captured = ReactServer.captureLedgers(fetchUser(), [Tags]);
      return {user: captured.data, tags: captured.ledgers[0]};
    }

    async function User() {
      return await fetchUser();
    }

    function OverComponent() {
      const captured = ReactServer.captureLedgers(<User />, [Tags]);
      return {user: captured.data, tags: captured.ledgers[0]};
    }

    function App() {
      const promise = ReactServer.captureLedgers(<OverPromise />, [Tags]);
      const component = ReactServer.captureLedgers(<OverComponent />, [Tags]);
      return {
        promise: promise.data,
        promiseEnclosing: promise.ledgers[0],
        component: component.data,
        componentEnclosing: component.ledgers[0],
      };
    }

    const result = await render(<App />);
    expect(await result.promise.user).toBe('user');
    expect(Array.from(await result.promise.tags)).toEqual([]);
    expect(Array.from(await result.promiseEnclosing)).toEqual(['user']);

    expect(Array.from(await result.component.tags)).toEqual(['user']);
    expect(Array.from(await result.componentEnclosing)).toEqual([]);
  });

  // @gate enableFlightLedgers
  it('nets several writes into one total', async () => {
    const Mask = ReactServer.createMaskLedger();
    const FIRST = 0b1;
    const SECOND = 0b10;

    function Page() {
      ReactServer.addToLedger(Mask, FIRST);
      ReactServer.addToLedger(Mask, SECOND);
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Mask]);
      return {page: captured.data, mask: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(await result.mask).toBe(FIRST | SECOND);
  });

  // Netting alone decides what a write changes: a zero mask entry and a
  // repeat of a bit already in the total both net to nothing.
  // @gate enableFlightLedgers
  it('nets a zero mask entry and a repeated bit to nothing', async () => {
    const Mask = ReactServer.createMaskLedger();

    function Page() {
      ReactServer.addToLedger(Mask, 0);
      ReactServer.addToLedger(Mask, 0b1);
      ReactServer.addToLedger(Mask, 0b1);
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Mask]);
      return {page: captured.data, mask: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(await result.mask).toBe(0b1);
  });

  // @gate enableFlightLedgers
  it("keeps a nested capture's writes out of the enclosing one", async () => {
    const Mask = ReactServer.createMaskLedger();
    const SEGMENT = 0b1;
    const LAYOUT = 0b10;

    function Segment() {
      ReactServer.addToLedger(Mask, SEGMENT);
      return 'segment';
    }

    function Layout() {
      ReactServer.addToLedger(Mask, LAYOUT);
      const captured = ReactServer.captureLedgers(<Segment />, [Mask]);
      return {segment: captured.data, segmentMask: captured.ledgers[0]};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Layout />, [Mask]);
      return {layout: captured.data, layoutMask: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(await result.layout.segmentMask).toBe(SEGMENT);
    expect(await result.layoutMask).toBe(LAYOUT);
  });

  // A capture interacts only with the ledgers it declares. A write to a
  // ledger the nested capture did not declare passes through it, neither
  // kept nor hidden, to the enclosing capture that did.
  // @gate enableFlightLedgers
  it('passes a ledger the nested capture does not declare through to the enclosing one', async () => {
    const Tags = ReactServer.createSetLedger();
    const Locales = ReactServer.createSetLedger();

    function Segment() {
      ReactServer.addToLedger(Tags, 'segment');
      ReactServer.addToLedger(Locales, 'en');
      return 'segment';
    }

    function Layout() {
      const captured = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {segment: captured.data, segmentTags: captured.ledgers[0]};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Layout />, [Tags, Locales]);
      return {
        layout: captured.data,
        layoutTags: captured.ledgers[0],
        layoutLocales: captured.ledgers[1],
      };
    }

    const result = await render(<App />);
    expect(Array.from(await result.layout.segmentTags)).toEqual(['segment']);
    expect(Array.from(await result.layoutTags)).toEqual([]);
    expect(Array.from(await result.layoutLocales)).toEqual(['en']);
  });

  // Which captures enclose a write is decided where the ledger data is
  // rendered, not where `captureLedgers` was called: a layout composes
  // children it did not create, and the children's writes credit the
  // captures around their rendered position.
  // @gate enableFlightLedgers
  it('captures at the position where ledger data is rendered, not where it was called', async () => {
    const Tags = ReactServer.createSetLedger();
    const Locales = ReactServer.createSetLedger();

    function Segment() {
      ReactServer.addToLedger(Locales, 'en');
      ReactServer.addToLedger(Tags, 'segment');
      return 'segment';
    }

    function Frame({children}) {
      return children;
    }

    function Page() {
      // Both captures are called here, and the first is then rendered inside
      // the second: the Locales write made under it credits the Frame's
      // capture, which its call site never saw.
      const segment = ReactServer.captureLedgers(<Segment />, [Tags]);
      const frame = ReactServer.captureLedgers(<Frame>{segment.data}</Frame>, [
        Locales,
      ]);
      return {
        frame: frame.data,
        segmentTags: segment.ledgers[0],
        frameLocales: frame.ledgers[0],
      };
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Locales]);
      return {page: captured.data, pageLocales: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(Array.from(await result.page.segmentTags)).toEqual(['segment']);
    expect(Array.from(await result.page.frameLocales)).toEqual(['en']);
    // Shadowed by the Frame's capture, which encloses the rendered position.
    expect(Array.from(await result.pageLocales)).toEqual([]);
  });

  // Two segments that each capture their own ledger stay apart, and a layout
  // capturing the same ledger around both nets nothing from either.
  // @gate enableFlightLedgers
  it("keeps sibling segments' captures isolated", async () => {
    const Tags = ReactServer.createSetLedger();

    function Feed() {
      ReactServer.addToLedger(Tags, 'feed');
      return 'feed';
    }

    function Sidebar() {
      ReactServer.addToLedger(Tags, 'sidebar');
      return 'sidebar';
    }

    function Layout() {
      const feed = ReactServer.captureLedgers(<Feed />, [Tags]);
      const sidebar = ReactServer.captureLedgers(<Sidebar />, [Tags]);
      return {
        feed: feed.data,
        feedTags: feed.ledgers[0],
        sidebar: sidebar.data,
        sidebarTags: sidebar.ledgers[0],
      };
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Layout />, [Tags]);
      return {layout: captured.data, layoutTags: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(Array.from(await result.layout.feedTags)).toEqual(['feed']);
    expect(Array.from(await result.layout.sidebarTags)).toEqual(['sidebar']);
    expect(Array.from(await result.layoutTags)).toEqual([]);
  });

  // Writes made after an `await` and after a timer credit the capture the
  // component rendered under.
  // @gate enableFlightLedgers
  it('attributes writes made after an await and after a timer to the capture', async () => {
    const Tags = ReactServer.createSetLedger();

    async function Page() {
      await null;
      ReactServer.addToLedger(Tags, 'after-await');
      await new Promise(resolve => setTimeout(resolve, 0));
      ReactServer.addToLedger(Tags, 'after-timer');
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(Array.from(await result.tags).sort()).toEqual([
      'after-await',
      'after-timer',
    ]);
  });

  // Several components suspend on one promise and retry together when it
  // resolves. Each retry runs in its own restored context, so no write is
  // lost or misattributed.
  // @gate enableFlightLedgers
  it('attributes every write to its capture when several components suspend and retry together', async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveSession;
    const session = new Promise(resolve => {
      resolveSession = resolve;
    });
    const resumed = [];

    function Segment({name}) {
      ReactServer.addToLedger(Tags, name + '-before');
      ReactServer.use(session);
      resumed.push(name);
      ReactServer.addToLedger(Tags, name + '-after');
      return name;
    }

    function App() {
      const captured = ReactServer.captureLedgers(
        ['a', 'b', 'c'].map(name => <Segment key={name} name={name} />),
        [Tags],
      );
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    expect(resumed).toEqual([]);
    await serverAct(() => resolveSession('ok'));
    expect(resumed.sort()).toEqual(['a', 'b', 'c']);

    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.tags).sort()).toEqual([
      'a-after',
      'a-before',
      'b-after',
      'b-before',
      'c-after',
      'c-before',
    ]);
  });

  // A request started from inside another has ledger state of its own, and
  // neither sees the other's writes, even to the same ledger.
  // @gate enableFlightLedgers
  it('keeps a request started inside another independent', async () => {
    const Tags = ReactServer.createSetLedger();
    let innerStream;

    function InnerPage() {
      ReactServer.addToLedger(Tags, 'inner');
      return 'inner';
    }

    function InnerApp() {
      const captured = ReactServer.captureLedgers(<InnerPage />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    function OuterPage() {
      ReactServer.addToLedger(Tags, 'outer-before');
      innerStream = ReactServerDOMServer.renderToReadableStream(
        <InnerApp />,
        turbopackMap,
      );
      ReactServer.addToLedger(Tags, 'outer-after');
      return 'outer';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<OuterPage />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const outer = await render(<App />);
    const inner = await ReactServerDOMClient.createFromReadableStream(
      innerStream,
      {
        serverConsumerManifest,
      },
    );
    expect(Array.from(await outer.tags).sort()).toEqual([
      'outer-after',
      'outer-before',
    ]);
    expect(Array.from(await inner.tags)).toEqual(['inner']);
  });

  // A ledger total resolves when the response closes and not before: a
  // bit whose total can never change again stays pending while the
  // response is open, and a write that streams in after the promise was
  // decoded is in the total it resolves to.
  // @gate enableFlightLedgers
  it('stays pending until the response closes and includes writes decoded after it', async () => {
    const Dynamic = ReactServer.createBitLedger();
    const Tags = ReactServer.createSetLedger();
    let resolveLate;
    const late = new Promise(resolve => {
      resolveLate = resolve;
    });
    let resolveEnd;
    const end = new Promise(resolve => {
      resolveEnd = resolve;
    });

    function Early() {
      ReactServer.addToLedger(Dynamic);
      ReactServer.addToLedger(Tags, 'early');
      return 'early';
    }

    async function Late() {
      await late;
      ReactServer.addToLedger(Tags, 'late');
      return 'late';
    }

    async function Pending() {
      // Keeps the response open past the late write.
      await end;
      return 'end';
    }

    function App() {
      const captured = ReactServer.captureLedgers(
        <div>
          <Early />
          <Late />
          <Pending />
        </div>,
        [Dynamic, Tags],
      );
      return {
        page: captured.data,
        dynamic: captured.ledgers[0],
        tags: captured.ledgers[1],
      };
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    // Decoded live: the root has streamed, the late subtree has not.
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    const dynamic = result.dynamic;
    const tags = result.tags;
    let settled = null;
    const settle = value => {
      settled = {value};
    };
    dynamic.then(settle, settle);
    tags.then(settle, settle);

    await serverAct(() => resolveLate());
    // The late write has streamed, but the response is still open: neither
    // ledger total has settled.
    expect(settled).toBe(null);

    await serverAct(() => resolveEnd());
    expect(await dynamic).toBe(true);
    expect(Array.from(await tags).sort()).toEqual(['early', 'late']);
  });

  // A ledger total read before the close resolves at the close; one that
  // nothing read before the close still resolves to its total when it is
  // read afterwards.
  // @gate enableFlightLedgers
  it('resolves a ledger total that is first read after the response closed', async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveEnd;
    const end = new Promise(resolve => {
      resolveEnd = resolve;
    });

    function Tagged({tag}) {
      ReactServer.addToLedger(Tags, tag);
      return tag;
    }

    async function Pending() {
      // Keeps the response open past the decoding.
      await end;
      return 'end';
    }

    function App() {
      const read = ReactServer.captureLedgers(<Tagged tag="read" />, [Tags]);
      const unread = ReactServer.captureLedgers(<Tagged tag="unread" />, [
        Tags,
      ]);
      return {
        pages: [read.data, unread.data],
        end: <Pending />,
        read: read.ledgers[0],
        unread: unread.ledgers[0],
      };
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    let settled = null;
    result.read.then(value => {
      settled = value;
    });
    expect(settled).toBe(null);

    await serverAct(() => resolveEnd());
    // Read while the response was open: settled at the close.
    expect(Array.from(settled)).toEqual(['read']);
    // Never read until now, after the close: the same total as if it had
    // been.
    expect(Array.from(await result.unread)).toEqual(['unread']);
  });

  // A subtree that throws keeps the writes it made before throwing.
  // @gate enableFlightLedgers
  it('keeps the writes an errored subtree made before it threw', async () => {
    const Tags = ReactServer.createSetLedger();

    function Page() {
      ReactServer.addToLedger(Tags, 'before-throwing');
      throw new Error('boom');
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap, {
        onError() {},
      }),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.tags)).toEqual(['before-throwing']);
  });
});

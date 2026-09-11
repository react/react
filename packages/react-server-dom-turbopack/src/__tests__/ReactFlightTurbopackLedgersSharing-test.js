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

describe('ReactFlightTurbopackLedgersSharing', () => {
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
  it('attributes an element rendered outside every capture to a capture that reuses it', async () => {
    const Mask = ReactServer.createMaskLedger();
    const FROM_HEADER = 0b1;
    let renders = 0;

    function Header() {
      renders++;
      ReactServer.addToLedger(Mask, FROM_HEADER);
      return 'header';
    }

    const header = <Header />;

    function Segment() {
      return {header};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Mask]);
      return {header, segment: captured.data, mask: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(renders).toBe(1);
    expect(await result.mask).toBe(FROM_HEADER);
  });

  // The same, one level of object wrapping down: the shared value is an
  // object that contains the element.
  // @gate enableFlightLedgers
  it("attributes an element's write to a capture through a reused object that contains it", async () => {
    const Tags = ReactServer.createSetLedger();

    function Header() {
      ReactServer.addToLedger(Tags, 'header');
      return 'header';
    }

    const chrome = {header: <Header />};

    function Segment() {
      return chrome;
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {chrome, segment: captured.data, tags: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(Array.from(await result.tags)).toEqual(['header']);
  });

  // The root writes nothing itself; a child it renders outside every capture
  // does. A capture that reuses an object the root serialized is credited the
  // child's write, like any other reuse.
  // @gate enableFlightLedgers
  it("attributes a quiet root's subtree to a capture that reuses the root's object", async () => {
    const Mask = ReactServer.createMaskLedger();
    const FROM_CHILD = 0b1;
    const settings = {theme: 'dark'};

    async function Child() {
      await null;
      ReactServer.addToLedger(Mask, FROM_CHILD);
      return 'child';
    }

    function Segment() {
      return {settings};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Mask]);
      return {
        settings,
        child: <Child />,
        segment: captured.data,
        mask: captured.ledgers[0],
      };
    }

    const result = await render(<App />);
    expect(await result.mask).toBe(FROM_CHILD);
  });

  // Ledger data over a value that is already on the wire is a reuse like any
  // other: the capture is credited the writes made serializing the value,
  // the element inside it included.
  // @gate enableFlightLedgers
  it('attributes an object already on the wire to a capture over it directly', async () => {
    const Tags = ReactServer.createSetLedger();

    function Header() {
      ReactServer.addToLedger(Tags, 'header');
      return 'header';
    }

    const chrome = {header: <Header />};

    function Segment() {
      const captured = ReactServer.captureLedgers(chrome, [Tags]);
      return {chrome: captured.data, tags: captured.ledgers[0]};
    }

    function App() {
      // Serialized here first, outside any capture.
      return {chrome, segment: <Segment />};
    }

    const result = await render(<App />);
    expect(Array.from(await result.segment.tags)).toEqual(['header']);
  });

  // One element rendered both inside a nested capture and outside it is one
  // render. The nested capture keeps the write; the reuse outside it credits
  // the enclosing capture too, past the nested one. A capture inside the
  // reused element stays in effect at every reuse.
  // @gate enableFlightLedgers
  it('attributes a reused element to a capture past a nested capture that shadows it', async () => {
    const Tags = ReactServer.createSetLedger();
    let renders = 0;

    function Badge() {
      ReactServer.addToLedger(Tags, 'badge');
      return 'badge';
    }

    function Header() {
      renders++;
      ReactServer.addToLedger(Tags, 'header');
      const badge = ReactServer.captureLedgers(<Badge />, [Tags]);
      return {badge: badge.data, badgeTags: badge.ledgers[0]};
    }

    function Layout() {
      const header = <Header />;
      const captured = ReactServer.captureLedgers(header, [Tags]);
      return {
        captured: captured.data,
        capturedTags: captured.ledgers[0],
        // The same element, reused outside the nested capture.
        again: header,
      };
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Layout />, [Tags]);
      return {layout: captured.data, layoutTags: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(renders).toBe(1);
    expect(Array.from(await result.layout.captured.badgeTags)).toEqual([
      'badge',
    ]);
    expect(Array.from(await result.layout.capturedTags)).toEqual(['header']);
    expect(Array.from(await result.layoutTags)).toEqual(['header']);
  });

  // @gate enableFlightLedgers
  it('includes a cache entry created inside a nested capture when reused outside it', async () => {
    const Tags = ReactServer.createSetLedger();
    const calls = [];
    const getUser = ReactServer.cache(() => {
      calls.push('miss');
      ReactServer.addToLedger(Tags, 'user');
      return 'Ada';
    });

    function Section() {
      calls.push('section');
      ReactServer.addToLedger(Tags, 'section');
      return getUser();
    }

    function Sibling() {
      calls.push('sibling');
      return getUser();
    }

    function Layout() {
      const inner = ReactServer.captureLedgers(<Section />, [Tags]);
      // The miss must happen inside the inner capture before the sibling hits it.
      return {
        section: inner.data,
        innerTags: inner.ledgers[0],
        sibling: <Sibling />,
      };
    }

    function App() {
      const outer = ReactServer.captureLedgers(<Layout />, [Tags]);
      return {layout: outer.data, outerTags: outer.ledgers[0]};
    }

    const result = await render(<App />);
    expect(calls).toEqual(['section', 'miss', 'sibling']);
    expect(result.layout.section).toBe('Ada');
    expect(result.layout.sibling).toBe('Ada');
    expect(await result.layout.innerTags).toEqual(new Set(['section', 'user']));
    expect(await result.outerTags).toEqual(new Set(['user']));
  });

  // @gate enableFlightLedgers
  it('includes a captured input element in another capture that reuses it', async () => {
    const Tags = ReactServer.createSetLedger();
    let renders = 0;

    function Header() {
      renders++;
      ReactServer.addToLedger(Tags, 'header');
      return 'header';
    }

    function Footer() {
      ReactServer.addToLedger(Tags, 'footer');
      return 'footer';
    }

    function App() {
      const element = <Header />;
      const a = ReactServer.captureLedgers(element, [Tags]);
      const b = ReactServer.captureLedgers(
        {again: element, footer: <Footer />},
        [Tags],
      );
      return {a: a.data, aTags: a.ledgers[0], b: b.data, bTags: b.ledgers[0]};
    }

    const result = await render(<App />);
    expect(renders).toBe(1);
    expect(result.a).toBe('header');
    expect(result.b).toEqual({again: 'header', footer: 'footer'});
    expect(await result.aTags).toEqual(new Set(['header']));
    expect(await result.bTags).toEqual(new Set(['header', 'footer']));
  });

  // @gate enableFlightLedgers
  it('includes an inner capture input reused beside it in the outer capture', async () => {
    const Tags = ReactServer.createSetLedger();
    let renders = 0;

    function Header() {
      renders++;
      ReactServer.addToLedger(Tags, 'header');
      return 'header';
    }

    function Layout() {
      ReactServer.addToLedger(Tags, 'layout');
      const element = <Header />;
      const inner = ReactServer.captureLedgers(element, [Tags]);
      return {inner: inner.data, innerTags: inner.ledgers[0], again: element};
    }

    function App() {
      const outer = ReactServer.captureLedgers(<Layout />, [Tags]);
      return {layout: outer.data, outerTags: outer.ledgers[0]};
    }

    const result = await render(<App />);
    expect(renders).toBe(1);
    expect(result.layout.inner).toBe('header');
    expect(result.layout.again).toBe('header');
    expect(await result.layout.innerTags).toEqual(new Set(['header']));
    expect(await result.outerTags).toEqual(new Set(['layout', 'header']));
  });

  // A pending promise shared between two positions is one computation, so a
  // capture that reuses it is credited what it eventually writes.
  // @gate enableFlightLedgers
  it("attributes a shared pending promise's writes to a capture that reuses it", async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveUser;
    const user = new Promise(resolve => {
      resolveUser = resolve;
    });

    function Avatar() {
      ReactServer.addToLedger(Tags, 'avatar');
      return 'avatar';
    }

    const profile = (async () => {
      await user;
      return {avatar: <Avatar />};
    })();

    function Segment() {
      return {profile};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {profile, segment: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    await serverAct(() => resolveUser('user'));
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.tags)).toEqual(['avatar']);
  });

  // Credit follows a chain of reuses: a segment reuses the nav, the nav
  // reuses the header, and the header's write credits the segment.
  // @gate enableFlightLedgers
  it('attributes a write to a capture through a chain of reuses', async () => {
    const Tags = ReactServer.createSetLedger();

    function Header() {
      ReactServer.addToLedger(Tags, 'header');
      return 'header';
    }

    const header = <Header />;

    async function Nav() {
      await null;
      return {header};
    }

    const nav = <Nav />;

    function Segment() {
      return {nav};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {header, nav, segment: captured.data, tags: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(Array.from(await result.tags)).toEqual(['header']);
  });

  // An object written inline into a containing value has no computation of
  // its own to name, so a reuse credits the whole containing value: the
  // write made inside the object and the write made beside it. The
  // imprecision goes one way only — over-report, never under.
  // @gate enableFlightLedgers
  it('attributes the whole containing value to a reuse of an object written inline', async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveInterior;
    const interior = new Promise(resolve => {
      resolveInterior = resolve;
    });

    async function Interior() {
      await interior;
      ReactServer.addToLedger(Tags, 'inside');
      return 'interior';
    }

    const shared = {interior: <Interior />};

    function Segment() {
      return {shared};
    }

    function App() {
      ReactServer.addToLedger(Tags, 'beside');
      const captured = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {
        // Written inline into the root, not as a value of its own.
        chrome: {shared},
        segment: captured.data,
        tags: captured.ledgers[0],
      };
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    await serverAct(() => resolveInterior());
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.tags).sort()).toEqual(['beside', 'inside']);
  });

  // A value a component returns is written out where it appears; a second
  // position holding the same value is a copy, not a reuse, and credits
  // nothing.
  // @gate enableFlightLedgers
  it('attributes nothing to a value copied into a second position rather than reused', async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveSegment;
    const segmentReady = new Promise(resolve => {
      resolveSegment = resolve;
    });
    let items;

    function List() {
      ReactServer.addToLedger(Tags, 'list');
      items = ['a', 'b'];
      return items;
    }

    async function Segment() {
      await segmentReady;
      return {items};
    }

    function App() {
      const list = ReactServer.captureLedgers(<List />, [Tags]);
      const segment = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {
        list: list.data,
        listTags: list.ledgers[0],
        segment: segment.data,
        segmentTags: segment.ledgers[0],
      };
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    await serverAct(() => resolveSegment());
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.listTags)).toEqual(['list']);
    expect(Array.from(await result.segmentTags)).toEqual([]);
  });

  // A captured component resolves to an object that is already on the wire
  // under another position, still waiting on its interior. The capture is
  // credited the interior's late write through that reuse.
  // @gate enableFlightLedgers
  it('attributes an object already on the wire to a capture whose component resolves to it', async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveInterior;
    const interior = new Promise(resolve => {
      resolveInterior = resolve;
    });
    let resolveCaptured;
    const capturedReady = new Promise(resolve => {
      resolveCaptured = resolve;
    });

    async function Interior() {
      await interior;
      ReactServer.addToLedger(Tags, 'inside');
      return 'interior';
    }

    // One object behind two promises: the first serializes it and waits on
    // the interior; the second resolves to the same object afterwards.
    const shared = {interior: <Interior />};
    const first = Promise.resolve(shared);
    const second = (async () => {
      await capturedReady;
      return shared;
    })();

    async function Segment() {
      return second;
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {first, segment: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    await serverAct(() => resolveCaptured());
    await serverAct(() => resolveInterior());
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.tags)).toEqual(['inside']);
  });

  // The layout reads a cached fetch before any capture exists; two segments
  // under their own captures read it again. Both captures are credited the
  // fetch's write.
  // @gate enableFlightLedgers
  it('attributes a cached fetch missed by the layout to both segments that hit it', async () => {
    const Tags = ReactServer.createSetLedger();
    let fetches = 0;
    const getUser = ReactServer.cache(() => {
      fetches++;
      ReactServer.addToLedger(Tags, 'user');
      return {name: 'Ada'};
    });

    function Feed() {
      return getUser().name;
    }

    function Sidebar() {
      return getUser().name;
    }

    function Layout() {
      const user = getUser();
      const feed = ReactServer.captureLedgers(<Feed />, [Tags]);
      const sidebar = ReactServer.captureLedgers(<Sidebar />, [Tags]);
      return {
        user: user.name,
        feed: feed.data,
        feedTags: feed.ledgers[0],
        sidebar: sidebar.data,
        sidebarTags: sidebar.ledgers[0],
      };
    }

    const result = await render(<Layout />);
    expect(fetches).toBe(1);
    expect(result.feed).toBe('Ada');
    expect(Array.from(await result.feedTags)).toEqual(['user']);
    expect(Array.from(await result.sidebarTags)).toEqual(['user']);
  });

  // The cached fetch writes only after its first `await`. The layout starts
  // it before any capture exists, and a segment reads it before the write
  // lands: the segment's capture is still credited the write.
  // @gate enableFlightLedgers
  it("attributes a cached fetch's late write to a segment that hit it before the write", async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveUser;
    const user = new Promise(resolve => {
      resolveUser = resolve;
    });
    const getUser = ReactServer.cache(async () => {
      const name = await user;
      ReactServer.addToLedger(Tags, 'user');
      return {name};
    });

    async function Feed() {
      const {name} = await getUser();
      return name;
    }

    function Layout() {
      getUser();
      const feed = ReactServer.captureLedgers(<Feed />, [Tags]);
      return {feed: feed.data, feedTags: feed.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Layout />, turbopackMap),
    );
    await serverAct(() => resolveUser('Ada'));
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.feedTags)).toEqual(['user']);
  });

  // A cached read made before the request's first write or capture is still
  // a reuse. The element that made it is rendered again under a capture, and
  // the entry's late write credits that capture through the element.
  // @gate enableFlightLedgers
  it("attributes a hit made before the request's first write or capture to a later capture", async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveWrite;
    const write = new Promise(resolve => {
      resolveWrite = resolve;
    });
    let wrote;
    const written = new Promise(resolve => {
      wrote = resolve;
    });
    const getUser = ReactServer.cache(() => {
      (async () => {
        await write;
        ReactServer.addToLedger(Tags, 'user');
        wrote();
      })();
      return {name: 'Ada'};
    });

    function Greeting() {
      // A hit before any write or capture exists in the request.
      return getUser().name;
    }

    const greeting = <Greeting />;

    async function Hold() {
      await written;
      return null;
    }

    function Segment() {
      const captured = ReactServer.captureLedgers({greeting, hold: <Hold />}, [
        Tags,
      ]);
      return {segment: captured.data, tags: captured.ledgers[0]};
    }

    function Layout() {
      getUser();
      return {greeting, segment: <Segment />};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Layout />, turbopackMap),
    );
    await serverAct(() => resolveWrite());
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.segment.tags)).toEqual(['user']);
  });

  // One cached fetch reads another. The inner one writes; a capture that
  // reads only the outer one is credited the inner write.
  // @gate enableFlightLedgers
  it("attributes an inner cached fetch's write to a capture through a hit of the outer one", async () => {
    const Tags = ReactServer.createSetLedger();
    const getSession = ReactServer.cache(() => {
      ReactServer.addToLedger(Tags, 'session');
      return {userId: 1};
    });
    const getUser = ReactServer.cache(() => {
      return {id: getSession().userId, name: 'Ada'};
    });

    function Feed() {
      return getUser().name;
    }

    function Layout() {
      getUser();
      const feed = ReactServer.captureLedgers(<Feed />, [Tags]);
      return {feed: feed.data, feedTags: feed.ledgers[0]};
    }

    const result = await render(<Layout />);
    expect(Array.from(await result.feedTags)).toEqual(['session']);
  });

  // Two cached fetches read each other while pending. The capture over both
  // resolves — the cycle terminates — and is credited both writes.
  // @gate enableFlightLedgers
  it('attributes both entries of a legal cache cycle to a capture over them', async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveTick;
    const tick = new Promise(resolve => {
      resolveTick = resolve;
    });
    let resolveA;
    const gateA = new Promise(resolve => {
      resolveA = resolve;
    });
    let resolveB;
    const gateB = new Promise(resolve => {
      resolveB = resolve;
    });

    const readA = ReactServer.cache(async () => {
      await tick;
      // B exists by now, so this read hits it.
      readB();
      await gateA;
      ReactServer.addToLedger(Tags, 'from-a');
      return 'a';
    });

    const readB = ReactServer.cache(async () => {
      // A is pending but exists, so this read hits it.
      readA();
      await gateB;
      ReactServer.addToLedger(Tags, 'from-b');
      return 'b';
    });

    async function Page() {
      await Promise.all([readA(), readB()]);
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    await serverAct(() => resolveTick());
    await serverAct(() => resolveA());
    await serverAct(() => resolveB());
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(Array.from(await result.tags).sort()).toEqual(['from-a', 'from-b']);
  });

  // A weak thenable is serialized without waiting for it, and rendered later
  // — here under a component that finished long before. A capture that
  // reuses the object holding it is credited the writes it makes when it
  // finally renders, alongside the object's own.
  // @gate enableFlightLedgers && enableFlightWeakThenables
  it("attributes a weak thenable's late writes to a capture that reuses the object holding it", async () => {
    const Tags = ReactServer.createSetLedger();
    let resolveSegment;
    const segmentReady = new Promise(resolve => {
      resolveSegment = resolve;
    });
    let resolveWeak;
    const weakReady = new Promise(resolve => {
      resolveWeak = resolve;
    });
    let resolveHold;
    const holdReady = new Promise(resolve => {
      resolveHold = resolve;
    });

    const listeners = [];
    const weak = {
      status: 'pending_weak',
      value: undefined,
      then(onFulfill) {
        if (weak.status === 'fulfilled') {
          onFulfill(weak.value);
        } else {
          listeners.push(onFulfill);
        }
      },
    };
    function fulfill(value) {
      weak.status = 'fulfilled';
      weak.value = value;
      listeners.splice(0).forEach(listener => listener(value));
    }

    function Recommendations() {
      ReactServer.addToLedger(Tags, 'recommendations');
      return 'recommendations';
    }

    function Header() {
      ReactServer.addToLedger(Tags, 'header');
      return 'header';
    }

    async function Footer() {
      await holdReady;
      ReactServer.addToLedger(Tags, 'footer');
      return 'footer';
    }

    // Serialized as a value of its own, and finished long before the weak
    // thenable resolves from its continuation.
    const scheduler = Promise.resolve({
      get schedule() {
        weakReady.then(() => fulfill({late: <Recommendations />}));
        return null;
      },
    });

    const page = (async () => ({
      header: <Header />,
      recommendations: weak,
      scheduler,
      footer: <Footer />,
    }))();

    async function Segment() {
      await segmentReady;
      return {page};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Segment />, [Tags]);
      return {page, segment: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    await serverAct(() => resolveSegment());
    await serverAct(() => resolveWeak());
    await serverAct(() => resolveHold());
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    const decodedPage = await result.page;
    expect((await decodedPage.recommendations).late).toBe('recommendations');
    expect(Array.from(await result.tags).sort()).toEqual([
      'footer',
      'header',
      'recommendations',
    ]);
  });
});

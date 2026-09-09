/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type Store from 'react-devtools-shared/src/devtools/store';

import {getVersionedRenderImplementation} from './utils';

describe('Trace updates highlighting (backend)', () => {
  let React;
  let store: Store;
  let utils;
  let actAsync;
  let hook;
  let unsubscribe;

  // textContent of every host node the backend reports for highlighting since
  // the last reset.
  let highlighted: Array<string>;

  beforeEach(() => {
    store = global.store;
    store.collapseNodesByDefault = false;
    store.componentFilters = [];

    React = require('react');
    utils = require('./utils');
    actAsync = utils.actAsync;

    hook = global.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    highlighted = [];
    // Listen to the backend's trace-updates event directly on the hook. We
    // deliberately do NOT enable trace updates through the Agent: that would
    // also enable the frontend canvas overlay (TraceUpdates view), which JSDOM
    // can't draw. Enabling on the renderer interface keeps the overlay disabled
    // (it early-returns on `!isEnabled`) so we observe exactly which nodes the
    // backend chooses without rendering anything.
    unsubscribe = hook.sub('traceUpdates', (nodes: Set<HTMLElement>) => {
      nodes.forEach(node => highlighted.push((node.textContent || '').trim()));
    });
  });

  afterEach(() => {
    if (unsubscribe != null) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  const {render} = getVersionedRenderImplementation();

  // Renderers attach (and appear in hook.rendererInterfaces) only once React
  // has injected, i.e. after the first render — so call this after rendering.
  function enableTraceUpdates() {
    hook.rendererInterfaces.forEach(rendererInterface => {
      rendererInterface.setTraceUpdatesEnabled(true);
    });
  }

  // @reactVersion >= 18.0
  it('does not highlight a component when its filtered ancestor re-mounts', async () => {
    let bumpKey;

    function FilteredParent({children}: {children: React$Node}) {
      return children;
    }

    function StableChild() {
      return <span>stable child</span>;
    }

    function App() {
      const [key, setKey] = React.useState(0);
      bumpKey = () => setKey(k => k + 1);
      return (
        <FilteredParent key={key}>
          <StableChild />
        </FilteredParent>
      );
    }

    // Hide FilteredParent from the tree via a display-name filter.
    await actAsync(
      async () =>
        (store.componentFilters = [
          utils.createDisplayNameFilter('FilteredParent'),
        ]),
    );

    await actAsync(async () => render(<App />));
    enableTraceUpdates();

    // FilteredParent is filtered out, so StableChild hangs directly under App.
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <StableChild>
              <span>
    `);

    highlighted = [];

    // Bump the key. This re-mounts FilteredParent (and therefore StableChild),
    // but StableChild's own output did not change — it was re-created, not
    // re-rendered, so it must not be highlighted.
    await actAsync(async () => bumpKey());

    expect(highlighted).toEqual([]);
  });

  // @reactVersion >= 18.0
  it('still highlights a component that genuinely re-renders', async () => {
    let bump;

    function Rerendering() {
      const [count, setCount] = React.useState(0);
      bump = () => setCount(c => c + 1);
      return <span>count: {count}</span>;
    }

    await actAsync(async () => render(<Rerendering />));
    enableTraceUpdates();

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Rerendering>
            <span>
    `);

    highlighted = [];

    // A real state update: the same Fiber re-renders, so its host should flash.
    await actAsync(async () => bump());

    expect(highlighted).toEqual(['count: 1']);
  });

  // @reactVersion >= 18.0
  it('still highlights genuinely new content mounted by an updating parent', async () => {
    let reveal;

    function NewThing() {
      return <span>fresh content</span>;
    }

    function App() {
      const [visible, setVisible] = React.useState(false);
      reveal = () => setVisible(true);
      return visible ? <NewThing /> : null;
    }

    await actAsync(async () => render(<App />));
    enableTraceUpdates();

    highlighted = [];

    // App re-renders and NewThing appears for the first time. This is genuinely
    // new content (nothing occupied this slot before), not a re-mount, so it
    // should still flash — only re-mounts are suppressed.
    await actAsync(async () => reveal());

    expect(highlighted).toEqual(['fresh content']);
  });
});

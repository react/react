/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('Store element count when collapsing nested subtrees', () => {
  let React;
  let act;
  let actAsync;
  let store;
  let previousComponentFilters;
  let utils;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;

    store = global.store;
    previousComponentFilters = store.componentFilters;

    React = require('react');

    utils = require('./utils');
    act = utils.act;
    actAsync = utils.actAsync;
  });

  afterEach(() => {
    store.componentFilters = previousComponentFilters;
  });

  const {render} = getVersionedRenderImplementation();

  function buildApp() {
    function Leaf() {
      return <span>leaf</span>;
    }
    function Middle() {
      return (
        <div>
          <Leaf />
          <Leaf />
        </div>
      );
    }
    function Outer() {
      return <Middle />;
    }
    return function App() {
      return <Outer />;
    };
  }

  // @reactVersion >= 19.0
  it('keeps the element count when a node inside a collapsed subtree is collapsed', async () => {
    const App = buildApp();

    await actAsync(() => render(<App />));

    // App > Outer > Middle > Leaf, Leaf. The host elements are hidden by the
    // production default filters.
    const outer = store.getElementAtIndex(1);
    const middle = store.getElementAtIndex(2);

    act(() => store.toggleIsCollapsed(outer.id, true));
    act(() => store.toggleIsCollapsed(middle.id, true));

    expect(store.numElements).toBe(2);
  });

  // @reactVersion >= 19.0
  it('restores the element count when the subtree is expanded again', async () => {
    const App = buildApp();

    await actAsync(() => render(<App />));

    const before = store.numElements;
    const outer = store.getElementAtIndex(1);
    const middle = store.getElementAtIndex(2);

    act(() => store.toggleIsCollapsed(outer.id, true));
    act(() => store.toggleIsCollapsed(middle.id, true));
    act(() => store.toggleIsCollapsed(middle.id, false));
    act(() => store.toggleIsCollapsed(outer.id, false));

    expect(store.numElements).toBe(before);
  });

  // @reactVersion >= 19.0
  it('keeps the element count when only visible nodes are collapsed', async () => {
    const App = buildApp();

    await actAsync(() => render(<App />));

    const before = store.numElements;
    const outer = store.getElementAtIndex(1);
    const middle = store.getElementAtIndex(2);

    act(() => store.toggleIsCollapsed(middle.id, true));
    act(() => store.toggleIsCollapsed(outer.id, true));
    act(() => store.toggleIsCollapsed(outer.id, false));
    act(() => store.toggleIsCollapsed(middle.id, false));

    expect(store.numElements).toBe(before);
  });
});

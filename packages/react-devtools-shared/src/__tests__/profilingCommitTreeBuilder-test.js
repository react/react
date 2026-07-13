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

describe('commit tree', () => {
  let React = require('react');
  let Scheduler;
  let store: Store;
  let utils;

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    store = global.store;
    store.collapseNodesByDefault = false;
    store.recordChangeDescriptions = true;

    React = require('react');
    Scheduler = require('scheduler');
  });

  const {render} = getVersionedRenderImplementation();

  // @reactVersion >= 16.9
  it('should be able to rebuild the store tree for each commit', () => {
    const Parent = ({count}) => {
      Scheduler.unstable_advanceTime(10);
      return new Array(count)
        .fill(true)
        .map((_, index) => <Child key={index} />);
    };
    const Child = React.memo(function Child() {
      Scheduler.unstable_advanceTime(2);
      return null;
    });

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<Parent count={1} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child key="0"> [Memo]
    `);
    utils.act(() => render(<Parent count={3} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child key="0"> [Memo]
            <Child key="1"> [Memo]
            <Child key="2"> [Memo]
    `);
    utils.act(() => render(<Parent count={2} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child key="0"> [Memo]
            <Child key="1"> [Memo]
    `);
    utils.act(() => render(<Parent count={0} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Parent>
    `);
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitTrees = [];
    for (let commitIndex = 0; commitIndex < 4; commitIndex++) {
      commitTrees.push(
        store.profilerStore.profilingCache.getCommitTree({
          commitIndex,
          rootID,
        }),
      );
    }

    expect(commitTrees[0].nodes.size).toBe(3); // <Root> + <Parent> + <Child>
    expect(commitTrees[1].nodes.size).toBe(5); // <Root> + <Parent> + <Child> x 3
    expect(commitTrees[2].nodes.size).toBe(4); // <Root> + <Parent> + <Child> x 2
    expect(commitTrees[3].nodes.size).toBe(2); // <Root> + <Parent>
  });

  describe('Lazy', () => {
    async function fakeImport(result) {
      return {default: result};
    }

    const LazyInnerComponent = () => null;

    const App = ({renderChildren}) => {
      if (renderChildren) {
        return (
          <React.Suspense fallback="Loading...">
            <LazyComponent />
          </React.Suspense>
        );
      } else {
        return null;
      }
    };

    let LazyComponent;
    beforeEach(() => {
      LazyComponent = React.lazy(() => fakeImport(LazyInnerComponent));
    });

    // @reactVersion >= 16.9
    it('should support Lazy components', async () => {
      utils.act(() => store.profilerStore.startProfiling());
      utils.act(() => render(<App renderChildren={true} />));
      await Promise.resolve();
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Suspense>
        [suspense-root]  rects={null}
          <Suspense name="App" uniqueSuspenders={true} rects={null}>
      `);
      utils.act(() => render(<App renderChildren={true} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▾ <Suspense>
                <LazyInnerComponent>
        [suspense-root]  rects={null}
          <Suspense name="App" uniqueSuspenders={true} rects={null}>
      `);
      utils.act(() => render(<App renderChildren={false} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
            <App>
      `);
      utils.act(() => store.profilerStore.stopProfiling());

      const rootID = store.roots[0];
      const commitTrees = [];
      for (let commitIndex = 0; commitIndex < 3; commitIndex++) {
        commitTrees.push(
          store.profilerStore.profilingCache.getCommitTree({
            commitIndex,
            rootID,
          }),
        );
      }

      expect(commitTrees[0].nodes.size).toBe(3);
      expect(commitTrees[1].nodes.size).toBe(4); // <Root> + <App> + <Suspense> + <LazyInnerComponent>
      expect(commitTrees[2].nodes.size).toBe(2); // <Root> + <App>
    });

    // @reactVersion >= 16.9
    it('should support Lazy components that are unmounted before resolving', async () => {
      utils.act(() => store.profilerStore.startProfiling());
      utils.act(() => render(<App renderChildren={true} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Suspense>
        [suspense-root]  rects={null}
          <Suspense name="App" uniqueSuspenders={true} rects={null}>
      `);
      utils.act(() => render(<App renderChildren={false} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
            <App>
      `);
      utils.act(() => store.profilerStore.stopProfiling());

      const rootID = store.roots[0];
      const commitTrees = [];
      for (let commitIndex = 0; commitIndex < 2; commitIndex++) {
        commitTrees.push(
          store.profilerStore.profilingCache.getCommitTree({
            commitIndex,
            rootID,
          }),
        );
      }

      expect(commitTrees[0].nodes.size).toBe(3);
      expect(commitTrees[1].nodes.size).toBe(2); // <Root> + <App>
    });
  });

  describe('Suspense', () => {
    it('should handle transitioning from fallback back to content during profiling', async () => {
      let resolvePromise;
      let promise = null;
      let childTreeBaseDuration = 10;

      function Wrapper({children}) {
        Scheduler.unstable_advanceTime(2);
        return children;
      }

      function Child() {
        Scheduler.unstable_advanceTime(childTreeBaseDuration);
        if (promise !== null) {
          React.use(promise);
        }
        return <GrandChild />;
      }

      function GrandChild() {
        Scheduler.unstable_advanceTime(5);
        return null;
      }

      function Fallback() {
        Scheduler.unstable_advanceTime(2);
        return null;
      }

      function App() {
        Scheduler.unstable_advanceTime(1);
        return (
          <React.Suspense fallback={<Fallback />}>
            <Wrapper>
              <Child />
            </Wrapper>
          </React.Suspense>
        );
      }

      utils.act(() => store.profilerStore.startProfiling());

      // Commit 1: Mount with primary
      utils.act(() => render(<App step={1} />));

      // Commit 2: Suspend, show fallback
      promise = new Promise(resolve => (resolvePromise = resolve));
      await utils.actAsync(() => render(<App step={2} />));

      // Commit 3: Resolve suspended promise, show primary content with a different duration.
      childTreeBaseDuration = 20;
      promise = null;
      await utils.actAsync(resolvePromise);
      utils.act(() => render(<App step={3} />));

      utils.act(() => store.profilerStore.stopProfiling());

      const rootID = store.roots[0];
      const dataForRoot = store.profilerStore.getDataForRoot(rootID);
      const numCommits = dataForRoot.commitData.length;
      for (let commitIndex = 0; commitIndex < numCommits; commitIndex++) {
        store.profilerStore.profilingCache.getCommitTree({
          commitIndex,
          rootID,
        });
      }
    });
  });
});

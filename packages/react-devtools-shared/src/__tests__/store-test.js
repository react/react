/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import semver from 'semver';

import {
  SUSPENSE_TREE_OPERATION_ADD,
  TREE_OPERATION_ADD,
  TREE_OPERATION_REMOVE,
} from 'react-devtools-shared/src/constants';
import {
  ElementTypeFunction,
  ElementTypeRoot,
} from 'react-devtools-shared/src/frontend/types';
import {getVersionedRenderImplementation} from './utils';
import {ReactVersion} from '../../../../ReactVersions';

const ReactVersionTestingAgainst = process.env.REACT_VERSION || ReactVersion;

describe('Store', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let agent;
  let act;
  let actAsync;
  let bridge;
  let createDisplayNameFilter;
  let getRendererID;
  let legacyRender;
  let previousComponentFilters;
  let store;
  let withErrorsOrWarningsIgnored;

  function readValue(promise) {
    if (typeof React.use === 'function') {
      return React.use(promise);
    }

    // Support for React < 19.0
    switch (promise.status) {
      case 'fulfilled':
        return promise.value;
      case 'rejected':
        throw promise.reason;
      case 'pending':
        throw promise;
      default:
        promise.status = 'pending';
        promise.then(
          value => {
            promise.status = 'fulfilled';
            promise.value = value;
          },
          reason => {
            promise.status = 'rejected';
            promise.reason = reason;
          },
        );
        throw promise;
    }
  }

  beforeAll(() => {
    // JSDDOM doesn't implement getClientRects so we're just faking one for testing purposes
    Element.prototype.getClientRects = function (this: Element) {
      const textContent = this.textContent;
      return [
        new DOMRect(1, 2, textContent.length, textContent.split('\n').length),
      ];
    };
  });

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;

    agent = global.agent;
    bridge = global.bridge;
    store = global.store;

    previousComponentFilters = store.componentFilters;

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');

    const utils = require('./utils');
    act = utils.act;
    actAsync = utils.actAsync;
    getRendererID = utils.getRendererID;
    legacyRender = utils.legacyRender;
    createDisplayNameFilter = utils.createDisplayNameFilter;
    withErrorsOrWarningsIgnored = utils.withErrorsOrWarningsIgnored;
  });

  afterEach(() => {
    store.componentFilters = previousComponentFilters;
  });

  const {render, unmount, createContainer} = getVersionedRenderImplementation();

  // @reactVersion >= 18.0
  it('should ignore add operations for parents removed earlier in the same bridge update', () => {
    store.onBridgeOperations([
      1, // renderer ID
      1, // root ID
      7, // string table size
      6,
      80,
      97,
      114,
      101,
      110,
      116,
      TREE_OPERATION_ADD,
      1,
      ElementTypeRoot,
      0, // StrictMode compliant?
      0, // Profiling flags
      0, // StrictMode supported?
      0, // Owner metadata?
      SUSPENSE_TREE_OPERATION_ADD,
      1,
      0,
      0,
      0,
      -1,
      TREE_OPERATION_ADD,
      2,
      ElementTypeFunction,
      1,
      0,
      1,
      0,
      0,
    ]);

    expect(store).toMatchInlineSnapshot(`
      [root]
          <Parent>
    `);

    expect(() =>
      store.onBridgeOperations([
        1, // renderer ID
        1, // root ID
        0, // string table size
        TREE_OPERATION_REMOVE,
        1,
        2,
        TREE_OPERATION_ADD,
        3,
        ElementTypeFunction,
        2,
        0,
        0,
        0,
        0,
      ]),
    ).not.toThrow();

    expect(store).toMatchInlineSnapshot(`[root]`);
  });

  // @reactVersion >= 18.0
  it('should not allow a root node to be collapsed', async () => {
    const Component = () => <div>Hi</div>;

    await act(() => render(<Component count={4} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Component>
    `);

    expect(store.roots).toHaveLength(1);

    const rootID = store.roots[0];

    expect(() => store.toggleIsCollapsed(rootID, true)).toThrow(
      'Root nodes cannot be collapsed',
    );
  });

  // @reactVersion >= 18.0
  it('should properly handle a root with no visible nodes', async () => {
    const Root = ({children}) => children;

    await act(() => render(<Root>{null}</Root>));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Root>
    `);

    await act(() => render(<div />));
    expect(store).toMatchInlineSnapshot(`[root]`);
  });

  // This test is not the same cause as what's reported on GitHub,
  // but the resulting behavior (owner mounting after descendant) is the same.
  // Thec ase below is admittedly contrived and relies on side effects.
  // I'mnot yet sure of how to reduce the GitHub reported production case to a test though.
  // See https://github.com/facebook/react/issues/21445
  // @reactVersion >= 18.0
  it('should handle when a component mounts before its owner', async () => {
    const promise = new Promise(resolve => {});

    let Dynamic = null;
    const Owner = () => {
      Dynamic = <Child />;
      readValue(promise);
    };
    const Parent = () => {
      return Dynamic;
    };
    const Child = () => null;

    await act(() =>
      render(
        <>
          <React.Suspense fallback="Loading...">
            <Owner />
          </React.Suspense>
          <Parent />
        </>,
      ),
    );
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Suspense>
        ▾ <Parent>
            <Child>
      [suspense-root]  rects={null}
        <Suspense name="Unknown" uniqueSuspenders={true} rects={null}>
    `);
  });

  // @reactVersion >= 18.0
  it('should handle multibyte character strings', async () => {
    const Component = () => null;
    Component.displayName = '🟩💜🔵';

    await act(() => render(<Component />));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <🟩💜🔵>
    `);
  });

  it('should handle reorder of filtered elements', async () => {
    function IgnoreMePassthrough({children}) {
      return children;
    }
    function PassThrough({children}) {
      return children;
    }

    await actAsync(
      async () =>
        (store.componentFilters = [createDisplayNameFilter('^IgnoreMe', true)]),
    );

    await act(() => {
      render(
        <PassThrough key="e" name="e">
          <IgnoreMePassthrough key="e1">
            <PassThrough name="e-child-one">
              <p>e1</p>
            </PassThrough>
          </IgnoreMePassthrough>
          <IgnoreMePassthrough key="e2">
            <PassThrough name="e-child-two">
              <div>e2</div>
            </PassThrough>
          </IgnoreMePassthrough>
        </PassThrough>,
      );
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <PassThrough key="e">
          ▾ <PassThrough>
              <p>
          ▾ <PassThrough>
              <div>
    `);

    await act(() => {
      render(
        <PassThrough key="e" name="e">
          <IgnoreMePassthrough key="e2">
            <PassThrough name="e-child-two">
              <div>e2</div>
            </PassThrough>
          </IgnoreMePassthrough>
          <IgnoreMePassthrough key="e1">
            <PassThrough name="e-child-one">
              <p>e1</p>
            </PassThrough>
          </IgnoreMePassthrough>
        </PassThrough>,
      );
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <PassThrough key="e">
          ▾ <PassThrough>
              <div>
          ▾ <PassThrough>
              <p>
    `);
  });

  describe('StrictMode compliance', () => {
    it('should mark strict root elements as strict', async () => {
      const App = () => <Component />;
      const Component = () => null;

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container, {
        unstable_strictMode: true,
      });
      await act(() => {
        root.render(<App />);
      });

      expect(store.getElementAtIndex(0).isStrictModeNonCompliant).toBe(false);
      expect(store.getElementAtIndex(1).isStrictModeNonCompliant).toBe(false);
    });

    // @reactVersion >= 18.0
    it('should mark non strict root elements as not strict', async () => {
      const App = () => <Component />;
      const Component = () => null;

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<App />);
      });

      expect(store.getElementAtIndex(0).isStrictModeNonCompliant).toBe(true);
      expect(store.getElementAtIndex(1).isStrictModeNonCompliant).toBe(true);
    });

    it('should mark StrictMode subtree elements as strict', async () => {
      const App = () => (
        <React.StrictMode>
          <Component />
        </React.StrictMode>
      );
      const Component = () => null;

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<App />);
      });

      expect(store.getElementAtIndex(0).isStrictModeNonCompliant).toBe(true);
      expect(store.getElementAtIndex(1).isStrictModeNonCompliant).toBe(false);
    });
  });

  describe('Activity hidden state', () => {
    // @reactVersion >= 19
    it('should mark Activity subtree elements as hidden when mode is hidden', async () => {
      const Activity = React.Activity || React.unstable_Activity;

      function Child() {
        return <div>child</div>;
      }

      function App({hidden}) {
        return (
          <Activity mode={hidden ? 'hidden' : 'visible'}>
            <Child />
          </Activity>
        );
      }

      await actAsync(() => {
        render(<App hidden={true} />);
      });

      // Activity element should be marked as hidden and collapsed
      const activityElement = store.getElementAtIndex(1);
      expect(activityElement.displayName).toBe('Activity');
      expect(activityElement.isActivityHidden).toBe(true);
      expect(activityElement.isInsideHiddenActivity).toBe(false);
      expect(activityElement.isCollapsed).toBe(true);

      // Expand to access children
      store.toggleIsCollapsed(activityElement.id, false);

      // Children should still be in the tree but marked as inside hidden Activity
      const childElement = store.getElementAtIndex(2);
      expect(childElement.displayName).toBe('Child');
      expect(childElement.isInsideHiddenActivity).toBe(true);
    });

    // @reactVersion >= 19
    it('should not mark Activity subtree as hidden when mode is visible', async () => {
      const Activity = React.Activity || React.unstable_Activity;

      function Child() {
        return <div>child</div>;
      }

      function App() {
        return (
          <Activity mode="visible">
            <Child />
          </Activity>
        );
      }

      await actAsync(() => {
        render(<App />);
      });

      const activityElement = store.getElementAtIndex(1);
      expect(activityElement.displayName).toBe('Activity');
      expect(activityElement.isActivityHidden).toBe(false);
      expect(activityElement.isInsideHiddenActivity).toBe(false);
      expect(activityElement.isCollapsed).toBe(false);

      const childElement = store.getElementAtIndex(2);
      expect(childElement.displayName).toBe('Child');
      expect(childElement.isInsideHiddenActivity).toBe(false);
    });

    // @reactVersion >= 19
    it('should update hidden state when Activity mode toggles', async () => {
      const Activity = React.Activity || React.unstable_Activity;

      function Child() {
        return <div>child</div>;
      }

      function App({hidden}) {
        return (
          <Activity mode={hidden ? 'hidden' : 'visible'}>
            <Child />
          </Activity>
        );
      }

      // Start visible
      await actAsync(() => {
        render(<App hidden={false} />);
      });

      let activityElement = store.getElementAtIndex(1);
      expect(activityElement.isActivityHidden).toBe(false);
      expect(activityElement.isCollapsed).toBe(false);

      let childElement = store.getElementAtIndex(2);
      expect(childElement.isInsideHiddenActivity).toBe(false);

      // Toggle to hidden — children remain but subtree collapses
      await actAsync(() => {
        render(<App hidden={true} />);
      });

      activityElement = store.getElementAtIndex(1);
      expect(activityElement.isActivityHidden).toBe(true);
      expect(activityElement.isCollapsed).toBe(true);

      // Expand to verify children are still marked
      store.toggleIsCollapsed(activityElement.id, false);

      childElement = store.getElementAtIndex(2);
      expect(childElement.displayName).toBe('Child');
      expect(childElement.isInsideHiddenActivity).toBe(true);

      // Toggle back to visible — subtree expands automatically
      await actAsync(() => {
        render(<App hidden={false} />);
      });

      activityElement = store.getElementAtIndex(1);
      expect(activityElement.isActivityHidden).toBe(false);
      expect(activityElement.isCollapsed).toBe(false);

      childElement = store.getElementAtIndex(2);
      expect(childElement.isInsideHiddenActivity).toBe(false);
    });

    // @reactVersion >= 19
    it('should propagate hidden state to deeply nested children', async () => {
      const Activity = React.Activity || React.unstable_Activity;

      function GrandChild() {
        return <div>grandchild</div>;
      }
      function Child() {
        return <GrandChild />;
      }

      function App({hidden}) {
        return (
          <Activity mode={hidden ? 'hidden' : 'visible'}>
            <Child />
          </Activity>
        );
      }

      await actAsync(() => {
        render(<App hidden={true} />);
      });

      const activityElement = store.getElementAtIndex(1);
      expect(activityElement.displayName).toBe('Activity');
      expect(activityElement.isActivityHidden).toBe(true);
      expect(activityElement.isCollapsed).toBe(true);

      // Expand to access children
      store.toggleIsCollapsed(activityElement.id, false);

      const childElement = store.getElementAtIndex(2);
      expect(childElement.displayName).toBe('Child');
      expect(childElement.isInsideHiddenActivity).toBe(true);

      const grandChildElement = store.getElementAtIndex(3);
      expect(grandChildElement.displayName).toBe('GrandChild');
      expect(grandChildElement.isInsideHiddenActivity).toBe(true);
    });

    // @reactVersion >= 19
    it('should collapse hidden Activity subtree by default', async () => {
      const Activity = React.Activity || React.unstable_Activity;

      function Child() {
        return <div>child</div>;
      }

      function App({hidden}) {
        return (
          <Activity mode={hidden ? 'hidden' : 'visible'}>
            <Child />
          </Activity>
        );
      }

      // Hidden Activity should be collapsed
      await actAsync(() => {
        render(<App hidden={true} />);
      });

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▸ <Activity mode="hidden">
      `);

      // Toggle to visible — should expand
      await actAsync(() => {
        render(<App hidden={false} />);
      });

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▾ <Activity mode="visible">
                <Child>
      `);

      // Toggle back to hidden — should collapse again
      await actAsync(() => {
        render(<App hidden={true} />);
      });

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▸ <Activity mode="hidden">
      `);
    });

    // @reactVersion >= 19
    it('should dim nested visible Activity inside a hidden Activity', async () => {
      const Activity = React.Activity || React.unstable_Activity;

      function Leaf() {
        return <div>leaf</div>;
      }

      function App() {
        return (
          <Activity mode="hidden" name="outer">
            <Activity mode="visible" name="inner">
              <Leaf />
            </Activity>
          </Activity>
        );
      }

      await actAsync(() => {
        render(<App />);
      });

      // Outer Activity: hidden, collapsed, not dimmed itself
      const outerActivity = store.getElementAtIndex(1);
      expect(outerActivity.displayName).toBe('Activity');
      expect(outerActivity.nameProp).toBe('outer');
      expect(outerActivity.isActivityHidden).toBe(true);
      expect(outerActivity.isInsideHiddenActivity).toBe(false);
      expect(outerActivity.isCollapsed).toBe(true);

      // Expand to access inner elements
      store.toggleIsCollapsed(outerActivity.id, false);

      // Inner Activity: visible, but inside hidden outer so still dimmed
      const innerActivity = store.getElementAtIndex(2);
      expect(innerActivity.displayName).toBe('Activity');
      expect(innerActivity.nameProp).toBe('inner');
      expect(innerActivity.isActivityHidden).toBe(false);
      expect(innerActivity.isInsideHiddenActivity).toBe(true);

      // Leaf: inside both, dimmed
      const leaf = store.getElementAtIndex(3);
      expect(leaf.displayName).toBe('Leaf');
      expect(leaf.isInsideHiddenActivity).toBe(true);
    });
  });

  describe('collapseNodesByDefault:false', () => {
    beforeEach(() => {
      store.collapseNodesByDefault = false;
    });

    // @reactVersion >= 18.0
    it('should support mount and update operations', async () => {
      const Grandparent = ({count}) => (
        <React.Fragment>
          <Parent count={count} />
          <Parent count={count} />
        </React.Fragment>
      );
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      await act(() => render(<Grandparent count={4} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
                <Child key="2">
                <Child key="3">
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
                <Child key="2">
                <Child key="3">
      `);

      await act(() => render(<Grandparent count={2} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
      `);

      await act(() => unmount());
      expect(store).toMatchInlineSnapshot(``);
    });

    // @reactVersion >= 18.0
    // @reactVersion < 19
    // @gate !disableLegacyMode
    it('should support mount and update operations for multiple roots (legacy render)', async () => {
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      const containerA = document.createElement('div');
      const containerB = document.createElement('div');

      await act(() => {
        legacyRender(<Parent key="A" count={3} />, containerA);
        legacyRender(<Parent key="B" count={2} />, containerB);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
              <Child key="0">
              <Child key="1">
              <Child key="2">
        [root]
          ▾ <Parent key="B">
              <Child key="0">
              <Child key="1">
      `);

      await act(() => {
        legacyRender(<Parent key="A" count={4} />, containerA);
        legacyRender(<Parent key="B" count={1} />, containerB);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
              <Child key="0">
              <Child key="1">
              <Child key="2">
              <Child key="3">
        [root]
          ▾ <Parent key="B">
              <Child key="0">
      `);

      await act(() => ReactDOM.unmountComponentAtNode(containerB));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
              <Child key="0">
              <Child key="1">
              <Child key="2">
              <Child key="3">
      `);

      await act(() => ReactDOM.unmountComponentAtNode(containerA));
      expect(store).toMatchInlineSnapshot(``);
    });

    // @reactVersion >= 18.0
    it('should support mount and update operations for multiple roots (createRoot)', async () => {
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      const containerA = document.createElement('div');
      const containerB = document.createElement('div');

      const rootA = ReactDOMClient.createRoot(containerA);
      const rootB = ReactDOMClient.createRoot(containerB);

      await act(() => {
        rootA.render(<Parent key="A" count={3} />);
        rootB.render(<Parent key="B" count={2} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
              <Child key="0">
              <Child key="1">
              <Child key="2">
        [root]
          ▾ <Parent key="B">
              <Child key="0">
              <Child key="1">
      `);

      await act(() => {
        rootA.render(<Parent key="A" count={4} />);
        rootB.render(<Parent key="B" count={1} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
              <Child key="0">
              <Child key="1">
              <Child key="2">
              <Child key="3">
        [root]
          ▾ <Parent key="B">
              <Child key="0">
      `);

      await act(() => rootB.unmount());
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Parent key="A">
              <Child key="0">
              <Child key="1">
              <Child key="2">
              <Child key="3">
      `);

      await act(() => rootA.unmount());
      expect(store).toMatchInlineSnapshot(``);
    });

    // @reactVersion >= 18.0
    it('should filter DOM nodes from the store tree', async () => {
      const Grandparent = () => (
        <div>
          <div>
            <Parent />
          </div>
          <Parent />
        </div>
      );
      const Parent = () => (
        <div>
          <Child />
        </div>
      );
      const Child = () => <div>Hi!</div>;

      await act(() => render(<Grandparent count={4} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child>
            ▾ <Parent>
                <Child>
      `);
    });

    // @reactVersion >= 18.0
    it('should display Suspense nodes properly in various states', async () => {
      const Loading = () => <div>Loading...</div>;
      const never = new Promise(() => {});
      const SuspendingComponent = () => {
        readValue(never);
      };
      const Component = () => {
        return <div>Hello</div>;
      };
      const Wrapper = ({shouldSuspense}) => (
        <React.Fragment>
          <Component key="Outside" />
          <React.Suspense fallback={<Loading />}>
            {shouldSuspense ? (
              <SuspendingComponent />
            ) : (
              <Component key="Inside" />
            )}
          </React.Suspense>
        </React.Fragment>
      );

      await act(() => render(<Wrapper shouldSuspense={true} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense>
                <Loading>
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="Wrapper" uniqueSuspenders={true} rects={null}>
      `);

      await act(() => {
        render(<Wrapper shouldSuspense={false} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense>
                <Component key="Inside">
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}
          <Suspense name="Wrapper" uniqueSuspenders={true} rects={[{x:1,y:2,width:5,height:1}]}>
      `);
    });

    // @reactVersion >= 18.0
    it('should support nested Suspense nodes', async () => {
      const Component = () => null;
      const Loading = () => <div>Loading...</div>;
      const never = new Promise(() => {});
      const Never = () => {
        readValue(never);
      };

      const Wrapper = ({
        suspendFirst = false,
        suspendSecond = false,
        suspendParent = false,
      }) => (
        <React.Fragment>
          <Component key="Outside" />
          <React.Suspense
            name="parent"
            fallback={<Loading key="Parent Fallback" />}>
            <Component key="Unrelated at Start" />
            <React.Suspense
              name="one"
              fallback={<Loading key="Suspense 1 Fallback" />}>
              {suspendFirst ? (
                <Never />
              ) : (
                <Component key="Suspense 1 Content" />
              )}
            </React.Suspense>
            <React.Suspense
              name="two"
              fallback={<Loading key="Suspense 2 Fallback" />}>
              {suspendSecond ? (
                <Never />
              ) : (
                <Component key="Suspense 2 Content" />
              )}
            </React.Suspense>
            <React.Suspense
              name="three"
              fallback={<Loading key="Suspense 3 Fallback" />}>
              <Never />
            </React.Suspense>
            {suspendParent && <Never />}
            <Component key="Unrelated at End" />
          </React.Suspense>
        </React.Fragment>
      );

      await actAsync(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={false}
            suspendSecond={false}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Component key="Suspense 1 Content">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={false} rects={[{x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={false} rects={null}>
            <Suspense name="two" uniqueSuspenders={false} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={true}
            suspendSecond={false}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Loading key="Suspense 1 Fallback">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={false} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={false} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={false}
            suspendSecond={true}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Component key="Suspense 1 Content">
              ▾ <Suspense name="two">
                  <Loading key="Suspense 2 Fallback">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={false} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={true}
            suspendSecond={false}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Loading key="Suspense 1 Fallback">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={false} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={true}
            suspendFirst={true}
            suspendSecond={false}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Loading key="Parent Fallback">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={true}
            suspendSecond={true}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Loading key="Suspense 1 Fallback">
              ▾ <Suspense name="two">
                  <Loading key="Suspense 2 Fallback">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={false}
            suspendSecond={false}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Component key="Suspense 1 Content">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);

      const rendererID = getRendererID();
      await act(() =>
        agent.overrideSuspense({
          id: store.getElementIDAtIndex(4),
          rendererID,
          forceFallback: true,
        }),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Loading key="Suspense 1 Fallback">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        agent.overrideSuspense({
          id: store.getElementIDAtIndex(2),
          rendererID,
          forceFallback: true,
        }),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Loading key="Parent Fallback">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={true}
            suspendSecond={true}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Loading key="Parent Fallback">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await actAsync(() =>
        agent.overrideSuspense({
          id: store.getElementIDAtIndex(2),
          rendererID,
          forceFallback: false,
        }),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Loading key="Suspense 1 Fallback">
              ▾ <Suspense name="two">
                  <Loading key="Suspense 2 Fallback">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        agent.overrideSuspense({
          id: store.getElementIDAtIndex(4),
          rendererID,
          forceFallback: false,
        }),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Loading key="Suspense 1 Fallback">
              ▾ <Suspense name="two">
                  <Loading key="Suspense 2 Fallback">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
      await act(() =>
        render(
          <Wrapper
            suspendParent={false}
            suspendFirst={false}
            suspendSecond={false}
          />,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Component key="Suspense 1 Content">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Loading key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:10,height:1}]}
          <Suspense name="parent" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}]}>
            <Suspense name="one" uniqueSuspenders={true} rects={null}>
            <Suspense name="two" uniqueSuspenders={true} rects={null}>
            <Suspense name="three" uniqueSuspenders={true} rects={null}>
      `);
    });

    // @reactVersion >= 18.0
    it('can override multiple Suspense simultaneously', async () => {
      const Component = () => {
        return <div>Hello</div>;
      };
      const App = () => (
        <React.Fragment>
          <Component key="Outside" />
          <React.Suspense
            name="parent"
            fallback={<Component key="Parent Fallback" />}>
            <Component key="Unrelated at Start" />
            <React.Suspense
              name="one"
              fallback={<Component key="Suspense 1 Fallback" />}>
              <Component key="Suspense 1 Content" />
            </React.Suspense>
            <React.Suspense
              name="two"
              fallback={<Component key="Suspense 2 Fallback" />}>
              <Component key="Suspense 2 Content" />
            </React.Suspense>
            <React.Suspense
              name="three"
              fallback={<Component key="Suspense 3 Fallback" />}>
              <Component key="Suspense 3 Content" />
            </React.Suspense>
            <Component key="Unrelated at End" />
          </React.Suspense>
        </React.Fragment>
      );

      await actAsync(() => render(<App />));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Component key="Suspense 1 Content">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Component key="Suspense 3 Content">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}
          <Suspense name="parent" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}>
            <Suspense name="one" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
            <Suspense name="two" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
            <Suspense name="three" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
      `);

      await actAsync(() => {
        agent.overrideSuspenseMilestone({
          rendererID: getRendererID(),
          suspendedSet: [
            store.getElementIDAtIndex(4),
            store.getElementIDAtIndex(8),
          ],
        });
      });

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Component key="Suspense 1 Fallback">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Component key="Suspense 3 Fallback">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}
          <Suspense name="parent" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}>
            <Suspense name="one" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
            <Suspense name="two" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
            <Suspense name="three" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
      `);

      await actAsync(() => {
        agent.overrideSuspenseMilestone({
          rendererID: getRendererID(),
          suspendedSet: [],
        });
      });

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Component key="Outside">
            ▾ <Suspense name="parent">
                <Component key="Unrelated at Start">
              ▾ <Suspense name="one">
                  <Component key="Suspense 1 Content">
              ▾ <Suspense name="two">
                  <Component key="Suspense 2 Content">
              ▾ <Suspense name="three">
                  <Component key="Suspense 3 Content">
                <Component key="Unrelated at End">
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}
          <Suspense name="parent" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}>
            <Suspense name="one" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
            <Suspense name="two" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
            <Suspense name="three" uniqueSuspenders={false} rects={[{x:1,y:2,width:5,height:1}]}>
      `);
    });

    it('should display a partially rendered SuspenseList', async () => {
      const Loading = () => <div>Loading...</div>;
      const never = new Promise(() => {});
      const SuspendingComponent = () => {
        readValue(never);
      };
      const Component = () => {
        return <div>Hello</div>;
      };
      const Wrapper = ({shouldSuspense}) => (
        <React.Fragment>
          <React.unstable_SuspenseList revealOrder="forwards" tail="collapsed">
            <Component key="A" />
            <React.Suspense fallback={<Loading />}>
              {shouldSuspense ? <SuspendingComponent /> : <Component key="B" />}
            </React.Suspense>
            <Component key="C" />
          </React.unstable_SuspenseList>
        </React.Fragment>
      );

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Wrapper shouldSuspense={true} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
            ▾ <SuspenseList>
                <Component key="A">
              ▾ <Suspense>
                  <Loading>
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="Wrapper" uniqueSuspenders={true} rects={null}>
      `);

      await act(() => {
        root.render(<Wrapper shouldSuspense={false} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
            ▾ <SuspenseList>
                <Component key="A">
              ▾ <Suspense>
                  <Component key="B">
                <Component key="C">
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}
          <Suspense name="Wrapper" uniqueSuspenders={true} rects={[{x:1,y:2,width:5,height:1}]}>
      `);
    });

    // @reactVersion >= 18.0
    it('should support collapsing parts of the tree', async () => {
      const Grandparent = ({count}) => (
        <React.Fragment>
          <Parent count={count} />
          <Parent count={count} />
        </React.Fragment>
      );
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      await act(() => render(<Grandparent count={2} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
      `);

      const grandparentID = store.getElementIDAtIndex(0);
      const parentOneID = store.getElementIDAtIndex(1);
      const parentTwoID = store.getElementIDAtIndex(4);

      await act(() => store.toggleIsCollapsed(parentOneID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <Parent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
      `);

      await act(() => store.toggleIsCollapsed(parentTwoID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <Parent>
            ▸ <Parent>
      `);

      await act(() => store.toggleIsCollapsed(parentOneID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
            ▸ <Parent>
      `);

      await act(() => store.toggleIsCollapsed(grandparentID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);

      await act(() => store.toggleIsCollapsed(grandparentID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
            ▸ <Parent>
      `);
    });

    // @reactVersion >= 18.0
    it('should support reordering of children', async () => {
      const Root = ({children}) => children;
      const Component = () => null;

      const Foo = () => [<Component key="0" />];
      const Bar = () => [<Component key="0" />, <Component key="1" />];
      const foo = <Foo key="foo" />;
      const bar = <Bar key="bar" />;

      await act(() => render(<Root>{[foo, bar]}</Root>));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <Foo key="foo">
                <Component key="0">
            ▾ <Bar key="bar">
                <Component key="0">
                <Component key="1">
      `);

      await act(() => render(<Root>{[bar, foo]}</Root>));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <Bar key="bar">
                <Component key="0">
                <Component key="1">
            ▾ <Foo key="foo">
                <Component key="0">
      `);

      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(0), true),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);

      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(0), false),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <Bar key="bar">
                <Component key="0">
                <Component key="1">
            ▾ <Foo key="foo">
                <Component key="0">
      `);
    });
  });

  describe('collapseNodesByDefault:true', () => {
    beforeEach(() => {
      store.collapseNodesByDefault = true;
    });

    // @reactVersion >= 18.0
    it('should support mount and update operations', async () => {
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      await act(() =>
        render(
          <React.Fragment>
            <Parent count={1} />
            <Parent count={3} />
          </React.Fragment>,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent>
          ▸ <Parent>
      `);

      await act(() =>
        render(
          <React.Fragment>
            <Parent count={2} />
            <Parent count={1} />
          </React.Fragment>,
        ),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent>
          ▸ <Parent>
      `);

      await act(() => unmount());
      expect(store).toMatchInlineSnapshot(``);
    });

    // @reactVersion >= 18.0
    // @reactVersion < 19
    // @gate !disableLegacyMode
    it('should support mount and update operations for multiple roots (legacy render)', async () => {
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      const containerA = document.createElement('div');
      const containerB = document.createElement('div');

      await act(() => {
        legacyRender(<Parent key="A" count={3} />, containerA);
        legacyRender(<Parent key="B" count={2} />, containerB);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
        [root]
          ▸ <Parent key="B">
      `);

      await act(() => {
        legacyRender(<Parent key="A" count={4} />, containerA);
        legacyRender(<Parent key="B" count={1} />, containerB);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
        [root]
          ▸ <Parent key="B">
      `);

      await act(() => ReactDOM.unmountComponentAtNode(containerB));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
      `);

      await act(() => ReactDOM.unmountComponentAtNode(containerA));
      expect(store).toMatchInlineSnapshot(``);
    });

    // @reactVersion >= 18.0
    it('should support mount and update operations for multiple roots (createRoot)', async () => {
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      const containerA = document.createElement('div');
      const containerB = document.createElement('div');

      const rootA = ReactDOMClient.createRoot(containerA);
      const rootB = ReactDOMClient.createRoot(containerB);

      await act(() => {
        rootA.render(<Parent key="A" count={3} />);
        rootB.render(<Parent key="B" count={2} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
        [root]
          ▸ <Parent key="B">
      `);

      await act(() => {
        rootA.render(<Parent key="A" count={4} />);
        rootB.render(<Parent key="B" count={1} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
        [root]
          ▸ <Parent key="B">
      `);

      await act(() => rootB.unmount());
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Parent key="A">
      `);

      await act(() => rootA.unmount());
      expect(store).toMatchInlineSnapshot(``);
    });

    // @reactVersion >= 18.0
    it('should filter DOM nodes from the store tree', async () => {
      const Grandparent = () => (
        <div>
          <div>
            <Parent />
          </div>
          <Parent />
        </div>
      );
      const Parent = () => (
        <div>
          <Child />
        </div>
      );
      const Child = () => <div>Hi!</div>;

      await act(() => render(<Grandparent count={4} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);

      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(0), false),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <Parent>
            ▸ <Parent>
      `);

      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(1), false),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child>
            ▸ <Parent>
      `);
    });

    // @reactVersion >= 18.0
    it('should display Suspense nodes properly in various states', async () => {
      const Loading = () => <div>Loading...</div>;
      const never = new Promise(() => {});
      const SuspendingComponent = () => {
        readValue(never);
      };
      const Component = () => {
        return <div>Hello</div>;
      };
      const Wrapper = ({shouldSuspense}) => (
        <React.Fragment>
          <Component key="Outside" />
          <React.Suspense fallback={<Loading />}>
            {shouldSuspense ? (
              <SuspendingComponent />
            ) : (
              <Component key="Inside" />
            )}
          </React.Suspense>
        </React.Fragment>
      );

      await act(() => render(<Wrapper shouldSuspense={true} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Wrapper>
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="Wrapper" uniqueSuspenders={true} rects={null}>
      `);

      // This test isn't meaningful unless we expand the suspended tree
      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(0), false),
      );
      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(2), false),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense>
                <Loading>
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:10,height:1}]}
          <Suspense name="Wrapper" uniqueSuspenders={true} rects={null}>
      `);

      await act(() => {
        render(<Wrapper shouldSuspense={false} />);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
              <Component key="Outside">
            ▾ <Suspense>
                <Component key="Inside">
        [suspense-root]  rects={[{x:1,y:2,width:5,height:1}, {x:1,y:2,width:5,height:1}]}
          <Suspense name="Wrapper" uniqueSuspenders={true} rects={[{x:1,y:2,width:5,height:1}]}>
      `);
    });

    // @reactVersion >= 18.0
    it('should support expanding parts of the tree', async () => {
      const Grandparent = ({count}) => (
        <React.Fragment>
          <Parent count={count} />
          <Parent count={count} />
        </React.Fragment>
      );
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => <div>Hi!</div>;

      await act(() => render(<Grandparent count={2} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);

      const grandparentID = store.getElementIDAtIndex(0);

      await act(() => store.toggleIsCollapsed(grandparentID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <Parent>
            ▸ <Parent>
      `);

      const parentOneID = store.getElementIDAtIndex(1);
      const parentTwoID = store.getElementIDAtIndex(2);

      await act(() => store.toggleIsCollapsed(parentOneID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
            ▸ <Parent>
      `);

      await act(() => store.toggleIsCollapsed(parentTwoID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
      `);

      await act(() => store.toggleIsCollapsed(parentOneID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <Parent>
            ▾ <Parent>
                <Child key="0">
                <Child key="1">
      `);

      await act(() => store.toggleIsCollapsed(parentTwoID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Grandparent>
            ▸ <Parent>
            ▸ <Parent>
      `);

      await act(() => store.toggleIsCollapsed(grandparentID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Grandparent>
      `);
    });

    // @reactVersion >= 18.0
    it('should support expanding deep parts of the tree', async () => {
      const Wrapper = ({forwardedRef}) => (
        <Nested depth={3} forwardedRef={forwardedRef} />
      );
      const Nested = ({depth, forwardedRef}) =>
        depth > 0 ? (
          <Nested depth={depth - 1} forwardedRef={forwardedRef} />
        ) : (
          <div ref={forwardedRef} />
        );

      const ref = React.createRef();

      await act(() => render(<Wrapper forwardedRef={ref} />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Wrapper>
      `);

      const deepestedNodeID = agent.getIDForHostInstance(ref.current).id;

      await act(() => store.toggleIsCollapsed(deepestedNodeID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
            ▾ <Nested>
              ▾ <Nested>
                ▾ <Nested>
                    <Nested>
      `);

      const rootID = store.getElementIDAtIndex(0);

      await act(() => store.toggleIsCollapsed(rootID, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Wrapper>
      `);

      await act(() => store.toggleIsCollapsed(rootID, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
            ▾ <Nested>
              ▾ <Nested>
                ▾ <Nested>
                    <Nested>
      `);

      const id = store.getElementIDAtIndex(1);

      await act(() => store.toggleIsCollapsed(id, true));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
            ▸ <Nested>
      `);

      await act(() => store.toggleIsCollapsed(id, false));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Wrapper>
            ▾ <Nested>
              ▾ <Nested>
                ▾ <Nested>
                    <Nested>
      `);
    });

    // @reactVersion >= 18.0
    it('should support reordering of children', async () => {
      const Root = ({children}) => children;
      const Component = () => null;

      const Foo = () => [<Component key="0" />];
      const Bar = () => [<Component key="0" />, <Component key="1" />];
      const foo = <Foo key="foo" />;
      const bar = <Bar key="bar" />;

      await act(() => render(<Root>{[foo, bar]}</Root>));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);

      await act(() => render(<Root>{[bar, foo]}</Root>));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);

      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(0), false),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▸ <Bar key="bar">
            ▸ <Foo key="foo">
      `);

      await act(() => {
        store.toggleIsCollapsed(store.getElementIDAtIndex(2), false);
        store.toggleIsCollapsed(store.getElementIDAtIndex(1), false);
      });
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Root>
            ▾ <Bar key="bar">
                <Component key="0">
                <Component key="1">
            ▾ <Foo key="foo">
                <Component key="0">
      `);

      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(0), true),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <Root>
      `);
    });

    // @reactVersion >= 18.0
    it('should not add new nodes when suspense is toggled', async () => {
      const SuspenseTree = () => {
        return (
          <React.Suspense fallback={<Fallback>Loading outer</Fallback>}>
            <Parent />
          </React.Suspense>
        );
      };

      const Fallback = () => null;
      const Parent = () => <Child />;
      const Child = () => null;

      await act(() => render(<SuspenseTree />));
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▸ <SuspenseTree>
        [suspense-root]  rects={null}
          <Suspense name="SuspenseTree" uniqueSuspenders={false} rects={null}>
      `);

      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(0), false),
      );
      await act(() =>
        store.toggleIsCollapsed(store.getElementIDAtIndex(1), false),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <SuspenseTree>
            ▾ <Suspense>
              ▸ <Parent>
        [suspense-root]  rects={null}
          <Suspense name="SuspenseTree" uniqueSuspenders={false} rects={null}>
      `);

      const rendererID = getRendererID();
      const suspenseID = store.getElementIDAtIndex(1);

      await act(() =>
        agent.overrideSuspense({
          id: suspenseID,
          rendererID,
          forceFallback: true,
        }),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <SuspenseTree>
            ▾ <Suspense>
                <Fallback>
        [suspense-root]  rects={null}
          <Suspense name="SuspenseTree" uniqueSuspenders={false} rects={null}>
      `);

      await act(() =>
        agent.overrideSuspense({
          id: suspenseID,
          rendererID,
          forceFallback: false,
        }),
      );
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <SuspenseTree>
            ▾ <Suspense>
              ▸ <Parent>
        [suspense-root]  rects={null}
          <Suspense name="SuspenseTree" uniqueSuspenders={false} rects={null}>
      `);
    });
  });

  describe('getIndexOfElementID', () => {
    beforeEach(() => {
      store.collapseNodesByDefault = false;
    });

    // @reactVersion >= 18.0
    it('should support a single root with a single child', async () => {
      const Grandparent = () => (
        <React.Fragment>
          <Parent />
          <Parent />
        </React.Fragment>
      );
      const Parent = () => <Child />;
      const Child = () => null;

      await act(() => render(<Grandparent />));

      for (let i = 0; i < store.numElements; i++) {
        expect(store.getIndexOfElementID(store.getElementIDAtIndex(i))).toBe(i);
      }
    });

    // @reactVersion >= 18.0
    it('should support multiple roots with one children each', async () => {
      const Grandparent = () => <Parent />;
      const Parent = () => <Child />;
      const Child = () => null;

      await act(() => {
        render(<Grandparent />);
        render(<Grandparent />);
      });

      for (let i = 0; i < store.numElements; i++) {
        expect(store.getIndexOfElementID(store.getElementIDAtIndex(i))).toBe(i);
      }
    });

    // @reactVersion >= 18.0
    it('should support a single root with multiple top level children', async () => {
      const Grandparent = () => <Parent />;
      const Parent = () => <Child />;
      const Child = () => null;

      await act(() =>
        render(
          <React.Fragment>
            <Grandparent />
            <Grandparent />
          </React.Fragment>,
        ),
      );

      for (let i = 0; i < store.numElements; i++) {
        expect(store.getIndexOfElementID(store.getElementIDAtIndex(i))).toBe(i);
      }
    });

    // @reactVersion >= 18.0
    it('should support multiple roots with multiple top level children', async () => {
      const Grandparent = () => <Parent />;
      const Parent = () => <Child />;
      const Child = () => null;

      await act(() => {
        render(
          <React.Fragment>
            <Grandparent />
            <Grandparent />
          </React.Fragment>,
        );

        createContainer();

        render(
          <React.Fragment>
            <Grandparent />
            <Grandparent />
          </React.Fragment>,
        );
      });

      for (let i = 0; i < store.numElements; i++) {
        expect(store.getIndexOfElementID(store.getElementIDAtIndex(i))).toBe(i);
      }
    });
  });

  // @reactVersion >= 18.0
  // @reactVersion < 19
  // @gate !disableLegacyMode
  it('detects and updates profiling support based on the attached roots (legacy render)', async () => {
    const Component = () => null;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    expect(store.rootSupportsBasicProfiling).toBe(false);

    await act(() => legacyRender(<Component />, containerA));
    expect(store.rootSupportsBasicProfiling).toBe(true);

    await act(() => legacyRender(<Component />, containerB));
    await act(() => ReactDOM.unmountComponentAtNode(containerA));
    expect(store.rootSupportsBasicProfiling).toBe(true);

    await act(() => ReactDOM.unmountComponentAtNode(containerB));
    expect(store.rootSupportsBasicProfiling).toBe(false);
  });

  // @reactVersion >= 18
  it('detects and updates profiling support based on the attached roots (createRoot)', async () => {
    const Component = () => null;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    const rootA = ReactDOMClient.createRoot(containerA);
    const rootB = ReactDOMClient.createRoot(containerB);

    expect(store.rootSupportsBasicProfiling).toBe(false);

    await act(() => rootA.render(<Component />));
    expect(store.rootSupportsBasicProfiling).toBe(true);

    await act(() => rootB.render(<Component />));
    await act(() => rootA.unmount());
    expect(store.rootSupportsBasicProfiling).toBe(true);

    await act(() => rootB.unmount());
    expect(store.rootSupportsBasicProfiling).toBe(false);
  });

  // @reactVersion >= 18.0
  it('should properly serialize non-string key values', async () => {
    const Child = () => null;

    // Bypass React element's automatic stringifying of keys intentionally.
    // This is pretty hacky.
    const fauxElement = Object.assign({}, <Child />, {key: 123});

    await act(() => render([fauxElement]));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Child key="123">
    `);
  });

  it('should show the right display names for special component types', async () => {
    const MyComponent = (props, ref) => null;
    const ForwardRefComponent = React.forwardRef(MyComponent);
    const MyComponent2 = (props, ref) => null;
    const ForwardRefComponentWithAnonymousFunction = React.forwardRef(() => (
      <MyComponent2 />
    ));
    const MyComponent3 = (props, ref) => null;
    const ForwardRefComponentWithCustomDisplayName =
      React.forwardRef(MyComponent3);
    ForwardRefComponentWithCustomDisplayName.displayName = 'Custom';
    const MyComponent4 = (props, ref) => null;
    const MemoComponent = React.memo(MyComponent4);
    const MemoForwardRefComponent = React.memo(ForwardRefComponent);

    const FakeHigherOrderComponent = () => null;
    FakeHigherOrderComponent.displayName = 'withFoo(withBar(Baz))';

    const MemoizedFakeHigherOrderComponent = React.memo(
      FakeHigherOrderComponent,
    );
    const ForwardRefFakeHigherOrderComponent = React.forwardRef(
      FakeHigherOrderComponent,
    );

    const MemoizedFakeHigherOrderComponentWithDisplayNameOverride = React.memo(
      FakeHigherOrderComponent,
    );
    MemoizedFakeHigherOrderComponentWithDisplayNameOverride.displayName =
      'memoRefOverride';
    const ForwardRefFakeHigherOrderComponentWithDisplayNameOverride =
      React.forwardRef(FakeHigherOrderComponent);
    ForwardRefFakeHigherOrderComponentWithDisplayNameOverride.displayName =
      'forwardRefOverride';

    const App = () => (
      <React.Fragment>
        <MyComponent />
        <ForwardRefComponent />
        <ForwardRefComponentWithAnonymousFunction />
        <ForwardRefComponentWithCustomDisplayName />
        <MemoComponent />
        <MemoForwardRefComponent />
        <FakeHigherOrderComponent />
        <MemoizedFakeHigherOrderComponent />
        <ForwardRefFakeHigherOrderComponent />
        <MemoizedFakeHigherOrderComponentWithDisplayNameOverride />
        <ForwardRefFakeHigherOrderComponentWithDisplayNameOverride />
      </React.Fragment>
    );

    // Render once to start fetching the lazy component
    await act(() => render(<App />));

    await Promise.resolve();

    // Render again after it resolves
    await act(() => render(<App />));

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
            <MyComponent>
            <MyComponent> [ForwardRef]
          ▾ <Anonymous> [ForwardRef]
              <MyComponent2>
            <Custom>
            <MyComponent4> [Memo]
          ▾ <MyComponent> [Memo]
              <MyComponent> [ForwardRef]
            <Baz> [withFoo][withBar]
            <Baz> [Memo][withFoo][withBar]
            <Baz> [ForwardRef][withFoo][withBar]
            <memoRefOverride>
            <forwardRefOverride>
    `);
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

    // @reactVersion >= 18.0
    // @reactVersion < 19
    // @gate !disableLegacyMode
    it('should support Lazy components (legacy render)', async () => {
      const container = document.createElement('div');

      // Render once to start fetching the lazy component
      await act(() => legacyRender(<App renderChildren={true} />, container));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Suspense>
      `);

      await Promise.resolve();

      // Render again after it resolves
      await act(() => legacyRender(<App renderChildren={true} />, container));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▾ <Suspense>
                <LazyInnerComponent>
      `);

      // Render again to unmount it
      await act(() => legacyRender(<App renderChildren={false} />, container));

      expect(store).toMatchInlineSnapshot(`
        [root]
            <App>
      `);
    });

    // @reactVersion >= 18.0
    it('should support Lazy components in (createRoot)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      // Render once to start fetching the lazy component
      await act(() => root.render(<App renderChildren={true} />));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Suspense>
        [suspense-root]  rects={null}
          <Suspense name="App" uniqueSuspenders={true} rects={null}>
      `);

      await Promise.resolve();

      // Render again after it resolves
      await act(() => root.render(<App renderChildren={true} />));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▾ <Suspense>
                <LazyInnerComponent>
        [suspense-root]  rects={null}
          <Suspense name="App" uniqueSuspenders={true} rects={null}>
      `);

      // Render again to unmount it
      await act(() => root.render(<App renderChildren={false} />));

      expect(store).toMatchInlineSnapshot(`
        [root]
            <App>
      `);
    });

    // @reactVersion >= 18.0
    // @reactVersion < 19
    // @gate !disableLegacyMode
    it('should support Lazy components that are unmounted before they finish loading (legacy render)', async () => {
      const container = document.createElement('div');

      // Render once to start fetching the lazy component
      await act(() => legacyRender(<App renderChildren={true} />, container));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Suspense>
      `);

      // Render again to unmount it before it finishes loading
      await act(() => legacyRender(<App renderChildren={false} />, container));

      expect(store).toMatchInlineSnapshot(`
        [root]
            <App>
      `);
    });

    // @reactVersion >= 18.0
    // @reactVersion < 19
    it('should support Lazy components that are unmounted before they finish loading in (createRoot)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      // Render once to start fetching the lazy component
      await act(() => root.render(<App renderChildren={true} />));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
              <Suspense>
        [suspense-root]  rects={null}
          <Suspense name="App" rects={null}>
      `);

      // Render again to unmount it before it finishes loading
      await act(() => root.render(<App renderChildren={false} />));

      expect(store).toMatchInlineSnapshot(`
        [root]
            <App>
      `);
    });
  });

  describe('inline errors and warnings', () => {
    // @reactVersion >= 18.0
    it('during render are counted', async () => {
      function Example() {
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        return null;
      }

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() => render(<Example />));
      });

      expect(store).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
            <Example> ✕⚠
      `);

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() => render(<Example rerender={1} />));
      });

      expect(store).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
            <Example> ✕⚠
      `);
    });

    // @reactVersion >= 18.0
    it('during layout get counted', async () => {
      function Example() {
        React.useLayoutEffect(() => {
          console.error('test-only: layout error');
          console.warn('test-only: layout warning');
        });
        return null;
      }

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() => render(<Example />));
      });

      expect(store).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
            <Example> ✕⚠
      `);

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() => render(<Example rerender={1} />));
      });

      expect(store).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
            <Example> ✕⚠
      `);
    });

    describe('during passive effects', () => {
      function flushPendingBridgeOperations() {
        jest.runOnlyPendingTimers();
      }

      // @reactVersion >= 18.0
      it('are counted (after no delay)', async () => {
        function Example() {
          React.useEffect(() => {
            console.error('test-only: passive error');
            console.warn('test-only: passive warning');
          });
          return null;
        }

        withErrorsOrWarningsIgnored(['test-only:'], async () => {
          await act(() => {
            render(<Example />);
          }, false);
        });
        flushPendingBridgeOperations();
        expect(store).toMatchInlineSnapshot(`
          ✕ 1, ⚠ 1
          [root]
              <Example> ✕⚠
        `);

        await act(() => unmount());
        expect(store).toMatchInlineSnapshot(``);
      });

      // @reactVersion >= 18.0
      it('are flushed early when there is a new commit', async () => {
        function Example() {
          React.useEffect(() => {
            console.error('test-only: passive error');
            console.warn('test-only: passive warning');
          });
          return null;
        }

        function Noop() {
          return null;
        }

        withErrorsOrWarningsIgnored(['test-only:'], () => {
          act(() => {
            render(
              <>
                <Example />
              </>,
            );
          }, false);
          flushPendingBridgeOperations();
          expect(store).toMatchInlineSnapshot(`
            ✕ 1, ⚠ 1
            [root]
                <Example> ✕⚠
          `);

          // Before warnings and errors have flushed, flush another commit.
          act(() => {
            render(
              <>
                <Example />
                <Noop />
              </>,
            );
          }, false);
          flushPendingBridgeOperations();
          expect(store).toMatchInlineSnapshot(`
            ✕ 2, ⚠ 2
            [root]
                <Example> ✕⚠
                <Noop>
          `);
        });

        await act(() => unmount());
        expect(store).toMatchInlineSnapshot(``);
      });
    });

    // In React 19, JSX warnings were moved into the renderer - https://github.com/facebook/react/pull/29088
    // The warning is moved to the Child instead of the Parent.
    // @reactVersion >= 19.0.1
    it('from react get counted [React >= 19.0.1]', async () => {
      function Example() {
        return [<Child />];
      }
      function Child() {
        return null;
      }

      withErrorsOrWarningsIgnored(
        ['Each child in a list should have a unique "key" prop'],
        () => {
          act(() => render(<Example />));
        },
      );

      expect(store).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 0
        [root]
          ▾ <Example>
              <Child> ✕
      `);
    });

    // @reactVersion >= 18.0
    // @reactVersion < 19.0
    it('from react get counted [React 18.x]', async () => {
      function Example() {
        return [<Child />];
      }
      function Child() {
        return null;
      }

      withErrorsOrWarningsIgnored(
        ['Each child in a list should have a unique "key" prop'],
        () => {
          act(() => render(<Example />));
        },
      );

      expect(store).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 0
        [root]
          ▾ <Example> ✕
              <Child>
      `);
    });

    // @reactVersion >= 18.0
    it('can be cleared for the whole app', async () => {
      function Example() {
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        return null;
      }

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() =>
          render(
            <React.Fragment>
              <Example />
              <Example />
            </React.Fragment>,
          ),
        );
      });

      expect(store).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
            <Example> ✕⚠
            <Example> ✕⚠
      `);

      const {
        clearErrorsAndWarnings,
      } = require('react-devtools-shared/src/backendAPI');
      clearErrorsAndWarnings({bridge, store});

      // flush events to the renderer
      jest.runAllTimers();

      expect(store).toMatchInlineSnapshot(`
        [root]
            <Example>
            <Example>
      `);
    });

    // @reactVersion >= 18.0
    it('can be cleared for particular Fiber (only warnings)', async () => {
      function Example() {
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        return null;
      }

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() =>
          render(
            <React.Fragment>
              <Example />
              <Example />
            </React.Fragment>,
          ),
        );
      });

      expect(store).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
            <Example> ✕⚠
            <Example> ✕⚠
      `);

      const id = ((store.getElementIDAtIndex(1): any): number);
      const rendererID = store.getRendererIDForElement(id);

      const {
        clearWarningsForElement,
      } = require('react-devtools-shared/src/backendAPI');
      clearWarningsForElement({bridge, id, rendererID});

      // Flush events to the renderer.
      jest.runAllTimers();

      expect(store).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 1
        [root]
            <Example> ✕⚠
            <Example> ✕
      `);
    });

    // @reactVersion >= 18.0
    it('can be cleared for a particular Fiber (only errors)', async () => {
      function Example() {
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        return null;
      }

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() =>
          render(
            <React.Fragment>
              <Example />
              <Example />
            </React.Fragment>,
          ),
        );
      });

      expect(store).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
            <Example> ✕⚠
            <Example> ✕⚠
      `);

      const id = ((store.getElementIDAtIndex(1): any): number);
      const rendererID = store.getRendererIDForElement(id);

      const {
        clearErrorsForElement,
      } = require('react-devtools-shared/src/backendAPI');
      clearErrorsForElement({bridge, id, rendererID});

      // Flush events to the renderer.
      jest.runAllTimers();

      expect(store).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 2
        [root]
            <Example> ✕⚠
            <Example> ⚠
      `);
    });

    // @reactVersion >= 18.0
    it('are updated when fibers are removed from the tree', async () => {
      function ComponentWithWarning() {
        console.warn('test-only: render warning');
        return null;
      }
      function ComponentWithError() {
        console.error('test-only: render error');
        return null;
      }
      function ComponentWithWarningAndError() {
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        return null;
      }

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() =>
          render(
            <React.Fragment>
              <ComponentWithError />
              <ComponentWithWarning />
              <ComponentWithWarningAndError />
            </React.Fragment>,
          ),
        );
      });
      expect(store).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
            <ComponentWithError> ✕
            <ComponentWithWarning> ⚠
            <ComponentWithWarningAndError> ✕⚠
      `);

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() =>
          render(
            <React.Fragment>
              <ComponentWithWarning />
              <ComponentWithWarningAndError />
            </React.Fragment>,
          ),
        );
      });
      expect(store).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 2
        [root]
            <ComponentWithWarning> ⚠
            <ComponentWithWarningAndError> ✕⚠
      `);

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() =>
          render(
            <React.Fragment>
              <ComponentWithWarning />
            </React.Fragment>,
          ),
        );
      });
      expect(store).toMatchInlineSnapshot(`
        ✕ 0, ⚠ 2
        [root]
            <ComponentWithWarning> ⚠
      `);

      withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await act(() => render(<React.Fragment />));
      });
      expect(store).toMatchInlineSnapshot(``);
      expect(store.componentWithErrorCount).toBe(0);
      expect(store.componentWithWarningCount).toBe(0);
    });

    // Regression test for https://github.com/facebook/react/issues/23202
    // @reactVersion >= 18.0
    it('suspense boundary children should not double unmount and error', async () => {
      async function fakeImport(result) {
        return {default: result};
      }

      const ChildA = () => null;
      const ChildB = () => null;

      const LazyChildA = React.lazy(() => fakeImport(ChildA));
      const LazyChildB = React.lazy(() => fakeImport(ChildB));

      function App({renderA}) {
        return (
          <React.Suspense>
            {renderA ? <LazyChildA /> : <LazyChildB />}
          </React.Suspense>
        );
      }

      await actAsync(() => render(<App renderA={true} />));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▾ <Suspense>
                <ChildA>
        [suspense-root]  rects={null}
          <Suspense name="App" uniqueSuspenders={true} rects={null}>
      `);

      await actAsync(() => render(<App renderA={false} />));

      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <App>
            ▾ <Suspense>
                <ChildB>
        [suspense-root]  rects={null}
          <Suspense name="App" uniqueSuspenders={true} rects={null}>
      `);
    });
  });

  // @reactVersion > 18.2
  it('does not show server components without any children reified children', async () => {
    // A Server Component that doesn't render into anything on the client doesn't show up.
    const ServerPromise = Promise.resolve(null);
    ServerPromise._debugInfo = [
      {
        name: 'ServerComponent',
        env: 'Server',
        owner: null,
      },
    ];
    const App = () => ServerPromise;

    await actAsync(() => render(<App />));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <App>
    `);
  });

  // @reactVersion > 18.2
  it('does show a server component that renders into a filtered node', async () => {
    const ServerPromise = Promise.resolve(<div />);
    ServerPromise._debugInfo = [
      {
        name: 'ServerComponent',
        env: 'Server',
        owner: null,
      },
    ];
    const App = () => ServerPromise;

    await actAsync(() => render(<App />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
            <ServerComponent> [Server]
    `);
  });

  it('can render the same server component twice', async () => {
    function ClientComponent() {
      return <div />;
    }
    const ServerPromise = Promise.resolve(<ClientComponent />);
    ServerPromise._debugInfo = [
      {
        name: 'ServerComponent',
        env: 'Server',
        owner: null,
      },
    ];
    const App = () => (
      <>
        {ServerPromise}
        <ClientComponent />
        {ServerPromise}
      </>
    );

    await actAsync(() => render(<App />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerComponent> [Server]
              <ClientComponent>
            <ClientComponent>
          ▾ <ServerComponent> [Server]
              <ClientComponent>
    `);
  });

  // @reactVersion > 18.2
  it('collapses multiple parent server components into one', async () => {
    function ClientComponent() {
      return <div />;
    }
    const ServerPromise = Promise.resolve(<ClientComponent />);
    ServerPromise._debugInfo = [
      {
        name: 'ServerComponent',
        env: 'Server',
        owner: null,
      },
    ];
    const ServerPromise2 = Promise.resolve(<ClientComponent />);
    ServerPromise2._debugInfo = [
      {
        name: 'ServerComponent2',
        env: 'Server',
        owner: null,
      },
    ];
    const App = ({initial}) => (
      <>
        {ServerPromise}
        {ServerPromise}
        {ServerPromise2}
        {initial ? null : ServerPromise2}
      </>
    );

    await actAsync(() => render(<App initial={true} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerComponent> [Server]
              <ClientComponent>
              <ClientComponent>
          ▾ <ServerComponent2> [Server]
              <ClientComponent>
    `);

    await actAsync(() => render(<App initial={false} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerComponent> [Server]
              <ClientComponent>
              <ClientComponent>
          ▾ <ServerComponent2> [Server]
              <ClientComponent>
              <ClientComponent>
    `);
  });

  // @reactVersion > 18.2
  it('can reparent a child when the server components change', async () => {
    function ClientComponent() {
      return <div />;
    }
    const ServerPromise = Promise.resolve(<ClientComponent />);
    ServerPromise._debugInfo = [
      {
        name: 'ServerAB',
        env: 'Server',
        owner: null,
      },
    ];
    const ServerPromise2 = Promise.resolve(<ClientComponent />);
    ServerPromise2._debugInfo = [
      {
        name: 'ServerA',
        env: 'Server',
        owner: null,
      },
      {
        name: 'ServerB',
        env: 'Server',
        owner: null,
      },
    ];
    const App = ({initial}) => (initial ? ServerPromise : ServerPromise2);

    await actAsync(() => render(<App initial={true} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerAB> [Server]
              <ClientComponent>
    `);

    await actAsync(() => render(<App initial={false} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerA> [Server]
            ▾ <ServerB> [Server]
                <ClientComponent>
    `);
  });

  // @reactVersion > 18.2
  it('splits a server component parent when a different child appears between', async () => {
    function ClientComponent() {
      return <div />;
    }
    const ServerPromise = Promise.resolve(<ClientComponent />);
    ServerPromise._debugInfo = [
      {
        name: 'ServerComponent',
        env: 'Server',
        owner: null,
      },
    ];
    const App = ({initial}) =>
      initial ? (
        <>
          {ServerPromise}
          {null}
          {ServerPromise}
        </>
      ) : (
        <>
          {ServerPromise}
          <ClientComponent />
          {ServerPromise}
        </>
      );

    await actAsync(() => render(<App initial={true} />));
    // Initially the Server Component only appears once because the children
    // are consecutive.
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerComponent> [Server]
              <ClientComponent>
              <ClientComponent>
    `);

    // Later the same instance gets split into two when it is no longer
    // consecutive so we need two virtual instances to represent two parents.
    await actAsync(() => render(<App initial={false} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerComponent> [Server]
              <ClientComponent>
            <ClientComponent>
          ▾ <ServerComponent> [Server]
              <ClientComponent>
    `);
  });

  // @reactVersion > 18.2
  it('can reorder keyed server components', async () => {
    function ClientComponent({text}) {
      return <div>{text}</div>;
    }
    function getServerComponent(key) {
      const ServerPromise = Promise.resolve(
        <ClientComponent key={key} text={key} />,
      );
      ServerPromise._debugInfo = [
        {
          name: 'ServerComponent',
          env: 'Server',
          owner: null,
          key: key,
        },
      ];
      return ServerPromise;
    }
    const set1 = ['A', 'B', 'C'].map(getServerComponent);
    const set2 = ['B', 'A', 'D'].map(getServerComponent);

    const App = ({initial}) => (initial ? set1 : set2);

    await actAsync(() => render(<App initial={true} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerComponent key="A"> [Server]
              <ClientComponent key="A">
          ▾ <ServerComponent key="B"> [Server]
              <ClientComponent key="B">
          ▾ <ServerComponent key="C"> [Server]
              <ClientComponent key="C">
      `);

    await actAsync(() => render(<App initial={false} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ServerComponent key="B"> [Server]
              <ClientComponent key="B">
          ▾ <ServerComponent key="A"> [Server]
              <ClientComponent key="A">
          ▾ <ServerComponent key="D"> [Server]
              <ClientComponent key="D">
      `);
  });

  // @reactVersion >= 19.0
  it('does not duplicate Server Component parents in keyed Fragments', async () => {
    // TODO: Use an actual Flight renderer.
    // See ReactFlight-test for the produced JSX from Flight.
    function ClientComponent() {
      return null;
    }
    // This used to be a keyed Fragment on the Server.
    const children = [<ClientComponent key="app" />];
    children._debugInfo = [
      {time: 12},
      {
        name: 'App',
        env: 'Server',
        key: null,
        stack: '    in Object.<anonymous> (at **)',
        props: {},
      },
      {time: 13},
    ];

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await actAsync(() => {
      root.render([children]);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App> [Server]
            <ClientComponent key="app">
    `);
  });

  // @reactVersion >= 17.0
  it('can reconcile Suspense in fallback positions', async () => {
    let resolveFallback;
    const fallbackPromise = new Promise(resolve => {
      resolveFallback = resolve;
    });
    let resolveContent;
    const contentPromise = new Promise(resolve => {
      resolveContent = resolve;
    });

    function Component({children, promise}) {
      if (promise) {
        readValue(promise);
      }
      return <div>{children}</div>;
    }

    await actAsync(() =>
      render(
        <React.Suspense
          name="content"
          fallback={
            <React.Suspense
              name="fallback"
              fallback={
                <Component key="fallback-fallback">
                  Loading fallback...
                </Component>
              }>
              <Component key="fallback-content" promise={fallbackPromise}>
                Loading...
              </Component>
            </React.Suspense>
          }>
          <Component key="content" promise={contentPromise}>
            done
          </Component>
        </React.Suspense>,
      ),
    );

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="content">
          ▾ <Suspense name="fallback">
              <Component key="fallback-fallback">
      [suspense-root]  rects={[{x:1,y:2,width:19,height:1}]}
        <Suspense name="content" uniqueSuspenders={true} rects={null}>
        <Suspense name="fallback" uniqueSuspenders={true} rects={null}>
    `);

    await actAsync(() => {
      resolveFallback();
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="content">
          ▾ <Suspense name="fallback">
              <Component key="fallback-content">
      [suspense-root]  rects={[{x:1,y:2,width:10,height:1}]}
        <Suspense name="content" uniqueSuspenders={true} rects={null}>
        <Suspense name="fallback" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}]}>
    `);

    await actAsync(() => {
      resolveContent();
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="content">
            <Component key="content">
      [suspense-root]  rects={[{x:1,y:2,width:4,height:1}]}
        <Suspense name="content" uniqueSuspenders={true} rects={[{x:1,y:2,width:4,height:1}]}>
    `);
  });

  // @reactVersion >= 17.0
  it('can reconcile resuspended Suspense with Suspense in fallback positions', async () => {
    let resolveHeadFallback;
    let resolveHeadContent;
    let resolveMainFallback;
    let resolveMainContent;

    function Component({children, promise}) {
      if (promise) {
        readValue(promise);
      }
      return <div>{children}</div>;
    }

    function WithSuspenseInFallback({fallbackPromise, contentPromise, name}) {
      return (
        <React.Suspense
          name={name}
          fallback={
            <React.Suspense
              name={`${name}-fallback`}
              fallback={
                <Component key={`${name}-fallback-fallback`}>
                  Loading fallback...
                </Component>
              }>
              <Component
                key={`${name}-fallback-content`}
                promise={fallbackPromise}>
                Loading...
              </Component>
            </React.Suspense>
          }>
          <Component key={`${name}-content`} promise={contentPromise}>
            done
          </Component>
        </React.Suspense>
      );
    }

    function App({
      headFallbackPromise,
      headContentPromise,
      mainContentPromise,
      mainFallbackPromise,
      tailContentPromise,
      tailFallbackPromise,
    }) {
      return (
        <>
          <WithSuspenseInFallback
            fallbackPromise={headFallbackPromise}
            contentPromise={headContentPromise}
            name="head"
          />
          <WithSuspenseInFallback
            fallbackPromise={mainFallbackPromise}
            contentPromise={mainContentPromise}
            name="main"
          />
        </>
      );
    }

    const initialHeadContentPromise = new Promise(resolve => {
      resolveHeadContent = resolve;
    });
    const initialHeadFallbackPromise = new Promise(resolve => {
      resolveHeadFallback = resolve;
    });
    const initialMainContentPromise = new Promise(resolve => {
      resolveMainContent = resolve;
    });
    const initialMainFallbackPromise = new Promise(resolve => {
      resolveMainFallback = resolve;
    });
    await actAsync(() =>
      render(
        <App
          headFallbackPromise={initialHeadFallbackPromise}
          headContentPromise={initialHeadContentPromise}
          mainContentPromise={initialMainContentPromise}
          mainFallbackPromise={initialMainFallbackPromise}
        />,
      ),
    );

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="head">
              ▾ <Suspense name="head-fallback">
                  <Component key="head-fallback-fallback">
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="main">
              ▾ <Suspense name="main-fallback">
                  <Component key="main-fallback-fallback">
      [suspense-root]  rects={[{x:1,y:2,width:19,height:1}, {x:1,y:2,width:19,height:1}]}
        <Suspense name="head" uniqueSuspenders={true} rects={null}>
        <Suspense name="head-fallback" uniqueSuspenders={true} rects={null}>
        <Suspense name="main" uniqueSuspenders={true} rects={null}>
        <Suspense name="main-fallback" uniqueSuspenders={true} rects={null}>
    `);

    await actAsync(() => {
      resolveHeadFallback();
      resolveMainFallback();
      resolveHeadContent();
      resolveMainContent();
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="head">
                <Component key="head-content">
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="main">
                <Component key="main-content">
      [suspense-root]  rects={[{x:1,y:2,width:4,height:1}, {x:1,y:2,width:4,height:1}]}
        <Suspense name="head" uniqueSuspenders={true} rects={[{x:1,y:2,width:4,height:1}]}>
        <Suspense name="main" uniqueSuspenders={true} rects={[{x:1,y:2,width:4,height:1}]}>
    `);

    // Resuspend head content
    const nextHeadContentPromise = new Promise(resolve => {
      resolveHeadContent = resolve;
    });
    await actAsync(() =>
      render(
        <App
          headFallbackPromise={initialHeadFallbackPromise}
          headContentPromise={nextHeadContentPromise}
          mainContentPromise={initialMainContentPromise}
          mainFallbackPromise={initialMainFallbackPromise}
        />,
      ),
    );

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="head">
              ▾ <Suspense name="head-fallback">
                  <Component key="head-fallback-content">
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="main">
                <Component key="main-content">
      [suspense-root]  rects={[{x:1,y:2,width:4,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:4,height:1}]}
        <Suspense name="head" uniqueSuspenders={true} rects={[{x:1,y:2,width:4,height:1}]}>
        <Suspense name="head-fallback" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}]}>
        <Suspense name="main" uniqueSuspenders={true} rects={[{x:1,y:2,width:4,height:1}]}>
    `);

    // Resuspend head fallback
    const nextHeadFallbackPromise = new Promise(resolve => {
      resolveHeadFallback = resolve;
    });
    await actAsync(() =>
      render(
        <App
          headFallbackPromise={nextHeadFallbackPromise}
          headContentPromise={nextHeadContentPromise}
          mainContentPromise={initialMainContentPromise}
          mainFallbackPromise={initialMainFallbackPromise}
        />,
      ),
    );

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="head">
              ▾ <Suspense name="head-fallback">
                  <Component key="head-fallback-fallback">
          ▾ <WithSuspenseInFallback>
            ▾ <Suspense name="main">
                <Component key="main-content">
      [suspense-root]  rects={[{x:1,y:2,width:4,height:1}, {x:1,y:2,width:10,height:1}, {x:1,y:2,width:19,height:1}, {x:1,y:2,width:4,height:1}]}
        <Suspense name="head" uniqueSuspenders={true} rects={[{x:1,y:2,width:4,height:1}]}>
        <Suspense name="head-fallback" uniqueSuspenders={true} rects={[{x:1,y:2,width:10,height:1}]}>
        <Suspense name="main" uniqueSuspenders={true} rects={[{x:1,y:2,width:4,height:1}]}>
    `);

    await actAsync(() => render(null));

    expect(store).toMatchInlineSnapshot(``);
  });

  it('should handle an empty root', async () => {
    await actAsync(() => render(null));
    expect(store).toMatchInlineSnapshot(``);

    await actAsync(() => render(<span />));
    expect(store).toMatchInlineSnapshot(`[root]`);
  });

  // @reactVersion >= 19.0
  it('should reconcile promise-as-a-child', async () => {
    function Component({children}) {
      return <div>{children}</div>;
    }

    await actAsync(() =>
      render(
        <React.Suspense>
          {Promise.resolve(<Component key="A">A</Component>)}
        </React.Suspense>,
      ),
    );
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense>
            <Component key="A">
      [suspense-root]  rects={[{x:1,y:2,width:1,height:1}]}
        <Suspense name="Unknown" uniqueSuspenders={true} rects={[{x:1,y:2,width:1,height:1}]}>
    `);

    await actAsync(() =>
      render(
        <React.Suspense>
          {Promise.resolve(<Component key="not-A">not A</Component>)}
        </React.Suspense>,
      ),
    );

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense>
            <Component key="not-A">
      [suspense-root]  rects={[{x:1,y:2,width:5,height:1}]}
        <Suspense name="Unknown" uniqueSuspenders={true} rects={[{x:1,y:2,width:5,height:1}]}>
    `);

    await actAsync(() => render(null));
    expect(store).toMatchInlineSnapshot(``);
  });

  // Can't suspend the root in React 17.
  // @reactVersion >= 18.0
  it('should track suspended-by in filtered fallback suspending the root', async () => {
    function IgnoreMe({promise}) {
      return readValue(promise);
    }

    function Component({promise}) {
      return readValue(promise);
    }

    await actAsync(
      async () =>
        (store.componentFilters = [createDisplayNameFilter('^IgnoreMe', true)]),
    );

    let resolveFallback;
    const fallbackPromise = new Promise(resolve => {
      resolveFallback = resolve;
    });
    let resolveContent;
    const contentPromise = new Promise(resolve => {
      resolveContent = resolve;
    });

    await actAsync(() =>
      render(
        <React.Suspense
          name="main"
          fallback={<IgnoreMe promise={fallbackPromise} />}>
          <Component promise={contentPromise} />
        </React.Suspense>,
      ),
    );
    expect(store).toMatchInlineSnapshot(``);

    await actAsync(() => resolveFallback('loading'));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Suspense name="main">
      [suspense-root]  rects={null}
        <Suspense name="main" uniqueSuspenders={true} rects={null}>
    `);

    await actAsync(() => resolveContent('content'));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="main">
            <Component>
      [suspense-root]  rects={null}
        <Suspense name="main" uniqueSuspenders={true} rects={null}>
    `);
  });

  // @reactVersion >= 17.0
  it('should track suspended-by in filtered fallback', async () => {
    function IgnoreMe({promise}) {
      return readValue(promise);
    }

    function Component({promise}) {
      if (promise) {
        return readValue(promise);
      }
      return null;
    }

    await actAsync(
      async () =>
        (store.componentFilters = [createDisplayNameFilter('^IgnoreMe', true)]),
    );

    let resolveFallback;
    const fallbackPromise = new Promise(resolve => {
      resolveFallback = resolve;
    });
    let resolveContent;
    const contentPromise = new Promise(resolve => {
      resolveContent = resolve;
    });

    await actAsync(() =>
      render(
        <React.Suspense
          fallback={<Component key="root-fallback" />}
          name="root">
          <React.Suspense
            name="main"
            fallback={<IgnoreMe promise={fallbackPromise} />}>
            <Component promise={contentPromise} />
          </React.Suspense>
        </React.Suspense>,
      ),
    );

    if (semver.lt(ReactVersionTestingAgainst, '18.0.0')) {
      // React 17 commits partial trees hidden which causes the "main"
      // Suspense boundary to be included.
      // React 18 and upwards excluded partial tree entirely.
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Suspense name="root">
              <Component key="root-fallback">
        [suspense-root]  rects={null}
          <Suspense name="root" rects={null}>
            <Suspense name="main" rects={null}>
      `);
    } else {
      expect(store).toMatchInlineSnapshot(`
        [root]
          ▾ <Suspense name="root">
              <Component key="root-fallback">
        [suspense-root]  rects={null}
          <Suspense name="root" uniqueSuspenders={true} rects={null}>
      `);
    }

    await actAsync(() => resolveFallback('loading'));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="root">
            <Suspense name="main">
      [suspense-root]  rects={null}
        <Suspense name="root" uniqueSuspenders={true} rects={null}>
          <Suspense name="main" uniqueSuspenders={true} rects={null}>
    `);

    await actAsync(() => resolveContent('content'));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="root">
          ▾ <Suspense name="main">
              <Component>
      [suspense-root]  rects={null}
        <Suspense name="root" uniqueSuspenders={true} rects={null}>
          <Suspense name="main" uniqueSuspenders={true} rects={null}>
    `);
  });

  // @reactVersion >= 19
  it('should keep suspended boundaries in the Suspense tree but not hidden Activity', async () => {
    const Activity = React.Activity || React.unstable_Activity;

    const never = new Promise(() => {});
    function Never() {
      readValue(never);
      return null;
    }
    function Component({children}) {
      return <div>{children}</div>;
    }

    function App({hidden}) {
      return (
        <>
          <Activity mode={hidden ? 'hidden' : 'visible'}>
            <React.Suspense name="inside-activity">
              <Component key="inside-activity">inside Activity</Component>
            </React.Suspense>
          </Activity>
          <React.Suspense name="outer-suspense">
            <React.Suspense name="inner-suspense">
              <Component key="inside-suspense">inside Suspense</Component>
            </React.Suspense>
            {hidden ? <Never /> : null}
          </React.Suspense>
        </>
      );
    }

    await actAsync(() => {
      render(<App hidden={true} />);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▸ <Activity mode="hidden">
            <Suspense name="outer-suspense">
      [suspense-root]  rects={[{x:1,y:2,width:15,height:1}]}
        <Suspense name="inside-activity" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
        <Suspense name="outer-suspense" uniqueSuspenders={true} rects={null}>
    `);

    // mount as visible
    await actAsync(() => {
      render(null);
    });
    await actAsync(() => {
      render(<App hidden={false} />);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Activity mode="visible">
            ▾ <Suspense name="inside-activity">
                <Component key="inside-activity">
          ▾ <Suspense name="outer-suspense">
            ▾ <Suspense name="inner-suspense">
                <Component key="inside-suspense">
      [suspense-root]  rects={[{x:1,y:2,width:15,height:1}, {x:1,y:2,width:15,height:1}]}
        <Suspense name="inside-activity" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
        <Suspense name="outer-suspense" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
          <Suspense name="inner-suspense" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
    `);

    await actAsync(() => {
      render(<App hidden={true} />);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▸ <Activity mode="hidden">
            <Suspense name="outer-suspense">
      [suspense-root]  rects={[{x:1,y:2,width:15,height:1}, {x:1,y:2,width:15,height:1}]}
        <Suspense name="inside-activity" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
        <Suspense name="outer-suspense" uniqueSuspenders={true} rects={[{x:1,y:2,width:15,height:1}]}>
          <Suspense name="inner-suspense" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
    `);

    await actAsync(() => {
      render(<App hidden={false} />);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Activity mode="visible">
            ▾ <Suspense name="inside-activity">
                <Component key="inside-activity">
          ▾ <Suspense name="outer-suspense">
            ▾ <Suspense name="inner-suspense">
                <Component key="inside-suspense">
      [suspense-root]  rects={[{x:1,y:2,width:15,height:1}, {x:1,y:2,width:15,height:1}]}
        <Suspense name="inside-activity" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
        <Suspense name="outer-suspense" uniqueSuspenders={true} rects={[{x:1,y:2,width:15,height:1}]}>
          <Suspense name="inner-suspense" uniqueSuspenders={false} rects={[{x:1,y:2,width:15,height:1}]}>
    `);
  });

  // @reactVersion >= 19.0
  it('guesses a Suspense name based on the owner', async () => {
    let resolve;
    const promise = new Promise(_resolve => {
      resolve = _resolve;
    });
    function Inner() {
      return (
        <React.Suspense fallback={<p>Loading inner</p>}>
          <p>{promise}</p>
        </React.Suspense>
      );
    }

    function Outer({children}) {
      return (
        <React.Suspense fallback={<p>Loading outer</p>}>
          <p>{promise}</p>
          {children}
        </React.Suspense>
      );
    }

    await actAsync(() => {
      render(
        <Outer>
          <Inner />
        </Outer>,
      );
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Outer>
            <Suspense>
      [suspense-root]  rects={[{x:1,y:2,width:13,height:1}]}
        <Suspense name="Outer" uniqueSuspenders={true} rects={null}>
    `);

    await actAsync(() => {
      resolve('loaded');
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Outer>
          ▾ <Suspense>
            ▾ <Inner>
                <Suspense>
      [suspense-root]  rects={[{x:1,y:2,width:6,height:1}, {x:1,y:2,width:6,height:1}]}
        <Suspense name="Outer" uniqueSuspenders={true} rects={[{x:1,y:2,width:6,height:1}, {x:1,y:2,width:6,height:1}]}>
          <Suspense name="Inner" uniqueSuspenders={false} rects={[{x:1,y:2,width:6,height:1}]}>
    `);
  });

  // @reactVersion >= 19.0
  it('measures rects when reconnecting', async () => {
    function Component({children, promise}) {
      let content = '';
      if (promise) {
        const value = readValue(promise);
        if (typeof value === 'string') {
          content += value;
        }
      }
      return (
        <div>
          {content}
          {children}
        </div>
      );
    }

    function App({outer, inner}) {
      return (
        <React.Suspense
          name="outer"
          fallback={<Component key="outer-fallback">loading outer</Component>}>
          <Component key="outer-content" promise={outer}>
            outer content
          </Component>
          <React.Suspense
            name="inner"
            fallback={
              <Component key="inner-fallback">loading inner</Component>
            }>
            <Component key="inner-content" promise={inner}>
              inner content
            </Component>
          </React.Suspense>
        </React.Suspense>
      );
    }

    await actAsync(() => {
      render(<App outer={null} inner={null} />);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Suspense name="outer">
              <Component key="outer-content">
            ▾ <Suspense name="inner">
                <Component key="inner-content">
      [suspense-root]  rects={[{x:1,y:2,width:13,height:1}, {x:1,y:2,width:13,height:1}]}
        <Suspense name="outer" uniqueSuspenders={false} rects={[{x:1,y:2,width:13,height:1}, {x:1,y:2,width:13,height:1}]}>
          <Suspense name="inner" uniqueSuspenders={false} rects={[{x:1,y:2,width:13,height:1}]}>
    `);

    let outerResolve;
    const outerPromise = new Promise(resolve => {
      outerResolve = resolve;
    });

    let innerResolve;
    const innerPromise = new Promise(resolve => {
      innerResolve = resolve;
    });
    await actAsync(() => {
      render(<App outer={outerPromise} inner={innerPromise} />);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Suspense name="outer">
              <Component key="outer-fallback">
      [suspense-root]  rects={[{x:1,y:2,width:13,height:1}, {x:1,y:2,width:13,height:1}, {x:1,y:2,width:13,height:1}]}
        <Suspense name="outer" uniqueSuspenders={true} rects={[{x:1,y:2,width:13,height:1}, {x:1,y:2,width:13,height:1}]}>
          <Suspense name="inner" uniqueSuspenders={false} rects={[{x:1,y:2,width:13,height:1}]}>
    `);

    await actAsync(() => {
      outerResolve('..');
      innerResolve('.');
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Suspense name="outer">
              <Component key="outer-content">
            ▾ <Suspense name="inner">
                <Component key="inner-content">
      [suspense-root]  rects={[{x:1,y:2,width:15,height:1}, {x:1,y:2,width:14,height:1}]}
        <Suspense name="outer" uniqueSuspenders={true} rects={[{x:1,y:2,width:15,height:1}, {x:1,y:2,width:14,height:1}]}>
          <Suspense name="inner" uniqueSuspenders={true} rects={[{x:1,y:2,width:14,height:1}]}>
    `);
  });

  // @reactVersion >= 19
  it('can reconcile newly visible Activity with filtered, stable children', async () => {
    const Activity = React.Activity || React.unstable_Activity;

    function IgnoreMe({children}) {
      return children;
    }

    function Component({children}) {
      return <div>{children}</div>;
    }

    await actAsync(
      async () =>
        (store.componentFilters = [createDisplayNameFilter('^IgnoreMe', true)]),
    );

    const children = (
      <IgnoreMe>
        <Component key="left">Left</Component>
      </IgnoreMe>
    );

    await actAsync(() => {
      render(<Activity mode="hidden">{children}</Activity>);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▸ <Activity mode="hidden">
    `);

    await actAsync(() => {
      render(<Activity mode="visible">{children}</Activity>);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Activity mode="visible">
          ▾ <Component key="left">
              <div>
    `);
  });

  // @reactVersion >= 17.0
  it('continues to consider Suspense boundary as blocking if some child still is suspended on removed io', async () => {
    function Component({promise}) {
      readValue(promise);
      return null;
    }

    let resolve;
    const promise = new Promise(_resolve => {
      resolve = _resolve;
    });

    await actAsync(() => {
      render(
        <React.Suspense fallback={null} name="outer">
          <Component key="one" promise={promise} />
          <Component key="two" promise={promise} />
          <React.Suspense fallback={null} name="inner">
            <Component key="three" promise={promise} />
          </React.Suspense>
        </React.Suspense>,
      );
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
          <Suspense name="outer">
      [suspense-root]  rects={null}
        <Suspense name="outer" uniqueSuspenders={true} rects={null}>
    `);

    await actAsync(() => {
      resolve('Hello, World!');
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="outer">
            <Component key="one">
            <Component key="two">
          ▾ <Suspense name="inner">
              <Component key="three">
      [suspense-root]  rects={null}
        <Suspense name="outer" uniqueSuspenders={true} rects={null}>
          <Suspense name="inner" uniqueSuspenders={false} rects={null}>
    `);

    // We remove one suspender.
    // The inner one shouldn't have unique suspenders because it's still blocked
    // by the outer one.
    await actAsync(() => {
      render(
        <React.Suspense fallback={null} name="outer">
          <Component key="one" promise={promise} />
          <React.Suspense fallback={null} name="inner">
            <Component key="three" promise={promise} />
          </React.Suspense>
        </React.Suspense>,
      );
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="outer">
            <Component key="one">
          ▾ <Suspense name="inner">
              <Component key="three">
      [suspense-root]  rects={null}
        <Suspense name="outer" uniqueSuspenders={true} rects={null}>
          <Suspense name="inner" uniqueSuspenders={false} rects={null}>
    `);

    // Now we remove all unique suspenders of the outer Suspense boundary.
    // The inner one is now independently revealed from the parent and should
    // be marked as having unique suspenders.
    // TODO: The outer boundary no longer has unique suspenders.
    await actAsync(() => {
      render(
        <React.Suspense fallback={null} name="outer">
          <React.Suspense fallback={null} name="inner">
            <Component key="three" promise={promise} />
          </React.Suspense>
        </React.Suspense>,
      );
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Suspense name="outer">
          ▾ <Suspense name="inner">
              <Component key="three">
      [suspense-root]  rects={null}
        <Suspense name="outer" uniqueSuspenders={true} rects={null}>
          <Suspense name="inner" uniqueSuspenders={true} rects={null}>
    `);
  });

  // @reactVersion >= 19
  it('cleans up host hoistables', async () => {
    function Left() {
      return (
        <style href="test.css" precedence="medium">
          {'* {color:black}'}
        </style>
      );
    }

    function Right() {
      return (
        <style href="test.css" precedence="medium">
          {'* {color:black}'}
        </style>
      );
    }

    await actAsync(() => {
      render(
        <>
          <Left />
          <Right />
        </>,
      );
    });

    // Ensure we're still testing deduplicated hoistables.
    expect(document.head.querySelectorAll('style')).toHaveLength(1);
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Left>
          <Right>
    `);
    let style = document.head.querySelector('style');
    let styleID = agent.getIDForHostInstance(style).id;
    expect(store.containsElement(styleID)).toBe(true);

    await actAsync(() => {
      render(
        <>
          <Right />
        </>,
      );
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
          <Right>
    `);
    style = document.head.querySelector('style');
    styleID = agent.getIDForHostInstance(style).id;
    expect(store.containsElement(styleID)).toBe(true);
  });
});

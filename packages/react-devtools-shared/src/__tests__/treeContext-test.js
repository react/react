/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof ReactTestRenderer from 'react-test-renderer';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type Store from 'react-devtools-shared/src/devtools/store';
import type {
  DispatcherContext,
  StateContext,
} from 'react-devtools-shared/src/devtools/views/Components/TreeContext';

import {getVersionedRenderImplementation} from './utils';

describe('TreeListContext', () => {
  let React;
  let TestRenderer: ReactTestRenderer;
  let bridge: FrontendBridge;
  let store: Store;
  let utils;
  let withErrorsOrWarningsIgnored;

  let BridgeContext;
  let StoreContext;
  let TreeContext;

  let dispatch: DispatcherContext;
  let state: StateContext;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;

    utils = require('./utils');
    utils.beforeEachProfiling();

    withErrorsOrWarningsIgnored = utils.withErrorsOrWarningsIgnored;

    bridge = global.bridge;
    store = global.store;
    store.collapseNodesByDefault = false;

    React = require('react');
    TestRenderer = utils.requireTestRenderer();

    BridgeContext =
      require('react-devtools-shared/src/devtools/views/context').BridgeContext;
    StoreContext =
      require('react-devtools-shared/src/devtools/views/context').StoreContext;
    TreeContext = require('react-devtools-shared/src/devtools/views/Components/TreeContext');
  });

  const {render, unmount, createContainer} = getVersionedRenderImplementation();

  afterEach(() => {
    // Reset between tests
    dispatch = ((null: any): DispatcherContext);
    state = ((null: any): StateContext);
  });

  const Capture = () => {
    dispatch = React.useContext(TreeContext.TreeDispatcherContext);
    state = React.useContext(TreeContext.TreeStateContext);
    return null;
  };

  const Contexts = () => {
    return (
      <BridgeContext.Provider value={bridge}>
        <StoreContext.Provider value={store}>
          <TreeContext.TreeContextController>
            <Capture />
          </TreeContext.TreeContextController>
        </StoreContext.Provider>
      </BridgeContext.Provider>
    );
  };

  describe('tree state', () => {
    it('should select the next and previous elements in the tree', () => {
      const Grandparent = () => <Parent />;
      const Parent = () => (
        <React.Fragment>
          <Child />
          <Child />
        </React.Fragment>
      );
      const Child = () => null;

      utils.act(() => render(<Grandparent />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      // Test stepping through to the end

      utils.act(() => dispatch({type: 'SELECT_NEXT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_NEXT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →    ▾ <Parent>
                 <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_NEXT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
        →        <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_NEXT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
        →        <Child>
      `);

      // Test stepping back to the beginning

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
        →        <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →    ▾ <Parent>
                 <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      // Test wrap around behavior

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
        →        <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_NEXT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);
    });

    it('should select child elements', () => {
      const Grandparent = () => (
        <React.Fragment>
          <Parent />
          <Parent />
        </React.Fragment>
      );
      const Parent = () => (
        <React.Fragment>
          <Child />
          <Child />
        </React.Fragment>
      );
      const Child = () => null;

      utils.act(() => render(<Grandparent />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_ELEMENT_AT_INDEX', payload: 0}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_CHILD_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →    ▾ <Parent>
                 <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_CHILD_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
        →        <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      // There are no more children to select, so this should be a no-op
      utils.act(() => dispatch({type: 'SELECT_CHILD_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
        →        <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);
    });

    it('should select parent elements and then collapse', () => {
      const Grandparent = () => (
        <React.Fragment>
          <Parent />
          <Parent />
        </React.Fragment>
      );
      const Parent = () => (
        <React.Fragment>
          <Child />
          <Child />
        </React.Fragment>
      );
      const Child = () => null;

      utils.act(() => render(<Grandparent />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      const lastChildID = store.getElementIDAtIndex(store.numElements - 1);

      // Select the last child
      utils.act(() =>
        dispatch({type: 'SELECT_ELEMENT_BY_ID', payload: lastChildID}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
        →        <Child>
      `);

      // Select its parent
      utils.act(() => dispatch({type: 'SELECT_PARENT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
        →    ▾ <Parent>
                 <Child>
                 <Child>
      `);

      // Select grandparent
      utils.act(() => dispatch({type: 'SELECT_PARENT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      // No-op
      utils.act(() => dispatch({type: 'SELECT_PARENT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      const previousState = state;

      // There are no more ancestors to select, so this should be a no-op
      utils.act(() => dispatch({type: 'SELECT_PARENT_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toEqual(previousState);
    });

    it('should clear selection if the selected element is unmounted', async () => {
      const Grandparent = props => props.children || null;
      const Parent = props => props.children || null;
      const Child = () => null;

      utils.act(() =>
        render(
          <Grandparent>
            <Parent>
              <Child />
              <Child />
            </Parent>
          </Grandparent>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      // Select the second child
      utils.act(() => dispatch({type: 'SELECT_ELEMENT_AT_INDEX', payload: 3}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
        →        <Child>
      `);

      // Remove the child (which should auto-select the parent)
      await utils.actAsync(() =>
        render(
          <Grandparent>
            <Parent />
          </Grandparent>,
        ),
      );
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →      <Parent>
      `);

      // Unmount the root (so that nothing is selected)
      await utils.actAsync(() => unmount());
      expect(state).toMatchInlineSnapshot(``);
    });

    it('should navigate next/previous sibling and skip over children in between', () => {
      const Grandparent = () => (
        <React.Fragment>
          <Parent numChildren={1} />
          <Parent numChildren={3} />
          <Parent numChildren={2} />
        </React.Fragment>
      );
      const Parent = ({numChildren}) =>
        new Array(numChildren)
          .fill(true)
          .map((_, index) => <Child key={index} />);
      const Child = () => null;

      utils.act(() => render(<Grandparent />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));

      const firstParentID = ((store.getElementIDAtIndex(1): any): number);

      utils.act(() =>
        dispatch({type: 'SELECT_ELEMENT_BY_ID', payload: firstParentID}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →    ▾ <Parent>
                 <Child key="0">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      utils.act(() => dispatch({type: 'SELECT_NEXT_SIBLING_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child key="0">
        →    ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      utils.act(() => dispatch({type: 'SELECT_NEXT_SIBLING_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child key="0">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
        →    ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      utils.act(() => dispatch({type: 'SELECT_NEXT_SIBLING_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →    ▾ <Parent>
                 <Child key="0">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_SIBLING_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child key="0">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
        →    ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_SIBLING_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child key="0">
        →    ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_SIBLING_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →    ▾ <Parent>
                 <Child key="0">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_SIBLING_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child key="0">
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
                 <Child key="2">
        →    ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);
    });

    it('should navigate the owner hierarchy', () => {
      const Wrapper = ({children}) => children;
      const Grandparent = () => (
        <React.Fragment>
          <Wrapper>
            <Parent numChildren={1} />
          </Wrapper>
          <Wrapper>
            <Parent numChildren={3} />
          </Wrapper>
          <Wrapper>
            <Parent numChildren={2} />
          </Wrapper>
        </React.Fragment>
      );
      const Parent = ({numChildren}) =>
        new Array(numChildren)
          .fill(true)
          .map((_, index) => <Child key={index} />);
      const Child = () => null;

      utils.act(() => render(<Grandparent />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));

      const childID = ((store.getElementIDAtIndex(7): any): number);
      utils.act(() =>
        dispatch({type: 'SELECT_ELEMENT_BY_ID', payload: childID}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
        →          <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      // Basic navigation test
      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
        →      ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      // Noop (since we're at the root already)
      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
        →      ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
        →          <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      // Noop (since we're at the leaf node)
      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
        →          <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      // Other navigational actions should clear out the temporary owner chain.
      utils.act(() => dispatch({type: 'SELECT_PREVIOUS_ELEMENT_IN_TREE'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
        →          <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      // Start a new tree on parent
      const parentID = ((store.getElementIDAtIndex(5): any): number);
      utils.act(() =>
        dispatch({type: 'SELECT_ELEMENT_BY_ID', payload: parentID}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
        →      ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      // Noop (since we're at the top)
      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →  ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
        →      ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);

      // Noop (since we're at the leaf of this owner tree)
      // It should not be possible to navigate beyond the owner chain leaf.
      utils.act(() =>
        dispatch({type: 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE'}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
             ▾ <Wrapper>
        →      ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
                   <Child key="2">
             ▾ <Wrapper>
               ▾ <Parent>
                   <Child key="0">
                   <Child key="1">
      `);
    });
  });

  describe('search state', () => {
    it('should find elements matching search text', () => {
      const Foo = () => null;
      const Bar = () => null;
      const Baz = () => null;
      const Qux = () => null;

      Qux.displayName = `withHOC(${Qux.name})`;

      utils.act(() =>
        render(
          <React.Fragment>
            <Foo />
            <Bar />
            <Baz />
            <Qux />
          </React.Fragment>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Bar>
             <Baz>
             <Qux> [withHOC]
      `);

      // NOTE: multi-match
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'ba'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Bar>
             <Baz>
             <Qux> [withHOC]
      `);

      // NOTE: single match
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'f'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Foo>
             <Bar>
             <Baz>
             <Qux> [withHOC]
      `);

      // NOTE: no match
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'y'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Foo>
             <Bar>
             <Baz>
             <Qux> [withHOC]
      `);

      // NOTE: HOC match
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'w'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Bar>
             <Baz>
        →    <Qux> [withHOC]
      `);
    });

    it('should select the next and previous items within the search results', () => {
      const Foo = () => null;
      const Bar = () => null;
      const Baz = () => null;

      utils.act(() =>
        render(
          <React.Fragment>
            <Foo />
            <Baz />
            <Bar />
            <Baz />
          </React.Fragment>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
             <Bar>
             <Baz>
      `);

      // search for "ba"
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'ba'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Baz>
             <Bar>
             <Baz>
      `);

      // go to second result
      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
        →    <Bar>
             <Baz>
      `);

      // go to third result
      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
             <Bar>
        →    <Baz>
      `);

      // go to second result
      utils.act(() => dispatch({type: 'GO_TO_PREVIOUS_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
        →    <Bar>
             <Baz>
      `);

      // go to first result
      utils.act(() => dispatch({type: 'GO_TO_PREVIOUS_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Baz>
             <Bar>
             <Baz>
      `);

      // wrap to last result
      utils.act(() => dispatch({type: 'GO_TO_PREVIOUS_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
             <Bar>
        →    <Baz>
      `);

      // wrap to first result
      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Baz>
             <Bar>
             <Baz>
      `);
    });

    it('should jump directly to a specific search result by index', () => {
      const Foo = () => null;
      const Bar = () => null;
      const Baz = () => null;

      utils.act(() =>
        render(
          <React.Fragment>
            <Foo />
            <Baz />
            <Bar />
            <Baz />
          </React.Fragment>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));

      // search for "ba" (matches both <Baz> elements and <Bar>)
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'ba'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Baz>
             <Bar>
             <Baz>
      `);

      // jump directly to the third result
      utils.act(() => dispatch({type: 'GO_TO_SEARCH_RESULT', payload: 2}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
             <Bar>
        →    <Baz>
      `);

      // jump directly back to the first result
      utils.act(() => dispatch({type: 'GO_TO_SEARCH_RESULT', payload: 0}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Baz>
             <Bar>
             <Baz>
      `);

      // out-of-range indices are clamped to the valid range
      utils.act(() => dispatch({type: 'GO_TO_SEARCH_RESULT', payload: 99}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
             <Bar>
        →    <Baz>
      `);

      utils.act(() => dispatch({type: 'GO_TO_SEARCH_RESULT', payload: -5}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Baz>
             <Bar>
             <Baz>
      `);
    });

    it('should advance past the selected result when retyping the same search', () => {
      const Foo = () => null;
      const Bar = () => null;
      const Baz = () => null;

      utils.act(() =>
        render(
          <React.Fragment>
            <Foo />
            <Baz />
            <Bar />
            <Baz />
          </React.Fragment>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));

      // search for "ba" and step to the second result (<Bar>)
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'ba'}));
      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
        →    <Bar>
             <Baz>
      `);

      // clear the search; the matched element stays selected
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: ''}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
        →    <Bar>
             <Baz>
      `);

      // retype the same query: instead of snapping back to the still-selected
      // <Bar>, the search advances to the next match (find-next semantics)
      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'ba'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Baz>
             <Bar>
        →    <Baz>
      `);
    });

    it('should add newly mounted elements to the search results set if they match the current text', async () => {
      const Foo = () => null;
      const Bar = () => null;
      const Baz = () => null;

      utils.act(() =>
        render(
          <React.Fragment>
            <Foo />
            <Bar />
          </React.Fragment>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Bar>
      `);

      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'ba'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Bar>
      `);

      await utils.actAsync(() =>
        render(
          <React.Fragment>
            <Foo />
            <Bar />
            <Baz />
          </React.Fragment>,
        ),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Bar>
             <Baz>
      `);

      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Bar>
        →    <Baz>
      `);
    });

    it('should remove unmounted elements from the search results set', async () => {
      const Foo = () => null;
      const Bar = () => null;
      const Baz = () => null;

      utils.act(() =>
        render(
          <React.Fragment>
            <Foo />
            <Bar />
            <Baz />
          </React.Fragment>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Bar>
             <Baz>
      `);

      utils.act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'ba'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Bar>
             <Baz>
      `);

      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Bar>
        →    <Baz>
      `);

      await utils.actAsync(() =>
        render(
          <React.Fragment>
            <Foo />
            <Bar />
          </React.Fragment>,
        ),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
             <Bar>
      `);

      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Bar>
      `);

      // Noop since the list is now one item long
      utils.act(() => dispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Foo>
        →    <Bar>
      `);
    });
  });

  describe('owners state', () => {
    it('should support entering and existing the owners tree view', () => {
      const Grandparent = () => <Parent />;
      const Parent = () => (
        <React.Fragment>
          <Child />
          <Child />
        </React.Fragment>
      );
      const Child = () => null;

      utils.act(() => render(<Grandparent />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child>
                 <Child>
      `);

      const parentID = ((store.getElementIDAtIndex(1): any): number);
      utils.act(() => dispatch({type: 'SELECT_OWNER', payload: parentID}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
        →  ▾ <Parent>
               <Child>
               <Child>
      `);

      utils.act(() => dispatch({type: 'RESET_OWNER_STACK'}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
        →    ▾ <Parent>
                 <Child>
                 <Child>
      `);
    });

    it('should remove an element from the owners list if it is unmounted', async () => {
      const Grandparent = ({count}) => <Parent count={count} />;
      const Parent = ({count}) =>
        new Array(count).fill(true).map((_, index) => <Child key={index} />);
      const Child = () => null;

      utils.act(() => render(<Grandparent count={2} />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Grandparent>
             ▾ <Parent>
                 <Child key="0">
                 <Child key="1">
      `);

      const parentID = ((store.getElementIDAtIndex(1): any): number);
      utils.act(() => dispatch({type: 'SELECT_OWNER', payload: parentID}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
        →  ▾ <Parent>
               <Child key="0">
               <Child key="1">
      `);

      await utils.actAsync(() => render(<Grandparent count={1} />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
        →  ▾ <Parent>
               <Child key="0">
      `);

      await utils.actAsync(() => render(<Grandparent count={0} />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
        →    <Parent>
      `);
    });

    it('should exit the owners list if the current owner is unmounted', async () => {
      const Parent = props => props.children || null;
      const Child = () => null;

      utils.act(() =>
        render(
          <Parent>
            <Child />
          </Parent>,
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Parent>
               <Child>
      `);

      const childID = ((store.getElementIDAtIndex(1): any): number);
      utils.act(() => dispatch({type: 'SELECT_OWNER', payload: childID}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
        →    <Child>
      `);

      await utils.actAsync(() => render(<Parent />));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Parent>
      `);

      const parentID = ((store.getElementIDAtIndex(0): any): number);
      utils.act(() => dispatch({type: 'SELECT_OWNER', payload: parentID}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
        →    <Parent>
      `);

      await utils.actAsync(() => unmount());
      expect(state).toMatchInlineSnapshot(``);
    });

    // This tests ensures support for toggling Suspense boundaries outside of the active owners list.
    it('should exit the owners list if an element outside the list is selected', () => {
      const Grandchild = () => null;
      const Child = () => (
        <React.Suspense fallback="Loading">
          <Grandchild />
        </React.Suspense>
      );
      const Parent = () => (
        <React.Suspense fallback="Loading">
          <Child />
        </React.Suspense>
      );

      utils.act(() => render(<Parent />));

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Parent>
             ▾ <Suspense>
               ▾ <Child>
                 ▾ <Suspense>
                     <Grandchild>
        [suspense-root]  rects={null}
          <Suspense name="Parent" uniqueSuspenders={false} rects={null}>
            <Suspense name="Child" uniqueSuspenders={false} rects={null}>
      `);

      const outerSuspenseID = ((store.getElementIDAtIndex(1): any): number);
      const childID = ((store.getElementIDAtIndex(2): any): number);
      const innerSuspenseID = ((store.getElementIDAtIndex(3): any): number);

      utils.act(() => dispatch({type: 'SELECT_OWNER', payload: childID}));
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
        →  ▾ <Child>
             ▾ <Suspense>
                 <Grandchild>
      `);

      // Toggling a Suspense boundary inside of the flat list should update selected index
      utils.act(() =>
        dispatch({type: 'SELECT_ELEMENT_BY_ID', payload: innerSuspenseID}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [owners]
           ▾ <Child>
        →    ▾ <Suspense>
                 <Grandchild>
      `);

      // Toggling a Suspense boundary outside of the flat list should exit owners list and update index
      utils.act(() =>
        dispatch({type: 'SELECT_ELEMENT_BY_ID', payload: outerSuspenseID}),
      );
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
           ▾ <Parent>
        →    ▾ <Suspense>
               ▾ <Child>
                 ▾ <Suspense>
                     <Grandchild>
        [suspense-root]  rects={null}
          <Suspense name="Parent" uniqueSuspenders={false} rects={null}>
            <Suspense name="Child" uniqueSuspenders={false} rects={null}>
      `);
    });
  });

  describe('inline errors/warnings state', () => {
    const {
      clearErrorsAndWarnings: clearErrorsAndWarningsAPI,
      clearErrorsForElement: clearErrorsForElementAPI,
      clearWarningsForElement: clearWarningsForElementAPI,
    } = require('react-devtools-shared/src/backendAPI');

    function clearAllErrors() {
      utils.act(() => clearErrorsAndWarningsAPI({bridge, store}));
      // flush events to the renderer
      jest.runAllTimers();
    }

    function clearErrorsForElement(id) {
      const rendererID = store.getRendererIDForElement(id);
      utils.act(() => clearErrorsForElementAPI({bridge, id, rendererID}));
      // flush events to the renderer
      jest.runAllTimers();
    }

    function clearWarningsForElement(id) {
      const rendererID = store.getRendererIDForElement(id);
      utils.act(() => clearWarningsForElementAPI({bridge, id, rendererID}));
      // flush events to the renderer
      jest.runAllTimers();
    }

    function selectNextErrorOrWarning() {
      utils.act(() =>
        dispatch({type: 'SELECT_NEXT_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE'}),
      );
    }

    function selectPreviousErrorOrWarning() {
      utils.act(() =>
        dispatch({
          type: 'SELECT_PREVIOUS_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE',
        }),
      );
    }

    function Child({logError = false, logWarning = false}) {
      if (logError === true) {
        console.error('test-only: error');
      }
      if (logWarning === true) {
        console.warn('test-only: warning');
      }
      return null;
    }

    it('should handle when there are no errors/warnings', () => {
      utils.act(() =>
        render(
          <React.Fragment>
            <Child />
            <Child />
            <Child />
          </React.Fragment>,
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));

      expect(state).toMatchInlineSnapshot(`
        [root]
             <Child>
             <Child>
             <Child>
      `);

      // Next/previous errors should be a no-op
      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Child>
             <Child>
             <Child>
      `);
      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Child>
             <Child>
             <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_ELEMENT_AT_INDEX', payload: 0}));
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Child>
             <Child>
             <Child>
      `);

      // Next/previous errors should still be a no-op
      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Child>
             <Child>
             <Child>
      `);
      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Child>
             <Child>
             <Child>
      `);
    });

    it('should cycle through the next errors/warnings and wrap around', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child />
              <Child logWarning={true} />
              <Child />
              <Child logError={true} />
              <Child />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
             <Child>
             <Child> ✕
             <Child>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
        →    <Child> ⚠
             <Child>
             <Child> ✕
             <Child>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
             <Child>
        →    <Child> ✕
             <Child>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
        →    <Child> ⚠
             <Child>
             <Child> ✕
             <Child>
      `);
    });

    it('should cycle through the previous errors/warnings and wrap around', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child />
              <Child logWarning={true} />
              <Child />
              <Child logError={true} />
              <Child />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
             <Child>
             <Child> ✕
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
             <Child>
        →    <Child> ✕
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
        →    <Child> ⚠
             <Child>
             <Child> ✕
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
             <Child>
        →    <Child> ✕
             <Child>
      `);
    });

    it('should cycle through the next errors/warnings and wrap around with multiple roots', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () => {
        utils.act(() => {
          render(
            <React.Fragment>
              <Child />
              <Child logWarning={true} />,
            </React.Fragment>,
          );

          createContainer();

          render(
            <React.Fragment>
              <Child />
              <Child logError={true} />
              <Child />
            </React.Fragment>,
          );
        });
      });

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
        [root]
             <Child>
             <Child> ✕
             <Child>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
        →    <Child> ⚠
        [root]
             <Child>
             <Child> ✕
             <Child>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
        [root]
             <Child>
        →    <Child> ✕
             <Child>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
        →    <Child> ⚠
        [root]
             <Child>
             <Child> ✕
             <Child>
      `);
    });

    it('should cycle through the previous errors/warnings and wrap around with multiple roots', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () => {
        utils.act(() => {
          render(
            <React.Fragment>
              <Child />
              <Child logWarning={true} />,
            </React.Fragment>,
          );

          createContainer();

          render(
            <React.Fragment>
              <Child />
              <Child logError={true} />
              <Child />
            </React.Fragment>,
          );
        });
      });

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
        [root]
             <Child>
             <Child> ✕
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
        [root]
             <Child>
        →    <Child> ✕
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
        →    <Child> ⚠
        [root]
             <Child>
             <Child> ✕
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
        [root]
             <Child>
        →    <Child> ✕
             <Child>
      `);
    });

    it('should select the next or previous element relative to the current selection', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child />
              <Child logWarning={true} />
              <Child />
              <Child logError={true} />
              <Child />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      utils.act(() => dispatch({type: 'SELECT_ELEMENT_AT_INDEX', payload: 2}));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
        →    <Child>
             <Child> ✕
             <Child>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
             <Child>
        →    <Child> ✕
             <Child>
      `);

      utils.act(() => dispatch({type: 'SELECT_ELEMENT_AT_INDEX', payload: 2}));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
             <Child> ⚠
        →    <Child>
             <Child> ✕
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child>
        →    <Child> ⚠
             <Child>
             <Child> ✕
             <Child>
      `);
    });

    it('should update correctly when errors/warnings are cleared for a fiber in the list', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child logWarning={true} />
              <Child logError={true} />
              <Child logError={true} />
              <Child logWarning={true} />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
             <Child> ⚠
             <Child> ✕
             <Child> ✕
             <Child> ⚠
      `);

      // Select the first item in the list
      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
        →    <Child> ⚠
             <Child> ✕
             <Child> ✕
             <Child> ⚠
      `);

      // Clear warnings (but the next Fiber has only errors)
      clearWarningsForElement(store.getElementIDAtIndex(1));
      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 2
        [root]
             <Child> ⚠
        →    <Child> ✕
             <Child> ✕
             <Child> ⚠
      `);

      clearErrorsForElement(store.getElementIDAtIndex(2));

      // Should step to the (now) next one in the list.
      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 2
        [root]
             <Child> ⚠
             <Child> ✕
             <Child>
        →    <Child> ⚠
      `);

      // Should skip over the (now) cleared Fiber
      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 2
        [root]
             <Child> ⚠
        →    <Child> ✕
             <Child>
             <Child> ⚠
      `);
    });

    it('should update correctly when errors/warnings are cleared for the currently selected fiber', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child logWarning={true} />
              <Child logError={true} />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child> ⚠
             <Child> ✕
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
        →    <Child> ⚠
             <Child> ✕
      `);

      clearWarningsForElement(store.getElementIDAtIndex(0));
      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 0
        [root]
             <Child>
        →    <Child> ✕
      `);
    });

    it('should update correctly when new errors/warnings are added', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child logWarning={true} />
              <Child />
              <Child />
              <Child logError={true} />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child> ⚠
             <Child>
             <Child>
             <Child> ✕
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
        →    <Child> ⚠
             <Child>
             <Child>
             <Child> ✕
      `);

      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child />
              <Child logWarning={true} />
              <Child />
              <Child />
            </React.Fragment>,
          ),
        ),
      );

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 2
        [root]
             <Child> ⚠
        →    <Child> ⚠
             <Child>
             <Child> ✕
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 2
        [root]
             <Child> ⚠
             <Child> ⚠
             <Child>
        →    <Child> ✕
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 2
        [root]
        →    <Child> ⚠
             <Child> ⚠
             <Child>
             <Child> ✕
      `);
    });

    it('should update correctly when all errors/warnings are cleared', () => {
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child logWarning={true} />
              <Child logError={true} />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
             <Child> ⚠
             <Child> ✕
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 1
        [root]
        →    <Child> ⚠
             <Child> ✕
      `);

      clearAllErrors();

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Child>
             <Child>
      `);

      selectPreviousErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        [root]
        →    <Child>
             <Child>
      `);
    });

    it('should update correctly when elements are added/removed', () => {
      let errored = false;
      function ErrorOnce() {
        if (!errored) {
          errored = true;
          console.error('test-only:one-time-error');
        }
        return null;
      }
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <ErrorOnce key="error" />
            </React.Fragment>,
          ),
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 0
        [root]
             <ErrorOnce key="error"> ✕
      `);

      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child />
              <ErrorOnce key="error" />
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 0
        [root]
             <Child>
             <ErrorOnce key="error"> ✕
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 1, ⚠ 0
        [root]
             <Child>
        →    <ErrorOnce key="error"> ✕
      `);
    });

    it('should update correctly when elements are re-ordered', () => {
      function ErrorOnce() {
        const didErrorRef = React.useRef(false);
        if (!didErrorRef.current) {
          didErrorRef.current = true;
          console.error('test-only:one-time-error');
        }
        return null;
      }
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Child key="A" />
              <ErrorOnce key="B" />
              <Child key="C" />
              <ErrorOnce key="D" />
            </React.Fragment>,
          ),
        ),
      );

      let renderer;
      utils.act(() => (renderer = TestRenderer.create(<Contexts />)));
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 0
        [root]
             <Child key="A">
             <ErrorOnce key="B"> ✕
             <Child key="C">
             <ErrorOnce key="D"> ✕
      `);

      // Select a child
      selectNextErrorOrWarning();
      utils.act(() => renderer.update(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 0
        [root]
             <Child key="A">
        →    <ErrorOnce key="B"> ✕
             <Child key="C">
             <ErrorOnce key="D"> ✕
      `);

      // Re-order the tree and ensure indices are updated.
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <ErrorOnce key="B" />
              <Child key="A" />
              <ErrorOnce key="D" />
              <Child key="C" />
            </React.Fragment>,
          ),
        ),
      );
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 0
        [root]
        →    <ErrorOnce key="B"> ✕
             <Child key="A">
             <ErrorOnce key="D"> ✕
             <Child key="C">
      `);

      // Select the next child and ensure the index doesn't break.
      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 0
        [root]
             <ErrorOnce key="B"> ✕
             <Child key="A">
        →    <ErrorOnce key="D"> ✕
             <Child key="C">
      `);

      // Re-order the tree and ensure indices are updated.
      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <ErrorOnce key="D" />
              <ErrorOnce key="B" />
              <Child key="A" />
              <Child key="C" />
            </React.Fragment>,
          ),
        ),
      );
      expect(state).toMatchInlineSnapshot(`
        ✕ 2, ⚠ 0
        [root]
        →    <ErrorOnce key="D"> ✕
             <ErrorOnce key="B"> ✕
             <Child key="A">
             <Child key="C">
      `);
    });

    it('should update select and auto-expand parts components within hidden parts of the tree', () => {
      const Wrapper = ({children}) => children;

      store.collapseNodesByDefault = true;

      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Wrapper>
                <Child logWarning={true} />
              </Wrapper>
              <Wrapper>
                <Wrapper>
                  <Child logWarning={true} />
                </Wrapper>
              </Wrapper>
            </React.Fragment>,
          ),
        ),
      );

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        ✕ 0, ⚠ 2
        [root]
           ▸ <Wrapper>
           ▸ <Wrapper>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 0, ⚠ 2
        [root]
           ▾ <Wrapper>
        →      <Child> ⚠
           ▸ <Wrapper>
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 0, ⚠ 2
        [root]
           ▾ <Wrapper>
               <Child> ⚠
           ▾ <Wrapper>
             ▾ <Wrapper>
        →        <Child> ⚠
      `);
    });

    it('should preserve errors for fibers even if they are filtered out of the tree initially', () => {
      const Wrapper = ({children}) => children;

      withErrorsOrWarningsIgnored(['test-only:'], () =>
        utils.act(() =>
          render(
            <React.Fragment>
              <Wrapper>
                <Child logWarning={true} />
              </Wrapper>
              <Wrapper>
                <Wrapper>
                  <Child logWarning={true} />
                </Wrapper>
              </Wrapper>
            </React.Fragment>,
          ),
        ),
      );

      store.componentFilters = [utils.createDisplayNameFilter('Child')];

      utils.act(() => TestRenderer.create(<Contexts />));
      expect(state).toMatchInlineSnapshot(`
        [root]
             <Wrapper>
           ▾ <Wrapper>
               <Wrapper>
      `);

      utils.act(() => {
        store.componentFilters = [];
      });
      expect(state).toMatchInlineSnapshot(`
        ✕ 0, ⚠ 2
        [root]
           ▾ <Wrapper>
               <Child> ⚠
           ▾ <Wrapper>
             ▾ <Wrapper>
                 <Child> ⚠
      `);

      selectNextErrorOrWarning();
      expect(state).toMatchInlineSnapshot(`
        ✕ 0, ⚠ 2
        [root]
           ▾ <Wrapper>
        →      <Child> ⚠
           ▾ <Wrapper>
             ▾ <Wrapper>
                 <Child> ⚠
      `);
    });

    describe('suspense', () => {
      // This verifies that we don't flush before the tree has been committed.
      it('should properly handle errors/warnings from components inside of delayed Suspense', async () => {
        const NeverResolves = React.lazy(() => new Promise(() => {}));

        withErrorsOrWarningsIgnored(['test-only:'], () =>
          utils.act(() =>
            render(
              <React.Suspense fallback={null}>
                <Child logWarning={true} />
                <NeverResolves />
              </React.Suspense>,
            ),
          ),
        );
        utils.act(() => TestRenderer.create(<Contexts />));

        jest.runAllTimers();

        expect(state).toMatchInlineSnapshot(`
          [root]
               <Suspense>
          [suspense-root]  rects={null}
            <Suspense name="Unknown" uniqueSuspenders={true} rects={null}>
        `);

        selectNextErrorOrWarning();

        expect(state).toMatchInlineSnapshot(`
          [root]
               <Suspense>
          [suspense-root]  rects={null}
            <Suspense name="Unknown" uniqueSuspenders={true} rects={null}>
        `);
      });

      it('should properly handle errors/warnings from components that dont mount because of Suspense', async () => {
        async function fakeImport(result) {
          return {default: result};
        }
        const LazyComponent = React.lazy(() => fakeImport(Child));

        withErrorsOrWarningsIgnored(['test-only:'], () =>
          utils.act(() =>
            render(
              <React.Suspense fallback={null}>
                <Child logWarning={true} />
                <LazyComponent />
              </React.Suspense>,
            ),
          ),
        );
        utils.act(() => TestRenderer.create(<Contexts />));

        expect(state).toMatchInlineSnapshot(`
          [root]
               <Suspense>
          [suspense-root]  rects={null}
            <Suspense name="Unknown" uniqueSuspenders={true} rects={null}>
        `);

        await Promise.resolve();
        withErrorsOrWarningsIgnored(['test-only:'], () =>
          utils.act(() =>
            render(
              <React.Suspense fallback={null}>
                <Child logWarning={true} />
                <LazyComponent />
              </React.Suspense>,
            ),
          ),
        );

        expect(state).toMatchInlineSnapshot(`
          ✕ 0, ⚠ 1
          [root]
             ▾ <Suspense>
                 <Child> ⚠
                 <Child>
          [suspense-root]  rects={null}
            <Suspense name="Unknown" uniqueSuspenders={true} rects={null}>
        `);
      });

      it('should properly show errors/warnings from components in the Suspense fallback tree', async () => {
        async function fakeImport(result) {
          return {default: result};
        }
        const LazyComponent = React.lazy(() => fakeImport(Child));

        const Fallback = () => <Child logError={true} />;

        withErrorsOrWarningsIgnored(['test-only:'], () =>
          utils.act(() =>
            render(
              <React.Suspense fallback={<Fallback />}>
                <LazyComponent />
              </React.Suspense>,
            ),
          ),
        );
        utils.act(() => TestRenderer.create(<Contexts />));

        expect(state).toMatchInlineSnapshot(`
          ✕ 1, ⚠ 0
          [root]
             ▾ <Suspense>
               ▾ <Fallback>
                   <Child> ✕
          [suspense-root]  rects={null}
            <Suspense name="Unknown" uniqueSuspenders={true} rects={null}>
        `);

        await Promise.resolve();
        withErrorsOrWarningsIgnored(['test-only:'], () =>
          utils.act(() =>
            render(
              <React.Suspense fallback={<Fallback />}>
                <LazyComponent />
              </React.Suspense>,
            ),
          ),
        );

        expect(state).toMatchInlineSnapshot(`
          [root]
             ▾ <Suspense>
                 <Child>
          [suspense-root]  rects={null}
            <Suspense name="Unknown" uniqueSuspenders={true} rects={null}>
        `);
      });
    });

    describe('error boundaries', () => {
      it('should properly handle errors from components that dont mount because of an error', () => {
        class ErrorBoundary extends React.Component {
          state = {error: null};
          static getDerivedStateFromError(error) {
            return {error};
          }
          render() {
            if (this.state.error) {
              return null;
            }
            return this.props.children;
          }
        }

        class BadRender extends React.Component {
          render() {
            console.error('test-only: I am about to throw!');
            throw new Error('test-only: Oops!');
          }
        }

        withErrorsOrWarningsIgnored(
          ['test-only:', 'React will try to recreate this component tree'],
          () => {
            utils.act(() =>
              render(
                <ErrorBoundary>
                  <BadRender />
                </ErrorBoundary>,
              ),
            );
          },
        );

        utils.act(() => TestRenderer.create(<Contexts />));

        expect(store).toMatchInlineSnapshot(`
          [root]
              <ErrorBoundary>
        `);

        selectNextErrorOrWarning();
        expect(state).toMatchInlineSnapshot(`
          [root]
               <ErrorBoundary>
        `);

        utils.act(() => unmount());
        expect(state).toMatchInlineSnapshot(``);

        // Should be a noop
        selectNextErrorOrWarning();
        expect(state).toMatchInlineSnapshot(``);
      });

      it('should properly handle warnings from components that dont mount because of an error', () => {
        class ErrorBoundary extends React.Component {
          state = {error: null};
          static getDerivedStateFromError(error) {
            return {error};
          }
          render() {
            if (this.state.error) {
              return null;
            }
            return this.props.children;
          }
        }

        class LogsWarning extends React.Component {
          render() {
            console.warn('test-only: I am about to throw!');
            return <ThrowsError />;
          }
        }
        class ThrowsError extends React.Component {
          render() {
            throw new Error('test-only: Oops!');
          }
        }

        withErrorsOrWarningsIgnored(
          ['test-only:', 'React will try to recreate this component tree'],
          () => {
            utils.act(() =>
              render(
                <ErrorBoundary>
                  <LogsWarning />
                </ErrorBoundary>,
              ),
            );
          },
        );

        utils.act(() => TestRenderer.create(<Contexts />));

        expect(store).toMatchInlineSnapshot(`
          [root]
              <ErrorBoundary>
        `);

        selectNextErrorOrWarning();
        expect(state).toMatchInlineSnapshot(`
          [root]
               <ErrorBoundary>
        `);

        utils.act(() => unmount());
        expect(state).toMatchInlineSnapshot(``);

        // Should be a noop
        selectNextErrorOrWarning();
        expect(state).toMatchInlineSnapshot(``);
      });

      it('should properly handle errors/warnings from inside of an error boundary', () => {
        class ErrorBoundary extends React.Component {
          state = {error: null};
          static getDerivedStateFromError(error) {
            return {error};
          }
          render() {
            if (this.state.error) {
              return <Child logError={true} />;
            }
            return this.props.children;
          }
        }

        class BadRender extends React.Component {
          render() {
            console.error('test-only: I am about to throw!');
            throw new Error('test-only: Oops!');
          }
        }

        withErrorsOrWarningsIgnored(
          ['test-only:', 'React will try to recreate this component tree'],
          () => {
            utils.act(() =>
              render(
                <ErrorBoundary>
                  <BadRender />
                </ErrorBoundary>,
              ),
            );
          },
        );

        utils.act(() => TestRenderer.create(<Contexts />));

        expect(store).toMatchInlineSnapshot(`
          ✕ 1, ⚠ 0
          [root]
            ▾ <ErrorBoundary>
                <Child> ✕
        `);

        selectNextErrorOrWarning();
        expect(state).toMatchInlineSnapshot(`
          ✕ 1, ⚠ 0
          [root]
             ▾ <ErrorBoundary>
          →      <Child> ✕
        `);
      });
    });
  });
});

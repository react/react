/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof ReactTestRenderer from 'react-test-renderer';
import type {Element} from 'react-devtools-shared/src/frontend/types';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type Store from 'react-devtools-shared/src/devtools/store';

import {getVersionedRenderImplementation} from './utils';

describe('OwnersListContext', () => {
  let React;
  let TestRenderer: ReactTestRenderer;
  let bridge: FrontendBridge;
  let store: Store;
  let utils;

  let BridgeContext;
  let OwnersListContext;
  let OwnersListContextController;
  let StoreContext;
  let TreeContextController;

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    bridge = global.bridge;
    store = global.store;
    store.collapseNodesByDefault = false;

    React = require('react');
    TestRenderer = utils.requireTestRenderer();

    BridgeContext =
      require('react-devtools-shared/src/devtools/views/context').BridgeContext;
    OwnersListContext =
      require('react-devtools-shared/src/devtools/views/Components/OwnersListContext').OwnersListContext;
    OwnersListContextController =
      require('react-devtools-shared/src/devtools/views/Components/OwnersListContext').OwnersListContextController;
    StoreContext =
      require('react-devtools-shared/src/devtools/views/context').StoreContext;
    TreeContextController =
      require('react-devtools-shared/src/devtools/views/Components/TreeContext').TreeContextController;
  });

  const {render} = getVersionedRenderImplementation();

  const Contexts = ({children, defaultOwnerID = null}) => (
    <BridgeContext.Provider value={bridge}>
      <StoreContext.Provider value={store}>
        <TreeContextController defaultOwnerID={defaultOwnerID}>
          <OwnersListContextController>{children}</OwnersListContextController>
        </TreeContextController>
      </StoreContext.Provider>
    </BridgeContext.Provider>
  );

  async function getOwnersListForOwner(owner) {
    let ownerDisplayNames = null;

    function Suspender() {
      const read = React.useContext(OwnersListContext);
      const owners = read(owner.id);
      ownerDisplayNames = owners.map(({displayName}) => displayName);
      return null;
    }

    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts defaultOwnerID={owner.id}>
          <React.Suspense fallback={null}>
            <Suspender owner={owner} />
          </React.Suspense>
        </Contexts>,
      ),
    );

    expect(ownerDisplayNames).not.toBeNull();

    return ownerDisplayNames;
  }

  it('should fetch the owners list for the selected element', async () => {
    const Grandparent = () => <Parent />;
    const Parent = () => {
      return (
        <React.Fragment>
          <Child />
          <Child />
        </React.Fragment>
      );
    };
    const Child = () => null;

    utils.act(() => render(<Grandparent />));

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Grandparent>
          ▾ <Parent>
              <Child>
              <Child>
    `);

    const parent = ((store.getElementAtIndex(1): any): Element);
    const firstChild = ((store.getElementAtIndex(2): any): Element);

    expect(await getOwnersListForOwner(parent)).toMatchInlineSnapshot(`
      [
        "Grandparent",
        "Parent",
      ]
    `);

    expect(await getOwnersListForOwner(firstChild)).toMatchInlineSnapshot(`
      [
        "Grandparent",
        "Parent",
        "Child",
      ]
    `);
  });

  it('should fetch the owners list for the selected element that includes filtered components', async () => {
    store.componentFilters = [utils.createDisplayNameFilter('^Parent$')];

    const Grandparent = () => <Parent />;
    const Parent = () => {
      return (
        <React.Fragment>
          <Child />
          <Child />
        </React.Fragment>
      );
    };
    const Child = () => null;

    utils.act(() => render(<Grandparent />));

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Grandparent>
            <Child>
            <Child>
    `);

    const firstChild = ((store.getElementAtIndex(1): any): Element);

    expect(await getOwnersListForOwner(firstChild)).toMatchInlineSnapshot(`
      [
        "Grandparent",
        "Child",
      ]
    `);
  });

  it('should include the current element even if there are no other owners', async () => {
    store.componentFilters = [utils.createDisplayNameFilter('^Parent$')];

    const Grandparent = () => <Parent />;
    const Parent = () => null;

    utils.act(() => render(<Grandparent />));

    expect(store).toMatchInlineSnapshot(`
      [root]
          <Grandparent>
    `);

    const grandparent = ((store.getElementAtIndex(0): any): Element);

    expect(await getOwnersListForOwner(grandparent)).toMatchInlineSnapshot(`
      [
        "Grandparent",
      ]
    `);
  });

  it('should include all owners for a component wrapped in react memo', async () => {
    const InnerComponent = (props, ref) => <div ref={ref} />;
    const ForwardRef = React.forwardRef(InnerComponent);
    const Memo = React.memo(ForwardRef);
    const Grandparent = () => {
      const ref = React.createRef();
      return <Memo ref={ref} />;
    };

    utils.act(() => render(<Grandparent />));

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Grandparent>
          ▾ <InnerComponent> [Memo]
              <InnerComponent> [ForwardRef]
    `);

    const wrapped = ((store.getElementAtIndex(2): any): Element);

    expect(await getOwnersListForOwner(wrapped)).toMatchInlineSnapshot(`
      [
        "Grandparent",
        "InnerComponent",
        "InnerComponent",
      ]
    `);
  });
});

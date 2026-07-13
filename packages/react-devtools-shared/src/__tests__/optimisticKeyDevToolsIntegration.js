/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import {getVersionedRenderImplementation} from './utils';

describe('Store React.optimisticKey', () => {
  let act;
  let actAsync;
  let React;
  let TestRenderer;
  let bridge;
  let store;

  let BridgeContext;
  let StoreContext;
  let TreeContext;

  let dispatch;
  let state;

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

    store = global.store;
    bridge = global.bridge;

    React = require('react');

    const utils = require('./utils');
    act = utils.act;
    actAsync = utils.actAsync;
    TestRenderer = utils.requireTestRenderer();

    BridgeContext =
      require('react-devtools-shared/src/devtools/views/context').BridgeContext;
    StoreContext =
      require('react-devtools-shared/src/devtools/views/context').StoreContext;
    TreeContext = require('react-devtools-shared/src/devtools/views/Components/TreeContext');
  });

  const {render} = getVersionedRenderImplementation();

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

  // @reactVersion >= 19.3
  it('is included in the tree', async () => {
    if (React.optimisticKey === undefined) {
      return;
    }

    function Component() {
      return null;
    }

    await actAsync(() => {
      render(<Component key={React.optimisticKey} />);
    });

    expect(store).toMatchInlineSnapshot(`
      [root]
          <Component key="React.optimisticKey">
    `);
    expect(store.getElementAtIndex(0)).toEqual(
      expect.objectContaining({key: 'React.optimisticKey'}),
    );
  });

  // @reactVersion >= 19.3
  it('is searchable', async () => {
    if (React.optimisticKey === undefined) {
      return;
    }
    await actAsync(() => {
      render(<React.Fragment key={React.optimisticKey} />);
    });
    let renderer;
    act(() => (renderer = TestRenderer.create(<Contexts />)));

    expect(state).toMatchInlineSnapshot(`
      [root]
           <Fragment key="React.optimisticKey">
    `);

    act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'optimistic'}));
    act(() => renderer.update(<Contexts />));

    expect(state).toMatchInlineSnapshot(`
      [root]
           <Fragment key="React.optimisticKey">
    `);

    act(() => dispatch({type: 'SET_SEARCH_TEXT', payload: 'react'}));
    act(() => renderer.update(<Contexts />));

    expect(state).toMatchInlineSnapshot(`
      [root]
      →    <Fragment key="React.optimisticKey">
    `);
  });
});

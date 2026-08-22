/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('Store with filtered Suspense boundaries', () => {
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
    const neverResolves = new Promise(() => {});

    function Reader() {
      React.use(neverResolves);
      return <div>read</div>;
    }

    function A({collapsed}) {
      if (collapsed) {
        return (
          <React.Suspense fallback={<div>a-fb</div>}>
            <Reader />
          </React.Suspense>
        );
      }
      return (
        <React.Suspense fallback={<div>a-outer-fb</div>}>
          <React.Suspense fallback={<div>a-inner-fb</div>}>
            <Reader />
          </React.Suspense>
          <React.Suspense fallback={<div>a-sib-fb</div>}>
            <div>a-sibling</div>
          </React.Suspense>
        </React.Suspense>
      );
    }

    return function App({collapsed, extra}) {
      return (
        <div>
          {extra ? <em key="s">side</em> : null}
          <A key="a" collapsed={collapsed} />
        </div>
      );
    };
  }

  // @reactVersion >= 19.0
  it('stays in sync when a boundary suspends during a sibling restructure', async () => {
    const App = buildApp();

    act(() => {
      // Assigning replaces the whole list, so host components stay visible.
      // The control test below shows both halves are required.
      store.componentFilters = [
        utils.createElementTypeFilter(12 /* ElementTypeSuspense */),
      ];
    });

    await actAsync(() => render(<App collapsed={false} extra={false} />));
    await actAsync(() => render(<App collapsed={true} extra={true} />));
    await actAsync(() => render(<App collapsed={true} extra={false} />));
  });

  // @reactVersion >= 19.0
  it('stays in sync under the default component filters', async () => {
    const App = buildApp();

    await actAsync(() => render(<App collapsed={false} extra={false} />));
    await actAsync(() => render(<App collapsed={true} extra={true} />));
    await actAsync(() => render(<App collapsed={true} extra={false} />));

    expect(store.componentFilters).toEqual([
      {type: 1, value: 7 /* ElementTypeHostComponent */, isEnabled: true},
    ]);
  });
});

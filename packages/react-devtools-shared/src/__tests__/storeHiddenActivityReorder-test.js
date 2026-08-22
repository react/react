/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('Store child order inside a hidden Activity', () => {
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
    const Activity = React.Activity || React.unstable_Activity;
    const neverResolves = new Promise(() => {});

    function Gate({blocked}) {
      if (blocked) {
        React.use(neverResolves);
      }
      return <span>content</span>;
    }

    function Fallback({label}) {
      return <span>{label}</span>;
    }

    return function App({hidden, first, second}) {
      return (
        <Activity mode={hidden ? 'hidden' : 'visible'}>
          <React.Suspense fallback={<Fallback label="first" />}>
            <Gate blocked={first} />
          </React.Suspense>
          <React.Suspense fallback={<Fallback label="second" />}>
            <Gate blocked={second} />
          </React.Suspense>
        </Activity>
      );
    };
  }

  // @reactVersion >= 19.0
  it('stays in sync when filtered boundaries suspend inside a hidden Activity', async () => {
    const App = buildApp();

    act(() => {
      // Assigning replaces the whole list, so host components stay visible.
      store.componentFilters = [
        utils.createElementTypeFilter(12 /* ElementTypeSuspense */),
      ];
    });

    await actAsync(() =>
      render(<App hidden={false} first={false} second={false} />),
    );
    await actAsync(() =>
      render(<App hidden={true} first={true} second={true} />),
    );
    await actAsync(() =>
      render(<App hidden={true} first={true} second={false} />),
    );
  });

  // @reactVersion >= 19.0
  it('stays in sync under the default component filters', async () => {
    const App = buildApp();

    await actAsync(() =>
      render(<App hidden={false} first={false} second={false} />),
    );
    await actAsync(() =>
      render(<App hidden={true} first={true} second={true} />),
    );
    await actAsync(() =>
      render(<App hidden={true} first={true} second={false} />),
    );

    expect(store.componentFilters).toEqual([
      {type: 1, value: 7 /* ElementTypeHostComponent */, isEnabled: true},
    ]);
  });
});

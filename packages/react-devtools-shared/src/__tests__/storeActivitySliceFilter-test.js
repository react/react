/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('Store with a focused Activity slice filter', () => {
  let React;
  let Activity;
  let actAsync;
  let store;
  let previousComponentFilters;
  let utils;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;

    store = global.store;
    previousComponentFilters = store.componentFilters;

    React = require('react');
    Activity = React.Activity || React.unstable_Activity;

    utils = require('./utils');
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

    return function App({suspend}) {
      return (
        <div>
          <React.Suspense fallback={<div>fallback</div>}>
            {suspend ? <Reader /> : null}
            <Activity name="target" mode="visible">
              <span>inside</span>
            </Activity>
          </React.Suspense>
        </div>
      );
    };
  }

  // @reactVersion >= 19.0
  it('stays in sync when a slice is focused as its boundary suspends', async () => {
    const App = buildApp();

    await actAsync(() => render(<App suspend={false} />));

    // Indices 0, 1, 2 are App, Suspense, Activity.
    const activity = store.getElementAtIndex(2);

    // Focusing the Activity is what the Suspense tab does with the id it read
    // out of the tree; here the app suspends the boundary in the same commit.
    await actAsync(() => {
      render(<App suspend={true} />);
      store.componentFilters = [utils.createActivitySliceFilter(activity.id)];
    });
  });

  // @reactVersion >= 19.0
  it('stays in sync when the slice is focused before the boundary suspends', async () => {
    const App = buildApp();

    await actAsync(() => render(<App suspend={false} />));
    const activity = store.getElementAtIndex(2);

    await actAsync(() => {
      store.componentFilters = [utils.createActivitySliceFilter(activity.id)];
    });
    await actAsync(() => render(<App suspend={true} />));
  });

  // @reactVersion >= 19.0
  it('stays in sync under the default component filters', async () => {
    const App = buildApp();

    await actAsync(() => render(<App suspend={false} />));
    await actAsync(() => render(<App suspend={true} />));

    expect(store.componentFilters).toEqual([
      {type: 1, value: 7 /* ElementTypeHostComponent */, isEnabled: true},
    ]);
  });
});

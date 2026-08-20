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

describe('ProfilerStore', () => {
  let React;
  let store: Store;
  let utils;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;

    utils = require('./utils');
    utils.beforeEachProfiling();

    store = global.store;
    store.collapseNodesByDefault = false;
    store.recordChangeDescriptions = true;

    React = require('react');
  });

  const {render, unmount} = getVersionedRenderImplementation();
  const {render: renderOther, unmount: unmountOther} =
    getVersionedRenderImplementation();

  // @reactVersion >= 16.9
  it('should not remove profiling data when roots are unmounted', async () => {
    const Parent = ({count}) =>
      new Array(count)
        .fill(true)
        .map((_, index) => <Child key={index} duration={index} />);
    const Child = () => <div>Hi!</div>;

    utils.act(() => {
      render(<Parent key="A" count={3} />);
      renderOther(<Parent key="B" count={2} />);
    });

    utils.act(() => store.profilerStore.startProfiling());

    utils.act(() => {
      render(<Parent key="A" count={4} />);
      renderOther(<Parent key="B" count={1} />);
    });

    utils.act(() => store.profilerStore.stopProfiling());

    const rootA = store.roots[0];
    const rootB = store.roots[1];

    utils.act(() => unmountOther());
    expect(store.profilerStore.getDataForRoot(rootA)).not.toBeNull();

    utils.act(() => unmount());
    expect(store.profilerStore.getDataForRoot(rootB)).not.toBeNull();
  });

  // @reactVersion >= 16.9
  it('should not allow new/saved profiling data to be set while profiling is in progress', () => {
    utils.act(() => store.profilerStore.startProfiling());
    const fauxProfilingData = {
      dataForRoots: new Map(),
    };
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    store.profilerStore.profilingData = fauxProfilingData;
    expect(store.profilerStore.profilingData).not.toBe(fauxProfilingData);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      'Profiling data cannot be updated while profiling is in progress.',
    );
    utils.act(() => store.profilerStore.stopProfiling());
    store.profilerStore.profilingData = fauxProfilingData;
    expect(store.profilerStore.profilingData).toBe(fauxProfilingData);
  });

  // @reactVersion >= 16.9
  // This test covers current broken behavior (arguably) with the synthetic event system.
  it('should filter empty commits', () => {
    const inputRef = React.createRef();
    const ControlledInput = () => {
      const [name, setName] = React.useState('foo');
      const handleChange = event => setName(event.target.value);
      return <input ref={inputRef} value={name} onChange={handleChange} />;
    };

    // It's important that this test uses legacy sync mode.
    // The root API does not trigger this particular failing case.
    utils.act(() => render(<ControlledInput />));

    utils.act(() => store.profilerStore.startProfiling());

    // Sets a value in a way that React doesn't see,
    // so that a subsequent "change" event will trigger the event handler.
    const setUntrackedValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set;

    const target = inputRef.current;
    setUntrackedValue.call(target, 'bar');
    target.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    expect(target.value).toBe('bar');

    utils.act(() => store.profilerStore.stopProfiling());

    // Only one commit should have been recorded (in response to the "change" event).
    const root = store.roots[0];
    const data = store.profilerStore.getDataForRoot(root);
    expect(data.commitData).toHaveLength(1);
    expect(data.operations).toHaveLength(1);
  });

  // @reactVersion >= 16.9
  it('should filter empty commits alt', () => {
    let commitCount = 0;

    const inputRef = React.createRef();
    const Example = () => {
      const [, setTouched] = React.useState(false);

      const handleBlur = () => {
        setTouched(true);
      };

      require('scheduler').unstable_advanceTime(1);

      React.useLayoutEffect(() => {
        commitCount++;
      });

      return <input ref={inputRef} onBlur={handleBlur} />;
    };

    // It's important that this test uses legacy sync mode.
    // The root API does not trigger this particular failing case.
    utils.act(() => render(<Example />));

    expect(commitCount).toBe(1);
    commitCount = 0;

    utils.act(() => store.profilerStore.startProfiling());

    // Focus and blur.
    const target = inputRef.current;
    utils.act(() => target.focus());
    utils.act(() => target.blur());
    utils.act(() => target.focus());
    utils.act(() => target.blur());
    expect(commitCount).toBe(1);

    utils.act(() => store.profilerStore.stopProfiling());

    // Only one commit should have been recorded (in response to the "change" event).
    const root = store.roots[0];
    const data = store.profilerStore.getDataForRoot(root);
    expect(data.commitData).toHaveLength(1);
    expect(data.operations).toHaveLength(1);
  });

  // @reactVersion >= 16.9
  it('should throw if component filters are modified while profiling', () => {
    utils.act(() => store.profilerStore.startProfiling());

    expect(() => {
      utils.act(() => {
        const {
          ElementTypeHostComponent,
        } = require('react-devtools-shared/src/frontend/types');
        store.componentFilters = [
          utils.createElementTypeFilter(ElementTypeHostComponent),
        ];
      });
    }).toThrow('Cannot modify filter preferences while profiling');
  });

  // @reactVersion >= 16.9
  it('should not throw if state contains a property hasOwnProperty', () => {
    let setStateCallback;
    const ControlledInput = () => {
      const [state, setState] = React.useState({hasOwnProperty: true});
      setStateCallback = setState;
      return state.hasOwnProperty;
    };

    // It's important that this test uses legacy sync mode.
    // The root API does not trigger this particular failing case.
    utils.act(() => render(<ControlledInput />));

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() =>
      setStateCallback({
        hasOwnProperty: false,
      }),
    );
    utils.act(() => store.profilerStore.stopProfiling());

    // Only one commit should have been recorded (in response to the "change" event).
    const root = store.roots[0];
    const data = store.profilerStore.getDataForRoot(root);
    expect(data.commitData).toHaveLength(1);
    expect(data.operations).toHaveLength(1);
  });

  // @reactVersion >= 18.0
  it('should not throw while initializing context values for Fibers within a not-yet-mounted subtree', () => {
    const promise = new Promise(resolve => {});
    const SuspendingView = () => {
      if (React.use) {
        React.use(promise);
      } else {
        throw promise;
      }
    };

    const App = () => {
      return (
        <React.Suspense fallback="Fallback">
          <SuspendingView />
        </React.Suspense>
      );
    };

    utils.act(() => render(<App />));
    utils.act(() => store.profilerStore.startProfiling());
  });
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type Store from 'react-devtools-shared/src/devtools/store';

import {getVersionedRenderImplementation} from './utils';

describe('ProfilingCache', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let Scheduler;
  let bridge: FrontendBridge;
  let legacyRender;
  let store: Store;
  let utils;

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    legacyRender = utils.legacyRender;

    bridge = global.bridge;
    store = global.store;
    store.collapseNodesByDefault = false;
    store.recordChangeDescriptions = true;

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
  });

  const {render, getContainer} = getVersionedRenderImplementation();

  // @reactVersion >= 16.9
  // @reactVersion <= 18.2
  it('should collect data for each root (including ones added or mounted after profiling started) (legacy render)', () => {
    const Parent = ({count}) => {
      Scheduler.unstable_advanceTime(10);
      const children = new Array(count)
        .fill(true)
        .map((_, index) => <Child key={index} duration={index} />);
      return (
        <React.Fragment>
          {children}
          <MemoizedChild duration={1} />
        </React.Fragment>
      );
    };
    const Child = ({duration}) => {
      Scheduler.unstable_advanceTime(duration);
      return null;
    };
    const MemoizedChild = React.memo(Child);

    const RootA = ({children}) => children;
    const RootB = ({children}) => children;
    const RootC = ({children}) => children;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    const containerC = document.createElement('div');

    utils.act(() =>
      legacyRender(
        <RootA>
          <Parent count={2} />
        </RootA>,
        containerA,
      ),
    );
    utils.act(() =>
      legacyRender(
        <RootB>
          <Parent count={1} />
        </RootB>,
        containerB,
      ),
    );
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() =>
      legacyRender(
        <RootA>
          <Parent count={3} />
        </RootA>,
        containerA,
      ),
    );
    utils.act(() =>
      legacyRender(
        <RootC>
          <Parent count={1} />
        </RootC>,
        containerC,
      ),
    );
    utils.act(() =>
      legacyRender(
        <RootA>
          <Parent count={1} />
        </RootA>,
        containerA,
      ),
    );
    utils.act(() => ReactDOM.unmountComponentAtNode(containerB));
    utils.act(() =>
      legacyRender(
        <RootA>
          <Parent count={0} />
        </RootA>,
        containerA,
      ),
    );
    utils.act(() => store.profilerStore.stopProfiling());
    utils.act(() => ReactDOM.unmountComponentAtNode(containerA));

    const rootIDs = Array.from(
      store.profilerStore.profilingData.dataForRoots.values(),
    ).map(({rootID}) => rootID);
    expect(rootIDs).toHaveLength(3);

    const originalProfilingDataForRoot = [];

    let data = store.profilerStore.getDataForRoot(rootIDs[0]);
    expect(data.displayName).toMatchInlineSnapshot(`"RootA"`);
    expect(data.commitData).toHaveLength(3);
    originalProfilingDataForRoot.push(data);

    data = store.profilerStore.getDataForRoot(rootIDs[1]);
    expect(data.displayName).toMatchInlineSnapshot(`"RootC"`);
    expect(data.commitData).toHaveLength(1);
    originalProfilingDataForRoot.push(data);

    data = store.profilerStore.getDataForRoot(rootIDs[2]);
    expect(data.displayName).toMatchInlineSnapshot(`"RootB"`);
    expect(data.commitData).toHaveLength(1);
    originalProfilingDataForRoot.push(data);

    utils.exportImportHelper(bridge, store);

    rootIDs.forEach((rootID, index) => {
      const current = store.profilerStore.getDataForRoot(rootID);
      const prev = originalProfilingDataForRoot[index];
      expect(current).toEqual(prev);
    });
  });

  // @reactVersion >= 18
  it('should collect data for each root (including ones added or mounted after profiling started) (createRoot)', () => {
    const Parent = ({count}) => {
      Scheduler.unstable_advanceTime(10);
      const children = new Array(count)
        .fill(true)
        .map((_, index) => <Child key={index} duration={index} />);
      return (
        <React.Fragment>
          {children}
          <MemoizedChild duration={1} />
        </React.Fragment>
      );
    };
    const Child = ({duration}) => {
      Scheduler.unstable_advanceTime(duration);
      return null;
    };
    const MemoizedChild = React.memo(Child);

    const RootA = ({children}) => children;
    const RootB = ({children}) => children;
    const RootC = ({children}) => children;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    const containerC = document.createElement('div');

    const rootA = ReactDOMClient.createRoot(containerA);
    const rootB = ReactDOMClient.createRoot(containerB);
    const rootC = ReactDOMClient.createRoot(containerC);

    utils.act(() =>
      rootA.render(
        <RootA>
          <Parent count={2} />
        </RootA>,
      ),
    );
    utils.act(() =>
      rootB.render(
        <RootB>
          <Parent count={1} />
        </RootB>,
      ),
    );
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() =>
      rootA.render(
        <RootA>
          <Parent count={3} />
        </RootA>,
      ),
    );
    utils.act(() =>
      rootC.render(
        <RootC>
          <Parent count={1} />
        </RootC>,
      ),
    );
    utils.act(() =>
      rootA.render(
        <RootA>
          <Parent count={1} />
        </RootA>,
      ),
    );
    utils.act(() => rootB.unmount());
    utils.act(() =>
      rootA.render(
        <RootA>
          <Parent count={0} />
        </RootA>,
      ),
    );
    utils.act(() => store.profilerStore.stopProfiling());
    utils.act(() => rootA.unmount());

    const rootIDs = Array.from(
      store.profilerStore.profilingData.dataForRoots.values(),
    ).map(({rootID}) => rootID);
    expect(rootIDs).toHaveLength(3);

    const originalProfilingDataForRoot = [];

    let data = store.profilerStore.getDataForRoot(rootIDs[0]);
    expect(data.displayName).toMatchInlineSnapshot(`"RootA"`);
    expect(data.commitData).toHaveLength(3);
    originalProfilingDataForRoot.push(data);

    data = store.profilerStore.getDataForRoot(rootIDs[1]);
    expect(data.displayName).toMatchInlineSnapshot(`"RootC"`);
    expect(data.commitData).toHaveLength(1);
    originalProfilingDataForRoot.push(data);

    data = store.profilerStore.getDataForRoot(rootIDs[2]);
    expect(data.displayName).toMatchInlineSnapshot(`"RootB"`);
    expect(data.commitData).toHaveLength(1);
    originalProfilingDataForRoot.push(data);

    utils.exportImportHelper(bridge, store);

    rootIDs.forEach((rootID, index) => {
      const current = store.profilerStore.getDataForRoot(rootID);
      const prev = originalProfilingDataForRoot[index];
      expect(current).toEqual(prev);
    });
  });

  // @reactVersion >= 16.9
  it('should collect data for each commit', () => {
    const Parent = ({count}) => {
      Scheduler.unstable_advanceTime(10);
      const children = new Array(count)
        .fill(true)
        .map((_, index) => <Child key={index} duration={index} />);
      return (
        <React.Fragment>
          {children}
          <MemoizedChild duration={1} />
        </React.Fragment>
      );
    };
    const Child = ({duration}) => {
      Scheduler.unstable_advanceTime(duration);
      return null;
    };
    const MemoizedChild = React.memo(Child);

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<Parent count={2} />));
    utils.act(() => render(<Parent count={3} />));
    utils.act(() => render(<Parent count={1} />));
    utils.act(() => render(<Parent count={0} />));
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];

    const prevCommitData =
      store.profilerStore.getDataForRoot(rootID).commitData;
    expect(prevCommitData).toHaveLength(4);

    utils.exportImportHelper(bridge, store);

    const nextCommitData =
      store.profilerStore.getDataForRoot(rootID).commitData;
    expect(nextCommitData).toHaveLength(4);
    nextCommitData.forEach((commitData, index) => {
      expect(commitData).toEqual(prevCommitData[index]);
    });
  });

  // @reactVersion >= 18.0
  it('should properly detect changed hooks', () => {
    const Context = React.createContext(0);

    function reducer(state, action) {
      switch (action.type) {
        case 'invert':
          return {value: !state.value};
        default:
          throw new Error();
      }
    }

    let snapshot = 0;
    function getServerSnapshot() {
      return snapshot;
    }
    function getClientSnapshot() {
      return snapshot;
    }

    let syncExternalStoreCallback;
    function subscribe(callback) {
      syncExternalStoreCallback = callback;
    }

    let dispatch = null;
    let setState = null;

    const Component = ({count, string}) => {
      // These hooks may change and initiate re-renders.
      setState = React.useState('abc')[1];
      dispatch = React.useReducer(reducer, {value: true})[1];
      React.useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
      );

      // This hook's return value may change between renders,
      // but the hook itself isn't stateful.
      React.useContext(Context);

      // These hooks never change in a way that schedules an update.
      React.useCallback(() => () => {}, [string]);
      React.useMemo(() => string, [string]);
      React.useCallback(() => () => {}, [count]);
      React.useMemo(() => count, [count]);
      React.useCallback(() => () => {});
      React.useMemo(() => string);

      // These hooks never change in a way that schedules an update.
      React.useEffect(() => {}, [string]);
      React.useLayoutEffect(() => {}, [string]);
      React.useEffect(() => {}, [count]);
      React.useLayoutEffect(() => {}, [count]);
      React.useEffect(() => {});
      React.useLayoutEffect(() => {});

      return null;
    };

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() =>
      render(
        <Context.Provider value={true}>
          <Component count={1} />
        </Context.Provider>,
      ),
    );

    // Save references to the real dispatch/setState functions.
    // inspectHooks() re-runs the component with a mock dispatcher,
    // which would overwrite these variables with mock functions that do nothing.
    const realDispatch = dispatch;
    const realSetState = setState;

    // Second render has no changed hooks, only changed props.
    utils.act(() =>
      render(
        <Context.Provider value={true}>
          <Component count={2} />
        </Context.Provider>,
      ),
    );

    // Third render has a changed reducer hook.
    utils.act(() => realDispatch({type: 'invert'}));

    // Fourth render has a changed state hook.
    utils.act(() => realSetState('def'));

    // Fifth render has a changed context value, but no changed hook.
    utils.act(() =>
      render(
        <Context.Provider value={false}>
          <Component count={2} />
        </Context.Provider>,
      ),
    );

    // 6th renderer is triggered by a sync external store change.
    utils.act(() => {
      snapshot++;
      syncExternalStoreCallback();
    });

    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];

    const changeDescriptions = store.profilerStore
      .getDataForRoot(rootID)
      .commitData.map(commitData => commitData.changeDescriptions);
    expect(changeDescriptions).toHaveLength(6);

    // 1st render: No change
    expect(changeDescriptions[0]).toMatchInlineSnapshot(`
      Map {
        3 => {
          "context": null,
          "didHooksChange": false,
          "isFirstMount": true,
          "props": null,
          "state": null,
        },
      }
    `);

    // 2nd render: Changed props
    expect(changeDescriptions[1]).toMatchInlineSnapshot(`
      Map {
        3 => {
          "context": false,
          "didHooksChange": false,
          "hooks": [],
          "isFirstMount": false,
          "props": [
            "count",
          ],
          "state": null,
        },
      }
    `);

    // 3rd render: Changed useReducer
    expect(changeDescriptions[2]).toMatchInlineSnapshot(`
      Map {
        3 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            1,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 4th render: Changed useState
    expect(changeDescriptions[3]).toMatchInlineSnapshot(`
      Map {
        3 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            0,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 5th render: Changed context
    expect(changeDescriptions[4]).toMatchInlineSnapshot(`
      Map {
        3 => {
          "context": true,
          "didHooksChange": false,
          "hooks": [],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 6th render: Sync external store
    expect(changeDescriptions[5]).toMatchInlineSnapshot(`
      Map {
        3 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            2,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    expect(changeDescriptions).toHaveLength(6);

    // Export and re-import profile data and make sure it is retained.
    utils.exportImportHelper(bridge, store);

    for (let commitIndex = 0; commitIndex < 6; commitIndex++) {
      const commitData = store.profilerStore.getCommitData(rootID, commitIndex);
      expect(commitData.changeDescriptions).toEqual(
        changeDescriptions[commitIndex],
      );
    }
  });

  // @reactVersion >= 19.0
  it('should detect what hooks changed in a render with custom and composite hooks', () => {
    let snapshot = 0;
    let syncExternalStoreCallback;

    function subscribe(callback) {
      syncExternalStoreCallback = callback;
      return () => {};
    }

    function getSnapshot() {
      return snapshot;
    }

    // Custom hook wrapping multiple primitive hooks
    function useCustomHook() {
      const [value, setValue] = React.useState('custom');
      React.useEffect(() => {}, [value]);
      return [value, setValue];
    }

    let setState = null;
    let startTransition = null;
    let actionStateDispatch = null;
    let setCustomValue = null;
    let setFinalState = null;

    const Component = () => {
      // Hook 0: useState
      const [state, _setState] = React.useState('initial');
      setState = _setState;

      // Hook 1: useSyncExternalStore (composite hook - internally uses multiple hooks)
      const storeValue = React.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot,
      );

      // Hook 2: useTransition (composite hook - internally uses multiple hooks)
      const [isPending, _startTransition] = React.useTransition();
      startTransition = _startTransition;

      // Hook 3: useActionState (composite hook - internally uses multiple hooks)
      const [actionState, _actionStateDispatch] = React.useActionState(
        (_prev, action) => action,
        'action-initial',
      );
      actionStateDispatch = _actionStateDispatch;

      // Hook 4: useState inside custom hook (flattened)
      // Hook 5: useEffect inside custom hook (not stateful, won't show in changes)
      const [customValue, _setCustomValue] = useCustomHook();
      setCustomValue = _setCustomValue;

      // Hook 6: direct useState at the end
      const [finalState, _setFinalState] = React.useState('final');
      setFinalState = _setFinalState;

      return `${state}-${storeValue}-${isPending}-${actionState}-${customValue}-${finalState}`;
    };

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<Component />));

    // Save references before inspectHooks() overwrites them
    const realSetState = setState;
    const realStartTransition = startTransition;
    const realActionStateDispatch = actionStateDispatch;
    const realSetCustomValue = setCustomValue;
    const realSetFinalState = setFinalState;

    // 2nd render: change useState (hook 0)
    utils.act(() => realSetState('changed'));

    // 3rd render: change useSyncExternalStore (hook 1)
    utils.act(() => {
      snapshot = 1;
      syncExternalStoreCallback();
    });

    // 4th render: trigger useTransition (hook 2)
    // Note: useTransition triggers two renders - one when isPending becomes true,
    // and another when isPending becomes false after the transition completes
    utils.act(() => {
      realStartTransition(() => {});
    });

    // 6th render: change useActionState (hook 3)
    utils.act(() => realActionStateDispatch('action-changed'));

    // 7th render: change custom hook's useState (hook 4)
    utils.act(() => realSetCustomValue('custom-changed'));

    // 8th render: change final useState (hook 6)
    utils.act(() => realSetFinalState('final-changed'));

    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];

    const changeDescriptions = store.profilerStore
      .getDataForRoot(rootID)
      .commitData.map(commitData => commitData.changeDescriptions);
    expect(changeDescriptions).toHaveLength(8);

    // 1st render: Initial mount
    expect(changeDescriptions[0]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": null,
          "didHooksChange": false,
          "isFirstMount": true,
          "props": null,
          "state": null,
        },
      }
    `);

    // 2nd render: Changed hook 0 (useState)
    expect(changeDescriptions[1]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            0,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 3rd render: Changed hook 1 (useSyncExternalStore)
    expect(changeDescriptions[2]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            1,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 4th render: Changed hook 2 (useTransition - isPending becomes true)
    expect(changeDescriptions[3]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            2,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 5th render: Changed hook 2 (useTransition - isPending becomes false)
    expect(changeDescriptions[4]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            2,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 6th render: Changed hook 3 (useActionState)
    expect(changeDescriptions[5]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            3,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 7th render: Changed hook 4 (useState inside useCustomHook)
    expect(changeDescriptions[6]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            4,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 8th render: Changed hook 6 (final useState)
    expect(changeDescriptions[7]).toMatchInlineSnapshot(`
      Map {
        2 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            6,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);
  });

  // @reactVersion >= 19.0
  it('should detect context changes or lack of changes with conditional use()', () => {
    const ContextA = React.createContext(0);
    const ContextB = React.createContext(1);
    let setState = null;

    const Component = () => {
      // These hooks may change and initiate re-renders.
      let state;
      [state, setState] = React.useState('abc');

      let result = state;

      if (state.includes('a')) {
        result += React.use(ContextA);
      }

      result += React.use(ContextB);

      return result;
    };

    utils.act(() =>
      render(
        <ContextA.Provider value={1}>
          <ContextB.Provider value={1}>
            <Component />
          </ContextB.Provider>
        </ContextA.Provider>,
      ),
    );

    // Save reference to the real setState function before profiling starts.
    // inspectHooks() re-runs the component with a mock dispatcher,
    // which would overwrite setState with a mock function that does nothing.
    const realSetState = setState;

    utils.act(() => store.profilerStore.startProfiling());

    // First render changes Context.
    utils.act(() =>
      render(
        <ContextA.Provider value={0}>
          <ContextB.Provider value={1}>
            <Component />
          </ContextB.Provider>
        </ContextA.Provider>,
      ),
    );

    // Second render has no changed Context, only changed state.
    utils.act(() => realSetState('def'));

    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];

    const changeDescriptions = store.profilerStore
      .getDataForRoot(rootID)
      .commitData.map(commitData => commitData.changeDescriptions);
    expect(changeDescriptions).toHaveLength(2);

    // 1st render: Change to Context
    expect(changeDescriptions[0]).toMatchInlineSnapshot(`
      Map {
        4 => {
          "context": true,
          "didHooksChange": false,
          "hooks": [],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    // 2nd render: Change to State
    expect(changeDescriptions[1]).toMatchInlineSnapshot(`
      Map {
        4 => {
          "context": false,
          "didHooksChange": true,
          "hooks": [
            0,
          ],
          "isFirstMount": false,
          "props": [],
          "state": null,
        },
      }
    `);

    expect(changeDescriptions).toHaveLength(2);

    // Export and re-import profile data and make sure it is retained.
    utils.exportImportHelper(bridge, store);

    for (let commitIndex = 0; commitIndex < 2; commitIndex++) {
      const commitData = store.profilerStore.getCommitData(rootID, commitIndex);
      expect(commitData.changeDescriptions).toEqual(
        changeDescriptions[commitIndex],
      );
    }
  });

  // @reactVersion >= 18.0
  it('should calculate durations based on actual children (not filtered children)', () => {
    store.componentFilters = [utils.createDisplayNameFilter('^Parent$')];

    const Grandparent = () => {
      Scheduler.unstable_advanceTime(10);
      return (
        <React.Fragment>
          <Parent key="one" />
          <Parent key="two" />
        </React.Fragment>
      );
    };
    const Parent = () => {
      Scheduler.unstable_advanceTime(2);
      return <Child />;
    };
    const Child = () => {
      Scheduler.unstable_advanceTime(1);
      return null;
    };

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<Grandparent />));
    utils.act(() => store.profilerStore.stopProfiling());

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Grandparent>
            <Child>
            <Child>
    `);

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getDataForRoot(rootID).commitData;
    expect(commitData).toHaveLength(1);

    // Actual duration should also include both filtered <Parent> components.
    expect(commitData[0].fiberActualDurations).toMatchInlineSnapshot(`
      Map {
        1 => 16,
        2 => 16,
        3 => 1,
        4 => 1,
      }
    `);

    expect(commitData[0].fiberSelfDurations).toMatchInlineSnapshot(`
      Map {
        1 => 0,
        2 => 10,
        3 => 1,
        4 => 1,
      }
    `);
  });

  // @reactVersion >= 17.0
  it('should calculate durations correctly for suspended views', async () => {
    let data;
    const getData = () => {
      if (React.use) {
        if (!data) {
          data = new Promise(resolve => {
            resolve('abc');
          });
        }
        return React.use(data);
      }
      if (data) {
        return data;
      } else {
        throw new Promise(resolve => {
          data = 'abc';
          resolve(data);
        });
      }
    };

    const Parent = () => {
      Scheduler.unstable_advanceTime(10);
      return (
        <React.Suspense fallback={<Fallback />}>
          <Async />
        </React.Suspense>
      );
    };
    const Fallback = () => {
      Scheduler.unstable_advanceTime(2);
      return 'Fallback...';
    };
    const Async = () => {
      Scheduler.unstable_advanceTime(3);
      return getData();
    };

    utils.act(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => render(<Parent />));
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getDataForRoot(rootID).commitData;
    expect(commitData).toHaveLength(2);

    if (React.version.startsWith('17')) {
      // React 17 will mount all children until it suspends in a LegacyHidden
      // The ID gap is from the Fiber for <Async> that's in the disconnected tree.
      expect(commitData[0].fiberActualDurations).toMatchInlineSnapshot(`
        Map {
          1 => 15,
          2 => 15,
          3 => 5,
          5 => 2,
        }
      `);
      expect(commitData[0].fiberSelfDurations).toMatchInlineSnapshot(`
        Map {
          1 => 0,
          2 => 10,
          3 => 3,
          5 => 2,
        }
      `);
      expect(commitData[1].fiberActualDurations).toMatchInlineSnapshot(`
        Map {
          6 => 3,
          3 => 3,
        }
      `);
      expect(commitData[1].fiberSelfDurations).toMatchInlineSnapshot(`
        Map {
          6 => 3,
          3 => 0,
        }
      `);
    } else {
      expect(commitData[0].fiberActualDurations).toMatchInlineSnapshot(`
        Map {
          1 => 15,
          2 => 15,
          3 => 5,
          4 => 2,
        }
      `);
      expect(commitData[0].fiberSelfDurations).toMatchInlineSnapshot(`
        Map {
          1 => 0,
          2 => 10,
          3 => 3,
          4 => 2,
        }
      `);
      expect(commitData[1].fiberActualDurations).toMatchInlineSnapshot(`
        Map {
          5 => 3,
          3 => 3,
        }
      `);
      expect(commitData[1].fiberSelfDurations).toMatchInlineSnapshot(`
        Map {
          5 => 3,
          3 => 0,
        }
      `);
    }
  });

  // @reactVersion >= 16.9
  it('should collect data for each rendered fiber', () => {
    const Parent = ({count}) => {
      Scheduler.unstable_advanceTime(10);
      const children = new Array(count)
        .fill(true)
        .map((_, index) => <Child key={index} duration={index} />);
      return (
        <React.Fragment>
          {children}
          <MemoizedChild duration={1} />
        </React.Fragment>
      );
    };
    const Child = ({duration}) => {
      Scheduler.unstable_advanceTime(duration);
      return null;
    };
    const MemoizedChild = React.memo(Child);

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<Parent count={1} />));
    utils.act(() => render(<Parent count={2} />));
    utils.act(() => render(<Parent count={3} />));
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const allFiberCommits = [];
    for (let index = 0; index < store.numElements; index++) {
      const fiberID = store.getElementIDAtIndex(index);
      const fiberCommits = store.profilerStore.profilingCache.getFiberCommits({
        fiberID,
        rootID,
      });

      allFiberCommits.push(fiberCommits);
    }

    expect(allFiberCommits).toMatchInlineSnapshot(`
      [
        [
          0,
          1,
          2,
        ],
        [
          0,
          1,
          2,
        ],
        [
          1,
          2,
        ],
        [
          2,
        ],
        [
          0,
        ],
      ]
    `);

    utils.exportImportHelper(bridge, store);

    for (let index = 0; index < store.numElements; index++) {
      const fiberID = store.getElementIDAtIndex(index);
      const fiberCommits = store.profilerStore.profilingCache.getFiberCommits({
        fiberID,
        rootID,
      });

      expect(fiberCommits).toEqual(allFiberCommits[index]);
    }
  });

  // @reactVersion >= 18.0.0
  // @reactVersion <= 18.2.0
  it('should handle unexpectedly shallow suspense trees for react v[18.0.0 - 18.2.0] (legacy render)', () => {
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() =>
      legacyRender(<React.Suspense />, document.createElement('div')),
    );
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getDataForRoot(rootID).commitData;
    expect(commitData).toMatchInlineSnapshot(`
      [
        {
          "changeDescriptions": Map {},
          "duration": 0,
          "effectDuration": null,
          "fiberActualDurations": Map {
            1 => 0,
            2 => 0,
          },
          "fiberSelfDurations": Map {
            1 => 0,
            2 => 0,
          },
          "passiveEffectDuration": null,
          "priorityLevel": "Immediate",
          "timestamp": 0,
          "updaters": [
            {
              "compiledWithForget": false,
              "displayName": "render()",
              "env": null,
              "hocDisplayNames": null,
              "id": 1,
              "key": null,
              "stack": null,
              "type": 11,
            },
          ],
        },
      ]
    `);
  });

  // @reactVersion >= 18.0.0
  // @reactVersion <= 18.2.0
  it('should handle unexpectedly shallow suspense trees for react v[18.0.0 - 18.2.0] (createRoot)', () => {
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<React.Suspense />));
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getDataForRoot(rootID).commitData;
    expect(commitData).toMatchInlineSnapshot(`
      [
        {
          "changeDescriptions": Map {},
          "duration": 0,
          "effectDuration": null,
          "fiberActualDurations": Map {
            1 => 0,
            2 => 0,
          },
          "fiberSelfDurations": Map {
            1 => 0,
            2 => 0,
          },
          "passiveEffectDuration": null,
          "priorityLevel": "Normal",
          "timestamp": 0,
          "updaters": [
            {
              "compiledWithForget": false,
              "displayName": "createRoot()",
              "env": null,
              "hocDisplayNames": null,
              "id": 1,
              "key": null,
              "stack": null,
              "type": 11,
            },
          ],
        },
      ]
    `);
  });

  // @reactVersion > 18.2.0
  it('should handle unexpectedly shallow suspense trees', () => {
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<React.Suspense />));
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getDataForRoot(rootID).commitData;
    expect(commitData).toMatchInlineSnapshot(`
      [
        {
          "changeDescriptions": Map {},
          "duration": 0,
          "effectDuration": null,
          "fiberActualDurations": Map {
            1 => 0,
            2 => 0,
          },
          "fiberSelfDurations": Map {
            1 => 0,
            2 => 0,
          },
          "passiveEffectDuration": null,
          "priorityLevel": "Normal",
          "timestamp": 0,
          "updaters": [
            {
              "compiledWithForget": false,
              "displayName": "createRoot()",
              "env": null,
              "hocDisplayNames": null,
              "id": 1,
              "key": null,
              "stack": null,
              "type": 11,
            },
          ],
        },
      ]
    `);
  });

  // See https://github.com/facebook/react/issues/18831
  // @reactVersion >= 16.9
  it('should not crash during route transitions with Suspense', () => {
    const RouterContext = React.createContext();

    function App() {
      return (
        <Router>
          <Switch>
            <Route path="/">
              <Home />
            </Route>
            <Route path="/about">
              <About />
            </Route>
          </Switch>
        </Router>
      );
    }

    const Home = () => {
      return (
        <React.Suspense>
          <Link path="/about">Home</Link>
        </React.Suspense>
      );
    };

    const About = () => <div>About</div>;

    // Mimics https://github.com/ReactTraining/react-router/blob/master/packages/react-router/modules/Router.js
    function Router({children}) {
      const [path, setPath] = React.useState('/');
      return (
        <RouterContext.Provider value={{path, setPath}}>
          {children}
        </RouterContext.Provider>
      );
    }

    // Mimics https://github.com/ReactTraining/react-router/blob/master/packages/react-router/modules/Switch.js
    function Switch({children}) {
      return (
        <RouterContext.Consumer>
          {context => {
            let element = null;
            React.Children.forEach(children, child => {
              if (context.path === child.props.path) {
                element = child.props.children;
              }
            });
            return element ? React.cloneElement(element) : null;
          }}
        </RouterContext.Consumer>
      );
    }

    // Mimics https://github.com/ReactTraining/react-router/blob/master/packages/react-router/modules/Route.js
    function Route({children, path}) {
      return null;
    }

    const linkRef = React.createRef();

    // Mimics https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/Link.js
    function Link({children, path}) {
      return (
        <RouterContext.Consumer>
          {context => {
            return (
              <button ref={linkRef} onClick={() => context.setPath(path)}>
                {children}
              </button>
            );
          }}
        </RouterContext.Consumer>
      );
    }

    utils.act(() => render(<App />));
    expect(getContainer().textContent).toBe('Home');
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() =>
      linkRef.current.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      ),
    );
    utils.act(() => store.profilerStore.stopProfiling());
    expect(getContainer().textContent).toBe('About');
  });

  // @reactVersion >= 18.0
  it('components that were deleted and added to updaters during the layout phase should not crash', () => {
    let setChildUnmounted;
    function Child() {
      const [, setState] = React.useState(false);

      React.useLayoutEffect(() => {
        return () => setState(true);
      });

      return null;
    }

    function App() {
      const [childUnmounted, _setChildUnmounted] = React.useState(false);
      setChildUnmounted = _setChildUnmounted;
      return <>{!childUnmounted && <Child />}</>;
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    utils.act(() => root.render(<App />));
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => setChildUnmounted(true));
    utils.act(() => store.profilerStore.stopProfiling());

    const updaters = store.profilerStore.getCommitData(
      store.roots[0],
      0,
    ).updaters;
    expect(updaters.length).toEqual(1);
    expect(updaters[0].displayName).toEqual('App');
  });

  // @reactVersion >= 18.0
  it('components in a deleted subtree and added to updaters during the layout phase should not crash', () => {
    let setChildUnmounted;
    function Child() {
      return <GrandChild />;
    }

    function GrandChild() {
      const [, setState] = React.useState(false);

      React.useLayoutEffect(() => {
        return () => setState(true);
      });

      return null;
    }

    function App() {
      const [childUnmounted, _setChildUnmounted] = React.useState(false);
      setChildUnmounted = _setChildUnmounted;
      return <>{!childUnmounted && <Child />}</>;
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    utils.act(() => root.render(<App />));
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => setChildUnmounted(true));
    utils.act(() => store.profilerStore.stopProfiling());

    const updaters = store.profilerStore.getCommitData(
      store.roots[0],
      0,
    ).updaters;
    expect(updaters.length).toEqual(1);
    expect(updaters[0].displayName).toEqual('App');
  });

  // @reactVersion >= 18.0
  it('components that were deleted should not be added to updaters during the passive phase', () => {
    let setChildUnmounted;
    function Child() {
      const [, setState] = React.useState(false);
      React.useEffect(() => {
        return () => setState(true);
      });

      return null;
    }

    function App() {
      const [childUnmounted, _setChildUnmounted] = React.useState(false);
      setChildUnmounted = _setChildUnmounted;
      return <>{!childUnmounted && <Child />}</>;
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    utils.act(() => root.render(<App />));
    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => setChildUnmounted(true));
    utils.act(() => store.profilerStore.stopProfiling());

    const updaters = store.profilerStore.getCommitData(
      store.roots[0],
      0,
    ).updaters;
    expect(updaters.length).toEqual(1);
    expect(updaters[0].displayName).toEqual('App');
  });
});

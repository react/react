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
import type {Context} from 'react-devtools-shared/src/devtools/views/Profiler/ProfilerContext';
import type {DispatcherContext} from 'react-devtools-shared/src/devtools/views/Components/TreeContext';
import type Store from 'react-devtools-shared/src/devtools/store';

import {getVersionedRenderImplementation} from './utils';

describe('ProfilerContext', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let TestRenderer: ReactTestRenderer;
  let bridge: FrontendBridge;
  let legacyRender;
  let store: Store;
  let utils;

  let BridgeContext;
  let ProfilerContext;
  let ProfilerContextController;
  let StoreContext;
  let TreeContextController;
  let TreeDispatcherContext;
  let TreeStateContext;

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
    TestRenderer = utils.requireTestRenderer();

    BridgeContext =
      require('react-devtools-shared/src/devtools/views/context').BridgeContext;
    ProfilerContext =
      require('react-devtools-shared/src/devtools/views/Profiler/ProfilerContext').ProfilerContext;
    ProfilerContextController =
      require('react-devtools-shared/src/devtools/views/Profiler/ProfilerContext').ProfilerContextController;
    StoreContext =
      require('react-devtools-shared/src/devtools/views/context').StoreContext;
    TreeContextController =
      require('react-devtools-shared/src/devtools/views/Components/TreeContext').TreeContextController;
    TreeDispatcherContext =
      require('react-devtools-shared/src/devtools/views/Components/TreeContext').TreeDispatcherContext;
    TreeStateContext =
      require('react-devtools-shared/src/devtools/views/Components/TreeContext').TreeStateContext;
  });

  const {render} = getVersionedRenderImplementation();

  const Contexts = ({
    children = null,
    defaultInspectedElementID = null,
    defaultInspectedElementIndex = null,
  }: any) => (
    <BridgeContext.Provider value={bridge}>
      <StoreContext.Provider value={store}>
        <TreeContextController
          defaultInspectedElementID={defaultInspectedElementID}
          defaultInspectedElementIndex={defaultInspectedElementIndex}>
          <ProfilerContextController>{children}</ProfilerContextController>
        </TreeContextController>
      </StoreContext.Provider>
    </BridgeContext.Provider>
  );

  // @reactVersion <= 18.2
  // @reactVersion >= 18.0
  it('updates updates profiling support based on the attached roots (legacy render)', async () => {
    const Component = () => null;

    let context: Context = ((null: any): Context);

    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }
    await utils.actAsync(() => {
      TestRenderer.create(
        <Contexts>
          <ContextReader />
        </Contexts>,
      );
    });

    expect(context.supportsProfiling).toBe(false);

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    await utils.actAsync(() => legacyRender(<Component />, containerA));
    expect(context.supportsProfiling).toBe(true);

    await utils.actAsync(() => legacyRender(<Component />, containerB));
    await utils.actAsync(() => ReactDOM.unmountComponentAtNode(containerA));
    expect(context.supportsProfiling).toBe(true);

    await utils.actAsync(() => ReactDOM.unmountComponentAtNode(containerB));
    expect(context.supportsProfiling).toBe(false);
  });

  // @reactVersion >= 18
  it('updates updates profiling support based on the attached roots (createRoot)', async () => {
    const Component = () => null;

    let context: Context = ((null: any): Context);

    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }
    await utils.actAsync(() => {
      TestRenderer.create(
        <Contexts>
          <ContextReader />
        </Contexts>,
      );
    });

    expect(context.supportsProfiling).toBe(false);

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    const rootA = ReactDOMClient.createRoot(containerA);
    const rootB = ReactDOMClient.createRoot(containerB);

    await utils.actAsync(() => rootA.render(<Component />));
    expect(context.supportsProfiling).toBe(true);

    await utils.actAsync(() => rootB.render(<Component />));
    await utils.actAsync(() => rootA.unmount());
    expect(context.supportsProfiling).toBe(true);

    await utils.actAsync(() => rootB.unmount());
    expect(context.supportsProfiling).toBe(false);
  });

  it('should gracefully handle an empty profiling session (with no recorded commits)', async () => {
    const Example = () => null;

    utils.act(() => render(<Example />));

    let context: Context = ((null: any): Context);

    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    // Profile but don't record any updates.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => {
      TestRenderer.create(
        <Contexts>
          <ContextReader />
        </Contexts>,
      );
    });
    expect(context).not.toBeNull();
    expect(context.didRecordCommits).toBe(false);
    expect(context.isProcessingData).toBe(false);
    expect(context.isProfiling).toBe(true);
    expect(context.profilingData).toBe(null);
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    expect(context).not.toBeNull();
    expect(context.didRecordCommits).toBe(false);
    expect(context.isProcessingData).toBe(false);
    expect(context.isProfiling).toBe(false);
    expect(context.profilingData).toBe(null);
  });

  // @reactVersion <= 18.2
  // @reactVersion >= 18.0
  it('should auto-select the root ID matching the Components tab selection if it has profiling data (legacy render)', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const containerOne = document.createElement('div');
    const containerTwo = document.createElement('div');
    utils.act(() => legacyRender(<Parent />, containerOne));
    utils.act(() => legacyRender(<Parent />, containerTwo));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child>
      [root]
        ▾ <Parent>
            <Child>
    `);

    // Profile and record updates to both roots.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => legacyRender(<Parent />, containerOne));
    await utils.actAsync(() => legacyRender(<Parent />, containerTwo));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    let context: Context = ((null: any): Context);
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    // Select an element within the second root.
    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts
          defaultInspectedElementID={store.getElementIDAtIndex(3)}
          defaultInspectedElementIndex={3}>
          <ContextReader />
        </Contexts>,
      ),
    );

    expect(context).not.toBeNull();
    expect(context.rootID).toBe(
      store.getRootIDForElement(((store.getElementIDAtIndex(3): any): number)),
    );
  });

  // @reactVersion >= 18
  it('should auto-select the root ID matching the Components tab selection if it has profiling data (createRoot)', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const containerOne = document.createElement('div');
    const containerTwo = document.createElement('div');

    const rootOne = ReactDOMClient.createRoot(containerOne);
    const rootTwo = ReactDOMClient.createRoot(containerTwo);

    utils.act(() => rootOne.render(<Parent />));
    utils.act(() => rootTwo.render(<Parent />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child>
      [root]
        ▾ <Parent>
            <Child>
    `);

    // Profile and record updates to both roots.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => rootOne.render(<Parent />));
    await utils.actAsync(() => rootTwo.render(<Parent />));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    let context: Context = ((null: any): Context);
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    // Select an element within the second root.
    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts
          defaultInspectedElementID={store.getElementIDAtIndex(3)}
          defaultInspectedElementIndex={3}>
          <ContextReader />
        </Contexts>,
      ),
    );

    expect(context).not.toBeNull();
    expect(context.rootID).toBe(
      store.getRootIDForElement(((store.getElementIDAtIndex(3): any): number)),
    );
  });

  // @reactVersion <= 18.2
  // @reactVersion >= 18.0
  it('should not select the root ID matching the Components tab selection if it has no profiling data (legacy render)', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const containerOne = document.createElement('div');
    const containerTwo = document.createElement('div');
    utils.act(() => legacyRender(<Parent />, containerOne));
    utils.act(() => legacyRender(<Parent />, containerTwo));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child>
      [root]
        ▾ <Parent>
            <Child>
    `);

    // Profile and record updates to only the first root.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => legacyRender(<Parent />, containerOne));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    let context: Context = ((null: any): Context);
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    // Select an element within the second root.
    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts
          defaultInspectedElementID={store.getElementIDAtIndex(3)}
          defaultInspectedElementIndex={3}>
          <ContextReader />
        </Contexts>,
      ),
    );

    // Verify the default profiling root is the first one.
    expect(context).not.toBeNull();
    expect(context.rootID).toBe(
      store.getRootIDForElement(((store.getElementIDAtIndex(0): any): number)),
    );
  });

  // @reactVersion >= 18
  it('should not select the root ID matching the Components tab selection if it has no profiling data (createRoot)', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const containerOne = document.createElement('div');
    const containerTwo = document.createElement('div');

    const rootOne = ReactDOMClient.createRoot(containerOne);
    const rootTwo = ReactDOMClient.createRoot(containerTwo);

    utils.act(() => rootOne.render(<Parent />));
    utils.act(() => rootTwo.render(<Parent />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child>
      [root]
        ▾ <Parent>
            <Child>
    `);

    // Profile and record updates to only the first root.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => rootOne.render(<Parent />));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    let context: Context = ((null: any): Context);
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    // Select an element within the second root.
    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts
          defaultInspectedElementID={store.getElementIDAtIndex(3)}
          defaultInspectedElementIndex={3}>
          <ContextReader />
        </Contexts>,
      ),
    );

    // Verify the default profiling root is the first one.
    expect(context).not.toBeNull();
    expect(context.rootID).toBe(
      store.getRootIDForElement(((store.getElementIDAtIndex(0): any): number)),
    );
  });

  // @reactVersion <= 18.2
  // @reactVersion >= 18.0
  it('should maintain root selection between profiling sessions so long as there is data for that root (legacy render)', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    utils.act(() => legacyRender(<Parent />, containerA));
    utils.act(() => legacyRender(<Parent />, containerB));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child>
      [root]
        ▾ <Parent>
            <Child>
    `);

    // Profile and record updates.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => legacyRender(<Parent />, containerA));
    await utils.actAsync(() => legacyRender(<Parent />, containerB));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    let context: Context = ((null: any): Context);
    let dispatch: DispatcherContext = ((null: any): DispatcherContext);
    let inspectedElementID = null;
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      dispatch = React.useContext(TreeDispatcherContext);
      inspectedElementID =
        React.useContext(TreeStateContext).inspectedElementID;
      return null;
    }

    const id = ((store.getElementIDAtIndex(3): any): number);

    // Select an element within the second root.
    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts
          defaultInspectedElementID={id}
          defaultInspectedElementIndex={3}>
          <ContextReader />
        </Contexts>,
      ),
    );

    expect(inspectedElementID).toBe(id);

    // Profile and record more updates to both roots
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => legacyRender(<Parent />, containerA));
    await utils.actAsync(() => legacyRender(<Parent />, containerB));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    const otherID = ((store.getElementIDAtIndex(0): any): number);

    // Change the selected element within a the Components tab.
    utils.act(() => dispatch({type: 'SELECT_ELEMENT_AT_INDEX', payload: 0}));

    // Verify that the initial Profiler root selection is maintained.
    expect(inspectedElementID).toBe(otherID);
    expect(context).not.toBeNull();
    expect(context.rootID).toBe(store.getRootIDForElement(id));
  });

  // @reactVersion >= 18.0
  it('should maintain root selection between profiling sessions so long as there is data for that root (createRoot)', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    const rootA = ReactDOMClient.createRoot(containerA);
    const rootB = ReactDOMClient.createRoot(containerB);

    utils.act(() => rootA.render(<Parent />));
    utils.act(() => rootB.render(<Parent />));

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Parent>
            <Child>
      [root]
        ▾ <Parent>
            <Child>
    `);

    // Profile and record updates.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => rootA.render(<Parent />));
    await utils.actAsync(() => rootB.render(<Parent />));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    let context: Context = ((null: any): Context);
    let dispatch: DispatcherContext = ((null: any): DispatcherContext);
    let inspectedElementID = null;
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      dispatch = React.useContext(TreeDispatcherContext);
      inspectedElementID =
        React.useContext(TreeStateContext).inspectedElementID;
      return null;
    }

    const id = ((store.getElementIDAtIndex(3): any): number);

    // Select an element within the second root.
    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts
          defaultInspectedElementID={id}
          defaultInspectedElementIndex={3}>
          <ContextReader />
        </Contexts>,
      ),
    );

    expect(inspectedElementID).toBe(id);

    // Profile and record more updates to both roots
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => rootA.render(<Parent />));
    await utils.actAsync(() => rootB.render(<Parent />));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    const otherID = ((store.getElementIDAtIndex(0): any): number);

    // Change the selected element within a the Components tab.
    utils.act(() => dispatch({type: 'SELECT_ELEMENT_AT_INDEX', payload: 0}));

    // Verify that the initial Profiler root selection is maintained.
    expect(inspectedElementID).toBe(otherID);
    expect(context).not.toBeNull();
    expect(context.rootID).toBe(store.getRootIDForElement(id));
  });

  it('should sync selected element in the Components tab too, provided the element is a match', async () => {
    const GrandParent = ({includeChild}) => (
      <Parent includeChild={includeChild} />
    );
    const Parent = ({includeChild}) => (includeChild ? <Child /> : null);
    const Child = () => null;

    utils.act(() => render(<GrandParent includeChild={true} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <GrandParent>
          ▾ <Parent>
              <Child>
    `);

    const parentID = ((store.getElementIDAtIndex(1): any): number);
    const childID = ((store.getElementIDAtIndex(2): any): number);

    // Profile and record updates.
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => render(<GrandParent includeChild={true} />));
    await utils.actAsync(() => render(<GrandParent includeChild={false} />));
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <GrandParent>
            <Parent>
    `);

    let context: Context = ((null: any): Context);
    let inspectedElementID = null;
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      inspectedElementID =
        React.useContext(TreeStateContext).inspectedElementID;
      return null;
    }

    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts>
          <ContextReader />
        </Contexts>,
      ),
    );
    expect(inspectedElementID).toBeNull();

    // Select an element in the Profiler tab and verify that the selection is synced to the Components tab.
    await utils.actAsync(() => context.selectFiber(parentID, 'Parent'));
    expect(inspectedElementID).toBe(parentID);

    // Select an unmounted element and verify no Components tab selection doesn't change.
    await utils.actAsync(() => context.selectFiber(childID, 'Child'));
    expect(inspectedElementID).toBe(parentID);
  });

  it('should toggle profiling when the keyboard shortcut is pressed', async () => {
    // Context providers
    const Profiler =
      require('react-devtools-shared/src/devtools/views/Profiler/Profiler').default;
    const {
      TimelineContextController,
    } = require('react-devtools-timeline/src/TimelineContext');
    const {
      SettingsContextController,
    } = require('react-devtools-shared/src/devtools/views/Settings/SettingsContext');
    const {
      ModalDialogContextController,
    } = require('react-devtools-shared/src/devtools/views/ModalDialog');

    // Dom component for profiling to be enabled
    const Component = () => null;
    utils.act(() => render(<Component />));

    const profilerContainer = document.createElement('div');
    document.body.appendChild(profilerContainer);

    // Create a root for the profiler
    const profilerRoot = ReactDOMClient.createRoot(profilerContainer);

    // Render the profiler
    utils.act(() => {
      profilerRoot.render(
        <Contexts>
          <SettingsContextController browserTheme="light">
            <ModalDialogContextController>
              <TimelineContextController>
                <Profiler />
              </TimelineContextController>
            </ModalDialogContextController>
          </SettingsContextController>
        </Contexts>,
      );
    });

    // Verify that the profiler is not profiling.
    expect(store.profilerStore.isProfilingBasedOnUserInput).toBe(false);

    // Trigger the keyboard shortcut.
    const ownerWindow = profilerContainer.ownerDocument.defaultView;
    const isMac =
      typeof navigator !== 'undefined' &&
      navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const keyEvent = new KeyboardEvent('keydown', {
      key: 'e',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });

    // Dispatch keyboard event to toggle profiling on
    // Try utils.actAsync with recursivelyFlush=false
    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(keyEvent);
    }, false);
    expect(store.profilerStore.isProfilingBasedOnUserInput).toBe(true);

    // Dispatch keyboard event to toggle profiling off
    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(keyEvent);
    }, false);
    expect(store.profilerStore.isProfilingBasedOnUserInput).toBe(false);

    document.body.removeChild(profilerContainer);
  }, 20000);

  it('should navigate between commits when the keyboard shortcut is pressed', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    utils.act(() => root.render(<Parent />));

    // Profile and record multiple commits
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => root.render(<Parent />)); // Commit 1
    await utils.actAsync(() => root.render(<Parent />)); // Commit 2
    await utils.actAsync(() => root.render(<Parent />)); // Commit 3
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    const Profiler =
      require('react-devtools-shared/src/devtools/views/Profiler/Profiler').default;
    const {
      TimelineContextController,
    } = require('react-devtools-timeline/src/TimelineContext');
    const {
      SettingsContextController,
    } = require('react-devtools-shared/src/devtools/views/Settings/SettingsContext');
    const {
      ModalDialogContextController,
    } = require('react-devtools-shared/src/devtools/views/ModalDialog');

    let context: Context = ((null: any): Context);
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    const profilerContainer = document.createElement('div');
    document.body.appendChild(profilerContainer);

    const profilerRoot = ReactDOMClient.createRoot(profilerContainer);

    await utils.actAsync(() => {
      profilerRoot.render(
        <Contexts>
          <SettingsContextController browserTheme="light">
            <ModalDialogContextController>
              <TimelineContextController>
                <Profiler />
                <ContextReader />
              </TimelineContextController>
            </ModalDialogContextController>
          </SettingsContextController>
        </Contexts>,
      );
    });

    // Verify we have profiling data with 3 commits
    expect(context.didRecordCommits).toBe(true);
    expect(context.profilingData).not.toBeNull();
    const rootID = context.rootID;
    expect(rootID).not.toBeNull();
    const dataForRoot = context.profilingData.dataForRoots.get(rootID);
    expect(dataForRoot.commitData.length).toBe(3);
    // Should start at the first commit
    expect(context.selectedCommitIndex).toBe(0);

    const ownerWindow = profilerContainer.ownerDocument.defaultView;
    const isMac =
      typeof navigator !== 'undefined' &&
      navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    // Test ArrowRight navigation (forward) with correct modifier
    const arrowRightEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowRightEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(1);

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowRightEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(2);

    // Test wrap-around (last -> first)
    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowRightEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(0);

    // Test ArrowLeft navigation (backward) with correct modifier
    const arrowLeftEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowLeftEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(2);

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowLeftEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(1);

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowLeftEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(0);

    // Cleanup
    await utils.actAsync(() => profilerRoot.unmount());
    document.body.removeChild(profilerContainer);
  });

  it('should reset commit index when switching to a different root', async () => {
    const Parent = () => <Child />;
    const Child = () => null;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    const rootA = ReactDOMClient.createRoot(containerA);
    const rootB = ReactDOMClient.createRoot(containerB);

    utils.act(() => rootA.render(<Parent />));
    utils.act(() => rootB.render(<Parent />));

    // Profile and record different numbers of commits for each root
    // Root A: 5 commits, Root B: 2 commits
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => rootA.render(<Parent />)); // Root A commit 1
    await utils.actAsync(() => rootA.render(<Parent />)); // Root A commit 2
    await utils.actAsync(() => rootA.render(<Parent />)); // Root A commit 3
    await utils.actAsync(() => rootA.render(<Parent />)); // Root A commit 4
    await utils.actAsync(() => rootA.render(<Parent />)); // Root A commit 5
    await utils.actAsync(() => rootB.render(<Parent />)); // Root B commit 1
    await utils.actAsync(() => rootB.render(<Parent />)); // Root B commit 2
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    let context: Context = ((null: any): Context);
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    await utils.actAsync(() =>
      TestRenderer.create(
        <Contexts>
          <ContextReader />
        </Contexts>,
      ),
    );

    // Verify we have profiling data for both roots
    expect(context.didRecordCommits).toBe(true);
    expect(context.profilingData).not.toBeNull();

    const rootIDs = Array.from(context.profilingData.dataForRoots.keys());
    expect(rootIDs.length).toBe(2);

    const [rootAID, rootBID] = rootIDs;
    const rootAData = context.profilingData.dataForRoots.get(rootAID);
    const rootBData = context.profilingData.dataForRoots.get(rootBID);

    expect(rootAData.commitData.length).toBe(5);
    expect(rootBData.commitData.length).toBe(2);

    // Select root A and navigate to commit 4 (index 3)
    await utils.actAsync(() => context.setRootID(rootAID));
    expect(context.rootID).toBe(rootAID);
    expect(context.selectedCommitIndex).toBe(0);

    await utils.actAsync(() => context.selectCommitIndex(3));
    expect(context.selectedCommitIndex).toBe(3);

    // Switch to root B which only has 2 commits
    // The commit index should be reset to 0, not stay at 3 (which would be invalid)
    await utils.actAsync(() => context.setRootID(rootBID));
    expect(context.rootID).toBe(rootBID);
    // Should be reset to 0 since commit 3 doesn't exist in root B
    expect(context.selectedCommitIndex).toBe(0);

    // Verify we can still navigate in root B
    await utils.actAsync(() => context.selectCommitIndex(1));
    expect(context.selectedCommitIndex).toBe(1);

    // Switch back to root A - should reset to 0
    await utils.actAsync(() => context.setRootID(rootAID));
    expect(context.rootID).toBe(rootAID);
    expect(context.selectedCommitIndex).toBe(0);
  });

  it('should handle commit selection edge cases when filtering commits', async () => {
    const Scheduler = require('scheduler');

    // Create components that do varying amounts of work to generate different commit durations
    const Parent = ({count}) => {
      Scheduler.unstable_advanceTime(10);
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push(<Child key={i} duration={i} />);
      }
      return <div>{items}</div>;
    };
    const Child = ({duration}) => {
      Scheduler.unstable_advanceTime(duration);
      return <span>{duration}</span>;
    };

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    utils.act(() => root.render(<Parent count={1} />));

    // Profile and record multiple commits with different amounts of work
    await utils.actAsync(() => store.profilerStore.startProfiling());
    await utils.actAsync(() => root.render(<Parent count={5} />)); // Commit 1 - 20ms
    await utils.actAsync(() => root.render(<Parent count={20} />)); // Commit 2 - 200ms
    await utils.actAsync(() => root.render(<Parent count={50} />)); // Commit 3 - 1235ms
    await utils.actAsync(() => root.render(<Parent count={10} />)); // Commit 4 - 55ms
    await utils.actAsync(() => store.profilerStore.stopProfiling());

    // Context providers
    const Profiler =
      require('react-devtools-shared/src/devtools/views/Profiler/Profiler').default;
    const {
      TimelineContextController,
    } = require('react-devtools-timeline/src/TimelineContext');
    const {
      SettingsContextController,
    } = require('react-devtools-shared/src/devtools/views/Settings/SettingsContext');
    const {
      ModalDialogContextController,
    } = require('react-devtools-shared/src/devtools/views/ModalDialog');

    let context: Context = ((null: any): Context);
    function ContextReader() {
      context = React.useContext(ProfilerContext);
      return null;
    }

    const profilerContainer = document.createElement('div');
    document.body.appendChild(profilerContainer);

    const profilerRoot = ReactDOMClient.createRoot(profilerContainer);

    await utils.actAsync(() => {
      profilerRoot.render(
        <Contexts>
          <SettingsContextController browserTheme="light">
            <ModalDialogContextController>
              <TimelineContextController>
                <Profiler />
                <ContextReader />
              </TimelineContextController>
            </ModalDialogContextController>
          </SettingsContextController>
        </Contexts>,
      );
    });

    // Verify we have profiling data with 4 commits
    expect(context.didRecordCommits).toBe(true);
    expect(context.profilingData).not.toBeNull();
    const rootID = context.rootID;
    expect(rootID).not.toBeNull();
    const dataForRoot = context.profilingData.dataForRoots.get(rootID);
    expect(dataForRoot.commitData.length).toBe(4);
    // Edge case 1: Should start at the first commit
    expect(context.selectedCommitIndex).toBe(0);

    const ownerWindow = profilerContainer.ownerDocument.defaultView;
    const isMac =
      typeof navigator !== 'undefined' &&
      navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const arrowRightEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowRightEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(1);

    await utils.actAsync(() => {
      context.setIsCommitFilterEnabled(true);
    });

    // Edge case 2:  When filtering is enabled, selected commit should remain if it's still visible
    expect(context.filteredCommitIndices.length).toBe(4);
    expect(context.selectedCommitIndex).toBe(1);
    expect(context.selectedFilteredCommitIndex).toBe(1);

    await utils.actAsync(() => {
      context.setMinCommitDuration(1000000);
    });

    // Edge case 3: When all commits are filtered out, selection should be null
    expect(context.filteredCommitIndices).toEqual([]);
    expect(context.selectedCommitIndex).toBe(null);
    expect(context.selectedFilteredCommitIndex).toBe(null);

    await utils.actAsync(() => {
      context.setMinCommitDuration(0);
    });

    // Edge case 4: After restoring commits, first commit should be auto-selected
    expect(context.filteredCommitIndices.length).toBe(4);
    expect(context.selectedCommitIndex).toBe(0);
    expect(context.selectedFilteredCommitIndex).toBe(0);

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowRightEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(1);

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowRightEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(2);

    await utils.actAsync(() => {
      ownerWindow.dispatchEvent(arrowRightEvent);
    }, false);
    expect(context.selectedCommitIndex).toBe(3);

    // Filter out the currently selected commit using actual commit data
    const commitDurations = dataForRoot.commitData.map(
      commit => commit.duration,
    );
    const selectedCommitDuration = commitDurations[3];
    const filterThreshold = selectedCommitDuration + 0.001;
    await utils.actAsync(() => {
      context.setMinCommitDuration(filterThreshold);
    });

    // Edge case 5: Should auto-select first available commit when current one is filtered
    expect(context.selectedCommitIndex).not.toBe(null);
    expect(context.selectedFilteredCommitIndex).toBe(1);

    await utils.actAsync(() => {
      context.setIsCommitFilterEnabled(false);
    });

    // Edge case 6: When filtering is disabled, selected commit should remain
    expect(context.filteredCommitIndices.length).toBe(4);
    expect(context.selectedCommitIndex).toBe(2);
    expect(context.selectedFilteredCommitIndex).toBe(2);

    await utils.actAsync(() => profilerRoot.unmount());
    document.body.removeChild(profilerContainer);
  });
});

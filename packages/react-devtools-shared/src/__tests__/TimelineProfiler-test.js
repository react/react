/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import {
  getLegacyRenderImplementation,
  getModernRenderImplementation,
  normalizeCodeLocInfo,
} from './utils';

let React = require('react');
let Scheduler;
let store;
let utils;

// This flag is on experimental which disables timeline profiler.
const enableComponentPerformanceTrack =
  React.version.startsWith('19') && React.version.includes('experimental');

describe('Timeline profiler', () => {
  if (enableComponentPerformanceTrack) {
    test('no tests', () => {});
    // Ignore all tests.
    return;
  }

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    React = require('react');
    Scheduler = require('scheduler');

    store = global.store;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('User Timing API', () => {
    let currentlyNotClearedMarks;
    let registeredMarks;
    let featureDetectionMarkName = null;
    let setPerformanceMock;

    function createUserTimingPolyfill() {
      featureDetectionMarkName = null;

      currentlyNotClearedMarks = [];
      registeredMarks = [];

      // Remove file-system specific bits or version-specific bits of information from the module range marks.
      function filterMarkData(markName) {
        if (markName.startsWith('--react-internal-module-start')) {
          return '--react-internal-module-start-  at filtered (<anonymous>:0:0)';
        } else if (markName.startsWith('--react-internal-module-stop')) {
          return '--react-internal-module-stop-  at filtered (<anonymous>:1:1)';
        } else if (markName.startsWith('--react-version')) {
          return '--react-version-<filtered-version>';
        } else {
          return markName;
        }
      }

      // This is not a true polyfill, but it gives us enough to capture marks.
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API
      return {
        clearMarks(markName) {
          markName = filterMarkData(markName);

          currentlyNotClearedMarks = currentlyNotClearedMarks.filter(
            mark => mark !== markName,
          );
        },
        mark(markName, markOptions) {
          markName = filterMarkData(markName);

          if (featureDetectionMarkName === null) {
            featureDetectionMarkName = markName;
          }

          registeredMarks.push(markName);
          currentlyNotClearedMarks.push(markName);

          if (markOptions != null) {
            // This is triggers the feature detection.
            markOptions.startTime++;
          }
        },
      };
    }

    function eraseRegisteredMarks() {
      registeredMarks.splice(0);
    }

    function dispatchAndSetCurrentEvent(element, event) {
      try {
        window.event = event;
        element.dispatchEvent(event);
      } finally {
        window.event = undefined;
      }
    }

    beforeEach(() => {
      setPerformanceMock =
        require('react-devtools-shared/src/backend/profilingHooks').setPerformanceMock_ONLY_FOR_TESTING;
      setPerformanceMock(createUserTimingPolyfill());
    });

    afterEach(() => {
      // Verify all logged marks also get cleared.
      expect(currentlyNotClearedMarks).toHaveLength(0);

      setPerformanceMock(null);
    });

    describe('with legacy render', () => {
      const {render: legacyRender} = getLegacyRenderImplementation();

      // @reactVersion <= 18.2
      // @reactVersion >= 18.0
      it('should mark sync render without suspends or state updates', () => {
        utils.act(() => store.profilerStore.startProfiling());
        legacyRender(<div />);
        utils.act(() => store.profilerStore.stopProfiling());

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--schedule-render-1",
            "--render-start-1",
            "--render-stop",
            "--commit-start-1",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen",
            "--layout-effects-start-1",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);
      });

      // TODO(hoxyq): investigate why running this test with React 18 fails
      // @reactVersion <= 18.2
      // @reactVersion >= 18.0
      // eslint-disable-next-line jest/no-disabled-tests
      it.skip('should mark sync render with suspense that resolves', async () => {
        const fakeSuspensePromise = Promise.resolve(true);
        function Example() {
          throw fakeSuspensePromise;
        }

        legacyRender(
          <React.Suspense fallback={null}>
            <Example />
          </React.Suspense>,
        );

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-2",
                    "--render-start-2",
                    "--component-render-start-Example",
                    "--component-render-stop",
                    "--suspense-suspend-0-Example-mount-2-",
                    "--render-stop",
                    "--commit-start-2",
                    "--react-version-<filtered-version>",
                    "--profiler-version-1",
                    "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
                    "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
                    "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
                    "--layout-effects-start-2",
                    "--layout-effects-stop",
                    "--commit-stop",
                  ]
              `);

        eraseRegisteredMarks();

        await fakeSuspensePromise;
        expect(registeredMarks).toMatchInlineSnapshot(`
                [
                  "--suspense-resolved-0-Example",
                ]
          `);
      });

      // TODO(hoxyq): investigate why running this test with React 18 fails
      // @reactVersion <= 18.2
      // @reactVersion >= 18.0
      // eslint-disable-next-line jest/no-disabled-tests
      it.skip('should mark sync render with suspense that rejects', async () => {
        const fakeSuspensePromise = Promise.reject(new Error('error'));
        function Example() {
          throw fakeSuspensePromise;
        }

        legacyRender(
          <React.Suspense fallback={null}>
            <Example />
          </React.Suspense>,
        );

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-2",
                    "--render-start-2",
                    "--component-render-start-Example",
                    "--component-render-stop",
                    "--suspense-suspend-0-Example-mount-2-",
                    "--render-stop",
                    "--commit-start-2",
                    "--react-version-<filtered-version>",
                    "--profiler-version-1",
                    "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
                    "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
                    "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
                    "--layout-effects-start-2",
                    "--layout-effects-stop",
                    "--commit-stop",
                  ]
              `);

        eraseRegisteredMarks();

        await expect(fakeSuspensePromise).rejects.toThrow();
        expect(registeredMarks).toContain(`--suspense-rejected-0-Example`);
      });

      // @reactVersion <= 18.2
      // @reactVersion >= 18.0
      it('should mark sync render that throws', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        class ErrorBoundary extends React.Component {
          state = {error: null};
          componentDidCatch(error) {
            this.setState({error});
          }
          render() {
            if (this.state.error) {
              return null;
            }
            return this.props.children;
          }
        }

        function ExampleThatThrows() {
          throw Error('Expected error');
        }

        utils.act(() => store.profilerStore.startProfiling());
        legacyRender(
          <ErrorBoundary>
            <ExampleThatThrows />
          </ErrorBoundary>,
        );
        utils.act(() => store.profilerStore.stopProfiling());

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--schedule-render-1",
            "--render-start-1",
            "--component-render-start-ErrorBoundary",
            "--component-render-stop",
            "--component-render-start-ExampleThatThrows",
            "--component-render-start-ExampleThatThrows",
            "--component-render-stop",
            "--error-ExampleThatThrows-mount-Expected error",
            "--render-stop",
            "--commit-start-1",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen",
            "--layout-effects-start-1",
            "--schedule-state-update-1-ErrorBoundary",
            "--layout-effects-stop",
            "--commit-stop",
            "--render-start-1",
            "--component-render-start-ErrorBoundary",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-1",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen",
            "--commit-stop",
          ]
        `);
      });
    });

    describe('with createRoot', () => {
      let waitFor;
      let waitForAll;
      let waitForPaint;
      let assertLog;

      beforeEach(() => {
        const InternalTestUtils = require('internal-test-utils');
        waitFor = InternalTestUtils.waitFor;
        waitForAll = InternalTestUtils.waitForAll;
        waitForPaint = InternalTestUtils.waitForPaint;
        assertLog = InternalTestUtils.assertLog;
      });

      const {render: modernRender} = getModernRenderImplementation();

      it('should mark concurrent render without suspends or state updates', async () => {
        modernRender(<div />);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForPaint([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark render yields', async () => {
        function Bar() {
          Scheduler.log('Bar');
          return null;
        }

        function Foo() {
          Scheduler.log('Foo');
          return <Bar />;
        }

        React.startTransition(() => {
          modernRender(<Foo />);
        });

        await waitFor(['Foo']);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-128",
                    "--render-start-128",
                    "--component-render-start-Foo",
                    "--component-render-stop",
                    "--render-yield",
                  ]
              `);
      });

      it('should mark concurrent render with suspense that resolves', async () => {
        let resolveFakePromise;
        const fakeSuspensePromise = new Promise(
          resolve => (resolveFakePromise = resolve),
        );

        function Example() {
          throw fakeSuspensePromise;
        }

        modernRender(
          <React.Suspense fallback={null}>
            <Example />
          </React.Suspense>,
        );

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForPaint([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-Example",
            "--component-render-stop",
            "--suspense-suspend-0-Example-mount-32-",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);

        eraseRegisteredMarks();

        await resolveFakePromise();
        expect(registeredMarks).toMatchInlineSnapshot(`
            [
              "--suspense-resolved-0-Example",
            ]
        `);
      });

      it('should mark concurrent render with suspense that rejects', async () => {
        let rejectFakePromise;
        const fakeSuspensePromise = new Promise(
          (_, reject) => (rejectFakePromise = reject),
        );

        function Example() {
          throw fakeSuspensePromise;
        }

        modernRender(
          <React.Suspense fallback={null}>
            <Example />
          </React.Suspense>,
        );

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForPaint([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-Example",
            "--component-render-stop",
            "--suspense-suspend-0-Example-mount-32-",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);

        eraseRegisteredMarks();

        await expect(() => {
          rejectFakePromise(new Error('error'));
          return fakeSuspensePromise;
        }).rejects.toThrow();
        expect(registeredMarks).toMatchInlineSnapshot(`
                [
                  "--suspense-rejected-0-Example",
                ]
          `);
      });

      it('should mark cascading class component state updates', async () => {
        class Example extends React.Component {
          state = {didMount: false};
          componentDidMount() {
            this.setState({didMount: true});
          }
          render() {
            return null;
          }
        }

        modernRender(<Example />);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForPaint([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--schedule-state-update-2-Example",
            "--layout-effects-stop",
            "--render-start-2",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-2",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--commit-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark cascading class component force updates', async () => {
        class Example extends React.Component {
          componentDidMount() {
            this.forceUpdate();
          }
          render() {
            return null;
          }
        }

        modernRender(<Example />);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForPaint([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--schedule-forced-update-2-Example",
            "--layout-effects-stop",
            "--render-start-2",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-2",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--commit-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark render phase state updates for class component', async () => {
        class Example extends React.Component {
          state = {didRender: false};
          render() {
            if (this.state.didRender === false) {
              this.setState({didRender: true});
            }
            return null;
          }
        }

        modernRender(<Example />);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        let errorMessage;
        jest.spyOn(console, 'error').mockImplementation(message => {
          errorMessage = message;
        });

        await waitForPaint([]);

        expect(console.error).toHaveBeenCalledTimes(1);
        expect(errorMessage).toContain(
          'Cannot update during an existing state transition',
        );

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-Example",
            "--schedule-state-update-32-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark render phase force updates for class component', async () => {
        let forced = false;
        class Example extends React.Component {
          render() {
            if (!forced) {
              forced = true;
              this.forceUpdate();
            }
            return null;
          }
        }

        modernRender(<Example />);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        let errorMessage;
        jest.spyOn(console, 'error').mockImplementation(message => {
          errorMessage = message;
        });

        await waitForPaint([]);

        expect(console.error).toHaveBeenCalledTimes(1);
        expect(errorMessage).toContain(
          'Cannot update during an existing state transition',
        );

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-Example",
            "--schedule-forced-update-32-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark cascading layout updates', async () => {
        function Example() {
          const [didMount, setDidMount] = React.useState(false);
          React.useLayoutEffect(() => {
            setDidMount(true);
          }, []);
          return didMount;
        }

        modernRender(<Example />);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForPaint([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--component-layout-effect-mount-start-Example",
            "--schedule-state-update-2-Example",
            "--component-layout-effect-mount-stop",
            "--layout-effects-stop",
            "--render-start-2",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-2",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--commit-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark cascading passive updates', async () => {
        function Example() {
          const [didMount, setDidMount] = React.useState(false);
          React.useEffect(() => {
            setDidMount(true);
          }, []);
          return didMount;
        }

        modernRender(<Example />);

        await waitForAll([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--schedule-render-32",
            "--render-start-32",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--layout-effects-stop",
            "--commit-stop",
            "--passive-effects-start-32",
            "--component-passive-effect-mount-start-Example",
            "--schedule-state-update-32-Example",
            "--component-passive-effect-mount-stop",
            "--passive-effects-stop",
            "--render-start-32",
            "--component-render-start-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--commit-stop",
          ]
        `);
      });

      it('should mark render phase updates', async () => {
        function Example() {
          const [didRender, setDidRender] = React.useState(false);
          if (!didRender) {
            setDidRender(true);
          }
          return didRender;
        }

        modernRender(<Example />);

        await waitForAll([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--schedule-render-32",
            "--render-start-32",
            "--component-render-start-Example",
            "--schedule-state-update-32-Example",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark concurrent render that throws', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        class ErrorBoundary extends React.Component {
          state = {error: null};
          componentDidCatch(error) {
            this.setState({error});
          }
          render() {
            if (this.state.error) {
              return null;
            }
            return this.props.children;
          }
        }

        function ExampleThatThrows() {
          // eslint-disable-next-line no-throw-literal
          throw 'Expected error';
        }

        modernRender(
          <ErrorBoundary>
            <ExampleThatThrows />
          </ErrorBoundary>,
        );

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--schedule-render-32",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForPaint([]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--render-start-32",
            "--component-render-start-ErrorBoundary",
            "--component-render-stop",
            "--component-render-start-ExampleThatThrows",
            "--component-render-stop",
            "--error-ExampleThatThrows-mount-Expected error",
            "--render-stop",
            "--render-start-32",
            "--component-render-start-ErrorBoundary",
            "--component-render-stop",
            "--component-render-start-ExampleThatThrows",
            "--component-render-stop",
            "--error-ExampleThatThrows-mount-Expected error",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--schedule-state-update-2-ErrorBoundary",
            "--layout-effects-stop",
            "--render-start-2",
            "--component-render-start-ErrorBoundary",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-2",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--commit-stop",
            "--commit-stop",
          ]
        `);
      });

      it('should mark passive and layout effects', async () => {
        function ComponentWithEffects() {
          React.useLayoutEffect(() => {
            Scheduler.log('layout 1 mount');
            return () => {
              Scheduler.log('layout 1 unmount');
            };
          }, []);

          React.useEffect(() => {
            Scheduler.log('passive 1 mount');
            return () => {
              Scheduler.log('passive 1 unmount');
            };
          }, []);

          React.useLayoutEffect(() => {
            Scheduler.log('layout 2 mount');
            return () => {
              Scheduler.log('layout 2 unmount');
            };
          }, []);

          React.useEffect(() => {
            Scheduler.log('passive 2 mount');
            return () => {
              Scheduler.log('passive 2 unmount');
            };
          }, []);

          React.useEffect(() => {
            Scheduler.log('passive 3 mount');
            return () => {
              Scheduler.log('passive 3 unmount');
            };
          }, []);

          return null;
        }

        const unmount = modernRender(<ComponentWithEffects />);

        await waitForPaint(['layout 1 mount', 'layout 2 mount']);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--schedule-render-32",
            "--render-start-32",
            "--component-render-start-ComponentWithEffects",
            "--component-render-stop",
            "--render-stop",
            "--commit-start-32",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--layout-effects-start-32",
            "--component-layout-effect-mount-start-ComponentWithEffects",
            "--component-layout-effect-mount-stop",
            "--component-layout-effect-mount-start-ComponentWithEffects",
            "--component-layout-effect-mount-stop",
            "--layout-effects-stop",
            "--commit-stop",
          ]
        `);

        eraseRegisteredMarks();

        await waitForAll([
          'passive 1 mount',
          'passive 2 mount',
          'passive 3 mount',
        ]);

        expect(registeredMarks).toMatchInlineSnapshot(`
                  [
                    "--passive-effects-start-32",
                    "--component-passive-effect-mount-start-ComponentWithEffects",
                    "--component-passive-effect-mount-stop",
                    "--component-passive-effect-mount-start-ComponentWithEffects",
                    "--component-passive-effect-mount-stop",
                    "--component-passive-effect-mount-start-ComponentWithEffects",
                    "--component-passive-effect-mount-stop",
                    "--passive-effects-stop",
                  ]
              `);

        eraseRegisteredMarks();

        await waitForAll([]);

        unmount();

        assertLog([
          'layout 1 unmount',
          'layout 2 unmount',
          'passive 1 unmount',
          'passive 2 unmount',
          'passive 3 unmount',
        ]);

        expect(registeredMarks).toMatchInlineSnapshot(`
          [
            "--schedule-render-2",
            "--render-start-2",
            "--render-stop",
            "--commit-start-2",
            "--react-version-<filtered-version>",
            "--profiler-version-1",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
            "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
            "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
            "--component-layout-effect-unmount-start-ComponentWithEffects",
            "--component-layout-effect-unmount-stop",
            "--component-layout-effect-unmount-start-ComponentWithEffects",
            "--component-layout-effect-unmount-stop",
            "--layout-effects-start-2",
            "--layout-effects-stop",
            "--passive-effects-start-2",
            "--component-passive-effect-unmount-start-ComponentWithEffects",
            "--component-passive-effect-unmount-stop",
            "--component-passive-effect-unmount-start-ComponentWithEffects",
            "--component-passive-effect-unmount-stop",
            "--component-passive-effect-unmount-start-ComponentWithEffects",
            "--component-passive-effect-unmount-stop",
            "--passive-effects-stop",
            "--commit-stop",
          ]
        `);
      });
    });

    describe('lane labels', () => {
      describe('with legacy render', () => {
        const {render: legacyRender} = getLegacyRenderImplementation();

        // @reactVersion <= 18.2
        // @reactVersion >= 18.0
        it('regression test SyncLane', () => {
          utils.act(() => store.profilerStore.startProfiling());
          legacyRender(<div />);
          utils.act(() => store.profilerStore.stopProfiling());

          expect(registeredMarks).toMatchInlineSnapshot(`
            [
              "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
              "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
              "--schedule-render-1",
              "--render-start-1",
              "--render-stop",
              "--commit-start-1",
              "--react-version-<filtered-version>",
              "--profiler-version-1",
              "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
              "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
              "--react-lane-labels-Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen",
              "--layout-effects-start-1",
              "--layout-effects-stop",
              "--commit-stop",
            ]
          `);
        });
      });

      describe('with createRoot()', () => {
        let waitForAll;

        beforeEach(() => {
          const InternalTestUtils = require('internal-test-utils');
          waitForAll = InternalTestUtils.waitForAll;
        });

        const {render: modernRender} = getModernRenderImplementation();

        it('regression test DefaultLane', () => {
          modernRender(<div />);
          expect(registeredMarks).toMatchInlineSnapshot(`
                      [
                        "--schedule-render-32",
                      ]
                  `);
        });

        it('regression test InputDiscreteLane', async () => {
          const targetRef = React.createRef(null);

          function App() {
            const [count, setCount] = React.useState(0);
            const handleClick = () => {
              setCount(count + 1);
            };
            return <button ref={targetRef} onClick={handleClick} />;
          }

          modernRender(<App />);
          await waitForAll([]);

          eraseRegisteredMarks();

          targetRef.current.click();

          // Wait a frame, for React to process the "click" update.
          await Promise.resolve();

          expect(registeredMarks).toMatchInlineSnapshot(`
            [
              "--schedule-state-update-2-App",
              "--render-start-2",
              "--component-render-start-App",
              "--component-render-stop",
              "--render-stop",
              "--commit-start-2",
              "--react-version-<filtered-version>",
              "--profiler-version-1",
              "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
              "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
              "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
              "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
              "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
              "--layout-effects-start-2",
              "--layout-effects-stop",
              "--commit-stop",
            ]
          `);
        });

        it('regression test InputContinuousLane', async () => {
          const targetRef = React.createRef(null);

          function App() {
            const [count, setCount] = React.useState(0);
            const handleMouseOver = () => setCount(count + 1);
            return <div ref={targetRef} onMouseOver={handleMouseOver} />;
          }

          modernRender(<App />);
          await waitForAll([]);

          eraseRegisteredMarks();

          const event = document.createEvent('MouseEvents');
          event.initEvent('mouseover', true, true);
          dispatchAndSetCurrentEvent(targetRef.current, event);

          await waitForAll([]);

          expect(registeredMarks).toMatchInlineSnapshot(`
            [
              "--schedule-state-update-8-App",
              "--render-start-8",
              "--component-render-start-App",
              "--component-render-stop",
              "--render-stop",
              "--commit-start-8",
              "--react-version-<filtered-version>",
              "--profiler-version-1",
              "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
              "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
              "--react-internal-module-start-  at filtered (<anonymous>:0:0)",
              "--react-internal-module-stop-  at filtered (<anonymous>:1:1)",
              "--react-lane-labels-SyncHydrationLane,Sync,InputContinuousHydration,InputContinuous,DefaultHydration,Default,TransitionHydration,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Transition,Retry,Retry,Retry,Retry,SelectiveHydration,IdleHydration,Idle,Offscreen,Deferred",
              "--layout-effects-start-8",
              "--layout-effects-stop",
              "--commit-stop",
            ]
          `);
        });
      });
    });
  });

  describe('DevTools hook (in memory)', () => {
    let getBatchOfWork;
    let stopProfilingAndGetTimelineData;

    beforeEach(() => {
      getBatchOfWork = index => {
        const timelineData = stopProfilingAndGetTimelineData();
        if (timelineData) {
          if (timelineData.batchUIDToMeasuresMap.size > index) {
            return Array.from(timelineData.batchUIDToMeasuresMap.values())[
              index
            ];
          }
        }

        return null;
      };

      stopProfilingAndGetTimelineData = () => {
        utils.act(() => store.profilerStore.stopProfiling());

        const timelineData = store.profilerStore.profilingData?.timelineData;

        if (timelineData) {
          expect(timelineData).toHaveLength(1);

          // normalize the location for component stack source
          // for snapshot testing
          timelineData.forEach(data => {
            data.schedulingEvents.forEach(event => {
              if (event.componentStack) {
                event.componentStack = normalizeCodeLocInfo(
                  event.componentStack,
                );
              }
            });
          });

          return timelineData[0];
        } else {
          return null;
        }
      };
    });

    describe('when profiling', () => {
      describe('with legacy render', () => {
        const {render: legacyRender} = getLegacyRenderImplementation();

        beforeEach(() => {
          utils.act(() => store.profilerStore.startProfiling());
        });

        // @reactVersion <= 18.2
        // @reactVersion >= 18.0
        it('should mark sync render without suspends or state updates', () => {
          legacyRender(<div />);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000000001",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                      ]
                  `);
        });

        // @reactVersion <= 18.2
        // @reactVersion >= 18.0
        it('should mark sync render that throws', async () => {
          jest.spyOn(console, 'error').mockImplementation(() => {});

          class ErrorBoundary extends React.Component {
            state = {error: null};
            componentDidCatch(error) {
              this.setState({error});
            }
            render() {
              Scheduler.unstable_advanceTime(10);
              if (this.state.error) {
                Scheduler.unstable_yieldValue('ErrorBoundary fallback');
                return null;
              }
              Scheduler.unstable_yieldValue('ErrorBoundary render');
              return this.props.children;
            }
          }

          function ExampleThatThrows() {
            Scheduler.unstable_yieldValue('ExampleThatThrows');
            throw Error('Expected error');
          }

          legacyRender(
            <ErrorBoundary>
              <ExampleThatThrows />
            </ErrorBoundary>,
          );

          expect(Scheduler.unstable_clearYields()).toEqual([
            'ErrorBoundary render',
            'ExampleThatThrows',
            'ExampleThatThrows',
            'ErrorBoundary fallback',
          ]);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "ErrorBoundary",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "ExampleThatThrows",
                          "duration": 0,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "ErrorBoundary",
                          "duration": 10,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000000001",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "ErrorBoundary",
                          "componentStack": "
                          in ErrorBoundary (at **)",
                          "lanes": "0b0000000000000000000000000000001",
                          "timestamp": 20,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.thrownErrors).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "ExampleThatThrows",
                          "message": "Expected error",
                          "phase": "mount",
                          "timestamp": 20,
                          "type": "thrown-error",
                        },
                      ]
                  `);
        });

        // @reactVersion <= 18.2
        // @reactVersion >= 18.0
        it('should mark sync render with suspense that resolves', async () => {
          let resolveFn;
          let resolved = false;
          const suspensePromise = new Promise(resolve => {
            resolveFn = () => {
              resolved = true;
              resolve();
            };
          });

          function Example() {
            Scheduler.unstable_yieldValue(resolved ? 'resolved' : 'suspended');
            if (!resolved) {
              throw suspensePromise;
            }
            return null;
          }

          legacyRender(
            <React.Suspense fallback={null}>
              <Example />
            </React.Suspense>,
          );

          expect(Scheduler.unstable_clearYields()).toEqual(['suspended']);

          Scheduler.unstable_advanceTime(10);
          resolveFn();
          await suspensePromise;

          await Scheduler.unstable_flushAllWithoutAsserting();
          expect(Scheduler.unstable_clearYields()).toEqual(['resolved']);

          const timelineData = stopProfilingAndGetTimelineData();

          // Verify the Suspense event and duration was recorded.
          expect(timelineData.suspenseEvents).toHaveLength(1);
          const suspenseEvent = timelineData.suspenseEvents[0];
          expect(suspenseEvent).toMatchInlineSnapshot(`
            {
              "componentName": "Example",
              "depth": 0,
              "duration": 0,
              "id": "0",
              "phase": "mount",
              "promiseName": "",
              "resolution": "unresolved",
              "timestamp": 10,
              "type": "suspense",
              "warning": null,
            }
          `);

          // There should be two batches of renders: Suspeneded and resolved.
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toHaveLength(2);
        });

        // @reactVersion = 18.2
        it('should mark sync render with suspense that rejects', async () => {
          let rejectFn;
          let rejected = false;
          const suspensePromise = new Promise((resolve, reject) => {
            rejectFn = () => {
              rejected = true;
              reject(new Error('error'));
            };
          });

          function Example() {
            Scheduler.unstable_yieldValue(rejected ? 'rejected' : 'suspended');
            if (!rejected) {
              throw suspensePromise;
            }
            return null;
          }

          legacyRender(
            <React.Suspense fallback={null}>
              <Example />
            </React.Suspense>,
          );

          expect(Scheduler.unstable_clearYields()).toEqual(['suspended']);

          Scheduler.unstable_advanceTime(10);
          rejectFn();
          await expect(suspensePromise).rejects.toThrow();

          expect(Scheduler.unstable_clearYields()).toEqual(['rejected']);

          const timelineData = stopProfilingAndGetTimelineData();

          // Verify the Suspense event and duration was recorded.
          expect(timelineData.suspenseEvents).toHaveLength(1);
          const suspenseEvent = timelineData.suspenseEvents[0];
          expect(suspenseEvent).toMatchInlineSnapshot(`
            {
              "componentName": "Example",
              "depth": 0,
              "duration": 0,
              "id": "0",
              "phase": "mount",
              "promiseName": "",
              "resolution": "unresolved",
              "timestamp": 10,
              "type": "suspense",
              "warning": null,
            }
          `);

          // There should be two batches of renders: Suspeneded and resolved.
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toHaveLength(2);
        });
      });

      describe('with createRoot()', () => {
        let waitFor;
        let waitForAll;
        let waitForPaint;
        let assertLog;

        beforeEach(() => {
          const InternalTestUtils = require('internal-test-utils');
          waitFor = InternalTestUtils.waitFor;
          waitForAll = InternalTestUtils.waitForAll;
          waitForPaint = InternalTestUtils.waitForPaint;
          assertLog = InternalTestUtils.assertLog;
        });

        const {render: modernRender} = getModernRenderImplementation();

        beforeEach(() => {
          utils.act(() => store.profilerStore.startProfiling());
        });

        it('should mark concurrent render without suspends or state updates', () => {
          utils.act(() => modernRender(<div />));

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark concurrent render without suspends with state updates', () => {
          let updaterFn;

          function Example() {
            const setHigh = React.useState(0)[1];
            const setLow = React.useState(0)[1];

            updaterFn = () => {
              React.startTransition(() => {
                setLow(prevLow => prevLow + 1);
              });
              setHigh(prevHigh => prevHigh + 1);
            };

            Scheduler.unstable_advanceTime(10);

            return null;
          }

          utils.act(() => modernRender(<Example />));
          utils.act(() => store.profilerStore.stopProfiling());
          utils.act(() => store.profilerStore.startProfiling());
          utils.act(updaterFn);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "componentStack": "
                          in Example (at **)",
                          "lanes": "0b0000000000000000000000010000000",
                          "timestamp": 10,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "componentStack": "
                          in Example (at **)",
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
        });

        it('should mark render yields', async () => {
          function Bar() {
            Scheduler.log('Bar');
            return null;
          }

          function Foo() {
            Scheduler.log('Foo');
            return <Bar />;
          }

          React.startTransition(() => {
            modernRender(<Foo />);
          });

          // Do one step of work.
          await waitFor(['Foo']);

          // Finish flushing so React commits;
          // Unless we do this, the ProfilerStore won't collect Profiling data.
          await waitForAll(['Bar']);

          // Since we yielded, the batch should report two separate "render" chunks.
          const batch = getBatchOfWork(0);
          expect(batch.filter(({type}) => type === 'render')).toHaveLength(2);
        });

        it('should mark concurrent render with suspense that resolves', async () => {
          let resolveFn;
          let resolved = false;
          const suspensePromise = new Promise(resolve => {
            resolveFn = () => {
              resolved = true;
              resolve();
            };
          });

          function Example() {
            Scheduler.log(resolved ? 'resolved' : 'suspended');
            if (!resolved) {
              throw suspensePromise;
            }
            return null;
          }

          modernRender(
            <React.Suspense fallback={null}>
              <Example />
            </React.Suspense>,
          );

          await waitForAll([
            'suspended',
            // pre-warming
            'suspended',
          ]);

          Scheduler.unstable_advanceTime(10);
          resolveFn();
          await suspensePromise;

          await waitForAll(['resolved']);

          const timelineData = stopProfilingAndGetTimelineData();

          // Verify the Suspense event and duration was recorded.
          expect(timelineData.suspenseEvents).toMatchInlineSnapshot(`
              [
                {
                  "componentName": "Example",
                  "depth": 0,
                  "duration": 10,
                  "id": "0",
                  "phase": "mount",
                  "promiseName": "",
                  "resolution": "resolved",
                  "timestamp": 10,
                  "type": "suspense",
                  "warning": null,
                },
                {
                  "componentName": "Example",
                  "depth": 0,
                  "duration": 10,
                  "id": "0",
                  "phase": "mount",
                  "promiseName": "",
                  "resolution": "resolved",
                  "timestamp": 10,
                  "type": "suspense",
                  "warning": null,
                },
              ]
            `);

          // There should be two batches of renders: Suspeneded and resolved.
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          // An additional measure with pre-warming
          expect(timelineData.componentMeasures).toHaveLength(3);
        });

        it('should mark concurrent render with suspense that rejects', async () => {
          let rejectFn;
          let rejected = false;
          const suspensePromise = new Promise((resolve, reject) => {
            rejectFn = () => {
              rejected = true;
              reject(new Error('error'));
            };
          });

          function Example() {
            Scheduler.log(rejected ? 'rejected' : 'suspended');
            if (!rejected) {
              throw suspensePromise;
            }
            return null;
          }

          modernRender(
            <React.Suspense fallback={null}>
              <Example />
            </React.Suspense>,
          );

          await waitForAll(['suspended', 'suspended']);

          Scheduler.unstable_advanceTime(10);
          rejectFn();
          await expect(suspensePromise).rejects.toThrow();

          await waitForAll(['rejected']);

          const timelineData = stopProfilingAndGetTimelineData();

          // Verify the Suspense event and duration was recorded.
          expect(timelineData.suspenseEvents).toMatchInlineSnapshot(`
              [
                {
                  "componentName": "Example",
                  "depth": 0,
                  "duration": 10,
                  "id": "0",
                  "phase": "mount",
                  "promiseName": "",
                  "resolution": "rejected",
                  "timestamp": 10,
                  "type": "suspense",
                  "warning": null,
                },
                {
                  "componentName": "Example",
                  "depth": 0,
                  "duration": 10,
                  "id": "0",
                  "phase": "mount",
                  "promiseName": "",
                  "resolution": "rejected",
                  "timestamp": 10,
                  "type": "suspense",
                  "warning": null,
                },
              ]
            `);

          // There should be two batches of renders: Suspeneded and resolved.
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          // An additional measure with pre-warming
          expect(timelineData.componentMeasures).toHaveLength(3);
        });

        it('should mark cascading class component state updates', async () => {
          class Example extends React.Component {
            state = {didMount: false};
            componentDidMount() {
              this.setState({didMount: true});
            }
            render() {
              Scheduler.unstable_advanceTime(10);
              Scheduler.log(this.state.didMount ? 'update' : 'mount');
              return null;
            }
          }

          modernRender(<Example />);

          await waitForPaint(['mount', 'update']);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "componentStack": "
                          in Example (at **)",
                          "lanes": "0b0000000000000000000000000000010",
                          "timestamp": 20,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark cascading class component force updates', async () => {
          let forced = false;
          class Example extends React.Component {
            componentDidMount() {
              forced = true;
              this.forceUpdate();
            }
            render() {
              Scheduler.unstable_advanceTime(10);
              Scheduler.log(forced ? 'force update' : 'mount');
              return null;
            }
          }

          modernRender(<Example />);

          await waitForPaint(['mount', 'force update']);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "lanes": "0b0000000000000000000000000000010",
                          "timestamp": 20,
                          "type": "schedule-force-update",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark render phase state updates for class component', async () => {
          class Example extends React.Component {
            state = {didRender: false};
            render() {
              if (this.state.didRender === false) {
                this.setState({didRender: true});
              }
              Scheduler.unstable_advanceTime(10);
              Scheduler.log(
                this.state.didRender ? 'second render' : 'first render',
              );
              return null;
            }
          }

          modernRender(<Example />);

          let errorMessage;
          jest.spyOn(console, 'error').mockImplementation(message => {
            errorMessage = message;
          });

          await waitForAll(['first render', 'second render']);

          expect(console.error).toHaveBeenCalledTimes(1);
          expect(errorMessage).toContain(
            'Cannot update during an existing state transition',
          );

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "componentStack": "
                          in Example (at **)",
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark render phase force updates for class component', async () => {
          let forced = false;
          class Example extends React.Component {
            render() {
              Scheduler.unstable_advanceTime(10);
              Scheduler.log(forced ? 'force update' : 'render');
              if (!forced) {
                forced = true;
                this.forceUpdate();
              }
              return null;
            }
          }

          modernRender(<Example />);

          let errorMessage;
          jest.spyOn(console, 'error').mockImplementation(message => {
            errorMessage = message;
          });

          await waitForAll(['render', 'force update']);

          expect(console.error).toHaveBeenCalledTimes(1);
          expect(errorMessage).toContain(
            'Cannot update during an existing state transition',
          );

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 20,
                          "type": "schedule-force-update",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark cascading layout updates', async () => {
          function Example() {
            const [didMount, setDidMount] = React.useState(false);
            React.useLayoutEffect(() => {
              Scheduler.unstable_advanceTime(1);
              setDidMount(true);
            }, []);
            Scheduler.unstable_advanceTime(10);
            Scheduler.log(didMount ? 'update' : 'mount');
            return didMount;
          }

          modernRender(<Example />);

          await waitForAll(['mount', 'update']);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 1,
                          "timestamp": 20,
                          "type": "layout-effect-mount",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 21,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "componentStack": "
                          in Example (at **)",
                          "lanes": "0b0000000000000000000000000000010",
                          "timestamp": 21,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark cascading passive updates', async () => {
          function Example() {
            const [didMount, setDidMount] = React.useState(false);
            React.useEffect(() => {
              Scheduler.unstable_advanceTime(1);
              setDidMount(true);
            }, []);
            Scheduler.unstable_advanceTime(10);
            Scheduler.log(didMount ? 'update' : 'mount');
            return didMount;
          }

          modernRender(<Example />);
          await waitForAll(['mount', 'update']);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(2);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 1,
                          "timestamp": 20,
                          "type": "passive-effect-mount",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "duration": 10,
                          "timestamp": 21,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "componentStack": "
                          in Example (at **)",
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 21,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark render phase updates', async () => {
          function Example() {
            const [didRender, setDidRender] = React.useState(false);
            Scheduler.unstable_advanceTime(10);
            if (!didRender) {
              setDidRender(true);
            }
            Scheduler.log(didRender ? 'update' : 'mount');
            return didRender;
          }

          modernRender(<Example />);
          await waitForAll(['mount', 'update']);

          const timelineData = stopProfilingAndGetTimelineData();
          // Render phase updates should be retried as part of the same batch.
          expect(timelineData.batchUIDToMeasuresMap.size).toBe(1);
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "Example",
                          "duration": 20,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Example",
                          "componentStack": "
                          in Example (at **)",
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 20,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
        });

        it('should mark concurrent render that throws', async () => {
          jest.spyOn(console, 'error').mockImplementation(() => {});

          class ErrorBoundary extends React.Component {
            state = {error: null};
            componentDidCatch(error) {
              this.setState({error});
            }
            render() {
              Scheduler.unstable_advanceTime(10);
              if (this.state.error) {
                Scheduler.log('ErrorBoundary fallback');
                return null;
              }
              Scheduler.log('ErrorBoundary render');
              return this.props.children;
            }
          }

          function ExampleThatThrows() {
            Scheduler.log('ExampleThatThrows');
            // eslint-disable-next-line no-throw-literal
            throw 'Expected error';
          }

          modernRender(
            <ErrorBoundary>
              <ExampleThatThrows />
            </ErrorBoundary>,
          );

          await waitForAll([
            'ErrorBoundary render',
            'ExampleThatThrows',
            'ErrorBoundary render',
            'ExampleThatThrows',
            'ErrorBoundary fallback',
          ]);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "ErrorBoundary",
                          "duration": 10,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "ExampleThatThrows",
                          "duration": 0,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "ErrorBoundary",
                          "duration": 10,
                          "timestamp": 20,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "ExampleThatThrows",
                          "duration": 0,
                          "timestamp": 30,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "ErrorBoundary",
                          "duration": 10,
                          "timestamp": 30,
                          "type": "render",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "ErrorBoundary",
                          "componentStack": "
                          in ErrorBoundary (at **)",
                          "lanes": "0b0000000000000000000000000000010",
                          "timestamp": 30,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.thrownErrors).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "ExampleThatThrows",
                          "message": "Expected error",
                          "phase": "mount",
                          "timestamp": 20,
                          "type": "thrown-error",
                        },
                        {
                          "componentName": "ExampleThatThrows",
                          "message": "Expected error",
                          "phase": "mount",
                          "timestamp": 30,
                          "type": "thrown-error",
                        },
                      ]
                  `);
        });

        it('should mark passive and layout effects', async () => {
          function ComponentWithEffects() {
            React.useLayoutEffect(() => {
              Scheduler.log('layout 1 mount');
              return () => {
                Scheduler.log('layout 1 unmount');
              };
            }, []);

            React.useEffect(() => {
              Scheduler.log('passive 1 mount');
              return () => {
                Scheduler.log('passive 1 unmount');
              };
            }, []);

            React.useLayoutEffect(() => {
              Scheduler.log('layout 2 mount');
              return () => {
                Scheduler.log('layout 2 unmount');
              };
            }, []);

            React.useEffect(() => {
              Scheduler.log('passive 2 mount');
              return () => {
                Scheduler.log('passive 2 unmount');
              };
            }, []);

            React.useEffect(() => {
              Scheduler.log('passive 3 mount');
              return () => {
                Scheduler.log('passive 3 unmount');
              };
            }, []);

            return null;
          }

          const unmount = modernRender(<ComponentWithEffects />);

          await waitForPaint(['layout 1 mount', 'layout 2 mount']);

          await waitForAll([
            'passive 1 mount',
            'passive 2 mount',
            'passive 3 mount',
          ]);

          await waitForAll([]);

          unmount();

          assertLog([
            'layout 1 unmount',
            'layout 2 unmount',
            'passive 1 unmount',
            'passive 2 unmount',
            'passive 3 unmount',
          ]);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.componentMeasures).toMatchInlineSnapshot(`
                      [
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "render",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "layout-effect-mount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "layout-effect-mount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "passive-effect-mount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "passive-effect-mount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "passive-effect-mount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "layout-effect-unmount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "layout-effect-unmount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "passive-effect-unmount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "passive-effect-unmount",
                          "warning": null,
                        },
                        {
                          "componentName": "ComponentWithEffects",
                          "duration": 0,
                          "timestamp": 10,
                          "type": "passive-effect-unmount",
                          "warning": null,
                        },
                      ]
                  `);
          expect(timelineData.batchUIDToMeasuresMap).toMatchInlineSnapshot(`
                      Map {
                        1 => [
                          {
                            "batchUID": 1,
                            "depth": 0,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000100000",
                            "timestamp": 10,
                            "type": "render-idle",
                          },
                          {
                            "batchUID": 1,
                            "depth": 0,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000100000",
                            "timestamp": 10,
                            "type": "render",
                          },
                          {
                            "batchUID": 1,
                            "depth": 0,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000100000",
                            "timestamp": 10,
                            "type": "commit",
                          },
                          {
                            "batchUID": 1,
                            "depth": 1,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000100000",
                            "timestamp": 10,
                            "type": "layout-effects",
                          },
                          {
                            "batchUID": 1,
                            "depth": 0,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000100000",
                            "timestamp": 10,
                            "type": "passive-effects",
                          },
                        ],
                        2 => [
                          {
                            "batchUID": 2,
                            "depth": 0,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000000010",
                            "timestamp": 10,
                            "type": "render-idle",
                          },
                          {
                            "batchUID": 2,
                            "depth": 0,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000000010",
                            "timestamp": 10,
                            "type": "render",
                          },
                          {
                            "batchUID": 2,
                            "depth": 0,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000000010",
                            "timestamp": 10,
                            "type": "commit",
                          },
                          {
                            "batchUID": 2,
                            "depth": 1,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000000010",
                            "timestamp": 10,
                            "type": "layout-effects",
                          },
                          {
                            "batchUID": 2,
                            "depth": 1,
                            "duration": 0,
                            "lanes": "0b0000000000000000000000000000010",
                            "timestamp": 10,
                            "type": "passive-effects",
                          },
                        ],
                      }
                  `);
        });

        it('should generate component stacks for state update', async () => {
          function CommponentWithChildren({initialRender}) {
            Scheduler.log('Render ComponentWithChildren');
            return <Child initialRender={initialRender} />;
          }

          function Child({initialRender}) {
            const [didRender, setDidRender] = React.useState(initialRender);
            if (!didRender) {
              setDidRender(true);
            }
            Scheduler.log('Render Child');
            return null;
          }

          modernRender(<CommponentWithChildren initialRender={false} />);

          await waitForAll([
            'Render ComponentWithChildren',
            'Render Child',
            'Render Child',
          ]);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData.schedulingEvents).toMatchInlineSnapshot(`
                      [
                        {
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-render",
                          "warning": null,
                        },
                        {
                          "componentName": "Child",
                          "componentStack": "
                          in Child (at **)
                          in CommponentWithChildren (at **)",
                          "lanes": "0b0000000000000000000000000100000",
                          "timestamp": 10,
                          "type": "schedule-state-update",
                          "warning": null,
                        },
                      ]
                  `);
        });
      });
    });

    describe('when not profiling', () => {
      describe('with legacy render', () => {
        const {render: legacyRender} = getLegacyRenderImplementation();

        // @reactVersion <= 18.2
        // @reactVersion >= 18.0
        it('should not log any marks', () => {
          legacyRender(<div />);

          const timelineData = stopProfilingAndGetTimelineData();
          expect(timelineData).toBeNull();
        });
      });
    });
  });
});

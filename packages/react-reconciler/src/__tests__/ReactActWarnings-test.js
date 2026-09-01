/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment node
 */

let React;
let Scheduler;
let waitForAll;
let assertLog;
let ReactNoop;
let useState;
let act;
let Suspense;
let startTransition;
let getCacheForType;
let caches;
let assertConsoleErrorDev;

// These tests are mostly concerned with concurrent roots. The legacy root
// behavior is covered by other older test suites and is unchanged from
// React 17.
describe('act warnings', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    Scheduler = require('scheduler');
    ReactNoop = require('react-noop-renderer');
    act = React.act;
    useState = React.useState;
    Suspense = React.Suspense;
    startTransition = React.startTransition;
    getCacheForType = React.unstable_getCacheForType;
    caches = [];

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  function createTextCache() {
    const data = new Map();
    const version = caches.length + 1;
    const cache = {
      version,
      data,
      resolve(text) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'resolved',
            value: text,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'resolved';
          record.value = text;
          thenable.pings.forEach(t => t());
        }
      },
      reject(text, error) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'rejected',
            value: error,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'rejected';
          record.value = error;
          thenable.pings.forEach(t => t());
        }
      },
    };
    caches.push(cache);
    return cache;
  }

  function readText(text) {
    const textCache = getCacheForType(createTextCache);
    const record = textCache.data.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          Scheduler.log(`Error! [${text}]`);
          throw record.value;
        case 'resolved':
          return textCache.version;
      }
    } else {
      Scheduler.log(`Suspend! [${text}]`);

      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.data.set(text, newRecord);

      throw thenable;
    }
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function AsyncText({text}) {
    readText(text);
    Scheduler.log(text);
    return text;
  }

  function resolveText(text) {
    if (caches.length === 0) {
      throw Error('Cache does not exist.');
    } else {
      // Resolve the most recently created cache. An older cache can by
      // resolved with `caches[index].resolve(text)`.
      caches[caches.length - 1].resolve(text);
    }
  }

  async function withActEnvironment(value, scope) {
    const prevValue = global.IS_REACT_ACT_ENVIRONMENT;
    global.IS_REACT_ACT_ENVIRONMENT = value;
    try {
      return await scope();
    } finally {
      global.IS_REACT_ACT_ENVIRONMENT = prevValue;
    }
  }

  it('warns about unwrapped updates only if environment flag is enabled', async () => {
    let setState;
    function App() {
      const [state, _setState] = useState(0);
      setState = _setState;
      return <Text text={state} />;
    }

    const root = ReactNoop.createRoot();
    root.render(<App />);
    await waitForAll([0]);
    expect(root).toMatchRenderedOutput('0');

    // Default behavior. Flag is undefined. No warning.
    expect(global.IS_REACT_ACT_ENVIRONMENT).toBe(undefined);
    setState(1);
    await waitForAll([1]);
    expect(root).toMatchRenderedOutput('1');

    // Flag is true. Warn.
    await withActEnvironment(true, async () => {
      setState(2);
      assertConsoleErrorDev([
        'An update to App inside a test was not wrapped in act(...).\n' +
          '\n' +
          'When testing, code that causes React state updates should be wrapped into act(...):\n' +
          '\n' +
          'act(() => {\n' +
          '  /* fire events that update state */\n' +
          '});\n' +
          '/* assert on the output */\n' +
          '\n' +
          "This ensures that you're testing the behavior the user would see in the browser. " +
          'Learn more at https://react.dev/link/wrap-tests-with-act\n' +
          '    in App (at **)',
      ]);
      await waitForAll([2]);
      expect(root).toMatchRenderedOutput('2');
    });

    // Flag is false. No warning.
    await withActEnvironment(false, async () => {
      setState(3);
      await waitForAll([3]);
      expect(root).toMatchRenderedOutput('3');
    });
  });

  // @gate __DEV__
  it('act warns if the environment flag is not enabled', async () => {
    let setState;
    function App() {
      const [state, _setState] = useState(0);
      setState = _setState;
      return <Text text={state} />;
    }

    const root = ReactNoop.createRoot();
    root.render(<App />);
    await waitForAll([0]);
    expect(root).toMatchRenderedOutput('0');

    // Default behavior. Flag is undefined. Warn.
    expect(global.IS_REACT_ACT_ENVIRONMENT).toBe(undefined);
    act(() => {
      setState(1);
    });
    assertConsoleErrorDev([
      'The current testing environment is not configured to support act(...)',
    ]);
    assertLog([1]);
    expect(root).toMatchRenderedOutput('1');

    // Flag is true. Don't warn.
    await withActEnvironment(true, () => {
      act(() => {
        setState(2);
      });
      assertLog([2]);
      expect(root).toMatchRenderedOutput('2');
    });

    // Flag is false. Warn.
    await withActEnvironment(false, () => {
      act(() => {
        setState(1);
      });
      assertConsoleErrorDev([
        'The current testing environment is not configured to support act(...)',
      ]);
      assertLog([1]);
      expect(root).toMatchRenderedOutput('1');
    });
  });

  it('warns if root update is not wrapped', async () => {
    await withActEnvironment(true, () => {
      const root = ReactNoop.createRoot();
      root.render('Hi');
      assertConsoleErrorDev([
        // TODO: Better error message that doesn't make it look like "Root" is
        // the name of a custom component
        'An update to Root inside a test was not wrapped in act(...).\n' +
          '\n' +
          'When testing, code that causes React state updates should be wrapped into act(...):\n' +
          '\n' +
          'act(() => {\n' +
          '  /* fire events that update state */\n' +
          '});\n' +
          '/* assert on the output */\n' +
          '\n' +
          "This ensures that you're testing the behavior the user would see in the browser. " +
          'Learn more at https://react.dev/link/wrap-tests-with-act',
      ]);
    });
  });

  // @gate __DEV__
  it('warns if class update is not wrapped', async () => {
    let app;
    class App extends React.Component {
      state = {count: 0};
      render() {
        app = this;
        return <Text text={this.state.count} />;
      }
    }

    await withActEnvironment(true, () => {
      const root = ReactNoop.createRoot();
      act(() => {
        root.render(<App />);
      });
      app.setState({count: 1});
      assertConsoleErrorDev([
        'An update to App inside a test was not wrapped in act(...).\n' +
          '\n' +
          'When testing, code that causes React state updates should be wrapped into act(...):\n' +
          '\n' +
          'act(() => {\n' +
          '  /* fire events that update state */\n' +
          '});\n' +
          '/* assert on the output */\n' +
          '\n' +
          "This ensures that you're testing the behavior the user would see in the browser. " +
          'Learn more at https://react.dev/link/wrap-tests-with-act\n' +
          '    in App (at **)',
      ]);
    });
  });

  // @gate __DEV__
  it('warns even if update is synchronous', async () => {
    let setState;
    function App() {
      const [state, _setState] = useState(0);
      setState = _setState;
      return <Text text={state} />;
    }

    await withActEnvironment(true, () => {
      const root = ReactNoop.createRoot();
      act(() => root.render(<App />));
      assertLog([0]);
      expect(root).toMatchRenderedOutput('0');

      // Even though this update is synchronous, we should still fire a warning,
      // because it could have spawned additional asynchronous work
      ReactNoop.flushSync(() => setState(1));
      assertConsoleErrorDev([
        'An update to App inside a test was not wrapped in act(...).\n' +
          '\n' +
          'When testing, code that causes React state updates should be wrapped into act(...):\n' +
          '\n' +
          'act(() => {\n' +
          '  /* fire events that update state */\n' +
          '});\n' +
          '/* assert on the output */\n' +
          '\n' +
          "This ensures that you're testing the behavior the user would see in the browser. " +
          'Learn more at https://react.dev/link/wrap-tests-with-act\n' +
          '    in App (at **)',
      ]);

      assertLog([1]);
      expect(root).toMatchRenderedOutput('1');
    });
  });

  // @gate __DEV__
  // @gate enableLegacyCache
  it('warns if Suspense retry is not wrapped', async () => {
    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text="Async" />
        </Suspense>
      );
    }

    await withActEnvironment(true, () => {
      const root = ReactNoop.createRoot();
      act(() => {
        root.render(<App />);
      });
      assertLog([
        'Suspend! [Async]',
        'Loading...',
        // pre-warming
        'Suspend! [Async]',
      ]);
      expect(root).toMatchRenderedOutput('Loading...');

      // This is a retry, not a ping, because we already showed a fallback.
      resolveText('Async');
      assertConsoleErrorDev([
        'A suspended resource finished loading inside a test, but the event was not wrapped in act(...).\n' +
          '\n' +
          'When testing, code that resolves suspended data should be wrapped into act(...):\n' +
          '\n' +
          'act(() => {\n' +
          '  /* finish loading suspended data */\n' +
          '});\n' +
          '/* assert on the output */\n' +
          '\n' +
          "This ensures that you're testing the behavior the user would see in the browser. " +
          'Learn more at https://react.dev/link/wrap-tests-with-act',

        // pre-warming

        'A suspended resource finished loading inside a test, but the event was not wrapped in act(...).\n' +
          '\n' +
          'When testing, code that resolves suspended data should be wrapped into act(...):\n' +
          '\n' +
          'act(() => {\n' +
          '  /* finish loading suspended data */\n' +
          '});\n' +
          '/* assert on the output */\n' +
          '\n' +
          "This ensures that you're testing the behavior the user would see in the browser. " +
          'Learn more at https://react.dev/link/wrap-tests-with-act',
      ]);
    });
  });

  // @gate __DEV__
  // @gate enableLegacyCache
  it('warns if Suspense ping is not wrapped', async () => {
    function App({showMore}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {showMore ? <AsyncText text="Async" /> : <Text text="(empty)" />}
        </Suspense>
      );
    }

    await withActEnvironment(true, () => {
      const root = ReactNoop.createRoot();
      act(() => {
        root.render(<App showMore={false} />);
      });
      assertLog(['(empty)']);
      expect(root).toMatchRenderedOutput('(empty)');

      act(() => {
        startTransition(() => {
          root.render(<App showMore={true} />);
        });
      });
      assertLog(['Suspend! [Async]', 'Loading...']);
      expect(root).toMatchRenderedOutput('(empty)');

      // This is a ping, not a retry, because no fallback is showing.
      resolveText('Async');
      assertConsoleErrorDev([
        'A suspended resource finished loading inside a test, but the event was not wrapped in act(...).\n' +
          '\n' +
          'When testing, code that resolves suspended data should be wrapped into act(...):\n' +
          '\n' +
          'act(() => {\n' +
          '  /* finish loading suspended data */\n' +
          '});\n' +
          '/* assert on the output */\n' +
          '\n' +
          "This ensures that you're testing the behavior the user would see in the browser. " +
          'Learn more at https://react.dev/link/wrap-tests-with-act',
      ]);
    });
  });
});

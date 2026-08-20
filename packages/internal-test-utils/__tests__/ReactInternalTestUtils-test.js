/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

const React = require('react');
const stripAnsi = require('strip-ansi');
const {startTransition, useDeferredValue} = React;
const ReactNoop = require('react-noop-renderer');
const {
  waitFor,
  waitForAll,
  waitForPaint,
  waitForThrow,
  assertLog,
} = require('internal-test-utils');
const act = require('internal-test-utils').act;
const Scheduler = require('scheduler/unstable_mock');
const {
  assertConsoleLogsCleared,
  resetAllUnexpectedConsoleCalls,
  patchConsoleMethods,
} = require('../consoleMock');
const {
  assertConsoleLogDev,
  assertConsoleWarnDev,
  assertConsoleErrorDev,
} = require('../ReactInternalTestUtils');

describe('ReactInternalTestUtils', () => {
  it('waitFor', async () => {
    const Yield = ({id}) => {
      Scheduler.log(id);
      return id;
    };

    const root = ReactNoop.createRoot();
    startTransition(() => {
      root.render(
        <div>
          <Yield id="foo" />
          <Yield id="bar" />
          <Yield id="baz" />
        </div>
      );
    });

    await waitFor(['foo', 'bar']);
    expect(root).toMatchRenderedOutput(null);
    await waitFor(['baz']);
    expect(root).toMatchRenderedOutput(null);
    await waitForAll([]);
    expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
  });

  it('waitForAll', async () => {
    const Yield = ({id}) => {
      Scheduler.log(id);
      return id;
    };

    const root = ReactNoop.createRoot();
    startTransition(() => {
      root.render(
        <div>
          <Yield id="foo" />
          <Yield id="bar" />
          <Yield id="baz" />
        </div>
      );
    });

    await waitForAll(['foo', 'bar', 'baz']);
    expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
  });

  it('waitForThrow', async () => {
    const Yield = ({id}) => {
      Scheduler.log(id);
      return id;
    };

    function BadRender() {
      throw new Error('Oh no!');
    }

    function App() {
      return (
        <div>
          <Yield id="A" />
          <Yield id="B" />
          <BadRender />
          <Yield id="C" />
          <Yield id="D" />
        </div>
      );
    }

    const root = ReactNoop.createRoot();
    root.render(<App />);

    await waitForThrow('Oh no!');
    assertLog([
      'A',
      'B',
      // React will try one more time before giving up.
      'A',
      'B',
    ]);
  });

  it('waitForPaint', async () => {
    function App({prop}) {
      const deferred = useDeferredValue(prop);
      const text = `Urgent: ${prop}, Deferred: ${deferred}`;
      Scheduler.log(text);
      return text;
    }

    const root = ReactNoop.createRoot();
    root.render(<App prop="A" />);

    await waitForAll(['Urgent: A, Deferred: A']);
    expect(root).toMatchRenderedOutput('Urgent: A, Deferred: A');

    // This update will result in two separate paints: an urgent one, and a
    // deferred one.
    root.render(<App prop="B" />);
    // Urgent paint
    await waitForPaint(['Urgent: B, Deferred: A']);
    expect(root).toMatchRenderedOutput('Urgent: B, Deferred: A');

    // Deferred paint
    await waitForPaint(['Urgent: B, Deferred: B']);
    expect(root).toMatchRenderedOutput('Urgent: B, Deferred: B');
  });

  it('assertLog', async () => {
    const Yield = ({id}) => {
      Scheduler.log(id);
      React.useEffect(() => {
        Scheduler.log(`create effect ${id}`);
        return () => {
          Scheduler.log(`cleanup effect ${id}`);
        };
      });
      return id;
    };

    function App() {
      return (
        <div>
          <Yield id="A" />
          <Yield id="B" />
          <Yield id="C" />
        </div>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    });
    assertLog([
      'A',
      'B',
      'C',
      'create effect A',
      'create effect B',
      'create effect C',
    ]);

    await act(() => {
      root.render(null);
    });

    assertLog(['cleanup effect A', 'cleanup effect B', 'cleanup effect C']);
  });
});

describe('ReactInternalTestUtils console mocks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    patchConsoleMethods({includeLog: true});
  });

  afterEach(() => {
    resetAllUnexpectedConsoleCalls();
    jest.resetAllMocks();
  });

  describe('console.log', () => {
    it('should fail if not asserted', () => {
      expect(() => {
        console.log('hit');
        assertConsoleLogsCleared();
      }).toThrow(`console.log was called without assertConsoleLogDev`);
    });

    it('should not fail if mocked with spyOnDev', () => {
      spyOnDev(console, 'log').mockImplementation(() => {});
      expect(() => {
        if (__DEV__) {
          console.log('hit');
        }
        assertConsoleLogsCleared();
      }).not.toThrow();
    });

    // @gate !__DEV__
    it('should not fail if mocked with spyOnProd', () => {
      spyOnProd(console, 'log').mockImplementation(() => {});
      expect(() => {
        console.log('hit');
        assertConsoleLogsCleared();
      }).not.toThrow();
    });

    it('should not fail if mocked with spyOnDevAndProd', () => {
      spyOnDevAndProd(console, 'log').mockImplementation(() => {});
      expect(() => {
        console.log('hit');
        assertConsoleLogsCleared();
      }).not.toThrow();
    });
  });

  describe('console.warn', () => {
    it('should fail if not asserted', () => {
      expect(() => {
        console.warn('hit');
        assertConsoleLogsCleared();
      }).toThrow('console.warn was called without assertConsoleWarnDev');
    });

    it('should not fail if mocked with spyOnDev', () => {
      spyOnDev(console, 'warn').mockImplementation(() => {});
      expect(() => {
        if (__DEV__) {
          console.warn('hit');
        }
        assertConsoleLogsCleared();
      }).not.toThrow();
    });

    // @gate !__DEV__
    it('should not fail if mocked with spyOnProd', () => {
      spyOnProd(console, 'warn').mockImplementation(() => {});
      expect(() => {
        console.warn('hit');
        assertConsoleLogsCleared();
      }).not.toThrow();
    });

    it('should not fail if mocked with spyOnDevAndProd', () => {
      spyOnDevAndProd(console, 'warn').mockImplementation(() => {});
      expect(() => {
        console.warn('hit');
        assertConsoleLogsCleared();
      }).not.toThrow();
    });
  });

  describe('console.error', () => {
    it('should fail if console.error is not asserted', () => {
      expect(() => {
        console.error('hit');
        assertConsoleLogsCleared();
      }).toThrow('console.error was called without assertConsoleErrorDev');
    });

    it('should not fail if mocked with spyOnDev', () => {
      spyOnDev(console, 'error').mockImplementation(() => {});
      expect(() => {
        if (__DEV__) {
          console.error('hit');
        }
        assertConsoleLogsCleared();
      }).not.toThrow();
    });

    // @gate !__DEV__
    it('should not fail if mocked with spyOnProd', () => {
      spyOnProd(console, 'error').mockImplementation(() => {});
      expect(() => {
        console.error('hit');
        assertConsoleLogsCleared();
      }).not.toThrow();
    });

    it('should not fail if mocked with spyOnDevAndProd', () => {
      spyOnDevAndProd(console, 'error').mockImplementation(() => {});
      expect(() => {
        console.error('hit');
        assertConsoleLogsCleared();
      }).not.toThrow();
    });
  });
});

// Helper method to capture assertion failure.
const expectToThrowFailure = expectBlock => {
  let caughtError;
  try {
    expectBlock();
  } catch (error) {
    caughtError = error;
  }
  expect(caughtError).toBeDefined();
  return stripAnsi(caughtError.message);
};

// Helper method to capture assertion failure with act.
const awaitExpectToThrowFailure = async expectBlock => {
  let caughtError;
  try {
    await expectBlock();
  } catch (error) {
    caughtError = error;
  }
  expect(caughtError).toBeDefined();
  return stripAnsi(caughtError.message);
};

describe('ReactInternalTestUtils console assertions', () => {
  beforeAll(() => {
    patchConsoleMethods({includeLog: true});
  });

  describe('assertConsoleLogDev', () => {
    it('passes for a single log', () => {
      if (__DEV__) {
        console.log('Hello');
      }
      assertConsoleLogDev(['Hello']);
    });

    it('passes for multiple logs', () => {
      if (__DEV__) {
        console.log('Hello');
        console.log('Good day');
        console.log('Bye');
      }
      assertConsoleLogDev(['Hello', 'Good day', 'Bye']);
    });

    it('fails if act is called without assertConsoleLogDev', async () => {
      const Yield = ({id}) => {
        console.log(id);
        return id;
      };

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <Yield id="C" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App />);
      });
      const message = await awaitExpectToThrowFailure(async () => {
        await act(() => {
          root.render(<App />);
        });
      });

      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.log was called without assertConsoleLogDev:
        + A
        + B
        + C

        You must call one of the assertConsoleDev helpers between each act call."
      `);
    });

    // @gate __DEV__
    it('fails if first expected log is not included', () => {
      const message = expectToThrowFailure(() => {
        console.log('Wow');
        console.log('Bye');
        assertConsoleLogDev(['Hi', 'Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Unexpected log(s) recorded.

        - Expected logs
        + Received logs

        - Hi
          Wow
          Bye"
      `);
    });

    // @gate __DEV__
    it('fails if middle expected log is not included', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi');
        console.log('Bye');
        assertConsoleLogDev(['Hi', 'Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Unexpected log(s) recorded.

        - Expected logs
        + Received logs

          Hi
        - Wow
          Bye"
      `);
    });

    // @gate __DEV__
    it('fails if last expected log is not included', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi');
        console.log('Wow');
        assertConsoleLogDev(['Hi', 'Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Expected log was not recorded.

        - Expected logs
        + Received logs

          Hi
          Wow
        - Bye"
      `);
    });

    // @gate __DEV__
    it('fails if first received log is not included', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi');
        console.log('Wow');
        console.log('Bye');
        assertConsoleLogDev(['Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Unexpected log(s) recorded.

        - Expected logs
        + Received logs

        + Hi
          Wow
          Bye"
      `);
    });

    // @gate __DEV__
    it('fails if middle received log is not included', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi');
        console.log('Wow');
        console.log('Bye');
        assertConsoleLogDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Unexpected log(s) recorded.

        - Expected logs
        + Received logs

          Hi
        + Wow
          Bye"
      `);
    });

    // @gate __DEV__
    it('fails if last received log is not included', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi');
        console.log('Wow');
        console.log('Bye');
        assertConsoleLogDev(['Hi', 'Wow']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Unexpected log(s) recorded.

        - Expected logs
        + Received logs

          Hi
          Wow
        + Bye"
      `);
    });

    // @gate __DEV__
    it('fails if both expected and received mismatch', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi');
        console.log('Wow');
        console.log('Bye');
        assertConsoleLogDev(['Hi', 'Wow', 'Yikes']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Unexpected log(s) recorded.

        - Expected logs
        + Received logs

          Hi
          Wow
        - Yikes
        + Bye"
      `);
    });

    // @gate __DEV__
    it('fails if both expected and received mismatch with multiple lines', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi\nFoo');
        console.log('Wow\nBar');
        console.log('Bye\nBaz');
        assertConsoleLogDev(['Hi\nFoo', 'Wow\nBar', 'Yikes\nFaz']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Unexpected log(s) recorded.

        - Expected logs
        + Received logs

          Hi Foo
          Wow Bar
        - Yikes Faz
        + Bye Baz"
      `);
    });

    // @gate __DEV__
    it('fails if the args is greater than %s argument number', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi %s', 'Sara', 'extra');
        assertConsoleLogDev(['Hi']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Received 2 arguments for a message with 1 placeholders:
          "Hi %s""
      `);
    });

    // @gate __DEV__
    it('fails if the args is greater than %s argument number for multiple logs', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi %s', 'Sara', 'extra');
        console.log('Bye %s', 'Sara', 'extra');
        assertConsoleLogDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Received 2 arguments for a message with 1 placeholders:
          "Hi %s"

        Received 2 arguments for a message with 1 placeholders:
          "Bye %s""
      `);
    });

    // @gate __DEV__
    it('fails if the %s argument number is greater than args', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi %s');
        assertConsoleLogDev(['Hi']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Received 0 arguments for a message with 1 placeholders:
          "Hi %s""
      `);
    });

    // @gate __DEV__
    it('fails if the %s argument number is greater than args for multiple logs', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi %s');
        console.log('Bye %s');
        assertConsoleLogDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Received 0 arguments for a message with 1 placeholders:
          "Hi %s"

        Received 0 arguments for a message with 1 placeholders:
          "Bye %s""
      `);
    });

    // @gate __DEV__
    it('fails if first arg is not an array', () => {
      const message = expectToThrowFailure(() => {
        console.log('Hi');
        console.log('Bye');
        assertConsoleLogDev('Hi', 'Bye');
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleLogDev(expected)

        Expected messages should be an array of strings but was given type "string"."
      `);

      assertConsoleLogDev(['Hi', 'Bye']);
    });

    it('should fail if waitFor is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      console.log('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitFor(['foo', 'bar']);
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.log was called without assertConsoleLogDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['foo', 'bar', 'baz']);
    });

    it('should fail if waitForThrow is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      function BadRender() {
        throw new Error('Oh no!');
      }

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <BadRender />
            <Yield id="C" />
            <Yield id="D" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      root.render(<App />);

      console.log('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitForThrow('Oh no!');
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.log was called without assertConsoleLogDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['A', 'B', 'A', 'B']);
    });

    it('should fail if waitForPaint is called before asserting', async () => {
      function App({prop}) {
        const deferred = useDeferredValue(prop);
        const text = `Urgent: ${prop}, Deferred: ${deferred}`;
        Scheduler.log(text);
        return text;
      }

      const root = ReactNoop.createRoot();
      root.render(<App prop="A" />);

      await waitForAll(['Urgent: A, Deferred: A']);
      expect(root).toMatchRenderedOutput('Urgent: A, Deferred: A');

      // This update will result in two separate paints: an urgent one, and a
      // deferred one.
      root.render(<App prop="B" />);

      console.log('Not asserted');
      const message = await awaitExpectToThrowFailure(async () => {
        await waitForPaint(['Urgent: B, Deferred: A']);
      });

      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.log was called without assertConsoleLogDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['Urgent: B, Deferred: A', 'Urgent: B, Deferred: B']);
    });

    it('should fail if waitForAll is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      console.log('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitForAll(['foo', 'bar', 'baz']);
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.log was called without assertConsoleLogDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['foo', 'bar', 'baz']);
    });
    it('should fail if toMatchRenderedOutput is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        console.log('Not asserted');
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      assertLog([]);

      await waitForAll(['foo', 'bar', 'baz']);
      const message = expectToThrowFailure(() => {
        expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
      });
      if (!__DEV__) {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.log was called without assertConsoleLogDev:
          + Not asserted
          + Not asserted
          + Not asserted

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      } else {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.log was called without assertConsoleLogDev:
          + Not asserted
          + Not asserted
          + Not asserted

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      }

      expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
    });
  });

  describe('assertConsoleWarnDev', () => {
    it('passes if an warning contains a stack', () => {
      if (__DEV__) {
        console.warn('Hello\n    in div');
      }
      assertConsoleWarnDev(['Hello\n    in div']);
    });

    it('passes if all warnings contain a stack', () => {
      if (__DEV__) {
        console.warn('Hello\n    in div');
        console.warn('Good day\n    in div');
        console.warn('Bye\n    in div');
      }
      assertConsoleWarnDev([
        'Hello\n    in div',
        'Good day\n    in div',
        'Bye\n    in div',
      ]);
    });

    it('fails if act is called without assertConsoleWarnDev', async () => {
      const Yield = ({id}) => {
        console.warn(id);
        return id;
      };

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <Yield id="C" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App />);
      });
      const message = await awaitExpectToThrowFailure(async () => {
        await act(() => {
          root.render(<App />);
        });
      });

      if (!__DEV__) {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.warn was called without assertConsoleWarnDev:
          + A
          + B
          + C

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      } else {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.warn was called without assertConsoleWarnDev:
          + A%s,
          +     in App (at **)
          + B%s,
          +     in App (at **)
          + C%s,
          +     in App (at **)

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      }
    });

    it('fails if act is called without any assertConsoleDev helpers', async () => {
      const Yield = ({id}) => {
        console.log(id);
        console.warn(id);
        console.error(id);
        return id;
      };

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <Yield id="C" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App />);
      });
      const message = await awaitExpectToThrowFailure(async () => {
        await act(() => {
          root.render(<App />);
        });
      });

      if (!__DEV__) {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.log was called without assertConsoleLogDev:
          + A
          + B
          + C

          console.warn was called without assertConsoleWarnDev:
          + A
          + B
          + C

          console.error was called without assertConsoleErrorDev:
          + A
          + B
          + C

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      } else {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.log was called without assertConsoleLogDev:
          + A
          + B
          + C

          console.warn was called without assertConsoleWarnDev:
          + A%s,
          +     in App (at **)
          + B%s,
          +     in App (at **)
          + C%s,
          +     in App (at **)

          console.error was called without assertConsoleErrorDev:
          + A%s,
          +     in App (at **)
          + B%s,
          +     in App (at **)
          + C%s,
          +     in App (at **)

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      }
    });

    // @gate __DEV__
    it('fails if first expected warning is not included', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Wow \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev(['Hi', 'Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Hi
        - Wow
        - Bye
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if middle expected warning is not included', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev(['Hi', 'Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Hi
        - Wow
        - Bye
        + Hi      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if last expected warning is not included', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Wow \n    in div');
        assertConsoleWarnDev([
          'Hi \n    in div',
          'Wow \n    in div',
          'Bye \n    in div',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Expected warning was not recorded.

        - Expected warnings
        + Received warnings

        - Hi      in div
        - Wow      in div
        - Bye      in div
        + Hi      in div (at **)
        + Wow      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if first received warning is not included', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Wow \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev(['Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Wow
        - Bye
        + Hi      in div (at **)
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if middle received warning is not included', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Wow \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Hi
        - Bye
        + Hi      in div (at **)
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if last received warning is not included', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Wow \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev(['Hi', 'Wow']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Hi
        - Wow
        + Hi      in div (at **)
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if first warning does not contain a stack', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hello');
        console.warn('Good day\n    in div');
        console.warn('Bye\n    in div');
        assertConsoleWarnDev([
          'Hello\n    in div',
          'Good day\n    in div',
          'Bye\n    in div',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Hello     in div
        - Good day     in div
        - Bye     in div
        + Hello
        + Good day     in div (at **)
        + Bye     in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if middle warning does not contain a stack', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hello\n    in div');
        console.warn('Good day');
        console.warn('Bye\n    in div');
        assertConsoleWarnDev([
          'Hello\n    in div',
          'Good day\n    in div',
          'Bye\n    in div',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Hello     in div
        - Good day     in div
        - Bye     in div
        + Hello     in div (at **)
        + Good day
        + Bye     in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if last warning does not contain a stack', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hello\n    in div');
        console.warn('Good day\n    in div');
        console.warn('Bye');
        assertConsoleWarnDev([
          'Hello\n    in div',
          'Good day\n    in div',
          'Bye\n    in div',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

        - Hello     in div
        - Good day     in div
        - Bye     in div
        + Hello     in div (at **)
        + Good day     in div (at **)
        + Bye"
      `);
    });

    // @gate __DEV__
    it('fails if the args is greater than %s argument number', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi %s', 'Sara', 'extra');
        assertConsoleWarnDev(['Hi']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Received 2 arguments for a message with 1 placeholders:
          "Hi %s""
      `);
    });

    // @gate __DEV__
    it('fails if the args is greater than %s argument number for multiple warnings', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi %s', 'Sara', 'extra');
        console.warn('Bye %s', 'Sara', 'extra');
        assertConsoleWarnDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Received 2 arguments for a message with 1 placeholders:
          "Hi %s"

        Received 2 arguments for a message with 1 placeholders:
          "Bye %s""
      `);
    });

    // @gate __DEV__
    it('fails if the %s argument number is greater than args', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi %s');
        assertConsoleWarnDev(['Hi']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Received 0 arguments for a message with 1 placeholders:
          "Hi %s""
      `);
    });

    // @gate __DEV__
    it('fails if the %s argument number is greater than args for multiple warnings', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi %s');
        console.warn('Bye %s');
        assertConsoleWarnDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Received 0 arguments for a message with 1 placeholders:
          "Hi %s"

        Received 0 arguments for a message with 1 placeholders:
          "Bye %s""
      `);
    });

    // @gate __DEV__
    it('fails if component stack is passed twice', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi %s%s', '\n    in div', '\n    in div');
        assertConsoleWarnDev(['Hi \n    in div (at **)']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

          Hi      in div (at **)
        +     in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if multiple logs pass component stack twice', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi %s%s', '\n    in div', '\n    in div');
        console.warn('Bye %s%s', '\n    in div', '\n    in div');
        assertConsoleWarnDev([
          'Hi \n    in div (at **)',
          'Bye \n    in div (at **)',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Unexpected warning(s) recorded.

        - Expected warnings
        + Received warnings

          Hi      in div (at **)
        +     in div (at **)
          Bye      in div (at **)
        +     in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if multiple strings are passed without an array wrapper for single log', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev('Hi', 'Bye');
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Expected messages should be an array of strings but was given type "string"."
      `);
      assertConsoleWarnDev(['Hi \n    in div', 'Bye \n    in div']);
    });

    // @gate __DEV__
    it('fails if multiple strings are passed without an array wrapper for multiple logs', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev('Hi', 'Bye');
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Expected messages should be an array of strings but was given type "string"."
      `);
      assertConsoleWarnDev(['Hi \n    in div', 'Bye \n    in div']);
    });

    // @gate __DEV__
    it('fails on more than two arguments', () => {
      const message = expectToThrowFailure(() => {
        console.warn('Hi \n    in div');
        console.warn('Wow \n    in div');
        console.warn('Bye \n    in div');
        assertConsoleWarnDev('Hi', undefined, 'Bye');
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleWarnDev(expected)

        Expected messages should be an array of strings but was given type "string"."
      `);
      assertConsoleWarnDev([
        'Hi \n    in div',
        'Wow \n    in div',
        'Bye \n    in div',
      ]);
    });

    it('should fail if waitFor is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      console.warn('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitFor(['foo', 'bar']);
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.warn was called without assertConsoleWarnDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['foo', 'bar', 'baz']);
    });

    it('should fail if waitForThrow is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      function BadRender() {
        throw new Error('Oh no!');
      }

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <BadRender />
            <Yield id="C" />
            <Yield id="D" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      root.render(<App />);

      console.warn('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitForThrow('Oh no!');
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.warn was called without assertConsoleWarnDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['A', 'B', 'A', 'B']);
    });

    it('should fail if waitForPaint is called before asserting', async () => {
      function App({prop}) {
        const deferred = useDeferredValue(prop);
        const text = `Urgent: ${prop}, Deferred: ${deferred}`;
        Scheduler.log(text);
        return text;
      }

      const root = ReactNoop.createRoot();
      root.render(<App prop="A" />);

      await waitForAll(['Urgent: A, Deferred: A']);
      expect(root).toMatchRenderedOutput('Urgent: A, Deferred: A');

      // This update will result in two separate paints: an urgent one, and a
      // deferred one.
      root.render(<App prop="B" />);

      console.warn('Not asserted');
      const message = await awaitExpectToThrowFailure(async () => {
        await waitForPaint(['Urgent: B, Deferred: A']);
      });

      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.warn was called without assertConsoleWarnDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['Urgent: B, Deferred: A', 'Urgent: B, Deferred: B']);
    });

    it('should fail if waitForAll is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      console.warn('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitForAll(['foo', 'bar', 'baz']);
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.warn was called without assertConsoleWarnDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['foo', 'bar', 'baz']);
    });
    it('should fail if toMatchRenderedOutput is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        console.warn('Not asserted');
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      assertLog([]);

      await waitForAll(['foo', 'bar', 'baz']);
      const message = expectToThrowFailure(() => {
        expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
      });
      if (!__DEV__) {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.warn was called without assertConsoleWarnDev:
          + Not asserted
          + Not asserted
          + Not asserted

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      } else {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.warn was called without assertConsoleWarnDev:
          + Not asserted%s,
          +     in Yield (at **)
          + Not asserted%s,
          +     in Yield (at **)
          + Not asserted%s,
          +     in Yield (at **)

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      }

      expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
    });
  });

  describe('assertConsoleErrorDev', () => {
    it('passes if an error contains a stack', () => {
      if (__DEV__) {
        console.error('Hello\n    in div');
      }
      assertConsoleErrorDev(['Hello\n    in div']);
    });

    it('passes if all errors contain a stack', () => {
      if (__DEV__) {
        console.error('Hello\n    in div');
        console.error('Good day\n    in div');
        console.error('Bye\n    in div');
      }
      assertConsoleErrorDev([
        'Hello\n    in div',
        'Good day\n    in div',
        'Bye\n    in div',
      ]);
    });

    it('fails if act is called without assertConsoleErrorDev', async () => {
      const Yield = ({id}) => {
        console.error(id);
        return id;
      };

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <Yield id="C" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App />);
      });
      const message = await awaitExpectToThrowFailure(async () => {
        await act(() => {
          root.render(<App />);
        });
      });

      if (!__DEV__) {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.error was called without assertConsoleErrorDev:
          + A
          + B
          + C

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      } else {
        expect(message).toMatchInlineSnapshot(`
                  "asserConsoleLogsCleared(expected)

                  console.error was called without assertConsoleErrorDev:
                  + A%s,
                  +     in App (at **)
                  + B%s,
                  +     in App (at **)
                  + C%s,
                  +     in App (at **)

                  You must call one of the assertConsoleDev helpers between each act call."
              `);
      }
    });

    it('fails if act is called without any assertConsoleDev helpers', async () => {
      const Yield = ({id}) => {
        console.log(id);
        console.warn(id);
        console.error(id);
        return id;
      };

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <Yield id="C" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App />);
      });
      const message = await awaitExpectToThrowFailure(async () => {
        await act(() => {
          root.render(<App />);
        });
      });

      if (!__DEV__) {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.log was called without assertConsoleLogDev:
          + A
          + B
          + C

          console.warn was called without assertConsoleWarnDev:
          + A
          + B
          + C

          console.error was called without assertConsoleErrorDev:
          + A
          + B
          + C

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      } else {
        expect(message).toMatchInlineSnapshot(`
                  "asserConsoleLogsCleared(expected)

                  console.log was called without assertConsoleLogDev:
                  + A
                  + B
                  + C

                  console.warn was called without assertConsoleWarnDev:
                  + A%s,
                  +     in App (at **)
                  + B%s,
                  +     in App (at **)
                  + C%s,
                  +     in App (at **)

                  console.error was called without assertConsoleErrorDev:
                  + A%s,
                  +     in App (at **)
                  + B%s,
                  +     in App (at **)
                  + C%s,
                  +     in App (at **)

                  You must call one of the assertConsoleDev helpers between each act call."
              `);
      }
    });

    // @gate __DEV__
    it('fails if first expected error is not included', () => {
      const message = expectToThrowFailure(() => {
        console.error('Wow \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev(['Hi', 'Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

        - Hi
        - Wow
        - Bye
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if middle expected error is not included', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev(['Hi', 'Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

        - Hi
        - Wow
        - Bye
        + Hi      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if last expected error is not included', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Wow \n    in div');
        assertConsoleErrorDev([
          'Hi \n    in div',
          'Wow \n    in div',
          'Bye \n    in div',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Expected error was not recorded.

        - Expected errors
        + Received errors

        - Hi      in div
        - Wow      in div
        - Bye      in div
        + Hi      in div (at **)
        + Wow      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if first received error is not included', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Wow \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev(['Wow', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

        - Wow
        - Bye
        + Hi      in div (at **)
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if middle received error is not included', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Wow \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

        - Hi
        - Bye
        + Hi      in div (at **)
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if last received error is not included', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Wow \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev(['Hi', 'Wow']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

        - Hi
        - Wow
        + Hi      in div (at **)
        + Wow      in div (at **)
        + Bye      in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if last received error containing "undefined" is not included', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi');
        console.error(
          "TypeError: Cannot read properties of undefined (reading 'stack')\n" +
            '    in Foo (at **)'
        );
        assertConsoleErrorDev(['Hi']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

          Hi
        + TypeError: Cannot read properties of undefined (reading 'stack')     in Foo (at **)"
      `);
    });

    // @gate __DEV__
    it('regression: checks entire string, not just the first letter', async () => {
      const message = expectToThrowFailure(() => {
        console.error('Message that happens to contain a "T"\n    in div');

        assertConsoleErrorDev([
          'This is a completely different message that happens to start with "T"',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

        - This is a completely different message that happens to start with "T"
        + Message that happens to contain a "T"     in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if the args is greater than %s argument number', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi %s', 'Sara', 'extra');
        assertConsoleErrorDev(['Hi']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Received 2 arguments for a message with 1 placeholders:
          "Hi %s""
      `);
    });

    // @gate __DEV__
    it('fails if the args is greater than %s argument number for multiple errors', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi %s', 'Sara', 'extra');
        console.error('Bye %s', 'Sara', 'extra');
        assertConsoleErrorDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Received 2 arguments for a message with 1 placeholders:
          "Hi %s"

        Received 2 arguments for a message with 1 placeholders:
          "Bye %s""
      `);
    });

    // @gate __DEV__
    it('fails if the %s argument number is greater than args', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi %s');
        assertConsoleErrorDev(['Hi']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Received 0 arguments for a message with 1 placeholders:
          "Hi %s""
      `);
    });

    // @gate __DEV__
    it('fails if the %s argument number is greater than args for multiple errors', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi %s');
        console.error('Bye %s');
        assertConsoleErrorDev(['Hi', 'Bye']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Received 0 arguments for a message with 1 placeholders:
          "Hi %s"

        Received 0 arguments for a message with 1 placeholders:
          "Bye %s""
      `);
    });

    // @gate __DEV__
    it('fails if component stack is passed twice', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi %s%s', '\n    in div', '\n    in div');
        assertConsoleErrorDev(['Hi \n    in div (at **)']);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

          Hi      in div (at **)
        +     in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if multiple logs pass component stack twice', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi %s%s', '\n    in div', '\n    in div');
        console.error('Bye %s%s', '\n    in div', '\n    in div');
        assertConsoleErrorDev([
          'Hi \n    in div (at **)',
          'Bye \n    in div (at **)',
        ]);
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Unexpected error(s) recorded.

        - Expected errors
        + Received errors

          Hi      in div (at **)
        +     in div (at **)
          Bye      in div (at **)
        +     in div (at **)"
      `);
    });

    // @gate __DEV__
    it('fails if multiple strings are passed without an array wrapper for single log', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev('Hi \n    in div', 'Bye \n    in div');
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Expected messages should be an array of strings but was given type "string"."
      `);
      assertConsoleErrorDev(['Hi \n    in div', 'Bye \n    in div']);
    });

    // @gate __DEV__
    it('fails if multiple strings are passed without an array wrapper for multiple logs', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev('Hi', 'Bye');
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Expected messages should be an array of strings but was given type "string"."
      `);
      assertConsoleErrorDev(['Hi \n    in div', 'Bye \n    in div']);
    });

    // @gate __DEV__
    it('fails on more than two arguments', () => {
      const message = expectToThrowFailure(() => {
        console.error('Hi \n    in div');
        console.error('Wow \n    in div');
        console.error('Bye \n    in div');
        assertConsoleErrorDev('Hi', undefined, 'Bye');
      });
      expect(message).toMatchInlineSnapshot(`
        "assertConsoleErrorDev(expected)

        Expected messages should be an array of strings but was given type "string"."
      `);
      assertConsoleErrorDev([
        'Hi \n    in div',
        'Wow \n    in div',
        'Bye \n    in div',
      ]);
    });

    describe('in <stack> placeholder', () => {
      // @gate __DEV__
      it('fails if `in <stack>` is used for a component stack instead of an error stack', () => {
        const message = expectToThrowFailure(() => {
          console.error('Warning message\n    in div');
          assertConsoleErrorDev(['Warning message\n    in <stack>']);
        });
        expect(message).toMatchInlineSnapshot(`
          "assertConsoleErrorDev(expected)

          Incorrect use of \\n    in <stack> placeholder. The placeholder is for JavaScript Error stack traces (messages starting with "Error:"), not for React component stacks.

          Expected: "Warning message
              in <stack>"
          Received: "Warning message
              in div (at **)"

          If this error has a component stack, include the full component stack in your expected message (e.g., "Warning message\\n    in ComponentName (at **)")."
        `);
      });

      // @gate __DEV__
      it('fails if `in <stack>` is used for multiple component stacks', () => {
        const message = expectToThrowFailure(() => {
          console.error('First warning\n    in span');
          console.error('Second warning\n    in div');
          assertConsoleErrorDev([
            'First warning\n    in <stack>',
            'Second warning\n    in <stack>',
          ]);
        });
        expect(message).toMatchInlineSnapshot(`
          "assertConsoleErrorDev(expected)

          Incorrect use of \\n    in <stack> placeholder. The placeholder is for JavaScript Error stack traces (messages starting with "Error:"), not for React component stacks.

          Expected: "First warning
              in <stack>"
          Received: "First warning
              in span (at **)"

          If this error has a component stack, include the full component stack in your expected message (e.g., "Warning message\\n    in ComponentName (at **)").

          Incorrect use of \\n    in <stack> placeholder. The placeholder is for JavaScript Error stack traces (messages starting with "Error:"), not for React component stacks.

          Expected: "Second warning
              in <stack>"
          Received: "Second warning
              in div (at **)"

          If this error has a component stack, include the full component stack in your expected message (e.g., "Warning message\\n    in ComponentName (at **)")."
        `);
      });

      it('allows `in <stack>` for actual error stack traces', () => {
        // This should pass - \n    in <stack> is correctly used for an error stack
        console.error(new Error('Something went wrong'));
        assertConsoleErrorDev(['Error: Something went wrong\n    in <stack>']);
      });

      // @gate __DEV__
      it('fails if error stack trace is present but \\n    in <stack> is not expected', () => {
        const message = expectToThrowFailure(() => {
          console.error(new Error('Something went wrong'));
          assertConsoleErrorDev(['Error: Something went wrong']);
        });
        expect(message).toMatch(`Unexpected error stack trace for:`);
        expect(message).toMatch(`Error: Something went wrong`);
        expect(message).toMatch(
          'If this error should include an error stack trace, add \\n    in <stack> to your expected message'
        );
      });

      // @gate __DEV__
      it('fails if `in <stack>` is expected but no stack is present', () => {
        const message = expectToThrowFailure(() => {
          console.error('Error: Something went wrong');
          assertConsoleErrorDev([
            'Error: Something went wrong\n    in <stack>',
          ]);
        });
        expect(message).toMatchInlineSnapshot(`
          "assertConsoleErrorDev(expected)

          Missing error stack trace for:
            "Error: Something went wrong"

          The expected message uses \\n    in <stack> but the actual error doesn't include an error stack trace.
          If this error should not have an error stack trace, remove \\n    in <stack> from your expected message."
        `);
      });
    });

    describe('[Environment] placeholder', () => {
      // @gate __DEV__
      it('expands [Server] to ANSI escape sequence for server badge', () => {
        const badge = '\u001b[0m\u001b[7m Server \u001b[0m';
        console.error(badge + 'Error: something went wrong');
        assertConsoleErrorDev(['[Server] Error: something went wrong']);
      });

      // @gate __DEV__
      it('expands [Prerender] to ANSI escape sequence for server badge', () => {
        const badge = '\u001b[0m\u001b[7m Prerender \u001b[0m';
        console.error(badge + 'Error: something went wrong');
        assertConsoleErrorDev(['[Prerender] Error: something went wrong']);
      });

      // @gate __DEV__
      it('expands [Cache] to ANSI escape sequence for server badge', () => {
        const badge = '\u001b[0m\u001b[7m Cache \u001b[0m';
        console.error(badge + 'Error: something went wrong');
        assertConsoleErrorDev(['[Cache] Error: something went wrong']);
      });
    });

    it('should fail if waitFor is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      console.error('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitFor(['foo', 'bar']);
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.error was called without assertConsoleErrorDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['foo', 'bar', 'baz']);
    });

    it('should fail if waitForThrow is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      function BadRender() {
        throw new Error('Oh no!');
      }

      function App() {
        return (
          <div>
            <Yield id="A" />
            <Yield id="B" />
            <BadRender />
            <Yield id="C" />
            <Yield id="D" />
          </div>
        );
      }

      const root = ReactNoop.createRoot();
      root.render(<App />);

      console.error('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitForThrow('Oh no!');
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.error was called without assertConsoleErrorDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['A', 'B', 'A', 'B']);
    });

    it('should fail if waitForPaint is called before asserting', async () => {
      function App({prop}) {
        const deferred = useDeferredValue(prop);
        const text = `Urgent: ${prop}, Deferred: ${deferred}`;
        Scheduler.log(text);
        return text;
      }

      const root = ReactNoop.createRoot();
      root.render(<App prop="A" />);

      await waitForAll(['Urgent: A, Deferred: A']);
      expect(root).toMatchRenderedOutput('Urgent: A, Deferred: A');

      // This update will result in two separate paints: an urgent one, and a
      // deferred one.
      root.render(<App prop="B" />);

      console.error('Not asserted');
      const message = await awaitExpectToThrowFailure(async () => {
        await waitForPaint(['Urgent: B, Deferred: A']);
      });

      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.error was called without assertConsoleErrorDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['Urgent: B, Deferred: A', 'Urgent: B, Deferred: B']);
    });

    it('should fail if waitForAll is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      console.error('Not asserted');

      const message = await awaitExpectToThrowFailure(async () => {
        await waitForAll(['foo', 'bar', 'baz']);
      });
      expect(message).toMatchInlineSnapshot(`
        "asserConsoleLogsCleared(expected)

        console.error was called without assertConsoleErrorDev:
        + Not asserted

        You must call one of the assertConsoleDev helpers between each act call."
      `);

      await waitForAll(['foo', 'bar', 'baz']);
    });
    it('should fail if toMatchRenderedOutput is called before asserting', async () => {
      const Yield = ({id}) => {
        Scheduler.log(id);
        console.error('Not asserted');
        return id;
      };

      const root = ReactNoop.createRoot();
      startTransition(() => {
        root.render(
          <div>
            <Yield id="foo" />
            <Yield id="bar" />
            <Yield id="baz" />
          </div>
        );
      });

      assertLog([]);

      await waitForAll(['foo', 'bar', 'baz']);
      const message = expectToThrowFailure(() => {
        expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
      });
      if (!__DEV__) {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.error was called without assertConsoleErrorDev:
          + Not asserted
          + Not asserted
          + Not asserted

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      } else {
        expect(message).toMatchInlineSnapshot(`
          "asserConsoleLogsCleared(expected)

          console.error was called without assertConsoleErrorDev:
          + Not asserted%s,
          +     in Yield (at **)
          + Not asserted%s,
          +     in Yield (at **)
          + Not asserted%s,
          +     in Yield (at **)

          You must call one of the assertConsoleDev helpers between each act call."
        `);
      }

      expect(root).toMatchRenderedOutput(<div>foobarbaz</div>);
    });
  });
});

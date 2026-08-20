/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

let React;
let ReactDOMClient;
let Scheduler;
let act;
let container;
let assertLog;
let assertConsoleErrorDev;

jest.useRealTimers();

global.IS_REACT_ACT_ENVIRONMENT = true;

function sleep(period) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, period);
  });
}

describe('React.act()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  let root = null;
  const renderConcurrent = (el, dom) => {
    root = ReactDOMClient.createRoot(dom);
    if (__DEV__) {
      act(() => root.render(el));
    } else {
      root.render(el);
    }
  };

  const unmountConcurrent = _dom => {
    if (__DEV__) {
      act(() => {
        if (root !== null) {
          root.unmount();
          root = null;
        }
      });
    } else {
      if (root !== null) {
        root.unmount();
        root = null;
      }
    }
  };

  const rerenderConcurrent = el => {
    act(() => root.render(el));
  };

  runActTests(renderConcurrent, unmountConcurrent, rerenderConcurrent);

  describe('unacted effects', () => {
    function App() {
      React.useEffect(() => {}, []);
      return null;
    }

    // @gate __DEV__
    it('does not warn', () => {
      root = ReactDOMClient.createRoot(document.createElement('div'));
      act(() => root.render(<App />));
    });
  });
});

function runActTests(render, unmount, rerender) {
  describe('concurrent render', () => {
    beforeEach(() => {
      jest.resetModules();
      React = require('react');
      ReactDOMClient = require('react-dom/client');
      Scheduler = require('scheduler');
      act = React.act;

      const InternalTestUtils = require('internal-test-utils');
      assertLog = InternalTestUtils.assertLog;
      assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;

      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      unmount(container);
      document.body.removeChild(container);
    });

    describe('sync', () => {
      // @gate __DEV__
      it('can use act to flush effects', () => {
        function App() {
          React.useEffect(() => {
            Scheduler.log(100);
          });
          return null;
        }

        act(() => {
          render(<App />, container);
        });

        assertLog([100]);
      });

      // @gate __DEV__
      it('flushes effects on every call', async () => {
        function App() {
          const [ctr, setCtr] = React.useState(0);
          React.useEffect(() => {
            Scheduler.log(ctr);
          });
          return (
            <button id="button" onClick={() => setCtr(x => x + 1)}>
              {ctr}
            </button>
          );
        }

        act(() => {
          render(<App />, container);
        });
        assertLog([0]);
        const button = container.querySelector('#button');
        function click() {
          button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        }

        await act(async () => {
          click();
          click();
          click();
        });
        // it consolidates the 3 updates, then fires the effect
        assertLog([3]);
        await act(async () => click());
        assertLog([4]);
        await act(async () => click());
        assertLog([5]);
        expect(button.innerHTML).toBe('5');
      });

      // @gate __DEV__
      it("should keep flushing effects until they're done", () => {
        function App() {
          const [ctr, setCtr] = React.useState(0);
          React.useEffect(() => {
            if (ctr < 5) {
              setCtr(x => x + 1);
            }
          });
          return ctr;
        }

        act(() => {
          render(<App />, container);
        });

        expect(container.innerHTML).toBe('5');
      });

      // @gate __DEV__
      it('should flush effects only on exiting the outermost act', () => {
        function App() {
          React.useEffect(() => {
            Scheduler.log(0);
          });
          return null;
        }
        // let's nest a couple of act() calls
        act(() => {
          act(() => {
            render(<App />, container);
          });
          // the effect wouldn't have yielded yet because
          // we're still inside an act() scope
          assertLog([]);
        });
        // but after exiting the last one, effects get flushed
        assertLog([0]);
      });

      // @gate __DEV__
      it('warns if a setState is called outside of act(...)', () => {
        let setValue = null;
        function App() {
          const [value, _setValue] = React.useState(0);
          setValue = _setValue;
          return value;
        }

        act(() => {
          render(<App />, container);
        });

        setValue(1);
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

      // @gate __DEV__
      it('warns if a setState is called outside of act(...) after a component threw', () => {
        let setValue = null;
        function App({defaultValue}) {
          if (defaultValue === undefined) {
            throw new Error('some error');
          }
          const [value, _setValue] = React.useState(defaultValue);
          setValue = _setValue;
          return value;
        }

        expect(() => {
          act(() => {
            render(<App defaultValue={undefined} />, container);
          });
        }).toThrow('some error');

        act(() => {
          rerender(<App defaultValue={0} />, container);
        });

        setValue(1);
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

      // @gate __DEV__
      it('does not warn if IS_REACT_ACT_ENVIRONMENT is set to false', () => {
        let setState;
        function App() {
          const [state, _setState] = React.useState(0);
          setState = _setState;
          return state;
        }

        act(() => {
          render(<App />, container);
        });

        // First show that it does warn
        setState(1);
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

        // Now do the same thing again, but disable with the environment flag
        const prevIsActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
        global.IS_REACT_ACT_ENVIRONMENT = false;
        try {
          setState(2);
        } finally {
          global.IS_REACT_ACT_ENVIRONMENT = prevIsActEnvironment;
        }

        // When the flag is restored to its previous value, it should start
        // warning again. This shows that React reads the flag each time.
        setState(3);
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

      describe('fake timers', () => {
        beforeEach(() => {
          jest.useFakeTimers();
        });

        afterEach(() => {
          jest.useRealTimers();
        });

        // @gate __DEV__
        it('lets a ticker update', () => {
          function App() {
            const [toggle, setToggle] = React.useState(0);
            React.useEffect(() => {
              const timeout = setTimeout(() => {
                setToggle(1);
              }, 200);
              return () => clearTimeout(timeout);
            }, []);
            return toggle;
          }

          act(() => {
            render(<App />, container);
          });
          act(() => {
            jest.runAllTimers();
          });

          expect(container.innerHTML).toBe('1');
        });

        // @gate __DEV__
        it('can use the async version to catch microtasks', async () => {
          function App() {
            const [toggle, setToggle] = React.useState(0);
            React.useEffect(() => {
              // just like the previous test, except we
              // use a promise and schedule the update
              // after it resolves
              sleep(200).then(() => setToggle(1));
            }, []);
            return toggle;
          }

          act(() => {
            render(<App />, container);
          });
          await act(async () => {
            jest.runAllTimers();
          });

          expect(container.innerHTML).toBe('1');
        });

        // @gate __DEV__
        it('can handle cascading promises with fake timers', async () => {
          // this component triggers an effect, that waits a tick,
          // then sets state. repeats this 5 times.
          function App() {
            const [state, setState] = React.useState(0);
            async function ticker() {
              await null;
              setState(x => x + 1);
            }
            React.useEffect(() => {
              ticker();
            }, [Math.min(state, 4)]);
            return state;
          }

          await act(async () => {
            render(<App />, container);
          });

          // all 5 ticks present and accounted for
          expect(container.innerHTML).toBe('5');
        });

        // @gate __DEV__
        it('flushes immediate re-renders with act', () => {
          function App() {
            const [ctr, setCtr] = React.useState(0);
            React.useEffect(() => {
              if (ctr === 0) {
                setCtr(1);
              }
              const timeout = setTimeout(() => setCtr(2), 1000);
              return () => clearTimeout(timeout);
            });
            return ctr;
          }

          act(() => {
            render(<App />, container);
            // Since effects haven't been flushed yet, this does not advance the timer
            jest.runAllTimers();
          });

          expect(container.innerHTML).toBe('1');

          act(() => {
            jest.runAllTimers();
          });

          expect(container.innerHTML).toBe('2');
        });
      });
    });

    describe('asynchronous tests', () => {
      // @gate __DEV__
      it('works with timeouts', async () => {
        function App() {
          const [ctr, setCtr] = React.useState(0);
          function doSomething() {
            setTimeout(() => {
              setCtr(1);
            }, 50);
          }

          React.useEffect(() => {
            doSomething();
          }, []);
          return ctr;
        }

        await act(async () => {
          render(<App />, container);
        });
        expect(container.innerHTML).toBe('0');
        // Flush the pending timers
        await act(async () => {
          await sleep(100);
        });
        expect(container.innerHTML).toBe('1');
      });

      // @gate __DEV__
      it('flushes microtasks before exiting (async function)', async () => {
        function App() {
          const [ctr, setCtr] = React.useState(0);
          async function someAsyncFunction() {
            // queue a bunch of promises to be sure they all flush
            await null;
            await null;
            await null;
            setCtr(1);
          }
          React.useEffect(() => {
            someAsyncFunction();
          }, []);
          return ctr;
        }

        await act(async () => {
          render(<App />, container);
        });
        expect(container.innerHTML).toEqual('1');
      });

      // @gate __DEV__
      it('flushes microtasks before exiting (sync function)', async () => {
        // Same as previous test, but the callback passed to `act` is not itself
        // an async function.
        function App() {
          const [ctr, setCtr] = React.useState(0);
          async function someAsyncFunction() {
            // queue a bunch of promises to be sure they all flush
            await null;
            await null;
            await null;
            setCtr(1);
          }
          React.useEffect(() => {
            someAsyncFunction();
          }, []);
          return ctr;
        }

        await act(() => {
          render(<App />, container);
        });
        expect(container.innerHTML).toEqual('1');
      });

      // @gate __DEV__
      it('warns if you do not await an act call', async () => {
        spyOnDevAndProd(console, 'error').mockImplementation(() => {});
        act(async () => {});
        // it's annoying that we have to wait a tick before this warning comes in
        await sleep(0);
        if (__DEV__) {
          expect(console.error).toHaveBeenCalledTimes(1);
          expect(console.error.mock.calls[0][0]).toMatch(
            'You called act(async () => ...) without await.',
          );
        }
      });

      // @gate __DEV__
      it('warns if you try to interleave multiple act calls', async () => {
        spyOnDevAndProd(console, 'error').mockImplementation(() => {});

        await Promise.all([
          act(async () => {
            await sleep(50);
          }),
          act(async () => {
            await sleep(100);
          }),
        ]);

        await sleep(150);
        if (__DEV__) {
          expect(console.error).toHaveBeenCalledTimes(2);
          expect(console.error.mock.calls[0][0]).toMatch(
            'You seem to have overlapping act() calls',
          );
          expect(console.error.mock.calls[1][0]).toMatch(
            'You seem to have overlapping act() calls',
          );
        }
      });

      // @gate __DEV__
      it('async commits and effects are guaranteed to be flushed', async () => {
        function App() {
          const [state, setState] = React.useState(0);
          async function something() {
            await null;
            setState(1);
          }
          React.useEffect(() => {
            something();
          }, []);
          React.useEffect(() => {
            Scheduler.log(state);
          });
          return state;
        }

        await act(async () => {
          render(<App />, container);
        });
        // exiting act() drains effects and microtasks

        assertLog([0, 1]);
        expect(container.innerHTML).toBe('1');
      });

      // @gate __DEV__
      it('can handle cascading promises', async () => {
        // this component triggers an effect, that waits a tick,
        // then sets state. repeats this 5 times.
        function App() {
          const [state, setState] = React.useState(0);
          async function ticker() {
            await null;
            setState(x => x + 1);
          }
          React.useEffect(() => {
            Scheduler.log(state);
            ticker();
          }, [Math.min(state, 4)]);
          return state;
        }

        await act(async () => {
          render(<App />, container);
        });
        // all 5 ticks present and accounted for
        assertLog([0, 1, 2, 3, 4]);
        expect(container.innerHTML).toBe('5');
      });
    });

    describe('error propagation', () => {
      // @gate __DEV__
      it('propagates errors - sync', () => {
        let err;
        try {
          act(() => {
            throw new Error('some error');
          });
        } catch (_err) {
          err = _err;
        } finally {
          expect(err instanceof Error).toBe(true);
          expect(err.message).toBe('some error');
        }
      });

      // @gate __DEV__
      it('should propagate errors from effects - sync', () => {
        function App() {
          React.useEffect(() => {
            throw new Error('oh no');
          });
          return null;
        }
        let error;

        try {
          act(() => {
            render(<App />, container);
          });
        } catch (_error) {
          error = _error;
        } finally {
          expect(error instanceof Error).toBe(true);
          expect(error.message).toBe('oh no');
        }
      });

      // @gate __DEV__
      it('propagates errors - async', async () => {
        let err;
        try {
          await act(async () => {
            await sleep(100);
            throw new Error('some error');
          });
        } catch (_err) {
          err = _err;
        } finally {
          expect(err instanceof Error).toBe(true);
          expect(err.message).toBe('some error');
        }
      });

      // @gate __DEV__
      it('should cleanup after errors - sync', () => {
        function App() {
          React.useEffect(() => {
            Scheduler.log('oh yes');
          });
          return null;
        }
        let error;
        try {
          act(() => {
            throw new Error('oh no');
          });
        } catch (_error) {
          error = _error;
        } finally {
          expect(error instanceof Error).toBe(true);
          expect(error.message).toBe('oh no');
          // should be able to render components after this tho
          act(() => {
            render(<App />, container);
          });
          assertLog(['oh yes']);
        }
      });

      // @gate __DEV__
      it('should cleanup after errors - async', async () => {
        function App() {
          async function somethingAsync() {
            await null;
            Scheduler.log('oh yes');
          }
          React.useEffect(() => {
            somethingAsync();
          });
          return null;
        }
        let error;
        try {
          await act(async () => {
            await sleep(100);
            throw new Error('oh no');
          });
        } catch (_error) {
          error = _error;
        } finally {
          expect(error instanceof Error).toBe(true);
          expect(error.message).toBe('oh no');
          // should be able to render components after this tho
          await act(async () => {
            render(<App />, container);
          });
          assertLog(['oh yes']);
        }
      });
    });

    describe('suspense', () => {
      if (__DEV__ && __EXPERIMENTAL__) {
        // todo - remove __DEV__ check once we start using testing builds

        // @gate __DEV__
        it('triggers fallbacks if available', async () => {
          let resolved = false;
          let resolve;
          const promise = new Promise(_resolve => {
            resolve = _resolve;
          });

          function Suspends() {
            if (resolved) {
              return 'was suspended';
            }
            throw promise;
          }

          function App(props) {
            return (
              <React.Suspense
                fallback={<span data-test-id="spinner">loading...</span>}>
                {props.suspend ? <Suspends /> : 'content'}
              </React.Suspense>
            );
          }

          // render something so there's content
          act(() => {
            render(<App suspend={false} />, container);
          });

          // trigger a suspendy update
          act(() => {
            rerender(<App suspend={true} />);
          });
          expect(
            document.querySelector('[data-test-id=spinner]'),
          ).not.toBeNull();

          // now render regular content again
          act(() => {
            rerender(<App suspend={false} />);
          });
          expect(document.querySelector('[data-test-id=spinner]')).toBeNull();

          // trigger a suspendy update with a delay
          React.startTransition(() => {
            act(() => {
              rerender(<App suspend={true} />);
            });
          });

          // In Concurrent Mode, refresh transitions delay indefinitely.
          expect(document.querySelector('[data-test-id=spinner]')).toBeNull();

          // resolve the promise
          await act(async () => {
            resolved = true;
            resolve();
          });

          // spinner gone, content showing
          expect(document.querySelector('[data-test-id=spinner]')).toBeNull();
          expect(container.textContent).toBe('was suspended');
        });
      }
    });
  });
}

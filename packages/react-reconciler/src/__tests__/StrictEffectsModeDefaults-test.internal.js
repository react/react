/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let waitFor;
let waitForAll;
let waitForPaint;

describe('StrictEffectsMode defaults', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    waitFor = InternalTestUtils.waitFor;
    waitForAll = InternalTestUtils.waitForAll;
    waitForPaint = InternalTestUtils.waitForPaint;
  });

  // @gate !disableLegacyMode
  it('should not double invoke effects in legacy mode', async () => {
    const log = [];
    function App({text}) {
      React.useEffect(() => {
        log.push('useEffect mount');
        return () => log.push('useEffect unmount');
      });

      React.useLayoutEffect(() => {
        log.push('useLayoutEffect mount');
        return () => log.push('useLayoutEffect unmount');
      });

      return text;
    }

    await act(() => {
      ReactNoop.renderLegacySyncRoot(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['useLayoutEffect mount', 'useEffect mount']);
  });

  // @gate !disableLegacyMode
  it('should not double invoke class lifecycles in legacy mode', async () => {
    const log = [];
    class App extends React.PureComponent {
      componentDidMount() {
        log.push('componentDidMount');
      }

      componentDidUpdate() {
        log.push('componentDidUpdate');
      }

      componentWillUnmount() {
        log.push('componentWillUnmount');
      }

      render() {
        return this.props.text;
      }
    }

    await act(() => {
      ReactNoop.renderLegacySyncRoot(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['componentDidMount']);
  });

  if (__DEV__) {
    it('should flush double-invoked effects within the same frame as layout effects if there are no passive effects', async () => {
      const log = [];
      function ComponentWithEffects({label}) {
        React.useLayoutEffect(() => {
          Scheduler.log(`useLayoutEffect mount "${label}"`);
          log.push(`useLayoutEffect mount "${label}"`);
          return () => {
            Scheduler.log(`useLayoutEffect unmount "${label}"`);
            log.push(`useLayoutEffect unmount "${label}"`);
          };
        });

        return label;
      }

      await act(async () => {
        ReactNoop.render(
          <React.StrictMode>
            <ComponentWithEffects label={'one'} />
          </React.StrictMode>,
        );

        await waitForPaint(['useLayoutEffect mount "one"']);
        expect(log).toEqual([
          'useLayoutEffect mount "one"',
          'useLayoutEffect unmount "one"',
          'useLayoutEffect mount "one"',
        ]);
      });

      log.length = 0;
      await act(async () => {
        ReactNoop.render(
          <React.StrictMode>
            <ComponentWithEffects label={'one'} />
            <ComponentWithEffects label={'two'} />
          </React.StrictMode>,
        );

        expect(log).toEqual([]);
        await waitForPaint([
          // Cleanup and re-run "one" (and "two") since there is no dependencies array.
          'useLayoutEffect unmount "one"',
          'useLayoutEffect mount "one"',
          'useLayoutEffect mount "two"',
        ]);
        expect(log).toEqual([
          // Cleanup and re-run "one" (and "two") since there is no dependencies array.
          'useLayoutEffect unmount "one"',
          'useLayoutEffect mount "one"',
          'useLayoutEffect mount "two"',

          // Since "two" is new, it should be double-invoked.
          'useLayoutEffect unmount "two"',
          'useLayoutEffect mount "two"',
        ]);
      });
    });

    // This test also verifies that double-invoked effects flush synchronously
    // within the same frame as passive effects.
    it('should double invoke effects only for newly mounted components', async () => {
      const log = [];
      function ComponentWithEffects({label}) {
        React.useEffect(() => {
          log.push(`useEffect mount "${label}"`);
          Scheduler.log(`useEffect mount "${label}"`);
          return () => {
            log.push(`useEffect unmount "${label}"`);
            Scheduler.log(`useEffect unmount "${label}"`);
          };
        });

        React.useLayoutEffect(() => {
          log.push(`useLayoutEffect mount "${label}"`);
          Scheduler.log(`useLayoutEffect mount "${label}"`);
          return () => {
            log.push(`useLayoutEffect unmount "${label}"`);
            Scheduler.log(`useLayoutEffect unmount "${label}"`);
          };
        });

        return label;
      }

      await act(async () => {
        ReactNoop.render(
          <React.StrictMode>
            <ComponentWithEffects label={'one'} />
          </React.StrictMode>,
        );

        await waitForAll([
          'useLayoutEffect mount "one"',
          'useEffect mount "one"',
        ]);
        expect(log).toEqual([
          'useLayoutEffect mount "one"',
          'useEffect mount "one"',
          'useLayoutEffect unmount "one"',
          'useEffect unmount "one"',
          'useLayoutEffect mount "one"',
          'useEffect mount "one"',
        ]);
      });

      log.length = 0;
      await act(async () => {
        ReactNoop.render(
          <React.StrictMode>
            <ComponentWithEffects label={'one'} />
            <ComponentWithEffects label={'two'} />
          </React.StrictMode>,
        );

        await waitFor([
          // Cleanup and re-run "one" (and "two") since there is no dependencies array.
          'useLayoutEffect unmount "one"',
          'useLayoutEffect mount "one"',
          'useLayoutEffect mount "two"',
        ]);
        expect(log).toEqual([
          // Cleanup and re-run "one" (and "two") since there is no dependencies array.
          'useLayoutEffect unmount "one"',
          'useLayoutEffect mount "one"',
          'useLayoutEffect mount "two"',
        ]);
        log.length = 0;
        await waitForAll([
          'useEffect unmount "one"',
          'useEffect mount "one"',
          'useEffect mount "two"',
        ]);
        expect(log).toEqual([
          'useEffect unmount "one"',
          'useEffect mount "one"',
          'useEffect mount "two"',

          // Since "two" is new, it should be double-invoked.
          'useLayoutEffect unmount "two"',
          'useEffect unmount "two"',
          'useLayoutEffect mount "two"',
          'useEffect mount "two"',
        ]);
      });
    });

    it('double invoking for effects for modern roots', async () => {
      const log = [];
      function App({text}) {
        React.useEffect(() => {
          log.push('useEffect mount');
          return () => log.push('useEffect unmount');
        });

        React.useLayoutEffect(() => {
          log.push('useLayoutEffect mount');
          return () => log.push('useLayoutEffect unmount');
        });

        return text;
      }
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useLayoutEffect mount',
        'useEffect mount',
        'useLayoutEffect unmount',
        'useEffect unmount',
        'useLayoutEffect mount',
        'useEffect mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'update'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useLayoutEffect unmount',
        'useLayoutEffect mount',
        'useEffect unmount',
        'useEffect mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(null);
      });

      expect(log).toEqual(['useLayoutEffect unmount', 'useEffect unmount']);
    });

    it('multiple effects are double invoked in the right order (all mounted, all unmounted, all remounted)', async () => {
      const log = [];
      function App({text}) {
        React.useEffect(() => {
          log.push('useEffect One mount');
          return () => log.push('useEffect One unmount');
        });

        React.useEffect(() => {
          log.push('useEffect Two mount');
          return () => log.push('useEffect Two unmount');
        });

        return text;
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useEffect One mount',
        'useEffect Two mount',
        'useEffect One unmount',
        'useEffect Two unmount',
        'useEffect One mount',
        'useEffect Two mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'update'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useEffect One unmount',
        'useEffect Two unmount',
        'useEffect One mount',
        'useEffect Two mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(null);
      });

      expect(log).toEqual(['useEffect One unmount', 'useEffect Two unmount']);
    });

    it('multiple layout effects are double invoked in the right order (all mounted, all unmounted, all remounted)', async () => {
      const log = [];
      function App({text}) {
        React.useLayoutEffect(() => {
          log.push('useLayoutEffect One mount');
          return () => log.push('useLayoutEffect One unmount');
        });

        React.useLayoutEffect(() => {
          log.push('useLayoutEffect Two mount');
          return () => log.push('useLayoutEffect Two unmount');
        });

        return text;
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useLayoutEffect One mount',
        'useLayoutEffect Two mount',
        'useLayoutEffect One unmount',
        'useLayoutEffect Two unmount',
        'useLayoutEffect One mount',
        'useLayoutEffect Two mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'update'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useLayoutEffect One unmount',
        'useLayoutEffect Two unmount',
        'useLayoutEffect One mount',
        'useLayoutEffect Two mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(null);
      });

      expect(log).toEqual([
        'useLayoutEffect One unmount',
        'useLayoutEffect Two unmount',
      ]);
    });

    it('useEffect and useLayoutEffect is called twice when there is no unmount', async () => {
      const log = [];
      function App({text}) {
        React.useEffect(() => {
          log.push('useEffect mount');
        });

        React.useLayoutEffect(() => {
          log.push('useLayoutEffect mount');
        });

        return text;
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useLayoutEffect mount',
        'useEffect mount',
        'useLayoutEffect mount',
        'useEffect mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'update'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual(['useLayoutEffect mount', 'useEffect mount']);

      log.length = 0;
      await act(() => {
        ReactNoop.render(null);
      });

      expect(log).toEqual([]);
    });

    it('disconnects refs during double invoking', async () => {
      const onRefMock = jest.fn();
      function App({text}) {
        return (
          <span
            ref={ref => {
              onRefMock(ref);
            }}>
            text
          </span>
        );
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(onRefMock.mock.calls.length).toBe(3);
      expect(onRefMock.mock.calls[0][0]).not.toBeNull();
      expect(onRefMock.mock.calls[1][0]).toBe(null);
      expect(onRefMock.mock.calls[2][0]).not.toBeNull();
    });

    it('passes the right context to class component lifecycles', async () => {
      const log = [];
      class App extends React.PureComponent {
        test() {}

        componentDidMount() {
          this.test();
          log.push('componentDidMount');
        }

        componentDidUpdate() {
          this.test();
          log.push('componentDidUpdate');
        }

        componentWillUnmount() {
          this.test();
          log.push('componentWillUnmount');
        }

        render() {
          return null;
        }
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'componentDidMount',
        'componentWillUnmount',
        'componentDidMount',
      ]);
    });

    it('double invoking works for class components', async () => {
      const log = [];
      class App extends React.PureComponent {
        componentDidMount() {
          log.push('componentDidMount');
        }

        componentDidUpdate() {
          log.push('componentDidUpdate');
        }

        componentWillUnmount() {
          log.push('componentWillUnmount');
        }

        render() {
          return this.props.text;
        }
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'componentDidMount',
        'componentWillUnmount',
        'componentDidMount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'update'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual(['componentDidUpdate']);

      log.length = 0;
      await act(() => {
        ReactNoop.render(null);
      });

      expect(log).toEqual(['componentWillUnmount']);
    });

    it('double flushing passive effects only results in one double invoke', async () => {
      const log = [];
      function App({text}) {
        const [state, setState] = React.useState(0);
        React.useEffect(() => {
          if (state !== 1) {
            setState(1);
          }
          log.push('useEffect mount');
          return () => log.push('useEffect unmount');
        });

        React.useLayoutEffect(() => {
          log.push('useLayoutEffect mount');
          return () => log.push('useLayoutEffect unmount');
        });

        log.push(text);
        return text;
      }

      log.length = 0;
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'mount',
        'mount',
        'useLayoutEffect mount',
        'useEffect mount',
        'useLayoutEffect unmount',
        'useEffect unmount',
        'useLayoutEffect mount',
        'useEffect mount',
        'mount',
        'mount',
        'useLayoutEffect unmount',
        'useLayoutEffect mount',
        'useEffect unmount',
        'useEffect mount',
      ]);
    });

    it('newly mounted components after initial mount get double invoked', async () => {
      let _setShowChild;
      const log = [];
      function Child() {
        React.useEffect(() => {
          log.push('Child useEffect mount');
          return () => log.push('Child useEffect unmount');
        });
        React.useLayoutEffect(() => {
          log.push('Child useLayoutEffect mount');
          return () => log.push('Child useLayoutEffect unmount');
        });

        return null;
      }

      function App() {
        const [showChild, setShowChild] = React.useState(false);
        _setShowChild = setShowChild;
        React.useEffect(() => {
          log.push('App useEffect mount');
          return () => log.push('App useEffect unmount');
        });
        React.useLayoutEffect(() => {
          log.push('App useLayoutEffect mount');
          return () => log.push('App useLayoutEffect unmount');
        });

        return showChild && <Child />;
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'App useLayoutEffect mount',
        'App useEffect mount',
        'App useLayoutEffect unmount',
        'App useEffect unmount',
        'App useLayoutEffect mount',
        'App useEffect mount',
      ]);

      log.length = 0;
      await act(() => {
        _setShowChild(true);
      });

      expect(log).toEqual([
        'App useLayoutEffect unmount',
        'Child useLayoutEffect mount',
        'App useLayoutEffect mount',
        'App useEffect unmount',
        'Child useEffect mount',
        'App useEffect mount',
        'Child useLayoutEffect unmount',
        'Child useEffect unmount',
        'Child useLayoutEffect mount',
        'Child useEffect mount',
      ]);
    });

    it('classes and functions are double invoked together correctly', async () => {
      const log = [];
      class ClassChild extends React.PureComponent {
        componentDidMount() {
          log.push('componentDidMount');
        }

        componentWillUnmount() {
          log.push('componentWillUnmount');
        }

        render() {
          return this.props.text;
        }
      }

      function FunctionChild({text}) {
        React.useEffect(() => {
          log.push('useEffect mount');
          return () => log.push('useEffect unmount');
        });
        React.useLayoutEffect(() => {
          log.push('useLayoutEffect mount');
          return () => log.push('useLayoutEffect unmount');
        });
        return text;
      }

      function App({text}) {
        return (
          <React.StrictMode>
            <ClassChild text={text} />
            <FunctionChild text={text} />
          </React.StrictMode>
        );
      }

      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'componentDidMount',
        'useLayoutEffect mount',
        'useEffect mount',
        'componentWillUnmount',
        'useLayoutEffect unmount',
        'useEffect unmount',
        'componentDidMount',
        'useLayoutEffect mount',
        'useEffect mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(
          <React.StrictMode>
            <App text={'mount'} />
          </React.StrictMode>,
        );
      });

      expect(log).toEqual([
        'useLayoutEffect unmount',
        'useLayoutEffect mount',
        'useEffect unmount',
        'useEffect mount',
      ]);

      log.length = 0;
      await act(() => {
        ReactNoop.render(null);
      });

      expect(log).toEqual([
        'componentWillUnmount',
        'useLayoutEffect unmount',
        'useEffect unmount',
      ]);
    });
  }
});

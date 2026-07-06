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
let act;

describe('StrictEffectsMode', () => {
  beforeEach(() => {
    jest.resetModules();
    act = require('internal-test-utils').act;

    React = require('react');
    ReactNoop = require('react-noop-renderer');
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

    const root = ReactNoop.createLegacyRoot();
    await act(() => {
      root.render(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['useLayoutEffect mount', 'useEffect mount']);
  });

  it('double invoking for effects works properly', async () => {
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'useLayoutEffect mount',
        'useEffect mount',
        'useLayoutEffect unmount',
        'useEffect unmount',
        'useLayoutEffect mount',
        'useEffect mount',
      ]);
    } else {
      expect(log).toEqual(['useLayoutEffect mount', 'useEffect mount']);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'update'} />
        </React.StrictMode>,
        'root',
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
      ReactNoop.unmountRootWithID('root');
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'useEffect One mount',
        'useEffect Two mount',
        'useEffect One unmount',
        'useEffect Two unmount',
        'useEffect One mount',
        'useEffect Two mount',
      ]);
    } else {
      expect(log).toEqual(['useEffect One mount', 'useEffect Two mount']);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'update'} />
        </React.StrictMode>,
        'root',
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
      ReactNoop.unmountRootWithID('root');
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'useLayoutEffect One mount',
        'useLayoutEffect Two mount',
        'useLayoutEffect One unmount',
        'useLayoutEffect Two unmount',
        'useLayoutEffect One mount',
        'useLayoutEffect Two mount',
      ]);
    } else {
      expect(log).toEqual([
        'useLayoutEffect One mount',
        'useLayoutEffect Two mount',
      ]);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'update'} />
        </React.StrictMode>,
        'root',
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
      ReactNoop.unmountRootWithID('root');
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'useLayoutEffect mount',
        'useEffect mount',
        'useLayoutEffect mount',
        'useEffect mount',
      ]);
    } else {
      expect(log).toEqual(['useLayoutEffect mount', 'useEffect mount']);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'update'} />
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['useLayoutEffect mount', 'useEffect mount']);

    log.length = 0;
    await act(() => {
      ReactNoop.unmountRootWithID('root');
    });

    expect(log).toEqual([]);
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'componentDidMount',
        'componentWillUnmount',
        'componentDidMount',
      ]);
    } else {
      expect(log).toEqual(['componentDidMount']);
    }
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'componentDidMount',
        'componentWillUnmount',
        'componentDidMount',
      ]);
    } else {
      expect(log).toEqual(['componentDidMount']);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'update'} />
        </React.StrictMode>,
        'root',
      );
    });

    expect(log).toEqual(['componentDidUpdate']);

    log.length = 0;
    await act(() => {
      ReactNoop.unmountRootWithID('root');
    });

    expect(log).toEqual(['componentWillUnmount']);
  });

  it('invokes componentWillUnmount for class components without componentDidMount', async () => {
    const log = [];
    class App extends React.PureComponent {
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      expect(log).toEqual(['componentWillUnmount']);
    } else {
      expect(log).toEqual([]);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'update'} />
        </React.StrictMode>,
        'root',
      );
    });

    expect(log).toEqual(['componentDidUpdate']);

    log.length = 0;
    await act(() => {
      ReactNoop.unmountRootWithID('root');
    });

    expect(log).toEqual(['componentWillUnmount']);
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

    const root = ReactNoop.createLegacyRoot();
    await act(() => {
      root.render(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['componentDidMount']);
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

    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
      );
    });

    if (__DEV__) {
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
    } else {
      expect(log).toEqual([
        'mount',
        'useLayoutEffect mount',
        'useEffect mount',
        'mount',
        'useLayoutEffect unmount',
        'useLayoutEffect mount',
        'useEffect unmount',
        'useEffect mount',
      ]);
    }
  });

  it('newly mounted components after initial mount get double invoked', async () => {
    const log = [];
    let _setShowChild;
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
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'App useLayoutEffect mount',
        'App useEffect mount',
        'App useLayoutEffect unmount',
        'App useEffect unmount',
        'App useLayoutEffect mount',
        'App useEffect mount',
      ]);
    } else {
      expect(log).toEqual(['App useLayoutEffect mount', 'App useEffect mount']);
    }

    log.length = 0;
    await act(() => {
      _setShowChild(true);
    });

    if (__DEV__) {
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
    } else {
      expect(log).toEqual([
        'App useLayoutEffect unmount',
        'Child useLayoutEffect mount',
        'App useLayoutEffect mount',
        'App useEffect unmount',
        'Child useEffect mount',
        'App useEffect mount',
      ]);
    }
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
        <>
          <ClassChild text={text} />
          <FunctionChild text={text} />
        </>
      );
    }

    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
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
    } else {
      expect(log).toEqual([
        'componentDidMount',
        'useLayoutEffect mount',
        'useEffect mount',
      ]);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
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
      ReactNoop.unmountRootWithID('root');
    });

    expect(log).toEqual([
      'componentWillUnmount',
      'useLayoutEffect unmount',
      'useEffect unmount',
    ]);
  });

  it('classes without componentDidMount and functions are double invoked together correctly', async () => {
    const log = [];
    class ClassChild extends React.PureComponent {
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
        <>
          <ClassChild text={text} />
          <FunctionChild text={text} />
        </>
      );
    }

    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      expect(log).toEqual([
        'useLayoutEffect mount',
        'useEffect mount',
        'componentWillUnmount',
        'useLayoutEffect unmount',
        'useEffect unmount',
        'useLayoutEffect mount',
        'useEffect mount',
      ]);
    } else {
      expect(log).toEqual(['useLayoutEffect mount', 'useEffect mount']);
    }

    log.length = 0;
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App text={'mount'} />
        </React.StrictMode>,
        'root',
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
      ReactNoop.unmountRootWithID('root');
    });

    expect(log).toEqual([
      'componentWillUnmount',
      'useLayoutEffect unmount',
      'useEffect unmount',
    ]);
  });

  it('should not double-invoke effects when a keyed child is moved', async () => {
    const log = [];
    function Item({label}) {
      React.useEffect(() => {
        log.push('useEffect mount ' + label);
        return () => log.push('useEffect unmount ' + label);
      }, []);

      React.useLayoutEffect(() => {
        log.push('useLayoutEffect mount ' + label);
        return () => log.push('useLayoutEffect unmount ' + label);
      }, []);

      return label;
    }

    function App({items}) {
      return items.map(item => <Item key={item} label={item} />);
    }

    // Initial mount: [A, B, C]
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App items={['A', 'B', 'C']} />
        </React.StrictMode>,
        'root',
      );
    });

    // StrictMode double-invokes on mount — this is expected.
    if (__DEV__) {
      expect(log).toEqual([
        'useLayoutEffect mount A',
        'useLayoutEffect mount B',
        'useLayoutEffect mount C',
        'useEffect mount A',
        'useEffect mount B',
        'useEffect mount C',
        'useLayoutEffect unmount A',
        'useLayoutEffect unmount B',
        'useLayoutEffect unmount C',
        'useEffect unmount A',
        'useEffect unmount B',
        'useEffect unmount C',
        'useLayoutEffect mount A',
        'useLayoutEffect mount B',
        'useLayoutEffect mount C',
        'useEffect mount A',
        'useEffect mount B',
        'useEffect mount C',
      ]);
    } else {
      expect(log).toEqual([
        'useLayoutEffect mount A',
        'useLayoutEffect mount B',
        'useLayoutEffect mount C',
        'useEffect mount A',
        'useEffect mount B',
        'useEffect mount C',
      ]);
    }

    // Clear log after initial mount
    log.length = 0;

    // Re-render with items reordered: [C, A, B] (move, not mount)
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App items={['C', 'A', 'B']} />
        </React.StrictMode>,
        'root',
      );
    });

    // Effects should NOT be double-invoked on reorder since these are
    // moves, not new insertions.
    expect(log).toEqual([]);
  });

  it('should only double-invoke effects for a new item when mixed with moves', async () => {
    const log = [];
    function Item({label}) {
      React.useEffect(() => {
        log.push('useEffect mount ' + label);
        return () => log.push('useEffect unmount ' + label);
      }, []);

      React.useLayoutEffect(() => {
        log.push('useLayoutEffect mount ' + label);
        return () => log.push('useLayoutEffect unmount ' + label);
      }, []);

      return label;
    }

    function App({items}) {
      return items.map(item => <Item key={item} label={item} />);
    }

    // Initial mount: [A, B, C]
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App items={['A', 'B', 'C']} />
        </React.StrictMode>,
        'root',
      );
    });

    // Clear log after initial mount
    log.length = 0;

    // Re-render with items reordered and a new item D: [C, A, D, B]
    // C, A, B are moved (effects should NOT re-run)
    // D is NEW (its effects SHOULD be double-invoked by StrictMode)
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App items={['C', 'A', 'D', 'B']} />
        </React.StrictMode>,
        'root',
      );
    });

    if (__DEV__) {
      // Only D's effects should appear: mount, unmount, mount (StrictMode double-invoke)
      expect(log).toEqual([
        'useLayoutEffect mount D',
        'useEffect mount D',
        'useLayoutEffect unmount D',
        'useEffect unmount D',
        'useLayoutEffect mount D',
        'useEffect mount D',
      ]);
    } else {
      // In production, D just mounts once
      expect(log).toEqual(['useLayoutEffect mount D', 'useEffect mount D']);
    }
  });

  it('should only fire unmount effects for a removed item when mixed with moves', async () => {
    const log = [];
    function Item({label}) {
      React.useEffect(() => {
        log.push('useEffect mount ' + label);
        return () => log.push('useEffect unmount ' + label);
      }, []);

      React.useLayoutEffect(() => {
        log.push('useLayoutEffect mount ' + label);
        return () => log.push('useLayoutEffect unmount ' + label);
      }, []);

      return label;
    }

    function App({items}) {
      return items.map(item => <Item key={item} label={item} />);
    }

    // Initial mount: [A, B, C]
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App items={['A', 'B', 'C']} />
        </React.StrictMode>,
        'root',
      );
    });

    // Clear log after initial mount
    log.length = 0;

    // Re-render with B removed and items reordered: [C, A]
    // C, A are moved (effects should NOT re-run)
    // B is REMOVED (its cleanup effects SHOULD fire)
    await act(() => {
      ReactNoop.renderToRootWithID(
        <React.StrictMode>
          <App items={['C', 'A']} />
        </React.StrictMode>,
        'root',
      );
    });

    // Only B's unmount effects should appear
    expect(log).toEqual(['useLayoutEffect unmount B', 'useEffect unmount B']);
  });

  // @gate __DEV__
  it('should double invoke effects after a re-suspend', async () => {
    // Not using log.push because it silences double render logs.
    let log = [];
    let shouldSuspend = true;
    let resolve;
    const suspensePromise = new Promise(_resolve => {
      resolve = _resolve;
    });
    function Fallback() {
      log.push('Fallback');
      return 'Loading';
    }

    function Parent({prop}) {
      log.push('Parent rendered');

      React.useEffect(() => {
        log.push('Parent create');
        return () => {
          log.push('Parent destroy');
        };
      }, []);

      React.useEffect(() => {
        log.push('Parent dep create');
        return () => {
          log.push('Parent dep destroy');
        };
      }, [prop]);

      return (
        <React.Suspense fallback={<Fallback />}>
          <Child prop={prop} />
        </React.Suspense>
      );
    }

    function Child({prop}) {
      const [count, forceUpdate] = React.useState(0);
      const ref = React.useRef(null);
      log.push('Child rendered');
      React.useEffect(() => {
        log.push('Child create');
        return () => {
          log.push('Child destroy');
          ref.current = true;
        };
      }, []);
      const key = `${prop}-${count}`;
      React.useEffect(() => {
        log.push('Child dep create');
        if (ref.current === true) {
          ref.current = false;
          forceUpdate(c => c + 1);
          log.push('-----------------------after setState');
          return;
        }

        return () => {
          log.push('Child dep destroy');
        };
      }, [key]);

      if (shouldSuspend) {
        log.push('Child suspended');
        throw suspensePromise;
      }
      return null;
    }

    // Initial mount
    shouldSuspend = false;
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Parent />
        </React.StrictMode>,
      );
    });

    // Now re-suspend
    shouldSuspend = true;
    log = [];
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Parent />
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'Parent rendered',
      'Parent rendered',
      'Child rendered',
      'Child suspended',
      'Fallback',
      'Fallback',
      // pre-warming
      'Child rendered',
      'Child suspended',
    ]);

    log = [];
    // while suspended, update
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Parent prop={'bar'} />
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'Parent rendered',
      'Parent rendered',
      'Child rendered',
      'Child suspended',
      'Fallback',
      'Fallback',
      'Parent dep destroy',
      'Parent dep create',
      // pre-warming
      'Child rendered',
      'Child suspended',
    ]);

    log = [];
    // Now resolve and commit
    await act(() => {
      resolve();
      shouldSuspend = false;
    });

    expect(log).toEqual([
      'Child rendered',
      'Child rendered',
      // !!! Committed, destroy and create effect.
      // !!! The other effect is not destroyed and created
      // !!! because the dep didn't change
      'Child dep destroy',
      'Child dep create',

      // Double invoke both effects
      'Child destroy',
      'Child dep destroy',
      'Child create',
      'Child dep create',
      // Fires setState
      '-----------------------after setState',
      'Child rendered',
      'Child rendered',
      'Child dep create',
    ]);
  });
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-func-assign */

'use strict';

let React;
let ReactTestRenderer;
let Scheduler;
let ReactDOMServer;
let act;
let assertLog;
let assertConsoleErrorDev;
let waitForAll;
let waitForThrow;

describe('ReactHooks', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactTestRenderer = require('react-test-renderer');
    Scheduler = require('scheduler');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
    waitForAll = InternalTestUtils.waitForAll;
    waitForThrow = InternalTestUtils.waitForThrow;
  });

  if (__DEV__) {
    // useDebugValue is a DEV-only hook
    it('useDebugValue throws when used in a class component', async () => {
      class Example extends React.Component {
        render() {
          React.useDebugValue('abc');
          return null;
        }
      }
      await expect(async () => {
        await act(() => {
          ReactTestRenderer.create(<Example />, {
            unstable_isConcurrent: true,
          });
        });
      }).rejects.toThrow(
        'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen' +
          ' for one of the following reasons:\n' +
          '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
          '2. You might be breaking the Rules of Hooks\n' +
          '3. You might have more than one copy of React in the same app\n' +
          'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
      );
    });
  }

  it('bails out in the render phase if all of the state is the same', async () => {
    const {useState, useLayoutEffect} = React;

    function Child({text}) {
      Scheduler.log('Child: ' + text);
      return text;
    }

    let setCounter1;
    let setCounter2;
    function Parent() {
      const [counter1, _setCounter1] = useState(0);
      setCounter1 = _setCounter1;
      const [counter2, _setCounter2] = useState(0);
      setCounter2 = _setCounter2;

      const text = `${counter1}, ${counter2}`;
      Scheduler.log(`Parent: ${text}`);
      useLayoutEffect(() => {
        Scheduler.log(`Effect: ${text}`);
      });
      return <Child text={text} />;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    root.update(<Parent />);
    await waitForAll(['Parent: 0, 0', 'Child: 0, 0', 'Effect: 0, 0']);
    expect(root).toMatchRenderedOutput('0, 0');

    // Normal update
    await act(() => {
      setCounter1(1);
      setCounter2(1);
    });

    assertLog(['Parent: 1, 1', 'Child: 1, 1', 'Effect: 1, 1']);

    // Update that bails out.
    await act(() => setCounter1(1));
    assertLog(['Parent: 1, 1']);

    // This time, one of the state updates but the other one doesn't. So we
    // can't bail out.
    await act(() => {
      setCounter1(1);
      setCounter2(2);
    });

    assertLog(['Parent: 1, 2', 'Child: 1, 2', 'Effect: 1, 2']);

    // Lots of updates that eventually resolve to the current values.
    await act(() => {
      setCounter1(9);
      setCounter2(3);
      setCounter1(4);
      setCounter2(7);
      setCounter1(1);
      setCounter2(2);
    });

    // Because the final values are the same as the current values, the
    // component bails out.
    assertLog(['Parent: 1, 2']);

    // prepare to check SameValue
    await act(() => {
      setCounter1(0 / -1);
      setCounter2(NaN);
    });

    assertLog(['Parent: 0, NaN', 'Child: 0, NaN', 'Effect: 0, NaN']);

    // check if re-setting to negative 0 / NaN still bails out
    await act(() => {
      setCounter1(0 / -1);
      setCounter2(NaN);
      setCounter2(Infinity);
      setCounter2(NaN);
    });

    assertLog(['Parent: 0, NaN']);

    // check if changing negative 0 to positive 0 does not bail out
    await act(() => {
      setCounter1(0);
    });
    assertLog(['Parent: 0, NaN', 'Child: 0, NaN', 'Effect: 0, NaN']);
  });

  it('bails out in render phase if all the state is the same and props bail out with memo', async () => {
    const {useState, memo} = React;

    function Child({text}) {
      Scheduler.log('Child: ' + text);
      return text;
    }

    let setCounter1;
    let setCounter2;
    function Parent({theme}) {
      const [counter1, _setCounter1] = useState(0);
      setCounter1 = _setCounter1;
      const [counter2, _setCounter2] = useState(0);
      setCounter2 = _setCounter2;

      const text = `${counter1}, ${counter2} (${theme})`;
      Scheduler.log(`Parent: ${text}`);
      return <Child text={text} />;
    }

    Parent = memo(Parent);

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    root.update(<Parent theme="light" />);
    await waitForAll(['Parent: 0, 0 (light)', 'Child: 0, 0 (light)']);
    expect(root).toMatchRenderedOutput('0, 0 (light)');

    // Normal update
    await act(() => {
      setCounter1(1);
      setCounter2(1);
    });

    assertLog(['Parent: 1, 1 (light)', 'Child: 1, 1 (light)']);

    // Update that bails out.
    await act(() => setCounter1(1));
    assertLog(['Parent: 1, 1 (light)']);

    // This time, one of the state updates but the other one doesn't. So we
    // can't bail out.
    await act(() => {
      setCounter1(1);
      setCounter2(2);
    });

    assertLog(['Parent: 1, 2 (light)', 'Child: 1, 2 (light)']);

    // Updates bail out, but component still renders because props
    // have changed
    await act(() => {
      setCounter1(1);
      setCounter2(2);
      root.update(<Parent theme="dark" />);
    });

    assertLog(['Parent: 1, 2 (dark)', 'Child: 1, 2 (dark)']);

    // Both props and state bail out
    await act(() => {
      setCounter1(1);
      setCounter2(2);
      root.update(<Parent theme="dark" />);
    });

    assertLog(['Parent: 1, 2 (dark)']);
  });

  it('warns about setState second argument', async () => {
    const {useState} = React;

    let setCounter;
    function Counter() {
      const [counter, _setCounter] = useState(0);
      setCounter = _setCounter;

      Scheduler.log(`Count: ${counter}`);
      return counter;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    root.update(<Counter />);
    await waitForAll(['Count: 0']);
    expect(root).toMatchRenderedOutput('0');

    await act(() =>
      setCounter(1, () => {
        throw new Error('Expected to ignore the callback.');
      }),
    );
    assertConsoleErrorDev([
      'State updates from the useState() and useReducer() Hooks ' +
        "don't support the second callback argument. " +
        'To execute a side effect after rendering, ' +
        'declare it in the component body with useEffect().',
    ]);
    assertLog(['Count: 1']);
    expect(root).toMatchRenderedOutput('1');
  });

  it('warns about dispatch second argument', async () => {
    const {useReducer} = React;

    let dispatch;
    function Counter() {
      const [counter, _dispatch] = useReducer((s, a) => a, 0);
      dispatch = _dispatch;

      Scheduler.log(`Count: ${counter}`);
      return counter;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    root.update(<Counter />);
    await waitForAll(['Count: 0']);
    expect(root).toMatchRenderedOutput('0');

    await act(() =>
      dispatch(1, () => {
        throw new Error('Expected to ignore the callback.');
      }),
    );
    assertConsoleErrorDev([
      'State updates from the useState() and useReducer() Hooks ' +
        "don't support the second callback argument. " +
        'To execute a side effect after rendering, ' +
        'declare it in the component body with useEffect().',
    ]);
    assertLog(['Count: 1']);
    expect(root).toMatchRenderedOutput('1');
  });

  it('never bails out if context has changed', async () => {
    const {useState, useLayoutEffect, useContext} = React;

    const ThemeContext = React.createContext('light');

    let setTheme;
    function ThemeProvider({children}) {
      const [theme, _setTheme] = useState('light');
      Scheduler.log('Theme: ' + theme);
      setTheme = _setTheme;
      return (
        <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
      );
    }

    function Child({text}) {
      Scheduler.log('Child: ' + text);
      return text;
    }

    let setCounter;
    function Parent() {
      const [counter, _setCounter] = useState(0);
      setCounter = _setCounter;

      const theme = useContext(ThemeContext);

      const text = `${counter} (${theme})`;
      Scheduler.log(`Parent: ${text}`);
      useLayoutEffect(() => {
        Scheduler.log(`Effect: ${text}`);
      });
      return <Child text={text} />;
    }
    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    await act(() => {
      root.update(
        <ThemeProvider>
          <Parent />
        </ThemeProvider>,
      );
    });

    assertLog([
      'Theme: light',
      'Parent: 0 (light)',
      'Child: 0 (light)',
      'Effect: 0 (light)',
    ]);
    expect(root).toMatchRenderedOutput('0 (light)');

    // Updating the theme to the same value doesn't cause the consumers
    // to re-render.
    setTheme('light');
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0 (light)');

    // Normal update
    await act(() => setCounter(1));
    assertLog(['Parent: 1 (light)', 'Child: 1 (light)', 'Effect: 1 (light)']);
    expect(root).toMatchRenderedOutput('1 (light)');

    // Update that doesn't change state, so it bails out
    await act(() => setCounter(1));
    assertLog(['Parent: 1 (light)']);
    expect(root).toMatchRenderedOutput('1 (light)');

    // Update that doesn't change state, but the context changes, too, so it
    // can't bail out
    await act(() => {
      setCounter(1);
      setTheme('dark');
    });

    assertLog([
      'Theme: dark',
      'Parent: 1 (dark)',
      'Child: 1 (dark)',
      'Effect: 1 (dark)',
    ]);
    expect(root).toMatchRenderedOutput('1 (dark)');
  });

  it('can bail out without calling render phase (as an optimization) if queue is known to be empty', async () => {
    const {useState, useLayoutEffect} = React;

    function Child({text}) {
      Scheduler.log('Child: ' + text);
      return text;
    }

    let setCounter;
    function Parent() {
      const [counter, _setCounter] = useState(0);
      setCounter = _setCounter;
      Scheduler.log('Parent: ' + counter);
      useLayoutEffect(() => {
        Scheduler.log('Effect: ' + counter);
      });
      return <Child text={counter} />;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    root.update(<Parent />);
    await waitForAll(['Parent: 0', 'Child: 0', 'Effect: 0']);
    expect(root).toMatchRenderedOutput('0');

    // Normal update
    await act(() => setCounter(1));
    assertLog(['Parent: 1', 'Child: 1', 'Effect: 1']);
    expect(root).toMatchRenderedOutput('1');

    // Update to the same state. React doesn't know if the queue is empty
    // because the alternate fiber has pending update priority, so we have to
    // enter the render phase before we can bail out. But we bail out before
    // rendering the child, and we don't fire any effects.
    await act(() => setCounter(1));
    assertLog(['Parent: 1']);
    expect(root).toMatchRenderedOutput('1');

    // Update to the same state again. This times, neither fiber has pending
    // update priority, so we can bail out before even entering the render phase.
    await act(() => setCounter(1));
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('1');

    // This changes the state to something different so it renders normally.
    await act(() => setCounter(2));
    assertLog(['Parent: 2', 'Child: 2', 'Effect: 2']);
    expect(root).toMatchRenderedOutput('2');

    // prepare to check SameValue
    await act(() => {
      setCounter(0);
    });
    assertLog(['Parent: 0', 'Child: 0', 'Effect: 0']);
    expect(root).toMatchRenderedOutput('0');

    // Update to the same state for the first time to flush the queue
    await act(() => {
      setCounter(0);
    });

    assertLog(['Parent: 0']);
    expect(root).toMatchRenderedOutput('0');

    // Update again to the same state. Should bail out.
    await act(() => {
      setCounter(0);
    });
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0');

    // Update to a different state (positive 0 to negative 0)
    await act(() => {
      setCounter(0 / -1);
    });
    assertLog(['Parent: 0', 'Child: 0', 'Effect: 0']);
    expect(root).toMatchRenderedOutput('0');
  });

  it('bails out multiple times in a row without entering render phase', async () => {
    const {useState} = React;

    function Child({text}) {
      Scheduler.log('Child: ' + text);
      return text;
    }

    let setCounter;
    function Parent() {
      const [counter, _setCounter] = useState(0);
      setCounter = _setCounter;
      Scheduler.log('Parent: ' + counter);
      return <Child text={counter} />;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    root.update(<Parent />);
    await waitForAll(['Parent: 0', 'Child: 0']);
    expect(root).toMatchRenderedOutput('0');

    const update = value => {
      setCounter(previous => {
        Scheduler.log(`Compute state (${previous} -> ${value})`);
        return value;
      });
    };
    ReactTestRenderer.unstable_batchedUpdates(() => {
      update(0);
      update(0);
      update(0);
      update(1);
      update(2);
      update(3);
    });

    assertLog([
      // The first four updates were eagerly computed, because the queue is
      // empty before each one.
      'Compute state (0 -> 0)',
      'Compute state (0 -> 0)',
      'Compute state (0 -> 0)',
      // The fourth update doesn't bail out
      'Compute state (0 -> 1)',
      // so subsequent updates can't be eagerly computed.
    ]);

    // Now let's enter the render phase
    await waitForAll([
      // We don't need to re-compute the first four updates. Only the final two.
      'Compute state (1 -> 2)',
      'Compute state (2 -> 3)',
      'Parent: 3',
      'Child: 3',
    ]);
    expect(root).toMatchRenderedOutput('3');
  });

  it('can rebase on top of a previously skipped update', async () => {
    const {useState} = React;

    function Child({text}) {
      Scheduler.log('Child: ' + text);
      return text;
    }

    let setCounter;
    function Parent() {
      const [counter, _setCounter] = useState(1);
      setCounter = _setCounter;
      Scheduler.log('Parent: ' + counter);
      return <Child text={counter} />;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    root.update(<Parent />);
    await waitForAll(['Parent: 1', 'Child: 1']);
    expect(root).toMatchRenderedOutput('1');

    const update = compute => {
      setCounter(previous => {
        const value = compute(previous);
        Scheduler.log(`Compute state (${previous} -> ${value})`);
        return value;
      });
    };

    // Update at transition priority
    React.startTransition(() => update(n => n * 100));
    // The new state is eagerly computed.
    assertLog(['Compute state (1 -> 100)']);

    // but before it's flushed, a higher priority update interrupts it.
    root.unstable_flushSync(() => {
      update(n => n + 5);
    });
    assertLog([
      // The eagerly computed state was completely skipped
      'Compute state (1 -> 6)',
      'Parent: 6',
      'Child: 6',
    ]);
    expect(root).toMatchRenderedOutput('6');

    // Now when we finish the first update, the second update is rebased on top.
    // Notice we didn't have to recompute the first update even though it was
    // skipped in the previous render.
    await waitForAll([
      'Compute state (100 -> 105)',
      'Parent: 105',
      'Child: 105',
    ]);
    expect(root).toMatchRenderedOutput('105');
  });

  it('warns about variable number of dependencies', async () => {
    const {useLayoutEffect} = React;
    function App(props) {
      useLayoutEffect(() => {
        Scheduler.log('Did commit: ' + props.dependencies.join(', '));
      }, props.dependencies);
      return props.dependencies;
    }
    let root;
    await act(() => {
      root = ReactTestRenderer.create(<App dependencies={['A']} />, {
        unstable_isConcurrent: true,
      });
    });
    assertLog(['Did commit: A']);
    await act(() => {
      root.update(<App dependencies={['A', 'B']} />);
    });
    assertConsoleErrorDev([
      'The final argument passed to useLayoutEffect changed size ' +
        'between renders. The order and size of this array must remain ' +
        'constant.\n' +
        '\n' +
        'Previous: [A]\n' +
        'Incoming: [A, B]\n' +
        '    in App (at **)',
    ]);
  });

  it('warns if switching from dependencies to no dependencies', async () => {
    const {useMemo} = React;
    function App({text, hasDeps}) {
      const resolvedText = useMemo(
        () => {
          Scheduler.log('Compute');
          return text.toUpperCase();
        },
        hasDeps ? null : [text],
      );
      return resolvedText;
    }

    let root;
    await act(() => {
      root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    });
    await act(() => {
      root.update(<App text="Hello" hasDeps={true} />);
    });
    assertLog(['Compute']);
    expect(root).toMatchRenderedOutput('HELLO');

    await act(() => {
      root.update(<App text="Hello" hasDeps={false} />);
    });
    assertConsoleErrorDev([
      'useMemo received a final argument during this render, but ' +
        'not during the previous render. Even though the final argument is ' +
        'optional, its type cannot change between renders.\n' +
        '    in App (at **)',
    ]);
  });

  it('warns if deps is not an array', async () => {
    const {useEffect, useLayoutEffect, useMemo, useCallback} = React;

    function App(props) {
      useEffect(() => {}, props.deps);
      useLayoutEffect(() => {}, props.deps);
      useMemo(() => {}, props.deps);
      useCallback(() => {}, props.deps);
      return null;
    }

    await act(() => {
      ReactTestRenderer.create(<App deps={'hello'} />, {
        unstable_isConcurrent: true,
      });
    });
    assertConsoleErrorDev([
      'useEffect received a final argument that is not an array (instead, received `string`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useLayoutEffect received a final argument that is not an array (instead, received `string`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useMemo received a final argument that is not an array (instead, received `string`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useCallback received a final argument that is not an array (instead, received `string`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
    ]);
    await act(() => {
      ReactTestRenderer.create(<App deps={100500} />, {
        unstable_isConcurrent: true,
      });
    });
    assertConsoleErrorDev([
      'useEffect received a final argument that is not an array (instead, received `number`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useLayoutEffect received a final argument that is not an array (instead, received `number`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useMemo received a final argument that is not an array (instead, received `number`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useCallback received a final argument that is not an array (instead, received `number`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
    ]);
    await act(() => {
      ReactTestRenderer.create(<App deps={{}} />, {
        unstable_isConcurrent: true,
      });
    });
    assertConsoleErrorDev([
      'useEffect received a final argument that is not an array (instead, received `object`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useLayoutEffect received a final argument that is not an array (instead, received `object`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useMemo received a final argument that is not an array (instead, received `object`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
      'useCallback received a final argument that is not an array (instead, received `object`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
    ]);

    await act(() => {
      ReactTestRenderer.create(<App deps={[]} />, {
        unstable_isConcurrent: true,
      });
      ReactTestRenderer.create(<App deps={null} />, {
        unstable_isConcurrent: true,
      });
      ReactTestRenderer.create(<App deps={undefined} />, {
        unstable_isConcurrent: true,
      });
    });
  });

  it('warns if deps is not an array for useImperativeHandle', async () => {
    const {useImperativeHandle} = React;

    const App = React.forwardRef((props, ref) => {
      useImperativeHandle(ref, () => {}, props.deps);
      return null;
    });
    App.displayName = 'App';

    await act(() => {
      ReactTestRenderer.create(<App deps={'hello'} />, {
        unstable_isConcurrent: true,
      });
    });
    assertConsoleErrorDev([
      'useImperativeHandle received a final argument that is not an array (instead, received `string`). ' +
        'When specified, the final argument must be an array.\n' +
        '    in App (at **)',
    ]);
    await act(() => {
      ReactTestRenderer.create(<App deps={null} />, {
        unstable_isConcurrent: true,
      });
    });
    await act(() => {
      ReactTestRenderer.create(<App deps={[]} />, {
        unstable_isConcurrent: true,
      });
    });
    await act(() => {
      ReactTestRenderer.create(<App deps={undefined} />, {
        unstable_isConcurrent: true,
      });
    });
  });

  it('does not forget render phase useState updates inside an effect', async () => {
    const {useState, useEffect} = React;

    function Counter() {
      const [counter, setCounter] = useState(0);
      if (counter === 0) {
        setCounter(x => x + 1);
        setCounter(x => x + 1);
      }
      useEffect(() => {
        setCounter(x => x + 1);
        setCounter(x => x + 1);
      }, []);
      return counter;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    await act(() => {
      root.update(<Counter />);
    });
    expect(root).toMatchRenderedOutput('4');
  });

  it('does not forget render phase useReducer updates inside an effect with hoisted reducer', async () => {
    const {useReducer, useEffect} = React;

    const reducer = x => x + 1;
    function Counter() {
      const [counter, increment] = useReducer(reducer, 0);
      if (counter === 0) {
        increment();
        increment();
      }
      useEffect(() => {
        increment();
        increment();
      }, []);
      return counter;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    await act(() => {
      root.update(<Counter />);
    });
    expect(root).toMatchRenderedOutput('4');
  });

  it('does not forget render phase useReducer updates inside an effect with inline reducer', async () => {
    const {useReducer, useEffect} = React;

    function Counter() {
      const [counter, increment] = useReducer(x => x + 1, 0);
      if (counter === 0) {
        increment();
        increment();
      }
      useEffect(() => {
        increment();
        increment();
      }, []);
      return counter;
    }

    const root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    await act(() => {
      root.update(<Counter />);
    });
    expect(root).toMatchRenderedOutput('4');
  });

  it('warns for bad useImperativeHandle first arg', async () => {
    const {useImperativeHandle} = React;
    function App() {
      useImperativeHandle({
        focus() {},
      });
      return null;
    }

    await expect(async () => {
      await act(() => {
        ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
      });
    }).rejects.toThrow('create is not a function');
    assertConsoleErrorDev([
      'Expected useImperativeHandle() second argument to be a function ' +
        'that creates a handle. Instead received: undefined.\n' +
        '    in App (at **)',
      'Expected useImperativeHandle() first argument to either be a ' +
        'ref callback or React.createRef() object. ' +
        'Instead received: an object with keys {focus}.\n' +
        '    in App (at **)',
    ]);
  });

  it('warns for bad useImperativeHandle second arg', async () => {
    const {useImperativeHandle} = React;
    const App = React.forwardRef((props, ref) => {
      useImperativeHandle(ref, {
        focus() {},
      });
      return null;
    });
    App.displayName = 'App';

    await act(() => {
      ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
    });
    assertConsoleErrorDev([
      'Expected useImperativeHandle() second argument to be a function ' +
        'that creates a handle. Instead received: object.\n' +
        '    in App (at **)',
    ]);
  });

  // https://github.com/facebook/react/issues/14022
  it('works with ReactDOMServer calls inside a component', async () => {
    const {useState} = React;
    function App(props) {
      const markup1 = ReactDOMServer.renderToString(<p>hello</p>);
      const markup2 = ReactDOMServer.renderToStaticMarkup(<p>bye</p>);
      const [counter] = useState(0);
      return markup1 + counter + markup2;
    }
    let root;
    await act(() => {
      root = ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
    });
    expect(root.toJSON()).toMatchSnapshot();
  });

  it("throws when calling hooks inside .memo's compare function", async () => {
    const {useState} = React;
    function App() {
      useState(0);
      return null;
    }
    const MemoApp = React.memo(App, () => {
      useState(0);
      return false;
    });

    let root;
    await act(() => {
      root = ReactTestRenderer.create(<MemoApp />, {
        unstable_isConcurrent: true,
      });
    });
    // trying to render again should trigger comparison and throw
    await expect(
      act(() => {
        root.update(<MemoApp />);
      }),
    ).rejects.toThrow(
      'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
        ' one of the following reasons:\n' +
        '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
        '2. You might be breaking the Rules of Hooks\n' +
        '3. You might have more than one copy of React in the same app\n' +
        'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
    );
    // the next round, it does a fresh mount, so should render
    await expect(
      act(() => {
        root.update(<MemoApp />);
      }),
    ).resolves.not.toThrow(
      'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
        ' one of the following reasons:\n' +
        '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
        '2. You might be breaking the Rules of Hooks\n' +
        '3. You might have more than one copy of React in the same app\n' +
        'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
    );
    // and then again, fail
    await expect(
      act(() => {
        root.update(<MemoApp />);
      }),
    ).rejects.toThrow(
      'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
        ' one of the following reasons:\n' +
        '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
        '2. You might be breaking the Rules of Hooks\n' +
        '3. You might have more than one copy of React in the same app\n' +
        'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
    );
  });

  it('warns when calling hooks inside useMemo', async () => {
    const {useMemo, useState} = React;
    function App() {
      useMemo(() => {
        useState(0);
      });
      return null;
    }
    await act(() => {
      ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
    });
    assertConsoleErrorDev([
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
    ]);
  });

  it('warns when reading context inside useMemo', async () => {
    const {useMemo, createContext} = React;
    const ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const ThemeContext = createContext('light');
    function App() {
      return useMemo(() => {
        return ReactSharedInternals.H.readContext(ThemeContext);
      }, []);
    }

    await act(() => {
      ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
    });
    assertConsoleErrorDev([
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in App (at **)',
    ]);
  });

  it('warns when reading context inside useMemo after reading outside it', async () => {
    const {useMemo, createContext} = React;
    const ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const ThemeContext = createContext('light');
    let firstRead, secondRead;
    function App() {
      firstRead = ReactSharedInternals.H.readContext(ThemeContext);
      useMemo(() => {});
      secondRead = ReactSharedInternals.H.readContext(ThemeContext);
      return useMemo(() => {
        return ReactSharedInternals.H.readContext(ThemeContext);
      }, []);
    }

    await act(() => {
      ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
    });
    assertConsoleErrorDev([
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in App (at **)',
    ]);
    expect(firstRead).toBe('light');
    expect(secondRead).toBe('light');
  });

  // Throws because there's no runtime cost for being strict here.
  it('throws when reading context inside useEffect', async () => {
    const {useEffect, createContext} = React;
    const ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const ThemeContext = createContext('light');
    function App() {
      useEffect(() => {
        ReactSharedInternals.H.readContext(ThemeContext);
      });
      return null;
    }

    await act(async () => {
      ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
      // The exact message doesn't matter, just make sure we don't allow this
      await waitForThrow('Context can only be read while React is rendering');
    });
  });

  // Throws because there's no runtime cost for being strict here.
  it('throws when reading context inside useLayoutEffect', async () => {
    const {useLayoutEffect, createContext} = React;
    const ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const ThemeContext = createContext('light');
    function App() {
      useLayoutEffect(() => {
        ReactSharedInternals.H.readContext(ThemeContext);
      });
      return null;
    }

    await expect(
      act(() => {
        ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
      }),
    ).rejects.toThrow(
      // The exact message doesn't matter, just make sure we don't allow this
      'Context can only be read while React is rendering',
    );
  });

  it('warns when reading context inside useReducer', async () => {
    const {useReducer, createContext} = React;
    const ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const ThemeContext = createContext('light');
    function App() {
      const [state, dispatch] = useReducer((s, action) => {
        ReactSharedInternals.H.readContext(ThemeContext);
        return action;
      }, 0);
      if (state === 0) {
        dispatch(1);
      }
      return null;
    }

    await act(() => {
      ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
    });
    assertConsoleErrorDev([
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in App (at **)',
    ]);
  });

  // Edge case.
  it('warns when reading context inside eager useReducer', async () => {
    const {useState, createContext} = React;
    const ThemeContext = createContext('light');

    const ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    let _setState;
    function Fn() {
      const [, setState] = useState(0);
      _setState = setState;
      return null;
    }

    class Cls extends React.Component {
      render() {
        _setState(() => ReactSharedInternals.H.readContext(ThemeContext));

        return null;
      }
    }

    await act(() => {
      ReactTestRenderer.create(
        <>
          <Fn />
          <Cls />
        </>,
        {unstable_isConcurrent: true},
      );
    });
    assertConsoleErrorDev([
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in Cls (at **)',
      'Cannot update a component (`Fn`) while rendering a different component (`Cls`). ' +
        'To locate the bad setState() call inside `Cls`, ' +
        'follow the stack trace as described in https://react.dev/link/setstate-in-render\n' +
        '    in Cls (at **)',
    ]);
  });

  it('warns when calling hooks inside useReducer', async () => {
    const {useReducer, useState, useRef} = React;

    function App() {
      const [value, dispatch] = useReducer((state, action) => {
        useRef(0);
        return state + 1;
      }, 0);
      if (value === 0) {
        dispatch('foo');
      }
      useState();
      return value;
    }

    await expect(async () => {
      await act(() => {
        ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
      });
    }).rejects.toThrow(
      'Update hook called on initial render. This is likely a bug in React. Please file an issue.',
    );
    assertConsoleErrorDev([
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
      'React has detected a change in the order of Hooks called by App. ' +
        'This will lead to bugs and errors if not fixed. For more information, ' +
        'read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n' +
        '\n' +
        '   Previous render            Next render\n' +
        '   ------------------------------------------------------\n' +
        '1. useReducer                 useReducer\n' +
        '2. useState                   useRef\n' +
        '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
        '\n' +
        '    in App (at **)',
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
    ]);
  });

  it("warns when calling hooks inside useState's initialize function", async () => {
    const {useState, useRef} = React;
    function App() {
      useState(() => {
        useRef(0);
        return 0;
      });
      return null;
    }
    await act(() => {
      ReactTestRenderer.create(<App />, {unstable_isConcurrent: true});
    });
    assertConsoleErrorDev([
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
    ]);
  });

  it('resets warning internal state when interrupted by an error', async () => {
    const ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const ThemeContext = React.createContext('light');
    function App() {
      React.useMemo(() => {
        // Trigger warnings
        ReactSharedInternals.H.readContext(ThemeContext);
        React.useRef();
        // Interrupt exit from a Hook
        throw new Error('No.');
      }, []);
    }

    class Boundary extends React.Component {
      state = {};
      static getDerivedStateFromError(error) {
        return {err: true};
      }
      render() {
        if (this.state.err) {
          return 'Oops';
        }
        return this.props.children;
      }
    }

    await act(() => {
      ReactTestRenderer.create(
        <Boundary>
          <App />
        </Boundary>,
        {unstable_isConcurrent: true},
      );
    });
    assertConsoleErrorDev([
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in App (at **)',
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in App (at **)',
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
    ]);

    function Valid() {
      React.useState();
      React.useMemo(() => {});
      React.useReducer(() => {});
      React.useEffect(() => {});
      React.useLayoutEffect(() => {});
      React.useCallback(() => {});
      React.useRef();
      React.useImperativeHandle(
        () => {},
        () => {},
      );
      if (__DEV__) {
        React.useDebugValue();
      }
      return null;
    }
    // Verify it doesn't think we're still inside a Hook.
    // Should have no warnings.
    await act(() => {
      ReactTestRenderer.create(<Valid />, {unstable_isConcurrent: true});
    });

    // Verify warnings don't get permanently disabled.
    await act(() => {
      ReactTestRenderer.create(
        <Boundary>
          <App />
        </Boundary>,
        {unstable_isConcurrent: true},
      );
    });
    assertConsoleErrorDev([
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in App (at **)',
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, ' +
        'but not inside Hooks like useReducer() or useMemo().\n' +
        '    in App (at **)',
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see https://react.dev/link/rules-of-hooks\n' +
        '    in App (at **)',
    ]);
  });

  it('double-invokes components with Hooks in Strict Mode', async () => {
    const {useState, StrictMode} = React;
    let renderCount = 0;

    function NoHooks() {
      renderCount++;
      return <div />;
    }

    function HasHooks() {
      useState(0);
      renderCount++;
      return <div />;
    }

    const FwdRef = React.forwardRef((props, ref) => {
      renderCount++;
      return <div />;
    });

    const FwdRefHasHooks = React.forwardRef((props, ref) => {
      useState(0);
      renderCount++;
      return <div />;
    });

    const Memo = React.memo(props => {
      renderCount++;
      return <div />;
    });

    const MemoHasHooks = React.memo(props => {
      useState(0);
      renderCount++;
      return <div />;
    });

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    });

    renderCount = 0;
    await act(() => {
      renderer.update(<NoHooks />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(<NoHooks />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <NoHooks />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <NoHooks />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1);

    renderCount = 0;
    await act(() => {
      renderer.update(<FwdRef />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(<FwdRef />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <FwdRef />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <FwdRef />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1);

    renderCount = 0;
    await act(() => {
      renderer.update(<Memo arg={1} />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(<Memo arg={2} />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <Memo arg={1} />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <Memo arg={2} />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1);

    renderCount = 0;
    await act(() => {
      renderer.update(<HasHooks />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(<HasHooks />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <HasHooks />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1); // Has Hooks
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <HasHooks />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1); // Has Hooks

    renderCount = 0;
    await act(() => {
      renderer.update(<FwdRefHasHooks />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(<FwdRefHasHooks />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <FwdRefHasHooks />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1); // Has Hooks
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <FwdRefHasHooks />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1); // Has Hooks

    renderCount = 0;
    await act(() => {
      renderer.update(<MemoHasHooks arg={1} />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(<MemoHasHooks arg={2} />);
    });
    expect(renderCount).toBe(1);
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <MemoHasHooks arg={1} />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1); // Has Hooks
    renderCount = 0;
    await act(() => {
      renderer.update(
        <StrictMode>
          <MemoHasHooks arg={2} />
        </StrictMode>,
      );
    });
    expect(renderCount).toBe(__DEV__ ? 2 : 1); // Has Hooks
  });

  it('double-invokes useMemo in DEV StrictMode despite []', async () => {
    const {useMemo, StrictMode} = React;

    let useMemoCount = 0;
    function BadUseMemo() {
      useMemo(() => {
        useMemoCount++;
      }, []);
      return <div />;
    }

    useMemoCount = 0;
    await act(() => {
      ReactTestRenderer.create(
        <StrictMode>
          <BadUseMemo />
        </StrictMode>,
        {unstable_isConcurrent: true},
      );
    });
    expect(useMemoCount).toBe(__DEV__ ? 2 : 1); // Has Hooks
  });

  describe('hook ordering', () => {
    const useCallbackHelper = () => React.useCallback(() => {}, []);
    const useContextHelper = () => React.useContext(React.createContext());
    const useDebugValueHelper = () => React.useDebugValue('abc');
    const useEffectHelper = () => React.useEffect(() => () => {}, []);
    const useImperativeHandleHelper = () => {
      React.useImperativeHandle({current: null}, () => ({}), []);
    };
    const useLayoutEffectHelper = () =>
      React.useLayoutEffect(() => () => {}, []);
    const useMemoHelper = () => React.useMemo(() => 123, []);
    const useReducerHelper = () => React.useReducer((s, a) => a, 0);
    const useRefHelper = () => React.useRef(null);
    const useStateHelper = () => React.useState(0);

    // We don't include useImperativeHandleHelper in this set,
    // because it generates an additional warning about the inputs length changing.
    // We test it below with its own test.
    const orderedHooks = [
      useCallbackHelper,
      useContextHelper,
      useDebugValueHelper,
      useEffectHelper,
      useLayoutEffectHelper,
      useMemoHelper,
      useReducerHelper,
      useRefHelper,
      useStateHelper,
    ];

    // We don't include useContext or useDebugValue in this set,
    // because they aren't added to the hooks list and so won't throw.
    const hooksInList = [
      useCallbackHelper,
      useEffectHelper,
      useImperativeHandleHelper,
      useLayoutEffectHelper,
      useMemoHelper,
      useReducerHelper,
      useRefHelper,
      useStateHelper,
    ];

    const useTransitionHelper = () => React.useTransition();
    const useDeferredValueHelper = () =>
      React.useDeferredValue(0, {timeoutMs: 1000});

    orderedHooks.push(useTransitionHelper);
    orderedHooks.push(useDeferredValueHelper);

    hooksInList.push(useTransitionHelper);
    hooksInList.push(useDeferredValueHelper);

    const formatHookNamesToMatchErrorMessage = (hookNameA, hookNameB) => {
      return `use${hookNameA}${' '.repeat(24 - hookNameA.length)}${
        hookNameB ? `use${hookNameB}` : undefined
      }`;
    };

    orderedHooks.forEach((firstHelper, index) => {
      const secondHelper =
        index > 0
          ? orderedHooks[index - 1]
          : orderedHooks[orderedHooks.length - 1];

      const hookNameA = firstHelper.name
        .replace('use', '')
        .replace('Helper', '');
      const hookNameB = secondHelper.name
        .replace('use', '')
        .replace('Helper', '');

      it(`warns on using differently ordered hooks (${hookNameA}, ${hookNameB}) on subsequent renders`, async () => {
        function App(props) {
          if (props.update) {
            secondHelper();
            firstHelper();
          } else {
            firstHelper();
            secondHelper();
          }
          // This should not appear in the warning message because it occurs after the first mismatch
          useRefHelper();
          return null;
        }
        let root;
        await act(() => {
          root = ReactTestRenderer.create(<App update={false} />, {
            unstable_isConcurrent: true,
          });
        });
        try {
          await act(() => {
            root.update(<App update={true} />);
          });
        } catch (error) {
          // Swapping certain types of hooks will cause runtime errors.
          // This is okay as far as this test is concerned.
          // We just want to verify that warnings are always logged.
        }
        assertConsoleErrorDev([
          'React has detected a change in the order of Hooks called by App. ' +
            'This will lead to bugs and errors if not fixed. For more information, ' +
            'read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n' +
            '\n' +
            '   Previous render            Next render\n' +
            '   ------------------------------------------------------\n' +
            `1. ${formatHookNamesToMatchErrorMessage(hookNameA, hookNameB)}\n` +
            '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
            '\n' +
            '    in App (at **)',
        ]);

        // further warnings for this component are silenced
        try {
          await act(() => {
            root.update(<App update={false} />);
          });
        } catch (error) {
          // Swapping certain types of hooks will cause runtime errors.
          // This is okay as far as this test is concerned.
          // We just want to verify that warnings are always logged.
        }
      });

      it(`warns when more hooks (${hookNameA}, ${hookNameB}) are used during update than mount`, async () => {
        function App(props) {
          if (props.update) {
            firstHelper();
            secondHelper();
          } else {
            firstHelper();
          }
          return null;
        }
        let root;
        await act(() => {
          root = ReactTestRenderer.create(<App update={false} />, {
            unstable_isConcurrent: true,
          });
        });

        try {
          await act(() => {
            root.update(<App update={true} />);
          });
        } catch (error) {
          // Swapping certain types of hooks will cause runtime errors.
          // This is okay as far as this test is concerned.
          // We just want to verify that warnings are always logged.
        }
        assertConsoleErrorDev([
          'React has detected a change in the order of Hooks called by App. ' +
            'This will lead to bugs and errors if not fixed. For more information, ' +
            'read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n' +
            '\n' +
            '   Previous render            Next render\n' +
            '   ------------------------------------------------------\n' +
            `1. ${formatHookNamesToMatchErrorMessage(hookNameA, hookNameA)}\n` +
            `2. undefined                  use${hookNameB}\n` +
            '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
            '\n' +
            '    in App (at **)',
        ]);
      });
    });

    hooksInList.forEach((firstHelper, index) => {
      const secondHelper =
        index > 0
          ? hooksInList[index - 1]
          : hooksInList[hooksInList.length - 1];

      const hookNameA = firstHelper.name
        .replace('use', '')
        .replace('Helper', '');
      const hookNameB = secondHelper.name
        .replace('use', '')
        .replace('Helper', '');

      it(`warns when fewer hooks (${hookNameA}, ${hookNameB}) are used during update than mount`, async () => {
        function App(props) {
          if (props.update) {
            firstHelper();
          } else {
            firstHelper();
            secondHelper();
          }
          return null;
        }
        let root;
        await act(() => {
          root = ReactTestRenderer.create(<App update={false} />, {
            unstable_isConcurrent: true,
          });
        });

        await expect(async () => {
          await act(() => {
            root.update(<App update={true} />);
          });
        }).rejects.toThrow('Rendered fewer hooks than expected. ');
      });
    });

    it(
      'warns on using differently ordered hooks ' +
        '(useImperativeHandleHelper, useMemoHelper) on subsequent renders',
      async () => {
        function App(props) {
          if (props.update) {
            useMemoHelper();
            useImperativeHandleHelper();
          } else {
            useImperativeHandleHelper();
            useMemoHelper();
          }
          // This should not appear in the warning message because it occurs after the first mismatch
          useRefHelper();
          return null;
        }
        let root;
        await act(() => {
          root = ReactTestRenderer.create(<App update={false} />, {
            unstable_isConcurrent: true,
          });
        });
        await act(() => {
          root.update(<App update={true} />);
        }).catch(e => {});
        // Swapping certain types of hooks will cause runtime errors.
        // This is okay as far as this test is concerned.
        // We just want to verify that warnings are always logged.
        assertConsoleErrorDev([
          'React has detected a change in the order of Hooks called by App. ' +
            'This will lead to bugs and errors if not fixed. For more information, ' +
            'read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n' +
            '\n' +
            '   Previous render            Next render\n' +
            '   ------------------------------------------------------\n' +
            `1. ${formatHookNamesToMatchErrorMessage(
              'ImperativeHandle',
              'Memo',
            )}\n` +
            '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
            '\n' +
            '    in App (at **)',
        ]);

        // further warnings for this component are silenced
        await act(() => {
          root.update(<App update={false} />);
        });
      },
    );

    it('detects a bad hook order even if the component throws', async () => {
      const {useState, useReducer} = React;
      function useCustomHook() {
        useState(0);
      }
      function App(props) {
        if (props.update) {
          useCustomHook();
          useReducer((s, a) => a, 0);
          throw new Error('custom error');
        } else {
          useReducer((s, a) => a, 0);
          useCustomHook();
        }
        return null;
      }
      let root;
      await act(() => {
        root = ReactTestRenderer.create(<App update={false} />, {
          unstable_isConcurrent: true,
        });
      });
      await expect(async () => {
        await act(() => {
          root.update(<App update={true} />);
        });
      }).rejects.toThrow('custom error');
      assertConsoleErrorDev([
        'React has detected a change in the order of Hooks called by App. ' +
          'This will lead to bugs and errors if not fixed. For more information, ' +
          'read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n' +
          '\n' +
          '   Previous render            Next render\n' +
          '   ------------------------------------------------------\n' +
          '1. useReducer                 useState\n' +
          '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
          '\n' +
          '    in App (at **)',
      ]);
    });
  });

  // Regression test for #14674
  it('does not swallow original error when updating another component in render phase', async () => {
    const {useState} = React;

    let _setState;
    function A() {
      const [, setState] = useState(0);
      _setState = setState;
      return null;
    }

    function B() {
      _setState(() => {
        throw new Error('Hello');
      });
      return null;
    }

    await expect(async () => {
      await act(() => {
        ReactTestRenderer.create(
          <>
            <A />
            <B />
          </>,
          {unstable_isConcurrent: true},
        );
      });
    }).rejects.toThrow('Hello');
    assertConsoleErrorDev([
      'Cannot update a component (`A`) while rendering a different component (`B`). ' +
        'To locate the bad setState() call inside `B`, ' +
        'follow the stack trace as described in https://react.dev/link/setstate-in-render\n' +
        '    in B (at **)',
    ]);
  });

  // Regression test for https://github.com/facebook/react/issues/15057
  it('does not fire a false positive warning when previous effect unmounts the component', async () => {
    const {useState, useEffect} = React;
    let globalListener;

    function A() {
      const [show, setShow] = useState(true);
      function hideMe() {
        setShow(false);
      }
      return show ? <B hideMe={hideMe} /> : null;
    }

    function B(props) {
      return <C {...props} />;
    }

    function C({hideMe}) {
      const [, setState] = useState();

      useEffect(() => {
        let isStale = false;

        globalListener = () => {
          if (!isStale) {
            setState('hello');
          }
        };

        return () => {
          isStale = true;
          hideMe();
        };
      });
      return null;
    }

    await act(() => {
      ReactTestRenderer.create(<A />, {unstable_isConcurrent: true});
    });

    // Note: should *not* warn about updates on unmounted component.
    // Because there's no way for component to know it got unmounted.
    await expect(
      act(() => {
        globalListener();
        globalListener();
      }),
    ).resolves.not.toThrow();
  });

  // Regression test for https://github.com/facebook/react/issues/14790
  it('does not fire a false positive warning when suspending memo', async () => {
    const {Suspense, useState} = React;

    let isSuspended = true;
    let resolve;
    function trySuspend() {
      if (isSuspended) {
        throw new Promise(res => {
          resolve = () => {
            isSuspended = false;
            res();
          };
        });
      }
    }

    function Child() {
      useState();
      trySuspend();
      return 'hello';
    }

    const Wrapper = React.memo(Child);
    let root;
    await act(() => {
      root = ReactTestRenderer.create(
        <Suspense fallback="loading">
          <Wrapper />
        </Suspense>,
        {unstable_isConcurrent: true},
      );
    });
    expect(root).toMatchRenderedOutput('loading');
    await act(resolve);
    expect(root).toMatchRenderedOutput('hello');
  });

  // Regression test for https://github.com/facebook/react/issues/14790
  it('does not fire a false positive warning when suspending forwardRef', async () => {
    const {Suspense, useState} = React;

    let isSuspended = true;
    let resolve;
    function trySuspend() {
      if (isSuspended) {
        throw new Promise(res => {
          resolve = () => {
            isSuspended = false;
            res();
          };
        });
      }
    }

    function render(props, ref) {
      useState();
      trySuspend();
      return 'hello';
    }

    const Wrapper = React.forwardRef(render);
    let root;
    await act(() => {
      root = ReactTestRenderer.create(
        <Suspense fallback="loading">
          <Wrapper />
        </Suspense>,
        {unstable_isConcurrent: true},
      );
    });
    expect(root).toMatchRenderedOutput('loading');
    await act(resolve);
    expect(root).toMatchRenderedOutput('hello');
  });

  // Regression test for https://github.com/facebook/react/issues/14790
  it('does not fire a false positive warning when suspending memo(forwardRef)', async () => {
    const {Suspense, useState} = React;

    let isSuspended = true;
    let resolve;
    function trySuspend() {
      if (isSuspended) {
        throw new Promise(res => {
          resolve = () => {
            isSuspended = false;
            res();
          };
        });
      }
    }

    function render(props, ref) {
      useState();
      trySuspend();
      return 'hello';
    }

    const Wrapper = React.memo(React.forwardRef(render));
    let root;
    await act(() => {
      root = ReactTestRenderer.create(
        <Suspense fallback="loading">
          <Wrapper />
        </Suspense>,
        {unstable_isConcurrent: true},
      );
    });
    expect(root).toMatchRenderedOutput('loading');
    await act(resolve);
    expect(root).toMatchRenderedOutput('hello');
  });

  // Regression test for https://github.com/facebook/react/issues/15732
  it('resets hooks when an error is thrown in the middle of a list of hooks', async () => {
    const {useEffect, useState} = React;

    class ErrorBoundary extends React.Component {
      state = {hasError: false};

      static getDerivedStateFromError() {
        return {hasError: true};
      }

      render() {
        return (
          <Wrapper>
            {this.state.hasError ? 'Error!' : this.props.children}
          </Wrapper>
        );
      }
    }

    function Wrapper({children}) {
      return children;
    }

    let setShouldThrow;
    function Thrower() {
      const [shouldThrow, _setShouldThrow] = useState(false);
      setShouldThrow = _setShouldThrow;

      if (shouldThrow) {
        throw new Error('Throw!');
      }

      useEffect(() => {}, []);

      return 'Throw!';
    }

    let root;
    await act(() => {
      root = ReactTestRenderer.create(
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>,
        {unstable_isConcurrent: true},
      );
    });

    expect(root).toMatchRenderedOutput('Throw!');
    await act(() => setShouldThrow(true));
    expect(root).toMatchRenderedOutput('Error!');
  });
});

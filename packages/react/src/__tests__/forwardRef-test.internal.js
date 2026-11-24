/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('forwardRef', () => {
  let React;
  let ReactNoop;
  let Scheduler;
  let waitForAll;
  let act;

  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    act = InternalTestUtils.act;
  });

  ['object', 'callback', 'null', 'undefined', 'omitted'].forEach(refType => {
    it(
      'should preserve props identity during state updates with ' +
        refType +
        ' ref',
      async () => {
        let setCount;
        const receivedProps = [];
        const Child = React.memo(function Child({parentProps}) {
          Scheduler.log('Child');
          return parentProps.label;
        });
        const Component = React.forwardRef((props, ref) => {
          const [count, _setCount] = React.useState(0);
          setCount = _setCount;
          receivedProps.push(props);
          React.useMemo(() => {
            Scheduler.log('Memo');
            return props.label;
          }, [props]);
          Scheduler.log('Count: ' + count);
          return <Child parentProps={props} />;
        });
        const props = {label: 'stable'};
        switch (refType) {
          case 'object':
            props.ref = React.createRef();
            break;
          case 'callback':
            props.ref = () => {};
            break;
          case 'null':
            props.ref = null;
            break;
          case 'undefined':
            props.ref = undefined;
            break;
        }

        ReactNoop.render(React.createElement(Component, props));
        await waitForAll(['Memo', 'Count: 0', 'Child']);

        for (let count = 1; count <= 2; count++) {
          setCount(count);
          await waitForAll(['Count: ' + count]);
          expect(receivedProps[count]).toBe(receivedProps[0]);
          expect(receivedProps[count]).not.toHaveProperty('ref');
        }
      },
    );
  });

  it('should use new props from the parent and support reusing an earlier element', async () => {
    let setCount;
    const receivedProps = [];
    const Component = React.forwardRef((props, ref) => {
      const [, update] = React.useState(0);
      setCount = update;
      receivedProps.push(props);
      React.useMemo(() => {
        Scheduler.log('Memo: ' + props.label);
        return props.label;
      }, [props]);
      return props.label;
    });
    const ref = React.createRef();
    const firstElement = <Component ref={ref} label="first" />;

    ReactNoop.render(firstElement);
    await waitForAll(['Memo: first']);
    expect(ReactNoop).toMatchRenderedOutput('first');

    // Even equal parent props are a distinct input, as with function components.
    ReactNoop.render(<Component ref={ref} label="first" />);
    await waitForAll(['Memo: first']);
    expect(receivedProps[1]).not.toBe(receivedProps[0]);

    ReactNoop.render(<Component ref={ref} label="second" />);
    await waitForAll(['Memo: second']);
    expect(ReactNoop).toMatchRenderedOutput('second');
    expect(receivedProps[2]).not.toBe(receivedProps[1]);
    expect(receivedProps[0].label).toBe('first');

    ReactNoop.render(firstElement);
    await waitForAll(['Memo: first']);
    expect(ReactNoop).toMatchRenderedOutput('first');
    expect(receivedProps[3]).not.toBe(receivedProps[2]);
    expect(receivedProps[3]).not.toHaveProperty('ref');
    // Historical inputs need not keep their old cached copy alive. Once the
    // earlier element is current again, state updates should reuse its props.
    setCount(1);
    await waitForAll([]);
    expect(receivedProps[4]).toBe(receivedProps[3]);
  });

  it('should preserve props for state updates inside memo and update changed refs', async () => {
    let setCount;
    const receivedProps = [];
    const Component = React.memo(
      React.forwardRef((props, ref) => {
        const [count, _setCount] = React.useState(0);
        setCount = _setCount;
        receivedProps.push(props);
        React.useImperativeHandle(ref, () => ({count}), [count]);
        return props.label + ': ' + count;
      }),
    );
    const firstRef = React.createRef();
    const secondRef = React.createRef();

    await act(() => {
      ReactNoop.render(<Component ref={firstRef} label="stable" />);
    });
    expect(firstRef.current).toEqual({count: 0});

    await act(() => setCount(1));
    expect(receivedProps[1]).toBe(receivedProps[0]);
    expect(firstRef.current).toEqual({count: 1});

    await act(() => {
      ReactNoop.render(<Component ref={secondRef} label="stable" />);
    });
    expect(firstRef.current).toBe(null);
    expect(secondRef.current).toEqual({count: 1});
    expect(receivedProps[2]).not.toBe(receivedProps[1]);
    expect(receivedProps[2]).not.toHaveProperty('ref');

    await act(() => setCount(2));
    expect(receivedProps[3]).toBe(receivedProps[2]);
    expect(secondRef.current).toEqual({count: 2});
    expect(ReactNoop).toMatchRenderedOutput('stable: 2');

    // A parent update with equal props and the same ref still bails out.
    await act(() => {
      ReactNoop.render(<Component ref={secondRef} label="stable" />);
    });
    expect(receivedProps).toHaveLength(4);
  });

  it('should preserve props through strict mode and render-phase updates', async () => {
    let setCount;
    const receivedProps = [];
    const Component = React.forwardRef((props, ref) => {
      const [count, _setCount] = React.useState(0);
      setCount = _setCount;
      receivedProps.push(props);
      if (count < 2) {
        setCount(count + 1);
      }
      return count;
    });

    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Component ref={React.createRef()} />
        </React.StrictMode>,
      );
    });
    expect(ReactNoop).toMatchRenderedOutput('2');

    await act(() => setCount(3));
    expect(ReactNoop).toMatchRenderedOutput('3');
    receivedProps.forEach(props => {
      expect(props).toBe(receivedProps[0]);
      expect(props).not.toHaveProperty('ref');
    });
  });

  it('should reuse props without ref when replaying a suspended component', async () => {
    let setCount;
    const receivedProps = [];
    const promise = Promise.resolve('ready');
    const Component = React.forwardRef((props, ref) => {
      const [count, _setCount] = React.useState(0);
      setCount = _setCount;
      receivedProps.push(props);
      const value = React.use(promise);
      React.useImperativeHandle(ref, () => ({value, count}), [value, count]);
      return value + ': ' + count;
    });
    const ref = React.createRef();
    const root = ReactNoop.createRoot();

    await act(() => {
      React.startTransition(() => root.render(<Component ref={ref} />));
    });
    expect(root).toMatchRenderedOutput('ready: 0');
    expect(receivedProps.length).toBeGreaterThan(1);
    expect(ref.current).toEqual({value: 'ready', count: 0});

    await act(() => setCount(1));
    expect(root).toMatchRenderedOutput('ready: 1');
    expect(ref.current).toEqual({value: 'ready', count: 1});
    receivedProps.forEach(props => {
      expect(props).toBe(receivedProps[0]);
      expect(props).not.toHaveProperty('ref');
    });
  });

  it('should keep committed props stable when a different parent update suspends', async () => {
    let setCount;
    const attemptedLabels = [];
    const committedProps = [];
    const pending = new Promise(() => {});
    const Component = React.forwardRef((props, ref) => {
      const [count, _setCount] = React.useState(0);
      setCount = _setCount;
      attemptedLabels.push(props.label);
      React.useLayoutEffect(() => {
        committedProps.push(props);
      });
      if (props.suspend) {
        throw pending;
      }
      return props.label + ': ' + count;
    });
    const ref = React.createRef();
    const root = ReactNoop.createRoot();
    function render(label, suspend) {
      return (
        <React.Suspense fallback="Loading">
          <Component ref={ref} label={label} suspend={suspend} />
        </React.Suspense>
      );
    }

    await act(() => root.render(render('first', false)));
    expect(root).toMatchRenderedOutput('first: 0');
    const initialProps = committedProps[0];

    await act(() => {
      React.startTransition(() => root.render(render('pending', true)));
    });
    expect(attemptedLabels).toContain('pending');
    expect(root).toMatchRenderedOutput('first: 0');
    expect(committedProps).toHaveLength(1);

    await act(() => {
      ReactNoop.flushSync(() => setCount(1));
    });
    expect(root).toMatchRenderedOutput('first: 1');
    expect(committedProps[committedProps.length - 1]).toBe(initialProps);

    // Abandon the suspended update and commit a different set of parent props.
    await act(() => root.render(render('last', false)));
    expect(root).toMatchRenderedOutput('last: 1');
    expect(committedProps[committedProps.length - 1]).not.toBe(initialProps);
    expect(initialProps.label).toBe('first');
  });

  it('should update render props when ref is added and removed', async () => {
    let setCount;
    const receivedProps = [];
    const Component = React.forwardRef((props, ref) => {
      const [count, update] = React.useState(0);
      setCount = update;
      receivedProps.push(props);
      return props.label + ': ' + count;
    });
    const root = ReactNoop.createRoot();
    const inputs = [
      {label: 'omitted'},
      {label: 'present', ref: null},
      {label: 'omitted again'},
    ];
    let previousProps;
    for (let index = 0; index < inputs.length; index++) {
      const element = React.createElement(Component, inputs[index]);
      await act(() => root.render(element));
      const props = receivedProps[receivedProps.length - 1];
      expect(props).not.toBe(previousProps);
      expect(props).not.toHaveProperty('ref');
      await act(() => setCount(index + 1));
      expect(receivedProps[receivedProps.length - 1]).toBe(props);
      expect(root).toMatchRenderedOutput(
        inputs[index].label + ': ' + (index + 1),
      );
      previousProps = props;
    }
  });

  it('should preserve props after alternating early bailouts', async () => {
    let setCount;
    const receivedProps = [];
    const Component = React.forwardRef((props, ref) => {
      const [count, update] = React.useState(0);
      setCount = update;
      receivedProps.push(props);
      return props.label + ': ' + count;
    });
    let element = <Component ref={null} label="previous" />;
    function Parent() {
      return element;
    }
    const root = ReactNoop.createRoot();

    await act(() => root.render(<Parent tick={0} />));
    receivedProps.length = 0;
    element = <Component ref={null} label="stable" />;
    await act(() => root.render(<Parent tick={1} />));
    const initialProps = receivedProps[0];
    for (let count = 1; count <= 3; count++) {
      // The parent renders new props but reuses the child element, so the
      // ForwardRef itself takes the early bailout path on its alternate.
      await act(() => root.render(<Parent tick={count + 1} />));
      expect(receivedProps).toHaveLength(count);
      await act(() => setCount(count));
      expect(receivedProps[count]).toBe(initialProps);
      expect(root).toMatchRenderedOutput('stable: ' + count);
    }
  });

  it('should preserve new props while replaying an update that suspends', async () => {
    let setCount;
    const receivedProps = [];
    const Component = React.forwardRef((props, ref) => {
      const [count, update] = React.useState(0);
      setCount = update;
      receivedProps.push(props);
      const value = React.use(props.promise);
      return props.label + ': ' + value + ': ' + count;
    });
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Component ref={null} label="first" promise={Promise.resolve('A')} />,
      );
    });
    const firstProps = receivedProps[receivedProps.length - 1];
    receivedProps.length = 0;

    await act(() => {
      React.startTransition(() =>
        root.render(
          <Component
            ref={null}
            label="second"
            promise={Promise.resolve('B')}
          />,
        ),
      );
    });
    expect(root).toMatchRenderedOutput('second: B: 0');
    expect(receivedProps.length).toBeGreaterThan(1);
    const secondProps = receivedProps[0];
    expect(secondProps).not.toBe(firstProps);
    await act(() => setCount(1));
    expect(root).toMatchRenderedOutput('second: B: 1');
    receivedProps.forEach(props => {
      expect(props).toBe(secondProps);
      expect(props).not.toHaveProperty('ref');
    });
    expect(firstProps.label).toBe('first');
  });

  it('should keep user props out of legacy instance fields', async () => {
    const context = {label: 'ordinary prop'};
    const measure = jest.fn();
    const setNativeProps = jest.fn();
    const Component = React.forwardRef((props, ref) => {
      expect(props.context).toBe(context);
      expect(props.measure).toBe(measure);
      expect(props.setNativeProps).toBe(setNativeProps);
      return null;
    });
    await act(() => {
      ReactNoop.render(
        <Component
          ref={null}
          context={context}
          measure={measure}
          setNativeProps={setNativeProps}
        />,
      );
    });
    // Older DevTools backends read these instance fields directly. ForwardRef
    // props must not become legacy context or native instance methods.
    const legacyInstance = ReactNoop.getRoot().current.child.stateNode;
    if (legacyInstance !== null) {
      expect(legacyInstance.context).toBe(undefined);
      expect(legacyInstance.measure).toBe(undefined);
      expect(legacyInstance.setNativeProps).toBe(undefined);
    }
    expect(measure).not.toHaveBeenCalled();
    expect(setNativeProps).not.toHaveBeenCalled();
  });

  it('should work without a ref to be forwarded', async () => {
    class Child extends React.Component {
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    ReactNoop.render(<RefForwardingComponent value={123} />);
    await waitForAll([123]);
  });

  it('should forward a ref for a single child', async () => {
    class Child extends React.Component {
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();

    ReactNoop.render(<RefForwardingComponent ref={ref} value={123} />);
    await waitForAll([123]);
    expect(ref.current instanceof Child).toBe(true);
  });

  it('should forward a ref for multiple children', async () => {
    class Child extends React.Component {
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();

    ReactNoop.render(
      <div>
        <div />
        <RefForwardingComponent ref={ref} value={123} />
        <div />
      </div>,
    );
    await waitForAll([123]);
    expect(ref.current instanceof Child).toBe(true);
  });

  it('should maintain child instance and ref through updates', async () => {
    class Child extends React.Component {
      constructor(props) {
        super(props);
      }
      render() {
        Scheduler.log(this.props.value);
        return null;
      }
    }

    function Wrapper(props) {
      return <Child {...props} ref={props.forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    let setRefCount = 0;
    let ref;

    const setRef = r => {
      setRefCount++;
      ref = r;
    };

    ReactNoop.render(<RefForwardingComponent ref={setRef} value={123} />);
    await waitForAll([123]);
    expect(ref instanceof Child).toBe(true);
    expect(setRefCount).toBe(1);
    ReactNoop.render(<RefForwardingComponent ref={setRef} value={456} />);
    await waitForAll([456]);
    expect(ref instanceof Child).toBe(true);
    expect(setRefCount).toBe(1);
  });

  it('should not break lifecycle error handling', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        Scheduler.log('ErrorBoundary.componentDidCatch');
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary.render: catch');
          return null;
        }
        Scheduler.log('ErrorBoundary.render: try');
        return this.props.children;
      }
    }

    class BadRender extends React.Component {
      render() {
        Scheduler.log('BadRender throw');
        throw new Error('oops!');
      }
    }

    function Wrapper(props) {
      const forwardedRef = props.forwardedRef;
      Scheduler.log('Wrapper');
      return <BadRender {...props} ref={forwardedRef} />;
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Wrapper {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();

    ReactNoop.render(
      <ErrorBoundary>
        <RefForwardingComponent ref={ref} />
      </ErrorBoundary>,
    );
    await waitForAll([
      'ErrorBoundary.render: try',
      'Wrapper',
      'BadRender throw',

      // React retries one more time
      'ErrorBoundary.render: try',
      'Wrapper',
      'BadRender throw',

      // Errored again on retry. Now handle it.
      'ErrorBoundary.componentDidCatch',
      'ErrorBoundary.render: catch',
    ]);
    expect(ref.current).toBe(null);
  });

  it('should not re-run the render callback on a deep setState', async () => {
    let inst;

    class Inner extends React.Component {
      render() {
        Scheduler.log('Inner');
        inst = this;
        return <div ref={this.props.forwardedRef} />;
      }
    }

    function Middle(props) {
      Scheduler.log('Middle');
      return <Inner {...props} />;
    }

    const Forward = React.forwardRef((props, ref) => {
      Scheduler.log('Forward');
      return <Middle {...props} forwardedRef={ref} />;
    });

    function App() {
      Scheduler.log('App');
      return <Forward />;
    }

    ReactNoop.render(<App />);
    await waitForAll(['App', 'Forward', 'Middle', 'Inner']);

    inst.setState({});
    await waitForAll(['Inner']);
  });
});

describe('forwardRef legacy Suspense recovery', () => {
  ['present', 'omitted'].forEach(suspendedRef => {
    it(
      'restores committed render props after suspending with ' +
        suspendedRef +
        ' ref',
      async () => {
        jest.resetModules();
        const flags = require('shared/ReactFeatureFlags');
        flags.disableLegacyMode = false;
        const React = require('react');
        const ReactNoop = require('react-noop-renderer');
        const {act} = require('internal-test-utils');
        const pending = new Promise(() => {});
        const seen = [];
        let setCount;
        const Component = React.forwardRef((props, ref) => {
          const [count, update] = React.useState(0);
          setCount = update;
          seen.push(props);
          if (props.suspend) {
            throw pending;
          }
          return <span>{props.label + ': ' + count}</span>;
        });
        const first = <Component ref={null} label="first" suspend={false} />;
        const suspended = React.createElement(Component, {
          label: 'suspended',
          suspend: true,
          ...(suspendedRef === 'present' ? {ref: null} : {}),
        });
        const root = ReactNoop.createLegacyRoot();
        function render(element) {
          return <React.Suspense fallback="Loading">{element}</React.Suspense>;
        }
        await act(() => root.render(render(first)));
        const committedProps = seen[0];
        await act(() => root.render(render(suspended)));
        expect(seen.some(props => props.label === 'suspended')).toBe(true);
        await act(() => root.render(render(first)));
        expect(root).toMatchRenderedOutput(<span>first: 0</span>);
        expect(seen[seen.length - 1]).toBe(committedProps);
        await act(() => setCount(1));
        expect(root).toMatchRenderedOutput(<span>first: 1</span>);
        expect(seen[seen.length - 1]).toBe(committedProps);
      },
    );
  });
});

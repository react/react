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
let ReactDOM;
let ReactDOMClient;
let act;
let Scheduler;
let assertLog;
let TestComponent;
let testComponentInstance;
let assertConsoleErrorDev;

describe('ReactCompositeComponent-state', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;

    function LogAfterCommit({children, color}) {
      React.useEffect(() => {
        Scheduler.log(`commit ${color}`);
      });
      return children;
    }

    TestComponent = class extends React.Component {
      constructor(props) {
        super(props);
        this.peekAtState('getInitialState', undefined, props);
        this.state = {color: 'red'};
        testComponentInstance = this;
      }

      peekAtState = (from, state = this.state, props = this.props) => {
        Scheduler.log(`${from} ${state && state.color}`);
      };

      peekAtCallback = from => {
        return () => this.peekAtState(from);
      };

      setFavoriteColor(nextColor) {
        this.setState(
          {color: nextColor},
          this.peekAtCallback('setFavoriteColor'),
        );
      }

      render() {
        this.peekAtState('render');
        return (
          <LogAfterCommit color={this.state.color}>
            <div>{this.state.color}</div>
          </LogAfterCommit>
        );
      }

      UNSAFE_componentWillMount() {
        this.peekAtState('componentWillMount-start');
        this.setState(function (state) {
          this.peekAtState('before-setState-sunrise', state);
        });
        this.setState(
          {color: 'sunrise'},
          this.peekAtCallback('setState-sunrise'),
        );
        this.setState(function (state) {
          this.peekAtState('after-setState-sunrise', state);
        });
        this.peekAtState('componentWillMount-after-sunrise');
        this.setState(
          {color: 'orange'},
          this.peekAtCallback('setState-orange'),
        );
        this.setState(function (state) {
          this.peekAtState('after-setState-orange', state);
        });
        this.peekAtState('componentWillMount-end');
      }

      componentDidMount() {
        this.peekAtState('componentDidMount-start');
        this.setState(
          {color: 'yellow'},
          this.peekAtCallback('setState-yellow'),
        );
        this.peekAtState('componentDidMount-end');
      }

      UNSAFE_componentWillReceiveProps(newProps) {
        this.peekAtState('componentWillReceiveProps-start');
        if (newProps.nextColor) {
          this.setState(function (state) {
            this.peekAtState('before-setState-receiveProps', state);
            return {color: newProps.nextColor};
          });
          // No longer a public API, but we can test that it works internally by
          // reaching into the updater.
          this.updater.enqueueReplaceState(this, {color: undefined});
          this.setState(function (state) {
            this.peekAtState('before-setState-again-receiveProps', state);
            return {color: newProps.nextColor};
          }, this.peekAtCallback('setState-receiveProps'));
          this.setState(function (state) {
            this.peekAtState('after-setState-receiveProps', state);
          });
        }
        this.peekAtState('componentWillReceiveProps-end');
      }

      shouldComponentUpdate(nextProps, nextState) {
        this.peekAtState('shouldComponentUpdate-currentState');
        this.peekAtState('shouldComponentUpdate-nextState', nextState);
        return true;
      }

      UNSAFE_componentWillUpdate(nextProps, nextState) {
        this.peekAtState('componentWillUpdate-currentState');
        this.peekAtState('componentWillUpdate-nextState', nextState);
      }

      componentDidUpdate(prevProps, prevState) {
        this.peekAtState('componentDidUpdate-currentState');
        this.peekAtState('componentDidUpdate-prevState', prevState);
      }

      componentWillUnmount() {
        this.peekAtState('componentWillUnmount');
      }
    };
  });

  it('should support setting state', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<TestComponent />);
    });

    assertLog([
      // there is no state when getInitialState() is called
      'getInitialState undefined',
      'componentWillMount-start red',
      // setState()'s only enqueue pending states.
      'componentWillMount-after-sunrise red',
      'componentWillMount-end red',
      // pending state queue is processed
      'before-setState-sunrise red',
      'after-setState-sunrise sunrise',
      'after-setState-orange orange',
      // pending state has been applied
      'render orange',
      'componentDidMount-start orange',
      // setState-sunrise and setState-orange should be called here,
      // after the bug in #1740
      // componentDidMount() called setState({color:'yellow'}), which is async.
      // The update doesn't happen until the next flush.
      'componentDidMount-end orange',
      'setState-sunrise orange',
      'setState-orange orange',
      'commit orange',
      'shouldComponentUpdate-currentState orange',
      'shouldComponentUpdate-nextState yellow',
      'componentWillUpdate-currentState orange',
      'componentWillUpdate-nextState yellow',
      'render yellow',
      'componentDidUpdate-currentState yellow',
      'componentDidUpdate-prevState orange',
      'setState-yellow yellow',
      'commit yellow',
    ]);

    await act(() => {
      root.render(<TestComponent nextColor="green" />);
    });

    assertLog([
      'componentWillReceiveProps-start yellow',
      // setState({color:'green'}) only enqueues a pending state.
      'componentWillReceiveProps-end yellow',
      // pending state queue is processed
      // We keep updates in the queue to support
      // replaceState(prevState => newState).
      'before-setState-receiveProps yellow',
      'before-setState-again-receiveProps undefined',
      'after-setState-receiveProps green',
      'shouldComponentUpdate-currentState yellow',
      'shouldComponentUpdate-nextState green',
      'componentWillUpdate-currentState yellow',
      'componentWillUpdate-nextState green',
      'render green',
      'componentDidUpdate-currentState green',
      'componentDidUpdate-prevState yellow',
      'setState-receiveProps green',
      'commit green',
    ]);

    await act(() => {
      testComponentInstance.setFavoriteColor('blue');
    });

    assertLog([
      // setFavoriteColor('blue')
      'shouldComponentUpdate-currentState green',
      'shouldComponentUpdate-nextState blue',
      'componentWillUpdate-currentState green',
      'componentWillUpdate-nextState blue',
      'render blue',
      'componentDidUpdate-currentState blue',
      'componentDidUpdate-prevState green',
      'setFavoriteColor blue',
      'commit blue',
    ]);
    await act(() => {
      testComponentInstance.forceUpdate(
        testComponentInstance.peekAtCallback('forceUpdate'),
      );
    });
    assertLog([
      // forceUpdate()
      'componentWillUpdate-currentState blue',
      'componentWillUpdate-nextState blue',
      'render blue',
      'componentDidUpdate-currentState blue',
      'componentDidUpdate-prevState blue',
      'forceUpdate blue',
      'commit blue',
    ]);

    root.unmount();

    assertLog([
      // unmount()
      // state is available within `componentWillUnmount()`
      'componentWillUnmount blue',
    ]);
  });

  it('should call componentDidUpdate of children first', async () => {
    const container = document.createElement('div');

    let child = null;
    let parent = null;

    class Child extends React.Component {
      state = {bar: false};
      componentDidMount() {
        child = this;
      }
      componentDidUpdate() {
        Scheduler.log('child did update');
      }
      render() {
        return <div />;
      }
    }

    let shouldUpdate = true;

    class Intermediate extends React.Component {
      shouldComponentUpdate() {
        return shouldUpdate;
      }
      render() {
        return <Child />;
      }
    }

    class Parent extends React.Component {
      state = {foo: false};
      componentDidMount() {
        parent = this;
      }
      componentDidUpdate() {
        Scheduler.log('parent did update');
      }
      render() {
        return <Intermediate />;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    await act(() => {
      parent.setState({foo: true});
      child.setState({bar: true});
    });

    // When we render changes top-down in a batch, children's componentDidUpdate
    // happens before the parent.
    assertLog(['child did update', 'parent did update']);

    shouldUpdate = false;

    await act(() => {
      parent.setState({foo: false});
      child.setState({bar: false});
    });

    // We expect the same thing to happen if we bail out in the middle.
    assertLog(['child did update', 'parent did update']);
  });

  it('should batch unmounts', async () => {
    let outer;
    class Inner extends React.Component {
      render() {
        return <div />;
      }

      componentWillUnmount() {
        // This should get silently ignored (maybe with a warning), but it
        // shouldn't break React.
        outer.setState({showInner: false});
      }
    }

    class Outer extends React.Component {
      state = {showInner: true};
      componentDidMount() {
        outer = this;
      }

      render() {
        return <div>{this.state.showInner && <Inner />}</div>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });

    expect(() => {
      root.unmount();
    }).not.toThrow();
  });

  it('should update state when called from child cWRP', async () => {
    class Parent extends React.Component {
      state = {value: 'one'};
      render() {
        Scheduler.log('parent render ' + this.state.value);
        return <Child parent={this} value={this.state.value} />;
      }
    }
    let updated = false;
    class Child extends React.Component {
      UNSAFE_componentWillReceiveProps() {
        if (updated) {
          return;
        }
        Scheduler.log('child componentWillReceiveProps ' + this.props.value);
        this.props.parent.setState({value: 'two'});
        Scheduler.log(
          'child componentWillReceiveProps done ' + this.props.value,
        );
        updated = true;
      }
      render() {
        Scheduler.log('child render ' + this.props.value);
        return <div>{this.props.value}</div>;
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(['parent render one', 'child render one']);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog([
      'parent render one',
      'child componentWillReceiveProps one',
      'child componentWillReceiveProps done one',
      'child render one',
      'parent render two',
      'child render two',
    ]);
  });

  it('should merge state when sCU returns false', async () => {
    let test;
    class Test extends React.Component {
      state = {a: 0};
      componentDidMount() {
        test = this;
      }

      render() {
        return null;
      }
      shouldComponentUpdate(nextProps, nextState) {
        Scheduler.log(
          'scu from ' +
            Object.keys(this.state) +
            ' to ' +
            Object.keys(nextState),
        );
        return false;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Test />);
    });
    await act(() => {
      test.setState({b: 0});
    });

    assertLog(['scu from a to a,b']);
    await act(() => {
      test.setState({c: 0});
    });
    assertLog(['scu from a,b to a,b,c']);
  });

  it('should treat assigning to this.state inside cWRP as a replaceState, with a warning', async () => {
    class Test extends React.Component {
      state = {step: 1, extra: true};
      UNSAFE_componentWillReceiveProps() {
        this.setState({step: 2}, () => {
          // Tests that earlier setState callbacks are not dropped
          Scheduler.log(
            `callback -- step: ${this.state.step}, extra: ${!!this.state
              .extra}`,
          );
        });
        // Treat like replaceState
        this.state = {step: 3};
      }
      render() {
        Scheduler.log(
          `render -- step: ${this.state.step}, extra: ${!!this.state.extra}`,
        );
        return null;
      }
    }

    // Mount
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Test />);
    });
    // Update
    ReactDOM.flushSync(() => {
      root.render(<Test />);
    });
    assertConsoleErrorDev([
      'Test.componentWillReceiveProps(): Assigning directly to ' +
        "this.state is deprecated (except inside a component's constructor). " +
        'Use setState instead.\n' +
        '    in Test (at **)',
    ]);

    assertLog([
      'render -- step: 1, extra: true',
      'render -- step: 3, extra: false',
      'callback -- step: 3, extra: false',
    ]);

    // Check deduplication; (no additional warnings are expected)
    expect(() => {
      ReactDOM.flushSync(() => {
        root.render(<Test />);
      });
    }).not.toThrow();
  });

  it('should treat assigning to this.state inside cWM as a replaceState, with a warning', () => {
    class Test extends React.Component {
      state = {step: 1, extra: true};
      UNSAFE_componentWillMount() {
        this.setState({step: 2}, () => {
          // Tests that earlier setState callbacks are not dropped
          Scheduler.log(
            `callback -- step: ${this.state.step}, extra: ${!!this.state
              .extra}`,
          );
        });
        // Treat like replaceState
        this.state = {step: 3};
      }
      render() {
        Scheduler.log(
          `render -- step: ${this.state.step}, extra: ${!!this.state.extra}`,
        );
        return null;
      }
    }

    // Mount
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    ReactDOM.flushSync(() => {
      root.render(<Test />);
    });
    assertConsoleErrorDev([
      'Test.componentWillMount(): Assigning directly to ' +
        "this.state is deprecated (except inside a component's constructor). " +
        'Use setState instead.\n' +
        '    in Test (at **)',
    ]);

    assertLog([
      'render -- step: 3, extra: false',
      'callback -- step: 3, extra: false',

      // A second time for the retry.
      'render -- step: 3, extra: false',
      'callback -- step: 3, extra: false',
    ]);
  });

  it('should not support setState in componentWillUnmount', async () => {
    let subscription;
    class A extends React.Component {
      componentWillUnmount() {
        subscription();
      }
      render() {
        return 'A';
      }
    }

    class B extends React.Component {
      state = {siblingUnmounted: false};
      UNSAFE_componentWillMount() {
        subscription = () => this.setState({siblingUnmounted: true});
      }
      render() {
        return 'B' + (this.state.siblingUnmounted ? ' No Sibling' : '');
      }
    }

    const el = document.createElement('div');
    const root = ReactDOMClient.createRoot(el);
    await act(() => {
      root.render(<A />);
    });
    expect(el.textContent).toBe('A');

    ReactDOM.flushSync(() => {
      root.render(<B />);
    });
    assertConsoleErrorDev([
      "Can't perform a React state update on a component that hasn't mounted yet. " +
        'This indicates that you have a side-effect in your render function that ' +
        'asynchronously tries to update the component. ' +
        'Move this work to useEffect instead.\n' +
        '    in B (at **)',
    ]);
  });

  // @gate !disableLegacyMode
  it('Legacy mode should support setState in componentWillUnmount (#18851)', () => {
    let subscription;
    class A extends React.Component {
      componentWillUnmount() {
        subscription();
      }
      render() {
        return 'A';
      }
    }

    class B extends React.Component {
      state = {siblingUnmounted: false};
      UNSAFE_componentWillMount() {
        subscription = () => this.setState({siblingUnmounted: true});
      }
      render() {
        return 'B' + (this.state.siblingUnmounted ? ' No Sibling' : '');
      }
    }

    const el = document.createElement('div');
    ReactDOM.render(<A />, el);
    expect(el.textContent).toBe('A');

    ReactDOM.render(<B />, el);
    expect(el.textContent).toBe('B No Sibling');
  });
});

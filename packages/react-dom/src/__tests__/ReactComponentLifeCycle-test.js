/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let act;

let React;
let ReactDOMClient;
let assertConsoleErrorDev;
let assertConsoleWarnDev;

const clone = function (o) {
  return JSON.parse(JSON.stringify(o));
};

const GET_INIT_STATE_RETURN_VAL = {
  hasWillMountCompleted: false,
  hasRenderCompleted: false,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false,
};

const INIT_RENDER_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: false,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false,
};

const DID_MOUNT_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: true,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false,
};

const NEXT_RENDER_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: true,
  hasDidMountCompleted: true,
  hasWillUnmountCompleted: false,
};

const WILL_UNMOUNT_STATE = {
  hasWillMountCompleted: true,
  hasDidMountCompleted: true,
  hasRenderCompleted: true,
  hasWillUnmountCompleted: false,
};

const POST_WILL_UNMOUNT_STATE = {
  hasWillMountCompleted: true,
  hasDidMountCompleted: true,
  hasRenderCompleted: true,
  hasWillUnmountCompleted: true,
};

/**
 * TODO: We should make any setState calls fail in
 * `getInitialState` and `componentWillMount`. They will usually fail
 * anyways because `this._renderedComponent` is empty, however, if a component
 * is *reused*, then that won't be the case and things will appear to work in
 * some cases. Better to just block all updates in initialization.
 */
describe('ReactComponentLifeCycle', () => {
  beforeEach(() => {
    jest.resetModules();

    ({
      act,
      assertConsoleErrorDev,
      assertConsoleWarnDev,
    } = require('internal-test-utils'));

    React = require('react');
    ReactDOMClient = require('react-dom/client');
  });

  it('should not reuse an instance when it has been unmounted', async () => {
    const container = document.createElement('div');

    class StatefulComponent extends React.Component {
      state = {};

      render() {
        return <div />;
      }
    }

    const element = <StatefulComponent />;
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(element);
    });

    const firstInstance = container.firstChild;
    await act(() => {
      root.unmount();
    });
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(element);
    });

    const secondInstance = container.firstChild;
    expect(firstInstance).not.toBe(secondInstance);
  });

  /**
   * If a state update triggers rerendering that in turn fires an onDOMReady,
   * that second onDOMReady should not fail.
   */
  it('should fire onDOMReady when already in onDOMReady', async () => {
    const _testJournal = [];

    class Child extends React.Component {
      componentDidMount() {
        _testJournal.push('Child:onDOMReady');
      }

      render() {
        return <div />;
      }
    }

    class SwitcherParent extends React.Component {
      constructor(props) {
        super(props);
        _testJournal.push('SwitcherParent:getInitialState');
        this.state = {showHasOnDOMReadyComponent: false};
      }

      componentDidMount() {
        _testJournal.push('SwitcherParent:onDOMReady');
        this.switchIt();
      }

      switchIt = () => {
        this.setState({showHasOnDOMReadyComponent: true});
      };

      render() {
        return (
          <div>
            {this.state.showHasOnDOMReadyComponent ? <Child /> : <div />}
          </div>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<SwitcherParent />);
    });

    expect(_testJournal).toEqual([
      'SwitcherParent:getInitialState',
      'SwitcherParent:onDOMReady',
      'Child:onDOMReady',
    ]);
  });

  // You could assign state here, but not access members of it, unless you
  // had provided a getInitialState method.
  it('throws when accessing state in componentWillMount', async () => {
    class StatefulComponent extends React.Component {
      UNSAFE_componentWillMount() {
        void this.state.yada;
      }

      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<StatefulComponent />);
      }),
    ).rejects.toThrow();
  });

  it('should allow update state inside of componentWillMount', () => {
    class StatefulComponent extends React.Component {
      UNSAFE_componentWillMount() {
        this.setState({stateField: 'something'});
      }

      render() {
        return <div />;
      }
    }

    expect(async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<StatefulComponent />);
      });
    }).not.toThrow();
  });

  it("warns if setting 'this.state = props'", async () => {
    class StatefulComponent extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = props;
      }
      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<StatefulComponent />);
    });
    assertConsoleErrorDev([
      'StatefulComponent: It is not recommended to assign props directly to state ' +
        "because updates to props won't be reflected in state. " +
        'In most cases, it is better to use props directly.\n' +
        '    in StatefulComponent (at **)',
    ]);
  });

  it('should not allow update state inside of getInitialState', async () => {
    class StatefulComponent extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.setState({stateField: 'something'});

        this.state = {stateField: 'somethingelse'};
      }

      render() {
        return <div />;
      }
    }

    let container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<StatefulComponent />);
    });
    assertConsoleErrorDev([
      "Can't call setState on a component that is not yet mounted. " +
        'This is a no-op, but it might indicate a bug in your application. ' +
        'Instead, assign to `this.state` directly or define a `state = {};` ' +
        'class property with the desired state in the StatefulComponent component.\n' +
        '    in StatefulComponent (at **)',
    ]);

    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<StatefulComponent />);
    });
  });

  it('should carry through each of the phases of setup', async () => {
    class LifeCycleComponent extends React.Component {
      constructor(props, context) {
        super(props, context);
        this._testJournal = {};
        const initState = {
          hasWillMountCompleted: false,
          hasDidMountCompleted: false,
          hasRenderCompleted: false,
          hasWillUnmountCompleted: false,
        };
        this._testJournal.returnedFromGetInitialState = clone(initState);
        this.state = initState;
      }

      UNSAFE_componentWillMount() {
        this._testJournal.stateAtStartOfWillMount = clone(this.state);
        this.state.hasWillMountCompleted = true;
      }

      componentDidMount() {
        this._testJournal.stateAtStartOfDidMount = clone(this.state);
        this.setState({hasDidMountCompleted: true});
      }

      render() {
        const isInitialRender = !this.state.hasRenderCompleted;
        if (isInitialRender) {
          this._testJournal.stateInInitialRender = clone(this.state);
        } else {
          this._testJournal.stateInLaterRender = clone(this.state);
        }
        // you would *NEVER* do anything like this in real code!
        this.state.hasRenderCompleted = true;
        return <div ref={React.createRef()}>I am the inner DIV</div>;
      }

      componentWillUnmount() {
        this._testJournal.stateAtStartOfWillUnmount = clone(this.state);
        this.state.hasWillUnmountCompleted = true;
      }
    }

    // A component that is merely "constructed" (as in "constructor") but not
    // yet initialized, or rendered.
    const root = ReactDOMClient.createRoot(document.createElement('div'));

    const instanceRef = React.createRef();
    await act(() => {
      root.render(<LifeCycleComponent ref={instanceRef} />);
    });
    const instance = instanceRef.current;

    // getInitialState
    expect(instance._testJournal.returnedFromGetInitialState).toEqual(
      GET_INIT_STATE_RETURN_VAL,
    );

    // componentWillMount
    expect(instance._testJournal.stateAtStartOfWillMount).toEqual(
      instance._testJournal.returnedFromGetInitialState,
    );

    // componentDidMount
    expect(instance._testJournal.stateAtStartOfDidMount).toEqual(
      DID_MOUNT_STATE,
    );

    // initial render
    expect(instance._testJournal.stateInInitialRender).toEqual(
      INIT_RENDER_STATE,
    );

    // Now *update the component*
    instance.forceUpdate();

    // render 2nd time
    expect(instance._testJournal.stateInLaterRender).toEqual(NEXT_RENDER_STATE);

    await act(() => {
      root.unmount();
    });

    expect(instance._testJournal.stateAtStartOfWillUnmount).toEqual(
      WILL_UNMOUNT_STATE,
    );
    // componentWillUnmount called right before unmount.

    // But the current lifecycle of the component is unmounted.
    expect(instance.state).toEqual(POST_WILL_UNMOUNT_STATE);
  });

  it('should not throw when updating an auxiliary component', async () => {
    class Tooltip extends React.Component {
      render() {
        return <div>{this.props.children}</div>;
      }

      componentDidMount() {
        const container = document.createElement('div');
        this.root = ReactDOMClient.createRoot(container);
        this.updateTooltip();
      }

      componentDidUpdate() {
        this.updateTooltip();
      }

      updateTooltip = () => {
        // Even though this.props.tooltip has an owner, updating it shouldn't
        // throw here because it's mounted as a root component
        this.root.render(this.props.tooltip, this.container);
      };
    }

    class Component extends React.Component {
      render() {
        return (
          <Tooltip
            ref={React.createRef()}
            tooltip={<div>{this.props.tooltipText}</div>}>
            {this.props.text}
          </Tooltip>
        );
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component text="uno" tooltipText="one" />);
    });

    // Since `instance` is a root component, we can set its props. This also
    // makes Tooltip rerender the tooltip component, which shouldn't throw.
    await act(() => {
      root.render(<Component text="dos" tooltipText="two" />);
    });
  });

  it('should allow state updates in componentDidMount', async () => {
    /**
     * calls setState in an componentDidMount.
     */
    class SetStateInComponentDidMount extends React.Component {
      state = {
        stateField: this.props.valueToUseInitially,
      };

      componentDidMount() {
        this.setState({stateField: this.props.valueToUseInOnDOMReady});
      }

      render() {
        return <div />;
      }
    }

    let instance;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <SetStateInComponentDidMount
          ref={current => (instance = current)}
          valueToUseInitially="hello"
          valueToUseInOnDOMReady="goodbye"
        />,
      );
    });

    expect(instance.state.stateField).toBe('goodbye');
  });

  it('should call nested legacy lifecycle methods in the right order', async () => {
    let log;
    const logger = function (msg) {
      return function () {
        // return true for shouldComponentUpdate
        log.push(msg);
        return true;
      };
    };
    class Outer extends React.Component {
      UNSAFE_componentWillMount = logger('outer componentWillMount');
      componentDidMount = logger('outer componentDidMount');
      UNSAFE_componentWillReceiveProps = logger(
        'outer componentWillReceiveProps',
      );
      shouldComponentUpdate = logger('outer shouldComponentUpdate');
      UNSAFE_componentWillUpdate = logger('outer componentWillUpdate');
      componentDidUpdate = logger('outer componentDidUpdate');
      componentWillUnmount = logger('outer componentWillUnmount');
      render() {
        return (
          <div>
            <Inner x={this.props.x} />
          </div>
        );
      }
    }

    class Inner extends React.Component {
      UNSAFE_componentWillMount = logger('inner componentWillMount');
      componentDidMount = logger('inner componentDidMount');
      UNSAFE_componentWillReceiveProps = logger(
        'inner componentWillReceiveProps',
      );
      shouldComponentUpdate = logger('inner shouldComponentUpdate');
      UNSAFE_componentWillUpdate = logger('inner componentWillUpdate');
      componentDidUpdate = logger('inner componentDidUpdate');
      componentWillUnmount = logger('inner componentWillUnmount');
      render() {
        return <span>{this.props.x}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    log = [];
    await act(() => {
      root.render(<Outer x={1} />);
    });
    expect(log).toEqual([
      'outer componentWillMount',
      'inner componentWillMount',
      'inner componentDidMount',
      'outer componentDidMount',
    ]);

    // Dedup warnings
    log = [];
    await act(() => {
      root.render(<Outer x={2} />);
    });
    expect(log).toEqual([
      'outer componentWillReceiveProps',
      'outer shouldComponentUpdate',
      'outer componentWillUpdate',
      'inner componentWillReceiveProps',
      'inner shouldComponentUpdate',
      'inner componentWillUpdate',
      'inner componentDidUpdate',
      'outer componentDidUpdate',
    ]);

    log = [];
    await act(() => {
      root.unmount();
    });
    expect(log).toEqual([
      'outer componentWillUnmount',
      'inner componentWillUnmount',
    ]);
  });

  it('should call nested new lifecycle methods in the right order', async () => {
    let log;
    const logger = function (msg) {
      return function () {
        // return true for shouldComponentUpdate
        log.push(msg);
        return true;
      };
    };
    class Outer extends React.Component {
      state = {};
      static getDerivedStateFromProps(props, prevState) {
        log.push('outer getDerivedStateFromProps');
        return null;
      }
      componentDidMount = logger('outer componentDidMount');
      shouldComponentUpdate = logger('outer shouldComponentUpdate');
      getSnapshotBeforeUpdate = logger('outer getSnapshotBeforeUpdate');
      componentDidUpdate = logger('outer componentDidUpdate');
      componentWillUnmount = logger('outer componentWillUnmount');
      render() {
        return (
          <div>
            <Inner x={this.props.x} />
          </div>
        );
      }
    }

    class Inner extends React.Component {
      state = {};
      static getDerivedStateFromProps(props, prevState) {
        log.push('inner getDerivedStateFromProps');
        return null;
      }
      componentDidMount = logger('inner componentDidMount');
      shouldComponentUpdate = logger('inner shouldComponentUpdate');
      getSnapshotBeforeUpdate = logger('inner getSnapshotBeforeUpdate');
      componentDidUpdate = logger('inner componentDidUpdate');
      componentWillUnmount = logger('inner componentWillUnmount');
      render() {
        return <span>{this.props.x}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));

    log = [];
    await act(() => {
      root.render(<Outer x={1} />);
    });
    expect(log).toEqual([
      'outer getDerivedStateFromProps',
      'inner getDerivedStateFromProps',
      'inner componentDidMount',
      'outer componentDidMount',
    ]);

    // Dedup warnings
    log = [];
    await act(() => {
      root.render(<Outer x={2} />);
    });
    expect(log).toEqual([
      'outer getDerivedStateFromProps',
      'outer shouldComponentUpdate',
      'inner getDerivedStateFromProps',
      'inner shouldComponentUpdate',
      'inner getSnapshotBeforeUpdate',
      'outer getSnapshotBeforeUpdate',
      'inner componentDidUpdate',
      'outer componentDidUpdate',
    ]);

    log = [];
    await act(() => {
      root.unmount();
    });
    expect(log).toEqual([
      'outer componentWillUnmount',
      'inner componentWillUnmount',
    ]);
  });

  it('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new static gDSFP is present', async () => {
    class Component extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {
        throw Error('unexpected');
      }
      componentWillReceiveProps() {
        throw Error('unexpected');
      }
      componentWillUpdate() {
        throw Error('unexpected');
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'Component uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  componentWillMount\n' +
        '  componentWillReceiveProps\n' +
        '  componentWillUpdate\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in Component (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: Component',
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your code to use " +
        'memoization techniques or move it to static getDerivedStateFromProps. ' +
        'Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: Component',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: Component',
    ]);
  });

  it('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new getSnapshotBeforeUpdate is present', async () => {
    class Component extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {
        return null;
      }
      componentWillMount() {
        throw Error('unexpected');
      }
      componentWillReceiveProps() {
        throw Error('unexpected');
      }
      componentWillUpdate() {
        throw Error('unexpected');
      }
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component value={1} />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'Component uses getSnapshotBeforeUpdate() but also contains the following legacy lifecycles:\n' +
        '  componentWillMount\n' +
        '  componentWillReceiveProps\n' +
        '  componentWillUpdate\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in Component (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: Component',
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your code to use " +
        'memoization techniques or move it to static getDerivedStateFromProps. ' +
        'Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: Component',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: Component',
    ]);

    await act(() => {
      root.render(<Component value={2} />);
    });
  });

  it('should not invoke new unsafe lifecycles (cWM/cWRP/cWU) if static gDSFP is present', async () => {
    class Component extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      UNSAFE_componentWillMount() {
        throw Error('unexpected');
      }
      UNSAFE_componentWillReceiveProps() {
        throw Error('unexpected');
      }
      UNSAFE_componentWillUpdate() {
        throw Error('unexpected');
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component value={1} />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'Component uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  UNSAFE_componentWillMount\n' +
        '  UNSAFE_componentWillReceiveProps\n' +
        '  UNSAFE_componentWillUpdate\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in Component (at **)',
    ]);
    await act(() => {
      root.render(<Component value={2} />);
    });
  });

  it('should warn about deprecated lifecycles (cWM/cWRP/cWU) if new static gDSFP is present', async () => {
    class AllLegacyLifecycles extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {}
      UNSAFE_componentWillReceiveProps() {}
      componentWillUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<AllLegacyLifecycles />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'AllLegacyLifecycles uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  componentWillMount\n' +
        '  UNSAFE_componentWillReceiveProps\n' +
        '  componentWillUpdate\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in AllLegacyLifecycles (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: AllLegacyLifecycles',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: AllLegacyLifecycles',
    ]);

    class WillMount extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      UNSAFE_componentWillMount() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMount />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'WillMount uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  UNSAFE_componentWillMount\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in WillMount (at **)',
    ]);

    class WillMountAndUpdate extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {}
      UNSAFE_componentWillUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMountAndUpdate />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'WillMountAndUpdate uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  componentWillMount\n' +
        '  UNSAFE_componentWillUpdate\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in WillMountAndUpdate (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: WillMountAndUpdate',
    ]);

    class WillReceiveProps extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillReceiveProps() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillReceiveProps />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'WillReceiveProps uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  componentWillReceiveProps\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in WillReceiveProps (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your code to use " +
        'memoization techniques or move it to static getDerivedStateFromProps. ' +
        'Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: WillReceiveProps',
    ]);
  });

  it('should warn about deprecated lifecycles (cWM/cWRP/cWU) if new getSnapshotBeforeUpdate is present', async () => {
    class AllLegacyLifecycles extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      componentWillMount() {}
      UNSAFE_componentWillReceiveProps() {}
      componentWillUpdate() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<AllLegacyLifecycles />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'AllLegacyLifecycles uses getSnapshotBeforeUpdate() but also contains the following legacy lifecycles:\n' +
        '  componentWillMount\n' +
        '  UNSAFE_componentWillReceiveProps\n' +
        '  componentWillUpdate\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in AllLegacyLifecycles (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: AllLegacyLifecycles',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: AllLegacyLifecycles',
    ]);

    class WillMount extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      UNSAFE_componentWillMount() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMount />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'WillMount uses getSnapshotBeforeUpdate() but also contains the following legacy lifecycles:\n' +
        '  UNSAFE_componentWillMount\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in WillMount (at **)',
    ]);

    class WillMountAndUpdate extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      componentWillMount() {}
      UNSAFE_componentWillUpdate() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMountAndUpdate />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'WillMountAndUpdate uses getSnapshotBeforeUpdate() but also contains the following legacy lifecycles:\n' +
        '  componentWillMount\n' +
        '  UNSAFE_componentWillUpdate\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in WillMountAndUpdate (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: WillMountAndUpdate',
    ]);

    class WillReceiveProps extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      componentWillReceiveProps() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillReceiveProps />);
    });
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n' +
        'WillReceiveProps uses getSnapshotBeforeUpdate() but also contains the following legacy lifecycles:\n' +
        '  componentWillReceiveProps\n\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in WillReceiveProps (at **)',
    ]);
    assertConsoleWarnDev([
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your code to use " +
        'memoization techniques or move it to static getDerivedStateFromProps. ' +
        'Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: WillReceiveProps',
    ]);
  });

  it('should warn if getDerivedStateFromProps returns undefined', async () => {
    class MyComponent extends React.Component {
      state = {};
      static getDerivedStateFromProps() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<MyComponent />);
    });
    assertConsoleErrorDev([
      'MyComponent.getDerivedStateFromProps(): A valid state object (or null) must ' +
        'be returned. You have returned undefined.\n' +
        '    in MyComponent (at **)',
    ]);

    // De-duped
    await act(() => {
      root.render(<MyComponent />);
    });
  });

  it('should warn if state is not initialized before getDerivedStateFromProps', async () => {
    class MyComponent extends React.Component {
      static getDerivedStateFromProps() {
        return null;
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<MyComponent />);
    });
    assertConsoleErrorDev([
      '`MyComponent` uses `getDerivedStateFromProps` but its initial state is ' +
        'undefined. This is not recommended. Instead, define the initial state by ' +
        'assigning an object to `this.state` in the constructor of `MyComponent`. ' +
        'This ensures that `getDerivedStateFromProps` arguments have a consistent shape.\n' +
        '    in MyComponent (at **)',
    ]);

    // De-duped
    await act(() => {
      root.render(<MyComponent />);
    });
  });

  it('should invoke both deprecated and new lifecycles if both are present', async () => {
    const log = [];

    class MyComponent extends React.Component {
      componentWillMount() {
        log.push('componentWillMount');
      }
      componentWillReceiveProps() {
        log.push('componentWillReceiveProps');
      }
      componentWillUpdate() {
        log.push('componentWillUpdate');
      }
      UNSAFE_componentWillMount() {
        log.push('UNSAFE_componentWillMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('UNSAFE_componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('UNSAFE_componentWillUpdate');
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<MyComponent foo="bar" />);
    });
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: MyComponent',
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your code to use " +
        'memoization techniques or move it to static getDerivedStateFromProps. ' +
        'Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: MyComponent',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n\n' +
        'Please update the following components: MyComponent',
    ]);
    expect(log).toEqual(['componentWillMount', 'UNSAFE_componentWillMount']);

    log.length = 0;

    await act(() => {
      root.render(<MyComponent foo="baz" />);
    });
    expect(log).toEqual([
      'componentWillReceiveProps',
      'UNSAFE_componentWillReceiveProps',
      'componentWillUpdate',
      'UNSAFE_componentWillUpdate',
    ]);
  });

  it('should not override state with stale values if prevState is spread within getDerivedStateFromProps', async () => {
    const divRef = React.createRef();
    let childInstance;

    class Child extends React.Component {
      state = {local: 0};
      static getDerivedStateFromProps(nextProps, prevState) {
        return {...prevState, remote: nextProps.remote};
      }
      updateState = () => {
        this.setState(state => ({local: state.local + 1}));
        this.props.onChange(this.state.remote + 1);
      };
      render() {
        childInstance = this;
        return (
          <div
            onClick={this.updateState}
            ref={
              divRef
            }>{`remote:${this.state.remote}, local:${this.state.local}`}</div>
        );
      }
    }

    class Parent extends React.Component {
      state = {value: 0};
      handleChange = value => {
        this.setState({value});
      };
      render() {
        return <Child remote={this.state.value} onChange={this.handleChange} />;
      }
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Parent />);
    });
    expect(divRef.current.textContent).toBe('remote:0, local:0');

    // Trigger setState() calls
    await act(() => {
      childInstance.updateState();
    });
    expect(divRef.current.textContent).toBe('remote:1, local:1');

    // Trigger batched setState() calls
    await act(() => {
      divRef.current.click();
    });
    expect(divRef.current.textContent).toBe('remote:2, local:2');
    document.body.removeChild(container);
  });

  it('should pass the return value from getSnapshotBeforeUpdate to componentDidUpdate', async () => {
    const log = [];

    class MyComponent extends React.Component {
      state = {
        value: 0,
      };
      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          value: prevState.value + 1,
        };
      }
      getSnapshotBeforeUpdate(prevProps, prevState) {
        log.push(
          `getSnapshotBeforeUpdate() prevProps:${prevProps.value} prevState:${prevState.value}`,
        );
        return 'abc';
      }
      componentDidUpdate(prevProps, prevState, snapshot) {
        log.push(
          `componentDidUpdate() prevProps:${prevProps.value} prevState:${prevState.value} snapshot:${snapshot}`,
        );
      }
      render() {
        log.push('render');
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(
        <div>
          <MyComponent value="foo" />
        </div>,
      );
    });
    expect(log).toEqual(['render']);
    log.length = 0;

    await act(() => {
      root.render(
        <div>
          <MyComponent value="bar" />
        </div>,
      );
    });
    expect(log).toEqual([
      'render',
      'getSnapshotBeforeUpdate() prevProps:foo prevState:1',
      'componentDidUpdate() prevProps:foo prevState:1 snapshot:abc',
    ]);
    log.length = 0;

    await act(() => {
      root.render(
        <div>
          <MyComponent value="baz" />
        </div>,
      );
    });
    expect(log).toEqual([
      'render',
      'getSnapshotBeforeUpdate() prevProps:bar prevState:2',
      'componentDidUpdate() prevProps:bar prevState:2 snapshot:abc',
    ]);
    log.length = 0;

    await act(() => {
      root.render(<div />);
    });
    expect(log).toEqual([]);
  });

  it('should pass previous state to shouldComponentUpdate even with getDerivedStateFromProps', async () => {
    const divRef = React.createRef();
    class SimpleComponent extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          value: props.value,
        };
      }

      static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.value === prevState.value) {
          return null;
        }
        return {value: nextProps.value};
      }

      shouldComponentUpdate(nextProps, nextState) {
        return nextState.value !== this.state.value;
      }

      render() {
        return <div ref={divRef}>value: {this.state.value}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<SimpleComponent value="initial" />);
    });
    expect(divRef.current.textContent).toBe('value: initial');
    await act(() => {
      root.render(<SimpleComponent value="updated" />);
    });
    expect(divRef.current.textContent).toBe('value: updated');
  });

  it('should call getSnapshotBeforeUpdate before mutations are committed', async () => {
    const log = [];

    class MyComponent extends React.Component {
      divRef = React.createRef();
      getSnapshotBeforeUpdate(prevProps, prevState) {
        log.push('getSnapshotBeforeUpdate');
        expect(this.divRef.current.textContent).toBe(
          `value:${prevProps.value}`,
        );
        return 'foobar';
      }
      componentDidUpdate(prevProps, prevState, snapshot) {
        log.push('componentDidUpdate');
        expect(this.divRef.current.textContent).toBe(
          `value:${this.props.value}`,
        );
        expect(snapshot).toBe('foobar');
      }
      render() {
        log.push('render');
        return <div ref={this.divRef}>{`value:${this.props.value}`}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<MyComponent value="foo" />);
    });
    expect(log).toEqual(['render']);
    log.length = 0;

    await act(() => {
      root.render(<MyComponent value="bar" />);
    });
    expect(log).toEqual([
      'render',
      'getSnapshotBeforeUpdate',
      'componentDidUpdate',
    ]);
    log.length = 0;
  });

  it('should warn if getSnapshotBeforeUpdate returns undefined', async () => {
    class MyComponent extends React.Component {
      getSnapshotBeforeUpdate() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<MyComponent value="foo" />);
    });

    await act(() => {
      root.render(<MyComponent value="bar" />);
    });
    assertConsoleErrorDev([
      'MyComponent.getSnapshotBeforeUpdate(): A snapshot value (or null) must ' +
        'be returned. You have returned undefined.\n' +
        '    in MyComponent (at **)',
    ]);

    // De-duped
    await act(() => {
      root.render(<MyComponent value="baz" />);
    });
  });

  it('should warn if getSnapshotBeforeUpdate is defined with no componentDidUpdate', async () => {
    class MyComponent extends React.Component {
      getSnapshotBeforeUpdate() {
        return null;
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<MyComponent />);
    });
    assertConsoleErrorDev([
      'MyComponent: getSnapshotBeforeUpdate() should be used with componentDidUpdate(). ' +
        'This component defines getSnapshotBeforeUpdate() only.\n' +
        '    in MyComponent (at **)',
    ]);

    // De-duped
    await act(() => {
      root.render(<MyComponent />);
    });
  });

  it('warns about deprecated unsafe lifecycles', async () => {
    class MyComponent extends React.Component {
      componentWillMount() {}
      componentWillReceiveProps() {}
      componentWillUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));

    await act(() => {
      root.render(<MyComponent x={1} />);
    });
    assertConsoleWarnDev([
      `componentWillMount has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.
* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: MyComponent`,
      `componentWillReceiveProps has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state
* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: MyComponent`,
      `componentWillUpdate has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: MyComponent`,
    ]);

    // Dedupe check (update and instantiate new)
    await act(() => {
      root.render(<MyComponent x={2} />);
    });
    await act(() => {
      root.render(<MyComponent key="new" x={1} />);
    });
  });

  describe('react-lifecycles-compat', () => {
    const {polyfill} = require('react-lifecycles-compat');

    it('should not warn for components with polyfilled getDerivedStateFromProps', async () => {
      class PolyfilledComponent extends React.Component {
        state = {};
        static getDerivedStateFromProps() {
          return null;
        }
        render() {
          return null;
        }
      }

      polyfill(PolyfilledComponent);

      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => {
        root.render(
          <React.StrictMode>
            <PolyfilledComponent />
          </React.StrictMode>,
        );
      });
    });

    it('should not warn for components with polyfilled getSnapshotBeforeUpdate', async () => {
      class PolyfilledComponent extends React.Component {
        getSnapshotBeforeUpdate() {
          return null;
        }
        componentDidUpdate() {}
        render() {
          return null;
        }
      }

      polyfill(PolyfilledComponent);

      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => {
        root.render(
          <React.StrictMode>
            <PolyfilledComponent />
          </React.StrictMode>,
        );
      });
    });
  });
});

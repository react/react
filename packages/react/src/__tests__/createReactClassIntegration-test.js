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
let assertConsoleErrorDev;
let assertConsoleWarnDev;

let PropTypes;
let React;
let ReactDOMClient;
let createReactClass;

describe('create-react-class-integration', () => {
  beforeEach(() => {
    jest.resetModules();
    ({
      act,
      assertConsoleErrorDev,
      assertConsoleWarnDev,
    } = require('internal-test-utils'));
    PropTypes = require('prop-types');
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    createReactClass = require('create-react-class/factory')(
      React.Component,
      React.isValidElement,
      new React.Component().updater,
    );
  });

  it('should throw when `render` is not specified', () => {
    expect(function () {
      createReactClass({});
    }).toThrowError('Class specification must implement a `render` method.');
  });

  it('should copy prop types onto the Constructor', () => {
    const propValidator = jest.fn();
    const TestComponent = createReactClass({
      propTypes: {
        value: propValidator,
      },
      render: function () {
        return <div />;
      },
    });

    expect(TestComponent.propTypes).toBeDefined();
    expect(TestComponent.propTypes.value).toBe(propValidator);
  });

  it('should warn on invalid prop types', () => {
    createReactClass({
      displayName: 'Component',
      propTypes: {
        prop: null,
      },
      render: function () {
        return <span>{this.props.prop}</span>;
      },
    });
    assertConsoleErrorDev([
      'Warning: Component: prop type `prop` is invalid; ' +
        'it must be a function, usually from React.PropTypes.',
    ]);
  });

  it('should warn on invalid context types', () => {
    createReactClass({
      displayName: 'Component',
      contextTypes: {
        prop: null,
      },
      render: function () {
        return <span>{this.props.prop}</span>;
      },
    });
    assertConsoleErrorDev([
      'Warning: Component: context type `prop` is invalid; ' +
        'it must be a function, usually from React.PropTypes.',
    ]);
  });

  it('should throw on invalid child context types', () => {
    createReactClass({
      displayName: 'Component',
      childContextTypes: {
        prop: null,
      },
      render: function () {
        return <span>{this.props.prop}</span>;
      },
    });
    assertConsoleErrorDev([
      'Warning: Component: child context type `prop` is invalid; it must be a function, usually from React.PropTypes.',
    ]);
  });

  it('should warn when misspelling shouldComponentUpdate', () => {
    createReactClass({
      componentShouldUpdate: function () {
        return false;
      },
      render: function () {
        return <div />;
      },
    });
    assertConsoleErrorDev([
      'Warning: A component has a method called componentShouldUpdate(). Did you ' +
        'mean shouldComponentUpdate()? The name is phrased as a question ' +
        'because the function is expected to return a value.',
    ]);

    createReactClass({
      displayName: 'NamedComponent',
      componentShouldUpdate: function () {
        return false;
      },
      render: function () {
        return <div />;
      },
    });
    assertConsoleErrorDev([
      'Warning: NamedComponent has a method called componentShouldUpdate(). Did you ' +
        'mean shouldComponentUpdate()? The name is phrased as a question ' +
        'because the function is expected to return a value.',
    ]);
  });

  it('should warn when misspelling componentWillReceiveProps', () => {
    createReactClass({
      componentWillRecieveProps: function () {
        return false;
      },
      render: function () {
        return <div />;
      },
    });
    assertConsoleErrorDev([
      'Warning: A component has a method called componentWillRecieveProps(). Did you ' +
        'mean componentWillReceiveProps()?',
    ]);
  });

  it('should warn when misspelling UNSAFE_componentWillReceiveProps', () => {
    createReactClass({
      UNSAFE_componentWillRecieveProps: function () {
        return false;
      },
      render: function () {
        return <div />;
      },
    });
    assertConsoleErrorDev([
      'Warning: A component has a method called UNSAFE_componentWillRecieveProps(). ' +
        'Did you mean UNSAFE_componentWillReceiveProps()?',
    ]);
  });

  it('should throw if a reserved property is in statics', () => {
    expect(function () {
      createReactClass({
        statics: {
          getDefaultProps: function () {
            return {
              foo: 0,
            };
          },
        },

        render: function () {
          return <span />;
        },
      });
    }).toThrowError(
      'ReactClass: You are attempting to define a reserved property, ' +
        '`getDefaultProps`, that shouldn\'t be on the "statics" key. Define ' +
        'it as an instance property instead; it will still be accessible on ' +
        'the constructor.',
    );
  });

  // TODO: Consider actually moving these to statics or drop this unit test.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should warn when using deprecated non-static spec keys', () => {
    createReactClass({
      mixins: [{}],
      propTypes: {
        foo: PropTypes.string,
      },
      contextTypes: {
        foo: PropTypes.string,
      },
      childContextTypes: {
        foo: PropTypes.string,
      },
      render: function () {
        return <div />;
      },
    });
    assertConsoleErrorDev([
      '`mixins` is now a static property and should ' +
        'be defined inside "statics".',
      '`propTypes` is now a static property and should ' +
        'be defined inside "statics".',
      '`contextTypes` is now a static property and ' +
        'should be defined inside "statics".',
      '`childContextTypes` is now a static property and ' +
        'should be defined inside "statics".',
    ]);
  });

  it('should support statics', async () => {
    const Component = createReactClass({
      statics: {
        abc: 'def',
        def: 0,
        ghi: null,
        jkl: 'mno',
        pqr: function () {
          return this;
        },
      },

      render: function () {
        return <span />;
      },
    });
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<Component ref={current => (instance = current)} />);
    });

    expect(instance.constructor.abc).toBe('def');
    expect(Component.abc).toBe('def');
    expect(instance.constructor.def).toBe(0);
    expect(Component.def).toBe(0);
    expect(instance.constructor.ghi).toBe(null);
    expect(Component.ghi).toBe(null);
    expect(instance.constructor.jkl).toBe('mno');
    expect(Component.jkl).toBe('mno');
    expect(instance.constructor.pqr()).toBe(Component);
    expect(Component.pqr()).toBe(Component);
  });

  it('should work with object getInitialState() return values', async () => {
    const Component = createReactClass({
      getInitialState: function () {
        return {
          occupation: 'clown',
        };
      },
      render: function () {
        return <span />;
      },
    });
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<Component ref={current => (instance = current)} />);
    });

    expect(instance.state.occupation).toEqual('clown');
  });

  it('should work with getDerivedStateFromProps() return values', async () => {
    const Component = createReactClass({
      getInitialState() {
        return {};
      },
      render: function () {
        return <span />;
      },
    });
    Component.getDerivedStateFromProps = () => {
      return {occupation: 'clown'};
    };
    let instance;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component ref={current => (instance = current)} />);
    });
    expect(instance.state.occupation).toEqual('clown');
  });

  // @gate !disableLegacyContext
  it('renders based on context getInitialState', async () => {
    const Foo = createReactClass({
      contextTypes: {
        className: PropTypes.string,
      },
      getInitialState() {
        return {className: this.context.className};
      },
      render() {
        return <span className={this.state.className} />;
      },
    });

    const Outer = createReactClass({
      childContextTypes: {
        className: PropTypes.string,
      },
      getChildContext() {
        return {className: 'foo'};
      },
      render() {
        return <Foo />;
      },
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });
    assertConsoleErrorDev([
      'Component uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)',
      'Component uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)' +
        '\n    in ReactClassComponent (at **)',
    ]);
    expect(container.firstChild.className).toBe('foo');
  });

  it('should throw with non-object getInitialState() return values', async () => {
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const state of [['an array'], 'a string', 1234]) {
      const Component = createReactClass({
        getInitialState: function () {
          return state;
        },
        render: function () {
          return <span />;
        },
      });
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(<Component />);
        }),
      ).rejects.toThrowError(
        'Component.getInitialState(): must return an object or null',
      );
    }
  });

  it('should work with a null getInitialState() return value', async () => {
    const Component = createReactClass({
      getInitialState: function () {
        return null;
      },
      render: function () {
        return <span />;
      },
    });
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<Component />);
      }),
    ).resolves.not.toThrow();
  });

  it('should throw when using legacy factories', () => {
    const Component = createReactClass({
      render() {
        return <div />;
      },
    });

    expect(() => Component()).toThrow();
    assertConsoleErrorDev([
      'Warning: Something is calling a React component directly. Use a ' +
        'factory or JSX instead. See: https://fb.me/react-legacyfactory',
    ]);
  });

  it('replaceState and callback works', async () => {
    const ops = [];
    const Component = createReactClass({
      getInitialState() {
        return {step: 0};
      },
      render() {
        ops.push('Render: ' + this.state.step);
        return <div />;
      },
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<Component ref={current => (instance = current)} />);
    });

    await act(() => {
      instance.replaceState({step: 1}, () => {
        ops.push('Callback: ' + instance.state.step);
      });
    });

    expect(ops).toEqual(['Render: 0', 'Render: 1', 'Callback: 1']);
  });

  it('getDerivedStateFromProps updates state when props change', async () => {
    const Component = createReactClass({
      getInitialState() {
        return {
          count: 1,
        };
      },
      render() {
        return <div>count:{this.state.count}</div>;
      },
    });
    Component.getDerivedStateFromProps = (nextProps, prevState) => ({
      count: prevState.count + nextProps.incrementBy,
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <Component incrementBy={0} />
        </div>,
      );
    });
    expect(container.firstChild.textContent).toEqual('count:1');
    await act(() => {
      root.render(
        <div>
          <Component incrementBy={2} />
        </div>,
      );
    });
    expect(container.firstChild.textContent).toEqual('count:3');
  });

  it('should support the new static getDerivedStateFromProps method', async () => {
    let instance;
    const Component = createReactClass({
      statics: {
        getDerivedStateFromProps: function () {
          return {foo: 'bar'};
        },
      },

      getInitialState() {
        return {};
      },

      render: function () {
        instance = this;
        return null;
      },
    });
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component />);
    });
    expect(instance.state.foo).toBe('bar');
  });

  it('warns if getDerivedStateFromProps is not static', async () => {
    const Foo = createReactClass({
      displayName: 'Foo',
      getDerivedStateFromProps() {
        return {};
      },
      render() {
        return <div />;
      },
    });
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Foo foo="foo" />);
    });
    assertConsoleErrorDev([
      'Foo: getDerivedStateFromProps() is defined as an instance method ' +
        'and will be ignored. Instead, declare it as a static method.\n' +
        '    in Foo (at **)',
    ]);
  });

  it('warns if getDerivedStateFromError is not static', async () => {
    const Foo = createReactClass({
      displayName: 'Foo',
      getDerivedStateFromError() {
        return {};
      },
      render() {
        return <div />;
      },
    });
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Foo foo="foo" />);
    });
    assertConsoleErrorDev([
      'Foo: getDerivedStateFromError() is defined as an instance method ' +
        'and will be ignored. Instead, declare it as a static method.\n' +
        '    in Foo (at **)',
    ]);
  });

  it('warns if getSnapshotBeforeUpdate is static', async () => {
    const Foo = createReactClass({
      displayName: 'Foo',
      statics: {
        getSnapshotBeforeUpdate: function () {
          return null;
        },
      },
      render() {
        return <div />;
      },
    });
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Foo foo="foo" />);
    });
    assertConsoleErrorDev([
      'Foo: getSnapshotBeforeUpdate() is defined as a static method ' +
        'and will be ignored. Instead, declare it as an instance method.\n' +
        '    in Foo (at **)',
    ]);
  });

  it('should warn if state is not properly initialized before getDerivedStateFromProps', async () => {
    const Component = createReactClass({
      displayName: 'Component',
      statics: {
        getDerivedStateFromProps: function () {
          return null;
        },
      },
      render: function () {
        return null;
      },
    });
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component />);
    });
    assertConsoleErrorDev([
      '`Component` uses `getDerivedStateFromProps` but its initial state is ' +
        'null. This is not recommended. Instead, define the initial state by ' +
        'assigning an object to `this.state` in the constructor of `Component`. ' +
        'This ensures that `getDerivedStateFromProps` arguments have a consistent shape.\n' +
        '    in Component (at **)',
    ]);
  });

  it('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new static gDSFP is present', async () => {
    const Component = createReactClass({
      statics: {
        getDerivedStateFromProps: function () {
          return null;
        },
      },
      componentWillMount: function () {
        throw Error('unexpected');
      },
      componentWillReceiveProps: function () {
        throw Error('unexpected');
      },
      componentWillUpdate: function () {
        throw Error('unexpected');
      },
      getInitialState: function () {
        return {};
      },
      render: function () {
        return null;
      },
    });
    Component.displayName = 'Component';

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
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your " +
        'code to use memoization techniques or move it to ' +
        'static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
    ]);
    await act(() => {
      root.render(<Component foo={1} />);
    });
  });

  it('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new getSnapshotBeforeUpdate is present', async () => {
    const Component = createReactClass({
      getSnapshotBeforeUpdate: function () {
        return null;
      },
      componentWillMount: function () {
        throw Error('unexpected');
      },
      componentWillReceiveProps: function () {
        throw Error('unexpected');
      },
      componentWillUpdate: function () {
        throw Error('unexpected');
      },
      componentDidUpdate: function () {},
      render: function () {
        return null;
      },
    });
    Component.displayName = 'Component';

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component />);
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
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your " +
        'code to use memoization techniques or move it to ' +
        'static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
    ]);
    await act(() => {
      const root2 = ReactDOMClient.createRoot(document.createElement('div'));
      root2.render(<Component foo={1} />);
    });
  });

  it('should invoke both deprecated and new lifecycles if both are present', async () => {
    const log = [];

    const Component = createReactClass({
      mixins: [
        {
          componentWillMount: function () {
            log.push('componentWillMount');
          },
          componentWillReceiveProps: function () {
            log.push('componentWillReceiveProps');
          },
          componentWillUpdate: function () {
            log.push('componentWillUpdate');
          },
        },
      ],
      UNSAFE_componentWillMount: function () {
        log.push('UNSAFE_componentWillMount');
      },
      UNSAFE_componentWillReceiveProps: function () {
        log.push('UNSAFE_componentWillReceiveProps');
      },
      UNSAFE_componentWillUpdate: function () {
        log.push('UNSAFE_componentWillUpdate');
      },
      render: function () {
        return null;
      },
    });

    const root = ReactDOMClient.createRoot(document.createElement('div'));

    await act(() => {
      root.render(<Component foo="bar" />);
    });
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
      'componentWillReceiveProps has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, refactor your " +
        'code to use memoization techniques or move it to ' +
        'static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state\n' +
        '* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
      'componentWillUpdate has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        '* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress ' +
        'this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, you can run ' +
        '`npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\nPlease update the following components: Component',
    ]);
    expect(log).toEqual(['componentWillMount', 'UNSAFE_componentWillMount']);

    log.length = 0;

    await act(() => {
      root.render(<Component foo="baz" />);
    });
    expect(log).toEqual([
      'componentWillReceiveProps',
      'UNSAFE_componentWillReceiveProps',
      'componentWillUpdate',
      'UNSAFE_componentWillUpdate',
    ]);
  });

  it('isMounted works', async () => {
    const ops = [];
    let instance;
    const Component = createReactClass({
      displayName: 'MyComponent',
      mixins: [
        {
          UNSAFE_componentWillMount() {
            this.log('mixin.componentWillMount');
          },
          componentDidMount() {
            this.log('mixin.componentDidMount');
          },
          UNSAFE_componentWillUpdate() {
            this.log('mixin.componentWillUpdate');
          },
          componentDidUpdate() {
            this.log('mixin.componentDidUpdate');
          },
          componentWillUnmount() {
            this.log('mixin.componentWillUnmount');
          },
        },
      ],
      log(name) {
        ops.push(`${name}: ${this.isMounted()}`);
      },
      getInitialState() {
        this.log('getInitialState');
        return {};
      },
      UNSAFE_componentWillMount() {
        this.log('componentWillMount');
      },
      componentDidMount() {
        this.log('componentDidMount');
      },
      UNSAFE_componentWillUpdate() {
        this.log('componentWillUpdate');
      },
      componentDidUpdate() {
        this.log('componentDidUpdate');
      },
      componentWillUnmount() {
        this.log('componentWillUnmount');
      },
      render() {
        instance = this;
        this.log('render');
        return <div />;
      },
    });

    const root = ReactDOMClient.createRoot(document.createElement('div'));

    await act(() => {
      root.render(<Component />);
    });
    assertConsoleErrorDev(
      [
        'Warning: MyComponent: isMounted is deprecated. Instead, make sure to ' +
          'clean up subscriptions and pending requests in componentWillUnmount ' +
          'to prevent memory leaks.\n' +
          '    in MyComponent (at **)',
      ],
      // This now has a component stack even though it's part of a third-party library.
    );

    // Dedupe

    await act(() => {
      root.render(<Component />);
    });

    await act(() => {
      root.unmount();
    });
    instance.log('after unmount');
    expect(ops).toEqual([
      'getInitialState: false',
      'mixin.componentWillMount: false',
      'componentWillMount: false',
      'render: false',
      'mixin.componentDidMount: true',
      'componentDidMount: true',
      'mixin.componentWillUpdate: true',
      'componentWillUpdate: true',
      'render: true',
      'mixin.componentDidUpdate: true',
      'componentDidUpdate: true',
      'mixin.componentWillUnmount: true',
      'componentWillUnmount: true',
      'after unmount: false',
    ]);
  });
});

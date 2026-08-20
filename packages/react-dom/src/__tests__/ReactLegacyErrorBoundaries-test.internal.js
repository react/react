/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let PropTypes;
let React;
let ReactDOM;
let act;
let assertConsoleErrorDev;

// TODO: Refactor this test once componentDidCatch setState is deprecated.
describe('ReactLegacyErrorBoundaries', () => {
  let log;

  let BrokenConstructor;
  let BrokenComponentWillMount;
  let BrokenComponentDidMount;
  let BrokenComponentWillReceiveProps;
  let BrokenComponentWillUpdate;
  let BrokenComponentDidUpdate;
  let BrokenComponentWillUnmount;
  let BrokenRenderErrorBoundary;
  let BrokenComponentWillMountErrorBoundary;
  let BrokenComponentDidMountErrorBoundary;
  let BrokenRender;
  let ErrorBoundary;
  let BothErrorBoundaries;
  let ErrorMessage;
  let NoopErrorBoundary;
  let RetryErrorBoundary;
  let Normal;

  beforeEach(() => {
    jest.resetModules();
    PropTypes = require('prop-types');
    ReactDOM = require('react-dom');
    React = require('react');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    log = [];

    BrokenConstructor = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('BrokenConstructor constructor [!]');
        throw new Error('Hello');
      }
      render() {
        log.push('BrokenConstructor render');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenConstructor componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenConstructor componentDidMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('BrokenConstructor componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenConstructor componentWillUpdate');
      }
      componentDidUpdate() {
        log.push('BrokenConstructor componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('BrokenConstructor componentWillUnmount');
      }
    };

    BrokenComponentWillMount = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('BrokenComponentWillMount constructor');
      }
      render() {
        log.push('BrokenComponentWillMount render');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenComponentWillMount componentWillMount [!]');
        throw new Error('Hello');
      }
      componentDidMount() {
        log.push('BrokenComponentWillMount componentDidMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('BrokenComponentWillMount componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenComponentWillMount componentWillUpdate');
      }
      componentDidUpdate() {
        log.push('BrokenComponentWillMount componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('BrokenComponentWillMount componentWillUnmount');
      }
    };

    BrokenComponentDidMount = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('BrokenComponentDidMount constructor');
      }
      render() {
        log.push('BrokenComponentDidMount render');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenComponentDidMount componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenComponentDidMount componentDidMount [!]');
        throw new Error('Hello');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('BrokenComponentDidMount componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenComponentDidMount componentWillUpdate');
      }
      componentDidUpdate() {
        log.push('BrokenComponentDidMount componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('BrokenComponentDidMount componentWillUnmount');
      }
    };

    BrokenComponentWillReceiveProps = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('BrokenComponentWillReceiveProps constructor');
      }
      render() {
        log.push('BrokenComponentWillReceiveProps render');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenComponentWillReceiveProps componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenComponentWillReceiveProps componentDidMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push(
          'BrokenComponentWillReceiveProps componentWillReceiveProps [!]',
        );
        throw new Error('Hello');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenComponentWillReceiveProps componentWillUpdate');
      }
      componentDidUpdate() {
        log.push('BrokenComponentWillReceiveProps componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('BrokenComponentWillReceiveProps componentWillUnmount');
      }
    };

    BrokenComponentWillUpdate = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('BrokenComponentWillUpdate constructor');
      }
      render() {
        log.push('BrokenComponentWillUpdate render');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenComponentWillUpdate componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenComponentWillUpdate componentDidMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('BrokenComponentWillUpdate componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenComponentWillUpdate componentWillUpdate [!]');
        throw new Error('Hello');
      }
      componentDidUpdate() {
        log.push('BrokenComponentWillUpdate componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('BrokenComponentWillUpdate componentWillUnmount');
      }
    };

    BrokenComponentDidUpdate = class extends React.Component {
      static defaultProps = {
        errorText: 'Hello',
      };
      constructor(props) {
        super(props);
        log.push('BrokenComponentDidUpdate constructor');
      }
      render() {
        log.push('BrokenComponentDidUpdate render');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenComponentDidUpdate componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenComponentDidUpdate componentDidMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('BrokenComponentDidUpdate componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenComponentDidUpdate componentWillUpdate');
      }
      componentDidUpdate() {
        log.push('BrokenComponentDidUpdate componentDidUpdate [!]');
        throw new Error(this.props.errorText);
      }
      componentWillUnmount() {
        log.push('BrokenComponentDidUpdate componentWillUnmount');
      }
    };

    BrokenComponentWillUnmount = class extends React.Component {
      static defaultProps = {
        errorText: 'Hello',
      };
      constructor(props) {
        super(props);
        log.push('BrokenComponentWillUnmount constructor');
      }
      render() {
        log.push('BrokenComponentWillUnmount render');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenComponentWillUnmount componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenComponentWillUnmount componentDidMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('BrokenComponentWillUnmount componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenComponentWillUnmount componentWillUpdate');
      }
      componentDidUpdate() {
        log.push('BrokenComponentWillUnmount componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('BrokenComponentWillUnmount componentWillUnmount [!]');
        throw new Error(this.props.errorText);
      }
    };

    BrokenComponentWillMountErrorBoundary = class extends React.Component {
      constructor(props) {
        super(props);
        this.state = {error: null};
        log.push('BrokenComponentWillMountErrorBoundary constructor');
      }
      render() {
        if (this.state.error) {
          log.push('BrokenComponentWillMountErrorBoundary render error');
          return <div>Caught an error: {this.state.error.message}.</div>;
        }
        log.push('BrokenComponentWillMountErrorBoundary render success');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push(
          'BrokenComponentWillMountErrorBoundary componentWillMount [!]',
        );
        throw new Error('Hello');
      }
      componentDidMount() {
        log.push('BrokenComponentWillMountErrorBoundary componentDidMount');
      }
      componentWillUnmount() {
        log.push('BrokenComponentWillMountErrorBoundary componentWillUnmount');
      }
      componentDidCatch(error) {
        log.push('BrokenComponentWillMountErrorBoundary componentDidCatch');
        this.setState({error});
      }
    };

    BrokenComponentDidMountErrorBoundary = class extends React.Component {
      constructor(props) {
        super(props);
        this.state = {error: null};
        log.push('BrokenComponentDidMountErrorBoundary constructor');
      }
      render() {
        if (this.state.error) {
          log.push('BrokenComponentDidMountErrorBoundary render error');
          return <div>Caught an error: {this.state.error.message}.</div>;
        }
        log.push('BrokenComponentDidMountErrorBoundary render success');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenComponentDidMountErrorBoundary componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenComponentDidMountErrorBoundary componentDidMount [!]');
        throw new Error('Hello');
      }
      componentWillUnmount() {
        log.push('BrokenComponentDidMountErrorBoundary componentWillUnmount');
      }
      componentDidCatch(error) {
        log.push('BrokenComponentDidMountErrorBoundary componentDidCatch');
        this.setState({error});
      }
    };

    BrokenRenderErrorBoundary = class extends React.Component {
      constructor(props) {
        super(props);
        this.state = {error: null};
        log.push('BrokenRenderErrorBoundary constructor');
      }
      render() {
        if (this.state.error) {
          log.push('BrokenRenderErrorBoundary render error [!]');
          throw new Error('Hello');
        }
        log.push('BrokenRenderErrorBoundary render success');
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenRenderErrorBoundary componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenRenderErrorBoundary componentDidMount');
      }
      componentWillUnmount() {
        log.push('BrokenRenderErrorBoundary componentWillUnmount');
      }
      componentDidCatch(error) {
        log.push('BrokenRenderErrorBoundary componentDidCatch');
        this.setState({error});
      }
    };

    BrokenRender = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('BrokenRender constructor');
      }
      render() {
        log.push('BrokenRender render [!]');
        throw new Error('Hello');
      }
      UNSAFE_componentWillMount() {
        log.push('BrokenRender componentWillMount');
      }
      componentDidMount() {
        log.push('BrokenRender componentDidMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('BrokenRender componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('BrokenRender componentWillUpdate');
      }
      componentDidUpdate() {
        log.push('BrokenRender componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('BrokenRender componentWillUnmount');
      }
    };

    NoopErrorBoundary = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('NoopErrorBoundary constructor');
      }
      render() {
        log.push('NoopErrorBoundary render');
        return <BrokenRender />;
      }
      UNSAFE_componentWillMount() {
        log.push('NoopErrorBoundary componentWillMount');
      }
      componentDidMount() {
        log.push('NoopErrorBoundary componentDidMount');
      }
      componentWillUnmount() {
        log.push('NoopErrorBoundary componentWillUnmount');
      }
      componentDidCatch() {
        log.push('NoopErrorBoundary componentDidCatch');
      }
    };

    Normal = class extends React.Component {
      static defaultProps = {
        logName: 'Normal',
      };
      constructor(props) {
        super(props);
        log.push(`${this.props.logName} constructor`);
      }
      render() {
        log.push(`${this.props.logName} render`);
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        log.push(`${this.props.logName} componentWillMount`);
      }
      componentDidMount() {
        log.push(`${this.props.logName} componentDidMount`);
      }
      UNSAFE_componentWillReceiveProps() {
        log.push(`${this.props.logName} componentWillReceiveProps`);
      }
      UNSAFE_componentWillUpdate() {
        log.push(`${this.props.logName} componentWillUpdate`);
      }
      componentDidUpdate() {
        log.push(`${this.props.logName} componentDidUpdate`);
      }
      componentWillUnmount() {
        log.push(`${this.props.logName} componentWillUnmount`);
      }
    };

    ErrorBoundary = class extends React.Component {
      constructor(props) {
        super(props);
        this.state = {error: null};
        log.push(`${this.props.logName} constructor`);
      }
      render() {
        if (this.state.error && !this.props.forceRetry) {
          log.push(`${this.props.logName} render error`);
          return this.props.renderError(this.state.error, this.props);
        }
        log.push(`${this.props.logName} render success`);
        return <div>{this.props.children}</div>;
      }
      componentDidCatch(error) {
        log.push(`${this.props.logName} componentDidCatch`);
        this.setState({error});
      }
      UNSAFE_componentWillMount() {
        log.push(`${this.props.logName} componentWillMount`);
      }
      componentDidMount() {
        log.push(`${this.props.logName} componentDidMount`);
      }
      UNSAFE_componentWillReceiveProps() {
        log.push(`${this.props.logName} componentWillReceiveProps`);
      }
      UNSAFE_componentWillUpdate() {
        log.push(`${this.props.logName} componentWillUpdate`);
      }
      componentDidUpdate() {
        log.push(`${this.props.logName} componentDidUpdate`);
      }
      componentWillUnmount() {
        log.push(`${this.props.logName} componentWillUnmount`);
      }
    };
    ErrorBoundary.defaultProps = {
      logName: 'ErrorBoundary',
      renderError(error, props) {
        return (
          <div ref={props.errorMessageRef}>
            Caught an error: {error.message}.
          </div>
        );
      },
    };

    BothErrorBoundaries = class extends React.Component {
      constructor(props) {
        super(props);
        this.state = {error: null};
        log.push('BothErrorBoundaries constructor');
      }

      static getDerivedStateFromError(error) {
        log.push('BothErrorBoundaries static getDerivedStateFromError');
        return {error};
      }

      render() {
        if (this.state.error) {
          log.push('BothErrorBoundaries render error');
          return <div>Caught an error: {this.state.error.message}.</div>;
        }
        log.push('BothErrorBoundaries render success');
        return <div>{this.props.children}</div>;
      }

      componentDidCatch(error) {
        log.push('BothErrorBoundaries componentDidCatch');
        this.setState({error});
      }

      UNSAFE_componentWillMount() {
        log.push('BothErrorBoundaries componentWillMount');
      }

      componentDidMount() {
        log.push('BothErrorBoundaries componentDidMount');
      }

      UNSAFE_componentWillReceiveProps() {
        log.push('BothErrorBoundaries componentWillReceiveProps');
      }

      UNSAFE_componentWillUpdate() {
        log.push('BothErrorBoundaries componentWillUpdate');
      }

      componentDidUpdate() {
        log.push('BothErrorBoundaries componentDidUpdate');
      }

      componentWillUnmount() {
        log.push('BothErrorBoundaries componentWillUnmount');
      }
    };

    RetryErrorBoundary = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('RetryErrorBoundary constructor');
      }
      render() {
        log.push('RetryErrorBoundary render');
        return <BrokenRender />;
      }
      UNSAFE_componentWillMount() {
        log.push('RetryErrorBoundary componentWillMount');
      }
      componentDidMount() {
        log.push('RetryErrorBoundary componentDidMount');
      }
      componentWillUnmount() {
        log.push('RetryErrorBoundary componentWillUnmount');
      }
      componentDidCatch(error) {
        log.push('RetryErrorBoundary componentDidCatch [!]');
        // In Fiber, calling setState() (and failing) is treated as a rethrow.
        this.setState({});
      }
    };

    ErrorMessage = class extends React.Component {
      constructor(props) {
        super(props);
        log.push('ErrorMessage constructor');
      }
      UNSAFE_componentWillMount() {
        log.push('ErrorMessage componentWillMount');
      }
      componentDidMount() {
        log.push('ErrorMessage componentDidMount');
      }
      componentWillUnmount() {
        log.push('ErrorMessage componentWillUnmount');
      }
      render() {
        log.push('ErrorMessage render');
        return <div>Caught an error: {this.props.message}.</div>;
      }
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // @gate !disableLegacyMode
  it('does not swallow exceptions on mounting without boundaries', async () => {
    let container = document.createElement('div');
    await expect(async () => {
      await act(() => {
        ReactDOM.render(<BrokenRender />, container);
      });
    }).rejects.toThrow('Hello');

    container = document.createElement('div');
    await expect(async () => {
      await act(() => {
        ReactDOM.render(<BrokenComponentWillMount />, container);
      });
    }).rejects.toThrow('Hello');

    container = document.createElement('div');
    await expect(async () => {
      await act(() => {
        ReactDOM.render(<BrokenComponentDidMount />, container);
      });
    }).rejects.toThrow('Hello');
  });

  // @gate !disableLegacyMode
  it('does not swallow exceptions on updating without boundaries', async () => {
    let container = document.createElement('div');
    ReactDOM.render(<BrokenComponentWillUpdate />, container);
    await expect(async () => {
      await act(() => {
        ReactDOM.render(<BrokenComponentWillUpdate />, container);
      });
    }).rejects.toThrow('Hello');

    container = document.createElement('div');
    ReactDOM.render(<BrokenComponentWillReceiveProps />, container);
    await expect(async () => {
      await act(() => {
        ReactDOM.render(<BrokenComponentWillReceiveProps />, container);
      });
    }).rejects.toThrow('Hello');

    container = document.createElement('div');
    ReactDOM.render(<BrokenComponentDidUpdate />, container);
    await expect(async () => {
      await act(() => {
        ReactDOM.render(<BrokenComponentDidUpdate />, container);
      });
    }).rejects.toThrow('Hello');
  });

  // @gate !disableLegacyMode
  it('does not swallow exceptions on unmounting without boundaries', async () => {
    const container = document.createElement('div');
    ReactDOM.render(<BrokenComponentWillUnmount />, container);
    await expect(async () => {
      await act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });
    }).rejects.toThrow('Hello');
  });

  // @gate !disableLegacyMode
  it('prevents errors from leaking into other roots', async () => {
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    const container3 = document.createElement('div');

    ReactDOM.render(<span>Before 1</span>, container1);
    await expect(async () => {
      await act(() => {
        ReactDOM.render(<BrokenRender />, container2);
      });
    }).rejects.toThrow('Hello');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
      container3,
    );
    expect(container1.firstChild.textContent).toBe('Before 1');
    expect(container2.firstChild).toBe(null);
    expect(container3.firstChild.textContent).toBe('Caught an error: Hello.');

    ReactDOM.render(<span>After 1</span>, container1);
    ReactDOM.render(<span>After 2</span>, container2);
    ReactDOM.render(
      <ErrorBoundary forceRetry={true}>After 3</ErrorBoundary>,
      container3,
    );
    expect(container1.firstChild.textContent).toBe('After 1');
    expect(container2.firstChild.textContent).toBe('After 2');
    expect(container3.firstChild.textContent).toBe('After 3');

    ReactDOM.unmountComponentAtNode(container1);
    ReactDOM.unmountComponentAtNode(container2);
    ReactDOM.unmountComponentAtNode(container3);
    expect(container1.firstChild).toBe(null);
    expect(container2.firstChild).toBe(null);
    expect(container3.firstChild).toBe(null);
  });

  // @gate !disableLegacyMode
  it('logs a single error using both error boundaries', () => {
    const container = document.createElement('div');
    spyOnDev(console, 'error');
    ReactDOM.render(
      <BothErrorBoundaries>
        <BrokenRender />
      </BothErrorBoundaries>,
      container,
    );
    if (__DEV__) {
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error.mock.calls[0][0]).toContain(
        'ReactDOM.render has not been supported since React 18',
      );
      expect(console.error.mock.calls[1][2]).toContain(
        'The above error occurred in the <BrokenRender> component',
      );
    }

    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'BothErrorBoundaries constructor',
      'BothErrorBoundaries componentWillMount',
      'BothErrorBoundaries render success',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // Both getDerivedStateFromError and componentDidCatch should be called
      'BothErrorBoundaries static getDerivedStateFromError',
      'BothErrorBoundaries componentWillMount',
      'BothErrorBoundaries render error',
      // Fiber mounts with null children before capturing error
      'BothErrorBoundaries componentDidMount',
      // Catch and render an error message
      'BothErrorBoundaries componentDidCatch',
      'BothErrorBoundaries componentWillUpdate',
      'BothErrorBoundaries render error',
      'BothErrorBoundaries componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['BothErrorBoundaries componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('renders an error state if child throws in render', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // Fiber mounts with null children before capturing error
      'ErrorBoundary componentDidMount',
      // Catch and render an error message
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('renders an error state if child throws in constructor', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenConstructor />
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenConstructor constructor [!]',
      // Fiber mounts with null children before capturing error
      'ErrorBoundary componentDidMount',
      // Catch and render an error message
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('renders an error state if child throws in componentWillMount', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentWillMount />
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenComponentWillMount constructor',
      'BrokenComponentWillMount componentWillMount [!]',
      'ErrorBoundary componentDidMount',
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyContext || !__DEV__
  // @gate !disableLegacyMode
  it('renders an error state if context provider throws in componentWillMount', () => {
    class BrokenComponentWillMountWithContext extends React.Component {
      static childContextTypes = {foo: PropTypes.number};
      getChildContext() {
        return {foo: 42};
      }
      render() {
        return <div>{this.props.children}</div>;
      }
      UNSAFE_componentWillMount() {
        throw new Error('Hello');
      }
    }

    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentWillMountWithContext />
      </ErrorBoundary>,
      container,
    );
    assertConsoleErrorDev([
      'BrokenComponentWillMountWithContext uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in BrokenComponentWillMountWithContext (at **)',
    ]);
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
  });

  // @gate !disableLegacyMode
  it('mounts the error message if mounting fails', () => {
    function renderError(error) {
      return <ErrorMessage message={error.message} />;
    }

    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary renderError={renderError}>
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      'ErrorBoundary componentDidMount',
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorMessage constructor',
      'ErrorMessage componentWillMount',
      'ErrorMessage render',
      'ErrorMessage componentDidMount',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual([
      'ErrorBoundary componentWillUnmount',
      'ErrorMessage componentWillUnmount',
    ]);
  });

  // @gate !disableLegacyMode
  it('propagates errors on retry on mounting', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <RetryErrorBoundary>
          <BrokenRender />
        </RetryErrorBoundary>
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'RetryErrorBoundary constructor',
      'RetryErrorBoundary componentWillMount',
      'RetryErrorBoundary render',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // In Fiber, failed error boundaries render null before attempting to recover
      'RetryErrorBoundary componentDidMount',
      'RetryErrorBoundary componentDidCatch [!]',
      'ErrorBoundary componentDidMount',
      // Retry
      'RetryErrorBoundary render',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // This time, the error propagates to the higher boundary
      'RetryErrorBoundary componentWillUnmount',
      'ErrorBoundary componentDidCatch',
      // Render the error
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('propagates errors inside boundary during componentWillMount', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentWillMountErrorBoundary />
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenComponentWillMountErrorBoundary constructor',
      'BrokenComponentWillMountErrorBoundary componentWillMount [!]',
      // The error propagates to the higher boundary
      'ErrorBoundary componentDidMount',
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('propagates errors inside boundary while rendering error state', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenRenderErrorBoundary>
          <BrokenRender />
        </BrokenRenderErrorBoundary>
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenRenderErrorBoundary constructor',
      'BrokenRenderErrorBoundary componentWillMount',
      'BrokenRenderErrorBoundary render success',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // The first error boundary catches the error
      // It adjusts state but throws displaying the message
      // Finish mounting with null children
      'BrokenRenderErrorBoundary componentDidMount',
      // Attempt to handle the error
      'BrokenRenderErrorBoundary componentDidCatch',
      'ErrorBoundary componentDidMount',
      'BrokenRenderErrorBoundary render error [!]',
      // Boundary fails with new error, propagate to next boundary
      'BrokenRenderErrorBoundary componentWillUnmount',
      // Attempt to handle the error again
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('does not call componentWillUnmount when aborting initial mount', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <BrokenRender />
        <Normal />
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      // Render first child
      'Normal constructor',
      'Normal componentWillMount',
      'Normal render',
      // Render second child (it throws)
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // Skip the remaining siblings
      // Finish mounting with null children
      'ErrorBoundary componentDidMount',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      // Render the error message
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('resets callback refs if mounting aborts', () => {
    function childRef(x) {
      log.push('Child ref is set to ' + x);
    }
    function errorMessageRef(x) {
      log.push('Error message ref is set to ' + x);
    }

    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary errorMessageRef={errorMessageRef}>
        <div ref={childRef} />
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // Handle error:
      // Finish mounting with null children
      'ErrorBoundary componentDidMount',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      // Render the error message
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'Error message ref is set to [object HTMLDivElement]',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual([
      'ErrorBoundary componentWillUnmount',
      'Error message ref is set to null',
    ]);
  });

  // @gate !disableLegacyMode
  it('resets object refs if mounting aborts', () => {
    const childRef = React.createRef();
    const errorMessageRef = React.createRef();

    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary errorMessageRef={errorMessageRef}>
        <div ref={childRef} />
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // Handle error:
      // Finish mounting with null children
      'ErrorBoundary componentDidMount',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      // Render the error message
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);
    expect(errorMessageRef.current.toString()).toEqual(
      '[object HTMLDivElement]',
    );

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
    expect(errorMessageRef.current).toEqual(null);
  });

  // @gate !disableLegacyMode
  it('successfully mounts if no error occurs', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <div>Mounted successfully.</div>
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Mounted successfully.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'ErrorBoundary componentDidMount',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches if child throws in constructor during update', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <Normal logName="Normal2" />
        <BrokenConstructor />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      'Normal componentWillReceiveProps',
      'Normal componentWillUpdate',
      'Normal render',
      // Normal2 will attempt to mount:
      'Normal2 constructor',
      'Normal2 componentWillMount',
      'Normal2 render',
      // BrokenConstructor will abort rendering:
      'BrokenConstructor constructor [!]',
      // Finish updating with null children
      'Normal componentWillUnmount',
      'ErrorBoundary componentDidUpdate',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      // Render the error message
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches if child throws in componentWillMount during update', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <Normal logName="Normal2" />
        <BrokenComponentWillMount />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      'Normal componentWillReceiveProps',
      'Normal componentWillUpdate',
      'Normal render',
      // Normal2 will attempt to mount:
      'Normal2 constructor',
      'Normal2 componentWillMount',
      'Normal2 render',
      // BrokenComponentWillMount will abort rendering:
      'BrokenComponentWillMount constructor',
      'BrokenComponentWillMount componentWillMount [!]',
      // Finish updating with null children
      'Normal componentWillUnmount',
      'ErrorBoundary componentDidUpdate',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      // Render the error message
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches if child throws in componentWillReceiveProps during update', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <BrokenComponentWillReceiveProps />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <BrokenComponentWillReceiveProps />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      'Normal componentWillReceiveProps',
      'Normal componentWillUpdate',
      'Normal render',
      // BrokenComponentWillReceiveProps will abort rendering:
      'BrokenComponentWillReceiveProps componentWillReceiveProps [!]',
      // Finish updating with null children
      'Normal componentWillUnmount',
      'BrokenComponentWillReceiveProps componentWillUnmount',
      'ErrorBoundary componentDidUpdate',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches if child throws in componentWillUpdate during update', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <BrokenComponentWillUpdate />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <BrokenComponentWillUpdate />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      'Normal componentWillReceiveProps',
      'Normal componentWillUpdate',
      'Normal render',
      // BrokenComponentWillUpdate will abort rendering:
      'BrokenComponentWillUpdate componentWillReceiveProps',
      'BrokenComponentWillUpdate componentWillUpdate [!]',
      // Finish updating with null children
      'Normal componentWillUnmount',
      'BrokenComponentWillUpdate componentWillUnmount',
      'ErrorBoundary componentDidUpdate',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches if child throws in render during update', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <Normal logName="Normal2" />
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      'Normal componentWillReceiveProps',
      'Normal componentWillUpdate',
      'Normal render',
      // Normal2 will attempt to mount:
      'Normal2 constructor',
      'Normal2 componentWillMount',
      'Normal2 render',
      // BrokenRender will abort rendering:
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // Finish updating with null children
      'Normal componentWillUnmount',
      'ErrorBoundary componentDidUpdate',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('keeps refs up-to-date during updates', () => {
    function child1Ref(x) {
      log.push('Child1 ref is set to ' + x);
    }
    function child2Ref(x) {
      log.push('Child2 ref is set to ' + x);
    }
    function errorMessageRef(x) {
      log.push('Error message ref is set to ' + x);
    }

    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary errorMessageRef={errorMessageRef}>
        <div ref={child1Ref} />
      </ErrorBoundary>,
      container,
    );
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'Child1 ref is set to [object HTMLDivElement]',
      'ErrorBoundary componentDidMount',
    ]);

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary errorMessageRef={errorMessageRef}>
        <div ref={child1Ref} />
        <div ref={child2Ref} />
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      // BrokenRender will abort rendering:
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // Finish updating with null children
      'Child1 ref is set to null',
      'ErrorBoundary componentDidUpdate',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'Error message ref is set to [object HTMLDivElement]',
      // Child2 ref is never set because its mounting aborted
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual([
      'ErrorBoundary componentWillUnmount',
      'Error message ref is set to null',
    ]);
  });

  // @gate !disableLegacyMode
  it('recovers from componentWillUnmount errors on update', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentWillUnmount />
        <BrokenComponentWillUnmount />
        <Normal />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentWillUnmount />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      // Update existing child:
      'BrokenComponentWillUnmount componentWillReceiveProps',
      'BrokenComponentWillUnmount componentWillUpdate',
      'BrokenComponentWillUnmount render',
      // Unmounting throws:
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      // Fiber proceeds with lifecycles despite errors
      'Normal componentWillUnmount',
      // The components have updated in this phase
      'BrokenComponentWillUnmount componentDidUpdate',
      'ErrorBoundary componentDidUpdate',
      // Now that commit phase is done, Fiber unmounts the boundary's children
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      'ErrorBoundary componentDidCatch',
      // The initial render was aborted, so
      // Fiber retries from the root.
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary componentDidUpdate',
      // The second willUnmount error should be captured and logged, too.
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      // Render an error now (stack will do it later)
      'ErrorBoundary render error',
      // Attempt to unmount previous child:
      // Done
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('recovers from nested componentWillUnmount errors on update', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal>
          <BrokenComponentWillUnmount />
        </Normal>
        <BrokenComponentWillUnmount />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <Normal>
          <BrokenComponentWillUnmount />
        </Normal>
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      // Update existing children:
      'Normal componentWillReceiveProps',
      'Normal componentWillUpdate',
      'Normal render',
      'BrokenComponentWillUnmount componentWillReceiveProps',
      'BrokenComponentWillUnmount componentWillUpdate',
      'BrokenComponentWillUnmount render',
      // Unmounting throws:
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      // Fiber proceeds with lifecycles despite errors
      'BrokenComponentWillUnmount componentDidUpdate',
      'Normal componentDidUpdate',
      'ErrorBoundary componentDidUpdate',
      'Normal componentWillUnmount',
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      // Now that commit phase is done, Fiber handles errors
      'ErrorBoundary componentDidCatch',
      // The initial render was aborted, so
      // Fiber retries from the root.
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary componentDidUpdate',
      // The second willUnmount error should be captured and logged, too.
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      // Render an error now (stack will do it later)
      'ErrorBoundary render error',
      // Done
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('picks the right boundary when handling unmounting errors', () => {
    function renderInnerError(error) {
      return <div>Caught an inner error: {error.message}.</div>;
    }
    function renderOuterError(error) {
      return <div>Caught an outer error: {error.message}.</div>;
    }

    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary
        logName="OuterErrorBoundary"
        renderError={renderOuterError}>
        <ErrorBoundary
          logName="InnerErrorBoundary"
          renderError={renderInnerError}>
          <BrokenComponentWillUnmount />
        </ErrorBoundary>
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary
        logName="OuterErrorBoundary"
        renderError={renderOuterError}>
        <ErrorBoundary
          logName="InnerErrorBoundary"
          renderError={renderInnerError}
        />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an inner error: Hello.');
    expect(log).toEqual([
      // Update outer boundary
      'OuterErrorBoundary componentWillReceiveProps',
      'OuterErrorBoundary componentWillUpdate',
      'OuterErrorBoundary render success',
      // Update inner boundary
      'InnerErrorBoundary componentWillReceiveProps',
      'InnerErrorBoundary componentWillUpdate',
      'InnerErrorBoundary render success',
      // Try unmounting child
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      // Fiber proceeds with lifecycles despite errors
      // Inner and outer boundaries have updated in this phase
      'InnerErrorBoundary componentDidUpdate',
      'OuterErrorBoundary componentDidUpdate',
      // Now that commit phase is done, Fiber handles errors
      // Only inner boundary receives the error:
      'InnerErrorBoundary componentDidCatch',
      'InnerErrorBoundary componentWillUpdate',
      // Render an error now
      'InnerErrorBoundary render error',
      // In Fiber, this was a local update to the
      // inner boundary so only its hook fires
      'InnerErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual([
      'OuterErrorBoundary componentWillUnmount',
      'InnerErrorBoundary componentWillUnmount',
    ]);
  });

  // @gate !disableLegacyMode
  it('can recover from error state', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );

    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
      </ErrorBoundary>,
      container,
    );
    // Error boundary doesn't retry by itself:
    expect(container.textContent).toBe('Caught an error: Hello.');

    // Force the success path:
    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary forceRetry={true}>
        <Normal />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).not.toContain('Caught an error');
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      // Mount children:
      'Normal constructor',
      'Normal componentWillMount',
      'Normal render',
      // Finalize updates:
      'Normal componentDidMount',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual([
      'ErrorBoundary componentWillUnmount',
      'Normal componentWillUnmount',
    ]);
  });

  // @gate !disableLegacyMode
  it('can update multiple times in error state', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');

    ReactDOM.render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');

    ReactDOM.render(<div>Other screen</div>, container);
    expect(container.textContent).toBe('Other screen');

    ReactDOM.unmountComponentAtNode(container);
  });

  // @gate !disableLegacyMode
  it("doesn't get into inconsistent state during removals", () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <BrokenComponentWillUnmount />
        <Normal />
      </ErrorBoundary>,
      container,
    );

    ReactDOM.render(<ErrorBoundary />, container);
    expect(container.textContent).toBe('Caught an error: Hello.');

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it("doesn't get into inconsistent state during additions", () => {
    const container = document.createElement('div');
    ReactDOM.render(<ErrorBoundary />, container);
    ReactDOM.render(
      <ErrorBoundary>
        <Normal />
        <BrokenRender />
        <Normal />
      </ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it("doesn't get into inconsistent state during reorders", () => {
    function getAMixOfNormalAndBrokenRenderElements() {
      const elements = [];
      for (let i = 0; i < 100; i++) {
        elements.push(<Normal key={i} />);
      }
      elements.push(<MaybeBrokenRender key={100} />);

      let currentIndex = elements.length;
      while (0 !== currentIndex) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        const temporaryValue = elements[currentIndex];
        elements[currentIndex] = elements[randomIndex];
        elements[randomIndex] = temporaryValue;
      }
      return elements;
    }

    class MaybeBrokenRender extends React.Component {
      render() {
        if (fail) {
          throw new Error('Hello');
        }
        return <div>{this.props.children}</div>;
      }
    }

    let fail = false;
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>{getAMixOfNormalAndBrokenRenderElements()}</ErrorBoundary>,
      container,
    );
    expect(container.textContent).not.toContain('Caught an error');

    fail = true;
    ReactDOM.render(
      <ErrorBoundary>{getAMixOfNormalAndBrokenRenderElements()}</ErrorBoundary>,
      container,
    );
    expect(container.textContent).toBe('Caught an error: Hello.');

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches errors originating downstream', () => {
    let fail = false;
    class Stateful extends React.Component {
      state = {shouldThrow: false};

      render() {
        if (fail) {
          log.push('Stateful render [!]');
          throw new Error('Hello');
        }
        return <div>{this.props.children}</div>;
      }
    }

    let statefulInst;
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <Stateful ref={inst => (statefulInst = inst)} />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    expect(() => {
      fail = true;
      statefulInst.forceUpdate();
    }).not.toThrow();

    expect(log).toEqual([
      'Stateful render [!]',
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches errors in componentDidMount', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentWillUnmount>
          <Normal />
        </BrokenComponentWillUnmount>
        <BrokenComponentDidMount />
        <Normal logName="LastChild" />
      </ErrorBoundary>,
      container,
    );
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenComponentWillUnmount constructor',
      'BrokenComponentWillUnmount componentWillMount',
      'BrokenComponentWillUnmount render',
      'Normal constructor',
      'Normal componentWillMount',
      'Normal render',
      'BrokenComponentDidMount constructor',
      'BrokenComponentDidMount componentWillMount',
      'BrokenComponentDidMount render',
      'LastChild constructor',
      'LastChild componentWillMount',
      'LastChild render',
      // Start flushing didMount queue
      'Normal componentDidMount',
      'BrokenComponentWillUnmount componentDidMount',
      'BrokenComponentDidMount componentDidMount [!]',
      // Continue despite the error
      'LastChild componentDidMount',
      'ErrorBoundary componentDidMount',
      // Now we are ready to handle the error
      // Safely unmount every child
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      // Continue unmounting safely despite any errors
      'Normal componentWillUnmount',
      'BrokenComponentDidMount componentWillUnmount',
      'LastChild componentWillUnmount',
      // Handle the error
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      // The willUnmount error should be captured and logged, too.
      'ErrorBoundary componentDidUpdate',
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      // The update has finished
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('catches errors in componentDidUpdate', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentDidUpdate />
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentDidUpdate />
      </ErrorBoundary>,
      container,
    );
    expect(log).toEqual([
      'ErrorBoundary componentWillReceiveProps',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render success',
      'BrokenComponentDidUpdate componentWillReceiveProps',
      'BrokenComponentDidUpdate componentWillUpdate',
      'BrokenComponentDidUpdate render',
      // All lifecycles run
      'BrokenComponentDidUpdate componentDidUpdate [!]',
      'ErrorBoundary componentDidUpdate',
      'BrokenComponentDidUpdate componentWillUnmount',
      // Then, error is handled
      'ErrorBoundary componentDidCatch',
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('propagates errors inside boundary during componentDidMount', () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary>
        <BrokenComponentDidMountErrorBoundary
          renderError={error => (
            <div>We should never catch our own error: {error.message}.</div>
          )}
        />
      </ErrorBoundary>,
      container,
    );
    expect(container.firstChild.textContent).toBe('Caught an error: Hello.');
    expect(log).toEqual([
      'ErrorBoundary constructor',
      'ErrorBoundary componentWillMount',
      'ErrorBoundary render success',
      'BrokenComponentDidMountErrorBoundary constructor',
      'BrokenComponentDidMountErrorBoundary componentWillMount',
      'BrokenComponentDidMountErrorBoundary render success',
      'BrokenComponentDidMountErrorBoundary componentDidMount [!]',
      // Fiber proceeds with the hooks
      'ErrorBoundary componentDidMount',
      'BrokenComponentDidMountErrorBoundary componentWillUnmount',
      // The error propagates to the higher boundary
      'ErrorBoundary componentDidCatch',
      // Fiber retries from the root
      'ErrorBoundary componentWillUpdate',
      'ErrorBoundary render error',
      'ErrorBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['ErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('calls componentDidCatch for each error that is captured', () => {
    function renderUnmountError(error) {
      return <div>Caught an unmounting error: {error.message}.</div>;
    }
    function renderUpdateError(error) {
      return <div>Caught an updating error: {error.message}.</div>;
    }

    const container = document.createElement('div');
    ReactDOM.render(
      <ErrorBoundary logName="OuterErrorBoundary">
        <ErrorBoundary
          logName="InnerUnmountBoundary"
          renderError={renderUnmountError}>
          <BrokenComponentWillUnmount errorText="E1" />
          <BrokenComponentWillUnmount errorText="E2" />
        </ErrorBoundary>
        <ErrorBoundary
          logName="InnerUpdateBoundary"
          renderError={renderUpdateError}>
          <BrokenComponentDidUpdate errorText="E3" />
          <BrokenComponentDidUpdate errorText="E4" />
        </ErrorBoundary>
      </ErrorBoundary>,
      container,
    );

    log.length = 0;
    ReactDOM.render(
      <ErrorBoundary logName="OuterErrorBoundary">
        <ErrorBoundary
          logName="InnerUnmountBoundary"
          renderError={renderUnmountError}
        />
        <ErrorBoundary
          logName="InnerUpdateBoundary"
          renderError={renderUpdateError}>
          <BrokenComponentDidUpdate errorText="E3" />
          <BrokenComponentDidUpdate errorText="E4" />
        </ErrorBoundary>
      </ErrorBoundary>,
      container,
    );

    expect(container.firstChild.textContent).toBe(
      'Caught an unmounting error: E2.' + 'Caught an updating error: E4.',
    );
    expect(log).toEqual([
      // Begin update phase
      'OuterErrorBoundary componentWillReceiveProps',
      'OuterErrorBoundary componentWillUpdate',
      'OuterErrorBoundary render success',
      'InnerUnmountBoundary componentWillReceiveProps',
      'InnerUnmountBoundary componentWillUpdate',
      'InnerUnmountBoundary render success',
      'InnerUpdateBoundary componentWillReceiveProps',
      'InnerUpdateBoundary componentWillUpdate',
      'InnerUpdateBoundary render success',
      // First come the updates
      'BrokenComponentDidUpdate componentWillReceiveProps',
      'BrokenComponentDidUpdate componentWillUpdate',
      'BrokenComponentDidUpdate render',
      'BrokenComponentDidUpdate componentWillReceiveProps',
      'BrokenComponentDidUpdate componentWillUpdate',
      'BrokenComponentDidUpdate render',
      // We're in commit phase now, deleting
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      'BrokenComponentWillUnmount componentWillUnmount [!]',
      // Continue despite errors, handle them after commit is done
      'InnerUnmountBoundary componentDidUpdate',
      // We're still in commit phase, now calling update lifecycles
      'BrokenComponentDidUpdate componentDidUpdate [!]',
      // Again, continue despite errors, we'll handle them later
      'BrokenComponentDidUpdate componentDidUpdate [!]',
      'InnerUpdateBoundary componentDidUpdate',
      'OuterErrorBoundary componentDidUpdate',
      // After the commit phase, attempt to recover from any errors that
      // were captured
      'BrokenComponentDidUpdate componentWillUnmount',
      'BrokenComponentDidUpdate componentWillUnmount',
      'InnerUnmountBoundary componentDidCatch',
      'InnerUnmountBoundary componentDidCatch',
      'InnerUpdateBoundary componentDidCatch',
      'InnerUpdateBoundary componentDidCatch',
      'InnerUnmountBoundary componentWillUpdate',
      'InnerUnmountBoundary render error',
      'InnerUpdateBoundary componentWillUpdate',
      'InnerUpdateBoundary render error',
      'InnerUnmountBoundary componentDidUpdate',
      'InnerUpdateBoundary componentDidUpdate',
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual([
      'OuterErrorBoundary componentWillUnmount',
      'InnerUnmountBoundary componentWillUnmount',
      'InnerUpdateBoundary componentWillUnmount',
    ]);
  });

  // @gate !disableLegacyMode
  it('discards a bad root if the root component fails', async () => {
    const X = null;
    const Y = undefined;

    await expect(async () => {
      const container = document.createElement('div');
      await act(() => {
        ReactDOM.render(<X />, container);
      });
    }).rejects.toThrow('got: null');

    await expect(async () => {
      const container = document.createElement('div');
      await act(() => {
        ReactDOM.render(<Y />, container);
      });
    }).rejects.toThrow('got: undefined');
  });

  // @gate !disableLegacyMode
  it('renders empty output if error boundary does not handle the error', async () => {
    const container = document.createElement('div');
    ReactDOM.render(
      <div>
        Sibling
        <NoopErrorBoundary>
          <BrokenRender />
        </NoopErrorBoundary>
      </div>,
      container,
    );
    assertConsoleErrorDev([
      'NoopErrorBoundary: Error boundaries should implement getDerivedStateFromError(). ' +
        'In that method, return a state update to display an error message or fallback UI.\n' +
        '    in NoopErrorBoundary (at **)',
    ]);
    expect(container.firstChild.textContent).toBe('Sibling');
    expect(log).toEqual([
      'NoopErrorBoundary constructor',
      'NoopErrorBoundary componentWillMount',
      'NoopErrorBoundary render',
      'BrokenRender constructor',
      'BrokenRender componentWillMount',
      'BrokenRender render [!]',
      // In Fiber, noop error boundaries render null
      'NoopErrorBoundary componentDidMount',
      'NoopErrorBoundary componentDidCatch',
      // Nothing happens.
    ]);

    log.length = 0;
    ReactDOM.unmountComponentAtNode(container);
    expect(log).toEqual(['NoopErrorBoundary componentWillUnmount']);
  });

  // @gate !disableLegacyMode
  it('passes first error when two errors happen in commit', async () => {
    const errors = [];
    class Parent extends React.Component {
      render() {
        return <Child />;
      }
      componentDidMount() {
        errors.push('parent sad');
        throw new Error('parent sad');
      }
    }
    class Child extends React.Component {
      render() {
        return <div />;
      }
      componentDidMount() {
        errors.push('child sad');
        throw new Error('child sad');
      }
    }

    const container = document.createElement('div');
    await expect(async () => {
      await act(() => {
        // Here, we test the behavior where there is no error boundary and we
        // delegate to the host root.
        ReactDOM.render(<Parent />, container);
      });
    }).rejects.toThrow(
      expect.objectContaining({
        errors: [
          expect.objectContaining({message: 'child sad'}),
          expect.objectContaining({message: 'parent sad'}),
        ],
      }),
    );

    expect(errors).toEqual(['child sad', 'parent sad']);
  });

  // @gate !disableLegacyMode
  it('propagates uncaught error inside unbatched initial mount', async () => {
    function Foo() {
      throw new Error('foo error');
    }
    const container = document.createElement('div');
    await expect(async () => {
      await act(() => {
        ReactDOM.unstable_batchedUpdates(() => {
          ReactDOM.render(<Foo />, container);
        });
      });
    }).rejects.toThrow('foo error');
  });

  // @gate !disableLegacyMode
  it('handles errors that occur in before-mutation commit hook', async () => {
    const errors = [];
    class Parent extends React.Component {
      getSnapshotBeforeUpdate() {
        errors.push('parent sad');
        throw new Error('parent sad');
      }
      componentDidUpdate() {}
      render() {
        return <Child {...this.props} />;
      }
    }
    class Child extends React.Component {
      getSnapshotBeforeUpdate() {
        errors.push('child sad');
        throw new Error('child sad');
      }
      componentDidUpdate() {}
      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    await act(() => {
      ReactDOM.render(<Parent value={1} />, container);
    });

    await expect(async () => {
      await act(() => {
        ReactDOM.render(<Parent value={2} />, container);
      });
    }).rejects.toThrow(
      expect.objectContaining({
        errors: [
          expect.objectContaining({message: 'child sad'}),
          expect.objectContaining({message: 'parent sad'}),
        ],
      }),
    );

    expect(errors).toEqual(['child sad', 'parent sad']);
    // Error should be the first thrown
  });
});

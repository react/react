/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  getVersionedRenderImplementation,
  normalizeCodeLocInfo,
} from 'react-devtools-shared/src/__tests__/utils';

let React;
let ReactDOMClient;
let act;
let rendererID;
let supportsOwnerStacks = false;

describe('console', () => {
  beforeEach(() => {
    const inject = global.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = internals => {
      rendererID = inject(internals);

      return rendererID;
    };

    React = require('react');
    if (
      React.version.startsWith('19') &&
      React.version.includes('experimental')
    ) {
      supportsOwnerStacks = true;
    }
    ReactDOMClient = require('react-dom/client');

    const utils = require('./utils');
    act = utils.act;
  });

  const {render} = getVersionedRenderImplementation();

  // @reactVersion >= 18.0
  it('should pass through logs when there is no current fiber', () => {
    expect(global.consoleLogMock).toHaveBeenCalledTimes(0);
    expect(global.consoleWarnMock).toHaveBeenCalledTimes(0);
    expect(global.consoleErrorMock).toHaveBeenCalledTimes(0);

    console.log('log');
    console.warn('warn');
    console.error('error');

    expect(global.consoleLogMock.mock.calls).toEqual([['log']]);
    expect(global.consoleWarnMock.mock.calls).toEqual([['warn']]);
    expect(global.consoleErrorMock.mock.calls).toEqual([['error']]);
  });

  // @reactVersion >= 18.0
  it('should not append multiple stacks', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = true;

    const Child = ({children}) => {
      console.warn('warn', '\n    in Child (at fake.js:123)');
      console.error('error', '\n    in Child (at fake.js:123)');
      return null;
    };

    act(() => render(<Child />));

    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual(['warn', '\n    in Child (at **)']);
    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual(['error', '\n    in Child (at **)']);
  });

  // @reactVersion >= 18.0
  it('should append component stacks to errors and warnings logged during render', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = true;

    const Intermediate = ({children}) => children;
    const Parent = ({children}) => (
      <Intermediate>
        <Child />
      </Intermediate>
    );
    const Child = ({children}) => {
      console.error('error');
      console.log('log');
      console.warn('warn');
      return null;
    };

    act(() => render(<Parent />));

    expect(global.consoleLogMock.mock.calls).toEqual([['log']]);
    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'warn',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'error',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
  });

  // @reactVersion >= 18.0
  it('should append component stacks to errors and warnings logged from effects', () => {
    const Intermediate = ({children}) => children;
    const Parent = ({children}) => (
      <Intermediate>
        <Child />
      </Intermediate>
    );
    const Child = ({children}) => {
      React.useLayoutEffect(function Child_useLayoutEffect() {
        console.error('active error');
        console.log('active log');
        console.warn('active warn');
      });
      React.useEffect(function Child_useEffect() {
        console.error('passive error');
        console.log('passive log');
        console.warn('passive warn');
      });
      return null;
    };

    act(() => render(<Parent />));

    expect(global.consoleLogMock.mock.calls).toEqual([
      ['active log'],
      ['passive log'],
    ]);

    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'active warn',
      supportsOwnerStacks
        ? '\n    in Child_useLayoutEffect (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleWarnMock.mock.calls[1].map(normalizeCodeLocInfo),
    ).toEqual([
      'passive warn',
      supportsOwnerStacks
        ? '\n    in Child_useEffect (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);

    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'active error',
      supportsOwnerStacks
        ? '\n    in Child_useLayoutEffect (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleErrorMock.mock.calls[1].map(normalizeCodeLocInfo),
    ).toEqual([
      'passive error',
      supportsOwnerStacks
        ? '\n    in Child_useEffect (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
  });

  // @reactVersion >= 18.0
  it('should append component stacks to errors and warnings logged from commit hooks', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = true;

    const Intermediate = ({children}) => children;
    const Parent = ({children}) => (
      <Intermediate>
        <Child />
      </Intermediate>
    );
    class Child extends React.Component<any> {
      componentDidMount() {
        console.error('didMount error');
        console.log('didMount log');
        console.warn('didMount warn');
      }
      componentDidUpdate() {
        console.error('didUpdate error');
        console.log('didUpdate log');
        console.warn('didUpdate warn');
      }
      render() {
        return null;
      }
    }

    act(() => render(<Parent />));
    act(() => render(<Parent />));

    expect(global.consoleLogMock.mock.calls).toEqual([
      ['didMount log'],
      ['didUpdate log'],
    ]);

    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'didMount warn',
      supportsOwnerStacks
        ? '\n    in Child.componentDidMount (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleWarnMock.mock.calls[1].map(normalizeCodeLocInfo),
    ).toEqual([
      'didUpdate warn',
      supportsOwnerStacks
        ? '\n    in Child.componentDidUpdate (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);

    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'didMount error',
      supportsOwnerStacks
        ? '\n    in Child.componentDidMount (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleErrorMock.mock.calls[1].map(normalizeCodeLocInfo),
    ).toEqual([
      'didUpdate error',
      supportsOwnerStacks
        ? '\n    in Child.componentDidUpdate (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
  });

  // @reactVersion >= 18.0
  it('should append component stacks to errors and warnings logged from gDSFP', () => {
    const Intermediate = ({children}) => children;
    const Parent = ({children}) => (
      <Intermediate>
        <Child />
      </Intermediate>
    );
    class Child extends React.Component<any, any> {
      state = {};
      static getDerivedStateFromProps() {
        console.error('error');
        console.log('log');
        console.warn('warn');
        return null;
      }
      render() {
        return null;
      }
    }

    act(() => render(<Parent />));

    expect(global.consoleLogMock.mock.calls).toEqual([['log']]);
    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'warn',
      supportsOwnerStacks
        ? '\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'error',
      supportsOwnerStacks
        ? '\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
  });

  // @reactVersion >= 18.0
  it('should be resilient to prepareStackTrace', () => {
    Error.prepareStackTrace = function (error, callsites) {
      const stack = ['An error occurred:', error.message];
      for (let i = 0; i < callsites.length; i++) {
        const callsite = callsites[i];
        stack.push(
          '\t' + callsite.getFunctionName(),
          '\t\tat ' + callsite.getFileName(),
          '\t\ton line ' + callsite.getLineNumber(),
        );
      }

      return stack.join('\n');
    };

    const Intermediate = ({children}) => children;
    const Parent = ({children}) => (
      <Intermediate>
        <Child />
      </Intermediate>
    );
    const Child = ({children}) => {
      console.error('error');
      console.log('log');
      console.warn('warn');
      return null;
    };

    act(() => render(<Parent />));

    expect(global.consoleLogMock.mock.calls).toEqual([['log']]);
    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'warn',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'error',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
  });

  // @reactVersion >= 18.0
  it('should correctly log Symbols', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;

    const Component = ({children}) => {
      console.warn('Symbol:', Symbol(''));
      return null;
    };

    act(() => render(<Component />));

    expect(global.consoleWarnMock.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "Symbol:",
        Symbol(),
      ],
    ]
    `);
  });

  it('should double log if hideConsoleLogsInStrictMode is disabled in Strict mode', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = false;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      console.log('log');
      console.warn('warn');
      console.error('error');
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    expect(global.consoleLogMock).toHaveBeenCalledTimes(2);
    expect(global.consoleLogMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'log',
    ]);

    expect(global.consoleWarnMock).toHaveBeenCalledTimes(2);
    expect(global.consoleWarnMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'warn',
    ]);

    expect(global.consoleErrorMock).toHaveBeenCalledTimes(2);
    expect(global.consoleErrorMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'error',
    ]);
  });

  it('should not double log if hideConsoleLogsInStrictMode is enabled in Strict mode', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = true;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      console.log('log');
      console.warn('warn');
      console.error('error');
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    expect(global.consoleLogMock).toHaveBeenCalledTimes(1);
    expect(global.consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(global.consoleErrorMock).toHaveBeenCalledTimes(1);
  });

  it('should double log from Effects if hideConsoleLogsInStrictMode is disabled in Strict mode', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = false;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      React.useEffect(() => {
        console.log('log effect create');
        console.warn('warn effect create');
        console.error('error effect create');

        return () => {
          console.log('log effect cleanup');
          console.warn('warn effect cleanup');
          console.error('error effect cleanup');
        };
      });

      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );
    expect(global.consoleLogMock.mock.calls).toEqual([
      ['log effect create'],
      ['\x1b[2;38;2;124;124;124m%s\x1b[0m', 'log effect cleanup'],
      ['\x1b[2;38;2;124;124;124m%s\x1b[0m', 'log effect create'],
    ]);
    expect(global.consoleWarnMock.mock.calls).toEqual([
      ['warn effect create'],
      ['\x1b[2;38;2;124;124;124m%s\x1b[0m', 'warn effect cleanup'],
      ['\x1b[2;38;2;124;124;124m%s\x1b[0m', 'warn effect create'],
    ]);
    expect(global.consoleErrorMock.mock.calls).toEqual([
      ['error effect create'],
      ['\x1b[2;38;2;124;124;124m%s\x1b[0m', 'error effect cleanup'],
      ['\x1b[2;38;2;124;124;124m%s\x1b[0m', 'error effect create'],
    ]);
  });

  it('should not double log from Effects if hideConsoleLogsInStrictMode is enabled in Strict mode', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = true;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      React.useEffect(() => {
        console.log('log effect create');
        console.warn('warn effect create');
        console.error('error effect create');

        return () => {
          console.log('log effect cleanup');
          console.warn('warn effect cleanup');
          console.error('error effect cleanup');
        };
      });

      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    expect(global.consoleLogMock).toHaveBeenCalledTimes(1);
    expect(global.consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(global.consoleErrorMock).toHaveBeenCalledTimes(1);
  });

  it('should double log from useMemo if hideConsoleLogsInStrictMode is disabled in Strict mode', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = false;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      React.useMemo(() => {
        console.log('log');
        console.warn('warn');
        console.error('error');
      }, []);
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    expect(global.consoleLogMock).toHaveBeenCalledTimes(2);
    expect(global.consoleLogMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'log',
    ]);

    expect(global.consoleWarnMock).toHaveBeenCalledTimes(2);
    expect(global.consoleWarnMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'warn',
    ]);

    expect(global.consoleErrorMock).toHaveBeenCalledTimes(2);
    expect(global.consoleErrorMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'error',
    ]);
  });

  it('should not double log from useMemo fns if hideConsoleLogsInStrictMode is enabled in Strict mode', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = true;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      React.useMemo(() => {
        console.log('log');
        console.warn('warn');
        console.error('error');
      }, []);
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    expect(global.consoleLogMock).toHaveBeenCalledTimes(1);
    expect(global.consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(global.consoleErrorMock).toHaveBeenCalledTimes(1);
  });

  it('should double log in Strict mode initial render for extension', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = false;

    // This simulates a render that happens before React DevTools have finished
    // their handshake to attach the React DOM renderer functions to DevTools
    // In this case, we should still be able to mock the console in Strict mode
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces.delete(rendererID);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      console.log('log');
      console.warn('warn');
      console.error('error');
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    expect(global.consoleLogMock).toHaveBeenCalledTimes(2);
    expect(global.consoleLogMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'log',
    ]);

    expect(global.consoleWarnMock).toHaveBeenCalledTimes(2);
    expect(global.consoleWarnMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'warn',
    ]);

    expect(global.consoleErrorMock).toHaveBeenCalledTimes(2);
    expect(global.consoleErrorMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'error',
    ]);
  });

  it('should not double log in Strict mode initial render for extension', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = true;

    // This simulates a render that happens before React DevTools have finished
    // their handshake to attach the React DOM renderer functions to DevTools
    // In this case, we should still be able to mock the console in Strict mode
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces.delete(rendererID);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      console.log('log');
      console.warn('warn');
      console.error('error');
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    expect(global.consoleLogMock).toHaveBeenCalledTimes(1);
    expect(global.consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(global.consoleErrorMock).toHaveBeenCalledTimes(1);
  });

  it('should properly dim component stacks during strict mode double log', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = true;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = false;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const Intermediate = ({children}) => children;
    const Parent = ({children}) => (
      <Intermediate>
        <Child />
      </Intermediate>
    );
    const Child = ({children}) => {
      console.error('error');
      console.warn('warn');
      return null;
    };

    act(() =>
      root.render(
        <React.StrictMode>
          <Parent />
        </React.StrictMode>,
      ),
    );

    expect(
      global.consoleWarnMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'warn',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);

    expect(
      global.consoleWarnMock.mock.calls[1].map(normalizeCodeLocInfo),
    ).toEqual([
      '\x1b[2;38;2;124;124;124m%s %o\x1b[0m',
      'warn',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : 'in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);

    expect(
      global.consoleErrorMock.mock.calls[0].map(normalizeCodeLocInfo),
    ).toEqual([
      'error',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : '\n    in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
    expect(
      global.consoleErrorMock.mock.calls[1].map(normalizeCodeLocInfo),
    ).toEqual([
      '\x1b[2;38;2;124;124;124m%s %o\x1b[0m',
      'error',
      supportsOwnerStacks
        ? '\n    in Child (at **)\n    in Parent (at **)'
        : 'in Child (at **)\n    in Intermediate (at **)\n    in Parent (at **)',
    ]);
  });

  it('should not dim console logs if disableSecondConsoleLogDimmingInStrictMode is enabled', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.disableSecondConsoleLogDimmingInStrictMode = true;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      console.log('log');
      console.warn('warn');
      console.error('error');
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    // Both logs should be called (double logging)
    expect(global.consoleLogMock).toHaveBeenCalledTimes(2);
    expect(global.consoleWarnMock).toHaveBeenCalledTimes(2);
    expect(global.consoleErrorMock).toHaveBeenCalledTimes(2);

    // The second log should NOT have dimming (no ANSI codes)
    expect(global.consoleLogMock.mock.calls[1]).toEqual(['log']);
    expect(global.consoleWarnMock.mock.calls[1]).toEqual(['warn']);
    expect(global.consoleErrorMock.mock.calls[1]).toEqual(['error']);
  });

  it('should dim console logs if disableSecondConsoleLogDimmingInStrictMode is disabled', () => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.appendComponentStack = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.hideConsoleLogsInStrictMode = false;
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.settings.disableSecondConsoleLogDimmingInStrictMode = false;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App() {
      console.log('log');
      console.warn('warn');
      console.error('error');
      return <div />;
    }

    act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );

    // Both logs should be called (double logging)
    expect(global.consoleLogMock).toHaveBeenCalledTimes(2);
    expect(global.consoleWarnMock).toHaveBeenCalledTimes(2);
    expect(global.consoleErrorMock).toHaveBeenCalledTimes(2);

    // The second log should have dimming (ANSI codes present)
    expect(global.consoleLogMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'log',
    ]);
    expect(global.consoleWarnMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'warn',
    ]);
    expect(global.consoleErrorMock.mock.calls[1]).toEqual([
      '\x1b[2;38;2;124;124;124m%s\x1b[0m',
      'error',
    ]);
  });
});

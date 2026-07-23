/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let ReactDOMServerBrowser;
let waitForAll;
let act;
let assertConsoleErrorDev;
let assertConsoleWarnDev;

// These tests rely both on ReactDOMServer and ReactDOM.
// If a test only needs ReactDOMServer, put it in ReactServerRendering-test instead.
describe('ReactDOMServerHydration', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    ReactDOMServerBrowser = require('react-dom/server.browser');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    act = InternalTestUtils.act;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
    assertConsoleWarnDev = InternalTestUtils.assertConsoleWarnDev;
  });

  it('should have the correct mounting behavior', async () => {
    let mountCount = 0;
    let numClicks = 0;

    class TestComponent extends React.Component {
      spanRef = React.createRef();

      componentDidMount() {
        mountCount++;
      }

      click = () => {
        numClicks++;
      };

      render() {
        return (
          <span ref={this.spanRef} onClick={this.click}>
            Name: {this.props.name}
          </span>
        );
      }
    }

    const element = document.createElement('div');
    document.body.appendChild(element);
    try {
      let root = ReactDOMClient.createRoot(element);
      await act(() => {
        root.render(<TestComponent />);
      });

      let lastMarkup = element.innerHTML;

      // Exercise the update path. Markup should not change,
      // but some lifecycle methods should be run again.
      await act(() => {
        root.render(<TestComponent name="x" />);
      });
      expect(mountCount).toEqual(1);

      // Unmount and remount. We should get another mount event and
      // we should get different markup, as the IDs are unique each time.
      root.unmount();
      expect(element.innerHTML).toEqual('');
      root = ReactDOMClient.createRoot(element);
      await act(() => {
        root.render(<TestComponent name="x" />);
      });

      expect(mountCount).toEqual(2);
      expect(element.innerHTML).not.toEqual(lastMarkup);

      // Now kill the node and render it on top of server-rendered markup, as if
      // we used server rendering. We should mount again, but the markup should
      // be unchanged. We will append a sentinel at the end of innerHTML to be
      // sure that innerHTML was not changed.
      await act(() => {
        root.unmount();
      });
      expect(element.innerHTML).toEqual('');

      lastMarkup = ReactDOMServer.renderToString(<TestComponent name="x" />);
      element.innerHTML = lastMarkup;

      let instance;

      root = await act(() => {
        return ReactDOMClient.hydrateRoot(
          element,
          <TestComponent name="x" ref={current => (instance = current)} />,
        );
      });
      expect(mountCount).toEqual(3);
      expect(element.innerHTML).toBe(lastMarkup);

      // Ensure the events system works after mount into server markup
      expect(numClicks).toEqual(0);
      instance.spanRef.current.click();
      expect(numClicks).toEqual(1);

      await act(() => {
        root.unmount();
      });
      expect(element.innerHTML).toEqual('');

      // Now simulate a situation where the app is not idempotent. React should
      // warn but do the right thing.
      element.innerHTML = lastMarkup;
      root = await act(() => {
        return ReactDOMClient.hydrateRoot(
          element,
          <TestComponent
            name="y"
            ref={current => {
              instance = current;
            }}
          />,
          {
            onRecoverableError: error => {},
          },
        );
      });

      expect(mountCount).toEqual(4);
      expect(element.innerHTML.length > 0).toBe(true);
      expect(element.innerHTML).not.toEqual(lastMarkup);

      // Ensure the events system works after markup mismatch.
      expect(numClicks).toEqual(1);
      instance.spanRef.current.click();
      expect(numClicks).toEqual(2);
    } finally {
      document.body.removeChild(element);
    }
  });

  // We have a polyfill for autoFocus on the client, but we intentionally don't
  // want it to call focus() when hydrating because this can mess up existing
  // focus before the JS has loaded.
  it('should emit autofocus on the server but not focus() when hydrating', async () => {
    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(
      <input autoFocus={true} />,
    );
    expect(element.firstChild.autofocus).toBe(true);

    // It should not be called on mount.
    element.firstChild.focus = jest.fn();
    const root = await act(() =>
      ReactDOMClient.hydrateRoot(element, <input autoFocus={true} />),
    );
    expect(element.firstChild.focus).not.toHaveBeenCalled();

    // Or during an update.
    await act(() => {
      root.render(<input autoFocus={true} />);
    });
    expect(element.firstChild.focus).not.toHaveBeenCalled();
  });

  it('should not focus on either server or client with autofocus={false}', async () => {
    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(
      <input autoFocus={false} />,
    );
    expect(element.firstChild.autofocus).toBe(false);

    element.firstChild.focus = jest.fn();
    const root = await act(() =>
      ReactDOMClient.hydrateRoot(element, <input autoFocus={false} />),
    );

    expect(element.firstChild.focus).not.toHaveBeenCalled();

    await act(() => {
      root.render(<input autoFocus={false} />);
    });
    expect(element.firstChild.focus).not.toHaveBeenCalled();
  });

  // Regression test for https://github.com/facebook/react/issues/11726
  it('should not focus on either server or client with autofocus={false} even if there is a markup mismatch', async () => {
    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(
      <button autoFocus={false}>server</button>,
    );
    expect(element.firstChild.autofocus).toBe(false);
    const onFocusBeforeHydration = jest.fn();
    const onFocusAfterHydration = jest.fn();
    element.firstChild.focus = onFocusBeforeHydration;

    await act(() => {
      ReactDOMClient.hydrateRoot(
        element,
        <button autoFocus={false} onFocus={onFocusAfterHydration}>
          client
        </button>,
        {onRecoverableError: error => {}},
      );
    });

    expect(onFocusBeforeHydration).not.toHaveBeenCalled();
    expect(onFocusAfterHydration).not.toHaveBeenCalled();
  });

  it('should warn when the style property differs', async () => {
    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(
      <div style={{textDecoration: 'none', color: 'black', height: '10px'}} />,
    );
    expect(element.firstChild.style.textDecoration).toBe('none');
    expect(element.firstChild.style.color).toBe('black');

    await act(() => {
      ReactDOMClient.hydrateRoot(
        element,
        <div
          style={{textDecoration: 'none', color: 'white', height: '10px'}}
        />,
      );
    });
    assertConsoleErrorDev([
      "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. " +
        "This won't be patched up. This can happen if a SSR-ed Client Component used:\n" +
        '\n' +
        "- A server/client branch `if (typeof window !== 'undefined')`.\n" +
        "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" +
        "- Date formatting in a user's locale which doesn't match the server.\n" +
        '- External changing data without sending a snapshot of it along with the HTML.\n' +
        '- Invalid HTML tag nesting.\n\nIt can also happen if the client has a browser extension ' +
        'installed which messes with the HTML before React loaded.\n' +
        '\n' +
        'https://react.dev/link/hydration-mismatch\n' +
        '\n' +
        '  <div\n    style={{\n+     textDecoration: "none"\n' +
        '+     color: "white"\n' +
        '-     color: "black"\n' +
        '+     height: "10px"\n' +
        '-     height: "10px"\n' +
        '-     text-decoration: "none"\n' +
        '    }}\n' +
        '  >\n' +
        '\n    in div (at **)',
    ]);
  });

  it('should not warn when the style property differs on whitespace or order in IE', async () => {
    document.documentMode = 11;
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    try {
      const element = document.createElement('div');

      // Simulate IE normalizing the style attribute. IE makes it equal to
      // what's available under `node.style.cssText`.
      element.innerHTML =
        '<div style="height: 10px; color: black; text-decoration: none;"></div>';

      await act(() => {
        ReactDOMClient.hydrateRoot(
          element,
          <div
            style={{textDecoration: 'none', color: 'black', height: '10px'}}
          />,
        );
      });
    } finally {
      delete document.documentMode;
    }
  });

  it('should warn when the style property differs on whitespace in non-IE browsers', async () => {
    const element = document.createElement('div');

    element.innerHTML =
      '<div style="text-decoration: none; color: black; height: 10px;"></div>';

    await act(() => {
      ReactDOMClient.hydrateRoot(
        element,
        <div
          style={{textDecoration: 'none', color: 'black', height: '10px'}}
        />,
      );
    });
    assertConsoleErrorDev([
      "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. " +
        "This won't be patched up. This can happen if a SSR-ed Client Component used:\n" +
        '\n' +
        "- A server/client branch `if (typeof window !== 'undefined')`.\n" +
        "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" +
        "- Date formatting in a user's locale which doesn't match the server.\n" +
        '- External changing data without sending a snapshot of it along with the HTML.\n' +
        '- Invalid HTML tag nesting.\n\nIt can also happen if the client has a browser extension ' +
        'installed which messes with the HTML before React loaded.\n' +
        '\n' +
        'https://react.dev/link/hydration-mismatch\n' +
        '\n' +
        '  <div\n' +
        '    style={{\n' +
        '+     textDecoration: "none"\n' +
        '+     color: "black"\n' +
        '-     color: "black"\n' +
        '+     height: "10px"\n' +
        '-     height: "10px"\n' +
        '-     text-decoration: "none"\n' +
        '    }}\n' +
        '  >\n' +
        '\n    in div (at **)',
    ]);
  });

  it('should throw rendering portals on the server', () => {
    const div = document.createElement('div');
    expect(() => {
      ReactDOMServer.renderToString(
        <div>{ReactDOM.createPortal(<div />, div)}</div>,
      );
    }).toThrow(
      'Portals are not currently supported by the server renderer. ' +
        'Render them conditionally so that they only appear on the client render.',
    );
  });

  it('should be able to render and hydrate Mode components', async () => {
    class ComponentWithWarning extends React.Component {
      componentWillMount() {
        // Expected warning
      }
      render() {
        return 'Hi';
      }
    }

    const markup = (
      <React.StrictMode>
        <ComponentWithWarning />
      </React.StrictMode>
    );

    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(markup);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n' +
        '\n' +
        '* Move code from componentWillMount to componentDidMount (preferred in most cases) or the constructor.\n' +
        '\n' +
        'Please update the following components: ComponentWithWarning\n' +
        '    in ComponentWithWarning (at **)',
    ]);
    expect(element.textContent).toBe('Hi');

    await act(() => {
      ReactDOMClient.hydrateRoot(element, markup);
    });
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n' +
        '\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n' +
        '* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. ' +
        'In React 18.x, only the UNSAFE_ name will work. ' +
        'To rename all deprecated lifecycles to their new names, ' +
        'you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.\n' +
        '\n' +
        'Please update the following components: ComponentWithWarning',
    ]);
    expect(element.textContent).toBe('Hi');
  });

  it('replays effects when hydrating a StrictMode subtree', async () => {
    const log = [];
    function Child() {
      React.useLayoutEffect(() => {
        log.push('layout mount');
        return () => log.push('layout unmount');
      }, []);
      React.useEffect(() => {
        log.push('effect mount');
        return () => log.push('effect unmount');
      }, []);
      return <span>Hello</span>;
    }

    function App() {
      return (
        <div>
          <Child />
        </div>
      );
    }

    const markup = (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(markup);
    expect(element.textContent).toBe('Hello');

    await act(() => {
      ReactDOMClient.hydrateRoot(element, markup);
    });

    if (__DEV__) {
      expect(log).toEqual([
        'layout mount',
        'effect mount',
        'layout unmount',
        'effect unmount',
        'layout mount',
        'effect mount',
      ]);
    } else {
      expect(log).toEqual(['layout mount', 'effect mount']);
    }
  });

  it('should be able to render and hydrate forwardRef components', async () => {
    const FunctionComponent = ({label, forwardedRef}) => (
      <div ref={forwardedRef}>{label}</div>
    );
    const WrappedFunctionComponent = React.forwardRef((props, ref) => (
      <FunctionComponent {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();
    const markup = <WrappedFunctionComponent ref={ref} label="Hi" />;

    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(markup);
    expect(element.textContent).toBe('Hi');
    expect(ref.current).toBe(null);

    await act(() => {
      ReactDOMClient.hydrateRoot(element, markup);
    });
    expect(element.textContent).toBe('Hi');
    expect(ref.current.tagName).toBe('DIV');
  });

  it('should be able to render and hydrate Profiler components', async () => {
    const callback = jest.fn();
    const markup = (
      <React.Profiler id="profiler" onRender={callback}>
        <div>Hi</div>
      </React.Profiler>
    );

    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(markup);
    expect(element.textContent).toBe('Hi');
    expect(callback).not.toHaveBeenCalled();

    await act(() => {
      ReactDOMClient.hydrateRoot(element, markup);
    });
    expect(element.textContent).toBe('Hi');
    if (__DEV__) {
      expect(callback).toHaveBeenCalledTimes(1);
      const [id, phase] = callback.mock.calls[0];
      expect(id).toBe('profiler');
      expect(phase).toBe('mount');
    } else {
      expect(callback).toHaveBeenCalledTimes(0);
    }
  });

  // Regression test for https://github.com/facebook/react/issues/11423
  it('should ignore noscript content on the client and not warn about mismatches', async () => {
    const callback = jest.fn();
    const TestComponent = ({onRender}) => {
      onRender();
      return <div>Enable JavaScript to run this app.</div>;
    };
    const markup = (
      <noscript>
        <TestComponent onRender={callback} />
      </noscript>
    );

    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(markup);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(element.textContent).toBe(
      '<div>Enable JavaScript to run this app.</div>',
    );

    await act(() => {
      ReactDOMClient.hydrateRoot(element, markup);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(element.textContent).toBe(
      '<div>Enable JavaScript to run this app.</div>',
    );
  });

  it('should be able to use lazy components after hydrating', async () => {
    let resolveLazy;
    const Lazy = React.lazy(
      () =>
        new Promise(resolve => {
          resolveLazy = () => {
            resolve({
              default: function World() {
                return 'world';
              },
            });
          };
        }),
    );
    class HelloWorld extends React.Component {
      state = {isClient: false};
      componentDidMount() {
        this.setState({
          isClient: true,
        });
      }
      render() {
        return (
          <div>
            Hello{' '}
            {this.state.isClient && (
              <React.Suspense fallback="loading">
                <Lazy />
              </React.Suspense>
            )}
          </div>
        );
      }
    }

    const element = document.createElement('div');
    element.innerHTML = ReactDOMServer.renderToString(<HelloWorld />);
    expect(element.textContent).toBe('Hello ');

    await act(() => {
      ReactDOMClient.hydrateRoot(element, <HelloWorld />);
    });
    expect(element.textContent).toBe('Hello loading');

    // Resolve Lazy component
    await act(() => resolveLazy());
    expect(element.textContent).toBe('Hello world');
  });

  it('does not re-enter hydration after committing the first one', async () => {
    const finalHTML = ReactDOMServer.renderToString(<div />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;
    const root = await act(() =>
      ReactDOMClient.hydrateRoot(container, <div />),
    );
    await act(() => root.render(null));
    // This should not reenter hydration state and therefore not trigger hydration
    // warnings.
    await act(() => root.render(<div />));
  });

  // regression test for https://github.com/facebook/react/issues/17170
  it('should not warn if dangerouslySetInnerHtml=undefined', async () => {
    const domElement = document.createElement('div');
    const reactElement = (
      <div dangerouslySetInnerHTML={undefined}>
        <p>Hello, World!</p>
      </div>
    );
    const markup = ReactDOMServer.renderToStaticMarkup(reactElement);
    domElement.innerHTML = markup;

    await act(() => {
      ReactDOMClient.hydrateRoot(domElement, reactElement);
    });

    expect(domElement.innerHTML).toEqual(markup);
  });

  it('should warn if innerHTML mismatches with dangerouslySetInnerHTML=undefined and children on the client', async () => {
    const domElement = document.createElement('div');
    const markup = ReactDOMServer.renderToStaticMarkup(
      <div dangerouslySetInnerHTML={{__html: '<p>server</p>'}} />,
    );
    domElement.innerHTML = markup;

    await act(() => {
      ReactDOMClient.hydrateRoot(
        domElement,
        <div dangerouslySetInnerHTML={undefined}>
          <p>client</p>
        </div>,
        {onRecoverableError: error => {}},
      );
    });

    expect(domElement.innerHTML).not.toEqual(markup);
  });

  it('should warn if innerHTML mismatches with dangerouslySetInnerHTML=undefined on the client', async () => {
    const domElement = document.createElement('div');
    const markup = ReactDOMServer.renderToStaticMarkup(
      <div dangerouslySetInnerHTML={{__html: '<p>server</p>'}} />,
    );
    domElement.innerHTML = markup;

    await act(() => {
      ReactDOMClient.hydrateRoot(
        domElement,
        <div dangerouslySetInnerHTML={undefined} />,
        {onRecoverableError: error => {}},
      );
    });

    expect(domElement.innerHTML).not.toEqual(markup);
  });

  it('should warn when hydrating read-only properties', async () => {
    const readOnlyProperties = [
      'offsetParent',
      'offsetTop',
      'offsetLeft',
      'offsetWidth',
      'offsetHeight',
      'isContentEditable',
      'outerText',
      'outerHTML',
    ];
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const readOnlyProperty of readOnlyProperties) {
      const props = {};
      props[readOnlyProperty] = 'hello';
      const jsx = React.createElement('my-custom-element', props);
      const element = document.createElement('div');
      element.innerHTML = ReactDOMServer.renderToString(jsx);
      await act(() => {
        ReactDOMClient.hydrateRoot(element, jsx);
      });
      assertConsoleErrorDev([
        `Assignment to read-only property will result in a no-op: \`${readOnlyProperty}\`
            in my-custom-element (at **)`,
      ]);
    }
  });

  it('should not re-assign properties on hydration', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const jsx = React.createElement('my-custom-element', {
      str: 'string',
      obj: {foo: 'bar'},
    });

    container.innerHTML = ReactDOMServer.renderToString(jsx);
    const customElement = container.querySelector('my-custom-element');

    // Install setters to activate `in` check
    Object.defineProperty(customElement, 'str', {
      set: function (x) {
        this._str = x;
      },
      get: function () {
        return this._str;
      },
    });
    Object.defineProperty(customElement, 'obj', {
      set: function (x) {
        this._obj = x;
      },
      get: function () {
        return this._obj;
      },
    });

    await act(() => {
      ReactDOMClient.hydrateRoot(container, jsx);
    });

    expect(customElement.getAttribute('str')).toBe('string');
    expect(customElement.getAttribute('obj')).toBe(null);
    expect(customElement.str).toBe(undefined);
    expect(customElement.obj).toBe(undefined);
  });

  it('refers users to apis that support Suspense when something suspends', async () => {
    const theInfinitePromise = new Promise(() => {});
    function InfiniteSuspend() {
      throw theInfinitePromise;
    }

    function App({isClient}) {
      return (
        <div>
          <React.Suspense fallback={'fallback'}>
            {isClient ? 'resolved' : <InfiniteSuspend />}
          </React.Suspense>
        </div>
      );
    }
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(
      <App isClient={false} />,
    );

    const errors = [];
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error, errorInfo) {
        errors.push(error.message);
      },
    });

    await waitForAll([]);
    expect(errors.length).toBe(1);
    if (__DEV__) {
      expect(errors[0]).toBe(
        'Switched to client rendering because the server rendering aborted due to:\n\n' +
          'The server used "renderToString" ' +
          'which does not support Suspense. If you intended for this Suspense boundary to render ' +
          'the fallback content on the server consider throwing an Error somewhere within the ' +
          'Suspense boundary. If you intended to have the server wait for the suspended component ' +
          'please switch to "renderToPipeableStream" which supports Suspense on the server',
      );
    } else {
      expect(errors[0]).toBe(
        'The server could not finish this Suspense boundary, likely due to ' +
          'an error during server rendering. Switched to client rendering.',
      );
    }
  });

  it('refers users to apis that support Suspense when something suspends (browser)', async () => {
    const theInfinitePromise = new Promise(() => {});
    function InfiniteSuspend() {
      throw theInfinitePromise;
    }

    function App({isClient}) {
      return (
        <div>
          <React.Suspense fallback={'fallback'}>
            {isClient ? 'resolved' : <InfiniteSuspend />}
          </React.Suspense>
        </div>
      );
    }
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServerBrowser.renderToString(
      <App isClient={false} />,
    );

    const errors = [];
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error, errorInfo) {
        errors.push(error.message);
      },
    });

    await waitForAll([]);
    expect(errors.length).toBe(1);
    if (__DEV__) {
      expect(errors[0]).toBe(
        'Switched to client rendering because the server rendering aborted due to:\n\n' +
          'The server used "renderToString" ' +
          'which does not support Suspense. If you intended for this Suspense boundary to render ' +
          'the fallback content on the server consider throwing an Error somewhere within the ' +
          'Suspense boundary. If you intended to have the server wait for the suspended component ' +
          'please switch to "renderToReadableStream" which supports Suspense on the server',
      );
    } else {
      expect(errors[0]).toBe(
        'The server could not finish this Suspense boundary, likely due to ' +
          'an error during server rendering. Switched to client rendering.',
      );
    }
  });

  it('allows rendering extra hidden inputs in a form', async () => {
    const element = document.createElement('div');
    element.innerHTML =
      '<form>' +
      '<input type="hidden" /><input type="hidden" name="a" value="A" />' +
      '<input type="hidden" /><input type="submit" name="b" value="B" />' +
      '<input type="hidden" /><button name="c" value="C"></button>' +
      '<input type="hidden" />' +
      '</form>';
    const form = element.firstChild;
    const ref = React.createRef();
    const a = React.createRef();
    const b = React.createRef();
    const c = React.createRef();
    await act(async () => {
      ReactDOMClient.hydrateRoot(
        element,
        <form ref={ref}>
          <input type="hidden" name="a" value="A" ref={a} />
          <input type="submit" name="b" value="B" ref={b} />
          <button name="c" value="C" ref={c} />
        </form>,
      );
    });

    // The content should not have been client rendered.
    expect(ref.current).toBe(form);

    expect(a.current.name).toBe('a');
    expect(a.current.value).toBe('A');
    expect(b.current.name).toBe('b');
    expect(b.current.value).toBe('B');
    expect(c.current.name).toBe('c');
    expect(c.current.value).toBe('C');
  });

  it('allows rendering extra hidden inputs immediately before a text instance', async () => {
    const element = document.createElement('div');
    element.innerHTML =
      '<button><input name="a" value="A" type="hidden" />Click <!-- -->me</button>';
    const button = element.firstChild;
    const ref = React.createRef();
    const extraText = 'me';

    await act(() => {
      ReactDOMClient.hydrateRoot(
        element,
        <button ref={ref}>Click {extraText}</button>,
      );
    });

    expect(ref.current).toBe(button);
  });

  it('should skip hydration of elements with dangerouslySetInnerHTML and suppressHydrationWarning', async () => {
    const htmlContent = {
      __html: '<p>This is <strong>HTML</strong> content</p>',
    };

    function TestComponent() {
      return (
        <div>
          <h1>Header</h1>
          <div
            className="testElement"
            dangerouslySetInnerHTML={htmlContent}
            suppressHydrationWarning={true}
          />
          <p>Footer</p>
        </div>
      );
    }

    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(<TestComponent />);

    const testElement = container.querySelector('.testElement');
    expect(testElement).not.toBe(null);
    expect(testElement.innerHTML).toBe(
      '<p>This is <strong>HTML</strong> content</p>',
    );

    // change content before hydration to simulate a mismatch
    testElement.innerHTML = '<h1>Content changed</h1>';

    // Hydrate - should not produce warnings when both props are set
    await act(() => {
      ReactDOMClient.hydrateRoot(container, <TestComponent />);
    });

    // Verify the innerHTML is preserved (not cleared or modified)
    expect(testElement.innerHTML).toBe(
      '<h1>Content changed</h1>',
    );
  });
});

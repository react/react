/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMComponent', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let ReactDOMServer;
  const ReactFeatureFlags = require('shared/ReactFeatureFlags');

  let act;
  let assertLog;
  let Scheduler;
  let assertConsoleErrorDev;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    assertLog = require('internal-test-utils').assertLog;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('updateDOM', () => {
    it('should handle className', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={{}} />);
      });

      await act(() => {
        root.render(<div className={'foo'} />);
      });
      expect(container.firstChild.className).toEqual('foo');
      await act(() => {
        root.render(<div className={'bar'} />);
      });
      expect(container.firstChild.className).toEqual('bar');
      await act(() => {
        root.render(<div className={null} />);
      });
      expect(container.firstChild.className).toEqual('');
    });

    it('should gracefully handle various style value types', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={{}} />);
      });
      const stubStyle = container.firstChild.style;

      // set initial style
      const setup = {
        display: 'block',
        left: '1px',
        top: 2,
        fontFamily: 'Arial',
      };
      await act(() => {
        root.render(<div style={setup} />);
      });
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.left).toEqual('1px');
      expect(stubStyle.top).toEqual('2px');
      expect(stubStyle.fontFamily).toEqual('Arial');

      // reset the style to their default state
      const reset = {display: '', left: null, top: false, fontFamily: true};
      await act(() => {
        root.render(<div style={reset} />);
      });
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.left).toEqual('');
      expect(stubStyle.top).toEqual('');
      expect(stubStyle.fontFamily).toEqual('');
    });

    it('should not update styles when mutating a proxy style object', async () => {
      const styleStore = {
        display: 'none',
        fontFamily: 'Arial',
        lineHeight: 1.2,
      };
      // We use a proxy style object so that we can mutate it even if it is
      // frozen in DEV.
      const styles = {
        get display() {
          return styleStore.display;
        },
        set display(v) {
          styleStore.display = v;
        },
        get fontFamily() {
          return styleStore.fontFamily;
        },
        set fontFamily(v) {
          styleStore.fontFamily = v;
        },
        get lineHeight() {
          return styleStore.lineHeight;
        },
        set lineHeight(v) {
          styleStore.lineHeight = v;
        },
      };
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles} />);
      });

      const stubStyle = container.firstChild.style;
      stubStyle.display = styles.display;
      stubStyle.fontFamily = styles.fontFamily;

      styles.display = 'block';

      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual('none');
      expect(stubStyle.fontFamily).toEqual('Arial');
      expect(stubStyle.lineHeight).toEqual('1.2');

      styles.fontFamily = 'Helvetica';

      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual('none');
      expect(stubStyle.fontFamily).toEqual('Arial');
      expect(stubStyle.lineHeight).toEqual('1.2');

      styles.lineHeight = 0.5;

      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual('none');
      expect(stubStyle.fontFamily).toEqual('Arial');
      expect(stubStyle.lineHeight).toEqual('1.2');

      await act(() => {
        root.render(<div style={undefined} />);
      });
      expect(stubStyle.display).toBe('');
      expect(stubStyle.fontFamily).toBe('');
      expect(stubStyle.lineHeight).toBe('');
    });

    it('should throw when mutating style objects', async () => {
      const style = {border: '1px solid black'};

      class App extends React.Component {
        state = {style: style};

        render() {
          return <div style={this.state.style}>asd</div>;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<App />);
      });

      if (__DEV__) {
        expect(() => (style.position = 'absolute')).toThrow();
      }
    });

    it('should warn for unknown prop', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div foo={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `foo` on <div> tag. Either remove it ' +
          'from the element, or pass a string or number value to keep ' +
          'it in the DOM. For details, see https://react.dev/link/attribute-behavior ' +
          '\n    in div (at **)',
      ]);
    });

    it('should group multiple unknown prop warnings together', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div foo={() => {}} baz={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid values for props `foo`, `baz` on <div> tag. Either remove ' +
          'them from the element, or pass a string or number value to keep ' +
          'them in the DOM. For details, see https://react.dev/link/attribute-behavior ' +
          '\n    in div (at **)',
      ]);
    });

    it('should warn for onDblClick prop', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div onDblClick={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid event handler property `onDblClick`. Did you mean `onDoubleClick`?\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn for unknown string event handlers', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div onUnknown='alert("hack")' />);
      });
      assertConsoleErrorDev([
        'Unknown event handler property `onUnknown`. It will be ignored.\n' +
          '    in div (at **)',
      ]);
      expect(container.firstChild.hasAttribute('onUnknown')).toBe(false);
      expect(container.firstChild.onUnknown).toBe(undefined);
      await act(() => {
        root.render(<div onunknown='alert("hack")' />);
      });
      assertConsoleErrorDev([
        'Unknown event handler property `onunknown`. It will be ignored.\n' +
          '    in div (at **)',
      ]);
      expect(container.firstChild.hasAttribute('onunknown')).toBe(false);
      expect(container.firstChild.onunknown).toBe(undefined);

      await act(() => {
        root.render(<div on-unknown='alert("hack")' />);
      });
      assertConsoleErrorDev([
        'Unknown event handler property `on-unknown`. It will be ignored.\n' +
          '    in div (at **)',
      ]);
      expect(container.firstChild.hasAttribute('on-unknown')).toBe(false);
      expect(container.firstChild['on-unknown']).toBe(undefined);
    });

    it('should warn for unknown function event handlers', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div onUnknown={function () {}} />);
      });
      assertConsoleErrorDev([
        'Unknown event handler property `onUnknown`. It will be ignored.\n' +
          '    in div (at **)',
      ]);
      expect(container.firstChild.hasAttribute('onUnknown')).toBe(false);
      expect(container.firstChild.onUnknown).toBe(undefined);
      await act(() => {
        root.render(<div onunknown={function () {}} />);
      });
      assertConsoleErrorDev([
        'Unknown event handler property `onunknown`. It will be ignored.\n' +
          '    in div (at **)',
      ]);
      expect(container.firstChild.hasAttribute('onunknown')).toBe(false);
      expect(container.firstChild.onunknown).toBe(undefined);
      await act(() => {
        root.render(<div on-unknown={function () {}} />);
      });
      assertConsoleErrorDev([
        'Unknown event handler property `on-unknown`. It will be ignored.\n' +
          '    in div (at **)',
      ]);
      expect(container.firstChild.hasAttribute('on-unknown')).toBe(false);
      expect(container.firstChild['on-unknown']).toBe(undefined);
    });

    it('should warn for badly cased React attributes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div CHILDREN="5" />);
      });
      assertConsoleErrorDev([
        'Invalid DOM property `CHILDREN`. Did you mean `children`?\n' +
          '    in div (at **)',
      ]);
      expect(container.firstChild.getAttribute('CHILDREN')).toBe('5');
    });

    it('should not warn for "0" as a unitless style value', async () => {
      class Component extends React.Component {
        render() {
          return <div style={{margin: '0'}} />;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Component />);
      });
    });

    it('should warn nicely about NaN in style', async () => {
      const style = {fontSize: NaN};
      const div = document.createElement('div');
      const root = ReactDOMClient.createRoot(div);
      await act(() => {
        root.render(<span style={style} />);
      });
      assertConsoleErrorDev([
        '`NaN` is an invalid value for the `fontSize` css style property.\n' +
          '    in span (at **)',
      ]);
      await act(() => {
        root.render(<span style={style} />);
      });
    });

    it('throws with Temporal-like objects as style values', async () => {
      class TemporalLike {
        valueOf() {
          // Throwing here is the behavior of ECMAScript "Temporal" date/time API.
          // See https://tc39.es/proposal-temporal/docs/plaindate.html#valueOf
          throw new TypeError('prod message');
        }
        toString() {
          return '2020-01-01';
        }
      }
      const style = {fontSize: new TemporalLike()};
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await expect(async () => {
        await act(() => {
          root.render(<span style={style} />);
        });
      }).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `fontSize` CSS property is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in span (at **)',
        'The provided `fontSize` CSS property is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in span (at **)',
      ]);
    });

    it('should update styles if initially null', async () => {
      let styles = null;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles} />);
      });

      const stubStyle = container.firstChild.style;

      styles = {display: 'block'};

      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual('block');
    });

    it('should update styles if updated to null multiple times', async () => {
      let styles = null;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles} />);
      });

      styles = {display: 'block'};
      const stubStyle = container.firstChild.style;

      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual('block');

      await act(() => {
        root.render(<div style={null} />);
      });
      expect(stubStyle.display).toEqual('');

      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual('block');

      await act(() => {
        root.render(<div style={null} />);
      });
      expect(stubStyle.display).toEqual('');
    });

    it('should allow named slot projection on both web components and regular DOM elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <my-component>
            <my-second-component slot="first" />
            <button slot="second">Hello</button>
          </my-component>,
        );
      });

      const lightDOM = container.firstChild.childNodes;

      expect(lightDOM[0].getAttribute('slot')).toBe('first');
      expect(lightDOM[1].getAttribute('slot')).toBe('second');
    });

    it('should skip reserved props on web components', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <my-component
            children={['foo']}
            suppressContentEditableWarning={true}
            suppressHydrationWarning={true}
          />,
        );
      });
      expect(container.firstChild.hasAttribute('children')).toBe(false);
      expect(
        container.firstChild.hasAttribute('suppressContentEditableWarning'),
      ).toBe(false);
      expect(
        container.firstChild.hasAttribute('suppressHydrationWarning'),
      ).toBe(false);

      await act(() => {
        root.render(
          <my-component
            children={['bar']}
            suppressContentEditableWarning={false}
            suppressHydrationWarning={false}
          />,
        );
      });
      expect(container.firstChild.hasAttribute('children')).toBe(false);
      expect(
        container.firstChild.hasAttribute('suppressContentEditableWarning'),
      ).toBe(false);
      expect(
        container.firstChild.hasAttribute('suppressHydrationWarning'),
      ).toBe(false);
    });

    it('should skip dangerouslySetInnerHTML on web components', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<my-component dangerouslySetInnerHTML={{__html: 'hi'}} />);
      });
      expect(container.firstChild.hasAttribute('dangerouslySetInnerHTML')).toBe(
        false,
      );

      await act(() => {
        root.render(<my-component dangerouslySetInnerHTML={{__html: 'bye'}} />);
      });
      expect(container.firstChild.hasAttribute('dangerouslySetInnerHTML')).toBe(
        false,
      );
    });

    it('should render null and undefined as empty but print other falsy values', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: 'textContent'}} />);
      });
      expect(container.textContent).toEqual('textContent');

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: 0}} />);
      });
      expect(container.textContent).toEqual('0');

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: false}} />);
      });
      expect(container.textContent).toEqual('false');

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: ''}} />);
      });
      expect(container.textContent).toEqual('');

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: null}} />);
      });
      expect(container.textContent).toEqual('');

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: undefined}} />);
      });
      expect(container.textContent).toEqual('');
    });

    it('should remove attributes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<img height="17" />);
      });

      expect(container.firstChild.hasAttribute('height')).toBe(true);
      await act(() => {
        root.render(<img />);
      });
      expect(container.firstChild.hasAttribute('height')).toBe(false);
    });

    it('should remove properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className="monkey" />);
      });

      expect(container.firstChild.className).toEqual('monkey');
      await act(() => {
        root.render(<div />);
      });
      expect(container.firstChild.className).toEqual('');
    });

    it('should not set null/undefined attributes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      // Initial render.
      await act(() => {
        root.render(<img src={null} data-foo={undefined} />);
      });
      const node = container.firstChild;
      expect(node.hasAttribute('src')).toBe(false);
      expect(node.hasAttribute('data-foo')).toBe(false);
      // Update in one direction.
      await act(() => {
        root.render(<img src={undefined} data-foo={null} />);
      });
      expect(node.hasAttribute('src')).toBe(false);
      expect(node.hasAttribute('data-foo')).toBe(false);
      // Update in another direction.
      await act(() => {
        root.render(<img src={null} data-foo={undefined} />);
      });
      expect(node.hasAttribute('src')).toBe(false);
      expect(node.hasAttribute('data-foo')).toBe(false);
      // Removal.
      await act(() => {
        root.render(<img />);
      });
      expect(node.hasAttribute('src')).toBe(false);
      expect(node.hasAttribute('data-foo')).toBe(false);
      // Addition.
      await act(() => {
        root.render(<img src={undefined} data-foo={null} />);
      });
      expect(node.hasAttribute('src')).toBe(false);
      expect(node.hasAttribute('data-foo')).toBe(false);
    });

    it('should not add an empty src attribute', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<img src="" />);
      });
      assertConsoleErrorDev([
        'An empty string ("") was passed to the src attribute. ' +
          'This may cause the browser to download the whole page again over the network. ' +
          'To fix this, either do not render the element at all ' +
          'or pass null to src instead of an empty string.\n' +
          '    in img (at **)',
      ]);
      const node = container.firstChild;
      expect(node.hasAttribute('src')).toBe(false);

      await act(() => {
        root.render(<img src="abc" />);
      });
      expect(node.hasAttribute('src')).toBe(true);

      await act(() => {
        root.render(<img src="" />);
      });
      assertConsoleErrorDev([
        'An empty string ("") was passed to the src attribute. ' +
          'This may cause the browser to download the whole page again over the network. ' +
          'To fix this, either do not render the element at all ' +
          'or pass null to src instead of an empty string.\n' +
          '    in img (at **)',
      ]);
      expect(node.hasAttribute('src')).toBe(false);
    });

    it('should not add an empty href attribute', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<link href="" />);
      });
      assertConsoleErrorDev([
        'An empty string ("") was passed to the href attribute. ' +
          'To fix this, either do not render the element at all ' +
          'or pass null to href instead of an empty string.\n' +
          '    in link (at **)',
      ]);
      const node = container.firstChild;
      expect(node.hasAttribute('href')).toBe(false);

      await act(() => {
        root.render(<link href="abc" />);
      });
      expect(node.hasAttribute('href')).toBe(true);

      await act(() => {
        root.render(<link href="" />);
      });
      assertConsoleErrorDev([
        'An empty string ("") was passed to the href attribute. ' +
          'To fix this, either do not render the element at all ' +
          'or pass null to href instead of an empty string.\n' +
          '    in link (at **)',
      ]);
      expect(node.hasAttribute('href')).toBe(false);
    });

    it('should allow an empty href attribute on anchors', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<a href="" />);
      });
      const node = container.firstChild;
      expect(node.getAttribute('href')).toBe('');
    });

    it('should allow an empty action attribute', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<form action="" />);
      });
      const node = container.firstChild;
      expect(node.getAttribute('action')).toBe('');

      await act(() => {
        root.render(<form action="abc" />);
      });
      expect(node.hasAttribute('action')).toBe(true);

      await act(() => {
        root.render(<form action="" />);
      });
      expect(node.getAttribute('action')).toBe('');
    });

    it('allows empty string of a formAction to override the default of a parent', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <form action="hello">
            <button formAction="" />,
          </form>,
        );
      });
      const node = container.firstChild.firstChild;
      expect(node.hasAttribute('formaction')).toBe(true);
      expect(node.getAttribute('formaction')).toBe('');
    });

    it('should not filter attributes for custom elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <some-custom-element action="" formAction="" href="" src="" />,
        );
      });
      const node = container.firstChild;
      expect(node.hasAttribute('action')).toBe(true);
      expect(node.hasAttribute('formAction')).toBe(true);
      expect(node.hasAttribute('href')).toBe(true);
      expect(node.hasAttribute('src')).toBe(true);
    });

    it('should apply React-specific aliases to HTML elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<form acceptCharset="foo" />);
      });
      const node = container.firstChild;
      // Test attribute initialization.
      expect(node.getAttribute('accept-charset')).toBe('foo');
      expect(node.hasAttribute('acceptCharset')).toBe(false);
      // Test attribute update.
      await act(() => {
        root.render(<form acceptCharset="boo" />);
      });
      expect(node.getAttribute('accept-charset')).toBe('boo');
      expect(node.hasAttribute('acceptCharset')).toBe(false);
      // Test attribute removal by setting to null.
      await act(() => {
        root.render(<form acceptCharset={null} />);
      });
      expect(node.hasAttribute('accept-charset')).toBe(false);
      expect(node.hasAttribute('acceptCharset')).toBe(false);
      // Restore.
      await act(() => {
        root.render(<form acceptCharset="foo" />);
      });
      expect(node.getAttribute('accept-charset')).toBe('foo');
      expect(node.hasAttribute('acceptCharset')).toBe(false);
      // Test attribute removal by setting to undefined.
      await act(() => {
        root.render(<form acceptCharset={undefined} />);
      });
      expect(node.hasAttribute('accept-charset')).toBe(false);
      expect(node.hasAttribute('acceptCharset')).toBe(false);
      // Restore.
      await act(() => {
        root.render(<form acceptCharset="foo" />);
      });
      expect(node.getAttribute('accept-charset')).toBe('foo');
      expect(node.hasAttribute('acceptCharset')).toBe(false);
      // Test attribute removal.
      await act(() => {
        root.render(<form />);
      });
      expect(node.hasAttribute('accept-charset')).toBe(false);
      expect(node.hasAttribute('acceptCharset')).toBe(false);
    });

    it('should apply React-specific aliases to SVG elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<svg arabicForm="foo" />);
      });
      const node = container.firstChild;
      // Test attribute initialization.
      expect(node.getAttribute('arabic-form')).toBe('foo');
      expect(node.hasAttribute('arabicForm')).toBe(false);
      // Test attribute update.
      await act(() => {
        root.render(<svg arabicForm="boo" />);
      });
      expect(node.getAttribute('arabic-form')).toBe('boo');
      expect(node.hasAttribute('arabicForm')).toBe(false);
      // Test attribute removal by setting to null.
      await act(() => {
        root.render(<svg arabicForm={null} />);
      });
      expect(node.hasAttribute('arabic-form')).toBe(false);
      expect(node.hasAttribute('arabicForm')).toBe(false);
      // Restore.
      await act(() => {
        root.render(<svg arabicForm="foo" />);
      });
      expect(node.getAttribute('arabic-form')).toBe('foo');
      expect(node.hasAttribute('arabicForm')).toBe(false);
      // Test attribute removal by setting to undefined.
      await act(() => {
        root.render(<svg arabicForm={undefined} />);
      });
      expect(node.hasAttribute('arabic-form')).toBe(false);
      expect(node.hasAttribute('arabicForm')).toBe(false);
      // Restore.
      await act(() => {
        root.render(<svg arabicForm="foo" />);
      });
      expect(node.getAttribute('arabic-form')).toBe('foo');
      expect(node.hasAttribute('arabicForm')).toBe(false);
      // Test attribute removal.
      await act(() => {
        root.render(<svg />);
      });
      expect(node.hasAttribute('arabic-form')).toBe(false);
      expect(node.hasAttribute('arabicForm')).toBe(false);
    });

    it('should properly update custom attributes on custom elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<some-custom-element foo="bar" />);
      });
      expect(container.firstChild.getAttribute('foo')).toBe('bar');
      await act(() => {
        root.render(<some-custom-element bar="buzz" />);
      });
      expect(container.firstChild.hasAttribute('foo')).toBe(false);
      expect(container.firstChild.getAttribute('bar')).toBe('buzz');
      const node = container.firstChild;
      expect(node.hasAttribute('foo')).toBe(false);
      expect(node.getAttribute('bar')).toBe('buzz');
    });

    it('should not apply React-specific aliases to custom elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<some-custom-element arabicForm="foo" />);
      });
      const node = container.firstChild;
      // Should not get transformed to arabic-form as SVG would be.
      expect(node.getAttribute('arabicForm')).toBe('foo');
      expect(node.hasAttribute('arabic-form')).toBe(false);
      // Test attribute update.
      await act(() => {
        root.render(<some-custom-element arabicForm="boo" />);
      });
      expect(node.getAttribute('arabicForm')).toBe('boo');
      // Test attribute removal and addition.
      await act(() => {
        root.render(<some-custom-element acceptCharset="buzz" />);
      });
      // Verify the previous attribute was removed.
      expect(node.hasAttribute('arabicForm')).toBe(false);
      // Should not get transformed to accept-charset as HTML would be.
      expect(node.getAttribute('acceptCharset')).toBe('buzz');
      expect(node.hasAttribute('accept-charset')).toBe(false);
    });

    it('should clear a single style prop when changing `style`', async () => {
      let styles = {display: 'none', color: 'red'};
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles} />);
      });

      const stubStyle = container.firstChild.style;

      styles = {color: 'green'};
      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.color).toEqual('green');
    });

    it('should reject attribute key injection attack on markup for regular DOM (SSR)', () => {
      for (let i = 0; i < 3; i++) {
        const element1 = React.createElement(
          'div',
          {'blah" onclick="beevil" noise="hi': 'selected'},
          null,
        );
        const element2 = React.createElement(
          'div',
          {'></div><script>alert("hi")</script>': 'selected'},
          null,
        );
        const result1 = ReactDOMServer.renderToString(element1);
        const result2 = ReactDOMServer.renderToString(element2);
        expect(result1.toLowerCase()).not.toContain('onclick');
        expect(result2.toLowerCase()).not.toContain('script');
      }
      assertConsoleErrorDev([
        'Invalid attribute name: `blah" onclick="beevil" noise="hi`\n' +
          '    in div (at **)',
        'Invalid attribute name: `></div><script>alert("hi")</script>`\n' +
          '    in div (at **)',
      ]);
    });

    it('should reject attribute key injection attack on markup for custom elements (SSR)', () => {
      for (let i = 0; i < 3; i++) {
        const element1 = React.createElement(
          'x-foo-component',
          {'blah" onclick="beevil" noise="hi': 'selected'},
          null,
        );
        const element2 = React.createElement(
          'x-foo-component',
          {'></x-foo-component><script>alert("hi")</script>': 'selected'},
          null,
        );
        const result1 = ReactDOMServer.renderToString(element1);
        const result2 = ReactDOMServer.renderToString(element2);
        expect(result1.toLowerCase()).not.toContain('onclick');
        expect(result2.toLowerCase()).not.toContain('script');
      }
      assertConsoleErrorDev([
        'Invalid attribute name: `blah" onclick="beevil" noise="hi`\n' +
          '    in x-foo-component (at **)',
        'Invalid attribute name: `></x-foo-component><script>alert("hi")</script>`\n' +
          '    in x-foo-component (at **)',
      ]);
    });

    it('should reject attribute key injection attack on mount for regular DOM', async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement('div');
        let root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement(
              'div',
              {'blah" onclick="beevil" noise="hi': 'selected'},
              null,
            ),
          );
        });

        expect(container.firstChild.attributes.length).toBe(0);
        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `blah" onclick="beevil" noise="hi`\n' +
              '    in div (at **)',
          ]);
        }
        await act(() => {
          root.unmount();
        });
        root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement(
              'div',
              {'></div><script>alert("hi")</script>': 'selected'},
              null,
            ),
          );
        });
        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `></div><script>alert("hi")</script>`\n' +
              '    in div (at **)',
          ]);
        }

        expect(container.firstChild.attributes.length).toBe(0);
      }
    });

    it('should reject attribute key injection attack on mount for custom elements', async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement('div');
        let root = ReactDOMClient.createRoot(container);

        await act(() => {
          root.render(
            React.createElement(
              'x-foo-component',
              {'blah" onclick="beevil" noise="hi': 'selected'},
              null,
            ),
          );
        });

        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `blah" onclick="beevil" noise="hi`\n' +
              '    in x-foo-component (at **)',
          ]);
        }
        expect(container.firstChild.attributes.length).toBe(0);
        await act(() => {
          root.unmount();
        });

        root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement(
              'x-foo-component',
              {'></x-foo-component><script>alert("hi")</script>': 'selected'},
              null,
            ),
          );
        });

        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `></x-foo-component><script>alert("hi")</script>`\n' +
              '    in x-foo-component (at **)',
          ]);
        }
        expect(container.firstChild.attributes.length).toBe(0);
      }
    });

    it('should reject attribute key injection attack on update for regular DOM', async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement('div');
        const beforeUpdate = React.createElement('div', {}, null);
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(beforeUpdate);
        });
        await act(() => {
          root.render(
            React.createElement(
              'div',
              {'blah" onclick="beevil" noise="hi': 'selected'},
              null,
            ),
          );
        });

        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `blah" onclick="beevil" noise="hi`\n' +
              '    in div (at **)',
          ]);
        }
        expect(container.firstChild.attributes.length).toBe(0);
        await act(() => {
          root.render(
            React.createElement(
              'div',
              {'></div><script>alert("hi")</script>': 'selected'},
              null,
            ),
          );
        });
        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `></div><script>alert("hi")</script>`\n' +
              '    in div (at **)',
          ]);
        }

        expect(container.firstChild.attributes.length).toBe(0);
      }
    });

    it('should reject attribute key injection attack on update for custom elements', async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement('div');
        const beforeUpdate = React.createElement('x-foo-component', {}, null);
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(beforeUpdate);
        });
        await act(() => {
          root.render(
            React.createElement(
              'x-foo-component',
              {'blah" onclick="beevil" noise="hi': 'selected'},
              null,
            ),
          );
        });

        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `blah" onclick="beevil" noise="hi`\n' +
              '    in x-foo-component (at **)',
          ]);
        }
        expect(container.firstChild.attributes.length).toBe(0);
        await act(() => {
          root.render(
            React.createElement(
              'x-foo-component',
              {'></x-foo-component><script>alert("hi")</script>': 'selected'},
              null,
            ),
          );
        });

        if (i === 0) {
          assertConsoleErrorDev([
            'Invalid attribute name: `></x-foo-component><script>alert("hi")</script>`\n' +
              '    in x-foo-component (at **)',
          ]);
        }
        expect(container.firstChild.attributes.length).toBe(0);
      }
    });

    it('should update arbitrary attributes for tags containing dashes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const beforeUpdate = React.createElement('x-foo-component', {}, null);
      await act(() => {
        root.render(beforeUpdate);
      });

      const afterUpdate = <x-foo-component myattr="myval" />;
      await act(() => {
        root.render(afterUpdate);
      });

      expect(container.childNodes[0].getAttribute('myattr')).toBe('myval');
    });

    it('should clear all the styles when removing `style`', async () => {
      const styles = {display: 'none', color: 'red'};
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles} />);
      });

      const stubStyle = container.firstChild.style;

      await act(() => {
        root.render(<div />);
      });
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.color).toEqual('');
    });

    it('should update styles when `style` changes from null to object', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const styles = {color: 'red'};
      await act(() => {
        root.render(<div style={styles} />);
      });
      const stubStyle = container.firstChild.style;
      expect(stubStyle.color).toBe('red');
      await act(() => {
        root.render(<div />);
      });
      expect(stubStyle.color).toBe('');
      await act(() => {
        root.render(<div style={styles} />);
      });

      expect(stubStyle.color).toBe('red');
    });

    it('should not reset innerHTML for when children is null', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });
      container.firstChild.innerHTML = 'bonjour';
      expect(container.firstChild.innerHTML).toEqual('bonjour');

      await act(() => {
        root.render(<div />);
      });
      expect(container.firstChild.innerHTML).toEqual('bonjour');
    });

    it('should reset innerHTML when switching from a direct text child to an empty child', async () => {
      const transitionToValues = [null, undefined, false];
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const transitionToValue of transitionToValues) {
        const container = document.createElement('div');
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<div>bonjour</div>);
        });
        expect(container.firstChild.innerHTML).toEqual('bonjour');

        await act(() => {
          root.render(<div>{transitionToValue}</div>);
        });
        expect(container.firstChild.innerHTML).toEqual('');
      }
    });

    it('should empty element when removing innerHTML', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: ':)'}} />);
      });

      expect(container.firstChild.innerHTML).toEqual(':)');
      await act(() => {
        root.render(<div />);
      });
      expect(container.firstChild.innerHTML).toEqual('');
    });

    it('should transition from string content to innerHTML', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div>hello</div>);
      });

      expect(container.firstChild.innerHTML).toEqual('hello');
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: 'goodbye'}} />);
      });
      expect(container.firstChild.innerHTML).toEqual('goodbye');
    });

    it('should transition from innerHTML to string content', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: 'bonjour'}} />);
      });

      expect(container.firstChild.innerHTML).toEqual('bonjour');
      await act(() => {
        root.render(<div>adieu</div>);
      });
      expect(container.firstChild.innerHTML).toEqual('adieu');
    });

    it('should transition from innerHTML to children in nested el', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <div dangerouslySetInnerHTML={{__html: 'bonjour'}} />
          </div>,
        );
      });

      expect(container.textContent).toEqual('bonjour');
      await act(() => {
        root.render(
          <div>
            <div>
              <span>adieu</span>
            </div>
          </div>,
        );
      });
      expect(container.textContent).toEqual('adieu');
    });

    it('should transition from children to innerHTML in nested el', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <div>
              <span>adieu</span>
            </div>
          </div>,
        );
      });

      expect(container.textContent).toEqual('adieu');
      await act(() => {
        root.render(
          <div>
            <div dangerouslySetInnerHTML={{__html: 'bonjour'}} />
          </div>,
        );
      });
      expect(container.textContent).toEqual('bonjour');
    });

    it('should not incur unnecessary DOM mutations for attributes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div id="" />);
      });

      const node = container.firstChild;
      const nodeSetAttribute = node.setAttribute;
      node.setAttribute = jest.fn();
      node.setAttribute.mockImplementation(nodeSetAttribute);

      const nodeRemoveAttribute = node.removeAttribute;
      node.removeAttribute = jest.fn();
      node.removeAttribute.mockImplementation(nodeRemoveAttribute);

      await act(() => {
        root.render(<div id="" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(0);
      expect(node.removeAttribute).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<div id="foo" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(1);
      expect(node.removeAttribute).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<div id="foo" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(1);
      expect(node.removeAttribute).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<div />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(1);
      expect(node.removeAttribute).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div id="" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(2);
      expect(node.removeAttribute).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(2);
      expect(node.removeAttribute).toHaveBeenCalledTimes(2);
    });

    it('should not incur unnecessary DOM mutations for string properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div value="" />);
      });

      const node = container.firstChild;

      const nodeValueSetter = jest.fn();

      const oldSetAttribute = node.setAttribute.bind(node);
      node.setAttribute = function (key, value) {
        oldSetAttribute(key, value);
        nodeValueSetter(key, value);
      };

      await act(() => {
        root.render(<div value="foo" />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div value="foo" />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div value={null} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div value="" />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);

      await act(() => {
        root.render(<div />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);
    });

    it('should not incur unnecessary DOM mutations for controlled string properties', async () => {
      function onChange() {}
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input value="" onChange={onChange} />);
      });

      const node = container.firstChild;

      let nodeValue = '';
      const nodeValueSetter = jest.fn();
      Object.defineProperty(node, 'value', {
        get: function () {
          return nodeValue;
        },
        set: nodeValueSetter.mockImplementation(function (newValue) {
          nodeValue = newValue;
        }),
      });

      await act(() => {
        root.render(<input value="foo" onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(
          <input value="foo" data-unrelated={true} onChange={onChange} />,
        );
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<input onChange={onChange} />);
      });
      assertConsoleErrorDev([
        'A component is changing a controlled input to be uncontrolled. This is likely caused by ' +
          'the value changing from a defined to undefined, which should not happen. Decide between ' +
          'using a controlled or uncontrolled input element for the lifetime of the component. ' +
          'More info: https://react.dev/link/controlled-components\n' +
          '    in input (at **)',
      ]);
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<input value={null} onChange={onChange} />);
      });
      assertConsoleErrorDev([
        '`value` prop on `input` should not be null. Consider using an empty string to clear the ' +
          'component or `undefined` for uncontrolled components.\n' +
          '    in input (at **)',
      ]);
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<input value="" onChange={onChange} />);
      });
      assertConsoleErrorDev([
        'A component is changing an uncontrolled input to be controlled. This is likely caused by ' +
          'the value changing from undefined to a defined value, which should not happen. Decide between ' +
          'using a controlled or uncontrolled input element for the lifetime of the component. ' +
          'More info: https://react.dev/link/controlled-components\n' +
          '    in input (at **)',
      ]);
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);

      await act(() => {
        root.render(<input onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);
    });

    it('should not incur unnecessary DOM mutations for boolean properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<audio muted={true} />);
      });

      const node = container.firstChild;
      let nodeValue = true;
      const nodeValueSetter = jest.fn();
      Object.defineProperty(node, 'muted', {
        get: function () {
          return nodeValue;
        },
        set: nodeValueSetter.mockImplementation(function (newValue) {
          nodeValue = newValue;
        }),
      });

      await act(() => {
        root.render(<audio muted={true} data-unrelated="yes" />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<audio muted={false} data-unrelated="ok" />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);
    });

    it('should ignore attribute list for elements with the "is" attribute', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<button is="test" cowabunga="chevynova" />);
      });
      expect(container.firstChild.hasAttribute('cowabunga')).toBe(true);
    });

    it('should warn about non-string "is" attribute', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<button is={function () {}} />);
      });
      assertConsoleErrorDev([
        'Received a `function` for a string attribute `is`. If this is expected, cast ' +
          'the value to a string.\n' +
          '    in button (at **)',
      ]);
    });

    it('should not update when switching between null/undefined', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });

      const setter = jest.fn();
      container.firstChild.setAttribute = setter;

      await act(() => {
        root.render(<div dir={null} />);
      });
      await act(() => {
        root.render(<div dir={undefined} />);
      });
      await act(() => {
        root.render(<div />);
      });
      expect(setter).toHaveBeenCalledTimes(0);
      await act(() => {
        root.render(<div dir="ltr" />);
      });
      expect(setter).toHaveBeenCalledTimes(1);
    });

    it('handles multiple child updates without interference', async () => {
      // This test might look like it's just testing ReactMultiChild but the
      // last bug in this was actually in DOMChildrenOperations so this test
      // needs to be in some DOM-specific test file.
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      // ABCD
      await act(() => {
        root.render(
          <div>
            <div key="one">
              <div key="A">A</div>
              <div key="B">B</div>
            </div>
            <div key="two">
              <div key="C">C</div>
              <div key="D">D</div>
            </div>
          </div>,
        );
      });
      // BADC
      await act(() => {
        root.render(
          <div>
            <div key="one">
              <div key="B">B</div>
              <div key="A">A</div>
            </div>
            <div key="two">
              <div key="D">D</div>
              <div key="C">C</div>
            </div>
          </div>,
        );
      });

      expect(container.textContent).toBe('BADC');
    });
  });

  describe('createOpenTagMarkup', () => {
    function quoteRegexp(str) {
      return String(str).replace(/([.?*+\^$\[\]\\(){}|-])/g, '\\$1');
    }

    function expectToHaveAttribute(actual, expected) {
      const [attr, value] = expected;
      let re = '(?:^|\\s)' + attr + '=[\\\'"]';
      if (typeof value !== 'undefined') {
        re += quoteRegexp(value) + '[\\\'"]';
      }
      expect(actual).toMatch(new RegExp(re));
    }

    function genMarkup(props) {
      return ReactDOMServer.renderToString(<div {...props} />);
    }

    it('should generate the correct markup with className', () => {
      expectToHaveAttribute(genMarkup({className: 'a'}), ['class', 'a']);
      expectToHaveAttribute(genMarkup({className: 'a b'}), ['class', 'a b']);
      expectToHaveAttribute(genMarkup({className: ''}), ['class', '']);
    });

    it('should escape style names and values', () => {
      expectToHaveAttribute(
        genMarkup({
          style: {'b&ckground': '<3'},
        }),
        ['style', 'b&amp;ckground:&lt;3'],
      );
    });
  });

  describe('createContentMarkup', () => {
    function quoteRegexp(str) {
      return String(str).replace(/([.?*+\^$\[\]\\(){}|-])/g, '\\$1');
    }

    function genMarkup(props) {
      return ReactDOMServer.renderToString(<div {...props} />);
    }

    function toHaveInnerhtml(actual, expected) {
      const re = quoteRegexp(expected);
      return new RegExp(re).test(actual);
    }

    it('should handle dangerouslySetInnerHTML', () => {
      const innerHTML = {__html: 'testContent'};
      expect(
        toHaveInnerhtml(
          genMarkup({dangerouslySetInnerHTML: innerHTML}),
          'testContent',
        ),
      ).toBe(true);
    });
  });

  describe('mountComponent', () => {
    let mountComponent;

    beforeEach(() => {
      mountComponent = async props => {
        const container = document.createElement('div');
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<div {...props} />);
        });
      };
    });

    it('should work error event on <source> element', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <video>
            <source
              src="http://example.org/video"
              type="video/mp4"
              onError={e => Scheduler.log('onError called')}
            />
          </video>,
        );
      });

      const errorEvent = document.createEvent('Event');
      errorEvent.initEvent('error', false, false);
      container.getElementsByTagName('source')[0].dispatchEvent(errorEvent);

      if (__DEV__) {
        assertLog(['onError called']);
      }
    });

    it('should warn for uppercased selfclosing tags', () => {
      class Container extends React.Component {
        render() {
          return React.createElement('BR', null);
        }
      }

      const returnedValue = ReactDOMServer.renderToString(<Container />);
      assertConsoleErrorDev([
        '<BR /> is using incorrect casing. ' +
          'Use PascalCase for React components, ' +
          'or lowercase for HTML elements.\n' +
          '    in BR (at **)\n' +
          '    in Container (at **)',
      ]);
      // This includes a duplicate tag because we didn't treat this as self-closing.
      expect(returnedValue).toContain('</BR>');
    });

    it('should warn on upper case HTML tags, not SVG nor custom tags', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement('svg', null, React.createElement('PATH')),
        );
      });

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement('CUSTOM-TAG'));
      });

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement('IMG'));
      });
      assertConsoleErrorDev([
        '<IMG /> is using incorrect casing. ' +
          'Use PascalCase for React components, ' +
          'or lowercase for HTML elements.\n' +
          '    in IMG (at **)',
      ]);
    });

    it('should warn on props reserved for future use', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div aria="hello" />);
      });
      assertConsoleErrorDev([
        'The `aria` attribute is reserved for future use in React. ' +
          'Pass individual `aria-` attributes instead.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn if the tag is unrecognized', async () => {
      let realToString;
      try {
        realToString = Object.prototype.toString;
        const wrappedToString = function () {
          // Emulate browser behavior which is missing in jsdom
          if (this instanceof window.HTMLUnknownElement) {
            return '[object HTMLUnknownElement]';
          }
          return realToString.apply(this, arguments);
        };
        Object.prototype.toString = wrappedToString; // eslint-disable-line no-extend-native

        const root = ReactDOMClient.createRoot(document.createElement('div'));

        await act(() => {
          root.render(<bar />);
        });
        assertConsoleErrorDev([
          'The tag <bar> is unrecognized in this browser. ' +
            'If you meant to render a React component, start its name with an uppercase letter.\n' +
            '    in bar (at **)',
        ]);
        // Test deduplication
        await act(() => {
          root.render(<foo />);
        });
        assertConsoleErrorDev([
          'The tag <foo> is unrecognized in this browser. ' +
            'If you meant to render a React component, start its name with an uppercase letter.\n' +
            '    in foo (at **)',
        ]);
        await act(() => {
          root.render(<foo />);
        });
        await act(() => {
          root.render(<time />);
        });

        // Corner case. Make sure out deduplication logic doesn't break with weird tag.
        await act(() => {
          root.render(<hasOwnProperty />);
        });
        assertConsoleErrorDev([
          '<hasOwnProperty /> is using incorrect casing. ' +
            'Use PascalCase for React components, or lowercase for HTML elements.\n' +
            '    in hasOwnProperty (at **)',
          'The tag <hasOwnProperty> is unrecognized in this browser. ' +
            'If you meant to render a React component, start its name with an uppercase letter.\n' +
            '    in hasOwnProperty (at **)',
        ]);
      } finally {
        Object.prototype.toString = realToString; // eslint-disable-line no-extend-native
      }
    });

    it('should throw on children for void elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(<input>children</input>);
        });
      }).rejects.toThrowError(
        'input is a void element tag and must neither have `children` nor ' +
          'use `dangerouslySetInnerHTML`.',
      );
    });

    it('should throw on dangerouslySetInnerHTML for void elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(<input dangerouslySetInnerHTML={{__html: 'content'}} />);
        });
      }).rejects.toThrowError(
        'input is a void element tag and must neither have `children` nor ' +
          'use `dangerouslySetInnerHTML`.',
      );
    });

    it('should treat menuitem as a void element but still create the closing tag', async () => {
      // menuitem is not implemented in jsdom, so this triggers the unknown warning error
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const returnedValue = ReactDOMServer.renderToString(
        <menu>
          <menuitem />
        </menu>,
      );

      expect(returnedValue).toContain('</menuitem>');

      await expect(async () => {
        await act(() => {
          root.render(
            <menu>
              <menuitem>children</menuitem>
            </menu>,
          );
        });
      }).rejects.toThrowError(
        'menuitem is a void element tag and must neither have `children` nor use ' +
          '`dangerouslySetInnerHTML`.',
      );
      assertConsoleErrorDev([
        'The tag <menuitem> is unrecognized in this browser. ' +
          'If you meant to render a React component, start its name with an uppercase letter.\n' +
          '    in menuitem (at **)',
      ]);
    });

    it('should validate against multiple children props', async () => {
      await expect(async () => {
        await mountComponent({children: '', dangerouslySetInnerHTML: ''});
      }).rejects.toThrowError(
        '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
          'Please visit https://react.dev/link/dangerously-set-inner-html for more information.',
      );
    });

    it('should validate against use of innerHTML', async () => {
      await mountComponent({innerHTML: '<span>Hi Jim!</span>'});
      assertConsoleErrorDev([
        'Directly setting property `innerHTML` is not permitted. ' +
          'For more information, lookup documentation on `dangerouslySetInnerHTML`.\n' +
          '    in div (at **)',
      ]);
    });

    it('should validate against use of innerHTML without case sensitivity', async () => {
      await mountComponent({innerhtml: '<span>Hi Jim!</span>'});
      assertConsoleErrorDev([
        'Directly setting property `innerHTML` is not permitted. ' +
          'For more information, lookup documentation on `dangerouslySetInnerHTML`.\n' +
          '    in div (at **)',
      ]);
    });

    it('should validate use of dangerouslySetInnerHTM with JSX', async () => {
      await expect(async () => {
        await mountComponent({dangerouslySetInnerHTML: '<span>Hi Jim!</span>'});
      }).rejects.toThrowError(
        '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
          'Please visit https://react.dev/link/dangerously-set-inner-html for more information.',
      );
    });

    it('should validate use of dangerouslySetInnerHTML with object', async () => {
      await expect(async () => {
        await mountComponent({dangerouslySetInnerHTML: {foo: 'bar'}});
      }).rejects.toThrowError(
        '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
          'Please visit https://react.dev/link/dangerously-set-inner-html for more information.',
      );
    });

    it('should allow {__html: null}', async () => {
      await expect(async () => {
        await mountComponent({dangerouslySetInnerHTML: {__html: null}});
      }).not.toThrow();
    });

    it('should warn about contentEditable and children', async () => {
      await mountComponent({contentEditable: true, children: ''});
      assertConsoleErrorDev([
        'A component is `contentEditable` and contains `children` ' +
          'managed by React. It is now your responsibility to guarantee that ' +
          'none of those nodes are unexpectedly modified or duplicated. This ' +
          'is probably not intentional.\n' +
          '    in div (at **)',
      ]);
    });

    it('should respect suppressContentEditableWarning', async () => {
      await mountComponent({
        contentEditable: true,
        children: '',
        suppressContentEditableWarning: true,
      });
    });

    it('should validate against invalid styles', async () => {
      await expect(async () => {
        await mountComponent({style: 'display: none'});
      }).rejects.toThrowError(
        'The `style` prop expects a mapping from style properties to values, ' +
          "not a string. For example, style={{marginRight: spacing + 'em'}} " +
          'when using JSX.',
      );
    });

    it('should throw for children on void elements', async () => {
      class X extends React.Component {
        render() {
          return <input>moo</input>;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(<X />);
        });
      }).rejects.toThrowError(
        'input is a void element tag and must neither have `children` ' +
          'nor use `dangerouslySetInnerHTML`.',
      );
    });

    it('should support custom elements which extend native elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      spyOnDevAndProd(document, 'createElement');
      await act(() => {
        root.render(<div is="custom-div" />);
      });
      expect(document.createElement).toHaveBeenCalledWith('div', {
        is: 'custom-div',
      });
    });

    it('should work load and error events on <image> element in SVG', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <svg>
            <image
              xlinkHref="http://example.org/image"
              onError={e => Scheduler.log('onError called')}
              onLoad={e => Scheduler.log('onLoad called')}
            />
          </svg>,
        );
      });

      const loadEvent = document.createEvent('Event');
      const errorEvent = document.createEvent('Event');

      loadEvent.initEvent('load', false, false);
      errorEvent.initEvent('error', false, false);

      container.getElementsByTagName('image')[0].dispatchEvent(errorEvent);
      container.getElementsByTagName('image')[0].dispatchEvent(loadEvent);

      if (__DEV__) {
        assertLog(['onError called', 'onLoad called']);
      }
    });

    it('should receive a load event on <link> elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const onLoad = jest.fn();

      await act(() => {
        root.render(<link href="http://example.org/link" onLoad={onLoad} />);
      });

      const loadEvent = document.createEvent('Event');
      const link = container.getElementsByTagName('link')[0];

      loadEvent.initEvent('load', false, false);
      link.dispatchEvent(loadEvent);

      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('should receive an error event on <link> elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const onError = jest.fn();

      await act(() => {
        root.render(<link href="http://example.org/link" onError={onError} />);
      });

      const errorEvent = document.createEvent('Event');
      const link = container.getElementsByTagName('link')[0];

      errorEvent.initEvent('error', false, false);
      link.dispatchEvent(errorEvent);

      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateComponent', () => {
    let container;
    let root;

    beforeEach(() => {
      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
    });

    it('should warn against children for void elements', async () => {
      await act(() => {
        root.render(<input />);
      });

      await expect(async () => {
        await act(() => {
          root.render(<input>children</input>);
        });
      }).rejects.toThrowError(
        'input is a void element tag and must neither have `children` nor use ' +
          '`dangerouslySetInnerHTML`.',
      );
    });

    it('should warn against dangerouslySetInnerHTML for void elements', async () => {
      await act(() => {
        root.render(<input />);
      });

      await expect(async () => {
        await act(() => {
          root.render(<input dangerouslySetInnerHTML={{__html: 'content'}} />);
        });
      }).rejects.toThrowError(
        'input is a void element tag and must neither have `children` nor use ' +
          '`dangerouslySetInnerHTML`.',
      );
    });

    it('should validate against multiple children props', async () => {
      await act(() => {
        root.render(<div />);
      });

      await expect(async () => {
        await act(() => {
          root.render(
            <div children="" dangerouslySetInnerHTML={{__html: ''}} />,
          );
        });
      }).rejects.toThrowError(
        'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
      );
    });

    it('should warn about contentEditable and children', async () => {
      await act(() => {
        root.render(
          <div contentEditable={true}>
            <div />
          </div>,
        );
      });
      assertConsoleErrorDev([
        'A component is `contentEditable` and contains `children` managed by React. ' +
          'It is now your responsibility to guarantee that none of those nodes are unexpectedly modified or duplicated. ' +
          'This is probably not intentional.\n' +
          '    in div (at **)',
      ]);
    });

    it('should validate against invalid styles', async () => {
      await act(() => {
        root.render(<div />);
      });

      await expect(async () => {
        await act(() => {
          root.render(<div style={1} />);
        });
      }).rejects.toThrowError(
        'The `style` prop expects a mapping from style properties to values, ' +
          "not a string. For example, style={{marginRight: spacing + 'em'}} " +
          'when using JSX.',
      );
    });

    it('should report component containing invalid styles', async () => {
      class Animal extends React.Component {
        render() {
          return <div style={1} />;
        }
      }

      await expect(async () => {
        await act(() => {
          root.render(<Animal />);
        });
      }).rejects.toThrowError(
        'The `style` prop expects a mapping from style properties to values, ' +
          "not a string. For example, style={{marginRight: spacing + 'em'}} " +
          'when using JSX.',
      );
    });

    it('should properly escape text content and attributes values', () => {
      expect(
        ReactDOMServer.renderToStaticMarkup(
          React.createElement(
            'div',
            {
              title: '\'"<>&',
              style: {
                textAlign: '\'"<>&',
              },
            },
            '\'"<>&',
          ),
        ),
      ).toBe(
        '<div title="&#x27;&quot;&lt;&gt;&amp;" style="text-align:&#x27;&quot;&lt;&gt;&amp;">' +
          '&#x27;&quot;&lt;&gt;&amp;' +
          '</div>',
      );
    });
  });

  describe('unmountComponent', () => {
    it('unmounts children before unsetting DOM node info', async () => {
      class Inner extends React.Component {
        render() {
          return <span />;
        }

        componentWillUnmount() {
          // Should not throw
          expect(
            ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.findDOMNode(
              this,
            ).nodeName,
          ).toBe('SPAN');
        }
      }

      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => {
        root.render(
          <div>
            <Inner />
          </div>,
        );
      });
      await act(() => {
        root.unmount();
      });
    });
  });

  describe('tag sanitization', () => {
    it('should throw when an invalid tag name is used server-side', () => {
      const hackzor = React.createElement('script tag');
      expect(() => ReactDOMServer.renderToString(hackzor)).toThrowError(
        'Invalid tag: script tag',
      );
    });

    it('should throw when an attack vector is used server-side', () => {
      const hackzor = React.createElement('div><img /><div');
      expect(() => ReactDOMServer.renderToString(hackzor)).toThrowError(
        'Invalid tag: div><img /><div',
      );
    });

    it('should throw when an invalid tag name is used', async () => {
      const hackzor = React.createElement('script tag');
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(hackzor);
        }),
      ).rejects.toThrow();
    });

    it('should throw when an attack vector is used', async () => {
      const hackzor = React.createElement('div><img /><div');
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(hackzor);
        }),
      ).rejects.toThrow();
    });
  });

  describe('nesting validation', () => {
    it('warns on invalid nesting', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <tr />
            <tr />
          </div>,
        );
      });
      assertConsoleErrorDev([
        'In HTML, <tr> cannot be a child of <div>.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '> <div>\n' +
          '>   <tr>\n' +
          '    ...\n' +
          '\n    in tr (at **)',
      ]);
    });

    it('warns on invalid nesting at root', async () => {
      const p = document.createElement('p');
      const root = ReactDOMClient.createRoot(p);

      await act(() => {
        root.render(
          <span>
            <p />
          </span>,
        );
      });
      assertConsoleErrorDev([
        'In HTML, <p> cannot be a descendant of <p>.\n' +
          'This will cause a hydration error.' +
          // There is no outer `p` here because root container is not part of the stack.
          '\n    in p (at **)',
      ]);
    });

    it('warns nicely for table rows', async () => {
      class Row extends React.Component {
        render() {
          return <tr>x</tr>;
        }
      }

      class Foo extends React.Component {
        render() {
          return (
            <table>
              <Row />{' '}
            </table>
          );
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<Foo />);
      });
      assertConsoleErrorDev([
        'In HTML, <tr> cannot be a child of ' +
          '<table>. Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated ' +
          'by the browser.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <Foo>\n' +
          '>   <table>\n' +
          '      <Row>\n' +
          '>       <tr>\n' +
          '      ...\n' +
          '\n    in tr (at **)' +
          '\n    in Row (at **)' +
          '\n    in Foo (at **)',
        '<table> cannot contain a nested <tr>.\nSee this log for the ancestor stack trace.' +
          '\n    in table (at **)' +
          '\n    in Foo (at **)',
        'In HTML, text nodes cannot be a ' +
          'child of <tr>.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <Foo>\n' +
          '    <table>\n' +
          '      <Row>\n' +
          '        <tr>\n' +
          '>         x\n' +
          '      ...\n' +
          '\n    in tr (at **)' +
          '\n    in Row (at **)' +
          '\n    in Foo (at **)',
        'In HTML, whitespace text nodes cannot ' +
          "be a child of <table>. Make sure you don't have any extra " +
          'whitespace between tags on each line of your source code.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <Foo>\n' +
          '>   <table>\n' +
          '      <Row>\n' +
          '>     {" "}\n' +
          '\n    in table (at **)' +
          '\n    in Foo (at **)',
      ]);
    });

    it('warns nicely for updating table rows to use text', async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));

      function Row({children}) {
        return <tr>{children}</tr>;
      }

      function Foo({children}) {
        return <table>{children}</table>;
      }

      // First is fine.
      await act(() => {
        root.render(<Foo />);
      });

      await act(() => {
        root.render(<Foo> </Foo>);
      });
      assertConsoleErrorDev([
        'In HTML, whitespace text nodes cannot ' +
          "be a child of <table>. Make sure you don't have any extra " +
          'whitespace between tags on each line of your source code.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <Foo>\n' +
          '    <table>\n' +
          '>     {" "}\n' +
          '\n    in table (at **)' +
          '\n    in Foo (at **)',
      ]);

      await act(() => {
        root.render(
          <Foo>
            <tbody>
              <Row />
            </tbody>
          </Foo>,
        );
      });

      await act(() => {
        root.render(
          <Foo>
            <tbody>
              <Row>text</Row>
            </tbody>
          </Foo>,
        );
      });
      assertConsoleErrorDev([
        'In HTML, text nodes cannot be a ' +
          'child of <tr>.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <Foo>\n' +
          '    <table>\n' +
          '      <tbody>\n' +
          '        <Row>\n' +
          '          <tr>\n' +
          '>           text\n' +
          '\n    in tr (at **)' +
          '\n    in Row (at **)',
      ]);
    });

    it('gives useful context in warnings', async () => {
      function Row() {
        return <tr />;
      }
      function FancyRow() {
        return <Row />;
      }

      function Viz1() {
        return (
          <table>
            <FancyRow />
          </table>
        );
      }
      function App1() {
        return <Viz1 />;
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<App1 />);
      });
      assertConsoleErrorDev([
        'In HTML, <tr> cannot be a child of <table>. ' +
          'Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by the browser.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <App1>\n' +
          '    <Viz1>\n' +
          '>     <table>\n' +
          '        <FancyRow>\n' +
          '          <Row>\n' +
          '>           <tr>\n' +
          '\n    in tr (at **)' +
          '\n    in Row (at **)' +
          '\n    in FancyRow (at **)' +
          '\n    in Viz1 (at **)' +
          '\n    in App1 (at **)',
        '<table> cannot contain a nested <tr>.\n' +
          'See this log for the ancestor stack trace.\n' +
          '    in table (at **)\n' +
          '    in Viz1 (at **)\n' +
          '    in App1 (at **)',
      ]);
    });

    it('gives useful context in warnings 2', async () => {
      function Row() {
        return <tr />;
      }
      function FancyRow() {
        return <Row />;
      }

      class Table extends React.Component {
        render() {
          return <table>{this.props.children}</table>;
        }
      }

      class FancyTable extends React.Component {
        render() {
          return <Table>{this.props.children}</Table>;
        }
      }

      function Viz2() {
        return (
          <FancyTable>
            <FancyRow />
          </FancyTable>
        );
      }
      function App2() {
        return <Viz2 />;
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<App2 />);
      });
      assertConsoleErrorDev([
        'In HTML, <tr> cannot be a child of <table>. ' +
          'Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by the browser.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <App2>\n' +
          '    <Viz2>\n' +
          '      <FancyTable>\n' +
          '        <Table>\n' +
          '>         <table>\n' +
          '            <FancyRow>\n' +
          '              <Row>\n' +
          '>               <tr>\n' +
          '\n    in tr (at **)' +
          '\n    in Row (at **)' +
          '\n    in FancyRow (at **)' +
          '\n    in Viz2 (at **)' +
          '\n    in App2 (at **)',
        '<table> cannot contain a nested <tr>.\n' +
          'See this log for the ancestor stack trace.\n' +
          '    in table (at **)\n' +
          '    in Table (at **)\n' +
          '    in FancyTable (at **)\n' +
          '    in Viz2 (at **)\n' +
          '    in App2 (at **)',
      ]);
    });

    it('gives useful context in warnings 3', async () => {
      function Row() {
        return <tr />;
      }
      function FancyRow() {
        return <Row />;
      }

      class Table extends React.Component {
        render() {
          return <table>{this.props.children}</table>;
        }
      }

      class FancyTable extends React.Component {
        render() {
          return <Table>{this.props.children}</Table>;
        }
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <FancyTable>
            <FancyRow />
          </FancyTable>,
        );
      });
      assertConsoleErrorDev([
        'In HTML, <tr> cannot be a child of <table>. ' +
          'Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by the browser.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <FancyTable>\n' +
          '    <Table>\n' +
          '>     <table>\n' +
          '        <FancyRow>\n' +
          '          <Row>\n' +
          '>           <tr>\n' +
          '\n    in tr (at **)' +
          '\n    in Row (at **)' +
          '\n    in FancyRow (at **)',
        '<table> cannot contain a nested <tr>.\n' +
          'See this log for the ancestor stack trace.' +
          '\n    in table (at **)' +
          '\n    in Table (at **)' +
          '\n    in FancyTable (at **)',
      ]);
    });

    it('gives useful context in warnings 4', async () => {
      function Row() {
        return <tr />;
      }
      function FancyRow() {
        return <Row />;
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <table>
            <FancyRow />
          </table>,
        );
      });
      assertConsoleErrorDev([
        'In HTML, <tr> cannot be a child of <table>. ' +
          'Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by the browser.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '> <table>\n' +
          '    <FancyRow>\n' +
          '      <Row>\n' +
          '>       <tr>\n' +
          '\n    in tr (at **)' +
          '\n    in Row (at **)' +
          '\n    in FancyRow (at **)',
        '<table> cannot contain a nested <tr>.\n' +
          'See this log for the ancestor stack trace.' +
          '\n    in table (at **)',
      ]);
    });

    it('gives useful context in warnings 5', async () => {
      class Table extends React.Component {
        render() {
          return <table>{this.props.children}</table>;
        }
      }

      class FancyTable extends React.Component {
        render() {
          return <Table>{this.props.children}</Table>;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <FancyTable>
            <tr />
          </FancyTable>,
        );
      });
      assertConsoleErrorDev([
        'In HTML, <tr> cannot be a child of <table>. ' +
          'Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by the browser.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <FancyTable>\n' +
          '    <Table>\n' +
          '>     <table>\n' +
          '>       <tr>\n' +
          '\n    in tr (at **)',
        '<table> cannot contain a nested <tr>.\n' +
          'See this log for the ancestor stack trace.' +
          '\n    in table (at **)' +
          '\n    in Table (at **)' +
          '\n    in FancyTable (at **)',
      ]);

      class Link extends React.Component {
        render() {
          return <a>{this.props.children}</a>;
        }
      }

      await act(() => {
        root.render(
          <Link>
            <div>
              <Link />
            </div>
          </Link>,
        );
      });
      assertConsoleErrorDev([
        'In HTML, <a> cannot be a descendant of <a>.\n' +
          'This will cause a hydration error.\n' +
          '\n' +
          '  <Link>\n' +
          '>   <a>\n' +
          '      <div>\n' +
          '        <Link>\n' +
          '>         <a>\n' +
          '\n    in a (at **)' +
          '\n    in Link (at **)',
        '<a> cannot contain a nested <a>.\n' +
          'See this log for the ancestor stack trace.' +
          '\n    in a (at **)' +
          '\n    in Link (at **)',
      ]);
    });

    it('should warn about incorrect casing on properties (ssr)', () => {
      ReactDOMServer.renderToString(
        React.createElement('input', {type: 'text', tabindex: '1'}),
      );
      assertConsoleErrorDev([
        'Invalid DOM property `tabindex`. Did you mean `tabIndex`?\n' +
          '    in input (at **)',
      ]);
    });

    it('should warn about incorrect casing on the credentialless property (ssr)', () => {
      ReactDOMServer.renderToString(
        React.createElement('iframe', {Credentialless: true}),
      );
      assertConsoleErrorDev([
        'Invalid DOM property `Credentialless`. Did you mean `credentialless`?\n' +
          '    in iframe (at **)',
      ]);
    });

    it('should warn about incorrect casing on event handlers (ssr)', () => {
      ReactDOMServer.renderToString(
        React.createElement('input', {type: 'text', oninput: '1'}),
      );
      assertConsoleErrorDev([
        'Invalid event handler property `oninput`. ' +
          'React events use the camelCase naming convention, ' +
          // Note: we don't know the right event name so we
          // use a generic one (onClick) as a suggestion.
          // This is because we don't bundle the event system
          // on the server.
          'for example `onClick`.\n' +
          '    in input (at **)',
      ]);
      ReactDOMServer.renderToString(
        React.createElement('input', {type: 'text', onKeydown: '1'}),
      );
      // We can't warn for `onKeydown` on the server because
      // there is no way tell if this is a valid event or not
      // without access to the event system (which we don't bundle).
    });

    it('should warn about incorrect casing on properties', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement('input', {type: 'text', tabindex: '1'}),
        );
      });
      assertConsoleErrorDev([
        'Invalid DOM property `tabindex`. Did you mean `tabIndex`?\n' +
          '    in input (at **)',
      ]);
    });

    it('should warn about incorrect casing on event handlers', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement('input', {type: 'text', oninput: '1'}));
      });
      assertConsoleErrorDev([
        'Invalid event handler property `oninput`. Did you mean `onInput`?\n' +
          '    in input (at **)',
      ]);

      await act(() => {
        root.render(
          React.createElement('input', {type: 'text', onKeydown: '1'}),
        );
      });
      assertConsoleErrorDev([
        'Invalid event handler property `onKeydown`. Did you mean `onKeyDown`?\n' +
          '    in input (at **)',
      ]);
    });

    it('should warn about class', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement('div', {class: 'muffins'}));
      });
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn about class (ssr)', () => {
      ReactDOMServer.renderToString(
        React.createElement('div', {class: 'muffins'}),
      );
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn about props that are no longer supported', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div onFocusIn={() => {}} />);
      });
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div onFocusOut={() => {}} />);
      });
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn about props that are no longer supported without case sensitivity', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div onfocusin={() => {}} />);
      });
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div onfocusout={() => {}} />);
      });
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn about props that are no longer supported (ssr)', () => {
      ReactDOMServer.renderToString(<div />);
      ReactDOMServer.renderToString(<div onFocusIn={() => {}} />);
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
      ReactDOMServer.renderToString(<div onFocusOut={() => {}} />);
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn about props that are no longer supported without case sensitivity (ssr)', () => {
      ReactDOMServer.renderToString(<div />);
      ReactDOMServer.renderToString(<div onfocusin={() => {}} />);
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
      ReactDOMServer.renderToString(<div onfocusout={() => {}} />);
      assertConsoleErrorDev([
        'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
          'All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React.\n' +
          '    in div (at **)',
      ]);
    });

    it('gives source code refs for unknown prop warning', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div class="paladin" />);
      });
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in div (at **)',
      ]);
      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input type="text" onclick="1" />);
      });
      assertConsoleErrorDev([
        'Invalid event handler property `onclick`. Did you mean ' +
          '`onClick`?\n' +
          '    in input (at **)',
      ]);
    });

    it('gives source code refs for unknown prop warning (ssr)', () => {
      ReactDOMServer.renderToString(<div class="paladin" />);
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in div (at **)',
      ]);
      ReactDOMServer.renderToString(<input type="text" oninput="1" />);
      assertConsoleErrorDev([
        'Invalid event handler property `oninput`. ' +
          // Note: we don't know the right event name so we
          // use a generic one (onClick) as a suggestion.
          // This is because we don't bundle the event system
          // on the server.
          'React events use the camelCase naming convention, for example `onClick`.\n' +
          '    in input (at **)',
      ]);
    });

    it('gives source code refs for unknown prop warning for update render', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className="paladin" />);
      });

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div class="paladin" />);
      });
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in div (at **)',
      ]);
    });

    it('gives source code refs for unknown prop warning for exact elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div className="foo1">
            <span class="foo2" />
            <div onClick={() => {}} />
            <strong onclick={() => {}} />
            <div className="foo5" />
            <div className="foo6" />
          </div>,
        );
      });
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in span (at **)',
        'Invalid event handler property `onclick`. Did you mean `onClick`?\n' +
          '    in strong (at **)',
      ]);
    });

    it('gives source code refs for unknown prop warning for exact elements (ssr)', () => {
      ReactDOMServer.renderToString(
        <div className="foo1">
          <span class="foo2" />
          <div onClick="foo3" />
          <strong onclick="foo4" />
          <div className="foo5" />
          <div className="foo6" />
        </div>,
      );
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in span (at **)',
        'Invalid event handler property `onclick`. ' +
          'React events use the camelCase naming convention, for example `onClick`.\n' +
          '    in strong (at **)',
      ]);
    });

    it('gives source code refs for unknown prop warning for exact elements in composition', async () => {
      class Parent extends React.Component {
        render() {
          return (
            <div>
              <Child1 />
              <Child2 />
              <Child3 />
              <Child4 />
            </div>
          );
        }
      }

      class Child1 extends React.Component {
        render() {
          return <span class="paladin">Child1</span>;
        }
      }

      class Child2 extends React.Component {
        render() {
          return <div>Child2</div>;
        }
      }

      class Child3 extends React.Component {
        render() {
          return <strong onclick="1">Child3</strong>;
        }
      }

      class Child4 extends React.Component {
        render() {
          return <div>Child4</div>;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Parent />);
      });
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in span (at **)\n' +
          '    in Child1 (at **)\n' +
          '    in Parent (at **)',
        'Invalid event handler property `onclick`. Did you mean `onClick`?\n' +
          '    in strong (at **)\n' +
          '    in Child3 (at **)\n' +
          '    in Parent (at **)',
      ]);
    });

    it('gives source code refs for unknown prop warning for exact elements in composition (ssr)', () => {
      const container = document.createElement('div');

      class Parent extends React.Component {
        render() {
          return (
            <div>
              <Child1 />
              <Child2 />
              <Child3 />
              <Child4 />
            </div>
          );
        }
      }

      class Child1 extends React.Component {
        render() {
          return <span class="paladin">Child1</span>;
        }
      }

      class Child2 extends React.Component {
        render() {
          return <div>Child2</div>;
        }
      }

      class Child3 extends React.Component {
        render() {
          return <strong onclick="1">Child3</strong>;
        }
      }

      class Child4 extends React.Component {
        render() {
          return <div>Child4</div>;
        }
      }

      ReactDOMServer.renderToString(<Parent />, container);
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in span (at **)\n' +
          '    in Child1 (at **)\n' +
          '    in Parent (at **)',
        'Invalid event handler property `onclick`. ' +
          'React events use the camelCase naming convention, for example `onClick`.\n' +
          '    in strong (at **)\n' +
          '    in Child3 (at **)\n' +
          '    in Parent (at **)',
      ]);
    });

    it('should suggest property name if available', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement('label', {for: 'test'}));
      });
      assertConsoleErrorDev([
        'Invalid DOM property `for`. Did you mean `htmlFor`?\n' +
          '    in label',
      ]);

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement('input', {type: 'text', autofocus: true}),
        );
      });
      assertConsoleErrorDev([
        'Invalid DOM property `autofocus`. Did you mean `autoFocus`?\n    in input',
      ]);
    });

    it('should suggest property name if available (ssr)', () => {
      ReactDOMServer.renderToString(
        React.createElement('label', {for: 'test'}),
      );
      assertConsoleErrorDev([
        'Invalid DOM property `for`. Did you mean `htmlFor`?\n' +
          '    in label',
      ]);
      ReactDOMServer.renderToString(
        React.createElement('input', {type: 'text', autofocus: true}),
      );
      assertConsoleErrorDev([
        'Invalid DOM property `autofocus`. Did you mean `autoFocus`?\n' +
          '    in input',
      ]);
    });
  });

  describe('whitespace', () => {
    it('renders innerHTML and preserves whitespace', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const html = '\n  \t  <span>  \n  testContent  \t  </span>  \n  \t';
      const elem = <div dangerouslySetInnerHTML={{__html: html}} />;

      await act(() => {
        root.render(elem);
      });
      expect(container.firstChild.innerHTML).toBe(html);
    });

    it('render and then updates innerHTML and preserves whitespace', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const html = '\n  \t  <span>  \n  testContent1  \t  </span>  \n  \t';
      const elem = <div dangerouslySetInnerHTML={{__html: html}} />;
      await act(() => {
        root.render(elem);
      });

      const html2 = '\n  \t  <div>  \n  testContent2  \t  </div>  \n  \t';
      const elem2 = <div dangerouslySetInnerHTML={{__html: html2}} />;
      await act(() => {
        root.render(elem2);
      });

      expect(container.firstChild.innerHTML).toBe(html2);
    });
  });

  describe('Attributes with aliases', function () {
    it('sets aliased attributes on HTML attributes', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div class="test" ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Invalid DOM property `class`. Did you mean `className`?\n' +
          '    in div (at **)',
      ]);

      expect(el.className).toBe('test');
    });

    it('sets incorrectly cased aliased attributes on HTML attributes with a warning', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div cLASS="test" ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Invalid DOM property `cLASS`. Did you mean `className`?\n' +
          '    in div (at **)',
      ]);

      expect(el.className).toBe('test');
    });

    it('sets aliased attributes on SVG elements with a warning', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <svg ref={current => (el = current)}>
            <text arabic-form="initial" />
          </svg>,
        );
      });
      assertConsoleErrorDev([
        'Invalid DOM property `arabic-form`. Did you mean `arabicForm`?\n' +
          '    in text (at **)',
      ]);
      const text = el.querySelector('text');

      expect(text.hasAttribute('arabic-form')).toBe(true);
    });

    it('sets aliased attributes on custom elements', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div is="custom-element" class="test" />);
      });

      const el = container.firstChild;
      expect(el.getAttribute('class')).toBe('test');
    });

    it('aliased attributes on custom elements with bad casing', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div is="custom-element" claSS="test" />);
      });

      const el = container.firstChild;

      expect(el.getAttribute('class')).toBe('test');
    });

    it('updates aliased attributes on custom elements', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div is="custom-element" class="foo" />);
      });
      await act(() => {
        root.render(<div is="custom-element" class="bar" />);
      });

      expect(container.firstChild.getAttribute('class')).toBe('bar');
    });
  });

  describe('Custom attributes', function () {
    it('allows assignment of custom attributes with string values', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div whatever="30" />);
      });

      const el = container.firstChild;

      expect(el.getAttribute('whatever')).toBe('30');
    });

    it('removes custom attributes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div whatever="30" />);
      });

      expect(container.firstChild.getAttribute('whatever')).toBe('30');

      await act(() => {
        root.render(<div whatever={null} />);
      });

      expect(container.firstChild.hasAttribute('whatever')).toBe(false);
    });

    it('does not assign a boolean custom attributes as a string', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div whatever={true} ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Received `true` for a non-boolean attribute `whatever`.\n\n' +
          'If you want to write it to the DOM, pass a string instead: ' +
          'whatever="true" or whatever={value.toString()}.\n' +
          '    in div (at **)',
      ]);

      expect(el.hasAttribute('whatever')).toBe(false);
    });

    it('does not assign an implicit boolean custom attributes', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          // eslint-disable-next-line react/jsx-boolean-value
          <div whatever ref={current => (el = current)} />,
        );
      });
      assertConsoleErrorDev([
        'Received `true` for a non-boolean attribute `whatever`.\n\n' +
          'If you want to write it to the DOM, pass a string instead: ' +
          'whatever="true" or whatever={value.toString()}.\n' +
          '    in div (at **)',
      ]);

      expect(el.hasAttribute('whatever')).toBe(false);
    });

    it('assigns a numeric custom attributes as a string', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div whatever={3} />);
      });

      const el = container.firstChild;

      expect(el.getAttribute('whatever')).toBe('3');
    });

    it('will not assign a function custom attributes', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <div whatever={() => {}} ref={current => (el = current)} />,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `whatever` on <div> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in div (at **)',
      ]);

      expect(el.hasAttribute('whatever')).toBe(false);
    });

    it('will assign an object custom attributes', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div whatever={{}} />);
      });

      const el = container.firstChild;
      expect(el.getAttribute('whatever')).toBe('[object Object]');
    });

    it('allows Temporal-like objects as HTML (they are not coerced to strings first)', async () => {
      class TemporalLike {
        valueOf() {
          // Throwing here is the behavior of ECMAScript "Temporal" date/time API.
          // See https://tc39.es/proposal-temporal/docs/plaindate.html#valueOf
          throw new TypeError('prod message');
        }
        toString() {
          return '2020-01-01';
        }
      }

      // `dangerouslySetInnerHTML` is never coerced to a string, so won't throw
      // even with a Temporal-like object.
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div dangerouslySetInnerHTML={{__html: new TemporalLike()}} />,
        );
      });
      expect(container.firstChild.innerHTML).toEqual('2020-01-01');
    });

    it('allows cased data attributes', async () => {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div data-fooBar="true" ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'React does not recognize the `data-fooBar` prop on a DOM element. ' +
          'If you intentionally want it to appear in the DOM as a custom ' +
          'attribute, spell it as lowercase `data-foobar` instead. ' +
          'If you accidentally passed it from a parent component, remove ' +
          'it from the DOM element.\n' +
          '    in div (at **)',
      ]);
      expect(el.getAttribute('data-foobar')).toBe('true');
    });

    it('allows cased custom attributes', async () => {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div fooBar="true" ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'React does not recognize the `fooBar` prop on a DOM element. ' +
          'If you intentionally want it to appear in the DOM as a custom ' +
          'attribute, spell it as lowercase `foobar` instead. ' +
          'If you accidentally passed it from a parent component, remove ' +
          'it from the DOM element.\n' +
          '    in div (at **)',
      ]);
      expect(el.getAttribute('foobar')).toBe('true');
    });

    it('warns on NaN attributes', async () => {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div whatever={NaN} ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Received NaN for the `whatever` attribute. If this is ' +
          'expected, cast the value to a string.\n' +
          '    in div',
      ]);

      expect(el.getAttribute('whatever')).toBe('NaN');
    });

    it('removes a property when it becomes invalid', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div whatever={0} />);
      });
      await act(() => {
        root.render(<div whatever={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `whatever` on <div> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in div (at **)',
      ]);
      const el = container.firstChild;
      expect(el.hasAttribute('whatever')).toBe(false);
    });

    it('warns on bad casing of known HTML attributes', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div SiZe="30" ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Invalid DOM property `SiZe`. Did you mean `size`?\n' +
          '    in div (at **)',
      ]);

      expect(el.getAttribute('size')).toBe('30');
    });
  });

  describe('Object stringification', function () {
    it('allows objects on known properties', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div acceptCharset={{}} />);
      });

      const el = container.firstChild;
      expect(el.getAttribute('accept-charset')).toBe('[object Object]');
    });

    it('should pass objects as attributes if they define toString', async () => {
      const obj = {
        toString() {
          return 'hello';
        },
      };
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<img src={obj} />);
      });
      expect(container.firstChild.src).toBe('http://localhost/hello');

      await act(() => {
        root.render(<svg arabicForm={obj} />);
      });
      expect(container.firstChild.getAttribute('arabic-form')).toBe('hello');

      await act(() => {
        root.render(<div unknown={obj} />);
      });
      expect(container.firstChild.getAttribute('unknown')).toBe('hello');
    });

    it('passes objects on known SVG attributes if they do not define toString', async () => {
      const obj = {};
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<svg arabicForm={obj} />);
      });
      expect(container.firstChild.getAttribute('arabic-form')).toBe(
        '[object Object]',
      );
    });

    it('passes objects on custom attributes if they do not define toString', async () => {
      const obj = {};
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div unknown={obj} />);
      });
      expect(container.firstChild.getAttribute('unknown')).toBe(
        '[object Object]',
      );
    });

    it('allows objects that inherit a custom toString method', async function () {
      const parent = {toString: () => 'hello.jpg'};
      const child = Object.create(parent);
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<img src={child} />);
      });

      const el = container.firstChild;

      expect(el.src).toBe('http://localhost/hello.jpg');
    });

    it('assigns ajaxify (an important internal FB attribute)', async function () {
      const options = {toString: () => 'ajaxy'};
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div ajaxify={options} />);
      });

      const el = container.firstChild;

      expect(el.getAttribute('ajaxify')).toBe('ajaxy');
    });
  });

  describe('String boolean attributes', function () {
    it('does not assign string boolean attributes for custom attributes', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div whatever={true} ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Received `true` for a non-boolean attribute `whatever`.\n\n' +
          'If you want to write it to the DOM, pass a string instead: ' +
          'whatever="true" or whatever={value.toString()}.\n' +
          '    in div (at **)',
      ]);

      expect(el.hasAttribute('whatever')).toBe(false);
    });

    it('stringifies the boolean true for allowed attributes', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div spellCheck={true} />);
      });

      const el = container.firstChild;

      expect(el.getAttribute('spellCheck')).toBe('true');
    });

    it('stringifies the boolean false for allowed attributes', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div spellCheck={false} />);
      });

      const el = container.firstChild;

      expect(el.getAttribute('spellCheck')).toBe('false');
    });

    it('stringifies implicit booleans for allowed attributes', async function () {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        // eslint-disable-next-line react/jsx-boolean-value
        root.render(<div spellCheck />);
      });

      const el = container.firstChild;

      expect(el.getAttribute('spellCheck')).toBe('true');
    });
  });

  describe('Boolean attributes', function () {
    it('warns on the ambiguous string value "false"', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div hidden="false" ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Received the string `false` for the boolean attribute `hidden`. ' +
          'The browser will interpret it as a truthy value. ' +
          'Did you mean hidden={false}?\n' +
          '    in div (at **)',
      ]);

      expect(el.getAttribute('hidden')).toBe('');
    });

    it('warns on the potentially-ambiguous string value "true"', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div hidden="true" ref={current => (el = current)} />);
      });
      assertConsoleErrorDev([
        'Received the string `true` for the boolean attribute `hidden`. ' +
          'Although this works, it will not work as expected if you pass the string "false". ' +
          'Did you mean hidden={true}?\n' +
          '    in div (at **)',
      ]);

      expect(el.getAttribute('hidden')).toBe('');
    });
  });

  describe('Hyphenated SVG elements', function () {
    it('the font-face element is not a custom element', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <svg ref={current => (el = current)}>
            <font-face x-height={false} />
          </svg>,
        );
      });
      assertConsoleErrorDev([
        'Invalid DOM property `x-height`. Did you mean `xHeight`?\n' +
          '    in font-face (at **)',
      ]);

      expect(el.querySelector('font-face').hasAttribute('x-height')).toBe(
        false,
      );
    });

    it('the font-face element does not allow unknown boolean values', async function () {
      let el;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <svg ref={current => (el = current)}>
            <font-face whatever={false} />
          </svg>,
        );
      });
      assertConsoleErrorDev([
        'Received `false` for a non-boolean attribute `whatever`.\n\n' +
          'If you want to write it to the DOM, pass a string instead: ' +
          'whatever="false" or whatever={value.toString()}.\n\n' +
          'If you used to conditionally omit it with whatever={condition && value}, ' +
          'pass whatever={condition ? value : undefined} instead.\n' +
          '    in font-face (at **)',
      ]);

      expect(el.querySelector('font-face').hasAttribute('whatever')).toBe(
        false,
      );
    });
  });

  // These tests mostly verify the existing behavior.
  // It may not always makes sense but we can't change it in minors.
  describe('Custom elements', () => {
    it('does not strip unknown boolean attributes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<some-custom-element foo={true} />);
      });
      const node = container.firstChild;
      expect(node.getAttribute('foo')).toBe('');
      await act(() => {
        root.render(<some-custom-element foo={false} />);
      });
      expect(node.getAttribute('foo')).toBe(null);
      await act(() => {
        root.render(<some-custom-element />);
      });
      expect(node.hasAttribute('foo')).toBe(false);
      await act(() => {
        root.render(<some-custom-element foo={true} />);
      });
      expect(node.hasAttribute('foo')).toBe(true);
    });

    it('does not strip the on* attributes', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<some-custom-element onx="bar" />);
      });
      const node = container.firstChild;
      expect(node.getAttribute('onx')).toBe('bar');
      await act(() => {
        root.render(<some-custom-element onx="buzz" />);
      });
      expect(node.getAttribute('onx')).toBe('buzz');
      await act(() => {
        root.render(<some-custom-element />);
      });
      expect(node.hasAttribute('onx')).toBe(false);
      await act(() => {
        root.render(<some-custom-element onx="bar" />);
      });
      expect(node.getAttribute('onx')).toBe('bar');
    });
  });

  it('receives events in specific order', async () => {
    const eventOrder = [];
    const track = tag => () => eventOrder.push(tag);
    const outerRef = React.createRef();
    const innerRef = React.createRef();

    function OuterReactApp() {
      return (
        <div
          ref={outerRef}
          onClick={track('outer bubble')}
          onClickCapture={track('outer capture')}
        />
      );
    }

    function InnerReactApp() {
      return (
        <div
          ref={innerRef}
          onClick={track('inner bubble')}
          onClickCapture={track('inner capture')}
        />
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    document.body.appendChild(container);

    try {
      await act(() => {
        root.render(<OuterReactApp />);
      });
      const innerRoot = ReactDOMClient.createRoot(outerRef.current);
      await act(() => {
        innerRoot.render(<InnerReactApp />);
      });

      document.addEventListener('click', track('document bubble'));
      document.addEventListener('click', track('document capture'), true);

      innerRef.current.click();

      if (ReactFeatureFlags.enableLegacyFBSupport) {
        // The order will change here, as the legacy FB support adds
        // the event listener onto the document after the one above has.
        expect(eventOrder).toEqual([
          'document capture',
          'outer capture',
          'inner capture',
          'document bubble',
          'inner bubble',
          'outer bubble',
        ]);
      } else {
        expect(eventOrder).toEqual([
          'document capture',
          'outer capture',
          'inner capture',
          'inner bubble',
          'outer bubble',
          'document bubble',
        ]);
      }
    } finally {
      document.body.removeChild(container);
    }
  });

  describe('iOS Tap Highlight', () => {
    it('adds onclick handler to elements with onClick prop', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const elementRef = React.createRef();
      function Component() {
        return <div ref={elementRef} onClick={() => {}} />;
      }

      await act(() => {
        root.render(<Component />);
      });
      expect(typeof elementRef.current.onclick).toBe('function');
    });

    it('adds onclick handler to a portal root', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const portalContainer = document.createElement('div');

      function Component() {
        return ReactDOM.createPortal(
          <div onClick={() => {}} />,
          portalContainer,
        );
      }

      await act(() => {
        root.render(<Component />);
      });
      expect(typeof portalContainer.onclick).toBe('function');
    });

    // @gate !disableLegacyMode
    it('does not add onclick handler to the React root in legacy mode', () => {
      const container = document.createElement('div');

      function Component() {
        return <div onClick={() => {}} />;
      }

      ReactDOM.render(<Component />, container);
      expect(typeof container.onclick).not.toBe('function');
    });
  });
});

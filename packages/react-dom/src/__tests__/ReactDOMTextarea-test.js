/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

function emptyFunction() {}

describe('ReactDOMTextarea', () => {
  let React;
  let ReactDOMClient;
  let ReactDOMServer;
  let act;
  let assertConsoleErrorDev;

  let renderTextarea;

  const ReactFeatureFlags = require('shared/ReactFeatureFlags');

  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    renderTextarea = async function (component, container, root) {
      await act(() => {
        root.render(component);
      });

      const node = container.firstChild;

      // Fixing jsdom's quirky behavior -- in reality, the parser should strip
      // off the leading newline but we need to do it by hand here.
      node.defaultValue = node.innerHTML.replace(/^\n/, '');
      return node;
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow setting `defaultValue`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea defaultValue="giraffe" />,
      container,
      root,
    );

    expect(node.value).toBe('giraffe');

    // Changing `defaultValue` should do nothing.
    await renderTextarea(<textarea defaultValue="gorilla" />, container, root);
    expect(node.value).toEqual('giraffe');

    node.value = 'cat';

    await renderTextarea(<textarea defaultValue="monkey" />, container, root);
    expect(node.value).toEqual('cat');
  });

  it('should display `defaultValue` of number 0', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea defaultValue={0} />,
      container,
      root,
    );

    expect(node.value).toBe('0');
  });

  it('should display `defaultValue` of bigint 0', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea defaultValue={0n} />,
      container,
      root,
    );

    expect(node.value).toBe('0');
  });

  it('should display "false" for `defaultValue` of `false`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea defaultValue={false} />,
      container,
      root,
    );

    expect(node.value).toBe('false');
  });

  it('should display "foobar" for `defaultValue` of `objToString`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const objToString = {
      toString: function () {
        return 'foobar';
      },
    };
    const node = await renderTextarea(
      <textarea defaultValue={objToString} />,
      container,
      root,
    );

    expect(node.value).toBe('foobar');
  });

  it('should set defaultValue', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="foo" />);
    });
    await act(() => {
      root.render(<textarea defaultValue="bar" />);
    });
    await act(() => {
      root.render(<textarea defaultValue="noise" />);
    });

    expect(container.firstChild.defaultValue).toBe('noise');
  });

  it('should not render value as an attribute', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.getAttribute('value')).toBe(null);
  });

  it('should display `value` of number 0', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value={0} onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('0');
  });

  it('should update defaultValue to empty string', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue={'foo'} />);
    });

    await act(() => {
      root.render(<textarea defaultValue={''} />);
    });

    expect(container.firstChild.defaultValue).toBe('');
  });

  it('should allow setting `value` to `giraffe`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('giraffe');

    await act(() => {
      root.render(<textarea value="gorilla" onChange={emptyFunction} />);
    });

    expect(node.value).toEqual('gorilla');
  });

  it('will not initially assign an empty value (covers case where firefox throws a validation error when required attribute is set)', async () => {
    const container = document.createElement('div');

    let counter = 0;
    const originalCreateElement = document.createElement;
    spyOnDevAndProd(document, 'createElement').mockImplementation(
      function (type) {
        const el = originalCreateElement.apply(this, arguments);
        let value = '';
        if (type === 'textarea') {
          Object.defineProperty(el, 'value', {
            get: function () {
              return value;
            },
            set: function (val) {
              value = String(val);
              counter++;
            },
          });
        }
        return el;
      },
    );

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value="" readOnly={true} />);
    });

    expect(counter).toEqual(0);
  });

  it('should render defaultValue for SSR', () => {
    const markup = ReactDOMServer.renderToString(<textarea defaultValue="1" />);
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.innerHTML).toBe('1');
    expect(div.firstChild.getAttribute('defaultValue')).toBe(null);
  });

  it('should render value for SSR', () => {
    const element = <textarea value="1" onChange={function () {}} />;
    const markup = ReactDOMServer.renderToString(element);
    const div = document.createElement('div');
    div.innerHTML = markup;
    expect(div.firstChild.innerHTML).toBe('1');
    expect(div.firstChild.getAttribute('defaultValue')).toBe(null);
  });

  it('should allow setting `value` to `true`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('giraffe');

    await act(() => {
      root.render(<textarea value={true} onChange={emptyFunction} />);
    });

    expect(node.value).toEqual('true');
  });

  it('should allow setting `value` to `false`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('giraffe');

    await act(() => {
      root.render(<textarea value={false} onChange={emptyFunction} />);
    });

    expect(node.value).toEqual('false');
  });

  it('should allow setting `value` to `objToString`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('giraffe');

    const objToString = {
      toString: function () {
        return 'foo';
      },
    };

    await act(() => {
      root.render(<textarea value={objToString} onChange={emptyFunction} />);
    });

    expect(node.value).toEqual('foo');
  });

  it('should throw when value is set to a Temporal-like object', async () => {
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
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('giraffe');

    const test = async () => {
      await act(() => {
        root.render(
          <textarea value={new TemporalLike()} onChange={emptyFunction} />,
        );
      });
    };
    await expect(test).rejects.toThrowError(new TypeError('prod message'));
    assertConsoleErrorDev([
      'Form field values (value, checked, defaultValue, or defaultChecked props) must be ' +
        'strings, not TemporalLike. This value must be coerced to a string before using it here.\n' +
        '    in textarea (at **',
    ]);
  });

  it('should take updates to `defaultValue` for uncontrolled textarea', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild;

    expect(node.value).toBe('0');

    await act(() => {
      root.render(<textarea defaultValue="1" />);
    });

    expect(node.value).toBe('0');
  });

  it('should take updates to children in lieu of `defaultValue` for uncontrolled textarea', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild;

    expect(node.value).toBe('0');

    await act(() => {
      root.render(<textarea>1</textarea>);
    });

    expect(node.value).toBe('0');
  });

  it('should not incur unnecessary DOM mutations', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value="a" onChange={emptyFunction} />);
    });

    const node = container.firstChild;
    let nodeValue = 'a';
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
      root.render(<textarea value="a" onChange={emptyFunction} />);
    });

    expect(nodeValueSetter).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<textarea value="b" onChange={emptyFunction} />);
    });

    expect(nodeValueSetter).toHaveBeenCalledTimes(1);
  });

  it('should properly control a value of number `0`', async () => {
    const setUntrackedValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    ).set;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    document.body.appendChild(container);

    try {
      const node = await renderTextarea(
        <textarea value={0} onChange={emptyFunction} />,
        container,
        root,
      );

      setUntrackedValue.call(node, 'giraffe');
      node.dispatchEvent(
        new Event('input', {bubbles: true, cancelable: false}),
      );
      expect(node.value).toBe('0');
    } finally {
      document.body.removeChild(container);
    }
  });

  if (ReactFeatureFlags.disableTextareaChildren) {
    it('should ignore children content', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const node = await renderTextarea(
        <textarea>giraffe</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('');

      await act(() => {
        root.render(<textarea>gorilla</textarea>);
      });

      expect(node.value).toEqual('');
    });
  }

  if (ReactFeatureFlags.disableTextareaChildren) {
    it('should receive defaultValue and still ignore children content', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const node = await renderTextarea(
        <textarea defaultValue="dragon">monkey</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('dragon');
    });
  }

  if (!ReactFeatureFlags.disableTextareaChildren) {
    it('should treat children like `defaultValue`', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const node = await renderTextarea(
        <textarea>giraffe</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);

      expect(node.value).toBe('giraffe');

      await act(() => {
        root.render(<textarea>gorilla</textarea>);
      });

      expect(node.value).toEqual('giraffe');
    });
  }

  it('should keep value when switching to uncontrolled element if not changed', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="kitten" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('kitten');

    await act(() => {
      root.render(<textarea defaultValue="gorilla" />);
    });

    expect(node.value).toEqual('kitten');
  });

  it('should keep value when switching to uncontrolled element if changed', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="kitten" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe('kitten');

    await act(() => {
      root.render(<textarea value="puppies" onChange={emptyFunction} />);
    });

    expect(node.value).toBe('puppies');

    await act(() => {
      root.render(<textarea defaultValue="gorilla" />);
    });

    expect(node.value).toEqual('puppies');
  });

  if (ReactFeatureFlags.disableTextareaChildren) {
    it('should ignore numbers as children', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const node = await renderTextarea(
        <textarea>{17}</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('');
    });
  }

  if (!ReactFeatureFlags.disableTextareaChildren) {
    it('should allow numbers as children', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const node = await renderTextarea(
        <textarea>{17}</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('17');
    });
  }

  if (ReactFeatureFlags.disableTextareaChildren) {
    it('should ignore booleans as children', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const node = await renderTextarea(
        <textarea>{false}</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('');
    });
  }

  if (!ReactFeatureFlags.disableTextareaChildren) {
    it('should allow booleans as children', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const node = await renderTextarea(
        <textarea>{false}</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('false');
    });
  }

  if (ReactFeatureFlags.disableTextareaChildren) {
    it('should ignore objects as children', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const obj = {
        toString: function () {
          return 'sharkswithlasers';
        },
      };
      const node = await renderTextarea(
        <textarea>{obj}</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('');
    });
  }

  if (!ReactFeatureFlags.disableTextareaChildren) {
    it('should allow objects as children', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const obj = {
        toString: function () {
          return 'sharkswithlasers';
        },
      };
      const node = await renderTextarea(
        <textarea>{obj}</textarea>,
        container,
        root,
      );
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      expect(node.value).toBe('sharkswithlasers');
    });
  }

  if (!ReactFeatureFlags.disableTextareaChildren) {
    it('should throw with multiple or invalid children', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(
            <textarea>
              {'hello'}
              {'there'}
            </textarea>,
          );
        });
      }).rejects.toThrow('<textarea> can only have at most one child');
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);

      let node;
      await expect(
        (async () =>
          (node = await renderTextarea(
            <textarea>
              <strong />
            </textarea>,
            container,
            root,
          )))(),
      ).resolves.not.toThrow();
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);

      expect(node.value).toBe('[object Object]');
    });
  }

  it('should unmount', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea />);
    });

    await act(() => {
      root.unmount();
    });
  });

  it('should warn if value is null', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value={null} />);
    });
    assertConsoleErrorDev([
      '`value` prop on `textarea` should not be null. ' +
        'Consider using an empty string to clear the component or `undefined` ' +
        'for uncontrolled components.\n' +
        '    in textarea (at **)',
    ]);

    await act(() => {
      root.render(<textarea value={null} />);
    });
  });

  it('should warn if value and defaultValue are specified', async () => {
    const InvalidComponent = () => (
      <textarea value="foo" defaultValue="bar" readOnly={true} />
    );
    let container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<InvalidComponent />);
    });
    assertConsoleErrorDev([
      'InvalidComponent contains a textarea with both value and defaultValue props. ' +
        'Textarea elements must be either controlled or uncontrolled ' +
        '(specify either the value prop, or the defaultValue prop, but not ' +
        'both). Decide between using a controlled or uncontrolled textarea ' +
        'and remove one of these props. More info: ' +
        'https://react.dev/link/controlled-components\n' +
        '    in textarea (at **)\n' +
        '    in InvalidComponent (at **)',
    ]);

    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<InvalidComponent />);
    });
  });

  it('should not warn about missing onChange in uncontrolled textareas', async () => {
    const container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<textarea />);
    });

    await act(() => {
      root.unmount();
    });
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<textarea value={undefined} />);
    });
  });

  it('does not set textContent if value is unchanged', async () => {
    const container = document.createElement('div');
    let node;
    let instance;
    // Setting defaultValue on a textarea is equivalent to setting textContent,
    // and is the method we currently use, so we can observe if defaultValue is
    // is set to determine if textContent is being recreated.
    // https://html.spec.whatwg.org/#the-textarea-element
    let defaultValue;
    const set = jest.fn(value => {
      defaultValue = value;
    });
    const get = jest.fn(value => {
      return defaultValue;
    });
    class App extends React.Component {
      state = {count: 0, text: 'foo'};
      componentDidMount() {
        instance = this;
      }
      render() {
        return (
          <div>
            <span>{this.state.count}</span>
            <textarea
              ref={n => (node = n)}
              value="foo"
              onChange={emptyFunction}
              data-count={this.state.count}
            />
          </div>
        );
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    defaultValue = node.defaultValue;
    Object.defineProperty(node, 'defaultValue', {get, set});
    instance.setState({count: 1});
    expect(set.mock.calls.length).toBe(0);
  });

  describe('When given a Symbol value', () => {
    it('treats initial Symbol value as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea value={Symbol('foobar')} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <textarea> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in textarea (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
    });

    it('treats initial Symbol children as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea onChange={() => {}}>{Symbol('foo')}</textarea>);
      });
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
    });

    it('treats updated Symbol value as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea value="foo" onChange={() => {}} />);
      });

      await act(() => {
        root.render(<textarea value={Symbol('foo')} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <textarea> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in textarea (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
    });

    it('treats initial Symbol defaultValue as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea defaultValue={Symbol('foobar')} />);
      });

      const node = container.firstChild;

      // TODO: defaultValue is a reserved prop and is not validated. Check warnings when they are.
      expect(node.value).toBe('');
    });

    it('treats updated Symbol defaultValue as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea defaultValue="foo" />);
      });

      await act(() => {
        root.render(<textarea defaultValue={Symbol('foobar')} />);
      });

      const node = container.firstChild;

      // TODO: defaultValue is a reserved prop and is not validated. Check warnings when they are.
      expect(node.value).toBe('foo');
    });
  });

  describe('When given a function value', () => {
    it('treats initial function value as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea value={() => {}} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <textarea> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in textarea (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
    });

    it('treats initial function children as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea onChange={() => {}}>{() => {}}</textarea>);
      });
      assertConsoleErrorDev([
        'Use the `defaultValue` or `value` props instead of setting children on <textarea>.\n' +
          '    in textarea (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
    });

    it('treats updated function value as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea value="foo" onChange={() => {}} />);
      });

      await act(() => {
        root.render(<textarea value={() => {}} onChange={() => {}} />);
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <textarea> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in textarea (at **)',
      ]);
      const node = container.firstChild;

      expect(node.value).toBe('');
    });

    it('treats initial function defaultValue as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea defaultValue={() => {}} />);
      });

      const node = container.firstChild;

      // TODO: defaultValue is a reserved prop and is not validated. Check warnings when they are.
      expect(node.value).toBe('');
    });

    it('treats updated function defaultValue as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea defaultValue="foo" />);
      });

      await act(() => {
        root.render(<textarea defaultValue={() => {}} />);
      });

      const node = container.firstChild;

      // TODO: defaultValue is a reserved prop and is not validated. Check warnings when they are.
      expect(node.value).toBe('foo');
    });
  });

  it('should remove previous `defaultValue`', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild;

    expect(node.value).toBe('0');
    expect(node.defaultValue).toBe('0');

    await act(() => {
      root.render(<textarea />);
    });

    expect(node.defaultValue).toBe('');
  });

  it('should treat `defaultValue={null}` as missing', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild;

    expect(node.value).toBe('0');
    expect(node.defaultValue).toBe('0');

    await act(() => {
      root.render(<textarea defaultValue={null} />);
    });

    expect(node.defaultValue).toBe('');
  });

  it('should not warn about missing onChange if value is undefined', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value={undefined} />);
      }),
    ).resolves.not.toThrow();
  });

  it('should not warn about missing onChange if onChange is set', async () => {
    const change = jest.fn();
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value="something" onChange={change} />);
      }),
    ).resolves.not.toThrow();
  });

  it('should not warn about missing onChange if disabled is true', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value="something" disabled={true} />);
      }),
    ).resolves.not.toThrow();
  });

  it('should not warn about missing onChange if value is not set', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value="something" readOnly={true} />);
      }),
    ).resolves.not.toThrow();
  });

  it('should warn about missing onChange if value is false', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value={false} />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in textarea (at **)',
    ]);
  });

  it('should warn about missing onChange if value is 0', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value={0} />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in textarea (at **)',
    ]);
  });

  it('should warn about missing onChange if value is "0"', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value="0" />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in textarea (at **)',
    ]);
  });

  it('should warn about missing onChange if value is ""', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value="" />);
    });
    assertConsoleErrorDev([
      'You provided a `value` prop to a form ' +
        'field without an `onChange` handler. This will render a read-only ' +
        'field. If the field should be mutable use `defaultValue`. ' +
        'Otherwise, set either `onChange` or `readOnly`.\n' +
        '    in textarea (at **)',
    ]);
  });
});

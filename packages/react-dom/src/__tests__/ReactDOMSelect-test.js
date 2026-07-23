/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Fix JSDOM. setAttribute is supposed to throw on things that can't be implicitly toStringed.
const setAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name, value) {
  // eslint-disable-next-line react-internal/safe-string-coercion
  return setAttribute.call(this, name, '' + value);
};

describe('ReactDOMSelect', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let ReactDOMServer;
  let act;
  let assertConsoleErrorDev;

  const noop = function () {};

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
  });

  it('should allow setting `defaultValue`', async () => {
    const stub = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.value).toBe('giraffe');

    await act(() => {
      root.render(<select defaultValue="gorilla">{options}</select>);
    });

    expect(node.value).toEqual('giraffe');
  });

  it('should not throw with `defaultValue` and without children', () => {
    const stub = <select defaultValue="dummy" />;

    expect(async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(stub);
      });
    }).not.toThrow();
  });

  it('should not control when using `defaultValue`', async () => {
    const el = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(el);
    });

    const node = container.firstChild;

    expect(node.value).toBe('giraffe');

    node.value = 'monkey';
    await act(() => {
      root.render(el);
    });

    // Uncontrolled selects shouldn't change the value after first mounting
    expect(node.value).toEqual('monkey');
  });

  it('should allow setting `defaultValue` with multiple', async () => {
    const stub = (
      <select multiple={true} defaultValue={['giraffe', 'gorilla']}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={['monkey']}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla
  });

  it('should allow setting `value`', async () => {
    const stub = (
      <select value="giraffe" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.value).toBe('giraffe');

    await act(() => {
      root.render(
        <select value="gorilla" onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.value).toEqual('gorilla');
  });

  it('should default to the first non-disabled option', async () => {
    const stub = (
      <select defaultValue="">
        <option disabled={true}>Disabled</option>
        <option disabled={true}>Still Disabled</option>
        <option>0</option>
        <option disabled={true}>Also Disabled</option>
      </select>
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;
    expect(node.options[0].selected).toBe(false);
    expect(node.options[2].selected).toBe(true);
  });

  it('should allow setting `value` to __proto__', async () => {
    const stub = (
      <select value="__proto__" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="__proto__">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.value).toBe('__proto__');

    await act(() => {
      root.render(
        <select value="gorilla" onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.value).toEqual('gorilla');
  });

  it('should not throw with `value` and without children', () => {
    const stub = <select value="dummy" onChange={noop} />;

    expect(async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(stub);
      });
    }).not.toThrow();
  });

  it('should allow setting `value` with multiple', async () => {
    const stub = (
      <select multiple={true} value={['giraffe', 'gorilla']} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla

    await act(() => {
      root.render(
        <select multiple={true} value={['monkey']} onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(true); // monkey
    expect(node.options[1].selected).toBe(false); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla
  });

  it('should allow setting `value` to __proto__ with multiple', async () => {
    const stub = (
      <select multiple={true} value={['__proto__', 'gorilla']} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="__proto__">A __proto__!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // __proto__
    expect(node.options[2].selected).toBe(true); // gorilla

    await act(() => {
      root.render(
        <select multiple={true} value={['monkey']} onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(true); // monkey
    expect(node.options[1].selected).toBe(false); // __proto__
    expect(node.options[2].selected).toBe(false); // gorilla
  });

  it('should not select other options automatically', async () => {
    const stub = (
      <select multiple={true} value={['12']} onChange={noop}>
        <option value="1">one</option>
        <option value="2">two</option>
        <option value="12">twelve</option>
      </select>
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // one
    expect(node.options[1].selected).toBe(false); // two
    expect(node.options[2].selected).toBe(true); // twelve
  });

  it('should reset child options selected when they are changed and `value` is set', async () => {
    const stub = <select multiple={true} value={['a', 'b']} onChange={noop} />;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    await act(() => {
      root.render(
        <select multiple={true} value={['a', 'b']} onChange={noop}>
          <option value="a">a</option>
          <option value="b">b</option>
          <option value="c">c</option>
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(true); // a
    expect(node.options[1].selected).toBe(true); // b
    expect(node.options[2].selected).toBe(false); // c
  });

  it('should allow setting `value` with `objectToString`', async () => {
    const objectToString = {
      animal: 'giraffe',
      toString: function () {
        return this.animal;
      },
    };

    const el = (
      <select multiple={true} value={[objectToString]} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(el);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla

    // Changing the `value` prop should change the selected options.
    objectToString.animal = 'monkey';

    const el2 = (
      <select multiple={true} value={[objectToString]}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );

    await act(() => {
      root.render(el2);
    });

    expect(node.options[0].selected).toBe(true); // monkey
    expect(node.options[1].selected).toBe(false); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla
  });

  it('should allow switching to multiple', async () => {
    const stub = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={['giraffe', 'gorilla']}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla
  });

  it('should allow switching from multiple', async () => {
    const stub = (
      <select multiple={true} defaultValue={['giraffe', 'gorilla']}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla

    await act(() => {
      root.render(<select defaultValue="gorilla">{options}</select>);
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(false); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla
  });

  it('does not select an item when size is initially set to greater than 1', async () => {
    const stub = (
      <select size="2">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const select = container.firstChild;

    expect(select.options[0].selected).toBe(false);
    expect(select.options[1].selected).toBe(false);
    expect(select.options[2].selected).toBe(false);

    expect(select.value).toBe('');
    expect(select.selectedIndex).toBe(-1);
  });

  it('should remember value when switching to uncontrolled', async () => {
    const stub = (
      <select value={'giraffe'} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla

    await act(() => {
      root.render(<select>{options}</select>);
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla
  });

  it('should remember updated value when switching to uncontrolled', async () => {
    const stub = (
      <select value={'giraffe'} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;
    await act(() => {
      root.render(
        <select value="gorilla" onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(false); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla

    await act(() => {
      root.render(<select>{options}</select>);
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(false); // giraffe
    expect(node.options[2].selected).toBe(true); // gorilla
  });

  it('should support server-side rendering', () => {
    const stub = (
      <select value="giraffe" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = container.firstChild.options;
    expect(options[0].value).toBe('monkey');
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe('giraffe');
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe('gorilla');
    expect(options[2].selected).toBe(false);
  });

  it('should support server-side rendering with defaultValue', () => {
    const stub = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = container.firstChild.options;
    expect(options[0].value).toBe('monkey');
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe('giraffe');
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe('gorilla');
    expect(options[2].selected).toBe(false);
  });

  it('should support server-side rendering with dangerouslySetInnerHTML', () => {
    const stub = (
      <select defaultValue="giraffe">
        <option
          value="monkey"
          dangerouslySetInnerHTML={{
            __html: 'A monkey!',
          }}>
          {undefined}
        </option>
        <option
          value="giraffe"
          dangerouslySetInnerHTML={{
            __html: 'A giraffe!',
          }}>
          {null}
        </option>
        <option
          value="gorilla"
          dangerouslySetInnerHTML={{
            __html: 'A gorilla!',
          }}
        />
      </select>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = container.firstChild.options;
    expect(options[0].value).toBe('monkey');
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe('giraffe');
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe('gorilla');
    expect(options[2].selected).toBe(false);
  });

  it('should support server-side rendering with multiple', () => {
    const stub = (
      <select multiple={true} value={['giraffe', 'gorilla']} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = container.firstChild.options;
    expect(options[0].value).toBe('monkey');
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe('giraffe');
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe('gorilla');
    expect(options[2].selected).toBe(true);
  });

  it('should not control defaultValue if re-adding options', async () => {
    const container = document.createElement('div');

    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={['giraffe']}>
          <option key="monkey" value="monkey">
            A monkey!
          </option>
          <option key="giraffe" value="giraffe">
            A giraffe!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla!
          </option>
        </select>,
      );
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={['giraffe']}>
          <option key="monkey" value="monkey">
            A monkey!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla!
          </option>
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(false); // gorilla

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={['giraffe']}>
          <option key="monkey" value="monkey">
            A monkey!
          </option>
          <option key="giraffe" value="giraffe">
            A giraffe!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla!
          </option>
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(false); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla
  });

  it('should support options with dynamic children', async () => {
    const container = document.createElement('div');

    let node;

    function App({value}) {
      return (
        <select value={value} ref={n => (node = n)} onChange={noop}>
          <option key="monkey" value="monkey">
            A monkey {value === 'monkey' ? 'is chosen' : null}!
          </option>
          <option key="giraffe" value="giraffe">
            A giraffe {value === 'giraffe' && 'is chosen'}!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla {value === 'gorilla' && 'is chosen'}!
          </option>
        </select>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App value="monkey" />);
    });

    expect(node.options[0].selected).toBe(true); // monkey
    expect(node.options[1].selected).toBe(false); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla

    await act(() => {
      root.render(<App value="giraffe" />);
    });

    expect(node.options[0].selected).toBe(false); // monkey
    expect(node.options[1].selected).toBe(true); // giraffe
    expect(node.options[2].selected).toBe(false); // gorilla
  });

  it('should warn if value is null', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value={null}>
          <option value="test" />
        </select>,
      );
    });
    assertConsoleErrorDev([
      '`value` prop on `select` should not be null. ' +
        'Consider using an empty string to clear the component or `undefined` ' +
        'for uncontrolled components.\n' +
        '    in select (at **)',
    ]);

    await act(() => {
      root.render(
        <select value={null}>
          <option value="test" />
        </select>,
      );
    });
  });

  it('should warn if selected is set on <option>', async () => {
    function App() {
      return (
        <select>
          <option selected={true} />
          <option selected={true} />
        </select>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    assertConsoleErrorDev([
      'Use the `defaultValue` or `value` props on <select> instead of ' +
        'setting `selected` on <option>. Otherwise form reset may not work as expected.\n' +
        '    in option (at **)\n' +
        '    in App (at **)',
    ]);

    await act(() => {
      root.render(<App />);
    });
  });

  it('should warn if value is null and multiple is true', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value={null} multiple={true}>
          <option value="test" />
        </select>,
      );
    });
    assertConsoleErrorDev([
      '`value` prop on `select` should not be null. ' +
        'Consider using an empty array when `multiple` is ' +
        'set to `true` to clear the component or `undefined` ' +
        'for uncontrolled components.\n' +
        '    in select (at **)',
    ]);

    await act(() => {
      root.render(
        <select value={null} multiple={true}>
          <option value="test" />
        </select>,
      );
    });
  });

  it('should refresh state on change', async () => {
    const stub = (
      <select value="giraffe" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement('div');
    document.body.appendChild(container);

    try {
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(stub);
      });

      const node = container.firstChild;

      await act(() => {
        node.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: false}),
        );
      });

      expect(node.value).toBe('giraffe');
    } finally {
      document.body.removeChild(container);
    }
  });

  it('should warn if value and defaultValue props are specified', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value="giraffe" defaultValue="giraffe" readOnly={true}>
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });
    assertConsoleErrorDev([
      'Select elements must be either controlled or uncontrolled ' +
        '(specify either the value prop, or the defaultValue prop, but not ' +
        'both). Decide between using a controlled or uncontrolled select ' +
        'element and remove one of these props. More info: ' +
        'https://react.dev/link/controlled-components\n' +
        '    in select (at **)',
    ]);

    await act(() => {
      root.render(
        <select value="giraffe" defaultValue="giraffe" readOnly={true}>
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });
  });

  it('should not warn about missing onChange in uncontrolled textareas', async () => {
    const container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<select />);
    });

    await act(() => {
      root.unmount();
    });
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<select value={undefined} />);
    });
  });

  it('should be able to safely remove select onChange', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    async function changeView() {
      root.unmount();
    }

    const stub = (
      <select value="giraffe" onChange={changeView}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    await expect(
      act(() => {
        node.dispatchEvent(
          new Event('change', {bubbles: true, cancelable: false}),
        );
      }),
    ).resolves.not.toThrow();

    expect(container.firstChild).toBe(null);
  });

  it('should select grandchild options nested inside an optgroup', async () => {
    const stub = (
      <select value="b" onChange={noop}>
        <optgroup label="group">
          <option value="a">a</option>
          <option value="b">b</option>
          <option value="c">c</option>
        </optgroup>
      </select>
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // a
    expect(node.options[1].selected).toBe(true); // b
    expect(node.options[2].selected).toBe(false); // c
  });

  // @gate !disableLegacyMode
  it('should allow controlling `value` in a nested legacy render', async () => {
    let selectNode;

    class Parent extends React.Component {
      state = {
        value: 'giraffe',
      };

      componentDidMount() {
        this._renderNested();
      }

      componentDidUpdate() {
        this._renderNested();
      }

      _handleChange(event) {
        this.setState({value: event.target.value});
      }

      _renderNested() {
        ReactDOM.render(
          <select
            onChange={this._handleChange.bind(this)}
            ref={n => (selectNode = n)}
            value={this.state.value}>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
          this._nestingContainer,
        );
      }

      render() {
        return <div ref={n => (this._nestingContainer = n)} />;
      }
    }

    const container = document.createElement('div');

    document.body.appendChild(container);

    ReactDOM.render(<Parent />, container);

    expect(selectNode.value).toBe('giraffe');

    selectNode.value = 'gorilla';

    let nativeEvent = document.createEvent('Event');
    nativeEvent.initEvent('input', true, true);
    selectNode.dispatchEvent(nativeEvent);

    expect(selectNode.value).toEqual('gorilla');

    nativeEvent = document.createEvent('Event');
    nativeEvent.initEvent('change', true, true);
    selectNode.dispatchEvent(nativeEvent);

    expect(selectNode.value).toEqual('gorilla');

    document.body.removeChild(container);
  });

  it('should not select first option by default when multiple is set and no defaultValue is set', async () => {
    const stub = (
      <select multiple={true} onChange={noop}>
        <option value="a">a</option>
        <option value="b">b</option>
        <option value="c">c</option>
      </select>
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild;

    expect(node.options[0].selected).toBe(false); // a
    expect(node.options[1].selected).toBe(false); // b
    expect(node.options[2].selected).toBe(false); // c
  });

  describe('When given a Symbol value', () => {
    it('treats initial Symbol value as missing', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value={Symbol('foobar')}>
            <option value={Symbol('foobar')}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      const node = container.firstChild;
      expect(node.value).toBe('A Symbol!');
    });

    it('treats updated Symbol value as missing', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value="monkey">
            <option value={Symbol('foobar')}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      let node = container.firstChild;
      expect(node.value).toBe('monkey');

      await act(() => {
        root.render(
          <select onChange={noop} value={Symbol('foobar')}>
            <option value={Symbol('foobar')}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild;

      expect(node.value).toBe('A Symbol!');
    });

    it('treats initial Symbol defaultValue as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={Symbol('foobar')}>
            <option value={Symbol('foobar')}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      const node = container.firstChild;
      expect(node.value).toBe('A Symbol!');
    });

    it('treats updated Symbol defaultValue as an empty string', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue="monkey">
            <option value={Symbol('foobar')}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      let node = container.firstChild;
      expect(node.value).toBe('monkey');

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={Symbol('foobar')}>
            <option value={Symbol('foobar')}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild;
      expect(node.value).toBe('A Symbol!');
    });
  });

  describe('When given a function value', () => {
    it('treats initial function value as missing', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value={() => {}}>
            <option value={() => {}}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      const node = container.firstChild;
      expect(node.value).toBe('A function!');
    });

    it('treats initial function defaultValue as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={() => {}}>
            <option value={() => {}}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      const node = container.firstChild;
      expect(node.value).toBe('A function!');
    });

    it('treats updated function value as an empty string', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value="monkey">
            <option value={() => {}}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      let node = container.firstChild;
      expect(node.value).toBe('monkey');

      await act(() => {
        root.render(
          <select onChange={noop} value={() => {}}>
            <option value={() => {}}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild;
      expect(node.value).toBe('A function!');
    });

    it('treats updated function defaultValue as an empty string', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue="monkey">
            <option value={() => {}}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'Invalid value for prop `value` on <option> tag. ' +
          'Either remove it from the element, or pass a string or number value to keep it in the DOM. ' +
          'For details, see https://react.dev/link/attribute-behavior \n' +
          '    in option (at **)',
      ]);

      let node = container.firstChild;
      expect(node.value).toBe('monkey');

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={() => {}}>
            <option value={() => {}}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild;

      expect(node.value).toBe('A function!');
    });
  });

  describe('When given a Temporal.PlainDate-like value', () => {
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

    it('throws when given a Temporal.PlainDate-like value (select)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select onChange={noop} value={new TemporalLike()}>
              <option value="2020-01-01">like a Temporal.PlainDate</option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
      ]);
    });

    it('throws when given a Temporal.PlainDate-like value (option)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select onChange={noop} value="2020-01-01">
              <option value={new TemporalLike()}>
                like a Temporal.PlainDate
              </option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
      ]);
    });

    it('throws when given a Temporal.PlainDate-like value (both)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await expect(
        act(() => {
          root.render(
            <select onChange={noop} value={new TemporalLike()}>
              <option value={new TemporalLike()}>
                like a Temporal.PlainDate
              </option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
      ]);
    });

    it('throws with updated Temporal.PlainDate-like value (select)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} value="monkey">
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      await expect(
        act(() => {
          root.render(
            <select onChange={noop} value={new TemporalLike()}>
              <option value="2020-01-01">like a Temporal.PlainDate</option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
      ]);
    });

    it('throws with updated Temporal.PlainDate-like value (option)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} value="2020-01-01">
            <option value="donkey">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      await expect(
        act(() => {
          root.render(
            <select onChange={noop} value="2020-01-01">
              <option value={new TemporalLike()}>
                like a Temporal.PlainDate
              </option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
      ]);
    });

    it('throws with updated Temporal.PlainDate-like value (both)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} value="donkey">
            <option value="donkey">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      await expect(
        act(() => {
          root.render(
            <select onChange={noop} value={new TemporalLike()}>
              <option value={new TemporalLike()}>
                like a Temporal.PlainDate
              </option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(
        new AggregateError([
          new TypeError('prod message'),
          new TypeError('prod message'),
        ]),
      );
      assertConsoleErrorDev([
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
      ]);
    });

    it('throws when given a Temporal.PlainDate-like defaultValue (select)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select onChange={noop} defaultValue={new TemporalLike()}>
              <option value="2020-01-01">like a Temporal.PlainDate</option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
      ]);
    });

    it('throws when given a Temporal.PlainDate-like defaultValue (option)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await expect(
        act(() => {
          root.render(
            <select onChange={noop} defaultValue="2020-01-01">
              <option value={new TemporalLike()}>
                like a Temporal.PlainDate
              </option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
      ]);
    });

    it('throws when given a Temporal.PlainDate-like defaultValue (both)', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select onChange={noop} defaultValue={new TemporalLike()}>
              <option value={new TemporalLike()}>
                like a Temporal.PlainDate
              </option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
      ]);
    });

    it('throws with updated Temporal.PlainDate-like defaultValue (select)', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} defaultValue="monkey">
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select onChange={noop} defaultValue={new TemporalLike()}>
              <option value="2020-01-01">like a Temporal.PlainDate</option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
        'Form field values (value, checked, defaultValue, or defaultChecked props)' +
          ' must be strings, not TemporalLike. ' +
          'This value must be coerced to a string before using it here.\n' +
          '    in select (at **)',
      ]);
    });

    it('throws with updated Temporal.PlainDate-like defaultValue (both)', async () => {
      let container = document.createElement('div');
      let root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} defaultValue="monkey">
            <option value="donkey">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      container = document.createElement('div');
      root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select onChange={noop} value={new TemporalLike()}>
              <option value={new TemporalLike()}>
                like a Temporal.PlainDate
              </option>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
            </select>,
          );
        }),
      ).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
        'The provided `value` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in option (at **)',
      ]);
    });

    it('should not warn about missing onChange if value is not set', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
              <option value="gorilla">A gorilla!</option>
            </select>,
          );
        }),
      ).resolves.not.toThrow();
    });

    it('should not throw an error about missing onChange if value is undefined', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select value={undefined}>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
              <option value="gorilla">A gorilla!</option>
            </select>,
          );
        }),
      ).resolves.not.toThrow();
    });

    it('should not warn about missing onChange if onChange is set', async () => {
      const change = jest.fn();
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select value="monkey" onChange={change}>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
              <option value="gorilla">A gorilla!</option>
            </select>,
          );
        }),
      ).resolves.not.toThrow();
    });

    it('should not warn about missing onChange if disabled is true', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <select value="monkey" disabled={true}>
              <option value="monkey">A monkey!</option>
              <option value="giraffe">A giraffe!</option>
              <option value="gorilla">A gorilla!</option>
            </select>,
          );
        }),
      ).resolves.not.toThrow();
    });

    it('should warn about missing onChange if value is false', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select value={false}>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'You provided a `value` prop to a form ' +
          'field without an `onChange` handler. This will render a read-only ' +
          'field. If the field should be mutable use `defaultValue`. ' +
          'Otherwise, set `onChange`.\n    in select (at **)',
      ]);
    });

    it('should warn about missing onChange if value is 0', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select value={0}>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'You provided a `value` prop to a form ' +
          'field without an `onChange` handler. This will render a read-only ' +
          'field. If the field should be mutable use `defaultValue`. ' +
          'Otherwise, set `onChange`.\n' +
          '    in select (at **)',
      ]);
    });

    it('should warn about missing onChange if value is "0"', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select value="0">
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'You provided a `value` prop to a form ' +
          'field without an `onChange` handler. This will render a read-only ' +
          'field. If the field should be mutable use `defaultValue`. ' +
          'Otherwise, set `onChange`.\n' +
          '    in select (at **)',
      ]);
    });

    it('should warn about missing onChange if value is ""', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select value="">
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      });
      assertConsoleErrorDev([
        'You provided a `value` prop to a form ' +
          'field without an `onChange` handler. This will render a read-only ' +
          'field. If the field should be mutable use `defaultValue`. ' +
          'Otherwise, set `onChange`.\n' +
          '    in select (at **)',
      ]);
    });
  });
});

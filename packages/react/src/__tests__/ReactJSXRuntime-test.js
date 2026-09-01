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
let ReactDOMClient;
let JSXRuntime;
let JSXDEVRuntime;
let act;
let assertConsoleErrorDev;

// NOTE: Prefer to call the JSXRuntime directly in these tests so we can be
// certain that we are testing the runtime behavior, as opposed to the Babel
// transform that we use in our tests configuration.
describe('ReactJSXRuntime', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    JSXRuntime = require('react/jsx-runtime');
    JSXDEVRuntime = require('react/jsx-dev-runtime');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
  });

  it('allows static methods to be called using the type property', () => {
    class StaticMethodComponentClass extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {});
      }
    }
    StaticMethodComponentClass.someStaticMethod = () => 'someReturnValue';

    const element = JSXRuntime.jsx(StaticMethodComponentClass, {});
    expect(element.type.someStaticMethod()).toBe('someReturnValue');
  });

  it('is indistinguishable from a plain object', () => {
    const element = JSXRuntime.jsx('div', {className: 'foo'});
    const object = {};
    expect(element.constructor).toBe(object.constructor);
  });

  it('should use default prop value when removing a prop', async () => {
    class Component extends React.Component {
      render() {
        return JSXRuntime.jsx('span', {children: [this.props.fruit]});
      }
    }
    Component.defaultProps = {fruit: 'persimmon'};

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsx(Component, {fruit: 'mango'}));
    });
    expect(container.firstChild.textContent).toBe('mango');

    await act(() => {
      root.render(JSXRuntime.jsx(Component, {}));
    });
    expect(container.firstChild.textContent).toBe('persimmon');
  });

  it('should normalize props with default values', async () => {
    class Component extends React.Component {
      render() {
        return JSXRuntime.jsx('span', {children: this.props.prop});
      }
    }
    Component.defaultProps = {prop: 'testKey'};

    let container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(
        JSXRuntime.jsx(Component, {ref: current => (instance = current)}),
      );
    });

    expect(instance.props.prop).toBe('testKey');

    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    let inst2;
    await act(() => {
      root.render(
        JSXRuntime.jsx(Component, {
          prop: null,
          ref: current => (inst2 = current),
        }),
      );
    });

    expect(inst2.props.prop).toBe(null);
  });

  it('throws when changing a prop (in dev) after element creation', async () => {
    class Outer extends React.Component {
      render() {
        const el = JSXRuntime.jsx('div', {className: 'moo'});

        if (__DEV__) {
          expect(function () {
            el.props.className = 'quack';
          }).toThrow();
          expect(el.props.className).toBe('moo');
        } else {
          el.props.className = 'quack';
          expect(el.props.className).toBe('quack');
        }

        return el;
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsx(Outer, {color: 'orange'}));
    });

    const outer = container.firstChild;
    if (__DEV__) {
      expect(outer.className).toBe('moo');
    } else {
      expect(outer.className).toBe('quack');
    }
  });

  it('throws when adding a prop (in dev) after element creation', async () => {
    const container = document.createElement('div');
    class Outer extends React.Component {
      render() {
        const el = JSXRuntime.jsx('div', {children: this.props.sound});

        if (__DEV__) {
          expect(function () {
            el.props.className = 'quack';
          }).toThrow();
          expect(el.props.className).toBe(undefined);
        } else {
          el.props.className = 'quack';
          expect(el.props.className).toBe('quack');
        }

        return el;
      }
    }
    Outer.defaultProps = {sound: 'meow'};
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsx(Outer, {}));
    });
    expect(container.firstChild.textContent).toBe('meow');
    if (__DEV__) {
      expect(container.firstChild.className).toBe('');
    } else {
      expect(container.firstChild.className).toBe('quack');
    }
  });

  it('does not warn for NaN props', async () => {
    class Test extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {});
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let test;
    await act(() => {
      root.render(
        JSXRuntime.jsx(Test, {
          value: +undefined,
          ref: current => (test = current),
        }),
      );
    });

    expect(test.props.value).toBeNaN();
  });

  it('should warn when `key` is being accessed on composite element', async () => {
    const container = document.createElement('div');
    class Child extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {children: this.props.key});
      }
    }
    class Parent extends React.Component {
      render() {
        return JSXRuntime.jsxs('div', {
          children: [
            JSXRuntime.jsx(Child, {}, '0'),
            JSXRuntime.jsx(Child, {}, '1'),
            JSXRuntime.jsx(Child, {}, '2'),
          ],
        });
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsx(Parent, {}));
    });
    assertConsoleErrorDev([
      'Child: `key` is not a prop. Trying to access it will result ' +
        'in `undefined` being returned. If you need to access the same ' +
        'value within the child component, you should pass it as a different ' +
        'prop. (https://react.dev/link/special-props)\n' +
        '    in Parent (at **)',
    ]);
  });

  it('warns when a jsxs is passed something that is not an array', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsxs('div', {children: 'foo'}, null));
    });
    assertConsoleErrorDev([
      'React.jsx: Static children should always be an array. ' +
        'You are likely explicitly calling React.jsxs or React.jsxDEV. ' +
        'Use the Babel transform instead.',
    ]);
  });

  it('should warn when `key` is being accessed on a host element', () => {
    const element = JSXRuntime.jsxs('div', {}, '3');
    void element.props.key;
    assertConsoleErrorDev([
      'div: `key` is not a prop. Trying to access it will result ' +
        'in `undefined` being returned. If you need to access the same ' +
        'value within the child component, you should pass it as a different ' +
        'prop. (https://react.dev/link/special-props)',
    ]);
  });

  it('should warn when unkeyed children are passed to jsx', async () => {
    const container = document.createElement('div');

    class Child extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {});
      }
    }
    class Parent extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {
          children: [
            JSXRuntime.jsx(Child, {}),
            JSXRuntime.jsx(Child, {}),
            JSXRuntime.jsx(Child, {}),
          ],
        });
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsx(Parent, {}));
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the render method of `Parent`. See https://react.dev/link/warning-keys for more information.\n' +
        '    in Parent (at **)',
    ]);
  });

  it('should warn when keys are passed as part of props', async () => {
    const container = document.createElement('div');
    class Child extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {});
      }
    }
    class Parent extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {
          children: [JSXRuntime.jsx(Child, {key: '0', prop: 'hi'})],
        });
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsx(Parent, {}));
    });
    assertConsoleErrorDev([
      'A props object containing a "key" prop is being spread into JSX:\n' +
        '  let props = {key: someKey, prop: ...};\n' +
        '  <Child {...props} />\n' +
        'React keys must be passed directly to JSX without using spread:\n' +
        '  let props = {prop: ...};\n' +
        '  <Child key={someKey} {...props} />\n' +
        '    in Parent (at **)',
    ]);
  });

  it('should not warn when unkeyed children are passed to jsxs', async () => {
    const container = document.createElement('div');
    class Child extends React.Component {
      render() {
        return JSXRuntime.jsx('div', {});
      }
    }
    class Parent extends React.Component {
      render() {
        return JSXRuntime.jsxs('div', {
          children: [
            JSXRuntime.jsx(Child, {}),
            JSXRuntime.jsx(Child, {}),
            JSXRuntime.jsx(Child, {}),
          ],
        });
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(JSXRuntime.jsx(Parent, {}));
    });

    // Test shouldn't throw any errors.
    expect(true).toBe(true);
  });

  it('does not call lazy initializers eagerly', () => {
    let didCall = false;
    const Lazy = React.lazy(() => {
      didCall = true;
      return {then() {}};
    });
    if (__DEV__) {
      JSXDEVRuntime.jsxDEV(Lazy, {});
    } else {
      JSXRuntime.jsx(Lazy, {});
    }
    expect(didCall).toBe(false);
  });

  it('does not clone props object if key and ref is not spread', async () => {
    const config = {
      foo: 'foo',
      bar: 'bar',
    };

    const element = __DEV__
      ? JSXDEVRuntime.jsxDEV('div', config)
      : JSXRuntime.jsx('div', config);
    expect(Object.is(element.props, config)).toBe(true);

    const configWithKey = {
      foo: 'foo',
      bar: 'bar',
      // This only happens when the key is spread onto the element. A statically
      // defined key is passed as a separate argument to the jsx() runtime.
      key: 'key',
    };

    const elementWithSpreadKey = __DEV__
      ? JSXDEVRuntime.jsxDEV('div', configWithKey)
      : JSXRuntime.jsx('div', configWithKey);
    assertConsoleErrorDev([
      'A props object containing a "key" prop is being spread into JSX:\n' +
        '  let props = {key: someKey, foo: ..., bar: ...};\n' +
        '  <div {...props} />\n' +
        'React keys must be passed directly to JSX without using spread:\n' +
        '  let props = {foo: ..., bar: ...};\n' +
        '  <div key={someKey} {...props} />',
    ]);
    expect(elementWithSpreadKey.props).not.toBe(configWithKey);
  });
});

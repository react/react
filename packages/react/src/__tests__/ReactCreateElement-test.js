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

// NOTE: This module tests the old, "classic" JSX runtime, React.createElement.
// Do not use JSX syntax in this module; call React.createElement directly.
describe('ReactCreateElement', () => {
  let ComponentClass;

  beforeEach(() => {
    jest.resetModules();

    ({
      act,
      assertConsoleErrorDev,
      assertConsoleWarnDev,
    } = require('internal-test-utils'));

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ComponentClass = class extends React.Component {
      render() {
        return React.createElement('div');
      }
    };
  });

  it('returns a complete element according to spec', () => {
    const element = React.createElement(ComponentClass);
    expect(element.type).toBe(ComponentClass);
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    if (__DEV__) {
      expect(Object.isFrozen(element)).toBe(true);
      expect(Object.isFrozen(element.props)).toBe(true);
    }
    expect(element.props).toEqual({});
  });

  it('should warn when `key` is being accessed on composite element', async () => {
    class Child extends React.Component {
      render() {
        return React.createElement('div', null, this.props.key);
      }
    }
    class Parent extends React.Component {
      render() {
        return React.createElement(
          'div',
          null,
          React.createElement(Child, {key: '0'}),
          React.createElement(Child, {key: '1'}),
          React.createElement(Child, {key: '2'}),
        );
      }
    }
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(React.createElement(Parent));
    });
    assertConsoleErrorDev([
      'Child: `key` is not a prop. Trying to access it will result ' +
        'in `undefined` being returned. If you need to access the same ' +
        'value within the child component, you should pass it as a different ' +
        'prop. (https://react.dev/link/special-props)\n' +
        '    in Parent (at **)',
    ]);
  });

  it('should warn when `key` is being accessed on a host element', () => {
    const element = React.createElement('div', {key: '3'});
    void element.props.key;
    assertConsoleErrorDev([
      'div: `key` is not a prop. Trying to access it will result ' +
        'in `undefined` being returned. If you need to access the same ' +
        'value within the child component, you should pass it as a different ' +
        'prop. (https://react.dev/link/special-props)',
    ]);
  });

  it('allows a string to be passed as the type', () => {
    const element = React.createElement('div');
    expect(element.type).toBe('div');
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    if (__DEV__) {
      expect(Object.isFrozen(element)).toBe(true);
      expect(Object.isFrozen(element.props)).toBe(true);
    }
    expect(element.props).toEqual({});
  });

  it('returns an immutable element', () => {
    const element = React.createElement(ComponentClass);
    if (__DEV__) {
      expect(() => (element.type = 'div')).toThrow();
    } else {
      expect(() => (element.type = 'div')).not.toThrow();
    }
  });

  it('does not reuse the original config object', () => {
    const config = {foo: 1};
    const element = React.createElement(ComponentClass, config);
    expect(element.props.foo).toBe(1);
    config.foo = 2;
    expect(element.props.foo).toBe(1);
  });

  it('does not fail if config has no prototype', () => {
    const config = Object.create(null, {foo: {value: 1, enumerable: true}});
    const element = React.createElement(ComponentClass, config);
    expect(element.props.foo).toBe(1);
  });

  it('extracts key from the rest of the props', () => {
    const element = React.createElement(ComponentClass, {
      key: '12',
      foo: '56',
    });
    expect(element.type).toBe(ComponentClass);
    expect(element.key).toBe('12');
    const expectation = {foo: '56'};
    Object.freeze(expectation);
    expect(element.props).toEqual(expectation);
  });

  it('does not extract ref from the rest of the props', () => {
    const ref = React.createRef();
    const element = React.createElement(ComponentClass, {
      key: '12',
      ref: ref,
      foo: '56',
    });
    expect(element.type).toBe(ComponentClass);
    expect(element.ref).toBe(ref);
    assertConsoleErrorDev([
      'Accessing element.ref was removed in React 19. ref is now a ' +
        'regular prop. It will be removed from the JSX Element ' +
        'type in a future release.',
    ]);
    const expectation = {foo: '56', ref};
    Object.freeze(expectation);
    expect(element.props).toEqual(expectation);
  });

  it('extracts null key', () => {
    const element = React.createElement(ComponentClass, {
      key: null,
      foo: '12',
    });
    expect(element.type).toBe(ComponentClass);
    expect(element.key).toBe('null');
    if (__DEV__) {
      expect(Object.isFrozen(element)).toBe(true);
      expect(Object.isFrozen(element.props)).toBe(true);
    }
    expect(element.props).toEqual({foo: '12'});
  });

  it('ignores undefined key and ref', () => {
    const props = {
      foo: '56',
      key: undefined,
      ref: undefined,
    };
    const element = React.createElement(ComponentClass, props);
    expect(element.type).toBe(ComponentClass);
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    if (__DEV__) {
      expect(Object.isFrozen(element)).toBe(true);
      expect(Object.isFrozen(element.props)).toBe(true);
    }
    expect(element.props).toEqual({foo: '56'});
  });

  it('ignores key and ref warning getters', () => {
    const elementA = React.createElement('div');
    const elementB = React.createElement('div', elementA.props);
    expect(elementB.key).toBe(null);
    expect(elementB.ref).toBe(null);
  });

  it('coerces the key to a string', () => {
    const element = React.createElement(ComponentClass, {
      key: 12,
      foo: '56',
    });
    expect(element.type).toBe(ComponentClass);
    expect(element.key).toBe('12');
    expect(element.ref).toBe(null);
    if (__DEV__) {
      expect(Object.isFrozen(element)).toBe(true);
      expect(Object.isFrozen(element.props)).toBe(true);
    }
    expect(element.props).toEqual({foo: '56'});
  });

  it('preserves the owner on the element', async () => {
    let element;
    let instance;

    class Wrapper extends React.Component {
      componentDidMount() {
        instance = this;
      }
      render() {
        element = React.createElement(ComponentClass);
        return element;
      }
    }
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(React.createElement(Wrapper)));
    if (__DEV__) {
      expect(element._owner.stateNode).toBe(instance);
    } else {
      expect('_owner' in element).toBe(false);
    }
  });

  it('merges an additional argument onto the children prop', () => {
    const a = 1;
    const element = React.createElement(
      ComponentClass,
      {
        children: 'text',
      },
      a,
    );
    expect(element.props.children).toBe(a);
  });

  it('does not override children if no rest args are provided', () => {
    const element = React.createElement(ComponentClass, {
      children: 'text',
    });
    expect(element.props.children).toBe('text');
  });

  it('overrides children if null is provided as an argument', () => {
    const element = React.createElement(
      ComponentClass,
      {
        children: 'text',
      },
      null,
    );
    expect(element.props.children).toBe(null);
  });

  it('merges rest arguments onto the children prop in an array', () => {
    const a = 1;
    const b = 2;
    const c = 3;
    const element = React.createElement(ComponentClass, null, a, b, c);
    expect(element.props.children).toEqual([1, 2, 3]);
  });

  it('allows static methods to be called using the type property', () => {
    class StaticMethodComponentClass extends React.Component {
      render() {
        return React.createElement('div');
      }
    }
    StaticMethodComponentClass.someStaticMethod = () => 'someReturnValue';

    const element = React.createElement(StaticMethodComponentClass);
    expect(element.type.someStaticMethod()).toBe('someReturnValue');
  });

  it('is indistinguishable from a plain object', () => {
    const element = React.createElement('div', {className: 'foo'});
    const object = {};
    expect(element.constructor).toBe(object.constructor);
  });

  it('should use default prop value when removing a prop', async () => {
    class Component extends React.Component {
      render() {
        return React.createElement('span');
      }
    }
    Component.defaultProps = {fruit: 'persimmon'};

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const ref = React.createRef();
    await act(() => {
      root.render(React.createElement(Component, {ref, fruit: 'mango'}));
    });
    const instance = ref.current;
    expect(instance.props.fruit).toBe('mango');

    await act(() => {
      root.render(React.createElement(Component));
    });
    expect(instance.props.fruit).toBe('persimmon');
  });

  it('should normalize props with default values', async () => {
    let instance;
    class Component extends React.Component {
      componentDidMount() {
        instance = this;
      }
      render() {
        return React.createElement('span', null, this.props.prop);
      }
    }
    Component.defaultProps = {prop: 'testKey'};

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(React.createElement(Component));
    });
    expect(instance.props.prop).toBe('testKey');

    await act(() => {
      root.render(React.createElement(Component, {prop: null}));
    });
    expect(instance.props.prop).toBe(null);
  });

  it('throws when changing a prop (in dev) after element creation', async () => {
    class Outer extends React.Component {
      render() {
        const el = React.createElement('div', {className: 'moo'});

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
      root.render(React.createElement(Outer, {color: 'orange'}));
    });
    if (__DEV__) {
      expect(container.firstChild.className).toBe('moo');
    } else {
      expect(container.firstChild.className).toBe('quack');
    }
  });

  it('throws when adding a prop (in dev) after element creation', async () => {
    const container = document.createElement('div');
    class Outer extends React.Component {
      render() {
        const el = React.createElement('div', null, this.props.sound);

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
      root.render(React.createElement(Outer));
    });
    expect(container.firstChild.textContent).toBe('meow');
    if (__DEV__) {
      expect(container.firstChild.className).toBe('');
    } else {
      expect(container.firstChild.className).toBe('quack');
    }
  });

  it('does not warn for NaN props', async () => {
    let test;
    class Test extends React.Component {
      componentDidMount() {
        test = this;
      }
      render() {
        return React.createElement('div');
      }
    }
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(React.createElement(Test, {value: +undefined}));
    });
    expect(test.props.value).toBeNaN();
  });

  it('warns if outdated JSX transform is detected', async () => {
    // Warns if __self is detected, because that's only passed by a compiler
    React.createElement('div', {className: 'foo', __self: this});
    assertConsoleWarnDev([
      'Your app (or one of its dependencies) is using an outdated JSX ' +
        'transform. Update to the modern JSX transform for ' +
        'faster performance: https://react.dev/link/new-jsx-transform',
    ]);

    // Only warns the first time. Subsequent elements don't warn.
    React.createElement('div', {className: 'foo', __self: this});
  });

  it('do not warn about outdated JSX transform if `key` is present', () => {
    // When a static "key" prop is defined _after_ a spread, the modern JSX
    // transform outputs `createElement` instead of `jsx`. (This is because with
    // `jsx`, a spread key always takes precedence over a static key, regardless
    // of the order, whereas `createElement` respects the order.)
    //
    // To avoid a false positive warning, we skip the warning whenever a `key`
    // prop is present.
    React.createElement('div', {key: 'foo', __self: this});
  });
});

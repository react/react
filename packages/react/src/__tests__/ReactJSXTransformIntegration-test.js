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
let act;
let assertConsoleErrorDev;

// TODO: Historically this module was used to confirm that the JSX transform
// produces the correct output. However, most users (and indeed our own test
// suite) use a tool like Babel or TypeScript to transform JSX; unlike the
// runtime, the transform is not part of React itself. So this is really just an
// integration suite for the Babel transform. We might consider deleting it. We
// should prefer to test the JSX runtime directly, in ReactCreateElement-test
// and ReactJsxRuntime-test. In the meantime, there's lots of overlap between
// those modules and this one.
describe('ReactJSXTransformIntegration', () => {
  let Component;

  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));

    Component = class extends React.Component {
      render() {
        return <div />;
      }
    };
  });

  it('sanity check: test environment is configured to compile JSX to the jsx() runtime', async () => {
    function App() {
      return <div />;
    }
    const source = App.toString();
    if (__DEV__) {
      expect(source).toContain('jsxDEV(');
    } else {
      expect(source).toContain('jsx(');
    }
    expect(source).not.toContain('React.createElement');
  });

  it('returns a complete element according to spec', () => {
    const element = <Component />;
    expect(element.type).toBe(Component);
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    const expectation = {};
    Object.freeze(expectation);
    expect(element.props).toEqual(expectation);
  });

  it('allows a lower-case to be passed as the string type', () => {
    const element = <div />;
    expect(element.type).toBe('div');
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    const expectation = {};
    Object.freeze(expectation);
    expect(element.props).toEqual(expectation);
  });

  it('allows a string to be passed as the type', () => {
    const TagName = 'div';
    const element = <TagName />;
    expect(element.type).toBe('div');
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    const expectation = {};
    Object.freeze(expectation);
    expect(element.props).toEqual(expectation);
  });

  it('returns an immutable element', () => {
    const element = <Component />;
    if (__DEV__) {
      expect(() => (element.type = 'div')).toThrow();
    } else {
      expect(() => (element.type = 'div')).not.toThrow();
    }
  });

  it('does not reuse the object that is spread into props', () => {
    const config = {foo: 1};
    const element = <Component {...config} />;
    expect(element.props.foo).toBe(1);
    config.foo = 2;
    expect(element.props.foo).toBe(1);
  });

  it('extracts key from the rest of the props', () => {
    const element = <Component key="12" foo="56" />;
    expect(element.type).toBe(Component);
    expect(element.key).toBe('12');
    const expectation = {foo: '56'};
    Object.freeze(expectation);
    expect(element.props).toEqual(expectation);
  });

  it('does not extract ref from the rest of the props', () => {
    const ref = React.createRef();
    const element = <Component ref={ref} foo="56" />;
    expect(element.type).toBe(Component);
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

  it('coerces the key to a string', () => {
    const element = <Component key={12} foo="56" />;
    expect(element.type).toBe(Component);
    expect(element.key).toBe('12');
    expect(element.ref).toBe(null);
    const expectation = {foo: '56'};
    Object.freeze(expectation);
    expect(element.props).toEqual(expectation);
  });

  it('merges JSX children onto the children prop', () => {
    const a = 1;
    const element = <Component children="text">{a}</Component>;
    expect(element.props.children).toBe(a);
  });

  it('does not override children if no JSX children are provided', () => {
    const element = <Component children="text" />;
    expect(element.props.children).toBe('text');
  });

  it('overrides children if null is provided as a JSX child', () => {
    const element = <Component children="text">{null}</Component>;
    expect(element.props.children).toBe(null);
  });

  it('overrides children if undefined is provided as an argument', () => {
    const element = <Component children="text">{undefined}</Component>;
    expect(element.props.children).toBe(undefined);

    const element2 = React.cloneElement(
      <Component children="text" />,
      {},
      undefined,
    );
    expect(element2.props.children).toBe(undefined);
  });

  it('merges JSX children onto the children prop in an array', () => {
    const a = 1;
    const b = 2;
    const c = 3;
    const element = (
      <Component>
        {a}
        {b}
        {c}
      </Component>
    );
    expect(element.props.children).toEqual([1, 2, 3]);
  });

  it('allows static methods to be called using the type property', () => {
    class StaticMethodComponent {
      static someStaticMethod() {
        return 'someReturnValue';
      }
      render() {
        return <div />;
      }
    }

    const element = <StaticMethodComponent />;
    expect(element.type.someStaticMethod()).toBe('someReturnValue');
  });

  it('identifies valid elements', () => {
    expect(React.isValidElement(<div />)).toEqual(true);
    expect(React.isValidElement(<Component />)).toEqual(true);

    expect(React.isValidElement(null)).toEqual(false);
    expect(React.isValidElement(true)).toEqual(false);
    expect(React.isValidElement({})).toEqual(false);
    expect(React.isValidElement('string')).toEqual(false);
    expect(React.isValidElement(Component)).toEqual(false);
    expect(React.isValidElement({type: 'div', props: {}})).toEqual(false);
  });

  it('is indistinguishable from a plain object', () => {
    const element = <div className="foo" />;
    const object = {};
    expect(element.constructor).toBe(object.constructor);
  });

  it('should use default prop value when removing a prop', async () => {
    Component.defaultProps = {fruit: 'persimmon'};

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<Component fruit="mango" ref={ref => (instance = ref)} />);
    });
    expect(instance.props.fruit).toBe('mango');

    await act(() => {
      root.render(<Component ref={ref => (instance = ref)} />);
    });
    expect(instance.props.fruit).toBe('persimmon');
  });

  it('should normalize props with default values', async () => {
    class NormalizingComponent extends React.Component {
      render() {
        return <span>{this.props.prop}</span>;
      }
    }
    NormalizingComponent.defaultProps = {prop: 'testKey'};

    let container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(
        <NormalizingComponent ref={current => (instance = current)} />,
      );
    });

    expect(instance.props.prop).toBe('testKey');

    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    let inst2;
    await act(() => {
      root.render(
        <NormalizingComponent prop={null} ref={current => (inst2 = current)} />,
      );
    });

    expect(inst2.props.prop).toBe(null);
  });
});

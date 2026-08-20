/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

// These tests are based on ReactJSXElement-test,
// ReactJSXElementValidator-test, ReactComponent-test,
// and ReactElementJSX-test.

jest.mock('react/jsx-runtime', () => require('./jsx-runtime'), {virtual: true});
jest.mock('react/jsx-dev-runtime', () => require('./jsx-dev-runtime'), {
  virtual: true,
});

let React = require('react');
let ReactDOM = require('react-dom');
let ReactTestUtils = {
  renderIntoDocument(el) {
    const container = document.createElement('div');
    return ReactDOM.render(el, container);
  },
};
let PropTypes = require('prop-types');
let Component = class Component extends React.Component {
  render() {
    return <div />;
  }
};
let RequiredPropComponent = class extends React.Component {
  render() {
    return <span>{this.props.prop}</span>;
  }
};
RequiredPropComponent.displayName = 'RequiredPropComponent';
RequiredPropComponent.propTypes = {prop: PropTypes.string.isRequired};

it('works', () => {
  const container = document.createElement('div');
  ReactDOM.render(<h1>hello</h1>, container);
  expect(container.textContent).toBe('hello');
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
  if (process.env.NODE_ENV === 'development') {
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

it('extracts key and ref from the rest of the props', () => {
  const element = <Component key="12" ref="34" foo="56" />;
  expect(element.type).toBe(Component);
  expect(element.key).toBe('12');
  expect(element.ref).toBe('34');
  const expectation = {foo: '56'};
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
    undefined
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

it('should use default prop value when removing a prop', () => {
  Component.defaultProps = {fruit: 'persimmon'};

  const container = document.createElement('div');
  const instance = ReactDOM.render(<Component fruit="mango" />, container);
  expect(instance.props.fruit).toBe('mango');

  ReactDOM.render(<Component />, container);
  expect(instance.props.fruit).toBe('persimmon');
});

it('should normalize props with default values', () => {
  class NormalizingComponent extends React.Component {
    render() {
      return <span>{this.props.prop}</span>;
    }
  }
  NormalizingComponent.defaultProps = {prop: 'testKey'};

  const container = document.createElement('div');
  const instance = ReactDOM.render(<NormalizingComponent />, container);
  expect(instance.props.prop).toBe('testKey');

  const inst2 = ReactDOM.render(
    <NormalizingComponent prop={null} />,
    container
  );
  expect(inst2.props.prop).toBe(null);
});

it('warns for keys for arrays of elements in children position', () => {
  expect(() =>
    ReactTestUtils.renderIntoDocument(
      <Component>{[<Component />, <Component />]}</Component>
    )
  ).toErrorDev('Each child in a list should have a unique "key" prop.');
});

it('warns for keys for arrays of elements with owner info', () => {
  class InnerComponent extends React.Component {
    render() {
      return <Component>{this.props.childSet}</Component>;
    }
  }

  class ComponentWrapper extends React.Component {
    render() {
      return <InnerComponent childSet={[<Component />, <Component />]} />;
    }
  }

  expect(() =>
    ReactTestUtils.renderIntoDocument(<ComponentWrapper />)
  ).toErrorDev(
    'Each child in a list should have a unique "key" prop.' +
      '\n\nCheck the render method of `InnerComponent`. ' +
      'It was passed a child from ComponentWrapper. '
  );
});

it('does not warn for arrays of elements with keys', () => {
  ReactTestUtils.renderIntoDocument(
    <Component>{[<Component key="#1" />, <Component key="#2" />]}</Component>
  );
});

it('does not warn for iterable elements with keys', () => {
  const iterable = {
    '@@iterator': function () {
      let i = 0;
      return {
        next: function () {
          const done = ++i > 2;
          return {
            value: done ? undefined : <Component key={'#' + i} />,
            done: done,
          };
        },
      };
    },
  };

  ReactTestUtils.renderIntoDocument(<Component>{iterable}</Component>);
});

it('does not warn for numeric keys in entry iterable as a child', () => {
  const iterable = {
    '@@iterator': function () {
      let i = 0;
      return {
        next: function () {
          const done = ++i > 2;
          return {value: done ? undefined : [i, <Component />], done: done};
        },
      };
    },
  };
  iterable.entries = iterable['@@iterator'];

  ReactTestUtils.renderIntoDocument(<Component>{iterable}</Component>);
});

it('does not warn when the element is directly as children', () => {
  ReactTestUtils.renderIntoDocument(
    <Component>
      <Component />
      <Component />
    </Component>
  );
});

it('does not warn when the child array contains non-elements', () => {
  void (<Component>{[{}, {}]}</Component>);
});

it('should give context for PropType errors in nested components.', () => {
  // In this test, we're making sure that if a proptype error is found in a
  // component, we give a small hint as to which parent instantiated that
  // component as per warnings about key usage in ReactElementValidator.
  function MyComp({color}) {
    return <div>My color is {color}</div>;
  }
  MyComp.propTypes = {
    color: PropTypes.string,
  };
  class ParentComp extends React.Component {
    render() {
      return <MyComp color={123} />;
    }
  }
  expect(() => ReactTestUtils.renderIntoDocument(<ParentComp />)).toErrorDev(
    'Warning: Failed prop type: ' +
      'Invalid prop `color` of type `number` supplied to `MyComp`, ' +
      'expected `string`.\n' +
      '    in MyComp (at **)\n' +
      '    in ParentComp (at **)'
  );
});

it('gives a helpful error when passing null, undefined, or boolean', () => {
  const Undefined = undefined;
  const Null = null;
  const True = true;
  const Div = 'div';
  expect(() => void (<Undefined />)).toErrorDev(
    'Warning: React.jsx: type is invalid -- expected a string ' +
      '(for built-in components) or a class/function (for composite ' +
      'components) but got: undefined. You likely forgot to export your ' +
      "component from the file it's defined in, or you might have mixed up " +
      'default and named imports.' +
      (process.env.BABEL_ENV === 'development'
        ? '\n\nCheck your code at **.'
        : ''),
    {withoutStack: true}
  );
  expect(() => void (<Null />)).toErrorDev(
    'Warning: React.jsx: type is invalid -- expected a string ' +
      '(for built-in components) or a class/function (for composite ' +
      'components) but got: null.' +
      (process.env.BABEL_ENV === 'development'
        ? '\n\nCheck your code at **.'
        : ''),
    {withoutStack: true}
  );
  expect(() => void (<True />)).toErrorDev(
    'Warning: React.jsx: type is invalid -- expected a string ' +
      '(for built-in components) or a class/function (for composite ' +
      'components) but got: boolean.' +
      (process.env.BABEL_ENV === 'development'
        ? '\n\nCheck your code at **.'
        : ''),
    {withoutStack: true}
  );
  // No error expected
  void (<Div />);
});

it('should check default prop values', () => {
  RequiredPropComponent.defaultProps = {prop: null};

  expect(() =>
    ReactTestUtils.renderIntoDocument(<RequiredPropComponent />)
  ).toErrorDev(
    'Warning: Failed prop type: The prop `prop` is marked as required in ' +
      '`RequiredPropComponent`, but its value is `null`.\n' +
      '    in RequiredPropComponent (at **)'
  );
});

it('should warn on invalid prop types', () => {
  // Since there is no prevalidation step for ES6 classes, there is no hook
  // for us to issue a warning earlier than element creation when the error
  // actually occurs. Since this step is skipped in production, we should just
  // warn instead of throwing for this case.
  class NullPropTypeComponent extends React.Component {
    render() {
      return <span>{this.props.prop}</span>;
    }
  }
  NullPropTypeComponent.propTypes = {
    prop: null,
  };
  expect(() =>
    ReactTestUtils.renderIntoDocument(<NullPropTypeComponent />)
  ).toErrorDev(
    'NullPropTypeComponent: prop type `prop` is invalid; it must be a ' +
      'function, usually from the `prop-types` package,'
  );
});

xit('should warn on invalid context types', () => {
  class NullContextTypeComponent extends React.Component {
    render() {
      return <span>{this.props.prop}</span>;
    }
  }
  NullContextTypeComponent.contextTypes = {
    prop: null,
  };
  expect(() =>
    ReactTestUtils.renderIntoDocument(<NullContextTypeComponent />)
  ).toErrorDev(
    'NullContextTypeComponent: type `prop` is invalid; it must ' +
      'be a function, usually from the `prop-types` package,'
  );
});

it('should warn if getDefaultProps is specified on the class', () => {
  class GetDefaultPropsComponent extends React.Component {
    render() {
      return <span>{this.props.prop}</span>;
    }
  }
  GetDefaultPropsComponent.getDefaultProps = () => ({
    prop: 'foo',
  });
  expect(() =>
    ReactTestUtils.renderIntoDocument(<GetDefaultPropsComponent />)
  ).toErrorDev(
    'getDefaultProps is only used on classic React.createClass definitions.' +
      ' Use a static property named `defaultProps` instead.',
    {withoutStack: true}
  );
});

it('should warn if component declares PropTypes instead of propTypes', () => {
  class MisspelledPropTypesComponent extends React.Component {
    render() {
      return <span>{this.props.prop}</span>;
    }
  }
  MisspelledPropTypesComponent.PropTypes = {
    prop: PropTypes.string,
  };
  expect(() =>
    ReactTestUtils.renderIntoDocument(
      <MisspelledPropTypesComponent prop="hi" />
    )
  ).toErrorDev(
    'Warning: Component MisspelledPropTypesComponent declared `PropTypes` ' +
      'instead of `propTypes`. Did you misspell the property assignment?',
    {withoutStack: true}
  );
});

// Not supported.
xit('warns for fragments with illegal attributes', () => {
  class Foo extends React.Component {
    render() {
      return <React.Fragment a={1}>hello</React.Fragment>;
    }
  }

  expect(() => ReactTestUtils.renderIntoDocument(<Foo />)).toErrorDev(
    'Invalid prop `a` supplied to `React.Fragment`. React.Fragment ' +
      'can only have `key` and `children` props.'
  );
});

// Not supported.
xit('warns for fragments with refs', () => {
  class Foo extends React.Component {
    render() {
      return (
        <React.Fragment
          ref={bar => {
            this.foo = bar;
          }}>
          hello
        </React.Fragment>
      );
    }
  }

  expect(() => ReactTestUtils.renderIntoDocument(<Foo />)).toErrorDev(
    'Invalid attribute `ref` supplied to `React.Fragment`.'
  );
});

// Not supported.
xit('does not warn for fragments of multiple elements without keys', () => {
  ReactTestUtils.renderIntoDocument(
    <>
      <span>1</span>
      <span>2</span>
    </>
  );
});

// Not supported.
xit('warns for fragments of multiple elements with same key', () => {
  expect(() =>
    ReactTestUtils.renderIntoDocument(
      <>
        <span key="a">1</span>
        <span key="a">2</span>
        <span key="b">3</span>
      </>
    )
  ).toErrorDev('Encountered two children with the same key, `a`.', {
    withoutStack: true,
  });
});

// Not supported.
xit('does not call lazy initializers eagerly', () => {
  let didCall = false;
  const Lazy = React.lazy(() => {
    didCall = true;
    return {then() {}};
  });
  <Lazy />;
  expect(didCall).toBe(false);
});

it('supports classic refs', () => {
  class Foo extends React.Component {
    render() {
      return <div className="foo" ref="inner" />;
    }
  }
  const container = document.createElement('div');
  const instance = ReactDOM.render(<Foo />, container);
  expect(instance.refs.inner.className).toBe('foo');
});

it('should support refs on owned components', () => {
  const innerObj = {};
  const outerObj = {};

  class Wrapper extends React.Component {
    getObject = () => {
      return this.props.object;
    };

    render() {
      return <div>{this.props.children}</div>;
    }
  }

  class Component extends React.Component {
    render() {
      const inner = <Wrapper object={innerObj} ref="inner" />;
      const outer = (
        <Wrapper object={outerObj} ref="outer">
          {inner}
        </Wrapper>
      );
      return outer;
    }

    componentDidMount() {
      expect(this.refs.inner.getObject()).toEqual(innerObj);
      expect(this.refs.outer.getObject()).toEqual(outerObj);
    }
  }

  ReactTestUtils.renderIntoDocument(<Component />);
});

it('should support callback-style refs', () => {
  const innerObj = {};
  const outerObj = {};

  class Wrapper extends React.Component {
    getObject = () => {
      return this.props.object;
    };

    render() {
      return <div>{this.props.children}</div>;
    }
  }

  let mounted = false;

  class Component extends React.Component {
    render() {
      const inner = (
        <Wrapper object={innerObj} ref={c => (this.innerRef = c)} />
      );
      const outer = (
        <Wrapper object={outerObj} ref={c => (this.outerRef = c)}>
          {inner}
        </Wrapper>
      );
      return outer;
    }

    componentDidMount() {
      expect(this.innerRef.getObject()).toEqual(innerObj);
      expect(this.outerRef.getObject()).toEqual(outerObj);
      mounted = true;
    }
  }

  ReactTestUtils.renderIntoDocument(<Component />);
  expect(mounted).toBe(true);
});

// Not supported.
xit('should support object-style refs', () => {
  const innerObj = {};
  const outerObj = {};

  class Wrapper extends React.Component {
    getObject = () => {
      return this.props.object;
    };

    render() {
      return <div>{this.props.children}</div>;
    }
  }

  let mounted = false;

  class Component extends React.Component {
    constructor() {
      super();
      this.innerRef = React.createRef();
      this.outerRef = React.createRef();
    }
    render() {
      const inner = <Wrapper object={innerObj} ref={this.innerRef} />;
      const outer = (
        <Wrapper object={outerObj} ref={this.outerRef}>
          {inner}
        </Wrapper>
      );
      return outer;
    }

    componentDidMount() {
      expect(this.innerRef.current.getObject()).toEqual(innerObj);
      expect(this.outerRef.current.getObject()).toEqual(outerObj);
      mounted = true;
    }
  }

  ReactTestUtils.renderIntoDocument(<Component />);
  expect(mounted).toBe(true);
});

it('should support new-style refs with mixed-up owners', () => {
  class Wrapper extends React.Component {
    getTitle = () => {
      return this.props.title;
    };

    render() {
      return this.props.getContent();
    }
  }

  let mounted = false;

  class Component extends React.Component {
    getInner = () => {
      // (With old-style refs, it's impossible to get a ref to this div
      // because Wrapper is the current owner when this function is called.)
      return <div className="inner" ref={c => (this.innerRef = c)} />;
    };

    render() {
      return (
        <Wrapper
          title="wrapper"
          ref={c => (this.wrapperRef = c)}
          getContent={this.getInner}
        />
      );
    }

    componentDidMount() {
      // Check .props.title to make sure we got the right elements back
      expect(this.wrapperRef.getTitle()).toBe('wrapper');
      expect(this.innerRef.className).toBe('inner');
      mounted = true;
    }
  }

  ReactTestUtils.renderIntoDocument(<Component />);
  expect(mounted).toBe(true);
});

it('should warn when `key` is being accessed on composite element', () => {
  const container = document.createElement('div');
  class Child extends React.Component {
    render() {
      return <div> {this.props.key} </div>;
    }
  }
  class Parent extends React.Component {
    render() {
      return (
        <div>
          <Child key="0" />
          <Child key="1" />
          <Child key="2" />
        </div>
      );
    }
  }
  expect(() => ReactDOM.render(<Parent />, container)).toErrorDev(
    'Child: `key` is not a prop. Trying to access it will result ' +
      'in `undefined` being returned. If you need to access the same ' +
      'value within the child component, you should pass it as a different ' +
      'prop. (https://reactjs.org/link/special-props)',
    {withoutStack: true}
  );
});

it('should warn when `ref` is being accessed', () => {
  const container = document.createElement('div');
  class Child extends React.Component {
    render() {
      return <div> {this.props.ref} </div>;
    }
  }
  class Parent extends React.Component {
    render() {
      return (
        <div>
          <Child ref="childElement" />
        </div>
      );
    }
  }
  expect(() => ReactDOM.render(<Parent />, container)).toErrorDev(
    'Child: `ref` is not a prop. Trying to access it will result ' +
      'in `undefined` being returned. If you need to access the same ' +
      'value within the child component, you should pass it as a different ' +
      'prop. (https://reactjs.org/link/special-props)',
    {withoutStack: true}
  );
});

// Note: no warning before 16.
it('should NOT warn when owner and self are different for string refs', () => {
  class ClassWithRenderProp extends React.Component {
    render() {
      return this.props.children();
    }
  }

  class ClassParent extends React.Component {
    render() {
      return (
        <ClassWithRenderProp>{() => <div ref="myRef" />}</ClassWithRenderProp>
      );
    }
  }

  const container = document.createElement('div');
  ReactDOM.render(<ClassParent />, container);
});

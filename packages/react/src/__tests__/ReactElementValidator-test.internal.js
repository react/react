/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// NOTE: We're explicitly not using JSX in this file. This is intended to test
// classic React.createElement without JSX.
// TODO: ^ the above note is a bit stale because there are tests in this file
// that do use JSX syntax. We should port them to React.createElement, and also
// confirm there's a corresponding test that uses JSX syntax.

let React;
let ReactDOMClient;
let act;
let assertConsoleErrorDev;

describe('ReactElementValidator', () => {
  let ComponentClass;

  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
    ComponentClass = class extends React.Component {
      render() {
        return React.createElement('div', null, this.props.children);
      }
    };
  });

  it('warns for keys for arrays of elements in rest args', async () => {
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() =>
      root.render(
        React.createElement(ComponentClass, null, [
          React.createElement(ComponentClass),
          React.createElement(ComponentClass),
        ]),
      ),
    );
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the render method of `ComponentClass`. See https://react.dev/link/warning-keys for more information.\n' +
        '    in ComponentClass (at **)',
    ]);
  });

  it('warns for keys for arrays of elements with owner info', async () => {
    class InnerClass extends React.Component {
      render() {
        return React.createElement(ComponentClass, null, this.props.childSet);
      }
    }

    class ComponentWrapper extends React.Component {
      render() {
        return React.createElement(InnerClass, {
          childSet: [
            React.createElement(ComponentClass),
            React.createElement(ComponentClass),
          ],
        });
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(React.createElement(ComponentWrapper)));
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.' +
        '\n\nCheck the render method of `ComponentClass`. ' +
        'It was passed a child from ComponentWrapper. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in ComponentWrapper (at **)',
    ]);
  });

  it('warns for keys for arrays with no owner or parent info', async () => {
    function Anonymous({children}) {
      return <div>{children}</div>;
    }
    Object.defineProperty(Anonymous, 'name', {value: undefined});

    const divs = [<div />, <div />];

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(<Anonymous>{divs}</Anonymous>));
    assertConsoleErrorDev([
      // For owner stacks the parent being validated is the div.
      'Each child in a list should have a unique ' +
        '"key" prop.' +
        '\n\nCheck the top-level render call using <div>. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)',
    ]);
  });

  it('warns for keys for arrays of elements with no owner info', async () => {
    const divs = [<div />, <div />];

    const root = ReactDOMClient.createRoot(document.createElement('div'));

    await act(() => root.render(<div>{divs}</div>));
    assertConsoleErrorDev([
      'Each child in a list should have a unique ' +
        '"key" prop.' +
        '\n\nCheck the top-level render call using <div>. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)',
    ]);
  });

  it('warns for keys with component stack info', async () => {
    function Component() {
      return <div>{[<div />, <div />]}</div>;
    }

    function Parent(props) {
      return React.cloneElement(props.child);
    }

    function GrandParent() {
      return <Parent child={<Component />} />;
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(<GrandParent />));
    assertConsoleErrorDev([
      'Each child in a list should have a unique ' +
        '"key" prop.\n\nCheck the render method of `Component`. See ' +
        'https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)\n' +
        '    in Component (at **)\n' +
        '    in GrandParent (at **)',
    ]);
  });

  it('does not warn for keys when passing children down', async () => {
    function Wrapper(props) {
      return (
        <div>
          {props.children}
          <footer />
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() =>
      root.render(
        <Wrapper>
          <span />
          <span />
        </Wrapper>,
      ),
    );
  });

  it('warns for keys for iterables of elements in rest args', async () => {
    const iterable = {
      '@@iterator': function () {
        let i = 0;
        return {
          next: function () {
            const done = ++i > 2;
            return {
              value: done ? undefined : React.createElement(ComponentClass),
              done: done,
            };
          },
        };
      },
    };

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() =>
      root.render(React.createElement(ComponentClass, null, iterable)),
    );
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the render method of `ComponentClass`. It was passed a child from div. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in ComponentClass (at **)',
    ]);
  });

  it('does not warns for arrays of elements with keys', () => {
    React.createElement(ComponentClass, null, [
      React.createElement(ComponentClass, {key: '#1'}),
      React.createElement(ComponentClass, {key: '#2'}),
    ]);
  });

  it('does not warns for iterable elements with keys', () => {
    const iterable = {
      '@@iterator': function () {
        let i = 0;
        return {
          next: function () {
            const done = ++i > 2;
            return {
              value: done
                ? undefined
                : React.createElement(ComponentClass, {key: '#' + i}),
              done: done,
            };
          },
        };
      },
    };

    React.createElement(ComponentClass, null, iterable);
  });

  it('does not warn when the element is directly in rest args', () => {
    React.createElement(
      ComponentClass,
      null,
      React.createElement(ComponentClass),
      React.createElement(ComponentClass),
    );
  });

  it('does not warn when the array contains a non-element', () => {
    React.createElement(ComponentClass, null, [{}, {}]);
  });

  it('should give context for errors in nested components.', async () => {
    function MyComp() {
      return [React.createElement('div')];
    }
    function ParentComp() {
      return React.createElement(MyComp);
    }
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(React.createElement(ParentComp)));
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.' +
        '\n\nCheck the render method of `ParentComp`. It was passed a child from MyComp. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)\n' +
        '    in MyComp (at **)\n' +
        '    in ParentComp (at **)',
    ]);
  });

  it('gives a helpful error when passing invalid types', async () => {
    function Foo() {}
    const errors = [];
    const root = ReactDOMClient.createRoot(document.createElement('div'), {
      onUncaughtError(error) {
        errors.push(error.message);
      },
    });
    const cases = [
      [
        () => React.createElement(undefined),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: undefined. You likely forgot to export your ' +
          "component from the file it's defined in, or you might have mixed up " +
          'default and named imports.',
      ],
      [
        () => React.createElement(null),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: null.',
      ],
      [
        () => React.createElement(true),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: boolean.',
      ],
      [
        () => React.createElement({x: 17}),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: object.',
      ],
      [
        () => React.createElement({}),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: object. You likely forgot to export your ' +
          "component from the file it's defined in, or you might have mixed up " +
          'default and named imports.',
      ],
      [
        () => React.createElement(React.createElement('div')),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: <div />. Did you accidentally export a JSX literal ' +
          'instead of a component?',
      ],
      [
        () => React.createElement(React.createElement(Foo)),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: <Foo />. Did you accidentally export a JSX literal ' +
          'instead of a component?',
      ],
      [
        () =>
          React.createElement(
            React.createElement(React.createContext().Consumer),
          ),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: <Context.Consumer />. Did you accidentally ' +
          'export a JSX literal instead of a component?',
      ],
      [
        () => React.createElement({$$typeof: 'non-react-thing'}),
        'React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: object.',
      ],
    ];
    for (let i = 0; i < cases.length; i++) {
      await act(async () => root.render(cases[i][0]()));
    }

    expect(errors).toEqual(
      __DEV__
        ? [
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: undefined. You likely forgot to export your ' +
              "component from the file it's defined in, or you might have mixed up " +
              'default and named imports.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: null.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: boolean.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object. You likely forgot to export your ' +
              "component from the file it's defined in, or you might have mixed up " +
              'default and named imports.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: <div />. Did you accidentally export a JSX literal ' +
              'instead of a component?',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: <Foo />. Did you accidentally export a JSX literal ' +
              'instead of a component?',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: <Context.Consumer />. Did you accidentally ' +
              'export a JSX literal instead of a component?',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
          ]
        : [
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: undefined.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: null.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: boolean.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
            'Element type is invalid: expected a string ' +
              '(for built-in components) or a class/function (for composite ' +
              'components) but got: object.',
          ],
    );

    // Should not log any additional warnings
    React.createElement('div');
  });

  it('includes the owner name when passing null, undefined, boolean, or number', async () => {
    function ParentComp() {
      return React.createElement(null);
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => root.render(React.createElement(ParentComp)));
    }).rejects.toThrowError(
      'Element type is invalid: expected a string (for built-in components) ' +
        'or a class/function (for composite components) but got: null.' +
        (__DEV__ ? '\n\nCheck the render method of `ParentComp`.' : ''),
    );
  });

  it('warns for fragments with illegal attributes', async () => {
    class Foo extends React.Component {
      render() {
        return React.createElement(React.Fragment, {a: 1}, '123');
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(React.createElement(Foo)));
    assertConsoleErrorDev([
      gate('enableFragmentRefs')
        ? 'Invalid prop `a` supplied to `React.Fragment`. React.Fragment ' +
          'can only have `key`, `ref`, and `children` props.\n' +
          '    in Foo (at **)'
        : 'Invalid prop `a` supplied to `React.Fragment`. React.Fragment ' +
          'can only have `key` and `children` props.\n' +
          '    in Foo (at **)',
    ]);
  });

  it('does not warn when using DOM node as children', async () => {
    class DOMContainer extends React.Component {
      ref;
      render() {
        return <div ref={n => (this.ref = n)} />;
      }
      componentDidMount() {
        this.ref.appendChild(this.props.children);
      }
    }

    const node = document.createElement('div');
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      // This shouldn't cause a stack overflow or any other problems (#3883)
      root.render(<DOMContainer>{node}</DOMContainer>);
    });
  });

  it('should not enumerate enumerable numbers (#4776)', () => {
    /*eslint-disable no-extend-native */
    Number.prototype['@@iterator'] = function () {
      throw new Error('number iterator called');
    };
    /*eslint-enable no-extend-native */

    try {
      void (
        <div>
          {5}
          {12}
          {13}
        </div>
      );
    } finally {
      delete Number.prototype['@@iterator'];
    }
  });

  it('does not blow up with inlined children', () => {
    // We don't suggest this since it silences all sorts of warnings, but we
    // shouldn't blow up either.

    const child = {
      $$typeof: (<div />).$$typeof,
      type: 'span',
      key: null,
      ref: null,
      props: {},
      _owner: null,
    };

    void (<div>{[child]}</div>);
  });

  it('does not blow up on key warning with undefined type', () => {
    const Foo = undefined;
    void (<Foo>{[<div />]}</Foo>);
  });

  it('does not call lazy initializers eagerly', () => {
    let didCall = false;
    const Lazy = React.lazy(() => {
      didCall = true;
      return {then() {}};
    });
    React.createElement(Lazy);
    expect(didCall).toBe(false);
  });

  it('__self and __source are treated as normal props', async () => {
    // These used to be reserved props because the classic React.createElement
    // runtime passed this data as props, whereas the jsxDEV() runtime passes
    // them as separate arguments.
    function Child({__self, __source}) {
      return __self + __source;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    // NOTE: The Babel transform treats the presence of these props as a syntax
    // error but theoretically it doesn't have to. Using spread here to
    // circumvent the syntax error and demonstrate that the runtime
    // doesn't care.
    const props = {
      __self: 'Hello ',
      __source: 'world!',
    };
    await act(() => root.render(<Child {...props} />));
    expect(container.textContent).toBe('Hello world!');
  });
});

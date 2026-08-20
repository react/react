/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// TODO: All these warnings should become static errors using Flow instead
// of dynamic errors when using JSX with Flow.
let act;
let React;
let ReactDOMClient;
let assertConsoleErrorDev;

describe('ReactJSXElementValidator', () => {
  let Component;
  let RequiredPropComponent;

  beforeEach(() => {
    jest.resetModules();

    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
    React = require('react');
    ReactDOMClient = require('react-dom/client');

    Component = class extends React.Component {
      render() {
        return <div>{this.props.children}</div>;
      }
    };

    RequiredPropComponent = class extends React.Component {
      render() {
        return <span>{this.props.prop}</span>;
      }
    };
    RequiredPropComponent.displayName = 'RequiredPropComponent';
  });

  it('warns for keys for arrays of elements in children position', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component>{[<Component />, <Component />]}</Component>);
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the render method of `Component`. See https://react.dev/link/warning-keys for more information.\n' +
        '    in Component (at **)',
    ]);
  });

  it('warns for keys for arrays of elements with owner info', async () => {
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

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<ComponentWrapper />);
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.' +
        '\n\nCheck the render method of `Component`. ' +
        'It was passed a child from ComponentWrapper. See https://react.dev/link/warning-keys for more information.\n' +
        '    in ComponentWrapper (at **)',
    ]);
  });

  it('warns for keys for iterables of elements in rest args', async () => {
    const iterable = {
      '@@iterator': function () {
        let i = 0;
        return {
          next: function () {
            const done = ++i > 2;
            return {value: done ? undefined : <Component />, done: done};
          },
        };
      },
    };

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component>{iterable}</Component>);
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the render method of `Component`. It was passed a child from div. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in Component (at **)',
    ]);
  });

  it('does not warn for arrays of elements with keys', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <Component>
          {[<Component key="#1" />, <Component key="#2" />]}
        </Component>,
      );
    });
  });

  it('does not warn for iterable elements with keys', async () => {
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

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component>{iterable}</Component>);
    });
  });

  it('does not warn for numeric keys in entry iterable as a child', async () => {
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

    // This only applies to the warning during construction.
    // We do warn if it's actually rendered.
    <Component>{iterable}</Component>;
  });

  it('does not warn when the element is directly as children', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <Component>
          <Component />
          <Component />
        </Component>,
      );
    });
  });

  it('does not warn when the child array contains non-elements', () => {
    void (<Component>{[{}, {}]}</Component>);
  });

  it('should give context for errors in nested components.', async () => {
    class MyComp extends React.Component {
      render() {
        return [<div />];
      }
    }
    class ParentComp extends React.Component {
      render() {
        return <MyComp />;
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ParentComp />);
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.' +
        '\n\nCheck the render method of `ParentComp`. It was passed a child from MyComp. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)\n' +
        '    in MyComp (at **)\n' +
        '    in ParentComp (at **)',
    ]);
  });

  it('warns for fragments with illegal attributes', async () => {
    class Foo extends React.Component {
      render() {
        return <React.Fragment a={1}>hello</React.Fragment>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
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

  it('warns for fragments with refs', async () => {
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

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    assertConsoleErrorDev(
      gate('enableFragmentRefs')
        ? []
        : [
            'Invalid prop `ref` supplied to `React.Fragment`.' +
              ' React.Fragment can only have `key` and `children` props.\n' +
              '    in Foo (at **)',
          ],
    );
  });

  it('does not warn for fragments of multiple elements without keys', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <>
          <span>1</span>
          <span>2</span>
        </>,
      );
    });
  });

  it('warns for fragments of multiple elements with same key', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <>
          <span key="a">1</span>
          <span key="a">2</span>
          <span key="b">3</span>
        </>,
      );
    });
    assertConsoleErrorDev([
      'Encountered two children with the same key, `a`. ' +
        'Keys should be unique so that components maintain their identity across updates. ' +
        'Non-unique keys may cause children to be duplicated and/or omitted — ' +
        'the behavior is unsupported and could change in a future version.\n' +
        '    in span (at **)',
    ]);
  });

  it('does not call lazy initializers eagerly', () => {
    let didCall = false;
    const Lazy = React.lazy(() => {
      didCall = true;
      return {then() {}};
    });
    <Lazy />;
    expect(didCall).toBe(false);
  });
});

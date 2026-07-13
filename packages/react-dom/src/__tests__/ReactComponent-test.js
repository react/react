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
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let act;
let assertConsoleErrorDev;

describe('ReactComponent', () => {
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

  // @gate !disableLegacyMode
  it('should throw on invalid render targets in legacy roots', () => {
    const container = document.createElement('div');
    // jQuery objects are basically arrays; people often pass them in by mistake
    expect(function () {
      ReactDOM.render(<div />, [container]);
    }).toThrowError(/Target container is not a DOM element./);

    expect(function () {
      ReactDOM.render(<div />, null);
    }).toThrowError(/Target container is not a DOM element./);
  });

  it('should throw (in dev) when children are mutated during render', async () => {
    function Wrapper(props) {
      props.children[1] = <p key={1} />; // Mutation is illegal
      return <div>{props.children}</div>;
    }
    if (__DEV__) {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <Wrapper>
              <span key={0} />
              <span key={1} />
              <span key={2} />
            </Wrapper>,
          );
        }),
      ).rejects.toThrowError(/Cannot assign to read only property.*/);
    } else {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <Wrapper>
            <span key={0} />
            <span key={1} />
            <span key={2} />
          </Wrapper>,
        );
      });
    }
  });

  it('should throw (in dev) when children are mutated during update', async () => {
    class Wrapper extends React.Component {
      componentDidMount() {
        this.props.children[1] = <p key={1} />; // Mutation is illegal
        this.forceUpdate();
      }

      render() {
        return <div>{this.props.children}</div>;
      }
    }

    if (__DEV__) {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await expect(
        act(() => {
          root.render(
            <Wrapper>
              <span key={0} />
              <span key={1} />
              <span key={2} />
            </Wrapper>,
          );
        }),
      ).rejects.toThrowError(/Cannot assign to read only property.*/);
    } else {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <Wrapper>
            <span key={0} />
            <span key={1} />
            <span key={2} />
          </Wrapper>,
        );
      });
    }
  });

  it('should not have string refs on unmounted components', async () => {
    class Parent extends React.Component {
      render() {
        return (
          <Child>
            <div ref="test" />
          </Child>
        );
      }

      componentDidMount() {
        expect(this.refs && this.refs.test).toEqual(undefined);
      }
    }

    class Child extends React.Component {
      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent child={<span />} />);
    });
  });

  it('should support callback-style refs', async () => {
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

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    expect(mounted).toBe(true);
  });

  it('should support object-style refs', async () => {
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

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    expect(mounted).toBe(true);
  });

  it('should support new-style refs with mixed-up owners', async () => {
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

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component />);
    });

    expect(mounted).toBe(true);
  });

  it('should call refs at the correct time', async () => {
    const log = [];

    class Inner extends React.Component {
      render() {
        log.push(`inner ${this.props.id} render`);
        return <div />;
      }

      componentDidMount() {
        log.push(`inner ${this.props.id} componentDidMount`);
      }

      componentDidUpdate() {
        log.push(`inner ${this.props.id} componentDidUpdate`);
      }

      componentWillUnmount() {
        log.push(`inner ${this.props.id} componentWillUnmount`);
      }
    }

    class Outer extends React.Component {
      render() {
        return (
          <div>
            <Inner
              id={1}
              ref={c => {
                log.push(`ref 1 got ${c ? `instance ${c.props.id}` : 'null'}`);
              }}
            />
            <Inner
              id={2}
              ref={c => {
                log.push(`ref 2 got ${c ? `instance ${c.props.id}` : 'null'}`);
              }}
            />
          </div>
        );
      }

      componentDidMount() {
        log.push('outer componentDidMount');
      }

      componentDidUpdate() {
        log.push('outer componentDidUpdate');
      }

      componentWillUnmount() {
        log.push('outer componentWillUnmount');
      }
    }

    // mount, update, unmount
    const el = document.createElement('div');
    log.push('start mount');
    const root = ReactDOMClient.createRoot(el);
    await act(() => {
      root.render(<Outer />);
    });
    log.push('start update');
    await act(() => {
      root.render(<Outer />);
    });
    log.push('start unmount');
    await act(() => {
      root.unmount();
    });

    expect(log).toEqual([
      'start mount',
      'inner 1 render',
      'inner 2 render',
      'inner 1 componentDidMount',
      'ref 1 got instance 1',
      'inner 2 componentDidMount',
      'ref 2 got instance 2',
      'outer componentDidMount',
      'start update',
      // Previous (equivalent) refs get cleared
      // Fiber renders first, resets refs later
      'inner 1 render',
      'inner 2 render',
      'ref 1 got null',
      'ref 2 got null',
      'inner 1 componentDidUpdate',
      'ref 1 got instance 1',
      'inner 2 componentDidUpdate',
      'ref 2 got instance 2',
      'outer componentDidUpdate',
      'start unmount',
      'outer componentWillUnmount',
      'ref 1 got null',
      'inner 1 componentWillUnmount',
      'ref 2 got null',
      'inner 2 componentWillUnmount',
    ]);
  });

  // @gate !disableLegacyMode
  it('fires the callback after a component is rendered in legacy roots', () => {
    const callback = jest.fn();
    const container = document.createElement('div');
    ReactDOM.render(<div />, container, callback);
    expect(callback).toHaveBeenCalledTimes(1);
    ReactDOM.render(<div className="foo" />, container, callback);
    expect(callback).toHaveBeenCalledTimes(2);
    ReactDOM.render(<span />, container, callback);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('throws usefully when rendering badly-typed elements', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const X = undefined;
    const XElement = <X />;
    await expect(async () => {
      await act(() => {
        root.render(XElement);
      });
    }).rejects.toThrowError(
      'Element type is invalid: expected a string (for built-in components) ' +
        'or a class/function (for composite components) but got: undefined.' +
        (__DEV__
          ? " You likely forgot to export your component from the file it's " +
            'defined in, or you might have mixed up default and named imports.'
          : ''),
    );

    const Y = null;
    const YElement = <Y />;
    await expect(async () => {
      await act(() => {
        root.render(YElement);
      });
    }).rejects.toThrowError(
      'Element type is invalid: expected a string (for built-in components) ' +
        'or a class/function (for composite components) but got: null.',
    );

    const Z = true;
    const ZElement = <Z />;
    await expect(async () => {
      await act(() => {
        root.render(ZElement);
      });
    }).rejects.toThrowError(
      'Element type is invalid: expected a string (for built-in components) ' +
        'or a class/function (for composite components) but got: boolean.',
    );
  });

  it('includes owner name in the error about badly-typed elements', async () => {
    const X = undefined;

    function Indirection(props) {
      return <div>{props.children}</div>;
    }

    function Bar() {
      return (
        <Indirection>
          <X />
        </Indirection>
      );
    }

    function Foo() {
      return <Bar />;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<Foo />);
      });
    }).rejects.toThrowError(
      'Element type is invalid: expected a string (for built-in components) ' +
        'or a class/function (for composite components) but got: undefined.' +
        (__DEV__
          ? " You likely forgot to export your component from the file it's " +
            'defined in, or you might have mixed up default and named imports.' +
            '\n\nCheck the render method of `Bar`.'
          : ''),
    );
  });

  it('throws if a plain object is used as a child', async () => {
    const children = {
      x: <span />,
      y: <span />,
      z: <span />,
    };
    const element = <div>{[children]}</div>;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(element);
      }),
    ).rejects.toThrowError(
      'Objects are not valid as a React child (found: object with keys {x, y, z}). ' +
        'If you meant to render a collection of children, use an array instead.',
    );
  });

  it('throws if a legacy element is used as a child', async () => {
    const inlinedElement = {
      $$typeof: Symbol.for('react.element'),
      type: 'div',
      key: null,
      ref: null,
      props: {},
      _owner: null,
    };
    const element = <div>{[inlinedElement]}</div>;
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(element);
      }),
    ).rejects.toThrowError(
      'A React Element from an older version of React was rendered. ' +
        'This is not supported. It can happen if:\n' +
        '- Multiple copies of the "react" package is used.\n' +
        '- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n' +
        '- A compiler tries to "inline" JSX instead of using the runtime.',
    );
  });

  it('throws if a plain object even if it is in an owner', async () => {
    class Foo extends React.Component {
      render() {
        const children = {
          a: <span />,
          b: <span />,
          c: <span />,
        };
        return <div>{[children]}</div>;
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<Foo />);
      }),
    ).rejects.toThrowError(
      'Objects are not valid as a React child (found: object with keys {a, b, c}).' +
        ' If you meant to render a collection of children, use an array ' +
        'instead.',
    );
  });

  it('throws if a plain object is used as a child when using SSR', async () => {
    const children = {
      x: <span />,
      y: <span />,
      z: <span />,
    };
    const element = <div>{[children]}</div>;
    expect(() => {
      ReactDOMServer.renderToString(element);
    }).toThrowError(
      'Objects are not valid as a React child (found: object with keys {x, y, z}). ' +
        'If you meant to render a collection of children, use ' +
        'an array instead.',
    );
  });

  it('throws if a plain object even if it is in an owner when using SSR', async () => {
    class Foo extends React.Component {
      render() {
        const children = {
          a: <span />,
          b: <span />,
          c: <span />,
        };
        return <div>{[children]}</div>;
      }
    }
    const container = document.createElement('div');
    expect(() => {
      ReactDOMServer.renderToString(<Foo />, container);
    }).toThrowError(
      'Objects are not valid as a React child (found: object with keys {a, b, c}). ' +
        'If you meant to render a collection of children, use ' +
        'an array instead.',
    );
  });

  describe('with new features', () => {
    it('warns on function as a return value from a function', async () => {
      function Foo() {
        return Foo;
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Foo />);
      });
      assertConsoleErrorDev([
        'Functions are not valid as a React child. This may happen if ' +
          'you return Foo instead of <Foo /> from render. ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  <Foo>{Foo}</Foo>\n' +
          '    in Foo (at **)',
      ]);
    });

    it('warns on function as a return value from a class', async () => {
      class Foo extends React.Component {
        render() {
          return Foo;
        }
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<Foo />);
      });
      assertConsoleErrorDev([
        'Functions are not valid as a React child. This may happen if ' +
          'you return Foo instead of <Foo /> from render. ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  <Foo>{Foo}</Foo>\n' +
          '    in Foo (at **)',
      ]);
    });

    it('warns on function as a child to host component', async () => {
      function Foo() {
        return (
          <div>
            <span>{Foo}</span>
          </div>
        );
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Foo />);
      });
      assertConsoleErrorDev([
        'Functions are not valid as a React child. This may happen if ' +
          'you return Foo instead of <Foo /> from render. ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  <span>{Foo}</span>\n' +
          '    in span (at **)\n' +
          '    in Foo (at **)',
      ]);
    });

    it('does not warn for function-as-a-child that gets resolved', async () => {
      function Bar(props) {
        return props.children();
      }
      function Foo() {
        return <Bar>{() => 'Hello'}</Bar>;
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Foo />);
      });

      expect(container.innerHTML).toBe('Hello');
    });

    it('deduplicates function type warnings based on component type', async () => {
      class Foo extends React.PureComponent {
        constructor() {
          super();
          this.state = {type: 'mushrooms'};
        }
        render() {
          return (
            <div>
              {Foo}
              {Foo}
              <span>
                {Foo}
                {Foo}
              </span>
            </div>
          );
        }
      }
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      let component;
      await act(() => {
        root.render(<Foo ref={current => (component = current)} />);
      });
      assertConsoleErrorDev([
        'Functions are not valid as a React child. This may happen if ' +
          'you return Foo instead of <Foo /> from render. ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  <div>{Foo}</div>\n' +
          '    in div (at **)\n' +
          '    in Foo (at **)',
        'Functions are not valid as a React child. This may happen if ' +
          'you return Foo instead of <Foo /> from render. ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  <span>{Foo}</span>\n' +
          '    in span (at **)\n' +
          '    in Foo (at **)',
      ]);
      await act(() => {
        component.setState({type: 'portobello mushrooms'});
      });
    });
  });
});

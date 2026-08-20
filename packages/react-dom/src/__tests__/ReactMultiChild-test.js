/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactMultiChild', () => {
  let React;
  let ReactDOMClient;
  let act;
  let assertConsoleErrorDev;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
  });

  describe('reconciliation', () => {
    it('should update children when possible', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const mockMount = jest.fn();
      const mockUpdate = jest.fn();
      const mockUnmount = jest.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentDidUpdate = mockUpdate;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUpdate).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(
          <div>
            <MockComponent />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(
          <div>
            <MockComponent />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);
    });

    it('should replace children with different constructors', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const mockMount = jest.fn();
      const mockUnmount = jest.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(
          <div>
            <MockComponent />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(
          <div>
            <span />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(1);
    });

    it('should NOT replace children with different owners', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const mockMount = jest.fn();
      const mockUnmount = jest.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      class WrapperComponent extends React.Component {
        render() {
          return this.props.children || <MockComponent />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(<WrapperComponent />);
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(
          <WrapperComponent>
            <MockComponent />
          </WrapperComponent>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);
    });

    it('should replace children with different keys', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      const mockMount = jest.fn();
      const mockUnmount = jest.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(
          <div>
            <MockComponent key="A" />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.render(
          <div>
            <MockComponent key="B" />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(2);
      expect(mockUnmount).toHaveBeenCalledTimes(1);
    });

    it('should warn for duplicated array keys with component stack info', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      class WrapperComponent extends React.Component {
        render() {
          return <div>{this.props.children}</div>;
        }
      }

      class Parent extends React.Component {
        render() {
          return (
            <div>
              <WrapperComponent>{this.props.children}</WrapperComponent>
            </div>
          );
        }
      }
      await act(async () => {
        root.render(<Parent>{[<div key="1" />]}</Parent>);
      });

      await act(async () => {
        root.render(<Parent>{[<div key="1" />, <div key="1" />]}</Parent>);
      });
      assertConsoleErrorDev([
        'Encountered two children with the same key, `1`. ' +
          'Keys should be unique so that components maintain their identity ' +
          'across updates. Non-unique keys may cause children to be ' +
          'duplicated and/or omitted — the behavior is unsupported and ' +
          'could change in a future version.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn for duplicated iterable keys with component stack info', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);

      class WrapperComponent extends React.Component {
        render() {
          return <div>{this.props.children}</div>;
        }
      }

      class Parent extends React.Component {
        render() {
          return (
            <div>
              <WrapperComponent>{this.props.children}</WrapperComponent>
            </div>
          );
        }
      }

      function createIterable(array) {
        return {
          '@@iterator': function () {
            let i = 0;
            return {
              next() {
                const next = {
                  value: i < array.length ? array[i] : undefined,
                  done: i === array.length,
                };
                i++;
                return next;
              },
            };
          },
        };
      }
      await act(async () => {
        root.render(<Parent>{createIterable([<div key="1" />])}</Parent>);
      });

      await act(async () => {
        root.render(
          <Parent>{createIterable([<div key="1" />, <div key="1" />])}</Parent>,
        );
      });
      assertConsoleErrorDev([
        'Encountered two children with the same key, `1`. ' +
          'Keys should be unique so that components maintain their identity ' +
          'across updates. Non-unique keys may cause children to be ' +
          'duplicated and/or omitted — the behavior is unsupported and ' +
          'could change in a future version.\n' +
          '    in div (at **)',
      ]);
    });
  });

  it('should warn for using maps as children with owner info', async () => {
    class Parent extends React.Component {
      render() {
        return (
          <div>
            {
              new Map([
                ['foo', 0],
                ['bar', 1],
              ])
            }
          </div>
        );
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<Parent />);
    });
    assertConsoleErrorDev([
      'Using Maps as children is not supported. ' +
        'Use an array of keyed ReactElements instead.\n' +
        '    in div (at **)\n' +
        '    in Parent (at **)',
    ]);
  });

  it('should NOT warn for using generator functions as components', async () => {
    function* Foo() {
      yield <h1 key="1">Hello</h1>;
      yield <h1 key="2">World</h1>;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<Foo />);
    });

    expect(container.textContent).toBe('HelloWorld');
  });

  it('should warn for using generators as children props', async () => {
    function* getChildren() {
      yield <h1 key="1">Hello</h1>;
      yield <h1 key="2">World</h1>;
    }

    function Foo() {
      const children = getChildren();
      return <div>{children}</div>;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<Foo />);
    });
    assertConsoleErrorDev([
      'Using Iterators as children is unsupported and will likely yield ' +
        'unexpected results because enumerating a generator mutates it. ' +
        'You may convert it to an array with `Array.from()` or the ' +
        '`[...spread]` operator before rendering. You can also use an ' +
        'Iterable that can iterate multiple times over the same items.\n' +
        '    in div (at **)\n' +
        '    in Foo (at **)',
    ]);

    expect(container.textContent).toBe('HelloWorld');

    // Test de-duplication
    await act(async () => {
      root.render(<Foo />);
    });
  });

  it('should warn for using other types of iterators as children', async () => {
    function Foo() {
      let i = 0;
      const iterator = {
        [Symbol.iterator]() {
          return iterator;
        },
        next() {
          switch (i++) {
            case 0:
              return {done: false, value: <h1 key="1">Hello</h1>};
            case 1:
              return {done: false, value: <h1 key="2">World</h1>};
            default:
              return {done: true, value: undefined};
          }
        },
      };
      return iterator;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<Foo />);
    });
    assertConsoleErrorDev([
      'Using Iterators as children is unsupported and will likely yield ' +
        'unexpected results because enumerating a generator mutates it. ' +
        'You may convert it to an array with `Array.from()` or the ' +
        '`[...spread]` operator before rendering. You can also use an ' +
        'Iterable that can iterate multiple times over the same items.\n' +
        '    in Foo (at **)',
    ]);

    expect(container.textContent).toBe('HelloWorld');

    // Test de-duplication
    await act(async () => {
      root.render(<Foo />);
    });
  });

  it('should not warn for using generators in legacy iterables', async () => {
    const fooIterable = {
      '@@iterator': function* () {
        yield <h1 key="1">Hello</h1>;
        yield <h1 key="2">World</h1>;
      },
    };

    function Foo() {
      return fooIterable;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<Foo />);
    });
    expect(container.textContent).toBe('HelloWorld');

    await act(async () => {
      root.render(<Foo />);
    });
    expect(container.textContent).toBe('HelloWorld');
  });

  it('should not warn for using generators in modern iterables', async () => {
    const fooIterable = {
      [Symbol.iterator]: function* () {
        yield <h1 key="1">Hello</h1>;
        yield <h1 key="2">World</h1>;
      },
    };

    function Foo() {
      return fooIterable;
    }

    const div = document.createElement('div');
    const root = ReactDOMClient.createRoot(div);
    await act(async () => {
      root.render(<Foo />);
    });
    expect(div.textContent).toBe('HelloWorld');

    await act(async () => {
      root.render(<Foo />);
    });
    expect(div.textContent).toBe('HelloWorld');
  });

  it('should reorder bailed-out children', async () => {
    class LetterInner extends React.Component {
      render() {
        return <div>{this.props.char}</div>;
      }
    }

    class Letter extends React.Component {
      render() {
        return <LetterInner char={this.props.char} />;
      }
      shouldComponentUpdate() {
        return false;
      }
    }

    class Letters extends React.Component {
      render() {
        const letters = this.props.letters.split('');
        return (
          <div>
            {letters.map(c => (
              <Letter key={c} char={c} />
            ))}
          </div>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    // Two random strings -- some additions, some removals, some moves
    await act(async () => {
      root.render(<Letters letters="XKwHomsNjIkBcQWFbiZU" />);
    });
    expect(container.textContent).toBe('XKwHomsNjIkBcQWFbiZU');
    await act(async () => {
      root.render(<Letters letters="EHCjpdTUuiybDvhRJwZt" />);
    });
    expect(container.textContent).toBe('EHCjpdTUuiybDvhRJwZt');
  });

  it('prepares new children before unmounting old', async () => {
    const log = [];

    class Spy extends React.Component {
      UNSAFE_componentWillMount() {
        log.push(this.props.name + ' componentWillMount');
      }
      render() {
        log.push(this.props.name + ' render');
        return <div />;
      }
      componentDidMount() {
        log.push(this.props.name + ' componentDidMount');
      }
      componentWillUnmount() {
        log.push(this.props.name + ' componentWillUnmount');
      }
    }

    // These are reference-unequal so they will be swapped even if they have
    // matching keys
    const SpyA = props => <Spy {...props} />;
    const SpyB = props => <Spy {...props} />;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <div>
          <SpyA key="one" name="oneA" />
          <SpyA key="two" name="twoA" />
        </div>,
      );
    });
    await act(async () => {
      root.render(
        <div>
          <SpyB key="one" name="oneB" />
          <SpyB key="two" name="twoB" />
        </div>,
      );
    });

    expect(log).toEqual([
      'oneA componentWillMount',
      'oneA render',
      'twoA componentWillMount',
      'twoA render',
      'oneA componentDidMount',
      'twoA componentDidMount',

      'oneB componentWillMount',
      'oneB render',
      'twoB componentWillMount',
      'twoB render',
      'oneA componentWillUnmount',
      'twoA componentWillUnmount',

      'oneB componentDidMount',
      'twoB componentDidMount',
    ]);
  });
});

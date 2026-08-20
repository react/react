/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const React = require('react');
const ReactDOMClient = require('react-dom/client');
const act = require('internal-test-utils').act;

/**
 * Tests that when a ref hops around children, we can track that correctly.
 */
describe('ref swapping', () => {
  let RefHopsAround;
  beforeEach(() => {
    RefHopsAround = class extends React.Component {
      container = null;
      state = {count: 0};
      hopRef = React.createRef();
      divOneRef = React.createRef();
      divTwoRef = React.createRef();
      divThreeRef = React.createRef();

      moveRef = () => {
        this.setState({count: this.state.count + 1});
      };

      render() {
        const count = this.state.count;
        /**
         * What we have here, is three divs with refs (div1/2/3), but a single
         * moving cursor ref `hopRef` that "hops" around the three. We'll call the
         * `moveRef()` function several times and make sure that the hop ref
         * points to the correct divs.
         */
        return (
          <div ref={current => (this.container = current)}>
            <div
              className="first"
              ref={count % 3 === 0 ? this.hopRef : this.divOneRef}
            />
            <div
              className="second"
              ref={count % 3 === 1 ? this.hopRef : this.divTwoRef}
            />
            <div
              className="third"
              ref={count % 3 === 2 ? this.hopRef : this.divThreeRef}
            />
          </div>
        );
      }
    };
  });

  it('Allow refs to hop around children correctly', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    let refHopsAround;
    await act(() => {
      root.render(<RefHopsAround ref={current => (refHopsAround = current)} />);
    });

    const firstDiv = refHopsAround.container.querySelector('.first');
    const secondDiv = refHopsAround.container.querySelector('.second');
    const thirdDiv = refHopsAround.container.querySelector('.third');

    expect(refHopsAround.hopRef.current).toEqual(firstDiv);
    expect(refHopsAround.divTwoRef.current).toEqual(secondDiv);
    expect(refHopsAround.divThreeRef.current).toEqual(thirdDiv);

    await act(() => {
      refHopsAround.moveRef();
    });
    expect(refHopsAround.divOneRef.current).toEqual(firstDiv);
    expect(refHopsAround.hopRef.current).toEqual(secondDiv);
    expect(refHopsAround.divThreeRef.current).toEqual(thirdDiv);

    await act(() => {
      refHopsAround.moveRef();
    });
    expect(refHopsAround.divOneRef.current).toEqual(firstDiv);
    expect(refHopsAround.divTwoRef.current).toEqual(secondDiv);
    expect(refHopsAround.hopRef.current).toEqual(thirdDiv);

    /**
     * Make sure that after the third, we're back to where we started and the
     * refs are completely restored.
     */
    await act(() => {
      refHopsAround.moveRef();
    });
    expect(refHopsAround.hopRef.current).toEqual(firstDiv);
    expect(refHopsAround.divTwoRef.current).toEqual(secondDiv);
    expect(refHopsAround.divThreeRef.current).toEqual(thirdDiv);
  });

  it('always has a value for this.refs', async () => {
    class Component extends React.Component {
      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<Component ref={current => (instance = current)} />);
    });
    expect(!!instance.refs).toBe(true);
  });

  it('ref called correctly for stateless component', async () => {
    let refCalled = 0;
    function Inner(props) {
      return <a ref={props.saveA} />;
    }

    class Outer extends React.Component {
      saveA = () => {
        refCalled++;
      };

      componentDidMount() {
        this.setState({});
      }

      render() {
        return <Inner saveA={this.saveA} />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });

    expect(refCalled).toBe(1);
  });

  it('provides an error for invalid refs', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<div ref={10} />);
      });
      // TODO: This throws an AggregateError. Need to update test infra to
      // support matching against AggregateError.
    }).rejects.toThrow();
    await expect(async () => {
      await act(() => {
        root.render(<div ref={true} />);
      });
      // TODO: This throws an AggregateError. Need to update test infra to
      // support matching against AggregateError.
    }).rejects.toThrow();
    await expect(async () => {
      await act(() => {
        root.render(<div ref={Symbol('foo')} />);
      });
    }).rejects.toThrow('Expected ref to be a function');
  });
});

describe('root level refs', () => {
  it('attaches and detaches root refs', async () => {
    let inst = null;

    // host node
    let ref = jest.fn(value => (inst = value));
    const container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div ref={ref} />);
    });
    let result = container.firstChild;
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    expect(result).toBe(ref.mock.calls[0][0]);
    await act(() => {
      root.unmount();
    });
    expect(ref).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls[1][0]).toBe(null);

    // composite
    class Comp extends React.Component {
      method() {
        return true;
      }
      render() {
        return <div>Comp</div>;
      }
    }

    inst = null;
    ref = jest.fn(value => (inst = value));
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp ref={ref} />);
    });

    expect(ref).toHaveBeenCalledTimes(1);
    expect(inst).toBeInstanceOf(Comp);

    // ensure we have the correct instance
    expect(inst.method()).toBe(true);

    await act(() => {
      root.unmount();
    });
    expect(ref).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls[1][0]).toBe(null);

    // fragment
    inst = null;
    ref = jest.fn(value => (inst = value));
    let divInst = null;
    const ref2 = jest.fn(value => (divInst = value));
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render([
        <Comp ref={ref} key="a" />,
        5,
        <div ref={ref2} key="b">
          Hello
        </div>,
      ]);
    });

    // first call should be `Comp`
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls[0][0]).toBeInstanceOf(Comp);

    expect(ref2).toHaveBeenCalledTimes(1);
    expect(divInst).toBeInstanceOf(HTMLDivElement);

    await act(() => {
      root.unmount();
    });
    expect(ref).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls[1][0]).toBe(null);
    expect(ref2).toHaveBeenCalledTimes(2);
    expect(ref2.mock.calls[1][0]).toBe(null);

    // null
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(null);
    });
    result = container.firstChild;
    expect(result).toBe(null);

    // primitives
    await act(() => {
      root.render(5);
    });
    result = container.firstChild;
    expect(result).toBeInstanceOf(Text);
  });
});

describe('refs return clean up function', () => {
  it('calls clean up function if it exists', async () => {
    const container = document.createElement('div');
    let cleanUp = jest.fn();
    let setup = jest.fn();

    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <div
          ref={_ref => {
            setup(_ref);
            return cleanUp;
          }}
        />,
      );
    });

    await act(() => {
      root.render(
        <div
          ref={_ref => {
            setup(_ref);
          }}
        />,
      );
    });

    expect(setup).toHaveBeenCalledTimes(2);
    expect(cleanUp).toHaveBeenCalledTimes(1);
    expect(cleanUp.mock.calls[0][0]).toBe(undefined);

    await act(() => {
      root.render(<div ref={_ref => {}} />);
    });

    expect(cleanUp).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(3);
    expect(setup.mock.calls[2][0]).toBe(null);

    cleanUp = jest.fn();
    setup = jest.fn();

    await act(() => {
      root.render(
        <div
          ref={_ref => {
            setup(_ref);
            return cleanUp;
          }}
        />,
      );
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(
        <div
          ref={_ref => {
            setup(_ref);
            return cleanUp;
          }}
        />,
      );
    });

    expect(setup).toHaveBeenCalledTimes(2);
    expect(cleanUp).toHaveBeenCalledTimes(1);
  });

  it('handles ref functions with stable identity', async () => {
    const container = document.createElement('div');
    const cleanUp = jest.fn();
    const setup = jest.fn();

    function _onRefChange(_ref) {
      setup(_ref);
      return cleanUp;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div ref={_onRefChange} />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<div className="niceClassName" ref={_onRefChange} />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<div />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(1);
  });

  it('handles detaching refs with either cleanup function or null argument', async () => {
    const container = document.createElement('div');
    const cleanUp = jest.fn();
    const setup = jest.fn();
    const setup2 = jest.fn();
    const nullHandler = jest.fn();

    function _onRefChangeWithCleanup(_ref) {
      if (_ref) {
        setup(_ref.id);
      } else {
        nullHandler();
      }
      return cleanUp;
    }

    function _onRefChangeWithoutCleanup(_ref) {
      if (_ref) {
        setup2(_ref.id);
      } else {
        nullHandler();
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div id="test-div" ref={_onRefChangeWithCleanup} />);
    });

    expect(setup).toBeCalledWith('test-div');
    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<div id="test-div2" ref={_onRefChangeWithoutCleanup} />);
    });

    // Existing setup call was not called again
    expect(setup).toHaveBeenCalledTimes(1);
    // No null call because cleanup is returned
    expect(nullHandler).toHaveBeenCalledTimes(0);
    // Now we have a cleanup
    expect(cleanUp).toHaveBeenCalledTimes(1);

    // New ref is setup
    expect(setup2).toBeCalledWith('test-div2');
    expect(setup2).toHaveBeenCalledTimes(1);

    // Now, render with the original ref again
    await act(() => {
      root.render(<div id="test-div3" ref={_onRefChangeWithCleanup} />);
    });

    // Setup was not called again
    expect(setup2).toBeCalledWith('test-div2');
    expect(setup2).toHaveBeenCalledTimes(1);

    // Null handler hit because no cleanup is returned
    expect(nullHandler).toHaveBeenCalledTimes(1);

    // Original setup hit one more time
    expect(setup).toHaveBeenCalledTimes(2);
  });

  it('calls cleanup function on unmount', async () => {
    const container = document.createElement('div');
    const cleanUp = jest.fn();
    const setup = jest.fn();
    const nullHandler = jest.fn();

    function _onRefChangeWithCleanup(_ref) {
      if (_ref) {
        setup(_ref.id);
      } else {
        nullHandler();
      }
      return cleanUp;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div id="test-div" ref={_onRefChangeWithCleanup} />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);
    expect(nullHandler).toHaveBeenCalledTimes(0);

    root.unmount();

    expect(setup).toHaveBeenCalledTimes(1);
    // Now cleanup has been called
    expect(cleanUp).toHaveBeenCalledTimes(1);
    // Ref callback never called with null when cleanup is returned
    expect(nullHandler).toHaveBeenCalledTimes(0);
  });
});

describe('useImerativeHandle refs', () => {
  const ImperativeHandleComponent = React.forwardRef(({name}, ref) => {
    React.useImperativeHandle(
      ref,
      () => ({
        greet() {
          return `Hello ${name}`;
        },
      }),
      [name],
    );
    return null;
  });

  it('should work with object style refs', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const ref = React.createRef();

    await act(async () => {
      root.render(<ImperativeHandleComponent name="Alice" ref={ref} />);
    });
    expect(ref.current.greet()).toBe('Hello Alice');
    await act(() => {
      root.render(null);
    });
    expect(ref.current).toBe(null);
  });

  it('should work with callback style refs', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let current = null;

    await act(async () => {
      root.render(
        <ImperativeHandleComponent
          name="Alice"
          ref={r => {
            current = r;
          }}
        />,
      );
    });
    expect(current.greet()).toBe('Hello Alice');
    await act(() => {
      root.render(null);
    });
    expect(current).toBe(null);
  });

  it('should work with callback style refs with cleanup function', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    let cleanupCalls = 0;
    let createCalls = 0;
    let current = null;

    const ref = r => {
      current = r;
      createCalls++;
      return () => {
        current = null;
        cleanupCalls++;
      };
    };

    await act(async () => {
      root.render(<ImperativeHandleComponent name="Alice" ref={ref} />);
    });
    expect(current.greet()).toBe('Hello Alice');
    expect(createCalls).toBe(1);
    expect(cleanupCalls).toBe(0);

    // update a dep should recreate the ref
    await act(async () => {
      root.render(<ImperativeHandleComponent name="Bob" ref={ref} />);
    });
    expect(current.greet()).toBe('Hello Bob');
    expect(createCalls).toBe(2);
    expect(cleanupCalls).toBe(1);

    // unmounting should call cleanup
    await act(() => {
      root.render(null);
    });
    expect(current).toBe(null);
    expect(createCalls).toBe(2);
    expect(cleanupCalls).toBe(2);
  });
});

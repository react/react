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

describe('ReactIdentity', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
  });

  it('should allow key property to express identity', async () => {
    let node;
    const Component = props => (
      <div ref={c => (node = c)}>
        <div key={props.swap ? 'banana' : 'apple'} />
        <div key={props.swap ? 'apple' : 'banana'} />
      </div>
    );

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<Component />);
    });
    const origChildren = Array.from(node.childNodes);
    await act(async () => {
      root.render(<Component swap={true} />);
    });
    const newChildren = Array.from(node.childNodes);
    expect(origChildren[0]).toBe(newChildren[1]);
    expect(origChildren[1]).toBe(newChildren[0]);
  });

  it('should use composite identity', async () => {
    class Wrapper extends React.Component {
      render() {
        return <a>{this.props.children}</a>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let node1;
    let node2;
    await act(async () => {
      root.render(
        <Wrapper key="wrap1">
          <span ref={c => (node1 = c)} />
        </Wrapper>,
      );
    });
    await act(async () => {
      root.render(
        <Wrapper key="wrap2">
          <span ref={c => (node2 = c)} />
        </Wrapper>,
      );
    });
    expect(node1).not.toBe(node2);
  });

  async function renderAComponentWithKeyIntoContainer(key, root) {
    class Wrapper extends React.Component {
      spanRef = React.createRef();
      render() {
        return (
          <div>
            <span ref={this.spanRef} key={key} />
          </div>
        );
      }
    }
    const wrapperRef = React.createRef();
    await act(async () => {
      root.render(<Wrapper ref={wrapperRef} />);
    });
    const span = wrapperRef.current.spanRef.current;
    expect(span).not.toBe(null);
  }

  it('should allow any character as a key, in a detached parent', async () => {
    const detachedContainer = document.createElement('div');
    const root = ReactDOMClient.createRoot(detachedContainer);
    await renderAComponentWithKeyIntoContainer("<'WEIRD/&\\key'>", root);
  });

  it('should allow any character as a key, in an attached parent', async () => {
    // This test exists to protect against implementation details that
    // incorrectly query escaped IDs using DOM tools like getElementById.
    const attachedContainer = document.createElement('div');
    const root = ReactDOMClient.createRoot(attachedContainer);
    document.body.appendChild(attachedContainer);

    await renderAComponentWithKeyIntoContainer("<'WEIRD/&\\key'>", root);

    document.body.removeChild(attachedContainer);
  });

  it('should not allow scripts in keys to execute', async () => {
    const h4x0rKey =
      '"><script>window[\'YOUVEBEENH4X0RED\']=true;</script><div id="';

    const attachedContainer = document.createElement('div');
    const root = ReactDOMClient.createRoot(attachedContainer);
    document.body.appendChild(attachedContainer);

    await renderAComponentWithKeyIntoContainer(h4x0rKey, root);

    document.body.removeChild(attachedContainer);

    // If we get this far, make sure we haven't executed the code
    expect(window.YOUVEBEENH4X0RED).toBe(undefined);
  });

  it('should let restructured components retain their uniqueness', async () => {
    const instance0 = <span />;
    const instance1 = <span />;
    const instance2 = <span />;

    class TestComponent extends React.Component {
      render() {
        return (
          <div>
            {instance2}
            {this.props.children[0]}
            {this.props.children[1]}
          </div>
        );
      }
    }

    class TestContainer extends React.Component {
      render() {
        return (
          <TestComponent>
            {instance0}
            {instance1}
          </TestComponent>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<TestContainer />);
      }),
    ).resolves.not.toThrow();
  });

  it('should let nested restructures retain their uniqueness', async () => {
    const instance0 = <span />;
    const instance1 = <span />;
    const instance2 = <span />;

    class TestComponent extends React.Component {
      render() {
        return (
          <div>
            {instance2}
            {this.props.children[0]}
            {this.props.children[1]}
          </div>
        );
      }
    }

    class TestContainer extends React.Component {
      render() {
        return (
          <div>
            <TestComponent>
              {instance0}
              {instance1}
            </TestComponent>
          </div>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<TestContainer />);
      }),
    ).resolves.not.toThrow();
  });

  it('should let text nodes retain their uniqueness', async () => {
    class TestComponent extends React.Component {
      render() {
        return (
          <div>
            {this.props.children}
            <span />
          </div>
        );
      }
    }

    class TestContainer extends React.Component {
      render() {
        return (
          <TestComponent>
            <div />
            {'second'}
          </TestComponent>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<TestContainer />);
      }),
    ).resolves.not.toThrow();
  });

  it('should retain key during updates in composite components', async () => {
    class TestComponent extends React.Component {
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    class TestContainer extends React.Component {
      state = {swapped: false};

      swap = () => {
        this.setState({swapped: true});
      };

      render() {
        return (
          <TestComponent>
            {this.state.swapped ? this.props.second : this.props.first}
            {this.state.swapped ? this.props.first : this.props.second}
          </TestComponent>
        );
      }
    }

    const instance0 = <span key="A" />;
    const instance1 = <span key="B" />;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const wrappedRef = React.createRef();
    await act(async () => {
      root.render(
        <TestContainer first={instance0} second={instance1} ref={wrappedRef} />,
      );
    });
    const div = container.firstChild;

    const beforeA = div.firstChild;
    const beforeB = div.lastChild;
    await act(async () => {
      wrappedRef.current.swap();
    });
    const afterA = div.lastChild;
    const afterB = div.firstChild;

    expect(beforeA).toBe(afterA);
    expect(beforeB).toBe(afterB);
  });

  it('should not allow implicit and explicit keys to collide', async () => {
    const component = (
      <div>
        <span />
        <span key="0" />
      </div>
    );

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(component);
      }),
    ).resolves.not.toThrow();
  });

  it('should throw if key is a Temporal-like object', async () => {
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

    const el = document.createElement('div');
    const root = ReactDOMClient.createRoot(el);
    await expect(() => {
      root.render(
        <div>
          <span key={new TemporalLike()} />
        </div>,
      );
    }).toThrowError(new TypeError('prod message'));
    assertConsoleErrorDev([
      'The provided key is an unsupported type TemporalLike.' +
        ' This value must be coerced to a string before using it here.',
    ]);
  });
});

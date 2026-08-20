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
let findDOMNode;
let ReactDOMClient;
let TogglingComponent;
let act;
let Scheduler;
let assertLog;
let assertConsoleErrorDev;

let container;

describe('ReactEmptyComponent', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    findDOMNode =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
        .findDOMNode;
    Scheduler = require('scheduler');
    const InternalTestUtils = require('internal-test-utils');
    act = InternalTestUtils.act;
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;

    container = document.createElement('div');

    TogglingComponent = class extends React.Component {
      state = {component: this.props.firstComponent};

      componentDidMount() {
        Scheduler.log('mount ' + findDOMNode(this)?.nodeName);
        this.setState({component: this.props.secondComponent});
      }

      componentDidUpdate() {
        Scheduler.log('update ' + findDOMNode(this)?.nodeName);
      }

      render() {
        const Component = this.state.component;
        return Component ? <Component /> : null;
      }
    };
  });

  describe.each([null, undefined])('when %s', nullORUndefined => {
    it('should not throw when rendering', () => {
      function EmptyComponent() {
        return nullORUndefined;
      }

      const root = ReactDOMClient.createRoot(container);

      expect(() => {
        ReactDOM.flushSync(() => {
          root.render(<EmptyComponent />);
        });
      }).not.toThrowError();
    });

    it('should not produce child DOM nodes for nullish and false', async () => {
      function Component1() {
        return nullORUndefined;
      }

      function Component2() {
        return false;
      }

      const container1 = document.createElement('div');
      const root1 = ReactDOMClient.createRoot(container1);
      await act(() => {
        root1.render(<Component1 />);
      });
      expect(container1.children.length).toBe(0);

      const container2 = document.createElement('div');
      const root2 = ReactDOMClient.createRoot(container2);
      await act(() => {
        root2.render(<Component2 />);
      });
      expect(container2.children.length).toBe(0);
    });

    it('should be able to switch between rendering nullish and a normal tag', async () => {
      const instance1 = (
        <TogglingComponent
          firstComponent={nullORUndefined}
          secondComponent={'div'}
        />
      );
      const instance2 = (
        <TogglingComponent
          firstComponent={'div'}
          secondComponent={nullORUndefined}
        />
      );

      const container2 = document.createElement('div');
      const root1 = ReactDOMClient.createRoot(container);
      await act(() => {
        root1.render(instance1);
      });

      assertLog(['mount undefined', 'update DIV']);

      const root2 = ReactDOMClient.createRoot(container2);
      await act(() => {
        root2.render(instance2);
      });

      assertLog(['mount DIV', 'update undefined']);
    });

    it('should be able to switch in a list of children', async () => {
      const instance1 = (
        <TogglingComponent
          firstComponent={nullORUndefined}
          secondComponent={'div'}
        />
      );

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            {instance1}
            {instance1}
            {instance1}
          </div>,
        );
      });

      assertLog([
        'mount undefined',
        'mount undefined',
        'mount undefined',
        'update DIV',
        'update DIV',
        'update DIV',
      ]);
    });

    it('should distinguish between a script placeholder and an actual script tag', () => {
      const instance1 = (
        <TogglingComponent
          firstComponent={nullORUndefined}
          secondComponent={'script'}
        />
      );
      const instance2 = (
        <TogglingComponent
          firstComponent={'script'}
          secondComponent={nullORUndefined}
        />
      );

      const root1 = ReactDOMClient.createRoot(container);
      expect(() => {
        ReactDOM.flushSync(() => {
          root1.render(instance1);
        });
      }).not.toThrow();

      expect(container.innerHTML).toBe('<script></script>');
      if (gate('enableTrustedTypesIntegration')) {
        assertConsoleErrorDev([
          'Encountered a script tag while rendering React component. ' +
            'Scripts inside React components are never executed when rendering on the client. ' +
            'Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).\n' +
            '     in script (at **)\n' +
            '     in TogglingComponent (at **)',
        ]);
      }

      const container2 = document.createElement('div');
      const root2 = ReactDOMClient.createRoot(container2);
      expect(() => {
        ReactDOM.flushSync(() => {
          root2.render(instance2);
        });
      }).not.toThrow();

      assertLog([
        'mount undefined',
        'update SCRIPT',
        'mount SCRIPT',
        'update undefined',
      ]);
      expect(container2.innerHTML).toBe('');
    });

    it(
      'should have findDOMNode return null when multiple layers of composite ' +
        'components render to the same nullish placeholder',
      () => {
        function GrandChild() {
          return nullORUndefined;
        }

        function Child() {
          return <GrandChild />;
        }

        const instance1 = (
          <TogglingComponent firstComponent={'div'} secondComponent={Child} />
        );
        const instance2 = (
          <TogglingComponent firstComponent={Child} secondComponent={'div'} />
        );

        const root1 = ReactDOMClient.createRoot(container);
        expect(() => {
          ReactDOM.flushSync(() => {
            root1.render(instance1);
          });
        }).not.toThrow();

        const container2 = document.createElement('div');
        const root2 = ReactDOMClient.createRoot(container2);
        expect(() => {
          ReactDOM.flushSync(() => {
            root2.render(instance2);
          });
        }).not.toThrow();

        assertLog([
          'mount DIV',
          'update undefined',
          'mount undefined',
          'update DIV',
        ]);
      },
    );

    it('works when switching components', async () => {
      let innerRef;

      class Inner extends React.Component {
        render() {
          return <span />;
        }

        componentDidMount() {
          // Make sure the DOM node resolves properly even if we're replacing a
          // `null` component
          expect(findDOMNode(this)).not.toBe(null);
        }

        componentWillUnmount() {
          // Even though we're getting replaced by `null`, we haven't been
          // replaced yet!
          expect(findDOMNode(this)).not.toBe(null);
        }
      }

      function Wrapper({showInner}) {
        innerRef = React.createRef(null);
        return showInner ? <Inner ref={innerRef} /> : nullORUndefined;
      }

      const el = document.createElement('div');

      // Render the <Inner /> component...
      const root = ReactDOMClient.createRoot(el);
      await act(() => {
        root.render(<Wrapper showInner={true} />);
      });
      expect(innerRef.current).not.toBe(null);

      // Switch to null...
      await act(() => {
        root.render(<Wrapper showInner={false} />);
      });
      expect(innerRef.current).toBe(null);

      // ...then switch back.
      await act(() => {
        root.render(<Wrapper showInner={true} />);
      });
      expect(innerRef.current).not.toBe(null);

      expect.assertions(6);
    });

    it('can render nullish at the top level', async () => {
      const div = document.createElement('div');
      const root = ReactDOMClient.createRoot(div);

      await act(() => {
        root.render(nullORUndefined);
      });
      expect(div.innerHTML).toBe('');
    });

    it('does not break when updating during mount', () => {
      class Child extends React.Component {
        componentDidMount() {
          if (this.props.onMount) {
            this.props.onMount();
          }
        }

        render() {
          if (!this.props.visible) {
            return nullORUndefined;
          }

          return <div>hello world</div>;
        }
      }

      class Parent extends React.Component {
        update = () => {
          this.forceUpdate();
        };

        render() {
          return (
            <div>
              <Child key="1" visible={false} />
              <Child key="0" visible={true} onMount={this.update} />
              <Child key="2" visible={false} />
            </div>
          );
        }
      }

      const root = ReactDOMClient.createRoot(container);
      expect(() => {
        ReactDOM.flushSync(() => {
          root.render(<Parent />);
        });
      }).not.toThrow();
    });

    it('preserves the dom node during updates', async () => {
      function Empty() {
        return nullORUndefined;
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Empty />);
      });
      const noscript1 = container.firstChild;
      expect(noscript1).toBe(null);

      // This update shouldn't create a DOM node
      await act(() => {
        root.render(<Empty />);
      });
      const noscript2 = container.firstChild;
      expect(noscript2).toBe(null);
    });

    it('should not warn about React.forwardRef that returns nullish', () => {
      const Empty = () => {
        return nullORUndefined;
      };
      const EmptyForwardRef = React.forwardRef(Empty);

      const root = ReactDOMClient.createRoot(container);
      expect(() => {
        ReactDOM.flushSync(() => {
          root.render(<EmptyForwardRef />);
        });
      }).not.toThrowError();
    });

    it('should not warn about React.memo that returns nullish', () => {
      const Empty = () => {
        return nullORUndefined;
      };
      const EmptyMemo = React.memo(Empty);

      const root = ReactDOMClient.createRoot(container);
      expect(() => {
        ReactDOM.flushSync(() => {
          root.render(<EmptyMemo />);
        });
      }).not.toThrowError();
    });
  });
});

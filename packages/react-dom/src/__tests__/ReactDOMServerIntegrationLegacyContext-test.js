/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');

let PropTypes;
let React;
let ReactDOMClient;
let ReactDOMServer;
let assertConsoleErrorDev;

function initModules() {
  // Reset warning cache.
  jest.resetModules();
  PropTypes = require('prop-types');
  React = require('react');
  ReactDOMClient = require('react-dom/client');
  ReactDOMServer = require('react-dom/server');
  assertConsoleErrorDev = require('internal-test-utils').assertConsoleErrorDev;

  // Make them available to the helpers.
  return {
    ReactDOMClient,
    ReactDOMServer,
  };
}

const {
  resetModules,
  itRenders,
  itThrowsWhenRendering,
  clientRenderOnBadMarkup,
} = ReactDOMServerIntegrationUtils(initModules);

describe('ReactDOMServerIntegration', () => {
  beforeEach(() => {
    resetModules();
  });
  afterEach(() => {
    // TODO: This is a hack because expectErrors does not restore mock,
    // however fixing it requires a major refactor to all these tests.
    if (console.error.mockClear) {
      console.error.mockRestore();
    }
  });

  describe('legacy context', function () {
    // The `itRenders` test abstraction doesn't work with @gate so we have
    // to do this instead.
    if (gate(flags => flags.disableLegacyContext)) {
      it('empty test to stop Jest from being a complainy complainer', () => {});
      return;
    }

    let PurpleContext, RedContext;
    beforeEach(() => {
      class Parent extends React.Component {
        getChildContext() {
          return {text: this.props.text};
        }
        render() {
          return this.props.children;
        }
      }
      Parent.childContextTypes = {text: PropTypes.string};

      PurpleContext = props => <Parent text="purple">{props.children}</Parent>;
      RedContext = props => <Parent text="red">{props.children}</Parent>;
    });

    itRenders('class child with context', async render => {
      class ClassChildWithContext extends React.Component {
        render() {
          return <div>{this.context.text}</div>;
        }
      }
      ClassChildWithContext.contextTypes = {text: PropTypes.string};

      const e = await render(
        <PurpleContext>
          <ClassChildWithContext />
        </PurpleContext>,
        2,
      );
      expect(e.textContent).toBe('purple');
    });

    itRenders('stateless child with context', async render => {
      if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
        return;
      }
      function FunctionChildWithContext(props, context) {
        return <div>{context.text}</div>;
      }
      FunctionChildWithContext.contextTypes = {text: PropTypes.string};

      const e = await render(
        <PurpleContext>
          <FunctionChildWithContext />
        </PurpleContext>,
        2,
      );
      expect(e.textContent).toBe('purple');
    });

    itRenders('class child without context', async render => {
      class ClassChildWithoutContext extends React.Component {
        render() {
          // this should render blank; context isn't passed to this component.
          return <div>{this.context.text}</div>;
        }
      }

      const e = await render(
        <PurpleContext>
          <ClassChildWithoutContext />
        </PurpleContext>,
        1,
      );
      expect(e.textContent).toBe('');
    });

    itRenders('stateless child without context', async render => {
      if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
        return;
      }
      function FunctionChildWithoutContext(props, context) {
        // this should render blank; context isn't passed to this component.
        return <div>{context.text}</div>;
      }

      const e = await render(
        <PurpleContext>
          <FunctionChildWithoutContext />
        </PurpleContext>,
        1,
      );
      expect(e.textContent).toBe('');
    });

    itRenders('class child with wrong context', async render => {
      class ClassChildWithWrongContext extends React.Component {
        render() {
          // this should render blank; context.text isn't passed to this component.
          return <div id="classWrongChild">{this.context.text}</div>;
        }
      }
      ClassChildWithWrongContext.contextTypes = {foo: PropTypes.string};

      const e = await render(
        <PurpleContext>
          <ClassChildWithWrongContext />
        </PurpleContext>,
        2,
      );
      expect(e.textContent).toBe('');
    });

    itRenders('stateless child with wrong context', async render => {
      if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
        return;
      }
      function FunctionChildWithWrongContext(props, context) {
        // this should render blank; context.text isn't passed to this component.
        return <div id="statelessWrongChild">{context.text}</div>;
      }
      FunctionChildWithWrongContext.contextTypes = {
        foo: PropTypes.string,
      };

      const e = await render(
        <PurpleContext>
          <FunctionChildWithWrongContext />
        </PurpleContext>,
        2,
      );
      expect(e.textContent).toBe('');
    });

    itRenders('with context passed through to a grandchild', async render => {
      if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
        return;
      }
      function Grandchild(props, context) {
        return <div>{context.text}</div>;
      }
      Grandchild.contextTypes = {text: PropTypes.string};

      const Child = props => <Grandchild />;

      const e = await render(
        <PurpleContext>
          <Child />
        </PurpleContext>,
        2,
      );
      expect(e.textContent).toBe('purple');
    });

    itRenders('a child context overriding a parent context', async render => {
      if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
        return;
      }
      const Grandchild = (props, context) => {
        return <div>{context.text}</div>;
      };
      Grandchild.contextTypes = {text: PropTypes.string};

      const e = await render(
        <PurpleContext>
          <RedContext>
            <Grandchild />
          </RedContext>
        </PurpleContext>,
        2,
      );
      expect(e.textContent).toBe('red');
    });

    itRenders('a child context merged with a parent context', async render => {
      if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
        return;
      }
      class Parent extends React.Component {
        getChildContext() {
          return {text1: 'purple'};
        }
        render() {
          return <Child />;
        }
      }
      Parent.childContextTypes = {text1: PropTypes.string};

      class Child extends React.Component {
        getChildContext() {
          return {text2: 'red'};
        }
        render() {
          return <Grandchild />;
        }
      }
      Child.childContextTypes = {text2: PropTypes.string};

      const Grandchild = (props, context) => {
        return (
          <div>
            <div id="first">{context.text1}</div>
            <div id="second">{context.text2}</div>
          </div>
        );
      };
      Grandchild.contextTypes = {
        text1: PropTypes.string,
        text2: PropTypes.string,
      };

      const e = await render(<Parent />, 3);
      expect(e.querySelector('#first').textContent).toBe('purple');
      expect(e.querySelector('#second').textContent).toBe('red');
    });

    itRenders(
      'with a call to componentWillMount before getChildContext',
      async render => {
        if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
          return;
        }
        class WillMountContext extends React.Component {
          getChildContext() {
            return {text: this.state.text};
          }
          UNSAFE_componentWillMount() {
            this.setState({text: 'foo'});
          }
          render() {
            return <Child />;
          }
        }
        WillMountContext.childContextTypes = {text: PropTypes.string};

        const Child = (props, context) => {
          return <div>{context.text}</div>;
        };
        Child.contextTypes = {text: PropTypes.string};

        const e = await render(<WillMountContext />, 2);
        expect(e.textContent).toBe('foo');
      },
    );

    itRenders(
      'if getChildContext exists but childContextTypes is missing with a warning',
      async render => {
        if (gate(flags => flags.disableLegacyContextForFunctionComponents)) {
          return;
        }
        function HopefulChild(props, context) {
          return context.foo || 'nope';
        }
        HopefulChild.contextTypes = {
          foo: PropTypes.string,
        };
        class ForgetfulParent extends React.Component {
          render() {
            return <HopefulChild />;
          }
          getChildContext() {
            return {foo: 'bar'};
          }
        }
        const e = await render(
          <ForgetfulParent />,
          // Some warning is not de-duped and logged again on the client retry render.
          render === clientRenderOnBadMarkup ? 3 : 2,
        );
        expect(e.textContent).toBe('nope');
      },
    );

    itThrowsWhenRendering(
      'if getChildContext returns a value not in childContextTypes',
      render => {
        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
          getChildContext() {
            return {value1: 'foo', value2: 'bar'};
          }
        }
        MyComponent.childContextTypes = {value1: PropTypes.string};
        return render(<MyComponent />);
      },
      'MyComponent.getChildContext(): key "value2" is not defined in childContextTypes.',
    );

    it('warns when childContextTypes is not defined', () => {
      class MyComponent extends React.Component {
        render() {
          return <div />;
        }
        getChildContext() {
          return {value1: 'foo', value2: 'bar'};
        }
      }

      ReactDOMServer.renderToString(<MyComponent />);
      assertConsoleErrorDev([
        'MyComponent.getChildContext(): childContextTypes must be defined in order to use getChildContext().\n' +
          '    in MyComponent (at **)',
      ]);
    });
  });
});

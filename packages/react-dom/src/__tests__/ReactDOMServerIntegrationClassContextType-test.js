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

let React;
let ReactDOMClient;
let ReactDOMServer;

function initModules() {
  // Reset warning cache.
  jest.resetModules();
  React = require('react');
  ReactDOMClient = require('react-dom/client');
  ReactDOMServer = require('react-dom/server');

  // Make them available to the helpers.
  return {
    ReactDOMClient,
    ReactDOMServer,
  };
}

const {resetModules, itRenders} = ReactDOMServerIntegrationUtils(initModules);

describe('ReactDOMServerIntegration', () => {
  beforeEach(() => {
    resetModules();
  });

  describe('class contextType', function () {
    let PurpleContext, RedContext, Context;
    beforeEach(() => {
      Context = React.createContext('none');

      class Parent extends React.Component {
        render() {
          return (
            <Context.Provider value={this.props.text}>
              {this.props.children}
            </Context.Provider>
          );
        }
      }
      PurpleContext = props => <Parent text="purple">{props.children}</Parent>;
      RedContext = props => <Parent text="red">{props.children}</Parent>;
    });

    itRenders('class child with context', async render => {
      class ClassChildWithContext extends React.Component {
        static contextType = Context;
        render() {
          const text = this.context;
          return <div>{text}</div>;
        }
      }

      const e = await render(
        <PurpleContext>
          <ClassChildWithContext />
        </PurpleContext>,
      );
      expect(e.textContent).toBe('purple');
    });

    itRenders('class child without context', async render => {
      class ClassChildWithoutContext extends React.Component {
        render() {
          // this should render blank; context isn't passed to this component.
          return (
            <div>{typeof this.context === 'string' ? this.context : ''}</div>
          );
        }
      }

      const e = await render(
        <PurpleContext>
          <ClassChildWithoutContext />
        </PurpleContext>,
      );
      expect(e.textContent).toBe('');
    });

    itRenders('class child with wrong context', async render => {
      class ClassChildWithWrongContext extends React.Component {
        static contextType = Context;
        render() {
          // this should render blank; context.foo isn't passed to this component.
          return <div id="classWrongChild">{this.context.foo}</div>;
        }
      }

      const e = await render(
        <PurpleContext>
          <ClassChildWithWrongContext />
        </PurpleContext>,
      );
      expect(e.textContent).toBe('');
    });

    itRenders('with context passed through to a grandchild', async render => {
      class Grandchild extends React.Component {
        static contextType = Context;
        render() {
          return <div>{this.context}</div>;
        }
      }

      const Child = props => <Grandchild />;

      const e = await render(
        <PurpleContext>
          <Child />
        </PurpleContext>,
      );
      expect(e.textContent).toBe('purple');
    });

    itRenders('a child context overriding a parent context', async render => {
      class Grandchild extends React.Component {
        static contextType = Context;
        render() {
          return <div>{this.context}</div>;
        }
      }

      const e = await render(
        <PurpleContext>
          <RedContext>
            <Grandchild />
          </RedContext>
        </PurpleContext>,
      );
      expect(e.textContent).toBe('red');
    });

    itRenders('multiple contexts', async render => {
      const Theme = React.createContext('dark');
      const Language = React.createContext('french');
      class Parent extends React.Component {
        render() {
          return (
            <Theme.Provider value="light">
              <Child />
            </Theme.Provider>
          );
        }
      }

      function Child() {
        return (
          <Language.Provider value="english">
            <Grandchild />
          </Language.Provider>
        );
      }

      class ThemeComponent extends React.Component {
        static contextType = Theme;
        render() {
          return <div id="theme">{this.context}</div>;
        }
      }

      class LanguageComponent extends React.Component {
        static contextType = Language;
        render() {
          return <div id="language">{this.context}</div>;
        }
      }

      const Grandchild = props => {
        return (
          <div>
            <ThemeComponent />
            <LanguageComponent />
          </div>
        );
      };

      const e = await render(<Parent />);
      expect(e.querySelector('#theme').textContent).toBe('light');
      expect(e.querySelector('#language').textContent).toBe('english');
    });

    itRenders('nested context unwinding', async render => {
      const Theme = React.createContext('dark');
      const Language = React.createContext('french');

      class ThemeConsumer extends React.Component {
        static contextType = Theme;
        render() {
          return this.props.children(this.context);
        }
      }

      class LanguageConsumer extends React.Component {
        static contextType = Language;
        render() {
          return this.props.children(this.context);
        }
      }

      const App = () => (
        <div>
          <Theme.Provider value="light">
            <Language.Provider value="english">
              <Theme.Provider value="dark">
                <ThemeConsumer>
                  {theme => <div id="theme1">{theme}</div>}
                </ThemeConsumer>
              </Theme.Provider>
              <ThemeConsumer>
                {theme => <div id="theme2">{theme}</div>}
              </ThemeConsumer>
              <Language.Provider value="sanskrit">
                <Theme.Provider value="blue">
                  <Theme.Provider value="red">
                    <LanguageConsumer>
                      {() => (
                        <Language.Provider value="chinese">
                          <Language.Provider value="hungarian" />
                          <LanguageConsumer>
                            {language => <div id="language1">{language}</div>}
                          </LanguageConsumer>
                        </Language.Provider>
                      )}
                    </LanguageConsumer>
                  </Theme.Provider>
                  <LanguageConsumer>
                    {language => (
                      <>
                        <ThemeConsumer>
                          {theme => <div id="theme3">{theme}</div>}
                        </ThemeConsumer>
                        <div id="language2">{language}</div>
                      </>
                    )}
                  </LanguageConsumer>
                </Theme.Provider>
              </Language.Provider>
            </Language.Provider>
          </Theme.Provider>
          <LanguageConsumer>
            {language => <div id="language3">{language}</div>}
          </LanguageConsumer>
        </div>
      );
      const e = await render(<App />);
      expect(e.querySelector('#theme1').textContent).toBe('dark');
      expect(e.querySelector('#theme2').textContent).toBe('light');
      expect(e.querySelector('#theme3').textContent).toBe('blue');
      expect(e.querySelector('#language1').textContent).toBe('chinese');
      expect(e.querySelector('#language2').textContent).toBe('sanskrit');
      expect(e.querySelector('#language3').textContent).toBe('french');
    });
  });
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');

let React;
let ReactDOMClient;
let ReactDOMServer;

describe('ReactDOMServerIntegration', () => {
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

  const {resetModules, expectMarkupMismatch, expectMarkupMatch} =
    ReactDOMServerIntegrationUtils(initModules);
  beforeEach(() => {
    resetModules();
  });

  describe('reconnecting to server markup', function () {
    let EmptyComponent;
    beforeEach(() => {
      EmptyComponent = class extends React.Component {
        render() {
          return null;
        }
      };
    });

    describe('elements', function () {
      describe('reconnecting different component implementations', function () {
        let ES6ClassComponent, PureComponent, bareElement;
        beforeEach(() => {
          // try each type of component on client and server.
          ES6ClassComponent = class extends React.Component {
            render() {
              return <div id={this.props.id} />;
            }
          };
          PureComponent = props => <div id={props.id} />;
          bareElement = <div id="foobarbaz" />;
        });

        it('should reconnect ES6 Class to ES6 Class', () =>
          expectMarkupMatch(
            <ES6ClassComponent id="foobarbaz" />,
            <ES6ClassComponent id="foobarbaz" />,
          ));

        it('should reconnect Pure Component to ES6 Class', () =>
          expectMarkupMatch(
            <ES6ClassComponent id="foobarbaz" />,
            <PureComponent id="foobarbaz" />,
          ));

        it('should reconnect Bare Element to ES6 Class', () =>
          expectMarkupMatch(<ES6ClassComponent id="foobarbaz" />, bareElement));

        it('should reconnect ES6 Class to Pure Component', () =>
          expectMarkupMatch(
            <PureComponent id="foobarbaz" />,
            <ES6ClassComponent id="foobarbaz" />,
          ));

        it('should reconnect Pure Component to Pure Component', () =>
          expectMarkupMatch(
            <PureComponent id="foobarbaz" />,
            <PureComponent id="foobarbaz" />,
          ));

        it('should reconnect Bare Element to Pure Component', () =>
          expectMarkupMatch(<PureComponent id="foobarbaz" />, bareElement));

        it('should reconnect ES6 Class to Bare Element', () =>
          expectMarkupMatch(bareElement, <ES6ClassComponent id="foobarbaz" />));

        it('should reconnect Pure Component to Bare Element', () =>
          expectMarkupMatch(bareElement, <PureComponent id="foobarbaz" />));

        it('should reconnect Bare Element to Bare Element', () =>
          expectMarkupMatch(bareElement, bareElement));
      });

      it('should error reconnecting different element types', () =>
        expectMarkupMismatch(<div />, <span />));

      it('should error reconnecting fewer root children', () =>
        expectMarkupMismatch(<span key="a" />, [
          <span key="a" />,
          <span key="b" />,
        ]));

      it('should error reconnecting missing attributes', () =>
        expectMarkupMismatch(<div id="foo" />, <div />));

      it('should error reconnecting added attributes', () =>
        expectMarkupMismatch(<div />, <div id="foo" />));

      it('should error reconnecting different attribute values', () =>
        expectMarkupMismatch(<div id="foo" />, <div id="bar" />));

      it('should error reconnecting different element types of children', () =>
        expectMarkupMismatch(
          <div>
            <div />
          </div>,
          <div suppressHydrationWarning={true}>
            <span />
          </div>,
        ));

      it('can explicitly ignore errors reconnecting missing attributes', () =>
        expectMarkupMatch(
          <div id="foo" />,
          <div suppressHydrationWarning={true} />,
        ));

      it('can explicitly ignore errors reconnecting added attributes', () =>
        expectMarkupMatch(
          <div />,
          <div id="foo" suppressHydrationWarning={true} />,
        ));

      it('can explicitly ignore errors reconnecting different attribute values', () =>
        expectMarkupMatch(
          <div id="foo" />,
          <div id="bar" suppressHydrationWarning={true} />,
        ));

      it('can not deeply ignore errors reconnecting different attribute values', () =>
        expectMarkupMismatch(
          <div>
            <div id="foo" />
          </div>,
          <div suppressHydrationWarning={true}>
            <div id="bar" />
          </div>,
        ));
    });

    describe('inline styles', function () {
      it('should error reconnecting missing style attribute', () =>
        expectMarkupMismatch(<div style={{width: '1px'}} />, <div />));

      it('should error reconnecting added style attribute', () =>
        expectMarkupMismatch(<div />, <div style={{width: '1px'}} />));

      it('should error reconnecting empty style attribute', () =>
        expectMarkupMismatch(
          <div style={{width: '1px'}} />,
          <div style={{}} />,
        ));

      it('should error reconnecting added style values', () =>
        expectMarkupMismatch(
          <div style={{}} />,
          <div style={{width: '1px'}} />,
        ));

      it('should error reconnecting different style values', () =>
        expectMarkupMismatch(
          <div style={{width: '1px'}} />,
          <div style={{width: '2px'}} />,
        ));

      it('should reconnect number and string versions of a number', () =>
        expectMarkupMatch(
          <div style={{width: '1px', height: 2}} />,
          <div style={{width: 1, height: '2px'}} />,
        ));

      it('should error reconnecting reordered style values', () =>
        expectMarkupMismatch(
          <div style={{width: '1px', fontSize: '2px'}} />,
          <div style={{fontSize: '2px', width: '1px'}} />,
        ));

      it('can explicitly ignore errors reconnecting added style values', () =>
        expectMarkupMatch(
          <div style={{}} />,
          <div style={{width: '1px'}} suppressHydrationWarning={true} />,
        ));

      it('can explicitly ignore reconnecting different style values', () =>
        expectMarkupMatch(
          <div style={{width: '1px'}} />,
          <div style={{width: '2px'}} suppressHydrationWarning={true} />,
        ));
    });

    describe('text nodes', function () {
      it('should error reconnecting different text', () =>
        expectMarkupMismatch(<div>Text</div>, <div>Other Text</div>));

      it('should reconnect a div with a number and string version of number', () =>
        expectMarkupMatch(<div>{2}</div>, <div>2</div>));

      it('should error reconnecting different numbers', () =>
        expectMarkupMismatch(<div>{2}</div>, <div>{3}</div>));

      it('should error reconnecting different number from text', () =>
        expectMarkupMismatch(<div>{2}</div>, <div>3</div>));

      it('should error reconnecting different text in two code blocks', () =>
        expectMarkupMismatch(
          <div>
            {'Text1'}
            {'Text2'}
          </div>,
          <div>
            {'Text1'}
            {'Text3'}
          </div>,
        ));

      it('can explicitly ignore reconnecting different text', () =>
        expectMarkupMatch(
          <div>Text</div>,
          <div suppressHydrationWarning={true}>Other Text</div>,
        ));

      it('can explicitly ignore reconnecting different text in two code blocks', () =>
        expectMarkupMatch(
          <div suppressHydrationWarning={true}>
            {'Text1'}
            {'Text2'}
          </div>,
          <div suppressHydrationWarning={true}>
            {'Text1'}
            {'Text3'}
          </div>,
        ));
    });

    describe('element trees and children', function () {
      it('should error reconnecting missing children', () =>
        expectMarkupMismatch(
          <div>
            <div />
          </div>,
          <div />,
        ));

      it('should error reconnecting added children', () =>
        expectMarkupMismatch(
          <div />,
          <div>
            <div />
          </div>,
        ));

      it('should error reconnecting more children', () =>
        expectMarkupMismatch(
          <div>
            <div />
          </div>,
          <div>
            <div />
            <div />
          </div>,
        ));

      it('should error reconnecting fewer children', () =>
        expectMarkupMismatch(
          <div>
            <div />
            <div />
          </div>,
          <div>
            <div />
          </div>,
        ));

      it('should error reconnecting reordered children', () =>
        expectMarkupMismatch(
          <div>
            <div />
            <span />
          </div>,
          <div>
            <span />
            <div />
          </div>,
        ));

      it('should error reconnecting a div with children separated by whitespace on the client', () =>
        expectMarkupMismatch(
          <div id="parent">
            <div id="child1" />
            <div id="child2" />
          </div>,
          // prettier-ignore
          <div id="parent"><div id="child1" />      <div id="child2" /></div>,
        ));

      it('should error reconnecting a div with children separated by different whitespace on the server', () =>
        expectMarkupMismatch(
          // prettier-ignore
          <div id="parent"><div id="child1" />      <div id="child2" /></div>,
          <div id="parent">
            <div id="child1" />
            <div id="child2" />
          </div>,
        ));

      it('should error reconnecting a div with children separated by different whitespace', () =>
        expectMarkupMismatch(
          <div id="parent">
            <div id="child1" /> <div id="child2" />
          </div>,
          // prettier-ignore
          <div id="parent"><div id="child1" />      <div id="child2" /></div>,
        ));

      it('can distinguish an empty component from a dom node', () =>
        expectMarkupMismatch(
          <div>
            <span />
          </div>,
          <div>
            <EmptyComponent />
          </div>,
        ));

      it('can distinguish an empty component from an empty text component', () =>
        expectMarkupMatch(
          <div>
            <EmptyComponent />
          </div>,
          <div>{''}</div>,
        ));

      it('can not ignore reconnecting more children', () =>
        expectMarkupMismatch(
          <div>
            <div />
          </div>,
          <div suppressHydrationWarning={true}>
            <div />
            <div />
          </div>,
        ));

      it('can not ignore reconnecting fewer children', () =>
        expectMarkupMismatch(
          <div>
            <div />
            <div />
          </div>,
          <div suppressHydrationWarning={true}>
            <div />
          </div>,
        ));

      it('can not ignore reconnecting reordered children', () =>
        expectMarkupMismatch(
          <div suppressHydrationWarning={true}>
            <div />
            <span />
          </div>,
          <div suppressHydrationWarning={true}>
            <span />
            <div />
          </div>,
        ));

      it('can not deeply ignore reconnecting reordered children', () =>
        expectMarkupMismatch(
          <div suppressHydrationWarning={true}>
            <div>
              <div />
              <span />
            </div>
          </div>,
          <div suppressHydrationWarning={true}>
            <div>
              <span />
              <div />
            </div>
          </div>,
        ));
    });

    // Markup Mismatches: misc
    it('should error reconnecting a div with different dangerouslySetInnerHTML', () =>
      expectMarkupMismatch(
        <div dangerouslySetInnerHTML={{__html: "<span id='child1'/>"}} />,
        <div dangerouslySetInnerHTML={{__html: "<span id='child2'/>"}} />,
      ));

    it('should error reconnecting a div with different text dangerouslySetInnerHTML', () =>
      expectMarkupMismatch(
        <div dangerouslySetInnerHTML={{__html: 'foo'}} />,
        <div dangerouslySetInnerHTML={{__html: 'bar'}} />,
      ));

    it('should error reconnecting a div with different number dangerouslySetInnerHTML', () =>
      expectMarkupMismatch(
        <div dangerouslySetInnerHTML={{__html: 10}} />,
        <div dangerouslySetInnerHTML={{__html: 20}} />,
      ));

    it('should error reconnecting a div with different object dangerouslySetInnerHTML', () =>
      expectMarkupMismatch(
        <div
          dangerouslySetInnerHTML={{
            __html: {
              toString() {
                return 'hi';
              },
            },
          }}
        />,
        <div
          dangerouslySetInnerHTML={{
            __html: {
              toString() {
                return 'bye';
              },
            },
          }}
        />,
      ));

    it('can explicitly ignore reconnecting a div with different dangerouslySetInnerHTML', () =>
      expectMarkupMatch(
        <div dangerouslySetInnerHTML={{__html: "<span id='child1'/>"}} />,
        <div
          dangerouslySetInnerHTML={{__html: "<span id='child2'/>"}}
          suppressHydrationWarning={true}
        />,
      ));
  });
});

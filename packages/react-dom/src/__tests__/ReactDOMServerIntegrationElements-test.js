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

const TEXT_NODE_TYPE = 3;

let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let assertConsoleErrorDev;

function initModules() {
  jest.resetModules();
  React = require('react');
  ReactDOM = require('react-dom');
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
  serverRender,
  streamRender,
  clientCleanRender,
  clientRenderOnServerString,
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

  describe('elements and children', function () {
    function expectNode(node, type, value) {
      expect(node).not.toBe(null);
      expect(node.nodeType).toBe(type);
      expect(node.nodeValue).toMatch(value);
    }

    function expectTextNode(node, text) {
      expectNode(node, TEXT_NODE_TYPE, text);
    }

    describe('text children', function () {
      itRenders('a div with text', async render => {
        const e = await render(<div>Text</div>);
        expect(e.tagName).toBe('DIV');
        expect(e.childNodes.length).toBe(1);
        expectNode(e.firstChild, TEXT_NODE_TYPE, 'Text');
      });

      itRenders('a div with text with flanking whitespace', async render => {
        // prettier-ignore
        const e = await render(<div>  Text </div>);
        expect(e.childNodes.length).toBe(1);
        expectNode(e.childNodes[0], TEXT_NODE_TYPE, '  Text ');
      });

      itRenders('a div with an empty text child', async render => {
        const e = await render(<div>{''}</div>);
        expect(e.childNodes.length).toBe(0);
      });

      itRenders('a div with multiple empty text children', async render => {
        const e = await render(
          <div>
            {''}
            {''}
            {''}
          </div>,
        );
        expect(e.childNodes.length).toBe(0);
        expect(e.textContent).toBe('');
      });

      itRenders('a div with multiple whitespace children', async render => {
        // prettier-ignore
        const e = await render(<div>{' '}{' '}{' '}</div>);
        if (
          render === serverRender ||
          render === clientRenderOnServerString ||
          render === streamRender
        ) {
          // For plain server markup result we have comments between.
          // If we're able to hydrate, they remain.
          expect(e.childNodes.length).toBe(5);
          expectTextNode(e.childNodes[0], ' ');
          expectTextNode(e.childNodes[2], ' ');
          expectTextNode(e.childNodes[4], ' ');
        } else {
          expect(e.childNodes.length).toBe(3);
          expectTextNode(e.childNodes[0], ' ');
          expectTextNode(e.childNodes[1], ' ');
          expectTextNode(e.childNodes[2], ' ');
        }
      });

      itRenders('a div with text sibling to a node', async render => {
        const e = await render(
          <div>
            Text<span>More Text</span>
          </div>,
        );
        expect(e.childNodes.length).toBe(2);
        const spanNode = e.childNodes[1];
        expectTextNode(e.childNodes[0], 'Text');
        expect(spanNode.tagName).toBe('SPAN');
        expect(spanNode.childNodes.length).toBe(1);
        expectNode(spanNode.firstChild, TEXT_NODE_TYPE, 'More Text');
      });

      itRenders('a non-standard element with text', async render => {
        // This test suite generally assumes that we get exactly
        // the same warnings (or none) for all scenarios including
        // SSR + innerHTML, hydration, and client-side rendering.
        // However this particular warning fires only when creating
        // DOM nodes on the client side. We force it to fire early
        // so that it gets deduplicated later, and doesn't fail the test.
        ReactDOM.flushSync(() => {
          const root = ReactDOMClient.createRoot(document.createElement('div'));
          root.render(<nonstandard />);
        });
        assertConsoleErrorDev([
          'The tag <nonstandard> is unrecognized in this browser. ' +
            'If you meant to render a React component, start its name with an uppercase letter.\n' +
            '    in nonstandard (at **)',
        ]);

        const e = await render(<nonstandard>Text</nonstandard>);
        expect(e.tagName).toBe('NONSTANDARD');
        expect(e.childNodes.length).toBe(1);
        expectNode(e.firstChild, TEXT_NODE_TYPE, 'Text');
      });

      itRenders('a custom element with text', async render => {
        const e = await render(<custom-element>Text</custom-element>);
        expect(e.tagName).toBe('CUSTOM-ELEMENT');
        expect(e.childNodes.length).toBe(1);
        expectNode(e.firstChild, TEXT_NODE_TYPE, 'Text');
      });

      itRenders('a leading blank child with a text sibling', async render => {
        const e = await render(<div>{''}foo</div>);
        expect(e.childNodes.length).toBe(1);
        expectTextNode(e.childNodes[0], 'foo');
      });

      itRenders('a trailing blank child with a text sibling', async render => {
        const e = await render(<div>foo{''}</div>);
        expect(e.childNodes.length).toBe(1);
        expectTextNode(e.childNodes[0], 'foo');
      });

      itRenders('an element with two text children', async render => {
        const e = await render(
          <div>
            {'foo'}
            {'bar'}
          </div>,
        );
        if (
          render === serverRender ||
          render === clientRenderOnServerString ||
          render === streamRender
        ) {
          // In the server render output there's a comment between them.
          expect(e.childNodes.length).toBe(3);
          expectTextNode(e.childNodes[0], 'foo');
          expectTextNode(e.childNodes[2], 'bar');
        } else {
          expect(e.childNodes.length).toBe(2);
          expectTextNode(e.childNodes[0], 'foo');
          expectTextNode(e.childNodes[1], 'bar');
        }
      });

      itRenders(
        'a component returning text node between two text nodes',
        async render => {
          const B = () => 'b';
          const e = await render(
            <div>
              {'a'}
              <B />
              {'c'}
            </div>,
          );
          if (
            render === serverRender ||
            render === clientRenderOnServerString ||
            render === streamRender
          ) {
            // In the server render output there's a comment between them.
            expect(e.childNodes.length).toBe(5);
            expectTextNode(e.childNodes[0], 'a');
            expectTextNode(e.childNodes[2], 'b');
            expectTextNode(e.childNodes[4], 'c');
          } else {
            expect(e.childNodes.length).toBe(3);
            expectTextNode(e.childNodes[0], 'a');
            expectTextNode(e.childNodes[1], 'b');
            expectTextNode(e.childNodes[2], 'c');
          }
        },
      );

      itRenders('a tree with sibling host and text nodes', async render => {
        class X extends React.Component {
          render() {
            return [null, [<Y key="1" />], false];
          }
        }

        function Y() {
          return [<Z key="1" />, ['c']];
        }

        function Z() {
          return null;
        }

        const e = await render(
          <div>
            {[['a'], 'b']}
            <div>
              <X key="1" />d
            </div>
            e
          </div>,
        );
        if (
          render === serverRender ||
          render === streamRender ||
          render === clientRenderOnServerString
        ) {
          // In the server render output there's comments between text nodes.
          expect(e.childNodes.length).toBe(5);
          expectTextNode(e.childNodes[0], 'a');
          expectTextNode(e.childNodes[2], 'b');
          expect(e.childNodes[3].childNodes.length).toBe(3);
          expectTextNode(e.childNodes[3].childNodes[0], 'c');
          expectTextNode(e.childNodes[3].childNodes[2], 'd');
          expectTextNode(e.childNodes[4], 'e');
        } else {
          expect(e.childNodes.length).toBe(4);
          expectTextNode(e.childNodes[0], 'a');
          expectTextNode(e.childNodes[1], 'b');
          expect(e.childNodes[2].childNodes.length).toBe(2);
          expectTextNode(e.childNodes[2].childNodes[0], 'c');
          expectTextNode(e.childNodes[2].childNodes[1], 'd');
          expectTextNode(e.childNodes[3], 'e');
        }
      });
    });

    describe('number children', function () {
      itRenders('a number as single child', async render => {
        const e = await render(<div>{3}</div>);
        expect(e.textContent).toBe('3');
      });

      // zero is falsey, so it could look like no children if the code isn't careful.
      itRenders('zero as single child', async render => {
        const e = await render(<div>{0}</div>);
        expect(e.textContent).toBe('0');
      });

      itRenders('an element with number and text children', async render => {
        const e = await render(
          <div>
            {'foo'}
            {40}
          </div>,
        );
        // with Fiber, there are just two text nodes.
        if (
          render === serverRender ||
          render === clientRenderOnServerString ||
          render === streamRender
        ) {
          // In the server markup there's a comment between.
          expect(e.childNodes.length).toBe(3);
          expectTextNode(e.childNodes[0], 'foo');
          expectTextNode(e.childNodes[2], '40');
        } else {
          expect(e.childNodes.length).toBe(2);
          expectTextNode(e.childNodes[0], 'foo');
          expectTextNode(e.childNodes[1], '40');
        }
      });
    });

    describe('null, false, and undefined children', function () {
      itRenders('null single child as blank', async render => {
        const e = await render(<div>{null}</div>);
        expect(e.childNodes.length).toBe(0);
      });

      itRenders('false single child as blank', async render => {
        const e = await render(<div>{false}</div>);
        expect(e.childNodes.length).toBe(0);
      });

      itRenders('undefined single child as blank', async render => {
        const e = await render(<div>{undefined}</div>);
        expect(e.childNodes.length).toBe(0);
      });

      itRenders('a null component children as empty', async render => {
        const NullComponent = () => null;
        const e = await render(
          <div>
            <NullComponent />
          </div>,
        );
        expect(e.childNodes.length).toBe(0);
      });

      itRenders('null children as blank', async render => {
        const e = await render(<div>{null}foo</div>);
        expect(e.childNodes.length).toBe(1);
        expectTextNode(e.childNodes[0], 'foo');
      });

      itRenders('false children as blank', async render => {
        const e = await render(<div>{false}foo</div>);
        expect(e.childNodes.length).toBe(1);
        expectTextNode(e.childNodes[0], 'foo');
      });

      itRenders('null and false children together as blank', async render => {
        const e = await render(
          <div>
            {false}
            {null}foo{null}
            {false}
          </div>,
        );
        expect(e.childNodes.length).toBe(1);
        expectTextNode(e.childNodes[0], 'foo');
      });

      itRenders('only null and false children as blank', async render => {
        const e = await render(
          <div>
            {false}
            {null}
            {null}
            {false}
          </div>,
        );
        expect(e.childNodes.length).toBe(0);
      });
    });

    describe('elements with implicit namespaces', function () {
      itRenders('an svg element', async render => {
        const e = await render(<svg />);
        expect(e.childNodes.length).toBe(0);
        expect(e.tagName).toBe('svg');
        expect(e.namespaceURI).toBe('http://www.w3.org/2000/svg');
      });

      itRenders('svg child element with an attribute', async render => {
        const e = await render(<svg viewBox="0 0 0 0" />);
        expect(e.childNodes.length).toBe(0);
        expect(e.tagName).toBe('svg');
        expect(e.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(e.getAttribute('viewBox')).toBe('0 0 0 0');
      });

      itRenders(
        'svg child element with a namespace attribute',
        async render => {
          let e = await render(
            <svg>
              <image xlinkHref="http://i.imgur.com/w7GCRPb.png" />
            </svg>,
          );
          e = e.firstChild;
          expect(e.childNodes.length).toBe(0);
          expect(e.tagName).toBe('image');
          expect(e.namespaceURI).toBe('http://www.w3.org/2000/svg');
          expect(e.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
            'http://i.imgur.com/w7GCRPb.png',
          );
        },
      );

      itRenders('svg child element with a badly cased alias', async render => {
        let e = await render(
          <svg>
            <image xlinkhref="http://i.imgur.com/w7GCRPb.png" />
          </svg>,
          1,
        );
        e = e.firstChild;
        expect(e.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
          false,
        );
        expect(e.getAttribute('xlinkhref')).toBe(
          'http://i.imgur.com/w7GCRPb.png',
        );
      });

      itRenders('svg element with a tabIndex attribute', async render => {
        const e = await render(<svg tabIndex="1" />);
        expect(e.tabIndex).toBe(1);
      });

      itRenders(
        'svg element with a badly cased tabIndex attribute',
        async render => {
          const e = await render(<svg tabindex="1" />, 1);
          expect(e.tabIndex).toBe(1);
        },
      );

      itRenders('svg element with a mixed case name', async render => {
        let e = await render(
          <svg>
            <filter>
              <feMorphology />
            </filter>
          </svg>,
        );
        e = e.firstChild.firstChild;
        expect(e.childNodes.length).toBe(0);
        expect(e.tagName).toBe('feMorphology');
        expect(e.namespaceURI).toBe('http://www.w3.org/2000/svg');
      });

      itRenders('a math element', async render => {
        const e = await render(<math />);
        expect(e.childNodes.length).toBe(0);
        expect(e.tagName).toBe('math');
        expect(e.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
      });
    });
    // specially wrapped components
    // (see the big switch near the beginning ofReactDOMComponent.mountComponent)
    itRenders('an img', async render => {
      const e = await render(<img />);
      expect(e.childNodes.length).toBe(0);
      expect(e.nextSibling).toBe(null);
      expect(e.tagName).toBe('IMG');
    });

    itRenders('a button', async render => {
      const e = await render(<button />);
      expect(e.childNodes.length).toBe(0);
      expect(e.nextSibling).toBe(null);
      expect(e.tagName).toBe('BUTTON');
    });

    itRenders('a div with dangerouslySetInnerHTML number', async render => {
      // Put dangerouslySetInnerHTML one level deeper because otherwise
      // hydrating from a bad markup would cause a mismatch (since we don't
      // patch dangerouslySetInnerHTML as text content).
      const e = (
        await render(
          <div>
            <span dangerouslySetInnerHTML={{__html: 0}} />
          </div>,
        )
      ).firstChild;
      expect(e.childNodes.length).toBe(1);
      expect(e.firstChild.nodeType).toBe(TEXT_NODE_TYPE);
      expect(e.textContent).toBe('0');
    });

    itRenders('a div with dangerouslySetInnerHTML boolean', async render => {
      // Put dangerouslySetInnerHTML one level deeper because otherwise
      // hydrating from a bad markup would cause a mismatch (since we don't
      // patch dangerouslySetInnerHTML as text content).
      const e = (
        await render(
          <div>
            <span dangerouslySetInnerHTML={{__html: false}} />
          </div>,
        )
      ).firstChild;
      expect(e.childNodes.length).toBe(1);
      expect(e.firstChild.nodeType).toBe(TEXT_NODE_TYPE);
      expect(e.firstChild.data).toBe('false');
    });

    itRenders(
      'a div with dangerouslySetInnerHTML text string',
      async render => {
        // Put dangerouslySetInnerHTML one level deeper because otherwise
        // hydrating from a bad markup would cause a mismatch (since we don't
        // patch dangerouslySetInnerHTML as text content).
        const e = (
          await render(
            <div>
              <span dangerouslySetInnerHTML={{__html: 'hello'}} />
            </div>,
          )
        ).firstChild;
        expect(e.childNodes.length).toBe(1);
        expect(e.firstChild.nodeType).toBe(TEXT_NODE_TYPE);
        expect(e.textContent).toBe('hello');
      },
    );

    itRenders(
      'a div with dangerouslySetInnerHTML element string',
      async render => {
        const e = await render(
          <div dangerouslySetInnerHTML={{__html: "<span id='child'/>"}} />,
        );
        expect(e.childNodes.length).toBe(1);
        expect(e.firstChild.tagName).toBe('SPAN');
        expect(e.firstChild.getAttribute('id')).toBe('child');
        expect(e.firstChild.childNodes.length).toBe(0);
      },
    );

    itRenders('a div with dangerouslySetInnerHTML object', async render => {
      const obj = {
        toString() {
          return "<span id='child'/>";
        },
      };
      const e = await render(<div dangerouslySetInnerHTML={{__html: obj}} />);
      expect(e.childNodes.length).toBe(1);
      expect(e.firstChild.tagName).toBe('SPAN');
      expect(e.firstChild.getAttribute('id')).toBe('child');
      expect(e.firstChild.childNodes.length).toBe(0);
    });

    itRenders(
      'a div with dangerouslySetInnerHTML set to null',
      async render => {
        const e = await render(
          <div dangerouslySetInnerHTML={{__html: null}} />,
        );
        expect(e.childNodes.length).toBe(0);
      },
    );

    itRenders(
      'a div with dangerouslySetInnerHTML set to undefined',
      async render => {
        const e = await render(
          <div dangerouslySetInnerHTML={{__html: undefined}} />,
        );
        expect(e.childNodes.length).toBe(0);
      },
    );

    itRenders('a noscript with children', async render => {
      const e = await render(
        <noscript>
          <div>Enable JavaScript to run this app.</div>
        </noscript>,
      );
      if (render === clientCleanRender) {
        // On the client we ignore the contents of a noscript
        expect(e.childNodes.length).toBe(0);
      } else {
        // On the server or when hydrating the content should be correct
        expect(e.childNodes.length).toBe(1);
        expect(e.firstChild.textContent).toBe(
          '<div>Enable JavaScript to run this app.</div>',
        );
      }
    });

    describe('newline-eating elements', function () {
      itRenders(
        'a newline-eating tag with content not starting with \\n',
        async render => {
          const e = await render(<pre>Hello</pre>);
          expect(e.textContent).toBe('Hello');
        },
      );
      itRenders(
        'a newline-eating tag with content starting with \\n',
        async render => {
          const e = await render(<pre>{'\nHello'}</pre>);
          expect(e.textContent).toBe('\nHello');
        },
      );
      itRenders('a normal tag with content starting with \\n', async render => {
        const e = await render(<div>{'\nHello'}</div>);
        expect(e.textContent).toBe('\nHello');
      });
    });

    describe('different component implementations', function () {
      function checkFooDiv(e) {
        expect(e.childNodes.length).toBe(1);
        expectNode(e.firstChild, TEXT_NODE_TYPE, 'foo');
      }

      itRenders('stateless components', async render => {
        const FunctionComponent = () => <div>foo</div>;
        checkFooDiv(await render(<FunctionComponent />));
      });

      itRenders('ES6 class components', async render => {
        class ClassComponent extends React.Component {
          render() {
            return <div>foo</div>;
          }
        }
        checkFooDiv(await render(<ClassComponent />));
      });

      itThrowsWhenRendering(
        'factory components',
        async render => {
          const FactoryComponent = () => {
            return {
              render: function () {
                return <div>foo</div>;
              },
            };
          };
          await render(<FactoryComponent />, 1);
        },
        'Objects are not valid as a React child (found: object with keys {render})',
      );
    });

    describe('component hierarchies', function () {
      itRenders('single child hierarchies of components', async render => {
        const Component = props => <div>{props.children}</div>;
        let e = await render(
          <Component>
            <Component>
              <Component>
                <Component />
              </Component>
            </Component>
          </Component>,
        );
        for (let i = 0; i < 3; i++) {
          expect(e.tagName).toBe('DIV');
          expect(e.childNodes.length).toBe(1);
          e = e.firstChild;
        }
        expect(e.tagName).toBe('DIV');
        expect(e.childNodes.length).toBe(0);
      });

      itRenders('multi-child hierarchies of components', async render => {
        const Component = props => <div>{props.children}</div>;
        const e = await render(
          <Component>
            <Component>
              <Component />
              <Component />
            </Component>
            <Component>
              <Component />
              <Component />
            </Component>
          </Component>,
        );
        expect(e.tagName).toBe('DIV');
        expect(e.childNodes.length).toBe(2);
        for (let i = 0; i < 2; i++) {
          const child = e.childNodes[i];
          expect(child.tagName).toBe('DIV');
          expect(child.childNodes.length).toBe(2);
          for (let j = 0; j < 2; j++) {
            const grandchild = child.childNodes[j];
            expect(grandchild.tagName).toBe('DIV');
            expect(grandchild.childNodes.length).toBe(0);
          }
        }
      });

      itRenders('a div with a child', async render => {
        const e = await render(
          <div id="parent">
            <div id="child" />
          </div>,
        );
        expect(e.id).toBe('parent');
        expect(e.childNodes.length).toBe(1);
        expect(e.childNodes[0].id).toBe('child');
        expect(e.childNodes[0].childNodes.length).toBe(0);
      });

      itRenders('a div with multiple children', async render => {
        const e = await render(
          <div id="parent">
            <div id="child1" />
            <div id="child2" />
          </div>,
        );
        expect(e.id).toBe('parent');
        expect(e.childNodes.length).toBe(2);
        expect(e.childNodes[0].id).toBe('child1');
        expect(e.childNodes[0].childNodes.length).toBe(0);
        expect(e.childNodes[1].id).toBe('child2');
        expect(e.childNodes[1].childNodes.length).toBe(0);
      });

      itRenders(
        'a div with multiple children separated by whitespace',
        async render => {
          const e = await render(
            <div id="parent">
              <div id="child1" /> <div id="child2" />
            </div>,
          );
          expect(e.id).toBe('parent');
          expect(e.childNodes.length).toBe(3);
          const child1 = e.childNodes[0];
          const textNode = e.childNodes[1];
          const child2 = e.childNodes[2];
          expect(child1.id).toBe('child1');
          expect(child1.childNodes.length).toBe(0);
          expectTextNode(textNode, ' ');
          expect(child2.id).toBe('child2');
          expect(child2.childNodes.length).toBe(0);
        },
      );

      itRenders(
        'a div with a single child surrounded by whitespace',
        async render => {
          // prettier-ignore
          const e = await render(<div id="parent">  <div id="child" />   </div>);
          expect(e.childNodes.length).toBe(3);
          const textNode1 = e.childNodes[0];
          const child = e.childNodes[1];
          const textNode2 = e.childNodes[2];
          expect(e.id).toBe('parent');
          expectTextNode(textNode1, '  ');
          expect(child.id).toBe('child');
          expect(child.childNodes.length).toBe(0);
          expectTextNode(textNode2, '   ');
        },
      );

      itRenders('a composite with multiple children', async render => {
        const Component = props => props.children;
        const e = await render(
          <Component>{['a', 'b', [undefined], [[false, 'c']]]}</Component>,
        );

        const parent = e.parentNode;
        if (
          render === serverRender ||
          render === clientRenderOnServerString ||
          render === streamRender
        ) {
          // For plain server markup result we have comments between.
          // If we're able to hydrate, they remain.
          expect(parent.childNodes.length).toBe(5);
          expectTextNode(parent.childNodes[0], 'a');
          expectTextNode(parent.childNodes[2], 'b');
          expectTextNode(parent.childNodes[4], 'c');
        } else {
          expect(parent.childNodes.length).toBe(3);
          expectTextNode(parent.childNodes[0], 'a');
          expectTextNode(parent.childNodes[1], 'b');
          expectTextNode(parent.childNodes[2], 'c');
        }
      });
    });

    describe('escaping >, <, and &', function () {
      itRenders('>,<, and & as single child', async render => {
        const e = await render(<div>{'<span>Text&quot;</span>'}</div>);
        expect(e.childNodes.length).toBe(1);
        expectNode(e.firstChild, TEXT_NODE_TYPE, '<span>Text&quot;</span>');
      });

      itRenders('>,<, and & as multiple children', async render => {
        const e = await render(
          <div>
            {'<span>Text1&quot;</span>'}
            {'<span>Text2&quot;</span>'}
          </div>,
        );
        if (
          render === serverRender ||
          render === clientRenderOnServerString ||
          render === streamRender
        ) {
          expect(e.childNodes.length).toBe(3);
          expectTextNode(e.childNodes[0], '<span>Text1&quot;</span>');
          expectTextNode(e.childNodes[2], '<span>Text2&quot;</span>');
        } else {
          expect(e.childNodes.length).toBe(2);
          expectTextNode(e.childNodes[0], '<span>Text1&quot;</span>');
          expectTextNode(e.childNodes[1], '<span>Text2&quot;</span>');
        }
      });
    });

    describe('carriage return and null character', () => {
      // HTML parsing normalizes CR and CRLF to LF.
      // It also ignores null character.
      // https://www.w3.org/TR/html5/single-page.html#preprocessing-the-input-stream
      // If we have a mismatch, it might be caused by that (and should not be reported).
      // We won't be patching up in this case as that matches our past behavior.

      itRenders(
        'an element with one text child with special characters',
        async render => {
          const e = await render(<div>{'foo\rbar\r\nbaz\nqux\u0000'}</div>);
          if (
            render === serverRender ||
            render === streamRender ||
            render === clientRenderOnServerString
          ) {
            expect(e.childNodes.length).toBe(1);
            // Everything becomes LF when parsed from server HTML or hydrated.
            // Null character is ignored.
            expectNode(e.childNodes[0], TEXT_NODE_TYPE, 'foo\nbar\nbaz\nqux');
          } else {
            expect(e.childNodes.length).toBe(1);
            // Client rendering uses JS value with CR.
            // Null character stays.

            expectNode(
              e.childNodes[0],
              TEXT_NODE_TYPE,
              'foo\rbar\r\nbaz\nqux\u0000',
            );
          }
        },
      );

      itRenders(
        'an element with two text children with special characters',
        async render => {
          const e = await render(
            <div>
              {'foo\rbar'}
              {'\r\nbaz\nqux\u0000'}
            </div>,
          );
          if (
            render === serverRender ||
            render === streamRender ||
            render === clientRenderOnServerString
          ) {
            // We have three nodes because there is a comment between them.
            expect(e.childNodes.length).toBe(3);
            // Everything becomes LF when parsed from server HTML or hydrated.
            // Null character is ignored.
            expectNode(e.childNodes[0], TEXT_NODE_TYPE, 'foo\nbar');
            expectNode(e.childNodes[2], TEXT_NODE_TYPE, '\nbaz\nqux');
          } else if (render === clientRenderOnServerString) {
            // We have three nodes because there is a comment between them.
            expect(e.childNodes.length).toBe(3);
            // Hydration uses JS value with CR and null character.

            expectNode(e.childNodes[0], TEXT_NODE_TYPE, 'foo\rbar');
            expectNode(e.childNodes[2], TEXT_NODE_TYPE, '\r\nbaz\nqux\u0000');
          } else {
            expect(e.childNodes.length).toBe(2);
            // Client rendering uses JS value with CR and null character.
            expectNode(e.childNodes[0], TEXT_NODE_TYPE, 'foo\rbar');
            expectNode(e.childNodes[1], TEXT_NODE_TYPE, '\r\nbaz\nqux\u0000');
          }
        },
      );

      itRenders(
        'an element with an attribute value with special characters',
        async render => {
          const e = await render(<a title={'foo\rbar\r\nbaz\nqux\u0000'} />);
          if (
            render === serverRender ||
            render === streamRender ||
            render === clientRenderOnServerString
          ) {
            // Everything becomes LF when parsed from server HTML.
            // Null character in an attribute becomes the replacement character.
            // Hydration also ends up with LF because we don't patch up attributes.
            expect(e.title).toBe('foo\nbar\nbaz\nqux\uFFFD');
          } else {
            // Client rendering uses JS value with CR and null character.
            expect(e.title).toBe('foo\rbar\r\nbaz\nqux\u0000');
          }
        },
      );
    });

    describe('components that render nullish', function () {
      itRenders('a function returning null', async render => {
        const NullComponent = () => null;
        await render(<NullComponent />);
      });

      itRenders('a class returning null', async render => {
        class NullComponent extends React.Component {
          render() {
            return null;
          }
        }
        await render(<NullComponent />);
      });

      itRenders('a function returning undefined', async render => {
        const UndefinedComponent = () => undefined;
        await render(<UndefinedComponent />);
      });

      itRenders('a class returning undefined', async render => {
        class UndefinedComponent extends React.Component {
          render() {
            return undefined;
          }
        }
        await render(<UndefinedComponent />);
      });
    });

    describe('components that throw errors', function () {
      itThrowsWhenRendering(
        'a function returning an object',
        async render => {
          const ObjectComponent = () => ({x: 123});
          await render(<ObjectComponent />, 1);
        },
        'Objects are not valid as a React child (found: object with keys {x}).' +
          (__DEV__
            ? ' If you meant to render a collection of children, use ' +
              'an array instead.'
            : ''),
      );

      itThrowsWhenRendering(
        'a class returning an object',
        async render => {
          class ObjectComponent extends React.Component {
            render() {
              return {x: 123};
            }
          }
          await render(<ObjectComponent />, 1);
        },
        'Objects are not valid as a React child (found: object with keys {x}).' +
          (__DEV__
            ? ' If you meant to render a collection of children, use ' +
              'an array instead.'
            : ''),
      );

      itThrowsWhenRendering(
        'top-level object',
        async render => {
          await render({x: 123});
        },
        'Objects are not valid as a React child (found: object with keys {x}).' +
          (__DEV__
            ? ' If you meant to render a collection of children, use ' +
              'an array instead.'
            : ''),
      );
    });

    describe('badly-typed elements', function () {
      itThrowsWhenRendering(
        'object',
        async render => {
          let EmptyComponent = {};
          EmptyComponent = <EmptyComponent />;
          await render(EmptyComponent);
        },
        'Element type is invalid: expected a string (for built-in components) or a class/function ' +
          '(for composite components) but got: object.' +
          (__DEV__
            ? " You likely forgot to export your component from the file it's defined in, " +
              'or you might have mixed up default and named imports.'
            : ''),
      );

      itThrowsWhenRendering(
        'null',
        async render => {
          let NullComponent = null;
          NullComponent = <NullComponent />;
          await render(NullComponent);
        },
        'Element type is invalid: expected a string (for built-in components) or a class/function ' +
          '(for composite components) but got: null',
      );

      itThrowsWhenRendering(
        'undefined',
        async render => {
          let UndefinedComponent = undefined;
          UndefinedComponent = <UndefinedComponent />;
          await render(UndefinedComponent);
        },
        'Element type is invalid: expected a string (for built-in components) or a class/function ' +
          '(for composite components) but got: undefined.' +
          (__DEV__
            ? " You likely forgot to export your component from the file it's defined in, " +
              'or you might have mixed up default and named imports.'
            : ''),
      );
    });
  });
});

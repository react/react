/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let React;
let ReactDOMClient;
let ReactDOMServer;
let act;
let usingPartialRenderer;

const util = require('util');
const realConsoleError = console.error;

const shouldIgnoreConsoleError = require('../../../../scripts/jest/shouldIgnoreConsoleError');

describe('ReactDOMServerHydration', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('react-dom/test-utils').act;

    usingPartialRenderer = global.__WWW__ && !__EXPERIMENTAL__;

    console.error = jest.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    console.error = realConsoleError;
  });

  function normalizeCodeLocInfo(str) {
    return (
      typeof str === 'string' &&
      str.replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function(m, name) {
        return '\n    in ' + name + ' (at **)';
      })
    );
  }

  function formatMessage(args) {
    const [format, ...rest] = args;
    if (format instanceof Error) {
      return 'Caught [' + format.message + ']';
    }
    if (format.indexOf('Error: Uncaught [') === 0) {
      // Ignore errors captured by jsdom and their stacks.
      // We only want console errors in this suite.
      return null;
    }
    if (shouldIgnoreConsoleError(format, ...rest)) {
      return null;
    }
    rest[rest.length - 1] = normalizeCodeLocInfo(rest[rest.length - 1]);
    return util.format(format, ...rest);
  }

  function formatConsoleErrors() {
    return console.error.mock.calls.map(formatMessage).filter(Boolean);
  }

  function testMismatch(Mismatch) {
    const htmlString = ReactDOMServer.renderToString(
      <Mismatch isClient={false} />,
    );
    container.innerHTML = htmlString;
    act(() => {
      ReactDOMClient.hydrateRoot(container, <Mismatch isClient={true} />);
    });
    return formatConsoleErrors();
  }

  describe('text mismatch', () => {
    // @gate __DEV__
    it('warns when client and server render different text', () => {
      function Mismatch({isClient}) {
        return (
          <div className="parent">
            <main className="child">{isClient ? 'client' : 'server'}</main>
          </div>
        );
      }
      if (gate(flags => flags.enableClientRenderFallbackOnTextMismatch)) {
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Text content did not match. Server: \\"server\\" Client: \\"client\\"
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Text content does not match server-rendered HTML.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      } else {
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Text content did not match. Server: \\"server\\" Client: \\"client\\"
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      }
    });

    // @gate __DEV__
    it('warns when client and server render different html', () => {
      function Mismatch({isClient}) {
        return (
          <div className="parent">
            <main
              className="child"
              dangerouslySetInnerHTML={{
                __html: isClient
                  ? '<span>client</span>'
                  : '<span>server</span>',
              }}
            />
          </div>
        );
      }
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Prop \`dangerouslySetInnerHTML\` did not match. Server: \\"<span>server</span>\\" Client: \\"<span>client</span>\\"
            in main (at **)
            in div (at **)
            in Mismatch (at **)",
        ]
      `);
    });
  });

  describe('attribute mismatch', () => {
    // @gate __DEV__
    it('warns when client and server render different attributes', () => {
      function Mismatch({isClient}) {
        return (
          <div className="parent">
            <main
              className={isClient ? 'child client' : 'child server'}
              dir={isClient ? 'ltr' : 'rtl'}
            />
          </div>
        );
      }
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Prop \`className\` did not match. Server: \\"child server\\" Client: \\"child client\\"
            in main (at **)
            in div (at **)
            in Mismatch (at **)",
        ]
      `);
    });

    // @gate __DEV__
    it('warns when client renders extra attributes', () => {
      function Mismatch({isClient}) {
        return (
          <div className="parent">
            <main
              className="child"
              tabIndex={isClient ? 1 : null}
              dir={isClient ? 'ltr' : null}
            />
          </div>
        );
      }
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Prop \`tabIndex\` did not match. Server: \\"null\\" Client: \\"1\\"
            in main (at **)
            in div (at **)
            in Mismatch (at **)",
        ]
      `);
    });

    // @gate __DEV__
    it('warns when server renders extra attributes', () => {
      function Mismatch({isClient}) {
        return (
          <div className="parent">
            <main
              className="child"
              tabIndex={isClient ? null : 1}
              dir={isClient ? null : 'rtl'}
            />
          </div>
        );
      }
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Extra attributes from the server: tabindex,dir
            in main (at **)
            in div (at **)
            in Mismatch (at **)",
        ]
      `);
    });

    // @gate __DEV__
    it('warns when both client and server render extra attributes', () => {
      function Mismatch({isClient}) {
        return (
          <div className="parent">
            <main
              className="child"
              tabIndex={isClient ? 1 : null}
              dir={isClient ? null : 'rtl'}
            />
          </div>
        );
      }
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Prop \`tabIndex\` did not match. Server: \\"null\\" Client: \\"1\\"
            in main (at **)
            in div (at **)
            in Mismatch (at **)",
        ]
      `);
    });

    // @gate __DEV__
    it('warns when client and server render different styles', () => {
      function Mismatch({isClient}) {
        return (
          <div className="parent">
            <main
              className="child"
              style={{
                opacity: isClient ? 1 : 0,
              }}
            />
          </div>
        );
      }
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Prop \`style\` did not match. Server: \\"opacity:0\\" Client: \\"opacity:1\\"
            in main (at **)
            in div (at **)
            in Mismatch (at **)",
        ]
      `);
    });
  });

  describe('extra nodes on the client', () => {
    describe('extra elements on the client', () => {
      // @gate __DEV__
      it('warns when client renders an extra element as only child', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {isClient && <main className="only" />}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <main> in <div>.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra element in the beginning', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {isClient && <header className="1" />}
              <main className="2" />
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <header> in <div>.
              in header (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in header (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra element in the middle', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              {isClient && <main className="2" />}
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <main> in <div>.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra element in the end', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              <main className="2" />
              {isClient && <footer className="3" />}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <footer> in <div>.
              in footer (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in footer (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });
    });

    describe('extra text nodes on the client', () => {
      // @gate __DEV__
      it('warns when client renders an extra text node as only child', () => {
        function Mismatch({isClient}) {
          return <div className="parent">{isClient && 'only'}</div>;
        }
        if (gate(flags => flags.enableClientRenderFallbackOnTextMismatch)) {
          expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
            Array [
              "Warning: Text content did not match. Server: \\"\\" Client: \\"only\\"
                in div (at **)
                in Mismatch (at **)",
              "Warning: Text content does not match server-rendered HTML.
                in div (at **)
                in Mismatch (at **)",
            ]
          `);
        } else {
          expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
            Array [
              "Warning: Text content did not match. Server: \\"\\" Client: \\"only\\"
                in div (at **)
                in Mismatch (at **)",
            ]
          `);
        }
      });

      // @gate __DEV__
      it('warns when client renders an extra text node in the beginning', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              {isClient && 'second'}
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching text node for \\"second\\" in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra text node in the beginning', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {isClient && 'first'}
              <main className="2" />
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching text node for \\"first\\" in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra text node in the end', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              <main className="2" />
              {isClient && 'third'}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching text node for \\"third\\" in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });
    });
  });

  describe('extra nodes on the server', () => {
    describe('extra elements on the server', () => {
      // @gate __DEV__
      it('warns when server renders an extra element as only child', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {!isClient && <main className="only" />}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Did not expect server HTML to contain a <main> in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra element in the beginning', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {!isClient && <header className="1" />}
              <main className="2" />
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <main> in <div>.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra element in the middle', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              {!isClient && <main className="2" />}
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <footer> in <div>.
              in footer (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in footer (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra element in the end', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              <main className="2" />
              {!isClient && <footer className="3" />}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Did not expect server HTML to contain a <footer> in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });
    });

    describe('extra text nodes on the server', () => {
      // @gate __DEV__
      it('warns when server renders an extra text node as only child', () => {
        function Mismatch({isClient}) {
          return <div className="parent">{!isClient && 'only'}</div>;
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Did not expect server HTML to contain the text node \\"only\\" in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra text node in the beginning', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {!isClient && 'first'}
              <main className="2" />
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <main> in <div>.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra text node in the middle', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              {!isClient && 'second'}
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <footer> in <div>.
              in footer (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in footer (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra text node in the end', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <header className="1" />
              <main className="2" />
              {!isClient && 'third'}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Did not expect server HTML to contain the text node \\"third\\" in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });
    });
  });

  describe('special nodes', () => {
    describe('Suspense', () => {
      function Never() {
        throw new Promise(resolve => {});
      }

      // @gate __DEV__
      it('warns when client renders an extra Suspense node in content mode', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {isClient && (
                <React.Suspense fallback={<p>Loading...</p>}>
                  <main className="only" />
                </React.Suspense>
              )}
            </div>
          );
        }
        // TODO: This message doesn't seem to have any useful details.
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in Suspense (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra Suspense node in content mode', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {!isClient && (
                <React.Suspense fallback={<p>Loading...</p>}>
                  <main className="only" />
                </React.Suspense>
              )}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Did not expect server HTML to contain a <main> in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra Suspense node in fallback mode', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {isClient && (
                <React.Suspense fallback={<p>Loading...</p>}>
                  <main className="only" />
                  <Never />
                </React.Suspense>
              )}
            </div>
          );
        }
        // TODO: This message doesn't seem to have any useful details.
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in Suspense (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra Suspense node in fallback mode', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {!isClient && (
                <React.Suspense fallback={<p>Loading...</p>}>
                  <main className="only" />
                  <Never />
                </React.Suspense>
              )}
            </div>
          );
        }

        // @TODO FB bundles use a different renderer that does not serialize errors to the client
        const mismatchEl = usingPartialRenderer ? '<p>' : '<template>';
        // @TODO changes made to sending Fizz errors to client led to the insertion of templates in client rendered
        // suspense boundaries. This leaks in this test becuase the client rendered suspense boundary appears like
        // unhydrated tail nodes and this template is the first match. When we add special case handling for client
        // rendered suspense boundaries this test will likely change again
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Did not expect server HTML to contain a <template> in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra node inside Suspense content', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <React.Suspense fallback={<p>Loading...</p>}>
                <header className="1" />
                {isClient && <main className="second" />}
                <footer className="3" />
              </React.Suspense>
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <main> in <div>.
              in main (at **)
              in Suspense (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in main (at **)
              in Suspense (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra node inside Suspense content', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <React.Suspense fallback={<p>Loading...</p>}>
                <header className="1" />
                {!isClient && <main className="second" />}
                <footer className="3" />
              </React.Suspense>
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <footer> in <div>.
              in footer (at **)
              in Suspense (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in footer (at **)
              in Suspense (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra node inside Suspense fallback', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <React.Suspense
                fallback={
                  <>
                    <p>Loading...</p>
                    {isClient && <br />}
                  </>
                }>
                <main className="only" />
                <Never />
              </React.Suspense>
            </div>
          );
        }
        // We gate this assertion becuase fb-classic uses PartialRenderer for renderToString and it does not
        // serialize server errors and send to client
        if (usingPartialRenderer) {
          expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
            Array [
              "Caught [The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.]",
            ]
          `);
        } else {
          expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
            Array [
              "Caught [The server did not finish this Suspense boundary: The server used \\"renderToString\\" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to \\"renderToPipeableStream\\" which supports Suspense on the server]",
            ]
          `);
        }
      });

      // @gate __DEV__
      it('warns when server renders an extra node inside Suspense fallback', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              <React.Suspense
                fallback={
                  <>
                    <p>Loading...</p>
                    {!isClient && <br />}
                  </>
                }>
                <main className="only" />
                <Never />
              </React.Suspense>
            </div>
          );
        }
        // We gate this assertion becuase fb-classic uses PartialRenderer for renderToString and it does not
        // serialize server errors and send to client
        if (usingPartialRenderer) {
          expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
            Array [
              "Caught [The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.]",
            ]
          `);
        } else {
          expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
            Array [
              "Caught [The server did not finish this Suspense boundary: The server used \\"renderToString\\" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to \\"renderToPipeableStream\\" which supports Suspense on the server]",
            ]
          `);
        }
      });
    });

    describe('Fragment', () => {
      // @gate __DEV__
      it('warns when client renders an extra Fragment node', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {isClient && (
                <>
                  <header className="1" />
                  <main className="2" />
                  <footer className="3" />
                </>
              )}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Expected server HTML to contain a matching <header> in <div>.
              in header (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in header (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in main (at **)
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in footer (at **)
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when server renders an extra Fragment node', () => {
        function Mismatch({isClient}) {
          return (
            <div className="parent">
              {!isClient && (
                <>
                  <header className="1" />
                  <main className="2" />
                  <footer className="3" />
                </>
              )}
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          Array [
            "Warning: Did not expect server HTML to contain a <header> in <div>.
              in div (at **)
              in Mismatch (at **)",
            "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });
    });
  });

  describe('misc cases', () => {
    // @gate __DEV__
    it('warns when client renders an extra node deeper in the tree', () => {
      function Mismatch({isClient}) {
        return isClient ? <ProfileSettings /> : <MediaSettings />;
      }

      function ProfileSettings() {
        return (
          <div className="parent">
            <input />
            <Panel type="profile" />
          </div>
        );
      }

      function MediaSettings() {
        return (
          <div className="parent">
            <input />
            <Panel type="media" />
          </div>
        );
      }

      function Panel({type}) {
        return (
          <>
            <header className="1" />
            <main className="2" />
            {type === 'profile' && <footer className="3" />}
          </>
        );
      }

      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Expected server HTML to contain a matching <footer> in <div>.
            in footer (at **)
            in Panel (at **)
            in div (at **)
            in ProfileSettings (at **)
            in Mismatch (at **)",
          "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
            in footer (at **)
            in Panel (at **)
            in div (at **)
            in ProfileSettings (at **)
            in Mismatch (at **)",
        ]
      `);
    });

    // @gate __DEV__
    it('warns when server renders an extra node deeper in the tree', () => {
      function Mismatch({isClient}) {
        return isClient ? <ProfileSettings /> : <MediaSettings />;
      }

      function ProfileSettings() {
        return (
          <div className="parent">
            <input />
            <Panel type="profile" />
          </div>
        );
      }

      function MediaSettings() {
        return (
          <div className="parent">
            <input />
            <Panel type="media" />
          </div>
        );
      }

      function Panel({type}) {
        return (
          <>
            <header className="1" />
            <main className="2" />
            {type !== 'profile' && <footer className="3" />}
          </>
        );
      }

      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
        Array [
          "Warning: Did not expect server HTML to contain a <footer> in <div>.
            in div (at **)
            in ProfileSettings (at **)
            in Mismatch (at **)",
          "Warning: Hydration failed because the initial UI does not match what was rendered on the server.
            in div (at **)
            in ProfileSettings (at **)
            in Mismatch (at **)",
        ]
      `);
    });
  });
});

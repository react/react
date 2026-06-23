/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

let React;
let ReactDOMClient;
let ReactDOMServer;
let act;

const util = require('util');
const realConsoleError = console.error;

function errorHandler() {
  // forward to console.error but don't fail the tests
}

describe('ReactDOMServerHydration', () => {
  let container;
  let ownerStacks;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = React.act;

    window.addEventListener('error', errorHandler);
    ownerStacks = [];
    console.error = jest.fn(() => {
      const ownerStack = React.captureOwnerStack();
      if (typeof ownerStack === 'string') {
        ownerStacks.push(ownerStack === '' ? ' <empty>' : ownerStack);
      } else {
        ownerStacks.push(' ' + String(ownerStack));
      }
    });
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    window.removeEventListener('error', errorHandler);
    document.body.removeChild(container);
    console.error = realConsoleError;
  });

  function normalizeCodeLocInfo(str) {
    return typeof str === 'string'
      ? str.replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function (m, name) {
          return '\n    in ' + name + ' (at **)';
        })
      : str;
  }

  function formatMessage(args, index) {
    const ownerStack = ownerStacks[index];

    if (ownerStack === undefined) {
      throw new Error(
        'Expected an owner stack for message ' +
          index +
          ':\n' +
          util.format(...args),
      );
    }

    const [format, ...rest] = args;
    if (format instanceof Error) {
      if (format.cause instanceof Error) {
        return (
          'Caught [' +
          format.message +
          ']\n  Cause [' +
          format.cause.message +
          ']\n  Owner Stack:' +
          normalizeCodeLocInfo(ownerStack)
        );
      }
      return (
        'Caught [' +
        format.message +
        ']\n  Owner Stack:' +
        normalizeCodeLocInfo(ownerStack)
      );
    }
    rest[rest.length - 1] = normalizeCodeLocInfo(rest[rest.length - 1]);
    return (
      util.format(format, ...rest) +
      '\n  Owner Stack:' +
      normalizeCodeLocInfo(ownerStack)
    );
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
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          [
            "Caught [Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <main className="child">
          +       client
          -       server
          ]
            Owner Stack:
              in main (at **)
              in Mismatch (at **)",
          ]
        `);
    });

    // @gate __DEV__
    it('warns when escaping on a checksum mismatch', () => {
      function Mismatch({isClient}) {
        if (isClient) {
          return (
            <div>This markup contains an nbsp entity: &nbsp; client text</div>
          );
        }
        return (
          <div>This markup contains an nbsp entity: &nbsp; server text</div>
        );
      }

      /* eslint-disable no-irregular-whitespace */
      expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          [
            "Caught [Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div>
          +     This markup contains an nbsp entity:   client text
          -     This markup contains an nbsp entity:   server text
          ]
            Owner Stack:
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      /* eslint-enable no-irregular-whitespace */
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
        [
          "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <div className="parent">
              <main
                className="child"
                dangerouslySetInnerHTML={{
        +         __html: "<span>client</span>"
        -         __html: "<span>server</span>"
                }}
              >

          Owner Stack:
            in main (at **)
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
        [
          "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <div className="parent">
              <main
        +       className="child client"
        -       className="child server"
        +       dir="ltr"
        -       dir="rtl"
              >

          Owner Stack:
            in main (at **)
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
        [
          "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <div className="parent">
              <main
                className="child"
        +       tabIndex={1}
        -       tabIndex={null}
        +       dir="ltr"
        -       dir={null}
              >

          Owner Stack:
            in main (at **)
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
        [
          "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <div className="parent">
              <main
                className="child"
        +       tabIndex={null}
        -       tabIndex="1"
        +       dir={null}
        -       dir="rtl"
              >

          Owner Stack:
            in main (at **)
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
        [
          "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <div className="parent">
              <main
                className="child"
        +       tabIndex={1}
        -       tabIndex={null}
        +       dir={null}
        -       dir="rtl"
              >

          Owner Stack:
            in main (at **)
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
        [
          "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <div className="parent">
              <main
                className="child"
        +       style={{opacity:1}}
        -       style={{opacity:"0"}}
              >

          Owner Stack:
            in main (at **)
            in Mismatch (at **)",
        ]
      `);
    });

    // @gate __DEV__
    it('picks the DFS-first Fiber as the error Owner', () => {
      function LeftMismatch({isClient}) {
        return <div className={isClient ? 'client' : 'server'} />;
      }

      function LeftIndirection({isClient}) {
        return <LeftMismatch isClient={isClient} />;
      }

      function MiddleMismatch({isClient}) {
        return <span className={isClient ? 'client' : 'server'} />;
      }

      function RightMisMatch({isClient}) {
        return <p className={isClient ? 'client' : 'server'} />;
      }

      function App({isClient}) {
        return (
          <>
            <LeftIndirection isClient={isClient} />
            <MiddleMismatch isClient={isClient} />
            <RightMisMatch isClient={isClient} />
          </>
        );
      }
      expect(testMismatch(App)).toMatchInlineSnapshot(`
        [
          "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <App isClient={true}>
            <LeftIndirection isClient={true}>
              <LeftMismatch isClient={true}>
                <div
        +         className="client"
        -         className="server"
                >
            <MiddleMismatch isClient={true}>
              <span
        +       className="client"
        -       className="server"
              >
            <RightMisMatch isClient={true}>
              <p
        +       className="client"
        -       className="server"
              >

          Owner Stack:
            in div (at **)
            in LeftMismatch (at **)
            in LeftIndirection (at **)
            in App (at **)",
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     <main className="only">
          ]
            Owner Stack:
              in main (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     <header className="1">
          -     <main className="2">
                ...
          ]
            Owner Stack:
              in header (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <header>
          +     <main className="2">
          -     <footer className="3">
                ...
          ]
            Owner Stack:
              in main (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <header>
                <main>
          +     <footer className="3">
          ]
            Owner Stack:
              in footer (at **)
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
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
            [
              "Caught [Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

            - A server/client branch \`if (typeof window !== 'undefined')\`.
            - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
            - Date formatting in a user's locale which doesn't match the server.
            - External changing data without sending a snapshot of it along with the HTML.
            - Invalid HTML tag nesting.

            It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

            https://react.dev/link/hydration-mismatch

              <Mismatch isClient={true}>
                <div className="parent">
            +     only
            -     
            ]
              Owner Stack:
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
              <header className="1" />
              {isClient && 'second'}
              <footer className="3" />
            </div>
          );
        }
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <header>
          +     second
          -     <footer className="3">
                ...
          ]
            Owner Stack:
              in div (at **)
              in Mismatch (at **)",
          ]
        `);
      });

      // @gate __DEV__
      it('warns when client renders an extra text node in the middle', () => {
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     first
          -     <main className="2">
                ...
          ]
            Owner Stack:
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <header>
                <main>
          +     third
          ]
            Owner Stack:
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          -     <main className="only">
          ]
            Owner Stack:
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     <main className="2">
          -     <header className="1">
                ...
          ]
            Owner Stack:
              in main (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <header>
          +     <footer className="3">
          -     <main className="2">
          ]
            Owner Stack:
              in footer (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          -     <footer className="3">
          ]
            Owner Stack:
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          -     only
          ]
            Owner Stack:
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     <main className="2">
          -     first
                ...
          ]
            Owner Stack:
              in main (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <header>
          +     <footer className="3">
          -     second
          ]
            Owner Stack:
              in footer (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          -     third
          ]
            Owner Stack:
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
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     <Suspense fallback={<p>}>
          ]
            Owner Stack:
              in Suspense (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          -     <Suspense>
          ]
            Owner Stack:
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     <Suspense fallback={<p>}>
          ]
            Owner Stack:
              in Suspense (at **)
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

        // @TODO changes made to sending Fizz errors to client led to the insertion of templates in client rendered
        // suspense boundaries. This leaks in this test because the client rendered suspense boundary appears like
        // unhydrated tail nodes and this template is the first match. When we add special case handling for client
        // rendered suspense boundaries this test will likely change again
        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          -     <Suspense>
          ]
            Owner Stack:
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <Suspense fallback={<p>}>
                  <header>
          +       <main className="second">
          -       <footer className="3">
                  ...
          ]
            Owner Stack:
              in main (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
                <Suspense fallback={<p>}>
                  <header>
          +       <footer className="3">
          -       <main className="second">
          ]
            Owner Stack:
              in footer (at **)
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

        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          [
            "Caught [Switched to client rendering because the server rendering aborted due to:

          The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToPipeableStream" which supports Suspense on the server]
            Owner Stack: null",
          ]
        `);
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

        expect(testMismatch(Mismatch)).toMatchInlineSnapshot(`
          [
            "Caught [Switched to client rendering because the server rendering aborted due to:

          The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToPipeableStream" which supports Suspense on the server]
            Owner Stack: null",
          ]
        `);
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          +     <header className="1">
                ...
          ]
            Owner Stack:
              in header (at **)
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
          [
            "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

          - A server/client branch \`if (typeof window !== 'undefined')\`.
          - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
          - Date formatting in a user's locale which doesn't match the server.
          - External changing data without sending a snapshot of it along with the HTML.
          - Invalid HTML tag nesting.

          It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

          https://react.dev/link/hydration-mismatch

            <Mismatch isClient={true}>
              <div className="parent">
          -     <header className="1">
          -     <main className="2">
          -     <footer className="3">
          ]
            Owner Stack:
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
        [
          "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <ProfileSettings>
              <div className="parent">
                <input>
                <Panel type="profile">
                  <header>
                  <main>
        +         <footer className="3">
        ]
          Owner Stack:
            in footer (at **)
            in Panel (at **)
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
        [
          "Caught [Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

        - A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

        https://react.dev/link/hydration-mismatch

          <Mismatch isClient={true}>
            <ProfileSettings>
              <div className="parent">
        -       <footer className="3">
        ]
          Owner Stack:
            in div (at **)
            in ProfileSettings (at **)
            in Mismatch (at **)",
        ]
      `);
    });
  });
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails reactcore
 * @jest-environment node
 */

'use strict';

let JSDOM;
let React;
let ReactDOMClient;
let act;
let document;
let Fragment;
let Node;

describe('FragmentRefs', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom');
    React = require('react');
    Fragment = React.Fragment;
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    const jsdom = new JSDOM.JSDOM('');
    document = jsdom.window.document;
    Node = jsdom.window.Node;
    global.window = jsdom.window;
    global.document = global.window.document;
    global.navigator = global.window.navigator;
    global.Event = global.window.Event;
    global.Node = Node;
  });

  describe('focus methods', () => {
    describe('blur()', () => {
      // @gate enableFragmentRefs
      it('throws when the nearest host parent is a Document container', async () => {
        const fragmentRef = React.createRef();
        const root = ReactDOMClient.createRoot(document);

        await act(() => {
          root.render(
            <Fragment ref={fragmentRef}>
              <html>
                <body>
                  <a id="child-a" href="/">
                    A
                  </a>
                </body>
              </html>
            </Fragment>,
          );
        });

        await act(() => {
          // focus() would stop at <body>, which is a child of the fragment
          // and usually already the activeElement.
          document.getElementById('child-a').focus();
        });
        expect(document.activeElement.id).toEqual('child-a');

        await act(() => {
          fragmentRef.current.blur();
        });
        expect(document.activeElement).toEqual(document.body);
      });
    });
  });

  describe('events', () => {
    describe('dispatchEvent()', () => {
      // @gate enableFragmentRefs
      it('fires events when the fragment is a child of a HostSingleton in a document root', async () => {
        const fragmentRef = React.createRef();
        const bodyRef = React.createRef();
        const root = ReactDOMClient.createRoot(document);

        await act(() => {
          root.render(
            <html>
              <body ref={bodyRef}>
                <Fragment ref={fragmentRef} />
              </body>
            </html>,
          );
        });

        const fragmentListener = jest.fn();
        fragmentRef.current.addEventListener('custom', fragmentListener);
        const bodyListener = jest.fn();
        bodyRef.current.addEventListener('custom', bodyListener);

        // The <body> is the fragment's host parent, so the
        // temporary event target is appended there.
        fragmentRef.current.dispatchEvent(new Event('custom', {bubbles: true}));

        expect(fragmentListener).toHaveBeenCalledTimes(1);
        expect(bodyListener).toHaveBeenCalledTimes(1);
      });
    });

    describe('addEventListener()', () => {
      // @gate enableFragmentRefs
      it('attaches listeners to the host children inside singletons', async () => {
        const fragmentRef = React.createRef();
        const childRef = React.createRef();
        const root = ReactDOMClient.createRoot(document);

        await act(() => {
          root.render(
            <Fragment ref={fragmentRef}>
              <html>
                <body>
                  <div ref={childRef} id="child" />
                </body>
              </html>
            </Fragment>,
          );
        });

        const currentTargets = [];
        fragmentRef.current.addEventListener('click', event => {
          currentTargets.push(event.currentTarget);
        });

        childRef.current.dispatchEvent(new Event('click', {bubbles: true}));

        // The <html> singleton is the fragment's child, so the listener is
        // attached there and receives the bubbling event.
        expect(currentTargets).toEqual([document.documentElement]);
      });

      // @gate enableFragmentRefs
      it('attaches listeners to a singleton mounted into the fragment, but not to its content', async () => {
        const fragmentRef = React.createRef();
        const childRef = React.createRef();
        const root = ReactDOMClient.createRoot(document);

        function Test({showShell}) {
          return (
            <Fragment ref={fragmentRef}>
              {showShell && (
                <html>
                  <body>
                    <div ref={childRef} id="child" />
                  </body>
                </html>
              )}
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test showShell={false} />);
        });

        const currentTargets = [];
        fragmentRef.current.addEventListener('click', event => {
          currentTargets.push(event.currentTarget);
        });

        await act(() => {
          root.render(<Test showShell={true} />);
        });

        childRef.current.dispatchEvent(new Event('click', {bubbles: true}));

        // The placed <html> singleton receives the fragment's listener as a
        // new child. Its content is not attributed to the fragment, so the
        // event only fires once when it bubbles to <html>.
        expect(currentTargets).toEqual([document.documentElement]);
      });

      // @gate enableFragmentRefs
      it('attributes new children inside a singleton to fragments below it, not above it', async () => {
        const outerFragmentRef = React.createRef();
        const innerFragmentRef = React.createRef();
        const lateChildRef = React.createRef();
        const root = ReactDOMClient.createRoot(document);

        function Test({showLateChild}) {
          return (
            <Fragment ref={outerFragmentRef}>
              <html>
                <body>
                  <Fragment ref={innerFragmentRef}>
                    <div id="child" />
                    {showLateChild && <span ref={lateChildRef} id="late" />}
                  </Fragment>
                </body>
              </html>
            </Fragment>
          );
        }

        await act(() => {
          root.render(<Test showLateChild={false} />);
        });

        const outerCurrentTargets = [];
        outerFragmentRef.current.addEventListener('click', event => {
          outerCurrentTargets.push(event.currentTarget);
        });
        const innerCurrentTargets = [];
        innerFragmentRef.current.addEventListener('click', event => {
          innerCurrentTargets.push(event.currentTarget);
        });

        await act(() => {
          root.render(<Test showLateChild={true} />);
        });

        lateChildRef.current.dispatchEvent(new Event('click', {bubbles: true}));

        // The inner fragment owns the new child directly and attaches its
        // listener on insertion. The outer fragment's child is the <html>
        // singleton, so the new child inside <body> is not attributed to it
        // and its listener only fires once via bubbling.
        expect(innerCurrentTargets).toEqual([lateChildRef.current]);
        expect(outerCurrentTargets).toEqual([document.documentElement]);
      });
    });
  });

  describe('getClientRects()', () => {
    // @gate enableFragmentRefs
    it('measures the host children inside singletons', async () => {
      const fragmentRef = React.createRef();
      const childRef = React.createRef();
      const root = ReactDOMClient.createRoot(document);

      await act(() => {
        root.render(
          <Fragment ref={fragmentRef}>
            <html>
              <body>
                <div ref={childRef} id="child" />
              </body>
            </html>
          </Fragment>,
        );
      });

      childRef.current.getClientRects = jest.fn(() => ['child-rect']);
      document.documentElement.getClientRects = jest.fn(() => ['html-rect']);

      // The <html> singleton is the fragment's child, so it is measured
      // instead of the elements inside it
      expect(fragmentRef.current.getClientRects()).toEqual(['html-rect']);
    });
  });

  describe('compareDocumentPosition', () => {
    function expectPosition(position, spec) {
      const positionResult = {
        following: (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        preceding: (position & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
        contains: (position & Node.DOCUMENT_POSITION_CONTAINS) !== 0,
        containedBy: (position & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0,
        disconnected: (position & Node.DOCUMENT_POSITION_DISCONNECTED) !== 0,
        implementationSpecific:
          (position & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC) !== 0,
      };
      expect(positionResult).toEqual(spec);
    }

    // @gate enableFragmentRefs
    it('treats documentElement as containing the fragment', async () => {
      const fragmentRef = React.createRef();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <Fragment ref={fragmentRef}>
            <div id="child" />
          </Fragment>,
        );
      });

      expectPosition(
        fragmentRef.current.compareDocumentPosition(document.documentElement),
        {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );
    });
  });
});

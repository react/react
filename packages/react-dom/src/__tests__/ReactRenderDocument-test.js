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
let ReactDOMClient;
let ReactDOMServer;
let act;
let Scheduler;
let assertLog;

function getTestDocument(markup) {
  const doc = document.implementation.createHTMLDocument('');
  doc.open();
  doc.write(
    markup ||
      '<!doctype html><html><meta charset=utf-8><title>test doc</title>',
  );
  doc.close();
  return doc;
}

function normalizeError(msg) {
  // Take the first sentence to make it easier to assert on.
  const idx = msg.indexOf('.');
  if (idx > -1) {
    return msg.slice(0, idx + 1);
  }
  return msg;
}

describe('rendering React components at document', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    Scheduler = require('scheduler');
  });

  describe('with new explicit hydration API', () => {
    it('should be able to adopt server markup', async () => {
      class Root extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{'Hello ' + this.props.hello}</body>
            </html>
          );
        }
      }

      const markup = ReactDOMServer.renderToString(<Root hello="world" />);
      expect(markup).not.toContain('DOCTYPE');
      expect(markup).not.toContain('rel="expect"');
      const testDocument = getTestDocument(markup);
      const body = testDocument.body;

      let root;
      await act(() => {
        root = ReactDOMClient.hydrateRoot(testDocument, <Root hello="world" />);
      });
      expect(testDocument.body.innerHTML).toBe('Hello world');

      await act(() => {
        root.render(<Root hello="moon" />);
      });
      expect(testDocument.body.innerHTML).toBe('Hello moon');

      expect(body === testDocument.body).toBe(true);
    });

    it('should be able to unmount component from document node, but leaves singleton nodes intact', async () => {
      class Root extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>Hello world</body>
            </html>
          );
        }
      }

      const markup = ReactDOMServer.renderToString(<Root />);
      const testDocument = getTestDocument(markup);
      let root;
      await act(() => {
        root = ReactDOMClient.hydrateRoot(testDocument, <Root />);
      });
      expect(testDocument.body.innerHTML).toBe('Hello world');

      const originalDocEl = testDocument.documentElement;
      const originalHead = testDocument.head;
      const originalBody = testDocument.body;

      // When we unmount everything is removed except the singleton nodes of html, head, and body
      root.unmount();
      expect(testDocument.firstChild).toBe(originalDocEl);
      expect(testDocument.head).toBe(originalHead);
      expect(testDocument.body).toBe(originalBody);
      expect(originalBody.innerHTML).toBe('');
      expect(originalHead.innerHTML).toBe('');
    });

    it('should not be able to switch root constructors', async () => {
      class Component extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>Hello world</body>
            </html>
          );
        }
      }

      class Component2 extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>Goodbye world</body>
            </html>
          );
        }
      }

      const markup = ReactDOMServer.renderToString(<Component />);
      const testDocument = getTestDocument(markup);

      let root;
      await act(() => {
        root = ReactDOMClient.hydrateRoot(testDocument, <Component />);
      });

      expect(testDocument.body.innerHTML).toBe('Hello world');

      await act(() => {
        root.render(<Component2 />);
      });

      expect(testDocument.body.innerHTML).toBe('Goodbye world');
    });

    it('should be able to mount into document', async () => {
      class Component extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{this.props.text}</body>
            </html>
          );
        }
      }

      const markup = ReactDOMServer.renderToString(
        <Component text="Hello world" />,
      );
      const testDocument = getTestDocument(markup);

      await act(() => {
        ReactDOMClient.hydrateRoot(
          testDocument,
          <Component text="Hello world" />,
        );
      });

      expect(testDocument.body.innerHTML).toBe('Hello world');
    });

    it('cannot render over an existing text child at the root', async () => {
      const container = document.createElement('div');
      container.textContent = 'potato';

      ReactDOM.flushSync(() => {
        ReactDOMClient.hydrateRoot(container, <div>parsnip</div>, {
          onRecoverableError: error => {
            Scheduler.log(
              'onRecoverableError: ' + normalizeError(error.message),
            );
            if (error.cause) {
              Scheduler.log('Cause: ' + normalizeError(error.cause.message));
            }
          },
        });
      });

      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);

      // This creates an unfortunate double text case.
      expect(container.textContent).toBe('parsnip');
    });

    it('renders over an existing nested text child without throwing', async () => {
      const container = document.createElement('div');
      const wrapper = document.createElement('div');
      wrapper.textContent = 'potato';
      container.appendChild(wrapper);
      ReactDOM.flushSync(() => {
        ReactDOMClient.hydrateRoot(
          container,
          <div>
            <div>parsnip</div>
          </div>,
          {
            onRecoverableError: error => {
              Scheduler.log(
                'onRecoverableError: ' + normalizeError(error.message),
              );
              if (error.cause) {
                Scheduler.log('Cause: ' + normalizeError(error.cause.message));
              }
            },
          },
        );
      });

      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
      expect(container.textContent).toBe('parsnip');
    });

    it('removes hoisted <title> when hiding an Activity boundary', async () => {
      const Activity = React.Activity;

      function App({mode, titleText}) {
        return (
          <html>
            <head>
              <Activity mode={mode}>
                <title>{titleText}</title>
              </Activity>
            </head>
            <body>Hello</body>
          </html>
        );
      }

      const testDocument = getTestDocument(
        '<!doctype html><html><head></head><body></body></html>',
      );
      const root = ReactDOMClient.createRoot(testDocument);

      await act(() => root.render(<App mode="visible" titleText="A" />));
      expect(testDocument.head.querySelector('title').textContent).toBe('A');

      await act(() => root.render(<App mode="hidden" titleText="A" />));
      expect(testDocument.head.querySelector('title')).toBe(null);

      await act(() => root.render(<App mode="visible" titleText="B" />));
      expect(testDocument.head.querySelector('title').textContent).toBe('B');
    });

    it('does not unmount a hoistable that was never mounted when reappearing', async () => {
      const Activity = React.Activity;

      function App({mode, showTitle}) {
        return (
          <html>
            <head>
              <Activity mode={mode}>
                {showTitle ? <title>Title</title> : null}
              </Activity>
            </head>
            <body>Hello</body>
          </html>
        );
      }

      const testDocument = getTestDocument(
        '<!doctype html><html><head></head><body></body></html>',
      );
      const root = ReactDOMClient.createRoot(testDocument);

      await act(() => root.render(<App mode="hidden" showTitle={true} />));
      expect(testDocument.head.querySelector('title')).toBe(null);

      await act(() => root.render(<App mode="visible" showTitle={false} />));
      expect(testDocument.head.querySelector('title')).toBe(null);
    });

    it('removes hoistables deleted in the same commit that hides an Activity', async () => {
      const Activity = React.Activity;

      function App({mode, showTitle}) {
        return (
          <html>
            <head>
              <Activity mode={mode}>
                {showTitle ? <title>Title</title> : null}
              </Activity>
            </head>
            <body>Hello</body>
          </html>
        );
      }

      const testDocument = getTestDocument(
        '<!doctype html><html><head></head><body></body></html>',
      );
      const root = ReactDOMClient.createRoot(testDocument);

      await act(() => root.render(<App mode="visible" showTitle={true} />));
      expect(testDocument.head.querySelector('title')).not.toBe(null);

      await act(() => root.render(<App mode="hidden" showTitle={false} />));
      expect(testDocument.head.querySelector('title')).toBe(null);
    });

    it('should give helpful errors on state desync', async () => {
      class Component extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{this.props.text}</body>
            </html>
          );
        }
      }

      const markup = ReactDOMServer.renderToString(
        <Component text="Goodbye world" />,
      );
      const testDocument = getTestDocument(markup);

      ReactDOM.flushSync(() => {
        ReactDOMClient.hydrateRoot(
          testDocument,
          <Component text="Hello world" />,
          {
            onRecoverableError: error => {
              Scheduler.log(
                'onRecoverableError: ' + normalizeError(error.message),
              );
              if (error.cause) {
                Scheduler.log('Cause: ' + normalizeError(error.cause.message));
              }
            },
          },
        );
      });

      assertLog([
        "onRecoverableError: Hydration failed because the server rendered text didn't match the client.",
      ]);
      expect(testDocument.body.innerHTML).toBe('Hello world');
    });

    it('should render w/ no markup to full document', async () => {
      const testDocument = getTestDocument();

      class Component extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{this.props.text}</body>
            </html>
          );
        }
      }

      // with float the title no longer is a hydration mismatch so we get an error on the body mismatch
      ReactDOM.flushSync(() => {
        ReactDOMClient.hydrateRoot(
          testDocument,
          <Component text="Hello world" />,
          {
            onRecoverableError: error => {
              Scheduler.log(
                'onRecoverableError: ' + normalizeError(error.message),
              );
              if (error.cause) {
                Scheduler.log('Cause: ' + normalizeError(error.cause.message));
              }
            },
          },
        );
      });
      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
      expect(testDocument.body.innerHTML).toBe('Hello world');
    });
  });
});

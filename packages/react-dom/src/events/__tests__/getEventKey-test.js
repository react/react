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

describe('getEventKey', () => {
  let container;
  let root;

  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');

    act = require('internal-test-utils').act;

    // The container has to be attached for events to fire.
    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
    root = null;
  });

  describe('when key is implemented in a browser', () => {
    describe('when key is not normalized', () => {
      it('returns a normalized value', async () => {
        let key = null;
        class Comp extends React.Component {
          render() {
            return <input onKeyDown={e => (key = e.key)} />;
          }
        }

        await act(() => {
          root.render(<Comp />);
        });

        const nativeEvent = new KeyboardEvent('keydown', {
          key: 'Del',
          bubbles: true,
          cancelable: true,
        });
        container.firstChild.dispatchEvent(nativeEvent);
        expect(key).toBe('Delete');
      });
    });

    describe('when key is normalized', () => {
      it('returns a key', async () => {
        let key = null;
        class Comp extends React.Component {
          render() {
            return <input onKeyDown={e => (key = e.key)} />;
          }
        }

        await act(() => {
          root.render(<Comp />);
        });

        const nativeEvent = new KeyboardEvent('keydown', {
          key: 'f',
          bubbles: true,
          cancelable: true,
        });
        container.firstChild.dispatchEvent(nativeEvent);
        expect(key).toBe('f');
      });
    });
  });

  describe('when key is not implemented in a browser', () => {
    describe('when event type is keypress', () => {
      describe('when charCode is 13', () => {
        it('returns "Enter"', async () => {
          let key = null;
          class Comp extends React.Component {
            render() {
              return <input onKeyPress={e => (key = e.key)} />;
            }
          }

          await act(() => {
            root.render(<Comp />);
          });

          const nativeEvent = new KeyboardEvent('keypress', {
            charCode: 13,
            bubbles: true,
            cancelable: true,
          });
          container.firstChild.dispatchEvent(nativeEvent);
          expect(key).toBe('Enter');
        });
      });

      describe('when charCode is not 13', () => {
        it('returns a string from a charCode', async () => {
          let key = null;
          class Comp extends React.Component {
            render() {
              return <input onKeyPress={e => (key = e.key)} />;
            }
          }

          await act(() => {
            root.render(<Comp />);
          });

          const nativeEvent = new KeyboardEvent('keypress', {
            charCode: 65,
            bubbles: true,
            cancelable: true,
          });
          container.firstChild.dispatchEvent(nativeEvent);
          expect(key).toBe('A');
        });
      });
    });

    describe('when event type is keydown or keyup', () => {
      describe('when keyCode is recognized', () => {
        it('returns a translated key', async () => {
          let key = null;
          class Comp extends React.Component {
            render() {
              return <input onKeyDown={e => (key = e.key)} />;
            }
          }

          await act(() => {
            root.render(<Comp />);
          });

          const nativeEvent = new KeyboardEvent('keydown', {
            keyCode: 45,
            bubbles: true,
            cancelable: true,
          });
          container.firstChild.dispatchEvent(nativeEvent);
          expect(key).toBe('Insert');
        });
      });

      describe('when keyCode is not recognized', () => {
        it('returns Unidentified', async () => {
          let key = null;
          class Comp extends React.Component {
            render() {
              return <input onKeyDown={e => (key = e.key)} />;
            }
          }

          await act(() => {
            root.render(<Comp />);
          });

          const nativeEvent = new KeyboardEvent('keydown', {
            keyCode: 1337,
            bubbles: true,
            cancelable: true,
          });
          container.firstChild.dispatchEvent(nativeEvent);
          expect(key).toBe('Unidentified');
        });
      });
    });
  });
});

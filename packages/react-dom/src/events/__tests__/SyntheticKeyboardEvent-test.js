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

describe('SyntheticKeyboardEvent', () => {
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

  afterEach(async () => {
    await act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    container = null;
  });

  describe('KeyboardEvent interface', () => {
    describe('charCode', () => {
      describe('when event is `keypress`', () => {
        describe('when charCode is present in nativeEvent', () => {
          it('when charCode is 0 and keyCode is 13, returns 13', async () => {
            let charCode = null;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    charCode = e.charCode;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                charCode: 0,
                keyCode: 13,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(charCode).toBe(13);
          });

          it('when charCode is 32 or bigger and keyCode is missing, returns charCode', async () => {
            let charCode = null;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    charCode = e.charCode;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                charCode: 32,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(charCode).toBe(32);
          });

          it('when charCode is 13 and keyCode is missing, returns charCode', async () => {
            let charCode = null;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    charCode = e.charCode;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                charCode: 13,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(charCode).toBe(13);
          });

          // Firefox creates a keypress event for function keys too. This removes
          // the unwanted keypress events. Enter is however both printable and
          // non-printable. One would expect Tab to be as well (but it isn't).
          it('when charCode is smaller than 32 but is not 13, and keyCode is missing, ignores keypress', async () => {
            let called = false;
            await act(() => {
              root.render(
                <input
                  onKeyPress={() => {
                    called = true;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                charCode: 31,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(called).toBe(false);
          });

          it('when charCode is 10, returns 13', async () => {
            let charCode = null;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    charCode = e.charCode;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                charCode: 10,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(charCode).toBe(13);
          });

          it('when charCode is 10 and ctrl is pressed, returns 13', async () => {
            let charCode = null;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    charCode = e.charCode;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                charCode: 10,
                ctrlKey: true,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(charCode).toBe(13);
          });
        });

        // TODO: this seems IE8 specific.
        // We can probably remove this normalization.
        describe('when charCode is not present in nativeEvent', () => {
          let charCodeDescriptor;

          beforeEach(() => {
            charCodeDescriptor = Object.getOwnPropertyDescriptor(
              KeyboardEvent.prototype,
              'charCode',
            );
            delete KeyboardEvent.prototype.charCode;
          });

          afterEach(() => {
            // Don't forget to restore for other tests.
            Object.defineProperty(
              KeyboardEvent.prototype,
              'charCode',
              charCodeDescriptor,
            );
            charCodeDescriptor = null;
          });

          it('when keyCode is 32 or bigger, returns keyCode', async () => {
            let charCode = null;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    charCode = e.charCode;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                keyCode: 32,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(charCode).toBe(32);
          });

          it('when keyCode is 13, returns 13', async () => {
            let charCode = null;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    charCode = e.charCode;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                keyCode: 13,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(charCode).toBe(13);
          });

          it('when keyCode is smaller than 32 and is not 13, ignores keypress', async () => {
            let called = false;
            await act(() => {
              root.render(
                <input
                  onKeyPress={e => {
                    called = true;
                  }}
                />,
              );
            });
            container.firstChild.dispatchEvent(
              new KeyboardEvent('keypress', {
                keyCode: 31,
                bubbles: true,
                cancelable: true,
              }),
            );
            expect(called).toBe(false);
          });
        });
      });

      describe('when event is not `keypress`', () => {
        it('returns 0', async () => {
          let charCodeDown = null;
          let charCodeUp = null;
          await act(() => {
            root.render(
              <input
                onKeyDown={e => {
                  charCodeDown = e.charCode;
                }}
                onKeyUp={e => {
                  charCodeUp = e.charCode;
                }}
              />,
            );
          });
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Del',
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keyup', {
              key: 'Del',
              bubbles: true,
              cancelable: true,
            }),
          );
          expect(charCodeDown).toBe(0);
          expect(charCodeUp).toBe(0);
        });
      });

      it('when charCode is smaller than 32 but is not 13, and keyCode is missing, charCode is 0', async () => {
        let charCode = null;
        await act(() => {
          root.render(
            <input
              onKeyDown={e => {
                charCode = e.charCode;
              }}
            />,
          );
        });
        container.firstChild.dispatchEvent(
          new KeyboardEvent('keydown', {
            charCode: 31,
            bubbles: true,
            cancelable: true,
          }),
        );
        expect(charCode).toBe(0);
      });
    });

    describe('keyCode', () => {
      describe('when event is `keydown` or `keyup`', () => {
        it('returns a passed keyCode', async () => {
          let keyCodeDown = null;
          let keyCodeUp = null;
          await act(() => {
            root.render(
              <input
                onKeyDown={e => {
                  keyCodeDown = e.keyCode;
                }}
                onKeyUp={e => {
                  keyCodeUp = e.keyCode;
                }}
              />,
            );
          });
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keydown', {
              keyCode: 40,
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keyup', {
              keyCode: 40,
              bubbles: true,
              cancelable: true,
            }),
          );
          expect(keyCodeDown).toBe(40);
          expect(keyCodeUp).toBe(40);
        });
      });

      describe('when event is `keypress`', () => {
        it('returns 0', async () => {
          let keyCode = null;
          await act(() => {
            root.render(
              <input
                onKeyPress={e => {
                  keyCode = e.keyCode;
                }}
              />,
            );
          });
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keypress', {
              charCode: 65,
              bubbles: true,
              cancelable: true,
            }),
          );
          expect(keyCode).toBe(0);
        });
      });
    });

    describe('which', () => {
      describe('when event is `keypress`', () => {
        it('is consistent with `charCode`', async () => {
          let calls = 0;
          await act(() => {
            root.render(
              <input
                onKeyPress={e => {
                  expect(e.which).toBe(e.charCode);
                  calls++;
                }}
              />,
            );
          });
          // Try different combinations from other tests.
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keypress', {
              charCode: 0,
              keyCode: 13,
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keypress', {
              charCode: 32,
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keypress', {
              charCode: 13,
              bubbles: true,
              cancelable: true,
            }),
          );
          expect(calls).toBe(3);
        });
      });

      describe('when event is `keydown` or `keyup`', () => {
        it('is consistent with `keyCode`', async () => {
          let calls = 0;
          await act(() => {
            root.render(
              <input
                onKeyDown={e => {
                  expect(e.which).toBe(e.keyCode);
                  calls++;
                }}
                onKeyUp={e => {
                  expect(e.which).toBe(e.keyCode);
                  calls++;
                }}
              />,
            );
          });
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Del',
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keydown', {
              charCode: 31,
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keydown', {
              keyCode: 40,
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keyup', {
              key: 'Del',
              bubbles: true,
              cancelable: true,
            }),
          );
          container.firstChild.dispatchEvent(
            new KeyboardEvent('keyup', {
              keyCode: 40,
              bubbles: true,
              cancelable: true,
            }),
          );
          expect(calls).toBe(5);
        });
      });
    });

    describe('code', () => {
      it('returns code on `keydown`, `keyup` and `keypress`', async () => {
        let codeDown = null;
        let codeUp = null;
        let codePress = null;
        await act(() => {
          root.render(
            <input
              onKeyDown={e => {
                codeDown = e.code;
              }}
              onKeyUp={e => {
                codeUp = e.code;
              }}
              onKeyPress={e => {
                codePress = e.code;
              }}
            />,
          );
        });
        container.firstChild.dispatchEvent(
          new KeyboardEvent('keydown', {
            code: 'KeyQ',
            bubbles: true,
            cancelable: true,
          }),
        );
        container.firstChild.dispatchEvent(
          new KeyboardEvent('keyup', {
            code: 'KeyQ',
            bubbles: true,
            cancelable: true,
          }),
        );
        container.firstChild.dispatchEvent(
          new KeyboardEvent('keypress', {
            code: 'KeyQ',
            charCode: 113,
            bubbles: true,
            cancelable: true,
          }),
        );
        expect(codeDown).toBe('KeyQ');
        expect(codeUp).toBe('KeyQ');
        expect(codePress).toBe('KeyQ');
      });
    });
  });

  describe('EventInterface', () => {
    it('is able to `preventDefault` and `stopPropagation`', async () => {
      let expectedCount = 0;
      const eventHandler = event => {
        expect(event.isDefaultPrevented()).toBe(false);
        event.preventDefault();
        expect(event.isDefaultPrevented()).toBe(true);

        expect(event.isPropagationStopped()).toBe(false);
        event.stopPropagation();
        expect(event.isPropagationStopped()).toBe(true);
        expectedCount++;
      };
      await act(() => {
        root.render(
          <div
            onKeyDown={eventHandler}
            onKeyUp={eventHandler}
            onKeyPress={eventHandler}
          />,
        );
      });

      container.firstChild.dispatchEvent(
        new KeyboardEvent('keydown', {
          keyCode: 40,
          bubbles: true,
          cancelable: true,
        }),
      );
      container.firstChild.dispatchEvent(
        new KeyboardEvent('keyup', {
          keyCode: 40,
          bubbles: true,
          cancelable: true,
        }),
      );
      container.firstChild.dispatchEvent(
        new KeyboardEvent('keypress', {
          charCode: 40,
          keyCode: 40,
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(expectedCount).toBe(3);
    });
  });
});

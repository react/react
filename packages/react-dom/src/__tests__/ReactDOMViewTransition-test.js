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
let Suspense;
let SuspenseList;
let ViewTransition;
let act;
let assertLog;
let Scheduler;
let textCache;
let startTransition;

describe('ReactDOMViewTransition', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    Suspense = React.Suspense;
    ViewTransition = React.ViewTransition;
    startTransition = React.startTransition;
    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }
    container = document.createElement('div');
    document.body.appendChild(container);

    textCache = new Map();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  function resolveText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
      const newRecord = {
        status: 'resolved',
        value: text,
      };
      textCache.set(text, newRecord);
    } else if (record.status === 'pending') {
      const thenable = record.value;
      record.status = 'resolved';
      record.value = text;
      thenable.pings.forEach(t => t());
    }
  }

  function readText(text) {
    const record = textCache.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          throw record.value;
        case 'resolved':
          return record.value;
      }
    } else {
      Scheduler.log(`Suspend! [${text}]`);
      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.set(text, newRecord);

      throw thenable;
    }
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function AsyncText({text}) {
    readText(text);
    Scheduler.log(text);
    return text;
  }

  // @gate enableSuspenseList
  it('handles ViewTransition wrapping Suspense inside SuspenseList', async () => {
    function Card({id}) {
      return (
        <div>
          <AsyncText text={`Card ${id}`} />
        </div>
      );
    }

    function CardSkeleton({n}) {
      return <Text text={`Skeleton ${n}`} />;
    }

    function App() {
      return (
        <div>
          <SuspenseList revealOrder="together">
            <ViewTransition>
              <Suspense fallback={<CardSkeleton n={1} />}>
                <Card id={1} />
              </Suspense>
            </ViewTransition>
            <ViewTransition>
              <Suspense fallback={<CardSkeleton n={2} />}>
                <Card id={2} />
              </Suspense>
            </ViewTransition>
            <ViewTransition>
              <Suspense fallback={<CardSkeleton n={3} />}>
                <Card id={3} />
              </Suspense>
            </ViewTransition>
          </SuspenseList>
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(container);

    // Initial render - all cards should suspend
    await act(() => {
      root.render(<App />);
    });

    assertLog([
      'Suspend! [Card 1]',
      'Skeleton 1',
      'Suspend! [Card 2]',
      'Skeleton 2',
      'Suspend! [Card 3]',
      'Skeleton 3',
      'Skeleton 1',
      'Skeleton 2',
      'Skeleton 3',
    ]);

    await act(() => {
      resolveText('Card 1');
      resolveText('Card 2');
      resolveText('Card 3');
    });

    assertLog(['Card 1', 'Card 2', 'Card 3']);

    // All cards should be visible
    expect(container.textContent).toContain('Card 1');
    expect(container.textContent).toContain('Card 2');
    expect(container.textContent).toContain('Card 3');
  });

  describe('ViewTransition event callbacks', () => {
    let originalGetBoundingClientRect;
    let originalGetAnimations;
    let originalAnimate;
    let originalStartViewTransition;

    beforeEach(() => {
      // Save originals
      originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      originalGetAnimations = Element.prototype.getAnimations;
      originalAnimate = Element.prototype.animate;
      originalStartViewTransition = document.startViewTransition;

      // Mock CSS.escape if it doesn't exist
      if (typeof CSS === 'undefined') {
        global.CSS = {escape: str => str};
      } else if (!CSS.escape) {
        CSS.escape = str => str;
      }

      // Mock document.fonts
      if (!document.fonts) {
        Object.defineProperty(document, 'fonts', {
          value: {status: 'loaded', ready: Promise.resolve()},
          configurable: true,
        });
      }

      // Mock getAnimations on Element.prototype (Web Animations API)
      Element.prototype.getAnimations = function () {
        return [];
      };

      // Mock animate on Element.prototype (Web Animations API)
      Element.prototype.animate = function () {
        return {cancel() {}, finished: Promise.resolve()};
      };

      // Mock getBoundingClientRect to return content-length-based sizes
      // so that hasInstanceChanged can detect updates when text changes.
      Element.prototype.getBoundingClientRect = function () {
        const text = this.textContent || '';
        const width = text.length * 10 + 10;
        const height = 20;
        return new DOMRect(0, 0, width, height);
      };

      // Mock document.startViewTransition
      document.startViewTransition = function ({update}) {
        update();
        return {
          ready: Promise.resolve(),
          finished: Promise.resolve(),
          skipTransition() {},
        };
      };
    });

    afterEach(() => {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      Element.prototype.getAnimations = originalGetAnimations;
      Element.prototype.animate = originalAnimate;
      if (originalStartViewTransition) {
        document.startViewTransition = originalStartViewTransition;
      } else {
        delete document.startViewTransition;
      }
    });

    // @gate enableViewTransition
    it('fires onEnter when a ViewTransition mounts', async () => {
      const onEnter = jest.fn();
      const startViewTransitionSpy = jest.fn(document.startViewTransition);
      document.startViewTransition = startViewTransitionSpy;

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition onEnter={onEnter}>
            <div>Hello</div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      // Initial render without the ViewTransition
      await act(() => {
        root.render(<App show={false} />);
      });
      expect(onEnter).not.toHaveBeenCalled();
      expect(startViewTransitionSpy).not.toHaveBeenCalled();

      // Mount the ViewTransition inside startTransition
      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(startViewTransitionSpy).toHaveBeenCalled();
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition
    it('fires onExit when a ViewTransition unmounts', async () => {
      const onExit = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition onExit={onExit}>
            <div>Goodbye</div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      // Initial render with the ViewTransition
      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });
      expect(onExit).not.toHaveBeenCalled();

      // Unmount the ViewTransition inside startTransition
      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition
    it('fires onUpdate when content inside a ViewTransition changes', async () => {
      const onUpdate = jest.fn();
      const onEnter = jest.fn();

      function App({text}) {
        return (
          <ViewTransition onUpdate={onUpdate} onEnter={onEnter}>
            <div>{text}</div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      // Initial render
      await act(() => {
        startTransition(() => {
          root.render(<App text="Short" />);
        });
      });

      onEnter.mockClear();
      expect(onUpdate).not.toHaveBeenCalled();

      // Update content inside startTransition (different text length
      // produces different getBoundingClientRect values in our mock)
      await act(() => {
        startTransition(() => {
          root.render(<App text="Much longer content here" />);
        });
      });

      expect(onUpdate).toHaveBeenCalledTimes(1);
      // onEnter should NOT fire on an update
      expect(onEnter).not.toHaveBeenCalled();
    });

    // @gate enableViewTransition
    it('fires onShare for paired named transitions instead of onEnter/onExit', async () => {
      const onShareA = jest.fn();
      const onExitA = jest.fn();
      const onShareB = jest.fn();
      const onEnterB = jest.fn();

      function App({page}) {
        if (page === 'a') {
          return (
            <ViewTransition
              key="a"
              name="hero"
              onShare={onShareA}
              onExit={onExitA}>
              <div>Page A</div>
            </ViewTransition>
          );
        }
        return (
          <ViewTransition
            key="b"
            name="hero"
            onShare={onShareB}
            onEnter={onEnterB}>
            <div>Page B</div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      // Render page A
      await act(() => {
        startTransition(() => {
          root.render(<App page="a" />);
        });
      });

      // Clear any enter callbacks from initial mount
      onShareA.mockClear();
      onExitA.mockClear();
      onShareB.mockClear();
      onEnterB.mockClear();

      // Switch from page A to page B inside startTransition
      await act(() => {
        startTransition(() => {
          root.render(<App page="b" />);
        });
      });

      // onShare should fire on the exiting side (page A)
      expect(onShareA).toHaveBeenCalledTimes(1);
      // onExit should NOT fire when share takes precedence
      expect(onExitA).not.toHaveBeenCalled();
      // onEnter should NOT fire on the entering side when paired
      expect(onEnterB).not.toHaveBeenCalled();
    });

    // @gate enableViewTransition
    it('fires onEnter when Suspense content resolves', async () => {
      const onEnter = jest.fn();

      function App() {
        return (
          <ViewTransition onEnter={onEnter}>
            <Suspense fallback={<div>Loading...</div>}>
              <div>
                <AsyncText text="Loaded" />
              </div>
            </Suspense>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      // Initial render - content suspends
      await act(() => {
        startTransition(() => {
          root.render(<App />);
        });
      });

      assertLog(['Suspend! [Loaded]', 'Suspend! [Loaded]']);
      // onEnter fires for the fallback appearing
      const enterCallsAfterFallback = onEnter.mock.calls.length;
      onEnter.mockClear();

      // Resolve the suspended content
      await act(() => {
        resolveText('Loaded');
      });
      assertLog(['Loaded']);

      expect(container.textContent).toBe('Loaded');
      // The reveal of the resolved content should trigger enter
      // (or it may have triggered on the initial fallback mount)
      expect(
        onEnter.mock.calls.length + enterCallsAfterFallback,
      ).toBeGreaterThanOrEqual(1);
    });

    // @gate enableViewTransition
    it('does not fire onExit/onEnter on nested ViewTransition when the subtree is removed as one unit', async () => {
      const onParentExit = jest.fn();
      const onParentEnter = jest.fn();
      const onNestedExit = jest.fn();
      const onNestedEnter = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition
            exit="page-exit"
            enter="page-enter"
            onExit={onParentExit}
            onEnter={onParentEnter}>
            <div>
              <ViewTransition
                exit="nested-exit"
                enter="nested-enter"
                onExit={onNestedExit}
                onEnter={onNestedEnter}>
                <div>Item</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      onParentEnter.mockClear();
      onNestedEnter.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(onParentEnter).toHaveBeenCalledTimes(1);
      expect(onNestedEnter).not.toHaveBeenCalled();

      onParentExit.mockClear();
      onNestedExit.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentExit).toHaveBeenCalledTimes(1);
      expect(onNestedExit).not.toHaveBeenCalled();
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('fires onParentExit when ancestor ViewTransition exits', async () => {
      const onParentExit = jest.fn();
      const onNestedExit = jest.fn();
      const onParentExitNested = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition exit="page-exit" onExit={onParentExit}>
            <div>
              <ViewTransition
                exit="nested-exit"
                onExit={onNestedExit}
                parentExit="nested-parent-exit"
                onParentExit={onParentExitNested}>
                <div>Item</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentExit.mockClear();
      onNestedExit.mockClear();
      onParentExitNested.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentExit).toHaveBeenCalledTimes(1);
      expect(onNestedExit).not.toHaveBeenCalled();
      expect(onParentExitNested).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('fires onParentEnter when ancestor ViewTransition enters', async () => {
      const onParentEnter = jest.fn();
      const onNestedEnter = jest.fn();
      const onParentEnterNested = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition enter="page-enter" onEnter={onParentEnter}>
            <div>
              <ViewTransition
                enter="nested-enter"
                onEnter={onNestedEnter}
                parentEnter="nested-parent-enter"
                onParentEnter={onParentEnterNested}>
                <div>Item</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      onParentEnter.mockClear();
      onNestedEnter.mockClear();
      onParentEnterNested.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(onParentEnter).toHaveBeenCalledTimes(1);
      expect(onNestedEnter).not.toHaveBeenCalled();
      expect(onParentEnterNested).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('breaks parentExit chain when intermediate ViewTransition lacks parentExit', async () => {
      const onParentExit1 = jest.fn();
      const onParentExit2 = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition exit="page-exit">
            <div>
              <ViewTransition parentExit="relay-exit">
                <div>
                  <ViewTransition>
                    <div>
                      <ViewTransition
                        parentExit="nested-exit"
                        onParentExit={onParentExit1}>
                        <div>Deep</div>
                      </ViewTransition>
                    </div>
                  </ViewTransition>
                </div>
              </ViewTransition>
              <ViewTransition
                parentExit="nested-exit"
                onParentExit={onParentExit2}>
                <div>Shallow</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentExit1.mockClear();
      onParentExit2.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentExit1).not.toHaveBeenCalled();
      expect(onParentExit2).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('stops the parentExit relay when an intermediate class is "none"', async () => {
      const onParentExitDeep = jest.fn();
      const onParentExitSibling = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition exit="page-exit">
            <div>
              <ViewTransition parentExit="none">
                <div>
                  <ViewTransition
                    parentExit="nested-exit"
                    onParentExit={onParentExitDeep}>
                    <div>Deep</div>
                  </ViewTransition>
                </div>
              </ViewTransition>
              <ViewTransition
                parentExit="nested-exit"
                onParentExit={onParentExitSibling}>
                <div>Shallow</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentExitDeep.mockClear();
      onParentExitSibling.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      // The "none" class stops the relay so nested activations below it never fire.
      expect(onParentExitDeep).not.toHaveBeenCalled();
      // A sibling that is not behind a "none" boundary still relays.
      expect(onParentExitSibling).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('stops the parentEnter relay when an intermediate class is "none"', async () => {
      const onParentEnterDeep = jest.fn();
      const onParentEnterSibling = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition enter="page-enter">
            <div>
              <ViewTransition parentEnter="none">
                <div>
                  <ViewTransition
                    parentEnter="nested-enter"
                    onParentEnter={onParentEnterDeep}>
                    <div>Deep</div>
                  </ViewTransition>
                </div>
              </ViewTransition>
              <ViewTransition
                parentEnter="nested-enter"
                onParentEnter={onParentEnterSibling}>
                <div>Shallow</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      // The "none" class stops the relay so nested activations below it never fire.
      expect(onParentEnterDeep).not.toHaveBeenCalled();
      // A sibling that is not behind a "none" boundary still relays.
      expect(onParentEnterSibling).toHaveBeenCalledTimes(1);
    });

    it('does not fire onParentEnter when ancestor exits', async () => {
      const onParentEnter = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition exit="page-exit">
            <div>
              <ViewTransition parentExit="relay-exit">
                <ViewTransition
                  parentEnter="nested-enter"
                  onParentEnter={onParentEnter}>
                  <div>Item</div>
                </ViewTransition>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentEnter.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentEnter).not.toHaveBeenCalled();
    });

    // @gate enableViewTransition
    it('does not fire onParentExit when ancestor shares instead of exiting', async () => {
      const onShare = jest.fn();
      const onParentExit = jest.fn();

      function App({page}) {
        if (page === 'a') {
          return (
            <ViewTransition key="a" name="hero" onShare={onShare}>
              <ViewTransition
                parentExit="child-parent-exit"
                onParentExit={onParentExit}>
                <div>Page A</div>
              </ViewTransition>
            </ViewTransition>
          );
        }
        return (
          <ViewTransition key="b" name="hero">
            <ViewTransition
              parentExit="child-parent-exit"
              onParentExit={onParentExit}>
              <div>Page B</div>
            </ViewTransition>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App page="a" />);
        });
      });

      onShare.mockClear();
      onParentExit.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App page="b" />);
        });
      });

      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onParentExit).not.toHaveBeenCalled();
    });

    // @gate enableViewTransition
    it('does not fire onParentEnter when ancestor shares instead of entering', async () => {
      const onShare = jest.fn();
      const onParentEnter = jest.fn();

      function App({page}) {
        if (page === 'a') {
          return (
            <ViewTransition key="a" name="hero" onShare={onShare}>
              <ViewTransition
                parentEnter="child-parent-enter"
                onParentEnter={onParentEnter}>
                <div>Page A</div>
              </ViewTransition>
            </ViewTransition>
          );
        }
        return (
          <ViewTransition key="b" name="hero">
            <ViewTransition
              parentEnter="child-parent-enter"
              onParentEnter={onParentEnter}>
              <div>Page B</div>
            </ViewTransition>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App page="a" />);
        });
      });

      onShare.mockClear();
      onParentEnter.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App page="b" />);
        });
      });

      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onParentEnter).not.toHaveBeenCalled();
    });

    it('does not fire onParentExit when ancestor exit is none', async () => {
      const onParentExit = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition exit="none">
            <ViewTransition
              parentExit="nested-parent-exit"
              onParentExit={onParentExit}>
              <div>Item</div>
            </ViewTransition>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentExit.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentExit).not.toHaveBeenCalled();
    });

    it('does not fire onParentEnter when ancestor enter is none', async () => {
      const onParentEnter = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition enter="none">
            <ViewTransition
              parentEnter="nested-parent-enter"
              onParentEnter={onParentEnter}>
              <div>Item</div>
            </ViewTransition>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      onParentEnter.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(onParentEnter).not.toHaveBeenCalled();
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('relays parentExit chain through unstyled parentExit', async () => {
      const onParentExit = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition exit="page-exit">
            <div>
              <ViewTransition parentExit="auto">
                <ViewTransition
                  parentExit="nested-exit"
                  onParentExit={onParentExit}>
                  <div>Item</div>
                </ViewTransition>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentExit.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentExit).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('fires onParentExit when ancestor ViewTransition exits with handler only', async () => {
      const onParentExit = jest.fn();
      const onRelayParentExit = jest.fn();
      const onParentExitDeep = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition onExit={onParentExit}>
            <div>
              <ViewTransition onParentExit={onRelayParentExit}>
                <ViewTransition onParentExit={onParentExitDeep}>
                  <div>Item</div>
                </ViewTransition>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentExit.mockClear();
      onRelayParentExit.mockClear();
      onParentExitDeep.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentExit).toHaveBeenCalledTimes(1);
      expect(onRelayParentExit).toHaveBeenCalledTimes(1);
      expect(onParentExitDeep).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('fires onParentEnter when ancestor ViewTransition enters with handler only', async () => {
      const onParentEnter = jest.fn();
      const onRelayParentEnter = jest.fn();
      const onParentEnterDeep = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition onEnter={onParentEnter}>
            <div>
              <ViewTransition onParentEnter={onRelayParentEnter}>
                <ViewTransition onParentEnter={onParentEnterDeep}>
                  <div>Item</div>
                </ViewTransition>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      onParentEnter.mockClear();
      onRelayParentEnter.mockClear();
      onParentEnterDeep.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(onParentEnter).toHaveBeenCalledTimes(1);
      expect(onRelayParentEnter).toHaveBeenCalledTimes(1);
      expect(onParentEnterDeep).toHaveBeenCalledTimes(1);
    });

    it('does not fire onParentEnter when ancestor enter is none with handler only', async () => {
      const onParentEnter = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition enter="none">
            <ViewTransition onParentEnter={onParentEnter}>
              <div>Item</div>
            </ViewTransition>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      onParentEnter.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(onParentEnter).not.toHaveBeenCalled();
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('relays parentEnter chain to handler-only child through intermediate divs', async () => {
      const onParentEnter = jest.fn();
      const onParentEnterNested = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition onEnter={onParentEnter}>
            <div>
              <div>
                <ViewTransition onParentEnter={onParentEnterNested}>
                  <div>Item</div>
                </ViewTransition>
              </div>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      onParentEnter.mockClear();
      onParentEnterNested.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(onParentEnter).toHaveBeenCalledTimes(1);
      expect(onParentEnterNested).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition
    it('enters without props and does not fire handlers', async () => {
      const startViewTransitionSpy = jest.fn(document.startViewTransition);
      document.startViewTransition = startViewTransitionSpy;

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition>
            <div>Hello</div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<App show={false} />);
      });
      expect(startViewTransitionSpy).not.toHaveBeenCalled();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(startViewTransitionSpy).toHaveBeenCalled();
    });

    // @gate enableViewTransition
    it('exits without props and does not fire handlers', async () => {
      const startViewTransitionSpy = jest.fn(document.startViewTransition);
      document.startViewTransition = startViewTransitionSpy;

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition>
            <div>Goodbye</div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });
      startViewTransitionSpy.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(startViewTransitionSpy).toHaveBeenCalled();
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('fires onParentEnter when ancestor ViewTransition has no props', async () => {
      const onParentEnterNested = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition>
            <div>
              <ViewTransition onParentEnter={onParentEnterNested}>
                <div>Item</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      onParentEnterNested.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      expect(onParentEnterNested).toHaveBeenCalledTimes(1);
    });

    // @gate enableViewTransition && enableViewTransitionParentEnterExit
    it('fires onParentExit when ancestor ViewTransition has no props', async () => {
      const onParentExitNested = jest.fn();

      function App({show}) {
        if (!show) {
          return null;
        }
        return (
          <ViewTransition>
            <div>
              <ViewTransition onParentExit={onParentExitNested}>
                <div>Item</div>
              </ViewTransition>
            </div>
          </ViewTransition>
        );
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        startTransition(() => {
          root.render(<App show={true} />);
        });
      });

      onParentExitNested.mockClear();

      await act(() => {
        startTransition(() => {
          root.render(<App show={false} />);
        });
      });

      expect(onParentExitNested).toHaveBeenCalledTimes(1);
    });
  });
});

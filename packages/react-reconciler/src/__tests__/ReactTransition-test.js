/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let Suspense;
let useState;
let useLayoutEffect;
let useTransition;
let startTransition;
let act;
let getCacheForType;
let waitForAll;
let waitFor;
let waitForPaint;
let assertLog;

let caches;
let seededCache;

describe('ReactTransition', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    useState = React.useState;
    useLayoutEffect = React.useLayoutEffect;
    useTransition = React.useTransition;
    Suspense = React.Suspense;
    startTransition = React.startTransition;
    getCacheForType = React.unstable_getCacheForType;
    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForPaint = InternalTestUtils.waitForPaint;
    assertLog = InternalTestUtils.assertLog;

    caches = [];
    seededCache = null;
  });

  function createTextCache() {
    if (seededCache !== null) {
      // Trick to seed a cache before it exists.
      // TODO: Need a built-in API to seed data before the initial render (i.e.
      // not a refresh because nothing has mounted yet).
      const cache = seededCache;
      seededCache = null;
      return cache;
    }

    const data = new Map();
    const version = caches.length + 1;
    const cache = {
      version,
      data,
      resolve(text) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'resolved',
            value: text,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'resolved';
          record.value = text;
          thenable.pings.forEach(t => t());
        }
      },
      reject(text, error) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'rejected',
            value: error,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'rejected';
          record.value = error;
          thenable.pings.forEach(t => t());
        }
      },
    };
    caches.push(cache);
    return cache;
  }

  function readText(text) {
    const textCache = getCacheForType(createTextCache);
    const record = textCache.data.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          Scheduler.log(`Error! [${text}]`);
          throw record.value;
        case 'resolved':
          return textCache.version;
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
      textCache.data.set(text, newRecord);

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

  function seedNextTextCache(text) {
    if (seededCache === null) {
      seededCache = createTextCache();
    }
    seededCache.resolve(text);
  }

  function resolveText(text) {
    if (caches.length === 0) {
      throw Error('Cache does not exist.');
    } else {
      // Resolve the most recently created cache. An older cache can by
      // resolved with `caches[index].resolve(text)`.
      caches[caches.length - 1].resolve(text);
    }
  }

  // @gate enableLegacyCache
  it('isPending works even if called from outside an input event', async () => {
    let start;
    function App() {
      const [show, setShow] = useState(false);
      const [isPending, _start] = useTransition();
      start = () => _start(() => setShow(true));
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {isPending ? <Text text="Pending..." /> : null}
          {show ? <AsyncText text="Async" /> : <Text text="(empty)" />}
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();

    await act(() => {
      root.render(<App />);
    });
    assertLog(['(empty)']);
    expect(root).toMatchRenderedOutput('(empty)');

    await act(async () => {
      start();

      await waitForAll([
        'Pending...',
        '(empty)',
        'Suspend! [Async]',
        'Loading...',
      ]);

      expect(root).toMatchRenderedOutput('Pending...(empty)');

      await resolveText('Async');
    });
    assertLog(['Async']);
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate enableLegacyCache
  it('when multiple transitions update different queues, they entangle', async () => {
    let setA;
    let startTransitionA;
    let setB;
    let startTransitionB;
    function A() {
      const [a, _setA] = useState(0);
      const [isPending, _startTransitionA] = useTransition();
      setA = _setA;
      startTransitionA = _startTransitionA;

      return (
        <span>
          {isPending && (
            <span>
              <Text text="Pending A..." />
            </span>
          )}
          <AsyncText text={`A: ${a}`} />
        </span>
      );
    }

    function B() {
      const [b, _setB] = useState(0);
      const [isPending, _startTransitionB] = useTransition();
      setB = _setB;
      startTransitionB = _startTransitionB;

      return (
        <span>
          {isPending && (
            <span>
              <Text text="Pending B..." />
            </span>
          )}
          <AsyncText text={`B: ${b}`} />
        </span>
      );
    }
    function App() {
      return (
        <>
          <Suspense fallback={<span>Loading A</span>}>
            <A />
          </Suspense>
          <Suspense fallback={<span>Loading B</span>}>
            <B />
          </Suspense>
        </>
      );
    }

    // Initial render
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog([
      'Suspend! [A: 0]',
      'Suspend! [B: 0]',
      'Suspend! [A: 0]',
      'Suspend! [B: 0]',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
      </>,
    );

    // Resolve
    await act(() => {
      resolveText('A: 0');
      resolveText('B: 0');
    });
    assertLog(['A: 0', 'B: 0']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>A: 0</span>
        <span>B: 0</span>
      </>,
    );

    // Start transitioning A
    await act(() => {
      startTransitionA(() => {
        setA(1);
      });
    });
    assertLog(['Pending A...', 'A: 0', 'Suspend! [A: 1]']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>
          <span>Pending A...</span>A: 0
        </span>
        <span>B: 0</span>
      </>,
    );

    // Start transitioning B
    await act(() => {
      startTransitionB(() => {
        setB(1);
      });
    });
    assertLog(['Pending B...', 'B: 0', 'Suspend! [A: 1]', 'Suspend! [B: 1]']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>
          <span>Pending A...</span>A: 0
        </span>
        <span>
          <span>Pending B...</span>B: 0
        </span>
      </>,
    );

    // Resolve B
    await act(() => {
      resolveText('B: 1');
    });
    assertLog(
      gate('enableParallelTransitions')
        ? ['B: 1', 'Suspend! [A: 1]']
        : ['Suspend! [A: 1]', 'B: 1'],
    );
    expect(root).toMatchRenderedOutput(
      gate('enableParallelTransitions') ? (
        <>
          <span>
            <span>Pending A...</span>A: 0
          </span>
          <span>B: 1</span>
        </>
      ) : (
        <>
          <span>
            <span>Pending A...</span>A: 0
          </span>
          <span>
            <span>Pending B...</span>B: 0
          </span>
        </>
      ),
    );

    // Resolve A
    await act(() => {
      resolveText('A: 1');
    });
    assertLog(gate('enableParallelTransitions') ? ['A: 1'] : ['A: 1', 'B: 1']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>A: 1</span>
        <span>B: 1</span>
      </>,
    );
  });

  // @gate enableLegacyCache
  it('when multiple transitions update different queues, but suspend the same boundary, they do entangle', async () => {
    let setA;
    let startTransitionA;
    let setB;
    let startTransitionB;
    function A() {
      const [a, _setA] = useState(0);
      const [isPending, _startTransitionA] = useTransition();
      setA = _setA;
      startTransitionA = _startTransitionA;

      return (
        <span>
          {isPending && (
            <span>
              <Text text="Pending A..." />
            </span>
          )}
          <AsyncText text={`A: ${a}`} />
        </span>
      );
    }

    function B() {
      const [b, _setB] = useState(0);
      const [isPending, _startTransitionB] = useTransition();
      setB = _setB;
      startTransitionB = _startTransitionB;

      return (
        <span>
          {isPending && (
            <span>
              <Text text="Pending B..." />
            </span>
          )}
          <AsyncText text={`B: ${b}`} />
        </span>
      );
    }
    function App() {
      return (
        <Suspense fallback={<span>Loading...</span>}>
          <A />
          <B />
        </Suspense>
      );
    }

    // Initial render
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog([
      'Suspend! [A: 0]',
      // pre-warming
      'Suspend! [A: 0]',
      'Suspend! [B: 0]',
    ]);
    expect(root).toMatchRenderedOutput(<span>Loading...</span>);

    // Resolve
    await act(() => {
      resolveText('A: 0');
      resolveText('B: 0');
    });
    assertLog(['A: 0', 'B: 0']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>A: 0</span>
        <span>B: 0</span>
      </>,
    );

    // Start transitioning A
    await act(() => {
      startTransitionA(() => {
        setA(1);
      });
    });
    assertLog(['Pending A...', 'A: 0', 'Suspend! [A: 1]']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>
          <span>Pending A...</span>A: 0
        </span>
        <span>B: 0</span>
      </>,
    );

    // Start transitioning B
    await act(() => {
      startTransitionB(() => {
        setB(1);
      });
    });
    assertLog(['Pending B...', 'B: 0', 'Suspend! [A: 1]', 'Suspend! [B: 1]']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>
          <span>Pending A...</span>A: 0
        </span>
        <span>
          <span>Pending B...</span>B: 0
        </span>
      </>,
    );

    // Resolve B
    await act(() => {
      resolveText('B: 1');
    });
    assertLog(
      gate('enableParallelTransitions')
        ? ['B: 1', 'Suspend! [A: 1]']
        : ['Suspend! [A: 1]', 'B: 1'],
    );
    expect(root).toMatchRenderedOutput(
      gate('enableParallelTransitions') ? (
        <>
          <span>
            <span>Pending A...</span>A: 0
          </span>
          <span>B: 1</span>
        </>
      ) : (
        <>
          <span>
            <span>Pending A...</span>A: 0
          </span>
          <span>
            <span>Pending B...</span>B: 0
          </span>
        </>
      ),
    );

    // Resolve A
    await act(() => {
      resolveText('A: 1');
    });
    assertLog(gate('enableParallelTransitions') ? ['A: 1'] : ['A: 1', 'B: 1']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>A: 1</span>
        <span>B: 1</span>
      </>,
    );
  });

  // @gate enableLegacyCache
  it(
    'when multiple transitions update the same queue, only the most recent ' +
      'one is allowed to finish (no intermediate states)',
    async () => {
      let update;
      function App() {
        const [isContentPending, startContentChange] = useTransition();
        const [label, setLabel] = useState('A');
        const [contents, setContents] = useState('A');
        update = value => {
          ReactNoop.discreteUpdates(() => {
            setLabel(value);
            startContentChange(() => {
              setContents(value);
            });
          });
        };
        return (
          <>
            <Text
              text={
                label + ' label' + (isContentPending ? ' (loading...)' : '')
              }
            />
            <div>
              <Suspense fallback={<Text text="Loading..." />}>
                <AsyncText text={contents + ' content'} />
              </Suspense>
            </div>
          </>
        );
      }

      // Initial render
      const root = ReactNoop.createRoot();
      await act(() => {
        seedNextTextCache('A content');
        root.render(<App />);
      });
      assertLog(['A label', 'A content']);
      expect(root).toMatchRenderedOutput(
        <>
          A label<div>A content</div>
        </>,
      );

      // Switch to B
      await act(() => {
        update('B');
      });
      assertLog([
        // Commit pending state
        'B label (loading...)',
        'A content',

        // Attempt to render B, but it suspends
        'B label',
        'Suspend! [B content]',
        'Loading...',
      ]);
      // This is a refresh transition so it shouldn't show a fallback
      expect(root).toMatchRenderedOutput(
        <>
          B label (loading...)<div>A content</div>
        </>,
      );

      // Before B finishes loading, switch to C
      await act(() => {
        update('C');
      });
      assertLog([
        // Commit pending state
        'C label (loading...)',
        'A content',

        // Attempt to render C, but it suspends
        'C label',
        'Suspend! [C content]',
        'Loading...',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          C label (loading...)<div>A content</div>
        </>,
      );

      // Finish loading B. But we're not allowed to render B because it's
      // entangled with C. So we're still pending.
      await act(() => {
        resolveText('B content');
      });
      assertLog([
        // Attempt to render C, but it suspends
        'C label',
        'Suspend! [C content]',
        'Loading...',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          C label (loading...)<div>A content</div>
        </>,
      );

      // Now finish loading C. This is the terminal update, so it can finish.
      await act(() => {
        resolveText('C content');
      });
      assertLog(['C label', 'C content']);
      expect(root).toMatchRenderedOutput(
        <>
          C label<div>C content</div>
        </>,
      );
    },
  );

  // Same as previous test, but for class update queue.
  // @gate enableLegacyCache
  it(
    'when multiple transitions update the same queue, only the most recent ' +
      'one is allowed to finish (no intermediate states) (classes)',
    async () => {
      let update;
      class App extends React.Component {
        state = {
          label: 'A',
          contents: 'A',
        };
        render() {
          update = value => {
            ReactNoop.discreteUpdates(() => {
              this.setState({label: value});
              startTransition(() => {
                this.setState({contents: value});
              });
            });
          };
          const label = this.state.label;
          const contents = this.state.contents;
          const isContentPending = label !== contents;
          return (
            <>
              <Text
                text={
                  label + ' label' + (isContentPending ? ' (loading...)' : '')
                }
              />
              <div>
                <Suspense fallback={<Text text="Loading..." />}>
                  <AsyncText text={contents + ' content'} />
                </Suspense>
              </div>
            </>
          );
        }
      }

      // Initial render
      const root = ReactNoop.createRoot();
      await act(() => {
        seedNextTextCache('A content');
        root.render(<App />);
      });
      assertLog(['A label', 'A content']);
      expect(root).toMatchRenderedOutput(
        <>
          A label<div>A content</div>
        </>,
      );

      // Switch to B
      await act(() => {
        update('B');
      });
      assertLog([
        // Commit pending state
        'B label (loading...)',
        'A content',

        // Attempt to render B, but it suspends
        'B label',
        'Suspend! [B content]',
        'Loading...',
      ]);
      // This is a refresh transition so it shouldn't show a fallback
      expect(root).toMatchRenderedOutput(
        <>
          B label (loading...)<div>A content</div>
        </>,
      );

      // Before B finishes loading, switch to C
      await act(() => {
        update('C');
      });
      assertLog([
        // Commit pending state
        'C label (loading...)',
        'A content',

        // Attempt to render C, but it suspends
        'C label',
        'Suspend! [C content]',
        'Loading...',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          C label (loading...)<div>A content</div>
        </>,
      );

      // Finish loading B. But we're not allowed to render B because it's
      // entangled with C. So we're still pending.
      await act(() => {
        resolveText('B content');
      });
      assertLog([
        // Attempt to render C, but it suspends
        'C label',
        'Suspend! [C content]',
        'Loading...',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          C label (loading...)<div>A content</div>
        </>,
      );

      // Now finish loading C. This is the terminal update, so it can finish.
      await act(() => {
        resolveText('C content');
      });
      assertLog(['C label', 'C content']);
      expect(root).toMatchRenderedOutput(
        <>
          C label<div>C content</div>
        </>,
      );
    },
  );

  // @gate enableLegacyCache
  it(
    'when multiple transitions update overlapping queues, all the transitions ' +
      'across all the queues are entangled',
    async () => {
      let setShowA;
      let setShowB;
      let setShowC;
      function App() {
        const [showA, _setShowA] = useState(false);
        const [showB, _setShowB] = useState(false);
        const [showC, _setShowC] = useState(false);
        setShowA = _setShowA;
        setShowB = _setShowB;
        setShowC = _setShowC;

        // Only one of these children should be visible at a time. Except
        // instead of being modeled as a single state, it's three separate
        // states that are updated simultaneously. This may seem a bit
        // contrived, but it's more common than you might think. Usually via
        // a framework or indirection. For example, consider a tooltip manager
        // that only shows a single tooltip at a time. Or a router that
        // highlights links to the active route.
        return (
          <>
            <Suspense fallback={<Text text="Loading..." />}>
              {showA ? <AsyncText text="A" /> : null}
              {showB ? <AsyncText text="B" /> : null}
              {showC ? <AsyncText text="C" /> : null}
            </Suspense>
          </>
        );
      }

      // Initial render. Start with all children hidden.
      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App />);
      });
      assertLog([]);
      expect(root).toMatchRenderedOutput(null);

      // Switch to A.
      await act(() => {
        startTransition(() => {
          setShowA(true);
        });
      });
      assertLog(['Suspend! [A]', 'Loading...']);
      expect(root).toMatchRenderedOutput(null);

      // Before A loads, switch to B. This should entangle A with B.
      await act(() => {
        startTransition(() => {
          setShowA(false);
          setShowB(true);
        });
      });
      assertLog(['Suspend! [B]', 'Loading...']);
      expect(root).toMatchRenderedOutput(null);

      // Before A or B loads, switch to C. This should entangle C with B, and
      // transitively entangle C with A.
      await act(() => {
        startTransition(() => {
          setShowB(false);
          setShowC(true);
        });
      });
      assertLog(['Suspend! [C]', 'Loading...']);
      expect(root).toMatchRenderedOutput(null);

      // Now the data starts resolving out of order.

      // First resolve B. This will attempt to render C, since everything is
      // entangled.
      await act(() => {
        startTransition(() => {
          resolveText('B');
        });
      });
      assertLog(['Suspend! [C]', 'Loading...']);
      expect(root).toMatchRenderedOutput(null);

      // Now resolve A. Again, this will attempt to render C, since everything
      // is entangled.
      await act(() => {
        startTransition(() => {
          resolveText('A');
        });
      });
      assertLog(['Suspend! [C]', 'Loading...']);
      expect(root).toMatchRenderedOutput(null);

      // Finally, resolve C. This time we can finish.
      await act(() => {
        startTransition(() => {
          resolveText('C');
        });
      });
      assertLog(['C']);
      expect(root).toMatchRenderedOutput('C');
    },
  );

  // @gate enableLegacyCache
  it('interrupt a refresh transition if a new transition is scheduled', async () => {
    const root = ReactNoop.createRoot();

    await act(() => {
      root.render(
        <>
          <Suspense fallback={<Text text="Loading..." />} />
          <Text text="Initial" />
        </>,
      );
    });
    assertLog(['Initial']);
    expect(root).toMatchRenderedOutput('Initial');

    await act(async () => {
      // Start a refresh transition
      startTransition(() => {
        root.render(
          <>
            <Suspense fallback={<Text text="Loading..." />}>
              <AsyncText text="Async" />
            </Suspense>
            <Text text="After Suspense" />
            <Text text="Sibling" />
          </>,
        );
      });

      // Partially render it.
      await waitFor([
        // Once we the update suspends, we know it's a refresh transition,
        // because the Suspense boundary has already mounted.
        'Suspend! [Async]',
        'Loading...',
        'After Suspense',
      ]);

      // Schedule a new transition
      startTransition(async () => {
        root.render(
          <>
            <Suspense fallback={<Text text="Loading..." />} />
            <Text text="Updated" />
          </>,
        );
      });
    });

    // Because the first one is going to suspend regardless, we should
    // immediately switch to rendering the new transition.
    assertLog(['Updated']);
    expect(root).toMatchRenderedOutput('Updated');
  });

  // @gate enableLegacyCache
  it(
    "interrupt a refresh transition when something suspends and we've " +
      'already bailed out on another transition in a parent',
    async () => {
      let setShouldSuspend;

      function Parent({children}) {
        const [shouldHideInParent, _setShouldHideInParent] = useState(false);
        setShouldHideInParent = _setShouldHideInParent;
        Scheduler.log('shouldHideInParent: ' + shouldHideInParent);
        if (shouldHideInParent) {
          return <Text text="(empty)" />;
        }
        return children;
      }

      let setShouldHideInParent;
      function App() {
        const [shouldSuspend, _setShouldSuspend] = useState(false);
        setShouldSuspend = _setShouldSuspend;
        return (
          <>
            <Text text="A" />
            <Parent>
              <Suspense fallback={<Text text="Loading..." />}>
                {shouldSuspend ? <AsyncText text="Async" /> : null}
              </Suspense>
            </Parent>
            <Text text="B" />
            <Text text="C" />
          </>
        );
      }

      const root = ReactNoop.createRoot();

      await act(async () => {
        root.render(<App />);
        await waitForAll(['A', 'shouldHideInParent: false', 'B', 'C']);
        expect(root).toMatchRenderedOutput('ABC');

        // Schedule an update
        startTransition(() => {
          setShouldSuspend(true);
        });

        // Now we need to trigger schedule another transition in a different
        // lane from the first one. At the time this was written, all transitions are worked on
        // simultaneously, unless a transition was already in progress when a
        // new one was scheduled. So, partially render the first transition.
        await waitFor(['A']);

        // Now schedule a second transition. We won't interrupt the first one.
        React.startTransition(() => {
          setShouldHideInParent(true);
        });
        // Continue rendering the first transition.
        await waitFor([
          'shouldHideInParent: false',
          'Suspend! [Async]',
          'Loading...',
          'B',
        ]);
        // Should not have committed loading state
        expect(root).toMatchRenderedOutput('ABC');

        // At this point, we've processed the parent update queue, so we know
        // that it has a pending update from the second transition, even though
        // we skipped it during this render. And we know this is a refresh
        // transition, because we had to render a loading state. So the next
        // time we re-enter the work loop (we don't interrupt immediately, we
        // just wait for the next time slice), we should throw out the
        // suspended first transition and try the second one.
        await waitForPaint(['shouldHideInParent: true', '(empty)']);
        expect(root).toMatchRenderedOutput('A(empty)BC');

        // Since the two transitions are not entangled, we then later go back
        // and finish retry the first transition. Not really relevant to this
        // test but I'll assert the result anyway.
        await waitForAll([
          'A',
          'shouldHideInParent: true',
          '(empty)',
          'B',
          'C',
        ]);
        expect(root).toMatchRenderedOutput('A(empty)BC');
      });
    },
  );

  // @gate enableLegacyCache
  it(
    'interrupt a refresh transition when something suspends and a parent ' +
      'component received an interleaved update after its queue was processed',
    async () => {
      // Title is confusing so I'll try to explain further: This is similar to
      // the previous test, except instead of skipped over a transition update
      // in a parent, the parent receives an interleaved update *after* its
      // begin phase has already finished.

      function App({shouldSuspend, step}) {
        return (
          <>
            <Text text={`A${step}`} />
            <Suspense fallback={<Text text="Loading..." />}>
              {shouldSuspend ? <AsyncText text="Async" /> : null}
            </Suspense>
            <Text text={`B${step}`} />
            <Text text={`C${step}`} />
          </>
        );
      }

      const root = ReactNoop.createRoot();

      await act(() => {
        root.render(<App shouldSuspend={false} step={0} />);
      });
      assertLog(['A0', 'B0', 'C0']);
      expect(root).toMatchRenderedOutput('A0B0C0');

      await act(async () => {
        // This update will suspend.
        startTransition(() => {
          root.render(<App shouldSuspend={true} step={1} />);
        });
        // Flush past the root, but stop before the async component.
        await waitFor(['A1']);

        // Schedule another transition on the root, which already completed.
        startTransition(() => {
          root.render(<App shouldSuspend={false} step={2} />);
        });
        // We'll keep working on the first update.
        await waitFor([
          // Now the async component suspends
          'Suspend! [Async]',
          'Loading...',
          'B1',
        ]);
        // Should not have committed loading state
        expect(root).toMatchRenderedOutput('A0B0C0');

        // After suspending, should abort the first update and switch to the
        // second update. So, C1 should not appear in the log.
        // TODO: This should work even if React does not yield to the main
        // thread. Should use same mechanism as selective hydration to interrupt
        // the render before the end of the current slice of work.
        await waitForAll(['A2', 'B2', 'C2']);

        expect(root).toMatchRenderedOutput('A2B2C2');
      });
    },
  );

  it('should render normal pri updates scheduled after transitions before transitions', async () => {
    let updateTransitionPri;
    let updateNormalPri;
    function App() {
      const [normalPri, setNormalPri] = useState(0);
      const [transitionPri, setTransitionPri] = useState(0);
      updateTransitionPri = () =>
        startTransition(() => setTransitionPri(n => n + 1));
      updateNormalPri = () => setNormalPri(n => n + 1);

      useLayoutEffect(() => {
        Scheduler.log('Commit');
      });

      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text={'Transition pri: ' + transitionPri} />
          {', '}
          <Text text={'Normal pri: ' + normalPri} />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });

    // Initial render.
    assertLog(['Transition pri: 0', 'Normal pri: 0', 'Commit']);
    expect(root).toMatchRenderedOutput('Transition pri: 0, Normal pri: 0');

    await act(() => {
      updateTransitionPri();
      updateNormalPri();
    });

    assertLog([
      // Normal update first.
      'Transition pri: 0',
      'Normal pri: 1',
      'Commit',

      // Then transition update.
      'Transition pri: 1',
      'Normal pri: 1',
      'Commit',
    ]);
    expect(root).toMatchRenderedOutput('Transition pri: 1, Normal pri: 1');
  });

  // @gate enableLegacyCache
  it('should render normal pri updates before transition suspense retries', async () => {
    let updateTransitionPri;
    let updateNormalPri;
    function App() {
      const [transitionPri, setTransitionPri] = useState(false);
      const [normalPri, setNormalPri] = useState(0);

      updateTransitionPri = () => startTransition(() => setTransitionPri(true));
      updateNormalPri = () => setNormalPri(n => n + 1);

      useLayoutEffect(() => {
        Scheduler.log('Commit');
      });

      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {transitionPri ? <AsyncText text="Async" /> : <Text text="(empty)" />}
          {', '}
          <Text text={'Normal pri: ' + normalPri} />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });

    // Initial render.
    assertLog(['(empty)', 'Normal pri: 0', 'Commit']);
    expect(root).toMatchRenderedOutput('(empty), Normal pri: 0');

    await act(() => {
      updateTransitionPri();
    });

    assertLog([
      // Suspend.
      'Suspend! [Async]',
      // pre-warming
      'Normal pri: 0',
      // end pre-warming
      'Loading...',
    ]);
    expect(root).toMatchRenderedOutput('(empty), Normal pri: 0');

    await act(async () => {
      await resolveText('Async');
      updateNormalPri();
    });

    assertLog([
      // Normal pri update.
      '(empty)',
      'Normal pri: 1',
      'Commit',

      // Promise resolved, retry flushed.
      'Async',
      'Normal pri: 1',
      'Commit',
    ]);
    expect(root).toMatchRenderedOutput('Async, Normal pri: 1');
  });

  it('should not interrupt transitions with normal pri updates', async () => {
    let updateNormalPri;
    let updateTransitionPri;
    function App() {
      const [transitionPri, setTransitionPri] = useState(0);
      const [normalPri, setNormalPri] = useState(0);
      updateTransitionPri = () =>
        startTransition(() => setTransitionPri(n => n + 1));
      updateNormalPri = () => setNormalPri(n => n + 1);

      useLayoutEffect(() => {
        Scheduler.log('Commit');
      });
      return (
        <>
          <Text text={'Transition pri: ' + transitionPri} />
          {', '}
          <Text text={'Normal pri: ' + normalPri} />
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Transition pri: 0', 'Normal pri: 0', 'Commit']);
    expect(root).toMatchRenderedOutput('Transition pri: 0, Normal pri: 0');

    await act(async () => {
      updateTransitionPri();

      await waitFor([
        // Start transition update.
        'Transition pri: 1',
      ]);

      // Schedule normal pri update during transition update.
      // This should not interrupt.
      updateNormalPri();
    });

    assertLog([
      'Normal pri: 0',
      'Commit',

      // Normal pri update.
      'Transition pri: 1',
      'Normal pri: 1',
      'Commit',
    ]);

    expect(root).toMatchRenderedOutput('Transition pri: 1, Normal pri: 1');
  });

  it('tracks two pending flags for nested startTransition (#26226)', async () => {
    let update;
    function App() {
      const [isPendingA, startTransitionA] = useTransition();
      const [isPendingB, startTransitionB] = useTransition();
      const [state, setState] = useState(0);

      update = function () {
        startTransitionA(() => {
          startTransitionB(() => {
            setState(1);
          });
        });
      };

      return (
        <>
          <Text text={state} />
          {', '}
          <Text text={'A ' + isPendingA} />
          {', '}
          <Text text={'B ' + isPendingB} />
        </>
      );
    }
    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(<App />);
    });
    assertLog([0, 'A false', 'B false']);
    expect(root).toMatchRenderedOutput('0, A false, B false');

    await act(async () => {
      update();
    });
    assertLog([0, 'A true', 'B true', 1, 'A false', 'B false']);
    expect(root).toMatchRenderedOutput('1, A false, B false');
  });
});

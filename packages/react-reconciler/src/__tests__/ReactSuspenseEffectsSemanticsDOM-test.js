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
let Scheduler;
let act;
let container;
let waitForAll;
let assertLog;
let fakeModuleCache;

describe('ReactSuspenseEffectsSemanticsDOM', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;

    container = document.createElement('div');
    document.body.appendChild(container);

    fakeModuleCache = new Map();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  async function fakeImport(Component) {
    const record = fakeModuleCache.get(Component);
    if (record === undefined) {
      const newRecord = {
        status: 'pending',
        value: {default: Component},
        pings: [],
        then(ping) {
          switch (newRecord.status) {
            case 'pending': {
              newRecord.pings.push(ping);
              return;
            }
            case 'resolved': {
              ping(newRecord.value);
              return;
            }
            case 'rejected': {
              throw newRecord.value;
            }
          }
        },
      };
      fakeModuleCache.set(Component, newRecord);
      return newRecord;
    }
    return record;
  }

  function resolveFakeImport(moduleName) {
    const record = fakeModuleCache.get(moduleName);
    if (record === undefined) {
      throw new Error('Module not found');
    }
    if (record.status !== 'pending') {
      throw new Error('Module already resolved');
    }
    record.status = 'resolved';
    record.pings.forEach(ping => ping(record.value));
  }

  function Text(props) {
    Scheduler.log(props.text);
    return props.text;
  }

  it('should not cause a cycle when combined with a render phase update', async () => {
    let scheduleSuspendingUpdate;

    function App() {
      const [value, setValue] = React.useState(true);

      scheduleSuspendingUpdate = () => setValue(!value);

      return (
        <>
          <React.Suspense fallback="Loading...">
            <ComponentThatCausesBug value={value} />
            <ComponentThatSuspendsOnUpdate shouldSuspend={!value} />
          </React.Suspense>
        </>
      );
    }

    function ComponentThatCausesBug({value}) {
      const [mirroredValue, setMirroredValue] = React.useState(value);
      if (mirroredValue !== value) {
        setMirroredValue(value);
      }

      // eslint-disable-next-line no-unused-vars
      const [_, setRef] = React.useState(null);

      return <div ref={setRef} />;
    }

    const neverResolves = {then() {}};

    function ComponentThatSuspendsOnUpdate({shouldSuspend}) {
      if (shouldSuspend) {
        // Fake Suspend
        throw neverResolves;
      }
      return null;
    }

    await act(() => {
      const root = ReactDOMClient.createRoot(container);
      root.render(<App />);
    });

    await act(() => {
      scheduleSuspendingUpdate();
    });
  });

  it('does not destroy ref cleanup twice when hidden child is removed', async () => {
    function ChildA({label}) {
      return (
        <span
          ref={node => {
            if (node) {
              Scheduler.log('Ref mount: ' + label);
            } else {
              Scheduler.log('Ref unmount: ' + label);
            }
          }}>
          <Text text={label} />
        </span>
      );
    }

    function ChildB({label}) {
      return (
        <span
          ref={node => {
            if (node) {
              Scheduler.log('Ref mount: ' + label);
            } else {
              Scheduler.log('Ref unmount: ' + label);
            }
          }}>
          <Text text={label} />
        </span>
      );
    }

    const LazyChildA = React.lazy(() => fakeImport(ChildA));
    const LazyChildB = React.lazy(() => fakeImport(ChildB));

    function Parent({swap}) {
      return (
        <React.Suspense fallback={<Text text="Loading..." />}>
          {swap ? <LazyChildB label="B" /> : <LazyChildA label="A" />}
        </React.Suspense>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent swap={false} />);
    });
    assertLog(['Loading...']);

    await act(() => resolveFakeImport(ChildA));
    assertLog(['A', 'Ref mount: A']);
    expect(container.innerHTML).toBe('<span>A</span>');

    // Swap the position of A and B
    ReactDOM.flushSync(() => {
      root.render(<Parent swap={true} />);
    });
    assertLog(['Loading...', 'Ref unmount: A']);
    expect(container.innerHTML).toBe(
      '<span style="display: none;">A</span>Loading...',
    );

    await act(() => resolveFakeImport(ChildB));
    assertLog(['B', 'Ref mount: B']);
    expect(container.innerHTML).toBe('<span>B</span>');
  });

  it('does not call componentWillUnmount twice when hidden child is removed', async () => {
    class ChildA extends React.Component {
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentWillUnmount() {
        Scheduler.log('Will unmount: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    class ChildB extends React.Component {
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentWillUnmount() {
        Scheduler.log('Will unmount: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    const LazyChildA = React.lazy(() => fakeImport(ChildA));
    const LazyChildB = React.lazy(() => fakeImport(ChildB));

    function Parent({swap}) {
      return (
        <React.Suspense fallback={<Text text="Loading..." />}>
          {swap ? <LazyChildB label="B" /> : <LazyChildA label="A" />}
        </React.Suspense>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent swap={false} />);
    });
    assertLog(['Loading...']);

    await act(() => resolveFakeImport(ChildA));
    assertLog(['A', 'Did mount: A']);
    expect(container.innerHTML).toBe('A');

    // Swap the position of A and B
    ReactDOM.flushSync(() => {
      root.render(<Parent swap={true} />);
    });
    assertLog(['Loading...', 'Will unmount: A']);
    expect(container.innerHTML).toBe('Loading...');

    await act(() => resolveFakeImport(ChildB));
    assertLog(['B', 'Did mount: B']);
    expect(container.innerHTML).toBe('B');
  });

  it('does not destroy layout effects twice when parent suspense is removed', async () => {
    function ChildA({label}) {
      React.useLayoutEffect(() => {
        Scheduler.log('Did mount: ' + label);
        return () => {
          Scheduler.log('Will unmount: ' + label);
        };
      }, []);
      return <Text text={label} />;
    }
    function ChildB({label}) {
      React.useLayoutEffect(() => {
        Scheduler.log('Did mount: ' + label);
        return () => {
          Scheduler.log('Will unmount: ' + label);
        };
      }, []);
      return <Text text={label} />;
    }
    const LazyChildA = React.lazy(() => fakeImport(ChildA));
    const LazyChildB = React.lazy(() => fakeImport(ChildB));

    function Parent({swap}) {
      return (
        <React.Suspense fallback={<Text text="Loading..." />}>
          {swap ? <LazyChildB label="B" /> : <LazyChildA label="A" />}
        </React.Suspense>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent swap={false} />);
    });
    assertLog(['Loading...']);

    await act(() => resolveFakeImport(ChildA));
    assertLog(['A', 'Did mount: A']);
    expect(container.innerHTML).toBe('A');

    // Swap the position of A and B
    ReactDOM.flushSync(() => {
      root.render(<Parent swap={true} />);
    });
    assertLog(['Loading...', 'Will unmount: A']);
    expect(container.innerHTML).toBe('Loading...');

    // Destroy the whole tree, including the hidden A
    ReactDOM.flushSync(() => {
      root.render(<h1>Hello</h1>);
    });
    await waitForAll([]);
    expect(container.innerHTML).toBe('<h1>Hello</h1>');
  });

  it('does not destroy ref cleanup twice when parent suspense is removed', async () => {
    function ChildA({label}) {
      return (
        <span
          ref={node => {
            if (node) {
              Scheduler.log('Ref mount: ' + label);
            } else {
              Scheduler.log('Ref unmount: ' + label);
            }
          }}>
          <Text text={label} />
        </span>
      );
    }

    function ChildB({label}) {
      return (
        <span
          ref={node => {
            if (node) {
              Scheduler.log('Ref mount: ' + label);
            } else {
              Scheduler.log('Ref unmount: ' + label);
            }
          }}>
          <Text text={label} />
        </span>
      );
    }

    const LazyChildA = React.lazy(() => fakeImport(ChildA));
    const LazyChildB = React.lazy(() => fakeImport(ChildB));

    function Parent({swap}) {
      return (
        <React.Suspense fallback={<Text text="Loading..." />}>
          {swap ? <LazyChildB label="B" /> : <LazyChildA label="A" />}
        </React.Suspense>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent swap={false} />);
    });
    assertLog(['Loading...']);

    await act(() => resolveFakeImport(ChildA));
    assertLog(['A', 'Ref mount: A']);
    expect(container.innerHTML).toBe('<span>A</span>');

    // Swap the position of A and B
    ReactDOM.flushSync(() => {
      root.render(<Parent swap={true} />);
    });
    assertLog(['Loading...', 'Ref unmount: A']);
    expect(container.innerHTML).toBe(
      '<span style="display: none;">A</span>Loading...',
    );

    // Destroy the whole tree, including the hidden A
    ReactDOM.flushSync(() => {
      root.render(<h1>Hello</h1>);
    });
    await waitForAll([]);
    expect(container.innerHTML).toBe('<h1>Hello</h1>');
  });

  it('does not call componentWillUnmount twice when parent suspense is removed', async () => {
    class ChildA extends React.Component {
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentWillUnmount() {
        Scheduler.log('Will unmount: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    class ChildB extends React.Component {
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentWillUnmount() {
        Scheduler.log('Will unmount: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    const LazyChildA = React.lazy(() => fakeImport(ChildA));
    const LazyChildB = React.lazy(() => fakeImport(ChildB));

    function Parent({swap}) {
      return (
        <React.Suspense fallback={<Text text="Loading..." />}>
          {swap ? <LazyChildB label="B" /> : <LazyChildA label="A" />}
        </React.Suspense>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent swap={false} />);
    });
    assertLog(['Loading...']);

    await act(() => resolveFakeImport(ChildA));
    assertLog(['A', 'Did mount: A']);
    expect(container.innerHTML).toBe('A');

    // Swap the position of A and B
    ReactDOM.flushSync(() => {
      root.render(<Parent swap={true} />);
    });
    assertLog(['Loading...', 'Will unmount: A']);
    expect(container.innerHTML).toBe('Loading...');

    // Destroy the whole tree, including the hidden A
    ReactDOM.flushSync(() => {
      root.render(<h1>Hello</h1>);
    });
    await waitForAll([]);
    expect(container.innerHTML).toBe('<h1>Hello</h1>');
  });

  // @gate !disableLegacyMode
  it('regression: unmount hidden tree, in legacy mode', async () => {
    // In legacy mode, when a tree suspends and switches to a fallback, the
    // effects are not unmounted. So we have to unmount them during a deletion.

    function Child() {
      React.useLayoutEffect(() => {
        Scheduler.log('Mount');
        return () => {
          Scheduler.log('Unmount');
        };
      }, []);
      return <Text text="Child" />;
    }

    function Sibling() {
      return <Text text="Sibling" />;
    }
    const LazySibling = React.lazy(() => fakeImport(Sibling));

    function App({showMore}) {
      return (
        <React.Suspense fallback={<Text text="Loading..." />}>
          <Child />
          {showMore ? <LazySibling /> : null}
        </React.Suspense>
      );
    }

    // Initial render
    ReactDOM.render(<App showMore={false} />, container);
    assertLog(['Child', 'Mount']);

    // Update that suspends, causing the existing tree to switches it to
    // a fallback.
    ReactDOM.render(<App showMore={true} />, container);
    assertLog([
      'Child',
      'Loading...',

      // In a concurrent root, the effect would unmount here. But this is legacy
      // mode, so it doesn't.
      // Unmount
    ]);

    // Delete the tree and unmount the effect
    ReactDOM.render(null, container);
    assertLog(['Unmount']);
  });

  it('does not call cleanup effects twice after a bailout', async () => {
    const never = new Promise(resolve => {});
    function Never() {
      throw never;
    }

    let setSuspended;
    let setLetter;

    function App() {
      const [suspended, _setSuspended] = React.useState(false);
      setSuspended = _setSuspended;
      const [letter, _setLetter] = React.useState('A');
      setLetter = _setLetter;

      return (
        <React.Suspense fallback="Loading...">
          <Child letter={letter} />
          {suspended && <Never />}
        </React.Suspense>
      );
    }

    let nextId = 0;
    const freed = new Set();
    let setStep;

    function Child({letter}) {
      const [, _setStep] = React.useState(0);
      setStep = _setStep;

      React.useLayoutEffect(() => {
        const localId = nextId++;
        Scheduler.log('Did mount: ' + letter + localId);
        return () => {
          if (freed.has(localId)) {
            throw Error('Double free: ' + letter + localId);
          }
          freed.add(localId);
          Scheduler.log('Will unmount: ' + letter + localId);
        };
      }, [letter]);
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Did mount: A0']);

    await act(() => {
      setStep(1);
      setSuspended(false);
    });
    assertLog([]);

    await act(() => {
      setStep(1);
    });
    assertLog([]);

    await act(() => {
      setSuspended(true);
    });
    assertLog(['Will unmount: A0']);

    await act(() => {
      setSuspended(false);
      setLetter('B');
    });
    assertLog(['Did mount: B1']);

    await act(() => {
      root.unmount();
    });
    assertLog(['Will unmount: B1']);
  });
});

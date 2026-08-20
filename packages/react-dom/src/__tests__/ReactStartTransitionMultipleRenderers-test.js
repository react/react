/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactStartTransitionMultipleRenderers', () => {
  let act;
  let container;
  let React;
  let ReactDOMClient;
  let Scheduler;
  let assertLog;
  let startTransition;
  let useOptimistic;
  let textCache;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    startTransition = React.startTransition;
    useOptimistic = React.useOptimistic;
    container = document.createElement('div');
    document.body.appendChild(container);

    textCache = new Map();
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
      thenable.pings.forEach(t => t(text));
    }
  }

  function getText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
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
      return thenable;
    } else {
      switch (record.status) {
        case 'pending':
          return record.value;
        case 'rejected':
          return Promise.reject(record.value);
        case 'resolved':
          return Promise.resolve(record.value);
      }
    }
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  afterEach(() => {
    document.body.removeChild(container);
  });

  // This test imports multiple reconcilers. Because of how the renderers are
  // built, it only works when running tests using the actual build artifacts,
  // not the source files.
  // @gate !source
  it('React.startTransition works across multiple renderers', async () => {
    const ReactNoop = require('react-noop-renderer');

    const setIsPendings = new Set();

    function App() {
      const [isPending, setIsPending] = useOptimistic(false);
      setIsPendings.add(setIsPending);
      return <Text text={isPending ? 'Pending' : 'Not pending'} />;
    }

    const noopRoot = ReactNoop.createRoot(null);
    const domRoot = ReactDOMClient.createRoot(container);

    // Run the same component in two separate renderers.
    await act(() => {
      noopRoot.render(<App />);
      domRoot.render(<App />);
    });
    assertLog(['Not pending', 'Not pending']);
    expect(container.textContent).toEqual('Not pending');
    expect(noopRoot).toMatchRenderedOutput('Not pending');

    await act(() => {
      startTransition(async () => {
        // Wait until after an async gap before setting the optimistic state.
        await getText('Wait before setting isPending');
        setIsPendings.forEach(setIsPending => setIsPending(true));

        // The optimistic state should not be reverted until the
        // action completes.
        await getText('Wait until end of async action');
      });
    });

    await act(() => resolveText('Wait before setting isPending'));
    assertLog(['Pending', 'Pending']);
    expect(container.textContent).toEqual('Pending');
    expect(noopRoot).toMatchRenderedOutput('Pending');

    await act(() => resolveText('Wait until end of async action'));
    assertLog(['Not pending', 'Not pending']);
    expect(container.textContent).toEqual('Not pending');
    expect(noopRoot).toMatchRenderedOutput('Not pending');
  });
});

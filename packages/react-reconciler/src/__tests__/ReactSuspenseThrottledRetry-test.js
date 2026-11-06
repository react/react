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
let startTransition;
let waitForAll;

let textCache;

describe('ReactSuspenseThrottledRetry', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    Suspense = React.Suspense;
    startTransition = React.startTransition;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;

    textCache = new Map();
  });

  function resolveText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
      textCache.set(text, {status: 'resolved', value: text});
    } else if (record.status === 'pending') {
      record.status = 'resolved';
      record.resolve();
    }
  }

  function readText(text) {
    let record = textCache.get(text);
    if (record === undefined) {
      let resolve;
      const promise = new Promise(r => (resolve = r));
      record = {status: 'pending', value: promise, resolve};
      textCache.set(text, record);
    }
    if (record.status === 'pending') {
      Scheduler.log(`Suspend! [${text}]`);
      throw record.value;
    }
    return text;
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

  let setOtherText;
  function Other({readMore}) {
    const [text, setText] = React.useState('O1');
    setOtherText = setText;
    readText(text);
    if (readMore && text !== 'O1') {
      readText(text + ' (more)');
    }
    Scheduler.log(text);
    return text;
  }

  function App({readMore}) {
    return (
      <>
        <Suspense fallback={<Text text="Loading A..." />}>
          <AsyncText text="A" />
        </Suspense>
        <Suspense fallback={<Text text="Loading other..." />}>
          <Other readMore={readMore} />
        </Suspense>
      </>
    );
  }

  async function renderUntilRetryIsThrottled(readMore) {
    resolveText('O1');
    const root = ReactNoop.createRoot();
    React.startTransition(() => {
      root.render(<App readMore={readMore} />);
    });
    await waitForAll([
      'Suspend! [A]',
      'Loading A...',
      'O1',
      // Pre-warm the suspended content
      'Suspend! [A]',
    ]);
    expect(root).toMatchRenderedOutput('Loading A...O1');

    // Start an unrelated transition that suspends. It stays on the old
    // content because it's a transition.
    startTransition(() => setOtherText('O2'));
    await waitForAll([
      'Suspend! [O2]',
      'Loading other...',
      // Pre-warm the suspended content
      'Suspend! [A]',
    ]);
    expect(root).toMatchRenderedOutput('Loading A...O1');

    // Resolve A. The transition gets another try, too, and suspends again.
    // Then the retry for A renders, but the commit is throttled, so the
    // fallback stays on screen.
    resolveText('A');
    await waitForAll(['Suspend! [O2]', 'Loading other...', 'A']);
    expect(root).toMatchRenderedOutput('Loading A...O1');

    return root;
  }

  // @gate alwaysThrottleRetries
  it('commits a throttled retry after an unrelated transition interrupts it and commits', async () => {
    const root = await renderUntilRetryIsThrottled(false);

    // Resolve the transition's data. Rendering it throws away the throttled
    // retry's finished work.
    resolveText('O2');
    await waitForAll(['O2', 'A']);

    jest.advanceTimersByTime(5000);
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('AO2');
  });

  // @gate alwaysThrottleRetries
  it('commits a throttled retry after an unrelated transition interrupts it and suspends again', async () => {
    const root = await renderUntilRetryIsThrottled(true);

    // Resolve the transition's first piece of data. Rendering it throws away
    // the throttled retry's finished work, then suspends on more data and
    // doesn't commit. The retry still needs to render again, even though
    // nothing will ping it, since its data already resolved.
    resolveText('O2');
    await waitForAll(['Suspend! [O2 (more)]', 'Loading other...', 'A']);
    expect(root).toMatchRenderedOutput('Loading A...O1');

    // The retry is throttled again. Once the throttle expires, it commits,
    // even though the unrelated transition is still suspended.
    jest.advanceTimersByTime(5000);
    await waitForAll(['Suspend! [O2 (more)]', 'Loading other...']);
    expect(root).toMatchRenderedOutput('AO1');

    resolveText('O2 (more)');
    await waitForAll(['O2']);
    expect(root).toMatchRenderedOutput('AO2');
  });
});

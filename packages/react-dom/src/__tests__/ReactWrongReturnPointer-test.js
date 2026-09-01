/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

let React;
let ReactNoop;
let Scheduler;
let act;
let Suspense;
let SuspenseList;
let getCacheForType;
let caches;
let seededCache;
let assertLog;

beforeEach(() => {
  React = require('react');
  ReactNoop = require('react-noop-renderer');
  Scheduler = require('scheduler');
  act = require('internal-test-utils').act;

  const InternalTestUtils = require('internal-test-utils');
  assertLog = InternalTestUtils.assertLog;

  Suspense = React.Suspense;
  if (gate(flags => flags.enableSuspenseList)) {
    SuspenseList = React.unstable_SuspenseList;
  }

  getCacheForType = React.unstable_getCacheForType;

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
  return <span prop={text} />;
}

function AsyncText({text, showVersion}) {
  const version = readText(text);
  const fullText = showVersion ? `${text} [v${version}]` : text;
  Scheduler.log(fullText);
  return <span prop={fullText} />;
}

// function seedNextTextCache(text) {
//   if (seededCache === null) {
//     seededCache = createTextCache();
//   }
//   seededCache.resolve(text);
// }

function resolveMostRecentTextCache(text) {
  if (caches.length === 0) {
    throw Error('Cache does not exist.');
  } else {
    // Resolve the most recently created cache. An older cache can by
    // resolved with `caches[index].resolve(text)`.
    caches[caches.length - 1].resolve(text);
  }
}

const resolveText = resolveMostRecentTextCache;

// @gate enableLegacyCache
// @gate enableSuspenseList
test('regression (#20932): return pointer is correct before entering deleted tree', async () => {
  // Based on a production bug. Designed to trigger a very specific
  // implementation path.
  function Tail() {
    return (
      <Suspense fallback={<Text text="Loading Tail..." />}>
        <Text text="Tail" />
      </Suspense>
    );
  }

  function App() {
    return (
      <SuspenseList revealOrder="forwards" tail="visible">
        <Suspense fallback={<Text text="Loading Async..." />}>
          <Async />
        </Suspense>
        <Tail />
      </SuspenseList>
    );
  }

  let setAsyncText;
  function Async() {
    const [c, _setAsyncText] = React.useState(0);
    setAsyncText = _setAsyncText;
    return <AsyncText text={c} />;
  }

  const root = ReactNoop.createRoot();
  await act(() => {
    root.render(<App />);
  });
  assertLog([
    'Suspend! [0]',
    'Loading Async...',
    'Loading Tail...',
    // pre-warming
    'Suspend! [0]',
  ]);
  await act(() => {
    resolveText(0);
  });
  assertLog([0, 'Tail']);
  await act(() => {
    setAsyncText(x => x + 1);
  });
  assertLog([
    'Suspend! [1]',
    'Loading Async...',
    'Suspend! [1]',
    'Loading Async...',
    // pre-warming
    'Suspend! [1]',
  ]);
});

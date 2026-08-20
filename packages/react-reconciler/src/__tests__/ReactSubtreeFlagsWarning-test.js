let React;
let ReactNoop;
let Scheduler;
let act;
let Suspense;
let useEffect;
let getCacheForType;

let caches;
let seededCache;
let assertLog;

describe('ReactSuspenseWithNoopRenderer', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    Suspense = React.Suspense;
    useEffect = React.useEffect;

    getCacheForType = React.unstable_getCacheForType;

    const InternalTestUtils = require('internal-test-utils');
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

  // @gate enableLegacyCache && !disableLegacyMode
  it('regression: false positive for legacy suspense', async () => {
    const Child = ({text}) => {
      // If text hasn't resolved, this will throw and exit before the passive
      // static effect flag is added by the useEffect call below.
      readText(text);

      useEffect(() => {
        Scheduler.log('Effect');
      }, []);

      Scheduler.log(text);
      return text;
    };

    function App() {
      return (
        <Suspense fallback="Loading...">
          <Child text="Async" />
        </Suspense>
      );
    }

    const root = ReactNoop.createLegacyRoot(null);

    // On initial mount, the suspended component is committed in an incomplete
    // state, without a passive static effect flag.
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Suspend! [Async]']);
    expect(root).toMatchRenderedOutput('Loading...');

    // When the promise resolves, a passive static effect flag is added. In the
    // regression, the "missing expected static flag" would fire, because the
    // previous fiber did not have one.
    await act(() => {
      resolveText('Async');
    });
    assertLog(['Async', 'Effect']);
    expect(root).toMatchRenderedOutput('Async');
  });
});

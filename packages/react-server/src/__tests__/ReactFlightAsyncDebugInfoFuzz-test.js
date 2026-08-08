/**
 * @jest-environment node
 */
'use strict';

// Generative test for the async debug info tracking. Each seed builds a
// random Flight render shaped like a real app: components fetch their own
// data, share a cache()-deduped data layer, waterfall through helpers, fan
// out with Promise.all, pass promises down as props, and await data that was
// preloaded before the request. Some seeds abort mid-render, throw in a
// subtree, or run two renders interleaved. A small share of the data layer
// is userland thenables and Promise subclasses. The emitted debug info is
// checked against what each seed's program actually did.
//
// The runs are deterministic. Every random decision is drawn while the seed
// is being built, never while it runs. Async leaves park their resolvers
// with a driver; a seeded loop runs each leaf's real I/O to completion (one
// at a time, so its latency can't reorder anything), then settles batches of
// leaves back to back in the same tick, with seeded microtask and macrotask
// hops in between. Times are normalized and stacks are compared by function
// name only, so the snapshots are stable across machines and runs.
//
// To debug or explore a single seed: FUZZ_TEST_SEED=<n> yarn test ReactFlightAsyncDebugInfoFuzz

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

import fs from 'fs';
import path from 'path';
import {AsyncLocalStorage} from 'async_hooks';

let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let Random;

const NUM_SEEDS = 20;
const ONLY_SEED =
  process.env.FUZZ_TEST_SEED != null ? +process.env.FUZZ_TEST_SEED : null;

const streamOptions = {
  objectMode: true,
};

function filterStackFrame(filename, functionName) {
  return (
    !filename.startsWith('node:') &&
    !filename.includes('node_modules') &&
    // Filter out our own internal source code since it'll typically be in node_modules
    (!filename.includes('/packages/') || filename.includes('/__tests__/')) &&
    !filename.includes('/build/') &&
    !functionName.includes('internal_')
  );
}

class FuzzPromise extends Promise {}

function once(source) {
  let memo = null;
  return function memoizedSource() {
    if (memo === null) {
      memo = source();
    }
    return memo;
  };
}

describe('ReactFlightAsyncDebugInfoFuzz', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();
    global.console = require('console');

    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      jest.requireActual('react-server-dom-webpack/server.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-webpack/server');

    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();

    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/client', () =>
      jest.requireActual('react-server-dom-webpack/client.node'),
    );

    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Stream = require('stream');
    Random = require('random-seed');
  });

  jest.setTimeout(60000);

  // The client's performance track emits performance.measure calls. Record
  // them (without forwarding, so an invalid span can't throw from inside
  // React) and check basic coherence on every span.
  let recordedMeasures;
  const originalPerformance = {};
  ['measure', 'mark', 'clearMeasures', 'clearMarks'].forEach(method => {
    originalPerformance[method] = performance[method];
  });
  beforeEach(() => {
    recordedMeasures = [];
    const record = {
      measure(measureName, options) {
        recordedMeasures.push({name: measureName, options});
      },
      mark() {},
      clearMeasures() {},
      clearMarks() {},
    };
    Object.keys(originalPerformance).forEach(method => {
      Object.defineProperty(performance, method, {
        value: record[method],
        configurable: true,
        writable: true,
      });
    });
  });
  afterEach(() => {
    Object.keys(originalPerformance).forEach(method => {
      Object.defineProperty(performance, method, {
        value: originalPerformance[method],
        configurable: true,
        writable: true,
      });
    });
  });

  function finishLoadingStream(readable) {
    return new Promise(resolve => {
      if (readable.readableEnded) {
        resolve();
      } else {
        readable.on('end', () => resolve());
      }
    });
  }

  function createProgram(rand) {
    // Everything the program allocates is retained until the test ends so
    // that GC can never make a WeakRef-dependent field disappear from the
    // output of one run but not another.
    const retained = [];
    // The chain of named sources (innermost first, ending with the component
    // that initiated the call) in whose context the current code runs.
    // Tracked with AsyncLocalStorage so that, like the stacks under test, it
    // survives awaits: a leaf created after an await inside a source is
    // still attributed to that source.
    const chainStorage = new AsyncLocalStorage();
    // Every name the seed can put on a stack frame, so checks can tell a
    // foreign frame from an unknown-but-harmless one.
    const sourceNames = new Set();
    function named(name, fn) {
      sourceNames.add(name);
      return {
        [name]: function () {
          const parentChain = chainStorage.getStore();
          const chain =
            parentChain == null ? [name] : [name].concat(parentChain);
          return chainStorage.run(chain, () => fn.apply(this, arguments));
        },
      }[name];
    }
    function bumpSettleBatch() {
      settleBatch++;
    }
    // Leaves whose promise is handed to a child as a prop. The child awaits
    // the prop, so a single-leaf prop must be attributed in the child's
    // render; leaves behind composite sources only surface through whatever
    // io ends up unblocking the composite.
    const propLeaves = new Set();
    const propConsumers = new Map();
    const propStorage = new AsyncLocalStorage();
    function trackPropLeaves(fn, consumerName, singleLeaf) {
      return propStorage.run({consumer: consumerName, singleLeaf}, fn);
    }
    // Combinator awaits attribute only the io that unblocked them. When
    // every part is a plain single-leaf fetch, the settle order decides
    // which part that is, so the oracle can demand it exactly.
    const combinatorAwaits = [];
    // Leaves delivered through a userland thenable: their io entries
    // describe whatever context settled the thenable, not the leaf.
    const foreignLeaves = new Set();
    // Leaves settled in another leaf's io callback: the driver settles a
    // batch back to back in the context of the batch's last io.
    const foreignSettles = new Set();
    function trackForeignValue(promise) {
      promise.then(
        function (value) {
          if (typeof value === 'string' && /^v[0-9]+$/.test(value)) {
            foreignLeaves.add(value);
          } else if (
            value !== null &&
            typeof value === 'object' &&
            typeof value.id === 'string'
          ) {
            foreignLeaves.add(value.id);
          }
        },
        function (error) {},
      );
      return promise;
    }
    function withComponent(componentName, source) {
      return chainStorage.run([componentName], source);
    }
    // Ground truth per leaf id: which io kind backs it, whether it rejects,
    // which chain of sources created it, and when the driver settled it.
    const leafMeta = new Map();
    let settleCount = 0;
    let settleBatch = 0;
    // Parked leaves: {io, settle}. The driver runs io() to completion and
    // later calls settle(), possibly in the same tick as other settles.
    const pending = [];
    let nextValue = 0;

    function retain(x) {
      retained.push(x);
      return x;
    }

    // The two kinds of real I/O behind every leaf. Their names are what the
    // io debug entries get attributed to.
    function readFromFile() {
      return new Promise(function readFixture(resolve, reject) {
        fs.readFile(
          path.join(__dirname, '../ReactFlightAsyncSequence.js'),
          function onFileRead(error) {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
        );
      });
    }
    function waitForTimer() {
      return new Promise(function sleep(resolve) {
        setTimeout(resolve, 1);
      });
    }

    // Throws for any property access outside the thenable protocol, like
    // userland reference proxies without the serialization exemptions our
    // own ClientReference proxies carry.
    function proxyThenable(thenable) {
      return new Proxy(thenable, {
        get(target, key) {
          if (
            key === 'then' ||
            key === 'status' ||
            key === 'value' ||
            key === 'reason' ||
            key === 'constructor' ||
            typeof key === 'symbol'
          ) {
            return target[key];
          }
          throw new Error('touched forbidden key ' + String(key));
        },
        set(target, key, value) {
          target[key] = value;
          return true;
        },
      });
    }

    // A promise backed by one unit of real I/O whose resolution is parked
    // with the driver. The io kind is decided when the seed is built, never
    // when the leaf is created.
    function leaf(opts) {
      const id = 'v' + nextValue++;
      const useTimer = opts.useTimer === true;
      const propContext = propStorage.getStore();
      if (propContext !== undefined) {
        propLeaves.add(id);
        if (propContext.singleLeaf) {
          propConsumers.set(id, propContext.consumer);
        }
      }
      const meta = {
        useTimer,
        rejects: opts.rejects === true,
        big: opts.big === true,
        object: opts.object === true,
        chain:
          chainStorage.getStore() == null
            ? null
            : chainStorage.getStore().slice(),
        settleIndex: -1,
      };
      leafMeta.set(id, meta);
      const value = opts.big
        ? // Over the 1MB limit, so the serialized debug value gets omitted.
          id + ':' + 'x'.repeat(1100000)
        : opts.object
          ? {id: id, items: [1, 2, 3]}
          : id;
      const promise = new Promise((resolve, reject) => {
        pending.push({
          id: id,
          io: useTimer ? waitForTimer : readFromFile,
          settle() {
            meta.settleIndex = settleCount++;
            meta.settleBatch = settleBatch;
            if (opts.rejects) {
              reject(new Error('rejected ' + id));
            } else {
              resolve(value);
            }
          },
        });
      });
      if (opts.rejects) {
        // The driver may settle this before a consumer has attached its
        // handler; mark it handled so that can't fail the test run. This
        // adds one extra tracked await around every rejecting leaf, which
        // is visible in the snapshots.
        retain(promise.catch(function ignoreUnhandled() {}));
      }
      return retain(promise);
    }

    // ---- Sources ----
    // A source is a thunk. Components (and their helpers) invoke sources
    // while they run, so most promises are created during the render with
    // an owner, like data fetching in a real app. All random decisions are
    // made here at build time; running a thunk never draws from the seed.

    // Module-scope data: created before the render starts. A seeded subset
    // resolves before the request begins, so some awaits point at I/O that
    // finished before the request's time origin.
    const pool = [];
    for (let i = 0; i < 4; i++) {
      pool.push(leaf({useTimer: rand.intBetween(0, 1) === 0}));
    }

    // Request-deduped data layer. The fetch happens inside the cache scope,
    // so components using the same key share one fetch per request.
    const cachedIOKinds = [];
    for (let i = 0; i < 4; i++) {
      cachedIOKinds.push(rand.intBetween(0, 1) === 0);
    }
    const cachedFetch = ReactServer.cache(async function cachedFetch(key) {
      const data = await leaf({useTimer: cachedIOKinds[key]});
      return 'cached:' + key + ':' + data;
    });

    function genSource(depth) {
      const roll = rand.intBetween(1, 100);
      if (roll <= 25 || depth >= 3) {
        // A component fetching its own data.
        const useTimer = rand.intBetween(0, 1) === 0;
        if (rand.intBetween(0, 1) === 0) {
          const fetchData = named('fetchData', function fetchData() {
            return leaf({useTimer: useTimer});
          });
          fetchData.singleLeaf = true;
          return fetchData;
        }
        const fetchAndTransform = named(
          'fetchAndTransform',
          async function fetchAndTransform() {
            const data = await leaf({useTimer: useTimer});
            return String(data).toUpperCase();
          },
        );
        fetchAndTransform.singleLeaf = true;
        return fetchAndTransform;
      }
      if (roll <= 40) {
        const key = rand.intBetween(0, 3);
        return named('fetchCached', function fetchCached() {
          return cachedFetch(key);
        });
      }
      if (roll <= 50) {
        const preloaded = pool[rand.intBetween(0, pool.length - 1)];
        return named('usePreloaded', function usePreloaded() {
          return preloaded;
        });
      }
      if (roll <= 65) {
        // A waterfall: each step awaits and depends on the previous step.
        const steps = [];
        const n = rand.intBetween(2, 4);
        for (let i = 0; i < n; i++) {
          steps.push(genSource(depth + 1));
        }
        return named('loadWaterfall', async function loadWaterfall() {
          let acc = '';
          for (let i = 0; i < steps.length; i++) {
            acc += String(await steps[i]()) + '>';
          }
          return acc;
        });
      }
      if (roll <= 75) {
        // A fan-out.
        const parts = [];
        const n = rand.intBetween(2, 3);
        for (let i = 0; i < n; i++) {
          parts.push(genSource(depth + 1));
        }
        return named('loadAll', function loadAll() {
          const record = {
            kind: 'all',
            completionOrder: [],
            chain:
              chainStorage.getStore() == null
                ? null
                : chainStorage.getStore().slice(),
            flat: parts.every(part => part.singleLeaf === true),
            parts: [],
          };
          combinatorAwaits.push(record);
          return Promise.all(
            parts.map(function startPart(part, partIndex) {
              const from = nextValue;
              const result = part();
              record.parts.push({from: from, to: nextValue});
              return Promise.resolve(result).then(
                function recordPartCompletion(partValue) {
                  record.completionOrder.push(partIndex);
                  return partValue;
                },
              );
            }),
          );
        });
      }
      if (roll <= 81) {
        // A derived promise. Sometimes the callback itself blocks on more
        // data, which forks the await chain.
        const inner = genSource(depth + 1);
        const next = rand.intBetween(0, 1) === 0 ? genSource(depth + 1) : null;
        // When the callback starts new work, the original value's io forks
        // off the await chain and only the new work unblocks the consumer.
        const innerSource =
          next === null ? inner : named('forkedDerived', inner);
        return named('loadDerived', function loadDerived() {
          return Promise.resolve(innerSource()).then(
            function transformResult(x) {
              return next !== null ? next() : 'transformed:' + x;
            },
          );
        });
      }
      if (roll <= 85) {
        // Data that fails to load, handled by the data layer.
        const useTimer = rand.intBetween(0, 1) === 0;
        return named('fetchWithFallback', function fetchWithFallback() {
          return leaf({rejects: true, useTimer: useTimer}).catch(
            function useFallback(x) {
              return 'fallback:' + x.message;
            },
          );
        });
      }
      if (roll <= 89) {
        const first = genSource(depth + 1);
        const second = genSource(depth + 1);
        return named('loadFastest', function loadFastest() {
          const record = {
            kind: 'race',
            completionOrder: [],
            chain:
              chainStorage.getStore() == null
                ? null
                : chainStorage.getStore().slice(),
            flat: first.singleLeaf === true && second.singleLeaf === true,
            parts: [],
          };
          combinatorAwaits.push(record);
          return Promise.race(
            [first, second].map(function startPart(part, partIndex) {
              const from = nextValue;
              const result = part();
              record.parts.push({from: from, to: nextValue});
              return Promise.resolve(result).then(
                function recordPartCompletion(partValue) {
                  record.completionOrder.push(partIndex);
                  return partValue;
                },
              );
            }),
          );
        });
      }
      if (roll <= 92) {
        // Paging through an async iterator.
        const pages = [genSource(depth + 1), genSource(depth + 1)];
        const take = rand.intBetween(1, 2);
        return named('readPages', async function readPages() {
          const paginate = async function* paginate() {
            for (let i = 0; i < pages.length; i++) {
              yield await pages[i]();
            }
          };
          const iterator = paginate();
          let acc = '';
          for (let i = 0; i < take; i++) {
            const step = await iterator.next();
            if (step.done) {
              break;
            }
            acc += String(step.value) + '|';
          }
          if (iterator.return) {
            await iterator.return();
          }
          return acc;
        });
      }
      if (roll <= 94) {
        return named('loadSync', function loadSync() {
          return Promise.resolve(
            retain(Promise.resolve(retain(Promise.resolve('sync')))),
          );
        });
      }
      if (roll <= 96) {
        // The serialized debug value of this one gets omitted for size.
        const useTimer = rand.intBetween(0, 1) === 0;
        return named('fetchLargeValue', function fetchLargeValue() {
          return leaf({big: true, useTimer: useTimer});
        });
      }
      if (roll <= 98) {
        const useTimer = rand.intBetween(0, 1) === 0;
        const fetchObject = named('fetchObject', function fetchObject() {
          return leaf({object: true, useTimer: useTimer});
        });
        fetchObject.singleLeaf = true;
        return fetchObject;
      }
      if (roll <= 99) {
        // A userland thenable, like an ORM query object. Parked with the
        // driver like other leaves; resolves to more data.
        const inner = genSource(depth + 1);
        return named('queryThenable', function queryThenable() {
          return proxyThenable({
            then(resolve) {
              pending.push({
                io: async function noIO() {},
                settle() {
                  resolve(retain(trackForeignValue(Promise.resolve(inner()))));
                },
              });
            },
          });
        });
      }
      // A Promise subclass, like a polyfill or instrumented promise.
      return named('subclassedFetch', function subclassedFetch() {
        return new FuzzPromise(resolve => {
          pending.push({
            io: async function noIO() {},
            settle() {
              resolve('sub' + nextValue++);
            },
          });
        });
      });
    }

    return {
      retained,
      pending,
      pool,
      genSource,
      leaf,
      retain,
      leafMeta,
      named,
      withComponent,
      bumpSettleBatch,
      propLeaves,
      trackPropLeaves,
      foreignLeaves,
      foreignSettles,
      trackForeignValue,
      proxyThenable,
      sourceNames,
      propConsumers,
      combinatorAwaits,
    };
  }

  function buildComponents(rand, program, componentRoots, componentCreators) {
    let componentId = 0;

    // use() must observe the same thenable when the component replays, so
    // the source is memoized.
    function makeSyncUseComponent(options) {
      const name = 'FuzzUse' + componentId++;
      componentRoots.set(name, options.rootIndex);
      options.useComponents.add(name);
      const source = once(program.genSource(2));
      const Component = {
        [name]: function () {
          const value = ReactServer.use(
            program.retain(program.withComponent(name, source)),
          );
          return name + ':' + String(value);
        },
      }[name];
      return Component;
    }

    function identity(x) {
      return x;
    }
    function wrapPropInProxy(promise) {
      const tracked = program.trackForeignValue(promise);
      return program.proxyThenable({
        then(resolve, reject) {
          return tracked.then(resolve, reject);
        },
      });
    }

    function makeComponent(depth, options) {
      const name = 'Fuzz' + componentId++;
      componentRoots.set(name, options.rootIndex);
      const sources = [];
      const nAwaits = rand.intBetween(1, 2);
      for (let i = 0; i < nAwaits; i++) {
        sources.push(program.genSource(0));
      }
      // Awaits happen one after the other or all at once.
      const parallel = rand.intBetween(0, 2) === 0;
      if (parallel) {
        options.parallelComponents.add(name);
      }
      // Sometimes the component's own data fails and it renders a fallback.
      const catches = rand.intBetween(0, 5) === 0;
      const catchesIOKind = catches ? rand.intBetween(0, 1) === 0 : false;
      // Sometimes the component has a bug and throws. The subtree errors
      // but the rest of the render completes.
      const throws = options.canThrow && rand.intBetween(0, 19) === 0;
      if (throws) {
        options.throwers.add(name);
      }

      const children = [];
      if (depth < 3) {
        const nChildren = rand.intBetween(0, depth === 0 ? 3 : 2);
        for (let i = 0; i < nChildren; i++) {
          children.push(
            rand.intBetween(0, 4) === 0
              ? makeSyncUseComponent(options)
              : makeComponent(depth + 1, options),
          );
        }
      }
      // A slot: the parent creates an element during its own render and the
      // first child renders it, so the element's owner is not its parent in
      // the tree. Sometimes the parent also renders the same element itself,
      // which dedupes it across two locations.
      const SlotComponent =
        children.length > 0 && rand.intBetween(0, 2) === 0
          ? makeComponent(depth + 1, options)
          : null;
      // This component's body creates the child and slot elements, so it is
      // their owner regardless of where they render.
      children.forEach(Child => componentCreators.set(Child.name, name));
      if (SlotComponent !== null) {
        componentCreators.set(SlotComponent.name, name);
      }
      const dedupesSlot = SlotComponent !== null && rand.intBetween(0, 1) === 0;
      // Most components return [text, children]; some return a single child
      // element or just text.
      const returnShape =
        children.length > 0 && rand.intBetween(0, 3) === 0
          ? 'element'
          : rand.intBetween(0, 5) === 0
            ? 'text'
            : 'array';

      // A promise started by the parent and awaited by the first child,
      // sometimes hidden behind a throwing proxy.
      const proxyProp = rand.intBetween(0, 1) === 0;
      const propSource =
        children.length > 0 &&
        // use() components ignore their props, so a promise prop passed to
        // one would never be awaited by anyone.
        !options.useComponents.has(children[0].name) &&
        rand.intBetween(0, 2) === 0;

      const Component = {
        [name]: async function (props) {
          let out = name + ':';
          if (parallel) {
            const values = await Promise.all(
              sources.map(source => program.withComponent(name, source)),
            );
            out += values.map(String).join(';');
          } else {
            for (let i = 0; i < sources.length; i++) {
              out +=
                String(await program.withComponent(name, sources[i])) + ';';
            }
          }
          if (catches) {
            try {
              out += String(
                await program.withComponent(name, () =>
                  program.leaf({rejects: true, useTimer: catchesIOKind}),
                ),
              );
            } catch (x) {
              out += 'recovered';
            }
          }
          if (throws) {
            throw new Error('bug in ' + name);
          }
          if (props != null && props.data != null) {
            out += '/data:' + String(await props.data);
          }
          const slot = props != null && props.slot != null ? props.slot : null;
          const slotElement =
            SlotComponent !== null
              ? ReactServer.createElement(SlotComponent, {key: 'slot'})
              : null;
          const childElements = children.map((Child, i) =>
            ReactServer.createElement(Child, {
              key: i,
              data:
                i === 0 && propSource
                  ? program.retain(
                      (proxyProp ? wrapPropInProxy : identity)(
                        program.trackPropLeaves(
                          () =>
                            program.withComponent(
                              name,
                              proxyProp
                                ? program.named('proxyProp', sources[0])
                                : sources[0],
                            ),
                          Child.name,
                          !proxyProp && sources[0].singleLeaf === true,
                        ),
                      ),
                    )
                  : null,
              slot: i === 0 ? slotElement : null,
            }),
          );
          if (slot !== null) {
            childElements.push(slot);
          }
          if (dedupesSlot) {
            childElements.push(slotElement);
          }
          if (returnShape === 'element' && childElements.length > 0) {
            return childElements[0];
          }
          if (returnShape === 'text' && childElements.length === 0) {
            return out;
          }
          return [out, childElements];
        },
      }[name];
      return Component;
    }

    return {makeComponent};
  }

  async function drive(rand, program, doneRef, onSettle) {
    // Fire parked leaves in seeded-random order. Real I/O runs one at a
    // time so its latency can never reorder events, but settles are batched
    // back to back in one tick so continuations of different leaves
    // interleave within the same microtask flush.
    let iterations = 0;
    while (!doneRef.done || program.pending.length > 0) {
      if (iterations++ > 10000) {
        throw new Error('driver did not converge');
      }
      if (program.pending.length > 0) {
        const batchSize = Math.min(
          program.pending.length,
          rand.intBetween(1, 3),
        );
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
          const idx = rand.intBetween(0, program.pending.length - 1);
          batch.push(program.pending.splice(idx, 1)[0]);
        }
        // Drain everything the render scheduled (including chains of it)
        // before touching real I/O, so that nothing is pending while the
        // I/O runs and its real-world latency can't reorder anything.
        for (let i = 0; i < 6; i++) {
          await new Promise(resolve => {
            setTimeout(resolve, 0);
          });
        }
        for (let i = 0; i < batch.length; i++) {
          await batch[i].io();
        }
        for (let i = 0; i < batch.length; i++) {
          if (i !== batch.length - 1 && batch[i].id != null) {
            program.foreignSettles.add(batch[i].id);
          }
          batch[i].settle();
          onSettle();
        }
        program.bumpSettleBatch();
      }
      const hops = rand.intBetween(1, 3);
      for (let i = 0; i < hops; i++) {
        switch (rand.intBetween(0, 2)) {
          case 0:
            await null;
            break;
          case 1:
            await new Promise(resolve => setImmediate(resolve));
            break;
          default:
            await new Promise(resolve => process.nextTick(resolve));
            break;
        }
      }
    }
  }

  // ---- Computed oracle ----
  // Every check below derives from what the seed's program actually did, as
  // recorded by the generator (creator and invocation chains, leaf io kinds,
  // values) and the driver (settle order), so it holds for any seed.

  function leafIdOfValue(settled) {
    if (settled == null || settled.status !== 'fulfilled') {
      return null;
    }
    const value = settled.value;
    if (typeof value === 'string' && /^v[0-9]+$/.test(value)) {
      return value;
    }
    if (
      value !== null &&
      typeof value === 'object' &&
      typeof value.id === 'string' &&
      /^v[0-9]+$/.test(value.id)
    ) {
      return value.id;
    }
    return null;
  }

  function creatorChain(name, componentCreators) {
    const chain = [];
    let current = name;
    while (componentCreators.get(current) != null) {
      current = componentCreators.get(current);
      chain.push(current);
    }
    return chain;
  }

  function validateDebugInfo(debugInfo, ctx) {
    const {
      componentRoots,
      componentCreators,
      leafMeta,
      foreignLeaves,
      foreignSettles,
      sourceNames,
      propLeaves,
      propConsumers,
      useComponents,
      rootIndex,
      violations,
      leafSightings,
      unidentifiedAwaits,
      orderSamples,
    } = ctx;
    let lastTime = -Infinity;
    debugInfo.forEach(entry => {
      if (
        entry.awaited &&
        entry.awaited.name === 'rsc stream' &&
        typeof entry.awaited.end === 'number'
      ) {
        // Merged debug info from another chunk follows. Segments are
        // individually ordered but their spans can overlap.
        lastTime = -Infinity;
      }
      if (typeof entry.time === 'number') {
        if (entry.time < lastTime) {
          violations.push(
            'time went backwards: ' + entry.time + ' after ' + lastTime,
          );
        }
        lastTime = entry.time;
      }
      // The generator knows which component's body created each element, so
      // the emitted owner chain can be checked against what actually
      // happened, all the way up.
      if (
        typeof entry.name === 'string' &&
        entry.awaited === undefined &&
        componentCreators.has(entry.name)
      ) {
        const expected = componentCreators.get(entry.name);
        const actual = entry.owner != null ? entry.owner.name : null;
        if (actual !== expected) {
          violations.push(
            'component ' +
              entry.name +
              ' has owner ' +
              actual +
              ' but its element was created by ' +
              expected,
          );
        } else if (entry.owner != null) {
          const expectedChain = creatorChain(entry.name, componentCreators);
          const actualChain = [];
          let chainOwner = entry.owner;
          while (chainOwner != null) {
            actualChain.push(chainOwner.name);
            chainOwner = chainOwner.owner;
          }
          if (actualChain.join('<') !== expectedChain.join('<')) {
            violations.push(
              'component ' +
                entry.name +
                ' has owner chain ' +
                actualChain.join('<') +
                ' but was created under ' +
                expectedChain.join('<'),
            );
          }
        }
      }
      let owner = entry.owner;
      const seen = new Set();
      while (owner != null) {
        if (seen.has(owner)) {
          violations.push('owner cycle at ' + owner.name);
          break;
        }
        seen.add(owner);
        if (
          componentRoots.has(owner.name) &&
          componentRoots.get(owner.name) !== rootIndex
        ) {
          violations.push('owner ' + owner.name + ' belongs to another render');
        }
        owner = owner.owner;
      }
      const io = entry.awaited;
      if (io) {
        if (io.value != null && typeof io.value.then === 'function') {
          // A fulfillment-only subscription, like a DevTools-style inspector
          // would use, must be safe even for caught rejections.
          io.value.then(function inspectValue() {});
        }
        if (
          typeof io.start === 'number' &&
          typeof io.end === 'number' &&
          io.end >= 0 &&
          io.end < io.start
        ) {
          violations.push(
            'io ended before it started: ' +
              io.name +
              ' ' +
              io.start +
              '..' +
              io.end,
          );
        }
        if (io.stack && io.stack.length > 0 && io.name === '') {
          violations.push('io with a stack but no name');
        }
        if (typeof io.byteSize === 'number' && io.byteSize < 0) {
          violations.push('negative byteSize');
        }
        // Identity checks shared by resolved and rejected leaves: the io kind
        // and its stack must describe the code recorded as creating the leaf.
        const checkLeafIo = (leafId, meta) => {
          // V8 prefixes names with the receiver when a function is invoked
          // as a method (program.leaf becomes Object.leaf); compare by the
          // bare name.
          const bareName = name =>
            name.indexOf('.') === -1
              ? name
              : name.slice(name.lastIndexOf('.') + 1);
          const frames = io.stack
            ? io.stack.map(frame => bareName(frame[0]))
            : [];
          const ioName = bareName(io.name);
          // Pool io is named after the fs or timer API call, chained io
          // after the leaf constructor.
          if (meta.chain === null) {
            if (!meta.useTimer && !/readFile/.test(io.name)) {
              violations.push(leafId + ' pool fs io named ' + io.name);
            }
            if (meta.useTimer && !/setTimeout/.test(io.name)) {
              violations.push(leafId + ' pool timer io named ' + io.name);
            }
          } else if (ioName !== 'leaf') {
            violations.push(leafId + ' chained io named ' + io.name);
          }
          // Stacks start at the promise executor or the leaf
          // constructor, never inside hook dispatch internals.
          if (
            frames.length > 0 &&
            frames[0] !== 'readFixture' &&
            frames[0] !== 'sleep' &&
            frames[0] !== 'leaf'
          ) {
            violations.push(leafId + ' io stack starts at ' + frames[0]);
          }
          if (meta.useTimer && frames.indexOf('readFixture') !== -1) {
            violations.push(
              leafId + ' used a timer but its io stack reads a file',
            );
          }
          if (!meta.useTimer && frames.indexOf('sleep') !== -1) {
            violations.push(
              leafId + ' read a file but its io stack is a timer',
            );
          }
          // The stack may only contain code recorded as creating this leaf:
          // any other seed function on it means the stack was captured in,
          // or contaminated by, someone else's execution context.
          for (let i = 0; i < frames.length; i++) {
            const frameName = frames[i];
            if (
              (sourceNames.has(frameName) || componentRoots.has(frameName)) &&
              (meta.chain === null || meta.chain.indexOf(frameName) === -1)
            ) {
              violations.push(
                leafId + ' io stack contains foreign frame ' + frameName,
              );
            }
          }
          if (meta.chain !== null) {
            const initiator = meta.chain[meta.chain.length - 1];
            // A leaf initiated by one render's component must never be
            // attributed inside the other render.
            if (
              componentRoots.has(initiator) &&
              componentRoots.get(initiator) !== rootIndex
            ) {
              violations.push(
                leafId +
                  ' was initiated by the other render (' +
                  initiator +
                  ')',
              );
            }
            // The awaited entry belongs to the task of the component that
            // performed the await: the child for a promise passed down as a
            // prop, otherwise the component recorded invoking the source.
            // Shared sources (cache(), the pool, use()) are awaited by
            // whichever component got there, so they carry no expectation.
            let expectedOwner = null;
            if (propConsumers.has(leafId)) {
              expectedOwner = propConsumers.get(leafId);
            } else if (
              !propLeaves.has(leafId) &&
              meta.chain.indexOf('fetchCached') === -1 &&
              !useComponents.has(initiator) &&
              componentRoots.get(initiator) === rootIndex
            ) {
              expectedOwner = initiator;
            }
            if (expectedOwner !== null && entry.owner != null) {
            }
            if (
              expectedOwner !== null &&
              entry.owner != null &&
              entry.owner.name !== expectedOwner
            ) {
              violations.push(
                leafId +
                  ' awaited entry owned by ' +
                  entry.owner.name +
                  ' but awaited by ' +
                  expectedOwner,
              );
            }
          }
        };
        // Without a debug channel a value that is still pending when its
        // await is serialized stays a halted stub forever, so the entry is
        // attributed but can't be joined to a leaf. Count it against its
        // owner so the completeness checks below can tell "attributed with
        // an unreadable value" apart from "never attributed".
        if (
          io.value != null &&
          io.value.status !== 'fulfilled' &&
          io.value.status !== 'rejected' &&
          entry.owner != null
        ) {
          unidentifiedAwaits.set(
            entry.owner.name,
            (unidentifiedAwaits.get(entry.owner.name) || 0) + 1,
          );
        }
        const leafId = leafIdOfValue(io.value);
        if (leafId !== null) {
          const meta = leafMeta.get(leafId);
          if (meta === undefined) {
            violations.push('io resolved to unknown leaf ' + leafId);
          } else {
            leafSightings.set(leafId, (leafSightings.get(leafId) || 0) + 1);
            if (foreignLeaves.has(leafId) || foreignSettles.has(leafId)) {
              // This entry's io belongs to whatever settled the value, so
              // the leaf-identity checks don't apply.
              return;
            }
            if (meta.rejects) {
              violations.push(leafId + ' was created to reject but resolved');
            }
            checkLeafIo(leafId, meta);
            // The recorded value must be exactly what the leaf resolved to.
            const value = io.value.value;
            if (meta.object) {
              if (value.id !== leafId || String(value.items) !== '1,2,3') {
                violations.push(leafId + ' object value corrupted');
              }
            } else if (!meta.big && value !== leafId) {
              violations.push(
                leafId + ' value corrupted: ' + JSON.stringify(value),
              );
            }
            if (typeof io.end === 'number' && io.end >= 0) {
              orderSamples.push({
                leafId,
                settleBatch: meta.settleBatch,
                end: io.end,
              });
            }
          }
        } else if (
          io.value != null &&
          io.value.status === 'rejected' &&
          io.value.reason != null &&
          typeof io.value.reason.message === 'string' &&
          /^rejected v[0-9]+$/.test(io.value.reason.message)
        ) {
          // The rejection path must attribute its io as precisely as the
          // happy path does.
          const rejectedId = io.value.reason.message.slice('rejected '.length);
          const meta = leafMeta.get(rejectedId);
          if (meta === undefined) {
            violations.push('io rejected with unknown leaf ' + rejectedId);
          } else if (!meta.rejects) {
            violations.push(
              rejectedId + ' was created to resolve but rejected',
            );
          } else if (
            !foreignLeaves.has(rejectedId) &&
            !foreignSettles.has(rejectedId)
          ) {
            checkLeafIo(rejectedId, meta);
          }
        } else if (
          io.value != null &&
          io.value.status === 'fulfilled' &&
          typeof io.value.value === 'string' &&
          io.value.value.indexOf('x'.repeat(1000)) !== -1
        ) {
          // Big leaf values must be replaced by the omission placeholder;
          // the raw megabyte string must never reach the client.
          violations.push('a large debug value was not omitted');
        }
      }
    });
  }

  // Collect debug info from the resolved client tree, in traversal order.
  function collectDebugInfo(root, ctx) {
    const out = [];
    const visited = new Set();
    const queue = [root];
    let budget = 2000;
    while (queue.length > 0) {
      if (budget-- === 0) {
        throw new Error('debug info walker exceeded its budget');
      }
      const value = queue.shift();
      if (value === null || typeof value !== 'object' || visited.has(value)) {
        continue;
      }
      visited.add(value);
      if (value._debugInfo) {
        validateDebugInfo(value._debugInfo, ctx);
        out.push(value._debugInfo);
      }
      if (Array.isArray(value)) {
        value.forEach(entry => queue.push(entry));
      } else if (value.$$typeof === Symbol.for('react.transitional.element')) {
        queue.push(value.props.children);
        if (value.props.data != null) {
          queue.push(value.props.data);
        }
        if (value.props.slot != null) {
          queue.push(value.props.slot);
        }
      } else if (value.$$typeof === Symbol.for('react.lazy')) {
        // An aborted or errored subtree stays a lazy wrapper around its
        // chunk.
        queue.push(value._payload);
      } else if (typeof value.then === 'function') {
        if (value.status === 'fulfilled') {
          queue.push(value.value);
        }
      }
    }
    return out;
  }

  function summarize(value) {
    if (value === null || value === undefined) {
      return String(value);
    }
    if (typeof value === 'string') {
      return value.length > 40 ? value.slice(0, 40) + '…' : value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return '[' + value.map(summarize).join(',') + ']';
    }
    if (value.$$typeof === Symbol.for('react.transitional.element')) {
      const name =
        typeof value.type === 'string'
          ? value.type
          : value.type.name || 'anonymous';
      return (
        '<' + name + '>' + summarize(value.props.children) + '</' + name + '>'
      );
    }
    if (value.$$typeof === Symbol.for('react.lazy')) {
      const payload = value._payload;
      if (payload.status === 'fulfilled') {
        return 'lazy(' + summarize(payload.value) + ')';
      }
      if (payload.status === 'rejected') {
        return 'lazy(rejected: ' + payload.reason.message + ')';
      }
      return 'lazy(' + payload.status + ')';
    }
    if (typeof value.then === 'function') {
      if (value.status === 'fulfilled') {
        return 'promise(' + summarize(value.value) + ')';
      }
      if (value.status === 'rejected') {
        return 'promise(rejected: ' + value.reason.message + ')';
      }
      return 'promise(' + value.status + ')';
    }
    return JSON.stringify(value);
  }

  async function runSeed(seed) {
    const rand = Random.create('flight-fuzz-' + seed);
    const program = createProgram(rand);
    const componentRoots = new Map();
    const componentCreators = new Map();
    const {makeComponent} = buildComponents(
      rand,
      program,
      componentRoots,
      componentCreators,
    );

    // Resolve a seeded subset of the module-scope data before rendering
    // starts, so some awaits hit promises that settled before the request
    // existed.
    const preResolve = rand.intBetween(0, program.pool.length - 1);
    for (let i = 0; i < preResolve; i++) {
      const entry = program.pending.splice(0, 1)[0];
      await entry.io();
      entry.settle();
      await program.pool[i];
    }

    // Most seeds render one root; some render two interleaved. Some abort
    // the first render partway through.
    const concurrentRenders = rand.intBetween(0, 3) === 0 ? 2 : 1;
    const abortAfter = rand.intBetween(0, 5) === 0 ? rand.intBetween(2, 8) : -1;
    const throwers = new Set();
    const parallelComponents = new Set();
    const useComponents = new Set();
    const roots = [];
    for (let i = 0; i < concurrentRenders; i++) {
      const Root = makeComponent(0, {
        canThrow: abortAfter === -1,
        rootIndex: i,
        throwers,
        parallelComponents,
        useComponents,
      });
      // Root elements are created outside any component.
      componentCreators.set(Root.name, null);
      roots.push(Root);
    }

    const results = [];
    const readables = [];
    const aborts = [];
    roots.forEach(Root => {
      const stream = ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(Root, null),
        {},
        {
          filterStackFrame,
          onError(error) {
            // Component bugs and aborts are part of the workload.
            return 'digest:' + error.message;
          },
        },
      );
      aborts.push(reason => stream.abort(reason));
      const readable = new Stream.PassThrough(streamOptions);
      results.push(
        ReactServerDOMClient.createFromNodeStream(
          readable,
          {
            moduleMap: {},
            moduleLoading: {},
          },
          // Turns on the client debug handling that feeds the performance
          // track.
          {replayConsoleLogs: true},
        ),
      );
      readables.push(readable);
      stream.pipe(readable);
    });

    const doneRef = {done: false};
    const allDone = Promise.all([
      // Roots may reject (aborts, a throwing root component); the driver
      // still needs to terminate so the rejection can surface as a value.
      Promise.all(
        results.map(result =>
          result.then(
            v => v,
            x => x,
          ),
        ),
      ),
      Promise.all(readables.map(finishLoadingStream)),
    ]).then(() => {
      doneRef.done = true;
    });

    let settles = 0;
    await drive(rand, program, doneRef, function onSettle() {
      settles++;
      if (settles === abortAfter) {
        aborts[0](new Error('fuzz aborted'));
      }
    });
    await allDone;

    const violations = [];
    const output = [];
    const contexts = [];
    for (let i = 0; i < results.length; i++) {
      const ctx = {
        componentRoots,
        componentCreators,
        leafMeta: program.leafMeta,
        foreignLeaves: program.foreignLeaves,
        foreignSettles: program.foreignSettles,
        sourceNames: program.sourceNames,
        propLeaves: program.propLeaves,
        propConsumers: program.propConsumers,
        useComponents,
        rootIndex: i,
        violations,
        leafSightings: new Map(),
        unidentifiedAwaits: new Map(),
        orderSamples: [],
        collected: false,
      };
      contexts.push(ctx);
      let value;
      try {
        value = await results[i];
      } catch (x) {
        output.push({value: 'root rejected: ' + x.message, debugInfo: []});
        continue;
      }
      ctx.collected = true;
      output.push({
        value: summarize(value),
        // Walk from the root chunk itself: when the root model resolves to a
        // primitive, its debug info has no value to move onto and stays on
        // the chunk.
        debugInfo: collectDebugInfo(results[i], ctx),
      });
    }

    // Components under a throwing component never finish rendering, so
    // their data is exempt from the completeness check.
    const exempt = new Set();
    componentCreators.forEach((creator, componentName) => {
      let current = componentName;
      while (current != null) {
        if (throwers.has(current)) {
          exempt.add(componentName);
          break;
        }
        current = componentCreators.get(current);
      }
    });

    contexts.forEach(ctx => {
      // Dedup: shared data legitimately appears once per awaiting component
      // (plus forks), so the bound is the number of components in the
      // render. Exponential accumulation blows past it immediately.
      let componentCount = 0;
      componentRoots.forEach(root => {
        if (root === ctx.rootIndex) {
          componentCount++;
        }
      });
      ctx.leafSightings.forEach((count, leafId) => {
        if (count > componentCount + 4) {
          violations.push(
            leafId + ' appears ' + count + ' times in one request',
          );
        }
      });
      // Settle order: the driver settled leaves one batch at a time, so io
      // end times must be ordered like the settles were.
      // Within one batch the recurring pings of different ios interleave, so
      // ordering is only guaranteed across batches.
      const samples = [];
      const sampled = new Set();
      ctx.orderSamples.forEach(sample => {
        if (sample.settleBatch !== undefined && !sampled.has(sample.leafId)) {
          sampled.add(sample.leafId);
          samples.push(sample);
        }
      });
      samples.sort((a, b) => a.settleBatch - b.settleBatch);
      for (let i = 1; i < samples.length; i++) {
        if (
          samples[i].settleBatch > samples[i - 1].settleBatch &&
          samples[i].end < samples[i - 1].end - 0.001
        ) {
          violations.push(
            'io end times out of settle order: ' +
              samples[i - 1].leafId +
              ' then ' +
              samples[i].leafId,
          );
        }
      }
    });

    // For a combinator over plain single-leaf parts the settle order decides
    // which part unblocked it: the last part to settle for all(), the first
    // for race(). That leaf must be attributed like any direct await; the
    // other parts stay exempt.
    const combinatorUnblockers = new Set();
    program.combinatorAwaits.forEach(record => {
      if (
        !record.flat ||
        record.completionOrder.length !== record.parts.length
      ) {
        return;
      }
      // The part whose promise completed last (for all) or first (for race)
      // is the one whose io unblocked the combinator. Completion order is
      // recorded live because a part may take extra microtask hops after its
      // leaf settles, so leaf settle order is not completion order.
      const winnerIndex =
        record.kind === 'all'
          ? record.completionOrder[record.completionOrder.length - 1]
          : record.completionOrder[0];
      const part = record.parts[winnerIndex];
      if (part.from + 1 !== part.to) {
        return;
      }
      const winner = 'v' + part.from;
      const winnerMeta = program.leafMeta.get(winner);
      if (winnerMeta !== undefined && winnerMeta.settleIndex !== -1) {
        combinatorUnblockers.add(winner);
      }
    });

    // Completeness: every leaf a component actually fetched and settled must
    // be attributed somewhere in that component's render. Exemptions, each
    // for a reason: aborted renders (the abort races the io), rejected roots
    // (nothing was collected), throwing subtrees (they never finish),
    // combinator parts that did not unblock their combinator and parallel
    // awaits (only the io that unblocked them is attributed), use()
    // components (the used promise carries the transformed value, so there
    // is nothing to join on), and pre-request pool data (no initiating
    // component).
    if (abortAfter === -1) {
      program.leafMeta.forEach((meta, leafId) => {
        const combinators =
          meta.chain === null
            ? 0
            : meta.chain.filter(
                sourceName =>
                  sourceName === 'loadAll' || sourceName === 'loadFastest',
              ).length;
        if (
          meta.chain === null ||
          meta.rejects ||
          meta.big ||
          meta.settleIndex === -1 ||
          (combinators > 0 &&
            !(combinators === 1 && combinatorUnblockers.has(leafId))) ||
          meta.chain.indexOf('forkedDerived') !== -1 ||
          // Like combinators, a derived chain nested inside another
          // composite attributes whichever io the enclosing await chain
          // surfaces, not necessarily its own.
          (meta.chain.indexOf('loadDerived') !== -1 &&
            !componentRoots.has(
              meta.chain[meta.chain.indexOf('loadDerived') + 1],
            )) ||
          meta.chain.indexOf('readPages') !== -1 ||
          meta.chain.indexOf('queryThenable') !== -1 ||
          // A value delivered through a userland thenable: React cannot see
          // through it, so the io behind it never reaches the consumer.
          meta.chain.indexOf('proxyProp') !== -1 ||
          program.propLeaves.has(leafId) ||
          program.foreignLeaves.has(leafId)
        ) {
          return;
        }
        const initiator = meta.chain[meta.chain.length - 1];
        if (
          !componentRoots.has(initiator) ||
          exempt.has(initiator) ||
          parallelComponents.has(initiator) ||
          useComponents.has(initiator)
        ) {
          return;
        }
        const ctx = contexts[componentRoots.get(initiator)];
        if (ctx && ctx.collected === true && !ctx.leafSightings.has(leafId)) {
          const wildcards = ctx.unidentifiedAwaits.get(initiator) || 0;
          if (wildcards > 0) {
            ctx.unidentifiedAwaits.set(initiator, wildcards - 1);
            return;
          }
          violations.push(
            leafId +
              ' (' +
              meta.chain.join('<') +
              ') settled but never appeared in the debug info',
          );
        }
      });

      // A single-leaf promise handed down as a prop is awaited by the child,
      // so it must be attributed inside the child's render.
      program.propConsumers.forEach((consumer, leafId) => {
        const meta = program.leafMeta.get(leafId);
        if (
          meta === undefined ||
          meta.settleIndex === -1 ||
          program.foreignLeaves.has(leafId)
        ) {
          return;
        }
        if (!componentRoots.has(consumer) || exempt.has(consumer)) {
          return;
        }
        const ctx = contexts[componentRoots.get(consumer)];
        if (ctx && ctx.collected === true && !ctx.leafSightings.has(leafId)) {
          const wildcards = ctx.unidentifiedAwaits.get(consumer) || 0;
          if (wildcards > 0) {
            ctx.unidentifiedAwaits.set(consumer, wildcards - 1);
            return;
          }
          violations.push(
            leafId +
              ' was passed as a prop to ' +
              consumer +
              ' but never appeared in its render',
          );
        }
      });
    }

    // The client flushes the performance track on a 100ms timer after the
    // last pending chunk resolves. Wait it out so the flush lands in this
    // seed's recording instead of on the global timeline during a later test.
    await new Promise(resolve => setTimeout(resolve, 150));

    // Performance track spans.
    recordedMeasures.forEach(measure => {
      const options = measure.options;
      if (
        options == null ||
        !Number.isFinite(options.start) ||
        !Number.isFinite(options.end)
      ) {
        violations.push('measure without finite start/end: ' + measure.name);
      } else if (options.end < options.start) {
        violations.push(
          'span with negative width: ' +
            measure.name +
            ' ' +
            options.start +
            '..' +
            options.end,
        );
      } else if (
        options.detail == null ||
        options.detail.devtools == null ||
        typeof options.detail.devtools.track !== 'string'
      ) {
        violations.push('measure without a track: ' + measure.name);
      }
    });

    return {output, violations, measureCount: recordedMeasures.length};
  }

  // FUZZ_TEST_SEED reruns or explores any seed: every check is computed from
  // what the seed's program actually did, so novel seeds verify like
  // committed ones.
  const seeds = [];
  if (ONLY_SEED !== null) {
    seeds.push(ONLY_SEED);
  } else {
    for (let seed = 0; seed < NUM_SEEDS; seed++) {
      seeds.push(seed);
    }
  }
  seeds.forEach(seed => {
    it(`produces coherent async debug info (seed ${seed})`, async () => {
      // Render unconditionally so we catch any production crashes
      const {output, violations, measureCount} = await runSeed(seed);
      if (
        __DEV__ &&
        gate(
          flags =>
            flags.enableComponentPerformanceTrack && flags.enableAsyncDebugInfo,
        )
      ) {
        expect(violations).toEqual([]);
        if (output[0].debugInfo.length > 0) {
          // The client flushed the performance track for the initial render.
          expect(measureCount).toBeGreaterThan(0);
        }
      }
    });
  });
});

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

// One source plan, one public round trip, two independent checks:
// - Contents: compare values when the application receives them.
// - Progress: after each external service, demand every observation whose
//   source prerequisites are satisfied BEFORE releasing another service.
// A service is a source Promise resolution, module load, or channel operation.
// Neither check inspects Flight rows, chunk IDs, or reader initialization state.
//
// Reading guide:
// 1. The generators build real values and describe their public meaning and
//    the external events needed to observe them.
// 2. roundTrip runs the original writer and client with varied packet delivery.
// 3. observer checks contents inside callbacks, then rechecks retained values.
// 4. sourceReadiness derives deadlines from the plan; the driver drains all
//    ready observations before releasing the next event. The timeout is just
//    an allowance for scheduling, not a prediction of reader execution time.
// Replay a generated case with FLIGHT_FUZZ_SEED=123 FLIGHT_FUZZ_CASES=1.
// The default is a small sample. Set FLIGHT_FUZZ_CASES=128 for the full
// demand sweep; seed selection and the observation oracle stay the same.
// Construction graphs also vary service order independently of graph shape.
// FLIGHT_FUZZ_SCHEDULES controls how many orders to try for each graph. The
// failure includes the graph as JSON; FLIGHT_FUZZ_GRAPH replays an edited graph
// with the same observer and original writer, for minimizing a failure.
// Each construction graph also runs with one module load rejected, checking
// that reachable failure propagates without waiting for unrelated services.
// Run ReactFlightReaderFuzz with --runInBand, and --prod for production.
// Fixed reproductions below are ordinary named tests. Locally change an
// it.skip to it to inspect a known failure against the original reader.

const tick = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const gate = {promise, resolve, reject, released: false};
  promise.then(
    () => {
      gate.released = true;
    },
    () => {
      gate.released = true;
    },
  );
  return gate;
}

// Only public server/client entry points. Transport bytes are opaque: preserve
// their order and change packet boundaries, never manufacture or inspect rows.
function roundTrip({
  host,
  Server,
  Client,
  model,
  webpackMap = {},
  serverModuleMap = null,
  packetSizes = [1, 7, 64, 4096],
  yieldBetweenPackets = false,
  sharedBuffer = false,
  adoptRoot = false,
  onError,
}) {
  const manifest = {
    moduleMap: null,
    serverModuleMap,
    moduleLoading: null,
  };
  const errors = [];
  let queued = [];
  let serverDone = false;
  let closed = false;
  let disposed = false;
  let packet = 0;
  let send;
  let end;
  let abort;
  let root;
  const options = {
    onError(error) {
      if (disposed) return 'cleanup';
      if (onError) {
        try {
          return onError(error);
        } catch (unexpected) {
          errors.push(unexpected);
        }
      } else errors.push(error);
      return 'unexpected-writer-error';
    },
  };
  if (host === 'node') {
    const {PassThrough, Writable} = require('stream');
    const input = new PassThrough();
    root = Client.createFromNodeStream(input, manifest);
    send = bytes => input.write(bytes);
    end = () => input.end();
    const output = new Writable({
      write(bytes, encoding, done) {
        queued.push(Buffer.from(bytes));
        done();
      },
      final(done) {
        serverDone = true;
        done();
      },
    });
    output.on('error', error => {
      if (!disposed) errors.push(error);
    });
    const writer = Server.renderToPipeableStream(model, webpackMap, options);
    abort = reason => writer.abort(reason);
    writer.pipe(output);
  } else {
    let controller;
    const input = new ReadableStream({start: value => (controller = value)});
    root = Client.createFromReadableStream(input, {
      serverConsumerManifest: manifest,
    });
    send = bytes => controller.enqueue(bytes);
    end = () => controller.close();
    const control = new AbortController();
    const output = Server.renderToReadableStream(model, webpackMap, {
      ...options,
      signal: control.signal,
    });
    abort = reason => control.abort(reason);
    const reader = output.getReader();
    const collect = async () => {
      for (;;) {
        const {done, value} = await reader.read();
        if (done) {
          serverDone = true;
          return;
        }
        queued.push(Buffer.from(value));
      }
    };
    collect().catch(error => {
      if (!disposed) errors.push(error);
    });
  }

  async function flush() {
    await tick();
    const bytes = sharedBuffer
      ? new Uint8Array(Buffer.concat(queued))
      : Buffer.concat(queued);
    queued = [];
    for (let offset = 0; offset < bytes.length; ) {
      const size = packetSizes[packet++ % packetSizes.length];
      send(bytes.subarray(offset, offset + size));
      offset += size;
      if (yieldBetweenPackets) await tick();
    }
    await tick();
    if (errors.length) throw errors[0];
  }

  async function until(predicate, description = 'application observation') {
    const deadline = Date.now() + 2000;
    do {
      await flush();
      if (predicate()) return;
      // Edge scheduling and Blob reads can need a timer or I/O turn. Counting
      // immediately resolved turns can exhaust a retry budget before either
      // gets a chance to run, especially in the full suite.
      await new Promise(resolve => setTimeout(resolve, 1));
    } while (Date.now() < deadline);
    throw new Error(
      'No progress: ' +
        (typeof description === 'function' ? description() : description),
    );
  }

  function close() {
    if (!closed) {
      closed = true;
      end();
    }
  }

  return {
    root: adoptRoot ? Promise.resolve(root) : root,
    flush,
    until,
    close,
    abort,
    async finish() {
      await until(() => serverDone && queued.length === 0, 'writer completion');
      // Deliberately leave the client open: values must arrive before EOF.
    },
    async dispose() {
      disposed = true;
      if (!serverDone) abort();
      close();
      await tick();
    },
  };
}

// Readiness uses only the source graph and source-side service records. It is
// independent of which callbacks the reader has delivered or what they contain.
// The graph is fixed before serialization; only availability records change.
function sourceReadiness(plan) {
  const cache = new Map();

  // Eager contents need their ordinary children. Promise outcomes, channel
  // items, and element rendering are separate observations, so their work
  // normally does not delay a handle. Known writer prerequisites are explicit
  // in `needs`; cycles themselves add no extra prerequisite.
  function requirements(value) {
    if (cache.has(value)) return cache.get(value);
    const result = new Set();
    const seen = new Set();
    const todo = [value];
    while (todo.length) {
      const source = todo.pop();
      if (seen.has(source)) continue;
      seen.add(source);
      (plan.needs.get(source) || []).forEach(step => result.add(step));
      if (plan.promises.has(source) || plan.visuals.has(source)) continue;
      if (plan.modules.has(source)) todo.push(plan.modules.get(source));
      else if (plan.functions.has(source)) {
        const call = plan.functions.get(source);
        todo.push(call.result, ...(call.inputs || []));
      } else if (plan.sequences.has(source)) {
        const sequence = plan.sequences.get(source);
        if (sequence.sync) todo.push(...sequence.values, sequence.returnValue);
      } else if (source instanceof Error) {
        if (__DEV__) {
          if ('cause' in source) todo.push(source.cause);
          if (source instanceof AggregateError) todo.push(source.errors);
        }
      } else if (Array.isArray(source)) todo.push(...source);
      else if (source instanceof Map) {
        source.forEach((item, key) => todo.push(key, item));
      } else if (source instanceof Set || source instanceof FormData)
        source.forEach(item => todo.push(item));
      else if (
        source !== null &&
        typeof source === 'object' &&
        Object.getPrototypeOf(source) === Object.prototype
      )
        todo.push(...Object.values(source));
    }
    cache.set(value, result);
    return result;
  }

  const released = steps => steps.every(step => step.released);
  const complete = value => released(Array.from(requirements(value)));

  return job => {
    const {kind, source, index} = job;
    switch (kind) {
      case 'root':
        if (plan.rootError) {
          if (plan.rootErrorSteps === undefined)
            throw new Error('Source plan omitted root failure availability');
          return released(plan.rootErrorSteps);
        }
        if (
          plan.adoptRoot &&
          plan.promises.get(plan.writerModel).state === 'pending'
        )
          return false;
        return complete(source);
      case 'outcome': {
        const outcome = plan.promises.get(source);
        if (
          outcome.state === 'fulfilled' &&
          outcome.failure &&
          outcome.failure.step.released
        ) {
          return true;
        }
        return (
          outcome.state === 'rejected' ||
          (outcome.state === 'fulfilled' && complete(outcome.value))
        );
      }
      case 'render': {
        // The generated component defines its render inputs. For the host and
        // client components here these are its props; suspended server/lazy
        // components additionally name the service that releases their body.
        const failure = plan.renderFailures.get(source);
        if (failure !== undefined) {
          return failure.step.released;
        }
        return (
          complete(source) &&
          released(plan.renderNeeds.get(source) || []) &&
          (plan.renderInputs.get(source) || [source.props]).every(complete)
        );
      }
      case 'cancel':
        return true;
      case 'item':
      case 'end':
      case 'bytes': {
        const sequence = plan.sequences.get(source);
        // A later item cannot overtake an earlier one. Byte streams owe byte
        // prefixes, not the source's enqueue boundaries; EOF has its own gate.
        if (sequence.bytes) {
          const prefix =
            index === undefined ? sequence.byteSteps.length : index + 1;
          return (
            released(sequence.byteSteps.slice(0, prefix)) &&
            (kind !== 'end' || released(sequence.endSteps))
          );
        }
        if (!sequence.sync && (!sequence.itemSteps || !sequence.endSteps))
          throw new Error('Source plan omitted channel availability');
        const prefix = kind === 'end' ? sequence.values.length : index + 1;
        for (let i = 0; i < prefix; i++) {
          if (
            !complete(sequence.values[i]) ||
            (!sequence.sync && !released(sequence.itemSteps[i]))
          )
            return false;
        }
        return (
          kind !== 'end' ||
          ((sequence.sync || released(sequence.endSteps)) &&
            (sequence.error || complete(sequence.returnValue)))
        );
      }
      default:
        throw new Error('Unknown application observation: ' + kind);
    }
  };
}

// Check ordinary contents synchronously inside application callbacks. Async
// leaves use their public APIs. One origin map spans every observed result:
// splitting is permitted, but distinct source objects must not be merged.
function observer({
  promises,
  visuals,
  sequences,
  functions,
  modules = new Map(),
  rootError,
  render,
  publicationReady,
}) {
  const origins = new WeakMap();
  const subscribed = new WeakSet();
  const errors = [];
  const subscriptions = [];
  const published = [];
  const observations = [];
  let pending = 0;
  let roots = 0;
  let expectedRoots = 0;

  // Register an obligation before calling the public API. Each actual
  // subscription/read/render gets its own record, including split copies.
  function begin(kind, source, path, index) {
    const job = {kind, source, path, index, done: false};
    observations.push(job);
    return job;
  }

  function capture(run) {
    try {
      run();
    } catch (error) {
      errors.push(error);
    }
  }

  function checkPublication(job) {
    expect(job.done).toBe(false);
    if (publicationReady !== undefined && !publicationReady(job)) {
      throw new Error('Premature publication: ' + job.path);
    }
  }

  function asyncCheck(run) {
    pending++;
    Promise.resolve()
      .then(run)
      .catch(error => errors.push(error))
      .then(() => pending--);
  }

  function checkError(error, expected) {
    expect(error).toBeDefined();
    if (expected.digest !== undefined)
      expect(error.digest).toBe(expected.digest);
    else expect(error.message).toBe(expected.message);
  }

  function check(source, received, path, visited = new Set()) {
    try {
      // A client reference denotes its loaded export, not the server marker.
      if (modules.has(source)) source = modules.get(source);
      if (
        source === null ||
        (typeof source !== 'object' && typeof source !== 'function')
      ) {
        expect(received).toBe(source);
        return;
      }
      expect(
        received !== null &&
          (typeof received === 'object' || typeof received === 'function'),
      ).toBe(true);
      if (origins.has(received)) expect(origins.get(received)).toBe(source);
      else origins.set(received, source);
      if (visited.has(received)) return;
      visited.add(received);
      const promise = promises.get(source);
      if (promise) {
        expect(typeof received.then).toBe('function');
        if (!subscribed.has(received)) {
          subscribed.add(received);
          const subscription = {source: promise, done: false};
          subscriptions.push(subscription);
          const job = begin('outcome', source, path + '.then');
          received.then(
            value =>
              capture(() => {
                checkPublication(job);
                expect(subscription.done).toBe(false);
                expect(promise.failure).toBeUndefined();
                expect(promise.state).toBe('fulfilled');
                check(promise.value, value, path + '.then');
                published.push({
                  source: promise.value,
                  value,
                  path: path + '.then',
                });
                subscription.done = true;
                job.done = true;
              }),
            error =>
              capture(() => {
                if (!promise.failure && promise.state !== 'rejected') {
                  throw new Error(
                    job.path + ': unexpected rejection: ' + error.message,
                  );
                }
                checkPublication(job);
                expect(subscription.done).toBe(false);
                if (promise.failure) {
                  // The source Promise fulfilled with this graph. Loading a
                  // required client export failed while reconstructing it.
                  expect(promise.state).toBe('fulfilled');
                  expect(promise.failure.step.released).toBe(true);
                  checkError(error, promise.failure.error);
                } else {
                  expect(promise.state).toBe('rejected');
                  expect(error.digest).toBe(promise.digest);
                }
                subscription.done = true;
                job.done = true;
              }),
          );
        }
        return;
      }
      if (visuals.has(source)) {
        if (publicationReady !== undefined) {
          // Inspecting cyclic props can discover this same render again.
          // Retain the props themselves for later content checks instead.
          if (subscribed.has(received)) {
            return;
          }
          subscribed.add(received);
        }
        const job = begin('render', source, path + '.render');
        asyncCheck(async () => {
          const expected = visuals.get(source);
          if (typeof expected === 'string') {
            let output;
            try {
              output = await render(received);
            } catch (error) {
              throw new Error(
                job.path + ': unexpected rejection: ' + error.message,
              );
            }
            expect(output).toBe(expected);
          } else {
            await render(received).then(
              () => {
                throw new Error('Expected rendering to fail');
              },
              error => checkError(error, expected),
            );
          }
          checkPublication(job);
          job.done = true;
        });
        return;
      }
      if (functions.has(source)) {
        expect(typeof received).toBe('function');
        const call = functions.get(source);
        check(call.result, received(...call.args), path + '()', visited);
        return;
      }
      if (sequences.has(source)) {
        if (!subscribed.has(received)) {
          subscribed.add(received);
          const plan = sequences.get(source);
          if (plan.cancel) {
            const job = begin('cancel', source, path + '.cancel');
            asyncCheck(async () => {
              const reader = received.getReader();
              const first = plan.readBeforeCancel ? reader.read() : null;
              await reader.cancel('fuzz consumer canceled');
              if (first !== null) {
                const item = await first;
                if (item.done) expect(item.value).toBeUndefined();
                else check(plan.values[0], item.value, path + '.beforeCancel');
              }
              job.done = true;
            });
            return;
          }
          const consume = async () => {
            const kind = plan.bytes ? 'bytes' : 'item';
            const items = (plan.byteSteps || plan.values).map((_, index) =>
              begin(kind, source, path + '.' + kind + '[' + index + ']', index),
            );
            const endJob = begin('end', source, path + '.end');
            const iterator = plan.stream
              ? received.getReader(plan.byob ? {mode: 'byob'} : undefined)
              : plan.sync
                ? received[Symbol.iterator]()
                : received[Symbol.asyncIterator]();
            const read = () =>
              plan.stream ? iterator.read() : iterator.next();
            if (plan.bytes) {
              const bytes = [];
              for (;;) {
                const item = await (plan.byob
                  ? iterator.read(new Uint8Array(1 + (bytes.length % 7)))
                  : read());
                if (item.value) bytes.push(...item.value);
                // Byte stream boundaries are not values. Compare each visible
                // prefix, and record which source byte prefixes have arrived.
                expect(bytes).toEqual(plan.bytes.slice(0, bytes.length));
                for (let i = 0; i < items.length; i++)
                  if (bytes.length >= plan.byteLengths[i]) items[i].done = true;
                if (item.done) break;
              }
              expect(bytes).toEqual(plan.bytes);
              endJob.done = true;
              return;
            }
            const checkItem = (item, i) => {
              if (item.done)
                throw new Error(path + '.item' + i + ': sequence ended early');
              check(plan.values[i], item.value, path + '.item' + i);
              published.push({
                source: plan.values[i],
                value: item.value,
                path: path + '.item' + i,
              });
              items[i].done = true;
            };
            // Flight iterator reads have a synchronous public .then. Check
            // that notification before a later assignment can repair its
            // contents; await only our completion before the next demand.
            const observeRead = (result, fulfill, fail) =>
              new Promise((resolve, reject) => {
                let notifications = 0;
                const notify = (callback, value) => {
                  try {
                    expect(++notifications).toBe(1);
                    callback(value);
                    resolve();
                  } catch (error) {
                    // A second notification can happen after completion, when
                    // rejecting this Promise no longer reports the failure.
                    errors.push(error);
                    reject(error);
                  }
                };
                if (plan.sync) notify(fulfill, result);
                else {
                  result.then(
                    value => notify(fulfill, value),
                    error => {
                      notify(value => {
                        if (fail) fail(value);
                        else throw value;
                      }, error);
                    },
                  );
                }
              });
            const checkEnd = last =>
              observeRead(
                last,
                end => {
                  if (plan.error) throw new Error('Expected sequence to fail');
                  expect(end.done).toBe(true);
                  check(plan.returnValue, end.value, path + '.return');
                  published.push({
                    source: plan.returnValue,
                    value: end.value,
                    path: path + '.return',
                  });
                  endJob.done = true;
                },
                error => {
                  if (!plan.error) throw error;
                  checkError(error, plan.error);
                  endJob.done = true;
                },
              );
            if (plan.concurrent) {
              const reads = plan.values.map((_, i) =>
                observeRead(read(), item => checkItem(item, i)),
              );
              reads.push(checkEnd(read()));
              await Promise.all(reads);
            } else {
              for (let i = 0; i < plan.values.length; i++)
                await observeRead(read(), item => checkItem(item, i));
              await checkEnd(read());
            }
          };
          for (let i = 0; i < (plan.consumers || 1); i++) asyncCheck(consume);
        }
        return;
      }
      if (source instanceof Error) {
        expect(received instanceof Error).toBe(true);
        if (__DEV__) {
          expect(received.name).toBe(source.name);
          expect(received.message).toBe(source.message);
          expect('cause' in received).toBe('cause' in source);
          if ('cause' in source) {
            expect(
              Object.getOwnPropertyDescriptor(received, 'cause').enumerable,
            ).toBe(false);
            check(source.cause, received.cause, path + '.cause', visited);
          }
          if (source instanceof AggregateError) {
            expect(received instanceof AggregateError).toBe(true);
            expect(
              Object.getOwnPropertyDescriptor(received, 'errors').enumerable,
            ).toBe(false);
            check(source.errors, received.errors, path + '.errors', visited);
          }
        } else {
          expect(received.name).toBe('Error');
          expect(received.message).toContain(
            'An error occurred in the Server Components render.',
          );
          expect('cause' in received).toBe(false);
          expect('errors' in received).toBe(false);
        }
      } else if (Array.isArray(source)) {
        expect(Array.isArray(received)).toBe(true);
        expect(received.length).toBe(source.length);
        for (let i = 0; i < source.length; i++)
          check(source[i], received[i], path + '[' + i + ']', visited);
      } else if (source instanceof Map) {
        expect(received instanceof Map).toBe(true);
        const a = Array.from(source);
        const b = Array.from(received);
        expect(b.length).toBe(a.length);
        for (let i = 0; i < a.length; i++) {
          check(a[i][0], b[i][0], path + '.key' + i, visited);
          check(a[i][1], b[i][1], path + '.value' + i, visited);
        }
      } else if (source instanceof Set) {
        expect(received instanceof Set).toBe(true);
        const a = Array.from(source);
        const b = Array.from(received);
        expect(b.length).toBe(a.length);
        for (let i = 0; i < a.length; i++)
          check(a[i], b[i], path + '.member' + i, visited);
      } else if (source instanceof Date) {
        expect(received instanceof Date).toBe(true);
        expect(received.getTime()).toBe(source.getTime());
      } else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        expect(Object.prototype.toString.call(received)).toBe(
          Object.prototype.toString.call(source),
        );
        const bytes = value =>
          value instanceof ArrayBuffer
            ? new Uint8Array(value)
            : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        expect(Array.from(bytes(received))).toEqual(Array.from(bytes(source)));
      } else if (source instanceof Blob) {
        expect(received instanceof Blob).toBe(true);
        expect(received.type).toBe(source.type);
        expect(received.size).toBe(source.size);
        asyncCheck(async () => {
          expect(
            Array.from(new Uint8Array(await received.arrayBuffer())),
          ).toEqual(Array.from(new Uint8Array(await source.arrayBuffer())));
        });
      } else if (source instanceof FormData) {
        expect(received instanceof FormData).toBe(true);
        const a = Array.from(source.entries());
        const b = Array.from(received.entries());
        expect(b.length).toBe(a.length);
        for (let i = 0; i < a.length; i++) {
          expect(b[i][0]).toBe(a[i][0]);
          // Flight intentionally drops source filenames, but retains Blob data.
          check(a[i][1], b[i][1], path + '.form' + i, visited);
        }
      } else {
        expect(Object.getPrototypeOf(received)).toBe(Object.prototype);
        const keys = Object.keys(source);
        expect(Object.keys(received)).toEqual(keys);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          check(source[key], received[key], path + '.' + key, visited);
        }
      }
    } catch (error) {
      throw new Error(path + ': ' + error.message);
    }
  }

  function healthy() {
    if (errors.length) throw errors[0];
    return true;
  }

  function attach(root, source, reentrant = false) {
    expectedRoots++;
    const job = begin('root', source, 'root');
    root.then(
      value =>
        capture(() => {
          checkPublication(job);
          expect(rootError).toBeUndefined();
          check(source, value, 'root');
          published.push({source, value, path: 'root'});
          roots++;
          job.done = true;
          if (reentrant) attach(root, source);
        }),
      error =>
        capture(() => {
          if (rootError === undefined) {
            throw new Error('root: unexpected rejection: ' + error.message);
          }
          checkPublication(job);
          checkError(error, rootError);
          roots++;
          job.done = true;
        }),
    );
  }

  return {
    healthy,
    check,
    observe(source, received, path) {
      check(source, received, path);
      published.push({source, value: received, path});
    },
    attach,
    pendingReady(ready) {
      healthy();
      return observations.filter(job => !job.done && ready(job));
    },
    recheck() {
      const count = published.length;
      for (let i = 0; i < count; i++) {
        const {source, value, path} = published[i];
        check(source, value, path + ' after settlement');
      }
    },
    settled() {
      healthy();
      return (
        roots > 0 &&
        roots === expectedRoots &&
        pending === 0 &&
        subscriptions.every(item => item.done)
      );
    },
  };
}

const firstSeed = +(process.env.FLIGHT_FUZZ_SEED || 1);
const extendedSweep = process.env.FLIGHT_FUZZ_CASES !== undefined;
const count = +(process.env.FLIGHT_FUZZ_CASES || 4);
const scheduleCount = +(process.env.FLIGHT_FUZZ_SCHEDULES || 2);
if (
  !Number.isSafeInteger(firstSeed) ||
  firstSeed < 0 ||
  firstSeed > 0xffffffff ||
  !Number.isSafeInteger(count) ||
  count < 1 ||
  count > 10000 ||
  !Number.isSafeInteger(scheduleCount) ||
  scheduleCount < 1 ||
  scheduleCount > 32
) {
  throw new Error(
    'Use a uint32 FLIGHT_FUZZ_SEED, FLIGHT_FUZZ_CASES in 1..10000, and FLIGHT_FUZZ_SCHEDULES in 1..32.',
  );
}
const seeds = Array.from({length: count}, (_, i) => (firstSeed + i) >>> 0);

function random(seed) {
  let state = seed;
  return limit => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) % limit;
  };
}

// A plan describes source semantics, never a desired reader trace:
// - promises records actual native source settlements.
// - needs records external gates required to reconstruct a value.
// - renderNeeds/renderInputs separately describe work needed to render an
//   element. Receiving an element normally does not require rendering it.
// - sequences records item contents, enqueue/yield availability, and terminal
//   availability, accounting for the public stream/iterator error behavior.
// - modules/functions/visuals record public export, call, and render results.
// - actions choose a service order; they never declare an observation complete.
// Ordinary arrays/objects/collections need no annotation: both oracles traverse
// the real graph. Adding a feature with external work must describe its gates.
function createPlan(seed) {
  const pick = random(seed);
  const promises = new Map();
  const visuals = new Map();
  const sequences = new Map();
  const functions = new Map();
  const expectedErrors = new Map();
  const actions = [];
  const recipe = [];
  const needs = new Map();
  const renderNeeds = new Map();

  function promise(name) {
    const value = deferred();
    const record = {state: 'pending', digest: name};
    promises.set(value.promise, record);
    // Source oracle state is earned by native Promise callbacks, never by
    // reading the writer's or reader's private thenable fields.
    value.promise.then(
      result => {
        record.state = 'fulfilled';
        record.value = result;
      },
      () => {
        record.state = 'rejected';
      },
    );
    return value;
  }
  function action(label, run) {
    const step = {label, run, released: false};
    actions.push(step);
    return step;
  }
  function requireFor(source, ...steps) {
    needs.set(source, [...(needs.get(source) || []), ...steps.filter(Boolean)]);
  }
  function requireRender(source, ...steps) {
    renderNeeds.set(source, steps);
  }

  return {
    pick,
    promises,
    visuals,
    sequences,
    functions,
    modules: new Map(),
    expectedErrors,
    actions,
    recipe,
    needs,
    renderNeeds,
    renderInputs: new Map(),
    renderFailures: new Map(),
    requireFor,
    requireRender,
    promise,
    action,
  };
}

function generateMixed(seed, ReactServer, React, WebpackMock) {
  const plan = createPlan(seed);
  const {
    pick,
    visuals,
    sequences,
    functions,
    expectedErrors,
    actions,
    recipe,
    promise,
    action,
  } = plan;

  const first = promise('first');
  const second = promise('second');
  const hidden = promise('hidden');
  const rejected = promise('rejected');
  const error = new Error('fuzz expected rejection ' + seed);
  expectedErrors.set(error, 'rejected');

  const buffer = new ArrayBuffer(24);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) bytes[i] = pick(256);
  const binary = [
    buffer,
    new Uint8Array(buffer, 3, 9),
    new Int16Array(buffer, 4, 4),
    new Float32Array([1.5, -2.25]),
    new DataView(buffer, 5, 7),
    new BigInt64Array([42n, -1n]),
  ];
  const blob = new Blob([bytes, '🙂'], {type: 'application/x-flight-fuzz'});
  const form = new FormData();
  form.append('repeated', 'first');
  form.append('repeated', 'second');
  form.append('file', blob, 'source.bin');

  const text = 'seed-' + seed;
  const element = ReactServer.createElement('span', {'data-seed': text}, text);
  visuals.set(element, '<span data-seed="' + text + '">' + text + '</span>');
  const moduleReady = deferred();
  function Badge({label}) {
    return React.createElement('b', null, label);
  }
  const clientModule = WebpackMock.clientExports(
    {Badge},
    'fuzz-module',
    'fuzz.js',
    moduleReady.promise,
  );
  const clientElement = ReactServer.createElement(clientModule.Badge, {
    label: text,
  });
  visuals.set(clientElement, '<b>' + text + '</b>');
  const serverModule = WebpackMock.serverExports(
    {greet: name => 'hi ' + name},
    moduleReady.promise,
  );
  functions.set(serverModule.greet, {args: ['fuzz'], result: 'hi fuzz'});
  const bound = serverModule.greet.bind(null, text);
  functions.set(bound, {args: [], result: 'hi ' + text});
  plan.requireRender(clientElement, moduleReady);
  [serverModule.greet, bound].forEach(value =>
    plan.requireFor(value, moduleReady),
  );
  if (pick(2)) moduleReady.resolve();
  action('module load', () => moduleReady.resolve());

  const componentReady = deferred();
  async function Greeting() {
    await componentReady.promise;
    return ReactServer.createElement('i', null, text);
  }
  const serverElement = ReactServer.createElement(Greeting, {key: 'greeting'});
  visuals.set(serverElement, '<i>' + text + '</i>');
  plan.requireRender(serverElement, componentReady);
  action('server component', () => componentReady.resolve());

  const atoms = [
    null,
    true,
    false,
    -0,
    NaN,
    Infinity,
    -Infinity,
    1234567890123456789n,
    '$escape\n🙂',
    Symbol.for('flight-fuzz'),
    new Date(1700000000000 + seed),
    blob,
    form,
    ...binary,
    element,
    clientElement,
    serverElement,
    first.promise,
    second.promise,
    rejected.promise,
    serverModule.greet,
    bound,
  ];
  const nodes = [[], {}, new Set(), new Map()];
  const extra = 4 + pick(5);
  for (let i = 0; i < extra; i++)
    nodes.push([[], {}, new Set(), new Map()][pick(4)]);
  const pool = nodes.concat(atoms);
  const descriptions = new Map();
  for (let i = 0; i < pool.length; i++) descriptions.set(pool[i], 'v' + i);
  const edge = () => pool[pick(pool.length)];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const edges = [];
    const n = 1 + pick(4);
    for (let j = 0; j < n; j++) {
      const value = edge();
      edges.push(descriptions.get(value));
      if (Array.isArray(node)) node.push(value);
      else if (node instanceof Set) node.add(value);
      else if (node instanceof Map) {
        const key = edge();
        edges.push('key=' + descriptions.get(key));
        node.set(key, value);
      } else node['field' + j] = value;
    }
    recipe.push(
      'v' +
        i +
        ' ' +
        Object.prototype.toString.call(node) +
        ' -> ' +
        edges.join(','),
    );
  }
  // Exercise self, mutual and mixed constructor cycles throughout the corpus,
  // alongside unrestricted random graph edges and asynchronous outcomes.
  let cycle;
  switch (seed % 4) {
    case 0:
      cycle = new Set();
      cycle.add(cycle);
      break;
    case 1:
      cycle = new Map();
      cycle.set(cycle, cycle);
      break;
    case 2: {
      cycle = new Set();
      const other = new Set([cycle]);
      cycle.add(other);
      break;
    }
    default:
      cycle = new Set();
      cycle.add([cycle, nodes[pick(nodes.length)], true]);
  }
  const outcome = {
    graph: nodes[pick(nodes.length)],
    hidden: hidden.promise,
    cycle,
  };
  const hiddenValue = [
    null,
    42,
    binary[pick(binary.length)],
    '🙂'.repeat(1100),
  ][pick(4)];
  action('first resolves', () => first.resolve(outcome));
  action('second adopts first', () => second.resolve(first.promise));
  action('hidden resolves', () => hidden.resolve(hiddenValue));
  action('rejection', () => rejected.reject(error));

  const streamGate = deferred();
  let controller;
  const stream = new ReadableStream({
    start: value => {
      controller = value;
    },
  });
  const streamValues = [nodes[pick(nodes.length)], cycle, element];
  const firstItem = action('stream first', () =>
    controller.enqueue(streamValues[0]),
  );
  const endStream = {
    label: 'stream remainder',
    run() {
      controller.enqueue(streamValues[1]);
      controller.enqueue(streamValues[2]);
      controller.close();
    },
  };
  sequences.set(stream, {
    stream: true,
    values: streamValues,
    itemSteps: [[firstItem], [endStream], [endStream]],
    endSteps: [endStream],
  });
  const iterableValues = [
    binary[pick(binary.length)],
    nodes[pick(nodes.length)],
  ];
  const iterable = {
    async *[Symbol.asyncIterator]() {
      await streamGate.promise;
      for (let i = 0; i < iterableValues.length; i++) yield iterableValues[i];
    },
  };
  sequences.set(iterable, {
    stream: false,
    values: iterableValues,
    itemSteps: iterableValues.map(() => [streamGate]),
    endSteps: [streamGate],
  });
  action('async iterable', () => streamGate.resolve());
  for (let i = actions.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [actions[i], actions[j]] = [actions[j], actions[i]];
  }
  actions.splice(
    actions.findIndex(item => item.label === 'stream first') + 1 + pick(2),
    0,
    endStream,
  );
  const equalA = {equal: true};
  const equalB = {equal: true};
  // Share a longer prefix through both collection constructors. Keys and
  // values resolve separately, and earlier entries must survive every retry.
  const shared = Array.from({length: 8 + pick(25)}, (_, index) => ({
    index,
    value: nodes[pick(nodes.length)],
  }));
  const collections = {
    shared,
    set: new Set(shared),
    map: new Map(
      shared.map((key, index) => [key, shared[(index + 1) % shared.length]]),
    ),
  };
  // Arrays may contain undefined; object properties with undefined are omitted
  // by Flight, so they are outside this value-preservation oracle.
  const model = {
    graph: nodes,
    atoms,
    cycle,
    distinct: [equalA, equalB, new Set([equalA, equalB])],
    collections,
    optional: [undefined],
    stream,
    iterable,
  };
  return {
    ...plan,
    model,
    packetSizes: [1 + pick(8), 1 + pick(97), 1 + pick(2048)],
    late: pick(2) === 1,
  };
}

// Generate the topology, not a choice of regression templates. Every ordinary
// edge can point forward, backward, or to itself. Modules with independent
// loaders occupy arbitrary fields, keys and values; bound functions capture
// arbitrary regions. Promise outcomes can expose a region for the first time
// or adopt another Promise. They do not make ordinary contents wait.
//
// This graph excludes streams and Error values so those deferred repairs do
// not disable random exploration of construction. Known regressions remain
// useful, but are not the grammar from which these cases are generated.
async function generateConstruction(
  seed,
  schedule,
  ReactServer,
  React,
  WebpackMock,
  rejectModule,
) {
  const plan = createPlan(seed);
  const {pick} = plan;
  const kinds = ['array', 'object', 'set', 'map'];
  const nodes = [];
  const containers = 4 + pick(9);
  for (let i = 0; i < containers; i++) {
    nodes.push({kind: kinds[i < 4 ? i : pick(kinds.length)], items: []});
  }
  const futures = 2 + pick(4);
  for (let i = 0; i < futures; i++) {
    nodes.push({kind: 'promise', value: 0});
  }
  const modules = 2 + pick(3);
  for (let i = 0; i < modules; i++) {
    nodes.push({kind: 'module', value: 'export-' + i, async: pick(3) === 0});
  }
  const bindings = pick(3);
  for (let i = 0; i < bindings; i++) {
    nodes.push({kind: 'bound', items: [pick(containers), pick(containers)]});
  }
  const elements = pick(3);
  for (let i = 0; i < elements; i++) {
    const element = nodes.length;
    nodes.push({kind: 'element', value: pick(containers)});
    nodes.push({kind: 'props', value: element});
  }
  for (let i = 0; i < 3; i++) {
    nodes.push({kind: 'scalar', value: ['value', 42, null][i]});
  }
  for (let i = 0; i < containers; i++) {
    const size = 1 + pick(5);
    for (let j = 0; j < size; j++) {
      const item = pick(nodes.length);
      nodes[i].items.push(
        nodes[i].kind === 'map' ? [pick(nodes.length), item] : item,
      );
    }
  }
  for (let i = 0; i < futures; i++) {
    // Adoption itself is acyclic. Outcome contents may have arbitrary cycles,
    // including a handle for this very Promise.
    nodes[containers + i].value =
      i + 1 < futures && pick(3) === 0 ? containers + i + 1 : pick(containers);
  }
  const graph = process.env.FLIGHT_FUZZ_GRAPH
    ? JSON.parse(process.env.FLIGHT_FUZZ_GRAPH)
    : {nodes, roots: [pick(containers), pick(containers)]};
  if (rejectModule && !process.env.FLIGHT_FUZZ_GRAPH) {
    // Hold the topology fixed and fail one independently chosen service. One
    // failure gives an unambiguous expected error regardless of service order.
    const choose = random(seed ^ 0x85ebca6b);
    graph.nodes[containers + futures + choose(modules)].reject = true;
  }
  const values = [];
  const promises = [];
  let failedModule = null;
  const {read} = WebpackMock.serverExports({read: (...args) => args});
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    switch (node.kind) {
      case 'array':
        values[i] = [];
        break;
      case 'object':
        values[i] = {};
        break;
      case 'set':
        values[i] = new Set();
        break;
      case 'map':
        values[i] = new Map();
        break;
      case 'scalar':
        values[i] = node.value;
        break;
      case 'promise': {
        const future = plan.promise('graph-' + i);
        values[i] = future.promise;
        promises.push(future.promise);
        plan.action('resolve v' + i + ' to v' + node.value, () =>
          future.resolve(values[node.value]),
        );
        break;
      }
      case 'module': {
        const load = deferred();
        const namespace = node.async ? deferred() : null;
        const name = 'graph-module-' + i;
        let exports = WebpackMock.clientExports(
          namespace === null ? {value: node.value} : namespace.promise,
          name,
          name + '.js',
          load.promise,
        );
        if (namespace !== null) {
          exports = await exports;
          plan.action('evaluate v' + i, () =>
            namespace.resolve({value: node.value}),
          );
        }
        values[i] = exports.value;
        plan.modules.set(values[i], node.value);
        plan.requireFor(values[i], load, namespace);
        if (node.reject) {
          const error = new Error('graph module v' + i + ' failed');
          const step = plan.action('reject v' + i, () => load.reject(error));
          if (failedModule !== null) {
            throw new Error('A construction graph may fail only one module');
          }
          failedModule = {index: i, error, step};
        } else {
          plan.action('load v' + i, () => load.resolve());
        }
        break;
      }
      case 'bound':
      case 'element':
      case 'props':
        // All ordinary identities are allocated before binding their inputs.
        break;
      default:
        throw new Error('Unknown source graph node: ' + node.kind);
    }
  }
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (node.kind === 'bound') {
      const args = node.items.map(index => values[index]);
      values[i] = read.bind(null, ...args);
      plan.functions.set(values[i], {args: [], inputs: args, result: args});
    } else if (node.kind === 'element') {
      const load = deferred();
      const name = 'graph-component-' + i;
      const Inspect = props => {
        // Exercise props using a real component invocation. This observes
        // ordinary data through React without unwrapping private lazy state.
        plan.observeProps(values[i], props);
        return React.createElement('span', null, name);
      };
      const {Component} = WebpackMock.clientExports(
        {Component: Inspect},
        name,
        name + '.js',
        load.promise,
      );
      const element = ReactServer.createElement(Component, {
        value: values[node.value],
      });
      values[i] = element;
      plan.visuals.set(element, '<span>' + name + '</span>');
      plan.renderInputs.set(element, [element.props]);
      plan.requireRender(element, load);
      plan.action('load component v' + i, () => load.resolve());
    }
  }
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (node.kind === 'props') {
      values[i] = values[node.value].props;
    }
  }
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (node.kind === 'map') {
      node.items.forEach(([key, item]) =>
        values[i].set(values[key], values[item]),
      );
    } else if (kinds.includes(node.kind)) {
      node.items.forEach((item, index) => {
        if (node.kind === 'array') {
          values[i].push(values[item]);
        } else if (node.kind === 'set') {
          values[i].add(values[item]);
        } else {
          values[i]['field' + index] = values[item];
        }
      });
    }
  }
  if (failedModule !== null) {
    // Follow the actual source graph, after Map.set has replaced duplicate
    // keys. Discarded generation inputs are not observable dependencies.
    // Promise outcomes and element renders have their own observations; their
    // handles do not fail with their bodies. No reader state is consulted.
    const {index: failed, error, step} = failedModule;
    const readsFailure = (source, seen = new Set()) => {
      if (source === values[failed]) {
        return true;
      }
      if (
        source === null ||
        (typeof source !== 'object' && typeof source !== 'function') ||
        seen.has(source)
      ) {
        return false;
      }
      seen.add(source);
      if (
        plan.promises.has(source) ||
        plan.visuals.has(source) ||
        plan.modules.has(source)
      ) {
        return false;
      }
      let children;
      if (plan.functions.has(source)) {
        children = plan.functions.get(source).inputs;
      } else if (source instanceof Map) {
        children = Array.from(source.entries()).flat();
      } else if (source instanceof Set || Array.isArray(source)) {
        children = Array.from(source);
      } else {
        children = Object.values(source);
      }
      return children.some(child => readsFailure(child, seen));
    };
    if (graph.roots.some(index => readsFailure(values[index]))) {
      plan.rootError = error;
      plan.rootErrorSteps = [step];
    }
    for (let i = 0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i];
      if (node.kind === 'promise') {
        let outcome = node.value;
        while (graph.nodes[outcome].kind === 'promise') {
          outcome = graph.nodes[outcome].value;
        }
        if (readsFailure(values[outcome])) {
          plan.promises.get(values[i]).failure = {error, step};
        }
      } else if (node.kind === 'element' && readsFailure(values[i].props)) {
        plan.visuals.set(values[i], error);
        plan.renderFailures.set(values[i], {error, step});
      }
    }
  }

  // The service RNG is independent: trying another schedule leaves the graph
  // identical. An unrelated last Promise must never be needed to unblock it.
  const order = random((seed ^ Math.imul(schedule + 1, 0x9e3779b9)) >>> 0);
  for (let i = plan.actions.length - 1; i > 0; i--) {
    const j = order(i + 1);
    [plan.actions[i], plan.actions[j]] = [plan.actions[j], plan.actions[i]];
  }
  const independent = plan.promise('independent');
  plan.action('resolve unrelated last Promise', () =>
    independent.resolve('end'),
  );
  plan.model = {
    entry: values[graph.roots[0]],
    other: values[graph.roots[1]],
    outcomes: promises,
    independent: independent.promise,
  };
  plan.recipe.push('Graph: ' + JSON.stringify(graph));
  plan.packetSizes = [1 + order(8), 17 + order(100), 1024 + order(4096)];
  plan.yieldBetweenPackets = order(2) === 0;
  return plan;
}

// These starting graphs retain the study's difficult dependency shapes. They
// use the same observer and transport as random graphs. Varying the context is
// essential: naming a value in the root can hide a bug in a later channel item.
const boundaries = [
  'bound-set',
  'bound-map',
  'bound-array',
  'bound-failure',
  'props-object',
  'props-set',
  'props-map',
  'props-failure',
  'module-failure',
  'outcomes',
  'stream-close',
  'stream-error',
  'stream-queued',
  'weak-binary',
  'weak-text',
  'iterator-return',
  'iterator-error',
  'deferred-leaf',
  'joined',
  'lazy',
  'lazy-failure',
  'shared-element',
  'bytes',
  'iterator-field',
  'blob-field',
  'writer-unnamed-array',
];
const demands = ['early', 'late', 'after-service', 'after-eof'];
const cases = seeds.map(seed => ['mixed', seed, 'random', 0]);
seeds.forEach(seed => {
  for (let schedule = 0; schedule < scheduleCount; schedule++) {
    for (
      let demand = 0;
      demand < (extendedSweep ? demands.length : 1);
      demand++
    ) {
      cases.push(['construction', seed, demands[demand], schedule]);
      cases.push(['construction-failure', seed, demands[demand], schedule]);
    }
  }
});
for (let f = 0; f < boundaries.length; f++) {
  for (let i = 0; i < (extendedSweep ? demands.length : 1); i++) {
    // The known writer overflow leaves its output open, so it has no normal
    // end-of-stream at which to exercise late demand.
    if (boundaries[f].startsWith('writer-') && demands[i] === 'after-eof')
      continue;
    cases.push([boundaries[f], (firstSeed + i) >>> 0, demands[i], 0]);
  }
}
// Grow the same successful starting graphs through independently selected
// contexts. Failure cases keep their explicit observation boundary: moving an
// error across a promise or a stream also changes what the consumer is owed.
const growing = boundaries.filter(
  family =>
    !family.endsWith('failure') &&
    !family.endsWith('error') &&
    !family.startsWith('writer-'),
);
seeds.forEach(seed => {
  const pick = random(seed);
  // Mutate the dependency graph itself, not just its enclosing context.
  cases.push(['joined', seed, demands[pick(demands.length)], 0]);
  cases.push([
    growing[pick(growing.length)],
    seed,
    demands[pick(demands.length)],
    1 + pick(3),
  ]);
});

// Added mechanisms use their own deterministic context streams. Changing this
// list never changes the accepted legacy descriptors or another family's cases.
const lifecycles = [
  'host-eof',
  'host-eof-failure',
  'canceled-stream',
  'bound-first',
  'error-value',
  'error-cycle',
];
lifecycles.forEach(family => {
  for (let i = 0; i < (extendedSweep ? demands.length : 1); i++) {
    cases.push([family, (firstSeed + i) >>> 0, demands[i], 0]);
  }
  seeds.forEach(seed => {
    const pick = random(seed);
    cases.push([family, seed, demands[pick(demands.length)], 1 + pick(3)]);
  });
});

async function generateBoundary(
  family,
  seed,
  demand,
  depth,
  ReactServer,
  React,
  WebpackMock,
) {
  const plan = createPlan(seed);
  const {pick, action, promise} = plan;
  const loader = deferred();
  const label = 'ready-' + seed;
  async function clientValue(value, gate = loader, asynchronous = false) {
    const id = 'fuzz-load-' + plan.modules.size;
    const namespace = asynchronous ? deferred() : null;
    let namespaceStep = null;
    let exports = WebpackMock.clientExports(
      namespace === null ? {value} : namespace.promise,
      id,
      id + '.js',
      gate.promise,
    );
    if (namespace !== null) {
      // Awaiting a client-module proxy marks an async import without loading
      // its client export on the server. Chunk loading and module evaluation
      // can then finish in either order.
      exports = await exports;
      namespaceStep = action('resolve module export ' + id, () =>
        namespace.resolve({value}),
      );
    }
    const ref = exports.value;
    plan.modules.set(ref, value);
    plan.requireFor(ref, gate, namespace);
    // Returning the reference directly would ask Promise assimilation to
    // access its .then export, which is not a supported server operation.
    return {value: ref, namespace, namespaceStep};
  }
  function rejectSource(name) {
    const error = new Error(name);
    plan.expectedErrors.set(error, name);
    return error;
  }

  let model;
  if (family === 'error-cycle') {
    const member = (await clientValue(label)).value;
    const error =
      seed % 2 === 0
        ? new Error('cyclic cause')
        : new AggregateError([], 'cyclic entries');
    const region = [[], {}, new Set(), new Map()][seed % 4];
    const cell = {back: error, region, value: member};
    if (error instanceof AggregateError) error.errors.push(error, region, cell);
    else error.cause = cell;
    if (Array.isArray(region)) region.push(error, region);
    else if (region instanceof Set) {
      region.add(error);
      region.add(region);
    } else if (region instanceof Map) {
      region.set(error, region);
      region.set(region, error);
    } else {
      region.error = error;
      region.self = region;
    }
    const alias = promise('shared Error');
    const later = promise('independent Error sibling');
    model = {region, alias: alias.promise, later: later.promise};
    action('expose shared Error region', () => alias.resolve(region));
    action('load cyclic Error field', () => loader.resolve());
    action('resolve independent Error sibling', () => later.resolve({label}));
  } else if (family === 'error-value') {
    let cause = '$escaped cause';
    if (seed % 5 === 1) {
      cause = {label: '$escaped field'};
      cause.self = cause;
    } else if (seed % 5 === 2) {
      cause = ['$escaped item'];
      cause.push(cause);
    }
    if (seed % 5 === 4) {
      cause = {value: (await clientValue('$loaded cause')).value};
      cause.self = cause;
      action('load Error cause', () => loader.resolve());
    }
    if (seed % 5 === 3) {
      const cycle = {label};
      cycle.self = cycle;
      const member = (await clientValue('$loaded member')).value;
      model = new AggregateError([cycle, member], '$aggregate message', {
        cause,
      });
      action('load aggregate member', () => loader.resolve());
    } else model = new Error('$literal message', {cause});
  } else if (family === 'bound-first') {
    // The bound function is the first public exposure of this otherwise
    // hidden region. Its identity can close the cycle, but calling it must
    // not reveal unfinished ordinary arguments.
    const region = [[], {}, new Set(), new Map()][seed % 4];
    const {value} = await clientValue(label);
    const {read} = WebpackMock.serverExports({read: data => data});
    const bound = read.bind(null, region);
    plan.functions.set(bound, {args: [], inputs: [region], result: region});
    if (Array.isArray(region)) region.push(bound, region, value);
    else if (region instanceof Set) {
      region.add(bound);
      region.add(region);
      region.add(value);
    } else if (region instanceof Map) {
      region.set(bound, value);
      region.set(region, region);
    } else {
      region.bound = bound;
      region.self = region;
      region.label = value;
    }
    const later = promise('independent bound sibling');
    let exposure = bound;
    if (seed % 3 === 1) {
      const outcome = promise('first bound exposure');
      outcome.resolve(bound);
      exposure = outcome.promise;
    } else if (seed % 3 === 2) {
      exposure = new ReadableStream({
        start(controller) {
          controller.enqueue(bound);
          controller.close();
        },
      });
      plan.sequences.set(exposure, {
        stream: true,
        values: [bound],
        itemSteps: [[]],
        endSteps: [],
      });
    }
    model = {exposure, later: later.promise};
    action('load hidden bound member', () => loader.resolve());
    action('resolve independent bound sibling', () => later.resolve({label}));
  } else if (family === 'canceled-stream') {
    const bytes = seed % 3 === 0;
    const blocked = seed % 3 === 2;
    let controller;
    let first;
    let child;
    if (blocked) {
      child = {value: (await clientValue(label)).value};
      first = new Set([child]);
      first.add(first);
    }
    const stream = new ReadableStream({
      type: bytes ? 'bytes' : undefined,
      start(value) {
        controller = value;
        if (blocked) value.enqueue(first);
      },
    });
    plan.sequences.set(stream, {
      stream: true,
      cancel: true,
      readBeforeCancel: blocked,
      values: blocked ? [first] : [],
    });
    const later = promise('after-cancel');
    const reused = blocked ? promise('reused canceled item') : null;
    const result = {label, binary: new Uint8Array([seed % 256, 10, 255])};
    const discarded = {label: 'discarded-' + seed};
    if (!bytes) result.discarded = discarded;
    model = {stream, later: later.promise};
    if (reused !== null) model.reused = reused.promise;
    action('enqueue after client cancellation', () =>
      controller.enqueue(bytes ? new Uint8Array([4, 5]) : [discarded]),
    );
    action('close original stream', () => controller.close());
    action('resolve independent result', () => later.resolve(result));
    if (reused !== null) {
      action('reuse canceled item in independent outcome', () =>
        reused.resolve({first, child}),
      );
    }
    plan.afterEof = new Set();
    if (blocked) {
      const load = action('load canceled item after EOF', () =>
        loader.resolve(),
      );
      plan.afterEof.add(load);
    }
  } else if (family === 'host-eof' || family === 'host-eof-failure') {
    // All source outcomes and Flight rows finish before any client service.
    // EOF must not cancel module evaluation or the population/content waits
    // of ordinary values already described by those rows.
    const fails = family === 'host-eof-failure';
    const failEvaluation = fails && seed % 2 === 0;
    const asynchronous = failEvaluation || seed % 3 === 0;
    const loaded = await clientValue(label, loader, asynchronous);
    const laterReady = deferred();
    const {value: later} = await clientValue('later-' + seed, laterReady);
    const actionReady = deferred();
    const {read} = WebpackMock.serverExports(
      {read: (region, cell, value) => ({region, cell, value})},
      actionReady.promise,
    );
    const region = [[], {}, new Set(), new Map()][seed % 4];
    const cell = {label: loaded.value, back: region};
    const bound = read.bind(null, region, cell, loaded.value);
    plan.functions.set(bound, {
      args: [],
      inputs: [region, cell, loaded.value],
      result: {region, cell, value: label},
    });
    plan.requireFor(bound, actionReady);
    if (Array.isArray(region)) region.push(region, cell, bound);
    else if (region instanceof Set) {
      region.add(region);
      region.add(cell);
      region.add(bound);
    } else if (region instanceof Map) {
      region.set(region, region);
      region.set(bound, cell);
    } else {
      region.self = region;
      region.cell = cell;
      region.bound = bound;
    }
    const first = promise('host-region');
    const alias = promise('host-alias');
    const sibling = promise('host-sibling');
    const ready = {label: 'independent-' + seed};
    first.resolve(region);
    alias.resolve([cell, new Set([region]), region]);
    sibling.resolve({ready, later});
    model = {
      ready,
      first: first.promise,
      alias: alias.promise,
      sibling: sibling.promise,
    };
    const load = action('load region chunk', () => loader.resolve());
    action('load bound action', () => actionReady.resolve());
    action('load independent sibling', () => laterReady.resolve());
    for (let i = plan.actions.length - 1; i > 0; i--) {
      const j = pick(i + 1);
      [plan.actions[i], plan.actions[j]] = [plan.actions[j], plan.actions[i]];
    }
    if (fails) {
      const error = new Error('host region failed');
      const step = failEvaluation ? loaded.namespaceStep : load;
      step.run = () =>
        failEvaluation ? loaded.namespace.reject(error) : loader.reject(error);
      const remaining = plan.actions.filter(
        item => item !== step && item !== load,
      );
      // An evaluation failure is observable after its chunk has loaded. The
      // action and sibling loaders remain withheld at that rejection deadline.
      plan.actions.splice(
        0,
        plan.actions.length,
        ...(failEvaluation ? [load, step] : [step]),
        ...remaining,
      );
      plan.promises.get(first.promise).failure = {error, step};
      plan.promises.get(alias.promise).failure = {error, step};
    }
    // Later context wrappers add source operations. Run those before EOF;
    // only these client-side services remain withheld across the boundary.
    plan.afterEof = new Set(plan.actions);
  } else if (family === 'joined') {
    // Several independently loaded regions form overlapping cycles. Each
    // region contains a function bound to another region, an element whose
    // props escape, and a promise returning a region already used elsewhere.
    const nodes = Array.from(
      {length: 3 + pick(4)},
      () => [[], {}, new Set(), new Map()][pick(4)],
    );
    const add = (node, key, value) => {
      if (Array.isArray(node)) node.push(value);
      else if (node instanceof Set) node.add(value);
      else if (node instanceof Map) node.set(key, value);
      else node[key] = value;
    };
    const first = node =>
      Array.isArray(node)
        ? node[0]
        : node instanceof Set
          ? node.values().next().value
          : node instanceof Map
            ? node.get('label')
            : node.label;
    const outcomes = nodes.map((_, i) => promise('region-' + i));
    const links = nodes.map(() => ({}));
    // A collection gives each channel value a writer-assigned name before
    // traversing its cycle. Bare ordinary channel cycles have the separate
    // writer-unnamed-array regression below.
    const items = nodes.map(node => new Set([node]));
    const Widget = function ({index, data}) {
      expect(first(data.node)).toBe(label + '-' + index);
      expect(first(data.peer.data.node)).toBe(
        label + '-' + ((index + 1) % nodes.length),
      );
      return React.createElement('b', null, index);
    };
    const {Widget: ClientWidget} = WebpackMock.clientExports({Widget});
    const elements = nodes.map((node, index) => {
      links[index].node = node;
      const element = ReactServer.createElement(ClientWidget, {
        index,
        data: links[index],
      });
      plan.visuals.set(element, '<b>' + index + '</b>');
      return element;
    });
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const next = nodes[(i + 1) % nodes.length];
      const dataReady = deferred();
      const actionReady = deferred();
      const {value} = await clientValue(
        label + '-' + i,
        dataReady,
        pick(2) === 0,
      );
      const {read} = WebpackMock.serverExports(
        {read: (left, right, name) => ({left, right, name})},
        actionReady.promise,
      );
      const bound = read.bind(null, node, next, value);
      plan.functions.set(bound, {
        args: [],
        inputs: [node, next, value],
        result: {left: node, right: next, name: label + '-' + i},
      });
      plan.requireFor(bound, actionReady);
      links[i].peer = elements[(i + 1) % nodes.length].props;
      add(node, 'label', value);
      add(node, 'next', next);
      add(node, 'branch', nodes[pick(nodes.length)]);
      add(node, 'action', bound);
      add(node, 'element', elements[i]);
      add(node, 'props', elements[(i + 1) % nodes.length].props);
      add(node, 'future', outcomes[(i + 1) % nodes.length].promise);
      if (node instanceof Map) node.set(bound, next);
      action('load region ' + i, () => dataReady.resolve());
      action('load action ' + i, () => actionReady.resolve());
      action('resolve region ' + i, () => outcomes[i].resolve(items[i]));
      plan.recipe.push(
        'region ' + i + ': ' + Object.prototype.toString.call(node),
      );
    }
    const service = deferred();
    let controller;
    const stream = new ReadableStream({start: value => (controller = value)});
    const iterable = {
      async *[Symbol.asyncIterator]() {
        await service.promise;
        for (let i = items.length - 1; i >= 0; i--) yield items[i];
        return items[0];
      },
    };
    const expose = action('expose channel regions', () => {
      items.forEach(item => controller.enqueue(item));
      controller.close();
      service.resolve();
    });
    plan.sequences.set(stream, {
      stream: true,
      values: items,
      concurrent: true,
      itemSteps: items.map(() => [expose]),
      endSteps: [expose],
    });
    plan.sequences.set(iterable, {
      stream: false,
      values: items.slice().reverse(),
      returnValue: items[0],
      consumers: 2,
      concurrent: pick(2) === 0,
      itemSteps: items.map(() => [service]),
      endSteps: [service],
    });
    for (let i = plan.actions.length - 1; i > 0; i--) {
      const j = pick(i + 1);
      [plan.actions[i], plan.actions[j]] = [plan.actions[j], plan.actions[i]];
    }
    const futures = outcomes.map(value => value.promise);
    // Alternate first exposure through ordinary data and asynchronous values.
    const exposeRegions = pick(2) === 1;
    model = exposeRegions
      ? {regions: nodes, futures, stream, iterable}
      : {futures, stream, iterable};
  } else if (family === 'shared-element') {
    const gate = deferred();
    const Component = async function () {
      await gate.promise;
      return ReactServer.createElement('b', null, label);
    };
    const element = ReactServer.createElement(Component, {key: 'shared'});
    plan.visuals.set(element, '<b>' + label + '</b>');
    plan.requireRender(element, gate);
    const unrelated = promise('unrelated');
    model = {
      elements: [
        [element, element],
        [[element], element],
        [new Set([element]), element],
      ][seed % 3],
      unrelated: unrelated.promise,
    };
    action('resolve shared component', () => gate.resolve());
    action('resolve unrelated promise', () => unrelated.resolve(label));
  } else if (family === 'lazy' || family === 'lazy-failure') {
    const gate = deferred();
    const data = {label, self: null};
    data.self = data;
    const Lazy = ReactServer.lazy(() => gate.promise);
    const element = ReactServer.createElement(Lazy);
    plan.requireRender(element, gate);
    const fails = family.endsWith('failure');
    const error = fails ? rejectSource('lazy failed') : null;
    plan.visuals.set(
      element,
      fails ? {digest: 'lazy failed'} : '<b>' + label + '</b>',
    );
    model = {data, element};
    const {Widget} = WebpackMock.clientExports({
      Widget({value}) {
        expect(value.label).toBe(label);
        expect(value.self.label).toBe(label);
        return React.createElement('b', null, value.label);
      },
    });
    plan.renderInputs.set(element, [data]);
    action('resolve source lazy', () =>
      fails
        ? gate.reject(error)
        : gate.resolve({
            default: () => ReactServer.createElement(Widget, {value: data}),
          }),
    );
  } else if (family === 'bytes') {
    const chunks = Array.from({length: seed % 7 === 0 ? 0 : 3 + pick(5)}, () =>
      Uint8Array.from({length: 1 + pick(17)}, () => pick(256)),
    );
    const bytes = chunks.flatMap(chunk => Array.from(chunk));
    let controller;
    const stream = new ReadableStream({
      type: 'bytes',
      start: value => (controller = value),
    });
    const byteSteps = chunks.map((chunk, i) =>
      action('enqueue bytes ' + i, () => controller.enqueue(chunk)),
    );
    const close = action('close byte stream', () => controller.close());
    let length = 0;
    plan.sequences.set(stream, {
      stream: true,
      bytes,
      byob: seed % 2 === 0,
      byteSteps,
      byteLengths: chunks.map(chunk => (length += chunk.length)),
      endSteps: [close],
    });
    const binary = new Uint8Array([0, 10, 58, 255]);
    model = {binary, stream, again: binary};
    plan.sharedBuffer = seed % 3 !== 0;
  } else if (family === 'iterator-field' || family === 'blob-field') {
    const {value} = await clientValue(label);
    const data = {label: value};
    let leaf;
    if (family === 'iterator-field') {
      // This is a real synchronous, single-use iterator. Its planned values
      // are recorded before the writer consumes it; the observer consumes
      // each received iterator only once, even through several aliases.
      leaf = [data][Symbol.iterator]();
      plan.sequences.set(leaf, {sync: true, values: [data]});
    } else {
      const bytes = new Uint8Array([seed % 256, 10, 255]);
      leaf = new Blob([bytes], {type: 'application/octet-stream'});
      const ready = deferred();
      plan.requireFor(leaf, ready);
      leaf.stream = () =>
        new ReadableStream({
          async start(controller) {
            await ready.promise;
            controller.enqueue(bytes);
            controller.close();
          },
        });
      action('release Blob contents', () => ready.resolve());
    }
    data.leaf = leaf;
    const {Widget} = WebpackMock.clientExports({
      Widget({payload}) {
        expect(payload.label).toBe(label);
        if (family === 'iterator-field')
          expect(typeof payload.leaf.next).toBe('function');
        else expect(payload.leaf.size).toBe(3);
        return React.createElement('b', null, label);
      },
    });
    const element = ReactServer.createElement(Widget, {payload: data});
    data.element = element;
    plan.visuals.set(element, '<b>' + label + '</b>');
    model = [element, data, leaf];
    const load = {label: 'load escaped field', run: () => loader.resolve()};
    if (pick(2)) plan.actions.unshift(load);
    else plan.actions.push(load);
  } else if (family.startsWith('bound-')) {
    const kind = family.slice(6);
    const container =
      kind === 'set' ? new Set() : kind === 'map' ? new Map() : [];
    const argumentLoader = deferred();
    const {value: argument} = await clientValue(label, argumentLoader);
    const {read} = WebpackMock.serverExports(
      {read: (value, suffix) => ({value, suffix})},
      loader.promise,
    );
    const bound = read.bind(null, container, argument);
    plan.functions.set(bound, {
      args: [],
      inputs: [container, argument],
      result: {value: container, suffix: label},
    });
    plan.requireFor(bound, loader);
    if (kind === 'set') {
      container.add(bound);
      container.add(container);
    } else if (kind === 'map') {
      container.set(bound, label);
      container.set(container, container);
    } else {
      container.push(bound, container);
    }
    model = container;
    const error = new Error('expected action load failure');
    if (kind === 'failure') plan.rootError = error;
    const loadAction = {
      label: 'load bound action',
      run: () => (kind === 'failure' ? loader.reject(error) : loader.resolve()),
    };
    if (kind === 'failure') plan.rootErrorSteps = [loadAction];
    const loadArgument = {
      label: 'load bound argument',
      run: () => argumentLoader.resolve(),
    };
    // The module and the argument slots are independent dependencies.
    plan.actions.push(
      ...(pick(2) ? [loadAction, loadArgument] : [loadArgument, loadAction]),
    );
  } else if (family.startsWith('props-')) {
    const kind = family.slice(6);
    const {value: ref} = await clientValue(label);
    const payload =
      kind === 'set'
        ? new Set([ref])
        : kind === 'map'
          ? new Map([[ref, label]])
          : ref;
    const Widget = function ({name, data}) {
      // This is an application read during rendering, before later mutation
      // could repair a borrowed props object or a copied collection entry.
      const value = data.alias.payload;
      const expected = name === 'A' ? payload : 'A';
      if (expected instanceof Set) expect(Array.from(value)).toEqual([label]);
      else if (expected instanceof Map)
        expect(Array.from(value)).toEqual([[label, label]]);
      else expect(value).toBe(name === 'A' ? label : 'A');
      return React.createElement('b', null, name);
    };
    const {Widget: ClientWidget} = WebpackMock.clientExports({Widget});
    const dataA = {};
    const dataB = {};
    const a = ReactServer.createElement(ClientWidget, {
      name: 'A',
      data: dataA,
      payload: 'A',
    });
    const b = ReactServer.createElement(ClientWidget, {
      name: 'B',
      data: dataB,
      payload,
    });
    dataA.peer = b;
    dataA.alias = b.props;
    dataB.peer = a;
    dataB.alias = a.props;
    const error = new Error('expected prop load failure');
    plan.visuals.set(a, kind === 'failure' ? error : '<b>A</b>');
    plan.visuals.set(b, kind === 'failure' ? error : '<b>B</b>');
    // Also expose the props as ordinary data on half the seeds. The element
    // can stay lazy; the ordinary alias must never publish unfinished fields.
    model = seed % 2 ? a : {element: a, props: b.props};
    if (kind === 'failure' && seed % 2 === 0) plan.rootError = error;
    const failureStep = action('load borrowed prop', () =>
      kind === 'failure' ? loader.reject(error) : loader.resolve(),
    );
    if (plan.rootError) plan.rootErrorSteps = [failureStep];
  } else if (family === 'module-failure') {
    const later = deferred();
    const error = new Error('expected module failure');
    const set = new Set();
    set.add(set);
    set.add((await clientValue('bad')).value);
    set.add((await clientValue('later', later)).value);
    model = set;
    plan.rootError = error;
    plan.rootErrorSteps = [
      action('reject one module', () => loader.reject(error)),
    ];
    action('resolve sibling after rejection', () => later.resolve());
  } else if (family === 'outcomes') {
    const p = promise('set');
    const q = promise('array');
    const nested = promise('nested');
    const rejected = promise('rejected');
    const set = new Set();
    const map = new Map();
    const array = [set, map, nested.promise, rejected.promise];
    set.add(set);
    set.add(array);
    set.add(map);
    map.set(set, array);
    map.set(array, set);
    map.set(map, map);
    model = [p.promise, q.promise];
    const resolutions = [
      {label: 'resolve set', run: () => p.resolve(set)},
      {label: 'resolve array', run: () => q.resolve(array)},
    ];
    if (pick(2)) resolutions.reverse();
    plan.actions.push(...resolutions);
    action('resolve newly exposed promise', () => nested.resolve({back: set}));
    const error = rejectSource('rejected');
    action('reject future inside cycle', () => rejected.reject(error));
  } else if (family === 'weak-binary' || family === 'weak-text') {
    // A weak pending thenable can resolve after the root has exposed its
    // handle, while a separate ordinary Promise keeps the writer open. Its
    // direct result is emitted as a binary or text row, not a model row.
    const hold = promise('hold');
    const listeners = [];
    const weak = {
      status: 'pending_weak',
      value: undefined,
      then(onFulfill) {
        if (weak.status === 'fulfilled') onFulfill(weak.value);
        else listeners.push(onFulfill);
      },
    };
    const outcome = {state: 'pending', digest: 'weak'};
    plan.promises.set(weak, outcome);
    model = {weak, hold: hold.promise};
    action('resolve weak value', () => {
      const value =
        family === 'weak-binary'
          ? new Uint8Array([seed % 256, 10, 58, 255])
          : '🙂'.repeat(1200);
      weak.status = 'fulfilled';
      weak.value = value;
      outcome.state = 'fulfilled';
      outcome.value = value;
      listeners.forEach(listener => listener(value));
    });
    action('release writer hold', () => hold.resolve('done'));
  } else if (family === 'stream-queued') {
    // Both items are written before their module loads. After the first load,
    // the second model has begun initialization but remains blocked. Closing
    // the source stream must wait for that second item, even though the first
    // blocked item has settled.
    const later = deferred();
    const first = new Set([(await clientValue('first', loader)).value]);
    const second = new Set([(await clientValue('second', later)).value]);
    let controller;
    model = new ReadableStream({
      start(value) {
        controller = value;
        value.enqueue(first);
        value.enqueue(second);
      },
    });
    action('load first queued item', () => loader.resolve());
    const close = action('close queued stream', () => controller.close());
    plan.sequences.set(model, {
      stream: true,
      values: [first, second],
      itemSteps: [[], []],
      endSteps: [close],
    });
    action('load second queued item', () => later.resolve());
  } else if (family.startsWith('stream-') || family.startsWith('iterator-')) {
    const set = new Set();
    set.add(set);
    set.add((await clientValue(label)).value);
    const items = [set, label];
    const fails = family.endsWith('error');
    const error = fails ? rejectSource('sequence failed') : null;
    if (family.startsWith('stream-')) {
      let controller;
      model = new ReadableStream({
        start(value) {
          controller = value;
          items.forEach(item => value.enqueue(item));
        },
      });
      const terminal = action('stream terminal before loader', () => {
        if (fails) controller.error(error);
        else controller.close();
      });
      plan.sequences.set(model, {
        stream: true,
        // Web Streams discard unread queued items on error. Early consumers
        // post concurrent reads before the error; late ones see the error.
        values:
          fails && (demand === 'after-service' || demand === 'after-eof')
            ? []
            : items,
        concurrent: true,
        error: fails ? {digest: 'sequence failed'} : null,
        itemSteps: items.map(() => []),
        endSteps: [terminal],
      });
    } else {
      const service = deferred();
      model = {
        async *[Symbol.asyncIterator]() {
          for (let i = 0; i < items.length; i++) yield items[i];
          await service.promise;
          if (fails) throw error;
          return set;
        },
      };
      action('iterator terminal before loader', () => service.resolve());
      plan.sequences.set(model, {
        stream: false,
        values: items,
        consumers: 2,
        returnValue: set,
        error: fails ? {digest: 'sequence failed'} : null,
        itemSteps: items.map(() => []),
        endSteps: [service],
      });
    }
    action('load first item', () => loader.resolve());
  } else if (family === 'writer-unnamed-array') {
    const array = [];
    array.push(array);
    model = new ReadableStream({
      start(controller) {
        controller.enqueue(array);
        controller.close();
      },
    });
    plan.sequences.set(model, {
      stream: true,
      values: [array],
      itemSteps: [[]],
      endSteps: [],
    });
  } else {
    const p = promise('leaf');
    const buffer = new Uint8Array([seed % 256, 42, 255]);
    const value = [buffer, '🙂'.repeat(1200), new Blob([buffer])][pick(3)];
    model = {future: p.promise};
    action('resolve previously unnamed leaf', () => p.resolve(value));
  }
  plan.recipe.push(family);
  for (let i = 0; i < depth; i++) {
    const value = model;
    switch (pick(5)) {
      case 0:
        model = [value, value];
        plan.recipe.push('wrap in shared array');
        break;
      case 1:
        model = {value, sibling: label};
        plan.recipe.push('wrap in object');
        break;
      case 2:
        model = new Set([value, label]);
        plan.recipe.push('wrap in Set');
        break;
      case 3:
        model = new Map([
          [value, label],
          [label, value],
        ]);
        plan.recipe.push('wrap in Map key and value');
        break;
      default: {
        const p = promise('wrapper-' + i);
        model = {value: p.promise};
        plan.actions.unshift({
          label: 'expose wrapped graph',
          run: () => p.resolve(value),
        });
        plan.recipe.push('wrap in promise outcome');
      }
    }
  }
  plan.model = model;
  if (depth > 0 && seed % 3 === 0) {
    const root = promise('root');
    plan.writerModel = root.promise;
    plan.adoptRoot = true;
    plan.actions.unshift({
      label: 'resolve root promise',
      run: () => root.resolve(model),
    });
    plan.recipe.push('observe root through native Promise adoption');
  }
  plan.packetSizes = [1 + pick(9), 17 + pick(100), 1024];
  plan.yieldBetweenPackets = seed % 2 === 0;
  return plan;
}

describe.each(['node', 'edge'])('Flight observable fuzz (%s)', host => {
  let Server;
  let Client;
  let ReactServer;
  let React;
  let WebpackMock;
  let ReactDOMServer;
  let input;

  beforeEach(() => {
    input = null;
    jest.resetModules();
    jest.useRealTimers();
    jest.mock('react', () => require('react/react.react-server'));
    jest.doMock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.' + host),
    );
    WebpackMock = require('./utils/WebpackMock');
    Server = require('react-server-dom-webpack/server.' + host);
    ReactServer = require('react');
    jest.resetModules();
    __unmockReact();
    React = require('react');
    Client = require('react-server-dom-webpack/client.' + host);
    ReactDOMServer = require('react-dom/server.edge');
  });

  afterEach(async () => {
    if (input) await input.dispose();
  });

  async function runCase([family, seed, originalDemand, depth]) {
    let demand = originalDemand;
    const generated =
      family === 'mixed'
        ? generateMixed(seed, ReactServer, React, WebpackMock)
        : family.startsWith('construction')
          ? await generateConstruction(
              seed,
              depth,
              ReactServer,
              React,
              WebpackMock,
              family === 'construction-failure',
            )
          : await generateBoundary(
              family,
              seed,
              demand,
              depth,
              ReactServer,
              React,
              WebpackMock,
            );
    if (demand === 'random') demand = generated.late ? 'late' : 'early';
    const reported = [];
    const ready = sourceReadiness(generated);
    const watched = observer({
      ...generated,
      publicationReady: family.startsWith('construction') ? ready : undefined,
      async render(element) {
        const output = await ReactDOMServer.renderToReadableStream(element, {
          onError() {},
        });
        return new Response(output).text();
      },
    });
    generated.observeProps = (source, received) => {
      if (!ready({kind: 'render', source})) {
        throw new Error('Premature publication: component props');
      }
      watched.observe(source.props, received, 'component props');
    };
    const progress = async stage => {
      let overdue = [];
      await input.until(
        () => {
          overdue = watched.pendingReady(ready);
          return overdue.length === 0;
        },
        () =>
          stage +
          ': ready ' +
          overdue.map(job => job.path + ' (' + job.kind + ')').join(', ') +
          '; still withheld: ' +
          generated.actions
            .filter(step => !step.released)
            .map(step => step.label)
            .join(', '),
      );
      if (family.startsWith('construction')) {
        watched.recheck();
      }
    };
    try {
      input = roundTrip({
        host,
        Server,
        Client,
        model:
          generated.writerModel === undefined
            ? generated.model
            : generated.writerModel,
        webpackMap: WebpackMock.webpackMap,
        serverModuleMap: WebpackMock.webpackServerMap,
        packetSizes: generated.packetSizes,
        yieldBetweenPackets: generated.yieldBetweenPackets,
        sharedBuffer: generated.sharedBuffer,
        adoptRoot: generated.adoptRoot,
        onError(error) {
          if (!generated.expectedErrors.has(error)) throw error;
          reported.push(error);
          return generated.expectedErrors.get(error);
        },
      });
      if (demand === 'early') watched.attach(input.root, generated.model, true);
      await input.flush();
      if (demand === 'late') watched.attach(input.root, generated.model, true);
      await progress('initial demand');
      if (generated.afterEof) {
        for (let i = 0; i < generated.actions.length; i++) {
          const step = generated.actions[i];
          if (generated.afterEof.has(step)) continue;
          step.run();
          step.released = true;
          await progress('before EOF: ' + step.label);
        }
        await input.finish();
        input.close();
        await input.flush();
        await progress('writer EOF before client services');
      }
      // Drain every currently ready application observation before servicing
      // anything else. A later, unrelated module/promise/close cannot rescue
      // a missed wakeup. The source plan, not client state, decides readiness.
      for (let i = 0; i < generated.actions.length; i++) {
        const step = generated.actions[i];
        if (step.released) continue;
        step.run();
        step.released = true;
        await progress('after ' + step.label);
      }
      await input.finish();
      if (demand === 'after-eof') {
        input.close();
        await tick();
      }
      if (demand === 'after-service' || demand === 'after-eof') {
        watched.attach(input.root, generated.model, true);
      }
      await progress('late demand');
      await input.until(
        watched.settled,
        'all source outcomes, renders and stream items',
      );
      expect(new Set(reported)).toEqual(
        new Set(generated.expectedErrors.keys()),
      );
      expect(reported).toHaveLength(generated.expectedErrors.size);
      // Revisit the root, every fulfilled outcome and every stream item using
      // the same origin map, detecting mutation after their first publication.
      watched.recheck();
      watched.attach(input.root, generated.model);
      await input.until(watched.settled);
    } catch (error) {
      throw new Error(
        'Flight fuzz runCase(' +
          JSON.stringify([family, seed, originalDemand, depth]) +
          ') host=' +
          host +
          ' resolved demand=' +
          demand +
          '\n' +
          generated.recipe.join('\n') +
          '\nSchedule: ' +
          generated.actions.map(item => item.label).join(', ') +
          '\n' +
          error.stack,
      );
    }
  }

  const caseName = ([family, seed, demand, depth]) =>
    family +
    ', seed=' +
    seed +
    ', demand=' +
    demand +
    (family.startsWith('construction') ? ', schedule=' : ', wrappers=') +
    depth;

  /* eslint-disable jest/no-disabled-tests */
  describe('fixed writer and reader regressions', () => {
    it.each(['early', 'late'])(
      'keeps a selected field usable after a sibling fails (%s demand)',
      async demand => {
        const load = deferred();
        const failure = new Error('sibling failed to load');
        const {value: unavailable} = WebpackMock.clientExports(
          {value: 'unused'},
          'failed-sibling',
          'failed-sibling.js',
          load.promise,
        );
        const shared = [];
        const first = deferred();
        const second = deferred();
        input = roundTrip({
          host,
          Server,
          Client,
          model: [
            Promise.resolve({value: unavailable}),
            first.promise,
            second.promise,
          ],
          webpackMap: WebpackMock.webpackMap,
        });
        let result;
        const observe = () => {
          result = Promise.resolve(input.root).then(handles =>
            Promise.allSettled(handles.slice(1)),
          );
        };
        if (demand === 'early') {
          observe();
        }
        if (demand === 'late') {
          // Observe the module's rejection before serializing the Set. DEV can
          // initialize models eagerly, so late demand alone does not put that
          // failure before the carrier's first parse on both hosts.
          let moduleFailure;
          input.root.then(handles => {
            handles[0].then(
              () => {},
              error => {
                moduleFailure = error;
              },
            );
          });
          load.reject(failure);
          await input.until(
            () => moduleFailure !== undefined,
            'failed module before Set serialization',
          );
          expect(moduleFailure).toBe(failure);
        }
        first.resolve(new Set([unavailable, shared]));
        second.resolve(shared);
        await input.finish();
        if (demand === 'early') {
          load.reject(failure);
        }
        await input.flush();
        if (demand === 'late') {
          observe();
        }
        let outcomes;
        result.then(value => {
          outcomes = value;
        });
        await input.until(
          () => outcomes !== undefined,
          'both Promise outcomes',
        );
        expect(outcomes).toEqual([
          {status: 'rejected', reason: failure},
          {status: 'fulfilled', value: []},
        ]);
      },
    );

    it('finishes borrowed props before freezing them', async () => {
      const members = new Set();
      const {Component} = WebpackMock.clientExports({
        Component({value}) {
          expect(value instanceof Set).toBe(true);
          expect(value.size).toBe(1);
          return React.createElement('span', null, 'ready');
        },
      });
      const element = ReactServer.createElement(Component, {value: members});
      members.add(element);
      input = roundTrip({
        host,
        Server,
        Client,
        model: new Set([element.props]),
        webpackMap: WebpackMock.webpackMap,
      });
      let props;
      let failure;
      // The callback assertions are synchronous. `until` below waits for this
      // notification without adopting the root through a native Promise.
      // eslint-disable-next-line jest/valid-expect-in-promise
      input.root.then(
        value => {
          expect(value instanceof Set).toBe(true);
          expect(value.size).toBe(1);
          props = Array.from(value)[0];
          expect(props.value instanceof Set).toBe(true);
          expect(props.value.size).toBe(1);
        },
        error => {
          failure = error;
        },
      );
      await input.until(() => {
        if (failure) {
          throw failure;
        }
        return props !== undefined;
      });
      const output = await ReactDOMServer.renderToReadableStream(
        Array.from(props.value)[0],
      );
      expect(await new Response(output).text()).toBe('<span>ready</span>');
      expect(props.value.size).toBe(1);
    });

    it.skip('keeps published data and queued items ordered through writer abort', async () => {
      const load = deferred();
      const {value: queuedValue} = WebpackMock.clientExports(
        {value: 'loaded item'},
        'abort-item',
        'abort-item.js',
        load.promise,
      );
      const set = new Set([queuedValue]);
      set.add(set);
      const stream = new ReadableStream({start: c => c.enqueue(set)});
      const pending = deferred();
      const readyValue = {label: 'published'};
      const abortError = new Error('selected writer abort');
      const plan = createPlan(23);
      plan.modules.set(queuedValue, 'loaded item');
      plan.requireFor(queuedValue, load);
      const watched = observer(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: {stream, pending: pending.promise, ready: readyValue},
        webpackMap: WebpackMock.webpackMap,
        onError(error) {
          expect(error).toBe(abortError);
          return 'selected-abort';
        },
      });
      let root;
      input.root.then(value => (root = value));
      await input.until(() => root !== undefined, 'published data');
      const receivedReady = root.ready;
      expect(receivedReady).toEqual(readyValue);
      const reader = root.stream.getReader();
      const errors = [];
      let receivedItem;
      let terminal;
      let outcome;
      const firstRead = reader.read().then(item => {
        try {
          expect(item.done).toBe(false);
          watched.check(set, item.value, 'aborted stream item');
          receivedItem = item.value;
        } catch (failure) {
          errors.push(failure);
        }
      });
      reader.read().then(
        () => errors.push(new Error('Expected stream abort')),
        error => (terminal = error),
      );
      root.pending.then(
        () => errors.push(new Error('Expected pending outcome abort')),
        error => (outcome = error),
      );
      await input.flush();
      input.abort(abortError);
      await input.finish();
      input.close();
      await input.until(() => outcome !== undefined, 'aborted outcome');
      expect(outcome.digest).toBe('selected-abort');
      expect(terminal).toBeUndefined();
      expect(receivedReady).toEqual(readyValue);
      load.resolve();
      await input.until(
        () => receivedItem !== undefined,
        'queued item after its module loads',
      );
      await firstRead;
      await input.until(
        () => terminal !== undefined,
        'stream abort after item',
      );
      expect(terminal.digest).toBe('selected-abort');
      pending.resolve({label: 'too late'});
      await input.flush();
      expect(errors).toEqual([]);
      watched.check(set, receivedItem, 'retained aborted stream item');
      expect(receivedReady).toEqual(readyValue);
    });
    async function checkPromiseDemandOrder(reverse) {
      const plan = createPlan(17);
      const first = plan.promise('first');
      const second = plan.promise('second');
      const rejected = plan.promise('rejected');
      const independent = plan.promise('independent');
      const leftReady = deferred();
      const rightReady = deferred();
      const leftValue = WebpackMock.clientExports(
        {value: 'left'},
        'demand-left',
        'demand-left.js',
        leftReady.promise,
      ).value;
      const rightValue = WebpackMock.clientExports(
        {value: 'right'},
        'demand-right',
        'demand-right.js',
        rightReady.promise,
      ).value;
      plan.modules.set(leftValue, 'left');
      plan.modules.set(rightValue, 'right');
      plan.requireFor(leftValue, leftReady);
      plan.requireFor(rightValue, rightReady);
      const left = [leftValue];
      const right = new Set([left, rightValue]);
      left.push(right, left);
      right.add(right);
      const readyValue = {label: 'independent'};
      const sourceError = new Error('expected demand rejection');
      const watched = observer(plan);
      const ready = sourceReadiness(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: {
          first: first.promise,
          second: second.promise,
          rejected: rejected.promise,
          independent: independent.promise,
        },
        webpackMap: WebpackMock.webpackMap,
        onError(error) {
          expect(error).toBe(sourceError);
          return 'demand-rejection';
        },
      });
      let handles;
      input.root.then(value => (handles = value));
      first.resolve(left);
      second.resolve(right);
      rejected.reject(sourceError);
      independent.resolve(readyValue);
      // The original writer finishes before we demand any outcome. Client
      // modules remain held across EOF; subscription order varies separately.
      await input.finish();
      input.close();
      await input.until(() => handles !== undefined, 'Promise handles');
      const errors = [];
      let rejectedSeen = false;
      const subscribeRejection = () => {
        handles.rejected.then(
          () => errors.push(new Error('Expected rejection')),
          error => {
            try {
              expect(rejectedSeen).toBe(false);
              expect(error.digest).toBe('demand-rejection');
              rejectedSeen = true;
              watched.attach(handles.independent, readyValue, true);
            } catch (failure) {
              errors.push(failure);
            }
          },
        );
      };
      if (reverse) {
        watched.attach(handles.second, right, true);
        watched.attach(handles.first, left, true);
        subscribeRejection();
      } else {
        watched.attach(handles.first, left, true);
        subscribeRejection();
        watched.attach(handles.second, right, true);
      }
      const progress = () => {
        expect(errors).toEqual([]);
        return rejectedSeen && watched.pendingReady(ready).length === 0;
      };
      await input.until(
        progress,
        'independent outcome from rejection callback',
      );
      (reverse ? rightReady : leftReady).resolve();
      await input.until(progress, 'one shared-region service');
      (reverse ? leftReady : rightReady).resolve();
      await input.until(watched.settled, 'all demanded shared regions');
      watched.recheck();
    }
    it.skip('observes queued Promise outcomes in source order', () =>
      checkPromiseDemandOrder(false));
    it.skip('observes queued Promise outcomes in reverse order', () =>
      checkPromiseDemandOrder(true));
    it('keeps thrown Error metadata literal while decoding its model fields', async () => {
      const first = deferred();
      const second = deferred();
      const source = [
        new Error('$literal message', {cause: '$literal cause'}),
        new AggregateError(['$literal member', 42], '$aggregate message', {
          cause: '$aggregate cause',
        }),
      ];
      source[0].name = '$literal name';
      input = roundTrip({
        host,
        Server,
        Client,
        model: [first.promise, second.promise],
        onError(error) {
          expect(source).toContain(error);
          return 'error-model-fields';
        },
      });
      let handles;
      input.root.then(value => (handles = value));
      await input.until(() => handles !== undefined, 'Error Promise handles');
      const failures = [];
      let delivered = 0;
      handles.forEach((promise, i) => {
        promise.then(
          () => failures.push(new Error('Expected Error rejection')),
          error => {
            try {
              expect(error.digest).toBe('error-model-fields');
              if (__DEV__) {
                expect(error.name).toBe(source[i].name);
                expect(error.message).toBe(source[i].message);
                expect(error.cause).toBe(source[i].cause);
                if (i === 1) {
                  expect(error instanceof AggregateError).toBe(true);
                  expect(error.errors).toEqual(source[i].errors);
                }
              } else {
                expect('cause' in error).toBe(false);
                expect('errors' in error).toBe(false);
              }
            } catch (failure) {
              failures.push(failure);
            }
            delivered++;
          },
        );
      });
      first.reject(source[0]);
      second.reject(source[1]);
      await input.finish();
      await input.until(() => delivered === 2, 'Error rejections');
      expect(failures).toEqual([]);
    });
    async function checkDelayedThrownErrorFields(aggregate) {
      const load = deferred();
      const {value} = WebpackMock.clientExports(
        {value: 'loaded diagnostic'},
        'error-field',
        'error-field.js',
        load.promise,
      );
      const sourceError = aggregate
        ? new AggregateError([value, '$literal entry'], '$aggregate failure')
        : new Error('$failure', {cause: {value}});
      const failed = deferred();
      const ready = deferred();
      const later = deferred();
      input = roundTrip({
        host,
        Server,
        Client,
        model: {
          failed: failed.promise,
          ready: ready.promise,
          later: later.promise,
        },
        webpackMap: WebpackMock.webpackMap,
        onError(error) {
          expect(error).toBe(sourceError);
          return 'delayed-error-fields';
        },
      });
      const errors = [];
      let receivedError;
      let receivedReady;
      let receivedLater;
      input.root.then(root => {
        root.failed.then(
          () => errors.push(new Error('Expected rejection')),
          error => {
            try {
              expect(receivedError).toBeUndefined();
              expect(error.digest).toBe('delayed-error-fields');
              if (__DEV__) expect(error.message).toBe(sourceError.message);
              receivedError = error;
            } catch (failure) {
              errors.push(failure);
            }
          },
        );
        root.ready.then(result => {
          try {
            expect(result).toEqual({label: 'independent'});
            receivedReady = result;
          } catch (failure) {
            errors.push(failure);
          }
        });
        root.later.then(result => (receivedLater = result));
      });
      failed.reject(sourceError);
      ready.resolve({label: 'independent'});
      // Rejection metadata is diagnostic: report it promptly, even while a
      // client export in cause/errors and an unrelated source outcome wait.
      await input.until(
        () => receivedError !== undefined && receivedReady !== undefined,
        'rejection metadata and independent result before its fields load',
      );
      expect(errors).toEqual([]);
      expect(receivedLater).toBeUndefined();
      load.resolve();
      if (__DEV__) {
        await input.until(
          () =>
            aggregate
              ? receivedError.errors?.[0] === 'loaded diagnostic'
              : receivedError.cause?.value === 'loaded diagnostic',
          'late diagnostic fields',
        );
        if (aggregate)
          expect(receivedError.errors).toEqual([
            'loaded diagnostic',
            '$literal entry',
          ]);
        else expect(receivedError.cause).toEqual({value: 'loaded diagnostic'});
      } else {
        expect('cause' in receivedError).toBe(false);
        expect('errors' in receivedError).toBe(false);
      }
      later.resolve({label: 'later'});
      await input.finish();
      await input.until(() => receivedLater !== undefined, 'later result');
      expect(receivedLater).toEqual({label: 'later'});
      expect(errors).toEqual([]);
    }
    if (__DEV__) {
      it.skip('installs thrown Error causes that load after rejection (DEV)', () =>
        checkDelayedThrownErrorFields(false));
    } else {
      it('installs thrown Error causes that load after rejection (PROD)', () =>
        checkDelayedThrownErrorFields(false));
    }
    if (__DEV__) {
      it.skip('installs thrown AggregateError entries that load after rejection (DEV)', () =>
        checkDelayedThrownErrorFields(true));
    } else {
      it('installs thrown AggregateError entries that load after rejection (PROD)', () =>
        checkDelayedThrownErrorFields(true));
    }
    async function checkRejectedDiagnosticIsolation(separateResponses) {
      const loadA = deferred();
      const loadB = deferred();
      const exportA = WebpackMock.clientExports(
        {value: 'diagnostic A'},
        'diagnostic-A',
        'diagnostic-A.js',
        loadA.promise,
      ).value;
      const exportB = WebpackMock.clientExports(
        {value: 'diagnostic B'},
        'diagnostic-B',
        'diagnostic-B.js',
        loadB.promise,
      ).value;
      const sourceA = new Error('source A', {cause: {value: exportA}});
      const sourceB = new AggregateError([exportB], 'source B');
      const first = deferred();
      const second = deferred();
      const later = deferred();
      const errors = [];
      const received = [];
      let lateCount = 0;
      const connect = (wire, offset) => {
        wire.root.then(root => {
          root.failures.forEach((promise, i) => {
            promise.then(
              () => errors.push(new Error('Expected rejection')),
              error => {
                try {
                  expect(received[offset + i]).toBeUndefined();
                  expect(error.digest).toBe('source-' + (offset + i));
                  received[offset + i] = error;
                } catch (failure) {
                  errors.push(failure);
                }
              },
            );
          });
          root.later.then(value => {
            try {
              expect(value).toEqual({label: 'unrelated'});
              lateCount++;
            } catch (failure) {
              errors.push(failure);
            }
          });
        });
      };
      const options = {
        host,
        Server,
        Client,
        webpackMap: WebpackMock.webpackMap,
        onError(error) {
          expect([sourceA, sourceB]).toContain(error);
          return error === sourceA ? 'source-0' : 'source-1';
        },
      };
      input = roundTrip({
        ...options,
        model: {
          failures: separateResponses
            ? [first.promise]
            : [first.promise, second.promise],
          later: later.promise,
        },
      });
      connect(input, 0);
      let other;
      try {
        first.reject(sourceA);
        await input.until(() => received[0] !== undefined, 'first rejection');
        if (separateResponses) {
          other = roundTrip({
            ...options,
            model: {failures: [second.promise], later: later.promise},
          });
          connect(other, 1);
        }
        const secondInput = other || input;
        second.reject(sourceB);
        await secondInput.until(
          () => received[1] !== undefined,
          'second rejection before either diagnostic loads',
        );
        expect(errors).toEqual([]);
        expect(lateCount).toBe(0);
        loadA.reject(new Error('diagnostic A module failed'));
        await input.flush();
        if (other) await other.flush();
        loadB.resolve();
        if (__DEV__) {
          await secondInput.until(
            () => received[1].errors?.[0] === 'diagnostic B',
            'independent diagnostic after the first one fails',
          );
          expect(received[1].errors).toEqual(['diagnostic B']);
        } else expect('errors' in received[1]).toBe(false);
        expect(lateCount).toBe(0);
        later.resolve({label: 'unrelated'});
        await input.finish();
        if (other) await other.finish();
        await secondInput.until(
          () => lateCount === (separateResponses ? 2 : 1),
          'unrelated outcomes',
        );
        expect(errors).toEqual([]);
      } finally {
        if (other) await other.dispose();
      }
    }
    if (__DEV__) {
      it.skip('keeps rejected Error diagnostics independent in one response (DEV)', () =>
        checkRejectedDiagnosticIsolation(false));
    } else {
      it('keeps rejected Error diagnostics independent in one response (PROD)', () =>
        checkRejectedDiagnosticIsolation(false));
    }
    if (__DEV__) {
      it.skip('keeps rejected Error diagnostics independent across responses (DEV)', () =>
        checkRejectedDiagnosticIsolation(true));
    } else {
      it('keeps rejected Error diagnostics independent across responses (PROD)', () =>
        checkRejectedDiagnosticIsolation(true));
    }
    async function checkCyclicInputDelivery() {
      const plan = createPlan(3);
      const first = plan.promise('set');
      const second = plan.promise('array');
      const nested = plan.promise('nested');
      const rejected = plan.promise('rejected');
      const set = new Set();
      const map = new Map();
      const array = [set, map, nested.promise, rejected.promise];
      set.add(set);
      set.add(array);
      set.add(map);
      map.set(set, array);
      map.set(array, set);
      map.set(map, map);
      const error = new Error('expected outcome rejection');

      // Deliver the first outcome before any timer task, and the second after
      // timers have run. Keep the writer bytes and their order unchanged.
      jest.useFakeTimers({
        doNotFake: [
          'setImmediate',
          'nextTick',
          'performance',
          'queueMicrotask',
        ],
      });
      try {
        input = roundTrip({
          host,
          Server,
          Client,
          model: [first.promise, second.promise],
          onError(value) {
            expect(value).toBe(error);
            return 'rejected';
          },
        });
        await input.flush();
        first.resolve(set);
        await input.flush();
        jest.runOnlyPendingTimers();
      } finally {
        jest.useRealTimers();
      }
      second.resolve(array);
      await input.flush();
      nested.resolve({back: set});
      await input.flush();
      rejected.reject(error);
      await input.finish();

      let handles;
      input.root.then(value => {
        handles = value;
      });
      await input.until(() => handles !== undefined, 'root promise handles');
      const watched = observer(plan);
      // This ready result must arrive without demanding the other outcome.
      // The same observer checks callback contents and all retained results.
      watched.attach(handles[1], array, true);
      await input.until(
        watched.settled,
        'array outcome before demanding the Set',
      );
      watched.attach(handles[0], set, true);
      await input.until(watched.settled, 'both cyclic outcomes');
      watched.recheck();
    }

    if (__DEV__) {
      if (host === 'edge') {
        it(
          'completes cyclic collection inputs across cached and delayed delivery (Edge DEV)',
          checkCyclicInputDelivery,
        );
      } else {
        it(
          'completes cyclic collection inputs across cached and delayed delivery (Node DEV)',
          checkCyclicInputDelivery,
        );
      }
    } else {
      it(
        'completes cyclic collection inputs across cached and delayed delivery (PROD)',
        checkCyclicInputDelivery,
      );
    }

    async function checkBorrowedProps(shape, failureKind) {
      const direct = shape === 'set-direct' || shape === 'map-direct';
      const payloadReady = deferred();
      const widgetReady = deferred();
      const siblingReady = deferred();
      const {value: payload} = WebpackMock.clientExports(
        {value: 'ready'},
        'props-payload',
        'props-payload.js',
        payloadReady.promise,
      );
      const {value: sibling} = WebpackMock.clientExports(
        {value: 'sibling'},
        'props-sibling',
        'props-sibling.js',
        siblingReady.promise,
      );
      function readPayload(props) {
        if (shape === 'object') return props.payload.value;
        if (shape === 'array') return props.payload[0];
        if (shape === 'set' || shape === 'set-direct')
          return Array.from(props.payload)[0];
        if (shape === 'set-object' || shape === 'staged-member')
          return Array.from(props.payload)[0].value;
        if (shape === 'map' || shape === 'map-direct')
          return props.payload.get('value');
        return props.payload;
      }
      function readResult(value) {
        return readPayload(direct ? {payload: value} : value);
      }
      function Widget({data}) {
        return React.createElement('b', null, readPayload(data.alias));
      }
      const {Widget: ClientWidget} = WebpackMock.clientExports(
        {Widget},
        'props-widget',
        'props-widget.js',
        widgetReady.promise,
      );
      const data = {};
      const member = {value: payload};
      const expose = deferred();
      let content = payload;
      switch (shape) {
        case 'object':
          content = {value: payload};
          break;
        case 'array':
          content = [payload];
          break;
        case 'set':
        case 'set-direct':
          content = new Set([payload]);
          break;
        case 'map':
        case 'map-direct':
          content = new Map([['value', payload]]);
          break;
        case 'set-object':
          content = new Set([{value: payload}]);
          break;
        case 'staged-member':
          content = new Set([member]);
          break;
      }
      const selected = {payload: content};
      const props =
        shape === 'subtree' ? {data, selected, sibling} : {...selected, data};
      const element = ReactServer.createElement(ClientWidget, props);
      if (shape === 'staged-member') {
        member.element = element;
        member.back = data;
      }
      data.alias = shape === 'subtree' ? element.props.selected : element.props;
      const model = {
        element,
        props: direct ? element.props.payload : data.alias,
      };
      input = roundTrip({
        host,
        Server,
        Client,
        model:
          shape === 'staged-member'
            ? [Promise.resolve(member), expose.promise]
            : model,
        webpackMap: WebpackMock.webpackMap,
      });
      let received;
      let rejected;
      let payloadFinished = false;
      let widgetFinished = false;
      const observations = [];
      function observe(value) {
        received = value;
        // Capture the first observation, before another service can fill
        // the same object and make a premature callback look correct.
        observations.push({
          payloadFinished,
          widgetFinished,
          value: readResult(value.props),
        });
      }
      function reject(error) {
        rejected = error;
      }
      input.root.then(value => {
        if (shape === 'staged-member') value[1].then(observe, reject);
        else observe(value);
      }, reject);
      try {
        await input.flush();
        if (shape === 'staged-member') {
          // Outline the member first. A later Set can copy its installed
          // identity while the member's ordinary contents still wait.
          expose.resolve(model);
          await input.flush();
        }
        expect(observations).toEqual([]);
        expect(rejected).toBeUndefined();
        const widgetError = new Error('expected Widget type failure');
        if (failureKind === 'widget-first') {
          widgetFinished = true;
          widgetReady.reject(widgetError);
          await input.flush();
          expect(observations).toEqual([]);
          expect(rejected).toBeUndefined();
        }
        payloadFinished = true;
        if (failureKind === 'payload') {
          payloadReady.reject(new Error('expected props payload failure'));
        } else {
          payloadReady.resolve();
        }
        await input.finish();
        await input.until(
          () => received !== undefined || rejected !== undefined,
        );
        if (failureKind === 'payload') {
          expect(observations).toEqual([]);
          expect(rejected.message).toBe('expected props payload failure');
          return;
        }
        expect(rejected).toBeUndefined();
        expect(observations).toEqual([
          {payloadFinished: true, widgetFinished, value: 'ready'},
        ]);
        const retainedProps = received.props;
        // For a selected subtree, the surrounding ordinary sibling is still
        // withheld too. Neither it nor the component module owns this result.
        if (failureKind === 'widget') {
          widgetReady.reject(widgetError);
        } else if (failureKind !== 'widget-first') {
          widgetReady.resolve();
        }
        widgetFinished = true;
        siblingReady.resolve();
        const output = ReactDOMServer.renderToReadableStream(received.element, {
          onError() {},
        }).then(stream => new Response(stream).text());
        if (failureKind === 'widget' || failureKind === 'widget-first') {
          await expect(output).rejects.toThrow('expected Widget type failure');
        } else {
          await expect(output).resolves.toBe('<b>ready</b>');
        }
        await input.flush();
        expect(received.props).toBe(retainedProps);
        expect(readResult(retainedProps)).toBe('ready');
        expect(observations).toHaveLength(1);
      } finally {
        payloadReady.resolve();
        widgetReady.resolve();
        siblingReady.resolve();
      }
    }
    it('waits for borrowed props before publishing an ordinary alias', () =>
      checkBorrowedProps('scalar'));
    it('waits for borrowed props nested object contents', () =>
      checkBorrowedProps('object'));
    it('waits for borrowed props nested array contents', () =>
      checkBorrowedProps('array'));
    it('waits for borrowed props Set contents', () =>
      checkBorrowedProps('set'));
    it('waits for borrowed props Map contents', () =>
      checkBorrowedProps('map'));
    it('waits for ordinary contents inside borrowed props Set members', () =>
      checkBorrowedProps('set-object'));
    it('keeps staged Set member cycles progressing without publishing placeholders', () =>
      checkBorrowedProps('staged-member'));
    it('waits for a Set selected directly from borrowed props', () =>
      checkBorrowedProps('set-direct'));
    it('waits for a Map selected directly from borrowed props', () =>
      checkBorrowedProps('map-direct'));
    it('publishes a borrowed props subtree without its pending sibling', () =>
      checkBorrowedProps('subtree'));
    it('rejects an ordinary borrowed props alias when its payload fails', () =>
      checkBorrowedProps('scalar', 'payload'));
    it('preserves borrowed props after the component module fails', () =>
      checkBorrowedProps('scalar', 'widget'));
    it('finishes borrowed props after an earlier component module failure', () =>
      checkBorrowedProps('scalar', 'widget-first'));
    it('preserves an element self-reference as a suspended handle', async () => {
      const payloadReady = deferred();
      const {value: payload} = WebpackMock.clientExports(
        {value: 'ready'},
        'self-payload',
        'self-payload.js',
        payloadReady.promise,
      );
      const {Widget} = WebpackMock.clientExports({
        Widget(props) {
          return React.createElement('b', null, props.payload);
        },
      });
      const data = {};
      const element = ReactServer.createElement(Widget, {data, payload});
      data.self = element;
      input = roundTrip({
        host,
        Server,
        Client,
        model: {element, data},
        webpackMap: WebpackMock.webpackMap,
      });
      let received;
      let rendered;
      input.root.then(value => {
        received = value;
      });
      try {
        await input.until(() => received !== undefined, 'ordinary data handle');
        const output = ReactDOMServer.renderToReadableStream(received.data.self)
          .then(stream => new Response(stream).text())
          .then(html => {
            rendered = html;
          });
        await input.flush();
        expect(rendered).toBeUndefined();
        payloadReady.resolve();
        await input.finish();
        await output;
        expect(rendered).toBe('<b>ready</b>');
      } finally {
        payloadReady.resolve();
      }
    });
    async function checkQueuedStreamTail(readyValue) {
      const firstReady = deferred();
      const secondReady = deferred();
      const {value: first} = WebpackMock.clientExports(
        {value: 'first'},
        'stream-first',
        'stream-first.js',
        firstReady.promise,
      );
      const {value: second} = WebpackMock.clientExports(
        {value: 'second'},
        'stream-second',
        'stream-second.js',
        secondReady.promise,
      );
      let controller;
      const source = new ReadableStream({
        start(value) {
          controller = value;
        },
      });
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        webpackMap: WebpackMock.webpackMap,
      });
      let reader;
      const received = [];
      const values = [['first'], ['second'], readyValue];
      let failure;
      input.root.then(stream => {
        reader = stream.getReader();
        (async () => {
          for (;;) {
            const item = await reader.read();
            expect(item).toEqual({
              done: received.length === values.length,
              value: values[received.length],
            });
            received.push(item);
            if (item.done) return;
          }
        })().catch(error => {
          failure = error;
        });
      });
      await input.until(() => reader !== undefined, 'stream handle');
      controller.enqueue([first]);
      controller.enqueue([second]);
      await input.flush();
      expect(received).toEqual([]);
      firstReady.resolve();
      await input.until(
        () => failure !== undefined || received.length !== 0,
        'first stream item',
      );
      expect(failure).toBeUndefined();
      expect(received).toEqual([{done: false, value: ['first']}]);
      controller.enqueue(readyValue);
      controller.close();
      await input.finish();
      input.close();
      await input.flush();
      // Finishing the predecessor must not release the still-blocked tail.
      expect(failure).toBeUndefined();
      expect(received).toEqual([{done: false, value: ['first']}]);
      secondReady.resolve();
      await input.until(
        () => failure !== undefined || received.some(item => item.done),
        'remaining stream items and EOF',
      );
      expect(failure).toBeUndefined();
      expect(received).toEqual([
        {done: false, value: ['first']},
        {done: false, value: ['second']},
        {done: false, value: readyValue},
        {done: true, value: undefined},
      ]);
    }
    it.skip('keeps ready stream models behind a queued blocked item', () =>
      checkQueuedStreamTail('third'));
    it.skip('keeps ready stream bytes behind a queued blocked item', () =>
      checkQueuedStreamTail(new Uint8Array([4, 5])));
    it.skip('ignores a stream item canceled by module code during initialization', async () => {
      let cancel;
      const {value} = WebpackMock.clientExports({
        get value() {
          cancel();
          return 'item';
        },
      });
      let controller;
      const source = new ReadableStream({start: c => (controller = c)});
      const later = deferred();
      input = roundTrip({
        host,
        Server,
        Client,
        model: {stream: source, later: later.promise},
        webpackMap: WebpackMock.webpackMap,
      });
      let reader;
      let received;
      input.root.then(root => {
        reader = root.stream.getReader();
        cancel = () => reader.cancel('module canceled');
        root.later.then(result => {
          expect(result).toEqual({label: 'independent'});
          received = result;
        });
      });
      await input.until(
        () => reader !== undefined,
        'cancellable stream handle',
      );
      controller.enqueue([value]);
      controller.close();
      later.resolve({label: 'independent'});
      await input.finish();
      await input.until(() => received !== undefined, 'independent result');
      expect(await reader.read()).toEqual({done: true, value: undefined});
    });
    async function checkSeparatePromiseSet() {
      const plan = createPlan(4);
      const first = plan.promise('set');
      const second = plan.promise('array');
      const set = new Set();
      const array = [set];
      set.add(set);
      set.add(array);
      const source = [first.promise, second.promise];
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        packetSizes: [8, 100, 1024],
        yieldBetweenPackets: true,
      });
      await input.flush();
      first.resolve(set);
      await input.flush();
      second.resolve(array);
      await input.finish();
      input.close();
      await tick();
      const watched = observer(plan);
      watched.attach(input.root, source, true);
      await input.until(watched.settled);
      watched.recheck();
    }
    async function checkSeparatePromiseMap() {
      const plan = createPlan(4);
      const first = plan.promise('map');
      const second = plan.promise('array');
      const map = new Map();
      const array = [map];
      map.set('self', map);
      map.set('array', array);
      const source = [first.promise, second.promise];
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        packetSizes: [8, 100, 1024],
        yieldBetweenPackets: true,
      });
      await input.flush();
      first.resolve(map);
      await input.flush();
      second.resolve(array);
      await input.finish();
      input.close();
      await tick();
      const watched = observer(plan);
      watched.attach(input.root, source, true);
      await input.until(watched.settled);
      watched.recheck();
    }
    if (__DEV__) {
      it(
        'copies complete Set input exposed by separate Promises [DEV]',
        checkSeparatePromiseSet,
      );
    } else {
      it(
        'copies complete Set input exposed by separate Promises',
        checkSeparatePromiseSet,
      );
    }
    if (__DEV__ && host === 'edge') {
      it(
        'copies complete Map input exposed by separate Promises [DEV Edge]',
        checkSeparatePromiseMap,
      );
    } else {
      it(
        'copies complete Map input exposed by separate Promises',
        checkSeparatePromiseMap,
      );
    }
    it('preserves a Blob reused after a self-referencing array', async () => {
      const blob = new Blob(['payload'], {type: 'text/plain'});
      const array = [];
      array.push(blob, array);
      const source = [array, blob];
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'Blob alias after array cycle');
      watched.recheck();
    });
    it('resumes repeated Blob aliases after the selected field is installed', async () => {
      const ready = deferred();
      const bytes = new Uint8Array([1, 2, 3]);
      const blob = new Blob([bytes], {type: 'application/octet-stream'});
      blob.stream = () =>
        new ReadableStream({
          async start(controller) {
            await ready.promise;
            controller.enqueue(bytes);
            controller.close();
          },
        });
      const array = [];
      array.push(blob, array);
      const source = [array, blob, blob];
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.flush();
      expect(watched.pendingReady(() => true)).toContainEqual(
        expect.objectContaining({kind: 'root'}),
      );
      ready.resolve();
      await input.finish();
      await input.until(watched.settled, 'repeated Blob aliases');
      watched.recheck();
    });
    it('completes a pending export whose installed value is null', async () => {
      const ready = deferred();
      const {value} = WebpackMock.clientExports(
        {value: null},
        'pending-null-value',
        'pending-null-value.js',
        ready.promise,
      );
      const array = [];
      array.push(value, array, null);
      const source = [array, array, null];
      const plan = createPlan(1);
      plan.modules.set(value, null);
      const watched = observer(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        webpackMap: WebpackMock.webpackMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      ready.resolve();
      await input.finish();
      await input.until(watched.settled, 'installed null export');
      watched.recheck();
    });
    it('rejects aliases when their selected Blob producer fails', async () => {
      const ready = deferred();
      const error = new Error('selected Blob failed');
      const blob = new Blob(['payload']);
      blob.stream = () =>
        new ReadableStream({
          async start(controller) {
            await ready.promise;
            controller.error(error);
          },
        });
      const array = [];
      array.push(blob, array);
      const source = [array, blob, blob];
      const plan = createPlan(1);
      plan.rootError = {digest: 'selected-blob-failure'};
      const watched = observer(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        onError: () => 'selected-blob-failure',
      });
      watched.attach(input.root, source);
      await input.flush();
      ready.resolve();
      await input.finish();
      await input.until(watched.settled, 'selected Blob rejection');
    });
    // Compare contents at callback time; Flight may split an identity.
    it('preserves a root Set containing itself', async () => {
      const source = new Set();
      source.add(source);
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'root self Set');
      watched.recheck();
    });
    it('preserves a root Map containing itself', async () => {
      const source = new Map();
      source.set('self', source);
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'root self Map');
      watched.recheck();
    });
    it('preserves a nested Set containing itself', async () => {
      const nested = new Set();
      nested.add(nested);
      const source = [nested];
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'nested self Set');
      watched.recheck();
    });
    it('preserves a nested Map containing itself', async () => {
      const nested = new Map();
      nested.set('self', nested);
      const source = [nested];
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'nested self Map');
      watched.recheck();
    });
    // This cycle already works on the original reader.
    it('preserves an array containing a Set back-reference', async () => {
      const source = [];
      source.push(new Set([source]));
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'array Set cycle');
      watched.recheck();
    });
    it('binds a containing array with a real null argument', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: (container, other) => [container, other]},
        moduleReady.promise,
      );
      const source = [];
      const bound = read.bind(null, source, null);
      source.push(bound, source);
      const plan = createPlan(1);
      plan.functions.set(bound, {args: [], result: [source, null]});
      const watched = observer(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      moduleReady.resolve();
      await input.finish();
      await input.until(watched.settled, 'bound null argument');
      watched.recheck();
    });
    it('binds two references to its containing array', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: (left, right, other) => ({left, right, other})},
        moduleReady.promise,
      );
      const source = [];
      const bound = read.bind(null, source, source, null);
      source.push(bound, source);
      const plan = createPlan(1);
      plan.functions.set(bound, {
        args: [],
        result: {left: source, right: source, other: null},
      });
      const watched = observer(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      moduleReady.resolve();
      await input.finish();
      await input.until(watched.settled, 'repeated bound array arguments');
      watched.recheck();
    });
    it('binds an array reached through an ordinary object property', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: (container, other) => [container, other]},
        moduleReady.promise,
      );
      const nested = [];
      const source = {box: nested};
      const bound = read.bind(null, nested, null);
      nested.push(bound, nested);
      const plan = createPlan(1);
      plan.functions.set(bound, {args: [], result: [nested, null]});
      const watched = observer(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      moduleReady.resolve();
      await input.finish();
      await input.until(watched.settled, 'nested bound array');
      watched.recheck();
    });
    it('binds an array reached through an array slot twice', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: (left, right, other) => ({left, right, other})},
        moduleReady.promise,
      );
      const nested = [];
      const source = [nested];
      const bound = read.bind(null, nested, nested, null);
      nested.push(bound, nested);
      const plan = createPlan(1);
      plan.functions.set(bound, {
        args: [],
        result: {left: nested, right: nested, other: null},
      });
      const watched = observer(plan);
      moduleReady.resolve();
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'nested repeated bound array');
      watched.recheck();
    });
    it('binds an array reached through two ordinary containers', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: (left, right, other) => ({left, right, other})},
        moduleReady.promise,
      );
      const nested = [];
      const source = {outer: [nested]};
      const bound = read.bind(null, nested, nested, null);
      nested.push(bound, nested);
      const plan = createPlan(1);
      plan.functions.set(bound, {
        args: [],
        result: {left: nested, right: nested, other: null},
      });
      const watched = observer(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      moduleReady.resolve();
      await input.finish();
      await input.until(watched.settled, 'deep bound array');
      watched.recheck();
    });
    it('binds a root object to itself', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: (container, other) => [container, other]},
        moduleReady.promise,
      );
      const source = {};
      const bound = read.bind(null, source, null);
      source.action = bound;
      source.self = source;
      const plan = createPlan(1);
      plan.functions.set(bound, {args: [], result: [source, null]});
      const watched = observer(plan);
      moduleReady.resolve();
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'root bound object');
      watched.recheck();
    });
    it('binds an object reached through an ordinary property', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: (container, other) => [container, other]},
        moduleReady.promise,
      );
      const nested = {};
      const source = {box: nested};
      const bound = read.bind(null, nested, null);
      nested.action = bound;
      nested.self = nested;
      const plan = createPlan(1);
      plan.functions.set(bound, {args: [], result: [nested, null]});
      const watched = observer(plan);
      moduleReady.resolve();
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'nested bound object');
      watched.recheck();
    });
    it('publishes a bound action beside its containing Set', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: container => container},
        moduleReady.promise,
      );
      const container = new Set();
      const bound = read.bind(null, container);
      container.add(bound);
      container.add(container);
      const source = [bound, container];
      const plan = createPlan(1);
      plan.functions.set(bound, {
        args: [],
        inputs: [container],
        result: container,
      });
      const load = {released: false};
      plan.requireFor(bound, load);
      const watched = observer(plan);
      const ready = sourceReadiness(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      expect(watched.pendingReady(ready)).toEqual([]);
      moduleReady.resolve();
      load.released = true;
      await input.finish();
      await input.until(watched.settled, 'separately exposed bound Set action');
      watched.recheck();
    });
    it('publishes a promised bound action with its containing Set', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: container => container},
        moduleReady.promise,
      );
      const container = new Set();
      const bound = read.bind(null, container);
      container.add(bound);
      container.add(container);
      const plan = createPlan(1);
      const promised = plan.promise('bound action');
      const source = [promised.promise, container];
      plan.functions.set(bound, {
        args: [],
        inputs: [container],
        result: container,
      });
      const load = {released: false};
      plan.requireFor(bound, load);
      const watched = observer(plan);
      const ready = sourceReadiness(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      expect(watched.pendingReady(ready)).toEqual([]);
      promised.resolve(bound);
      await input.flush();
      expect(watched.pendingReady(ready)).toEqual([]);
      moduleReady.resolve();
      load.released = true;
      await input.finish();
      await input.until(watched.settled, 'promised bound Set action');
      watched.recheck();
    });
    it('waits to publish an action bound to a Set with an unresolved member', async () => {
      const moduleReady = deferred();
      const memberReady = deferred();
      const {value: member} = WebpackMock.clientExports(
        {value: 'member'},
        'bound-set-member',
        'bound-set-member.js',
        memberReady.promise,
      );
      const {read} = WebpackMock.serverExports(
        {read: container => container},
        moduleReady.promise,
      );
      const container = new Set();
      const bound = read.bind(null, container);
      container.add(bound);
      container.add(container);
      container.add(member);
      const plan = createPlan(1);
      const outcome = plan.promise('containing Set');
      const source = [bound, outcome.promise];
      plan.modules.set(member, 'member');
      plan.functions.set(bound, {
        args: [],
        inputs: [container],
        result: container,
      });
      const actionStep = {released: false};
      const memberStep = {released: false};
      plan.requireFor(bound, actionStep);
      plan.requireFor(member, memberStep);
      const watched = observer(plan);
      const ready = sourceReadiness(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        webpackMap: WebpackMock.webpackMap,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, source);
      await input.flush();
      moduleReady.resolve();
      actionStep.released = true;
      await input.flush();
      expect(watched.pendingReady(ready)).toEqual([]);
      memberReady.resolve();
      memberStep.released = true;
      outcome.resolve(container);
      await input.finish();
      await input.until(watched.settled, 'bound Set member');
      watched.recheck();
    });
    async function checkBoundSetServiceOrder(argumentFirst) {
      const moduleReady = deferred();
      const argumentReady = deferred();
      const {value: argument} = WebpackMock.clientExports(
        {value: 'argument'},
        'bound-set-argument',
        'bound-set-argument.js',
        argumentReady.promise,
      );
      const {read} = WebpackMock.serverExports(
        {read: (container, value) => [container, value]},
        moduleReady.promise,
      );
      const container = new Set();
      const bound = read.bind(null, container, argument);
      container.add(bound);
      container.add(container);
      const plan = createPlan(1);
      plan.modules.set(argument, 'argument');
      plan.functions.set(bound, {
        args: [],
        inputs: [container, argument],
        result: [container, 'argument'],
      });
      const moduleStep = {released: false};
      const argumentStep = {released: false};
      plan.requireFor(bound, moduleStep, argumentStep);
      const watched = observer(plan);
      const ready = sourceReadiness(plan);
      input = roundTrip({
        host,
        Server,
        Client,
        model: container,
        webpackMap: WebpackMock.webpackMap,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      watched.attach(input.root, container);
      await input.flush();
      expect(watched.pendingReady(() => true)).toContainEqual(
        expect.objectContaining({kind: 'root'}),
      );
      if (argumentFirst) {
        argumentReady.resolve();
        argumentStep.released = true;
      } else {
        moduleReady.resolve();
        moduleStep.released = true;
      }
      await input.flush();
      expect(watched.pendingReady(ready)).toEqual([]);
      expect(watched.pendingReady(() => true)).toContainEqual(
        expect.objectContaining({kind: 'root'}),
      );
      if (argumentFirst) {
        moduleReady.resolve();
        moduleStep.released = true;
      } else {
        argumentReady.resolve();
        argumentStep.released = true;
      }
      await input.finish();
      await input.until(watched.settled, 'bound Set service order');
      watched.recheck();
    }
    it('binds a Set after the module loads before its argument', () =>
      checkBoundSetServiceOrder(false));
    it('binds a Set after its argument loads before the module', () =>
      checkBoundSetServiceOrder(true));
    it('rejects a bound action when an argument module fails', async () => {
      const moduleReady = deferred();
      const argumentReady = deferred();
      const {value: argument} = WebpackMock.clientExports(
        {value: 'argument'},
        'bound-rejected-argument',
        'bound-rejected-argument.js',
        argumentReady.promise,
      );
      const {read} = WebpackMock.serverExports(
        {read: (container, other) => [container, other]},
        moduleReady.promise,
      );
      const source = [];
      source.push(read.bind(null, source, argument), source);
      input = roundTrip({
        host,
        Server,
        Client,
        model: source,
        webpackMap: WebpackMock.webpackMap,
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      let received;
      let rejected;
      input.root.then(
        value => (received = value),
        error => (rejected = error),
      );
      await input.flush();
      moduleReady.resolve();
      await input.flush();
      argumentReady.reject(new Error('argument module failed'));
      await input.finish();
      await input.until(() => rejected !== undefined, 'bound argument error');
      expect(received).toBeUndefined();
      expect(rejected.message).toContain('argument module failed');
    });
    it('binds a noncyclic action after its module loads', async () => {
      const moduleReady = deferred();
      const {read} = WebpackMock.serverExports(
        {read: value => value},
        moduleReady.promise,
      );
      input = roundTrip({
        host,
        Server,
        Client,
        model: [read.bind(null, 'ready')],
        serverModuleMap: WebpackMock.webpackServerMap,
      });
      let received;
      input.root.then(value => (received = value));
      await input.flush();
      moduleReady.resolve();
      await input.finish();
      await input.until(() => received !== undefined, 'noncyclic bound action');
      expect(await received[0]()).toBe('ready');
    });
    it('preserves a Set containing an array back-reference', async () => {
      const source = new Set();
      source.add([source]);
      input = roundTrip({host, Server, Client, model: source});
      const watched = observer(createPlan(1));
      watched.attach(input.root, source);
      await input.finish();
      await input.until(watched.settled, 'Set array cycle');
      watched.recheck();
    });
    it('preserves two queued Set items', () =>
      runCase(['stream-queued', 1, 'early', 0]));
    // Representative source-writer omissions. Wider sweeps recognize only
    // these reproduced source cases; unexpected failures still fail.
    it.skip('writer does not name a streamed self-referencing array', () =>
      runCase(['writer-unnamed-array', 1, 'early', 0]));
    if (__DEV__) {
      it.skip('DEV writer aliases a suspended element with an ordinary reference', () =>
        runCase(['shared-element', 1, 'early', 0]));
    } else {
      it('production writer preserves the suspended element boundary', () =>
        runCase(['shared-element', 1, 'early', 0]));
    }
    if (__DEV__ && host === 'node') {
      it.skip('Node DEV writer debug inspection consumes the iterator', () =>
        runCase(['iterator-field', 75, 'late', 2]));
    } else {
      it('preserves iterator contents outside Node DEV debug inspection', () =>
        runCase(['iterator-field', 75, 'late', 2]));
    }
    it.skip('bytes seed=3 demand=after-service wrappers=0 [reader-binary-ownership]', () =>
      runCase(['bytes', 3, 'after-service', 0]));
    it.skip('bytes seed=6 demand=after-eof wrappers=2 [reader-binary-ownership]', () =>
      runCase(['bytes', 6, 'after-eof', 2]));
    it.skip('bytes seed=2 demand=late wrappers=0 [reader-byob-eof]', () =>
      runCase(['bytes', 2, 'late', 0]));
    it('finishes overlapping ordinary regions before publication', () =>
      runCase(['joined', 1, 'early', 0]));
    it.skip('canceled stream ignores later writes without losing shared data', () =>
      runCase(['canceled-stream', 2, 'late', 0]));
    it.skip('canceled byte stream drains later writer output', () =>
      runCase(['canceled-stream', 3, 'after-service', 0]));
    if (__DEV__) {
      it.skip('installs an Error cause after its client export loads (DEV)', () =>
        runCase(['error-value', 4, 'after-eof', 0]));
    } else {
      it('installs an Error cause after its client export loads (PROD)', () =>
        runCase(['error-value', 4, 'after-eof', 0]));
    }
    if (__DEV__) {
      it.skip('installs AggregateError entries inside an ordinary container (DEV)', () =>
        runCase(['error-value', 8, 'after-eof', 1]));
    } else {
      it('installs AggregateError entries inside an ordinary container (PROD)', () =>
        runCase(['error-value', 8, 'after-eof', 1]));
    }
    if (__DEV__) {
      it.skip('waits for an Error cause inside a borrowed Set (DEV)', () =>
        runCase(['error-cycle', 2, 'late', 0]));
    } else {
      it.skip('waits for an Error cause inside a borrowed Set (PROD)', () =>
        runCase(['error-cycle', 2, 'late', 0]));
    }
    if (__DEV__) {
      it.skip('waits for aggregate entries inside a borrowed Map (DEV)', () =>
        runCase(['error-cycle', 7, 'early', 3]));
    } else {
      it.skip('waits for aggregate entries inside a borrowed Map (PROD)', () =>
        runCase(['error-cycle', 7, 'early', 3]));
    }
  });

  /* eslint-enable jest/no-disabled-tests */

  // Avoid duplicating the focused regressions in the generated sweep.
  const fixedCases = new Set([
    'bytes:3:after-service:0',
    'bytes:6:after-eof:2',
    'bytes:2:late:0',
    'joined:1:early:0',
    'canceled-stream:2:late:0',
    'canceled-stream:3:after-service:0',
    'error-value:4:after-eof:0',
    'error-value:8:after-eof:1',
    'error-cycle:2:late:0',
    'error-cycle:7:early:3',
    'stream-queued:1:early:0',
    'writer-unnamed-array:1:early:0',
    'shared-element:1:early:0',
    'iterator-field:75:late:2',
  ]);

  // These exact writer graphs fail before the reader receives usable output:
  // unnamed streamed arrays in both modes, and cached suspended elements in
  // DEV. Node DEV also consumes iterator-field75 during debug inspection.
  // This list is deliberately finite; an unknown generated failure must fail.
  const writerCases = new Set([
    'mixed:104:random:0',
    'mixed:106:random:0',
    'mixed:107:random:0',
    'mixed:108:random:0',
    'mixed:109:random:0',
    'mixed:110:random:0',
    'mixed:114:random:0',
    'mixed:115:random:0',
    'mixed:116:random:0',
    'mixed:119:random:0',
    'mixed:120:random:0',
    'mixed:122:random:0',
    'mixed:124:random:0',
    'mixed:125:random:0',
    'mixed:126:random:0',
    'mixed:13:random:0',
    'mixed:14:random:0',
    'mixed:15:random:0',
    'mixed:16:random:0',
    'mixed:19:random:0',
    'mixed:31:random:0',
    'mixed:33:random:0',
    'mixed:38:random:0',
    'mixed:39:random:0',
    'mixed:43:random:0',
    'mixed:47:random:0',
    'mixed:48:random:0',
    'mixed:56:random:0',
    'mixed:59:random:0',
    'mixed:5:random:0',
    'mixed:62:random:0',
    'mixed:66:random:0',
    'mixed:68:random:0',
    'mixed:6:random:0',
    'mixed:72:random:0',
    'mixed:73:random:0',
    'mixed:74:random:0',
    'mixed:79:random:0',
    'mixed:81:random:0',
    'mixed:84:random:0',
    'mixed:85:random:0',
    'mixed:94:random:0',
    'shared-element:11:late:1',
    'shared-element:1:early:0',
    'shared-element:2:late:0',
    // Both reuse an ordinary reference to a still-pending element task in DEV.
    // The writer must retain the suspended element's lazy boundary.
    'shared-element:21:early:0',
    'shared-element:22:late:0',
    'shared-element:31:late:1',
    'shared-element:36:early:1',
    'shared-element:3:early:1',
    'shared-element:88:early:1',
    'writer-unnamed-array:1:early:0',
    'writer-unnamed-array:2:late:0',
    'writer-unnamed-array:3:after-service:0',
  ]);

  /* eslint-disable jest/no-disabled-tests */
  // Stream delivery/ownership and native Error destinations are separate repairs.
  const deferredFamilies = new Set([
    'mixed',
    'bytes',
    'stream-close',
    'stream-error',
    'stream-queued',
    'canceled-stream',
    'error-value',
    'error-cycle',
    'writer-unnamed-array',
  ]);

  describe('generated construction cases', () => {
    cases.forEach(spec => {
      if (deferredFamilies.has(spec[0])) {
        return;
      }
      const key = spec.join(':');
      if (fixedCases.has(key)) return;
      const writerFailure =
        (spec[0] === 'writer-unnamed-array' && writerCases.has(key)) ||
        (__DEV__ && writerCases.has(key)) ||
        (__DEV__ && host === 'node' && key === 'iterator-field:75:late:2');
      if (writerFailure) {
        // eslint-disable-next-line jest/valid-title
        it.skip(caseName(spec), () => runCase(spec));
      } else {
        // Dynamic titles make a failing seed directly selectable in Jest.
        // eslint-disable-next-line jest/valid-title
        it(caseName(spec), () => runCase(spec));
      }
    });
  });

  describe.skip('deferred stream and Error cases', () => {
    cases.forEach(spec => {
      if (!deferredFamilies.has(spec[0])) {
        return;
      }
      const key = spec.join(':');
      if (fixedCases.has(key)) return;
      const writerFailure =
        (spec[0] === 'writer-unnamed-array' && writerCases.has(key)) ||
        (__DEV__ && writerCases.has(key)) ||
        (__DEV__ && host === 'node' && key === 'iterator-field:75:late:2');
      if (writerFailure) {
        // eslint-disable-next-line jest/valid-title
        it.skip(caseName(spec), () => runCase(spec));
      } else {
        // Dynamic titles make a failing seed directly selectable in Jest.
        // eslint-disable-next-line jest/valid-title
        it(caseName(spec), () => runCase(spec));
      }
    });
  });
  /* eslint-enable jest/no-disabled-tests */
});

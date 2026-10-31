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

// Renders generated value graphs with the real writer, reads them with the
// public client on both hosts, and releases the external events the client is
// waiting on (packets, module loads, Promise resolutions, stream items) one at
// a time in random orders. After each event it checks that every value whose
// inputs have all arrived has been delivered, that nothing was delivered before
// its inputs arrived, that delivered values equal the server's values, and that
// they still do once everything has settled. The expectations come only from
// the source graph and the record of released events, never from rows or
// client chunk state.
//
// Cases are seeded from FUZZ_TEST_SEED, which the hourly fuzz workflow sets at
// random; without it the seed is 'default'. The default run is a small sample,
// FLIGHT_FUZZ_CASES=128 runs the full sweep.
//
// A failure prints the command line that replays it. For a random graph it
// also prints the case as a test, to paste into this file next to the
// generated graphs and cut down by deleting nodes.

const Random = require('random-seed');

let React;
let ReactServer;
let ReactDOMServer;
let Server;
let Client;
let WebpackMock;
let assertConsoleErrorDev;
let assertConsoleWarnDev;

const tick = () => new Promise(resolve => setImmediate(resolve));

// Runs `fn` from a message port task. The server's async tracing counts that
// as I/O, as it would a network callback, and a timer or a microtask it does
// not; a Promise resolved from here gets its value described as debug info.
function fromIO(fn) {
  return new Promise((resolve, reject) => {
    const {MessageChannel} = require('node:worker_threads');
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      try {
        resolve(fn());
      } catch (error) {
        reject(error);
      }
    };
    channel.port2.postMessage(undefined);
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  // A rejection nobody asked for yet is not an unhandled rejection.
  promise.then(undefined, () => {});
  return {promise, resolve, reject};
}

function random(seed) {
  const rand = Random.create(seed);
  return limit => rand(limit);
}

function shuffle(array, pick) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Macrotasks a due value may take to arrive. The Edge host and Blob reads need
// a timer or I/O turn, so each turn also yields to a timer.
const PATIENCE = 30;

function roundTrip({host, model, packetSizes, yieldBetweenPackets, onError}) {
  const manifest = {
    moduleMap: null,
    serverModuleMap: WebpackMock.webpackServerMap,
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
      if (disposed) {
        return 'cleanup';
      }
      try {
        return onError(error);
      } catch (unexpected) {
        errors.push(unexpected);
        return 'unexpected';
      }
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
      if (!disposed) {
        errors.push(error);
      }
    });
    const writer = Server.renderToPipeableStream(
      model,
      WebpackMock.webpackMap,
      options,
    );
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
    const output = Server.renderToReadableStream(
      model,
      WebpackMock.webpackMap,
      {
        ...options,
        signal: control.signal,
      },
    );
    abort = reason => control.abort(reason);
    const reader = output.getReader();
    (async () => {
      for (;;) {
        const {done, value} = await reader.read();
        if (done) {
          serverDone = true;
          return;
        }
        queued.push(Buffer.from(value));
      }
    })().catch(error => {
      if (!disposed) {
        errors.push(error);
      }
    });
  }

  // Forwards what the writer has produced so far, split into packets of
  // varying sizes so that rows straddle packet boundaries.
  async function flush() {
    await tick();
    const bytes = Buffer.concat(queued);
    queued = [];
    for (let offset = 0; offset < bytes.length; ) {
      const size = packetSizes[packet++ % packetSizes.length];
      send(bytes.subarray(offset, offset + size));
      offset += size;
      if (yieldBetweenPackets) {
        await tick();
      }
    }
    await tick();
    if (errors.length) {
      throw errors[0];
    }
  }

  async function drain(predicate, describe) {
    for (let turn = 0; turn < PATIENCE; turn++) {
      await flush();
      if (predicate()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    throw new Error('No progress: ' + describe());
  }

  return {
    root,
    flush,
    drain,
    // The client is left open on purpose. Values must arrive because their
    // inputs did, not because the stream ended.
    finish: () =>
      drain(
        () => serverDone && queued.length === 0,
        () => 'writer completion',
      ),
    close() {
      if (!closed) {
        closed = true;
        end();
      }
    },
    abort,
    async dispose() {
      disposed = true;
      if (!serverDone) {
        abort();
      }
      if (!closed) {
        closed = true;
        end();
      }
      await tick();
    },
  };
}

// A plan is a server-side value graph together with the external events the
// client has to wait for. Values that mean more than their own properties are
// recorded in `kinds`; the events are `events`, released by the test in some
// order. The oracle below reads only `event.released` and `event.error`.
function createPlan(seed) {
  const plan = {
    seed,
    pick: random(seed),
    model: null,
    events: [],
    needs: new Map(),
    kinds: new Map(),
    // The bytes of each binary leaf, taken before the writer sees it.
    bytes: new Map(),
    // Errors the writer must report through onError, by what throws them.
    expectedErrors: new Map(),
    recipe: [],
    unrelated: null,
    rootPromise: null,
    rootModel: null,
    observeProps: () => {},

    // `client` events happen on the client (module loads); the rest are
    // server-side events the writer waits for. An event with `error` fails
    // whatever needs it when it is released.
    event(label, run, {error, client = false} = {}) {
      const event = {label, run, released: false, error, client};
      plan.events.push(event);
      return event;
    },
    release(event) {
      event.released = true;
      event.run();
    },
    need(value, ...events) {
      plan.needs.set(value, [
        ...(plan.needs.get(value) || []),
        ...events.filter(Boolean),
      ]);
    },

    // Outcome state is recorded through native callbacks so that the oracle
    // never reads the writer's or the reader's thenable fields.
    promise(label) {
      const gate = deferred();
      const kind = {
        type: 'promise',
        label,
        state: 'pending',
        value: undefined,
        reason: undefined,
      };
      plan.kinds.set(gate.promise, kind);
      gate.promise.then(
        value => {
          kind.state = 'fulfilled';
          kind.value = value;
        },
        reason => {
          kind.state = 'rejected';
          kind.reason = reason;
        },
      );
      return gate;
    },
    async clientReference(
      value,
      {asynchronous = false, name, evaluationError, loadError} = {},
    ) {
      const id = name || 'module-' + plan.kinds.size;
      const load = deferred();
      const evaluate = asynchronous ? deferred() : null;
      let exports = WebpackMock.clientExports(
        evaluate === null ? {value} : evaluate.promise,
        id,
        id + '.js',
        load.promise,
      );
      let evaluateEvent = null;
      if (evaluate !== null) {
        // Awaiting the proxy marks an async import. Its chunk load and its
        // evaluation then finish in either order.
        exports = await exports;
        evaluateEvent = plan.event(
          'evaluate ' + id,
          () =>
            evaluationError !== undefined
              ? evaluate.reject(evaluationError)
              : evaluate.resolve({value}),
          {error: evaluationError, client: true},
        );
      }
      const reference = exports.value;
      plan.kinds.set(reference, {type: 'module', value});
      const loadEvent = plan.event(
        (loadError !== undefined ? 'reject ' : 'load ') + id,
        () =>
          loadError !== undefined ? load.reject(loadError) : load.resolve(),
        {error: loadError, client: true},
      );
      if (evaluateEvent !== null) {
        evaluateEvent.after = loadEvent;
      }
      plan.need(reference, loadEvent, evaluateEvent);
      return {reference, loadEvent, evaluateEvent};
    },
    serverFunction(implementation, {bound = [], args = [], label} = {}) {
      const ready = deferred();
      const exported = WebpackMock.serverExports(
        {fn: implementation},
        ready.promise,
      );
      const fn = bound.length ? exported.fn.bind(null, ...bound) : exported.fn;
      const result = implementation(...bound, ...args);
      plan.kinds.set(fn, {type: 'function', bound, args, result});
      const event = plan.event(
        'load ' + (label || 'server function'),
        () => ready.resolve(),
        {client: true},
      );
      plan.need(fn, event);
      return {fn, event};
    },
    clientElement(props, {name, key} = {}) {
      const id = name || 'component-' + plan.kinds.size;
      const load = deferred();
      const Component = receivedProps => {
        plan.observeProps(element, receivedProps);
        return React.createElement('span', null, id);
      };
      const {Component: Type} = WebpackMock.clientExports(
        {Component},
        id,
        id + '.js',
        load.promise,
      );
      const element = ReactServer.createElement(
        Type,
        key === undefined ? props : {key, ...props},
      );
      plan.kinds.set(element, {
        type: 'element',
        html: '<span>' + id + '</span>',
      });
      plan.need(
        element,
        plan.event('load ' + id, () => load.resolve(), {client: true}),
      );
      return element;
    },
    // A server component whose body renders once `render` is released. A
    // body that throws an Error from `plan.error` fails the element with its
    // digest.
    serverElement(
      html,
      render,
      {label = 'server component', failure, key} = {},
    ) {
      const gate = deferred();
      async function Body() {
        await gate.promise;
        return render();
      }
      const element = ReactServer.createElement(
        Body,
        key === undefined ? null : {key},
      );
      const rendering = plan.event('render ' + label, () => gate.resolve());
      plan.kinds.set(element, {type: 'element', html, failure, rendering});
      if (failure !== undefined) {
        plan.expectedErrors.set(failure, 'thrown by ' + label);
      }
      plan.need(element, rendering);
      return element;
    },
    // A byte stream. Each chunk is enqueued by its own event.
    byteStream(chunks, {label = 'bytes'} = {}) {
      let controller;
      let produced = 0;
      const stream = new ReadableStream({
        type: 'bytes',
        start: c => (controller = c),
      });
      const steps = [];
      const pump = () => {
        while (produced < chunks.length && steps[produced].released) {
          controller.enqueue(chunks[produced++].slice());
        }
        if (produced === chunks.length) {
          controller.close();
        }
      };
      for (let i = 0; i < chunks.length; i++) {
        steps.push(plan.event(label + ' chunk ' + i, pump));
      }
      plan.kinds.set(stream, {type: 'bytes', chunks, steps});
      return stream;
    },
    // A stream the client cancels after reading its first item. The writer
    // then enqueues another item, which must be dropped without affecting
    // values the first item shares with the rest of the response.
    canceledStream(items, {label = 'canceled stream'} = {}) {
      let controller;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
          controller.enqueue(items[0]);
        },
      });
      plan.event('enqueue into ' + label + ' after cancellation', () => {
        controller.enqueue({discarded: true});
        controller.close();
      });
      plan.kinds.set(stream, {type: 'canceled', first: items[0]});
      return stream;
    },
    hostElement(type, props, html) {
      const element = ReactServer.createElement(type, props);
      plan.kinds.set(element, {type: 'element', html});
      return element;
    },
    // A Fragment travels as a symbol reference, not as a client reference.
    fragment(children, {key}) {
      const element = ReactServer.createElement(
        ReactServer.Fragment,
        {key},
        ...children,
      );
      plan.kinds.set(element, {
        type: 'element',
        html: children.map(child => plan.kinds.get(child).html).join(''),
      });
      return element;
    },
    // Items are produced in order: item i is enqueued once the events for
    // items 0..i have all been released. Closing is its own event.
    stream(items, {label = 'stream'} = {}) {
      let controller;
      let produced = 0;
      const stream = new ReadableStream({start: c => (controller = c)});
      const steps = [];
      const pump = () => {
        while (produced < items.length && steps[produced].released) {
          controller.enqueue(items[produced++]);
        }
        if (produced === items.length && steps[items.length].released) {
          controller.close();
        }
      };
      for (let i = 0; i < items.length; i++) {
        steps.push(plan.event(label + ' item ' + i, pump));
      }
      steps.push(plan.event('close ' + label, pump));
      plan.kinds.set(stream, {type: 'stream', items, steps});
      return stream;
    },
    asyncIterable(items, returnValue, {label = 'iterable'} = {}) {
      const gate = deferred();
      const iterable = {
        async *[Symbol.asyncIterator]() {
          await gate.promise;
          for (let i = 0; i < items.length; i++) {
            yield items[i];
          }
          return returnValue;
        },
      };
      const step = plan.event('start ' + label, () => gate.resolve());
      plan.kinds.set(iterable, {type: 'iterable', items, returnValue, step});
      return iterable;
    },
    // The writer copies a sync iterator into an array, so its return value is
    // not transmitted.
    iterator(items) {
      const iterator = items[Symbol.iterator]();
      plan.kinds.set(iterator, {type: 'iterator', items});
      return iterator;
    },
    // An Error value. In DEV the client receives its message, cause and
    // errors; in production only that it is an error. An Error used to reject
    // a Promise is reported to onError and reaches the client as a digest.
    error(message, options) {
      const error = new Error(message, options);
      const digest = 'digest:' + message;
      plan.kinds.set(error, {type: 'error', digest});
      return error;
    },
    aggregateError(message, errors) {
      const error = new AggregateError(errors, message);
      plan.kinds.set(error, {type: 'error', digest: 'digest:' + message});
      return error;
    },
    reject(gate, error, label) {
      plan.expectedErrors.set(error, 'rejecting ' + label);
      gate.reject(error);
    },
  };
  return plan;
}

// What a value contains, for the purpose of deciding when it is whole. The
// reader delivers a value once everything reachable from it through objects,
// arrays, Sets, Maps and the bound arguments of a Server Function has arrived
// and loaded. A sync iterator is read while reading the value that holds it,
// so its items count too. Promises, streams, async iterables and elements are
// handles: they are delivered on their own and their insides are owed when
// they are observed, not before. Client references are leaves whose module
// must have loaded.
function contents(plan, value) {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return [];
  }
  const kind = plan.kinds.get(value);
  if (kind !== undefined) {
    switch (kind.type) {
      case 'function':
        return kind.bound;
      case 'iterator':
        return kind.items;
      case 'error':
        return __DEV__
          ? [
              value.cause,
              ...(value instanceof AggregateError ? value.errors : []),
            ]
          : [];
      default:
        return [];
    }
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (value instanceof Map) {
    return Array.from(value.entries()).flat();
  }
  if (Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value);
  }
  return [];
}

function isHandle(kind) {
  return (
    kind !== undefined &&
    (kind.type === 'promise' ||
      kind.type === 'element' ||
      kind.type === 'stream' ||
      kind.type === 'bytes' ||
      kind.type === 'canceled' ||
      kind.type === 'iterable')
  );
}

// Every event that `value` or some content of it needs. A handle's own
// needs (an element's component, for instance) gate observing the handle,
// not delivering the value that holds it.
function eventsOf(plan, value) {
  const result = new Set();
  const seen = new Set();
  const todo = [value];
  while (todo.length) {
    const current = todo.pop();
    if (
      current !== null &&
      (typeof current === 'object' || typeof current === 'function')
    ) {
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);
    }
    if (isHandle(plan.kinds.get(current))) {
      continue;
    }
    (plan.needs.get(current) || []).forEach(event => result.add(event));
    todo.push(...contents(plan, current));
  }
  return Array.from(result);
}

function allReleased(events) {
  return events.every(event => event.released);
}

// The failures the client can have seen. A failure is not visible before
// the event it comes after (a module's evaluation after its load). A value
// with several failed inputs fails with any one of them: which one depends
// on whether it was being read when they failed.
function failuresOf(events) {
  return events
    .filter(
      event =>
        event.released &&
        event.error !== undefined &&
        (event.after === undefined || event.after.released),
    )
    .map(event => event.error);
}

// A value is owed once it is whole, or as soon as something it contains has
// failed; a failure does not wait for the value's other inputs.
function owed(events) {
  return allReleased(events) || failuresOf(events).length > 0;
}

// The parts of the response: the root model, the contents of each handle,
// once known, and within those the props of each element, which travel with
// their holder but fail on their own. A value that occurs in more than one
// place is sent once, where the writer first meets it, and the other places
// refer to it there.
function partsOf(plan) {
  // Parts by the values they are made of, and by every object they hold.
  const byContent = new Map();
  const holders = new Map();
  const handles = new Set();
  const inlined = new Set();
  function part(seeds, parent, events) {
    const current = {parent, events: new Set(events), refersTo: new Set()};
    const todo = seeds.slice();
    const seen = new Set();
    while (todo.length) {
      const value = todo.pop();
      if (
        value === null ||
        (typeof value !== 'object' && typeof value !== 'function') ||
        seen.has(value)
      ) {
        continue;
      }
      seen.add(value);
      if (seeds.includes(value)) {
        byContent.set(value, current);
      }
      holders.set(value, (holders.get(value) || []).concat(current));
      const kind = plan.kinds.get(value);
      if (isHandle(kind)) {
        if (kind.type !== 'element' || kind.rendering !== undefined) {
          handles.add(value);
        } else if (!inlined.has(value)) {
          inlined.add(value);
          part([value.props], current, plan.needs.get(value) || []);
        }
        continue;
      }
      (plan.needs.get(value) || []).forEach(event => current.events.add(event));
      todo.push(...contents(plan, value));
    }
    return current;
  }
  const root = part(
    [plan.rootModel !== null ? plan.rootModel : plan.model],
    null,
    [],
  );
  handles.forEach(handle => {
    const kind = plan.kinds.get(handle);
    switch (kind.type) {
      case 'promise':
        if (kind.state === 'fulfilled') {
          part([kind.value], null, []);
        }
        break;
      case 'element':
        part([kind.body], null, []);
        break;
      case 'stream':
        kind.items.forEach(item => part([item], null, []));
        break;
      case 'iterable':
        kind.items.forEach(item => part([item], null, []));
        part([kind.returnValue], null, []);
        break;
      case 'canceled':
        part([kind.first], null, []);
        break;
      default:
        break;
    }
  });
  // A part refers into every part, and every element around that part, where
  // a value it holds may have been sent before it. The root is sent first, so
  // a value the root holds, directly or in one of its elements, is met there
  // before anywhere else.
  const top = current =>
    current.parent === null ? current : top(current.parent);
  holders.forEach(list => {
    const anchored = list.filter(current => top(current) === root);
    list.forEach(current => {
      const others =
        anchored.length > 0
          ? anchored
          : list.filter(other => other !== current);
      others.forEach(other => {
        for (let around = other; around !== null; around = around.parent) {
          current.refersTo.add(around);
        }
      });
    });
  });
  return byContent;
}

// Every event whose failure can reach `value` without `value` holding what
// failed. A reference into a failed part of the response fails with it, so a
// failure spreads to whatever was sent after it and refers into it, and
// whether it reaches `value` depends on the order the writer sent things in.
// The oracle accepts either outcome; a delivered `value` is still whole, and
// a `value` that holds a failed input itself still fails.
function sharedEventsOf(plan, value) {
  const part = partsOf(plan).get(value);
  if (part === undefined) {
    return [];
  }
  const result = new Set();
  const seen = new Set();
  const todo = [part];
  while (todo.length) {
    const current = todo.pop();
    if (!seen.has(current)) {
      seen.add(current);
      current.events.forEach(event => result.add(event));
      current.refersTo.forEach(next => todo.push(next));
    }
  }
  return Array.from(result);
}

// Observes a response the way an application would: through `then` callbacks,
// by rendering elements, and by reading streams. Each possible observation is
// a job with a `due` predicate over released events and the events of the
// parts of the response its value refers into, `shared`. A job must not be
// delivered before it is due, must be delivered within PATIENCE turns once it
// is due and those parts are whole, and must deliver a value that matches the
// source. `recheck` matches the delivered values again later to catch
// mutation after delivery.
function observer(plan, {render}) {
  const jobs = [];
  const failures = [];
  const delivered = [];
  // A received object stands for exactly one source object.
  const sourceOf = new WeakMap();
  const watched = new WeakSet();
  // An iterator yields once; later matches compare what it yielded.
  const yielded = new WeakMap();
  let pendingAsync = 0;

  function job(kind, source, path, due, expected, shared = () => []) {
    const entry = {kind, source, path, due, expected, shared, done: false};
    jobs.push(entry);
    return entry;
  }

  function guard(run) {
    try {
      run();
    } catch (error) {
      failures.push(error);
    }
  }

  function guardAsync(run) {
    pendingAsync++;
    Promise.resolve()
      .then(run)
      .catch(error => failures.push(error))
      .then(() => pendingAsync--);
  }

  function outcomeOf(source) {
    const failed = failuresOf(eventsOf(plan, source));
    return failed.length === 0 ? {value: source} : {errors: failed};
  }

  // `expected` are Errors, or kinds with a digest for errors the server
  // reported and the client sees only as a digest.
  function isExpectedError(error, expected) {
    return expected.some(candidate =>
      candidate instanceof Error
        ? candidate === error
        : error.digest === candidate.digest,
    );
  }

  function expectError(error, expected, path) {
    if (!isExpectedError(error, expected)) {
      throw new Error(
        path +
          ': rejected with "' +
          error.message +
          '", expected ' +
          expected
            .map(candidate =>
              candidate instanceof Error
                ? '"' + candidate.message + '"'
                : 'digest ' + candidate.digest,
            )
            .join(' or '),
      );
    }
  }

  function deliver(entry, received, error) {
    guard(() => {
      expect(entry.done).toBe(false);
      const expected = entry.expected();
      // A failure that reaches the value through what it refers into can
      // come before the value's own inputs, and in place of its own failure.
      if (
        error !== undefined &&
        !(
          entry.due() &&
          expected.errors !== undefined &&
          isExpectedError(error, expected.errors)
        ) &&
        failuresOf(entry.shared()).some(candidate => candidate === error)
      ) {
        entry.done = true;
        return;
      }
      if (!entry.due()) {
        throw new Error(
          'Delivered before its inputs arrived: ' +
            entry.path +
            '; not yet released: ' +
            eventsOf(plan, entry.source)
              .filter(event => !event.released)
              .map(event => event.label)
              .join(', '),
        );
      }
      if (expected.errors !== undefined) {
        if (error === undefined) {
          throw new Error(entry.path + ': expected a rejection');
        }
        expectError(error, expected.errors, entry.path);
      } else {
        if (error !== undefined) {
          throw new Error(
            entry.path + ': unexpected rejection: ' + error.message,
          );
        }
        match(expected.value, received, entry.path);
        delivered.push({source: expected.value, received, path: entry.path});
      }
      entry.done = true;
    });
  }

  // A short description of a value for failure messages.
  function describe(value) {
    if (value === null || typeof value !== 'object') {
      return typeof value === 'function'
        ? 'a function'
        : typeof value === 'string'
          ? JSON.stringify(value)
          : String(value);
    }
    if (Array.isArray(value)) {
      return 'an array of ' + value.length;
    }
    if (value instanceof Set || value instanceof Map) {
      return 'a ' + value.constructor.name + ' of ' + value.size;
    }
    if (Object.getPrototypeOf(value) === Object.prototype) {
      return 'an object with keys ' + JSON.stringify(Object.keys(value));
    }
    return 'a ' + Object.prototype.toString.call(value).slice(8, -1);
  }

  function match(source, received, path, visited = new Set(), fresh = false) {
    try {
      if (
        source === null ||
        (typeof source !== 'object' && typeof source !== 'function')
      ) {
        expect(received).toBe(source);
        return;
      }
      const kind = plan.kinds.get(source);
      if (kind !== undefined && kind.type === 'module') {
        if (received !== kind.value) {
          throw new Error(
            'expected the module export ' +
              describe(kind.value) +
              ', received ' +
              describe(received),
          );
        }
        return;
      }
      if (
        received === null ||
        (typeof received !== 'object' && typeof received !== 'function')
      ) {
        throw new Error(
          'expected ' + describe(source) + ', received ' + describe(received),
        );
      }
      // A Server Function's return value is created by the call; everything
      // below it is the bound arguments, which keep their identity.
      if (!fresh) {
        if (sourceOf.has(received)) {
          if (sourceOf.get(received) !== source) {
            throw new Error(
              'received ' +
                describe(received) +
                ' that was already delivered for a different value',
            );
          }
        } else {
          sourceOf.set(received, source);
        }
      }
      if (visited.has(received)) {
        return;
      }
      visited.add(received);
      if (kind !== undefined) {
        matchKind(kind, source, received, path, visited);
      } else if (Array.isArray(source)) {
        if (!Array.isArray(received) || received.length !== source.length) {
          throw new Error(
            'expected ' + describe(source) + ', received ' + describe(received),
          );
        }
        for (let i = 0; i < source.length; i++) {
          match(source[i], received[i], path + '[' + i + ']', visited);
        }
      } else if (source instanceof Set) {
        if (!(received instanceof Set) || received.size !== source.size) {
          throw new Error(
            'expected ' + describe(source) + ', received ' + describe(received),
          );
        }
        const a = Array.from(source);
        const b = Array.from(received);
        for (let i = 0; i < a.length; i++) {
          match(a[i], b[i], path + '.member' + i, visited);
        }
      } else if (source instanceof Map) {
        if (!(received instanceof Map) || received.size !== source.size) {
          throw new Error(
            'expected ' + describe(source) + ', received ' + describe(received),
          );
        }
        const a = Array.from(source);
        const b = Array.from(received);
        for (let i = 0; i < a.length; i++) {
          match(a[i][0], b[i][0], path + '.key' + i, visited);
          match(a[i][1], b[i][1], path + '.value' + i, visited);
        }
      } else if (source instanceof Date) {
        if (
          !(received instanceof Date) ||
          received.getTime() !== source.getTime()
        ) {
          throw new Error(
            'expected ' + String(source) + ', received ' + describe(received),
          );
        }
      } else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        expect(Object.prototype.toString.call(received)).toBe(
          Object.prototype.toString.call(source),
        );
        // The Edge writer transfers a large typed array into its output
        // stream rather than copying it, which detaches the source's buffer,
        // so the source bytes are the ones taken when it was built.
        expect(bytesOf(received)).toEqual(plan.bytes.get(source));
      } else if (source instanceof Blob) {
        expect(received instanceof Blob).toBe(true);
        expect(received.type).toBe(source.type);
        expect(received.size).toBe(source.size);
        guardAsync(async () => {
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
          match(a[i][1], b[i][1], path + '.form' + i, visited);
        }
      } else {
        if (
          Object.getPrototypeOf(received) !== Object.prototype ||
          JSON.stringify(Object.keys(received)) !==
            JSON.stringify(Object.keys(source))
        ) {
          throw new Error(
            'expected ' + describe(source) + ', received ' + describe(received),
          );
        }
        const keys = Object.keys(source);
        for (let i = 0; i < keys.length; i++) {
          match(
            source[keys[i]],
            received[keys[i]],
            path + '.' + keys[i],
            visited,
          );
        }
      }
    } catch (error) {
      if (error.path === undefined) {
        error.message = path + ': ' + error.message;
        error.path = path;
      }
      throw error;
    }
  }

  function matchKind(kind, source, received, path, visited) {
    switch (kind.type) {
      case 'function': {
        expect(typeof received).toBe('function');
        match(kind.result, received(...kind.args), path + '()', visited, true);
        return;
      }
      case 'promise': {
        expect(typeof received.then).toBe('function');
        if (watched.has(received)) {
          return;
        }
        watched.add(received);
        // A Promise that resolves to a server component element settles with
        // the component's output: it renders inside the Promise's task, so it
        // settles once the component has rendered, and rejects if the render
        // throws. The output's own props may still be loading; they make the
        // output lazy, not the Promise.
        const inputs = () => {
          const valueKind = plan.kinds.get(kind.value);
          const events = eventsOf(plan, kind.value);
          return valueKind === undefined || valueKind.rendering === undefined
            ? events
            : events.concat(valueKind.rendering);
        };
        const entry = job(
          'outcome',
          source,
          path + '.then',
          () =>
            kind.state === 'rejected' ||
            (kind.state === 'fulfilled' && owed(inputs())),
          () => {
            if (kind.state === 'rejected') {
              return {errors: [plan.kinds.get(kind.reason)]};
            }
            const valueKind = plan.kinds.get(kind.value);
            if (valueKind !== undefined && valueKind.failure !== undefined) {
              return {errors: [plan.kinds.get(valueKind.failure)]};
            }
            const failed = failuresOf(inputs());
            return failed.length === 0 ? {value: kind.value} : {errors: failed};
          },
          () => sharedEventsOf(plan, kind.value),
        );
        received.then(
          value => deliver(entry, value, undefined),
          error => deliver(entry, undefined, error),
        );
        return;
      }
      case 'element': {
        if (watched.has(received)) {
          return;
        }
        watched.add(received);
        // Rendering needs the element's own inputs and whatever its props
        // refer to; for a server component that includes its body's props.
        const inputs = () =>
          (plan.needs.get(source) || []).concat(
            eventsOf(plan, source.props),
            kind.body === undefined ? [] : eventsOf(plan, kind.body.props),
          );
        const entry = job(
          'render',
          source,
          path + '.render',
          () => failuresOf(inputs()).length > 0 || allReleased(inputs()),
          () => {
            if (kind.failure !== undefined) {
              return {errors: [plan.kinds.get(kind.failure)]};
            }
            const failed = failuresOf(inputs());
            return failed.length === 0 ? {value: kind.html} : {errors: failed};
          },
          () =>
            sharedEventsOf(plan, source.props).concat(
              kind.body === undefined
                ? []
                : sharedEventsOf(plan, kind.body.props),
            ),
        );
        guardAsync(async () => {
          let html;
          let error;
          try {
            html = await render(received);
          } catch (x) {
            error = x;
          }
          deliver(entry, html, error);
        });
        return;
      }
      case 'stream':
      case 'iterable': {
        if (watched.has(received)) {
          return;
        }
        watched.add(received);
        const items = kind.items;
        const producedThrough = i =>
          kind.type === 'stream'
            ? allReleased(kind.steps.slice(0, i + 1))
            : kind.step.released;
        const closed = () =>
          kind.type === 'stream' ? allReleased(kind.steps) : kind.step.released;
        const wholeThrough = i => {
          for (let j = 0; j <= i; j++) {
            if (!owed(eventsOf(plan, items[j]))) {
              return false;
            }
          }
          return true;
        };
        // An item arrives after the items before it, so it also waits for
        // the parts those refer into.
        const sharedThrough = i =>
          items.slice(0, i + 1).flatMap(item => sharedEventsOf(plan, item));
        // An item is owed once it and every earlier item have been produced
        // and are whole; a later item never overtakes an earlier one.
        const itemJobs = items.map((item, i) =>
          job(
            'item',
            item,
            path + '.item' + i,
            () => producedThrough(i) && wholeThrough(i),
            () => outcomeOf(item),
            () => sharedThrough(i),
          ),
        );
        const endJob = job(
          'end',
          source,
          path + '.end',
          () =>
            closed() &&
            wholeThrough(items.length - 1) &&
            (kind.type === 'stream' || owed(eventsOf(plan, kind.returnValue))),
          () =>
            kind.type === 'stream'
              ? {value: undefined}
              : outcomeOf(kind.returnValue),
          () =>
            kind.type === 'stream'
              ? sharedThrough(items.length - 1)
              : sharedThrough(items.length - 1).concat(
                  sharedEventsOf(plan, kind.returnValue),
                ),
        );
        guardAsync(async () => {
          let next;
          if (kind.type === 'stream') {
            const reader = received.getReader();
            next = () => reader.read();
          } else {
            const iterator = received[Symbol.asyncIterator]();
            next = () => iterator.next();
          }
          for (let i = 0; i < items.length; i++) {
            let result;
            try {
              result = await next();
            } catch (error) {
              // A failed item ends the stream, and an errored stream drops
              // the items still queued in it: a later item's failure can
              // arrive in place of this one.
              const later = items
                .slice(i + 1)
                .filter(item => producedThrough(items.indexOf(item)))
                .flatMap(item => failuresOf(eventsOf(plan, item)));
              const shared = items
                .slice(i)
                .filter(item => producedThrough(items.indexOf(item)))
                .flatMap(item => failuresOf(sharedEventsOf(plan, item)));
              if (later.length > 0 || shared.length > 0) {
                expectError(
                  error,
                  later.concat(shared, outcomeOf(items[i]).errors || []),
                  path + '.item' + i,
                );
                itemJobs[i].done = true;
              } else {
                deliver(itemJobs[i], undefined, error);
              }
              for (let j = i + 1; j < items.length; j++) {
                itemJobs[j].done = true;
              }
              endJob.done = true;
              return;
            }
            if (result.done) {
              throw new Error(path + '.item' + i + ': ended early');
            }
            deliver(itemJobs[i], result.value, undefined);
          }
          let last;
          try {
            last = await next();
          } catch (error) {
            deliver(endJob, undefined, error);
            return;
          }
          expect(last.done).toBe(true);
          deliver(endJob, last.value, undefined);
        });
        return;
      }
      case 'bytes': {
        if (watched.has(received)) {
          return;
        }
        watched.add(received);
        const expectedBytes = [].concat(...kind.chunks.map(c => Array.from(c)));
        const entry = job(
          'bytes',
          source,
          path + '.bytes',
          () => allReleased(kind.steps),
          () => ({value: undefined}),
        );
        guardAsync(async () => {
          const reader = received.getReader({mode: 'byob'});
          const got = [];
          for (;;) {
            const {done, value} = await reader.read(
              new Uint8Array(1 + (got.length % 3)),
            );
            if (value) {
              got.push(...value);
            }
            // Only prefixes of the source bytes are ever visible.
            expect(got).toEqual(expectedBytes.slice(0, got.length));
            if (done) {
              break;
            }
          }
          expect(got).toEqual(expectedBytes);
          deliver(entry, undefined, undefined);
        });
        return;
      }
      case 'canceled': {
        if (watched.has(received)) {
          return;
        }
        watched.add(received);
        const entry = job(
          'cancel',
          kind.first,
          path + '.first',
          () => owed(eventsOf(plan, kind.first)),
          () => outcomeOf(kind.first),
          () => sharedEventsOf(plan, kind.first),
        );
        guardAsync(async () => {
          const reader = received.getReader();
          let item;
          try {
            item = await reader.read();
          } catch (error) {
            deliver(entry, undefined, error);
            return;
          }
          expect(item.done).toBe(false);
          await reader.cancel('canceled by the test');
          deliver(entry, item.value, undefined);
        });
        return;
      }
      case 'iterator': {
        let got = yielded.get(received);
        if (got === undefined) {
          got = [];
          yielded.set(received, got);
          for (;;) {
            const step = received.next();
            if (step.done) {
              expect(step.value).toBe(undefined);
              break;
            }
            got.push(step.value);
          }
        }
        if (got.length !== kind.items.length) {
          throw new Error(
            'expected an iterator of ' +
              kind.items.length +
              ', received one of ' +
              got.length,
          );
        }
        for (let i = 0; i < got.length; i++) {
          match(kind.items[i], got[i], path + '.item' + i, visited);
        }
        return;
      }
      case 'error': {
        expect(received instanceof Error).toBe(true);
        if (__DEV__) {
          expect(received.message).toBe(source.message);
          expect('cause' in received).toBe('cause' in source);
          if (source instanceof AggregateError) {
            expect(received instanceof AggregateError).toBe(true);
          }
          if ('cause' in source) {
            match(source.cause, received.cause, path + '.cause', visited);
          }
          if (source instanceof AggregateError) {
            match(source.errors, received.errors, path + '.errors', visited);
          }
        }
        return;
      }
      default:
        throw new Error('Unknown kind: ' + kind.type);
    }
  }

  const api = {
    attachRoot(root, source, again) {
      const rootPromise = plan.rootPromise;
      const entry = job(
        'root',
        source,
        'root',
        () =>
          (rootPromise === null ||
            plan.kinds.get(rootPromise).state !== 'pending') &&
          owed(eventsOf(plan, source)),
        () => outcomeOf(source),
        () => sharedEventsOf(plan, source),
      );
      root.then(
        value => {
          deliver(entry, value, undefined);
          if (again) {
            api.attachRoot(root, source, false);
          }
        },
        error => deliver(entry, undefined, error),
      );
    },
    observeProps(source, received) {
      guard(() => {
        match(source.props, received, 'props of ' + source.type.name);
        delivered.push({
          source: source.props,
          received,
          path: 'props of ' + source.type.name,
        });
      });
    },
    healthy() {
      if (failures.length) {
        throw failures[0];
      }
    },
    // The jobs that have to be delivered by now: due, and with every part
    // of the response the value refers into whole or failed.
    overdue() {
      api.healthy();
      return jobs.filter(
        entry => !entry.done && entry.due() && owed(entry.shared()),
      );
    },
    settled() {
      api.healthy();
      return pendingAsync === 0 && jobs.every(entry => entry.done);
    },
    recheck() {
      const count = delivered.length;
      for (let i = 0; i < count; i++) {
        const {source, received, path} = delivered[i];
        match(source, received, path + ' (after settlement)');
      }
      api.healthy();
    },
  };
  return api;
}

const SEED = process.env.FUZZ_TEST_SEED || 'default';
const sweep = process.env.FLIGHT_FUZZ_CASES !== undefined;
const caseCount = +(process.env.FLIGHT_FUZZ_CASES || 4);
// The first case is seeded with SEED itself so that a failure replays with
// FUZZ_TEST_SEED set to the seed it printed.
const seeds = Array.from({length: caseCount}, (_, i) =>
  i === 0 ? SEED : SEED + ':' + i,
);

function bytesOf(view) {
  return view instanceof ArrayBuffer
    ? Array.from(new Uint8Array(view))
    : Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
}

// When the application starts observing: before any packet arrives, after the
// first flush, after every event has been released, or after EOF.
const demands = ['early', 'late', 'after-events', 'after-eof'];

// A case is a graph: nodes by name, each a leaf, a container or a handle,
// referring to other nodes by name. Any node may refer to any other, so
// cycles, sharing and self-reference need no special form.
//
//   nodes: {
//     // Leaves
//     v0: {value: 42},                       JSON scalar
//     v1: {date: 1700000000000},
//     v2: {binary: 7},                       Uint8Array starting with 7
//     v3: {text: 'text-1'},                  long string, outlined by the writer
//     v4: {blob: 'text-1'},
//     v5: {special: 'bigint'},               see specialAtoms
//     v25: {host: 'atom'},                   host element <span title="atom">
//     v6: {module: 'export-0'},              client reference
//     v7: {module: 'export-1', async: true, fail: 'evaluate'},  or fail: 'load'
//     v8: {error: 'message', cause: 'v0'},   Error (DEV reads the cause)
//     v26: {error: 'message', errors: ['v0']}, AggregateError (DEV reads errors)
//     // Containers: whole once their contents are
//     v9: {array: ['v0', 'v9']},             may contain itself
//     v10: {object: ['v0', 'v1']},           field0, field1, …
//     v27: {object: ['v0'], colon: true},    field:0, … (keys with a colon)
//     v11: {set: ['v0']},
//     v12: {map: [['v0', 'v1']]},            [key, value] pairs
//     v13: {iterator: ['v0', 'v1']},         sync iterator
//     v14: {bound: ['v0', 'v9']},            Server Function bound to arguments
//     v15: {element: 'v0'},                  client element with props {value}
//     v29: {element: ['v0', 'v1']},          with props {value, other}
//     v28: {fragment: ['v25']},              Fragment of host elements
//     v16: {props: 'v15'},                   that element's props object
//     // Handles: delivered on their own, contents observed later
//     v17: {promise: 'v9'},
//     v18: {promise: 'v8', reject: true},    rejects with the Error node
//     v19: {stream: ['v0', 'v1']},
//     v20: {stream: ['v0'], cancel: true},   consumer cancels after one item
//     v21: {bytes: 2},                       byte stream of two chunks
//     v22: {iterable: ['v0'], returns: 'v1'},
//     v23: {component: 'v0'},                server component rendering {value}
//     v24: {component: 'v8', throw: true},   server component throwing the Error
//   },
//   roots: {entry: 'v9', other: 'v10'},     the model is {entry, other, outcomes}
//
// Optional: `rootPromise: true` wraps the model in a Promise; `afterEof: true`
// releases reader-side events only after the writer has finished; `events`,
// `packetSizes` and `yieldBetweenPackets` fix what the seed would otherwise
// choose, and a failure prints the ones it ran with. An event label that no
// longer matches anything is ignored, so deleting a node does not require
// editing `events`.

const specialAtoms = {
  bigint: () => 1234567890123456789n,
  nan: () => NaN,
  'negative zero': () => -0,
  infinity: () => -Infinity,
  symbol: () => Symbol.for('flight-fuzz'),
  escaped: () => '$escaped\n🙂',
  buffer: () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
  'typed array': () => new Int16Array([1, -2, 3]),
  'data view': () => new DataView(new ArrayBuffer(7), 1, 5),
  'bigint array': () => new BigInt64Array([42n, -1n]),
  'float array': () => new Float64Array([1.5, -2.25, 0]),
  'clamped array': () => new Uint8ClampedArray([0, 128, 255]),
  undefined: () => undefined,
  'positive infinity': () => Infinity,
  // Longer than a packet, so its length-prefixed row is cut.
  'large binary': () => Uint8Array.from({length: 6000}, (_, i) => i % 251),
  'large blob': () => new Blob(['blob-'.repeat(1200)], {type: 'text/plain'}),
  'form data': () => {
    const form = new FormData();
    form.append('repeated', 'first');
    form.append('repeated', 'second');
    form.append('file', new Blob(['🙂']), 'source.bin');
    return form;
  },
};

const nodeKinds = [
  'value',
  'date',
  'binary',
  'text',
  'blob',
  'special',
  'host',
  'module',
  'error',
  'array',
  'object',
  'set',
  'map',
  'iterator',
  'bound',
  'element',
  'props',
  'fragment',
  'promise',
  'stream',
  'bytes',
  'iterable',
  'component',
];

const leafKinds = [
  'value',
  'date',
  'binary',
  'text',
  'blob',
  'special',
  'host',
  'module',
];

function kindOf(node) {
  const kind = nodeKinds.find(candidate => candidate in node);
  if (kind === undefined) {
    throw new Error('A graph node has none of: ' + nodeKinds.join(', '));
  }
  return kind;
}

// The names a node refers to.
function referencesOf(node) {
  switch (kindOf(node)) {
    case 'array':
    case 'set':
    case 'iterator':
    case 'bound':
    case 'object':
    case 'stream':
      return node[kindOf(node)].concat('returns' in node ? [node.returns] : []);
    case 'iterable':
      return node.iterable.concat(
        node.returns === undefined ? [] : [node.returns],
      );
    case 'map':
      return node.map.flat();
    case 'fragment':
      return node.fragment;
    case 'element':
      return [].concat(node.element);
    case 'props':
    case 'promise':
    case 'component':
      return [node[kindOf(node)]];
    case 'error':
      return (node.cause === undefined ? [] : [node.cause]).concat(
        node.errors === undefined ? [] : node.errors,
      );
    default:
      return [];
  }
}

// The moves a random graph is grown by. Each adds a node or an edge; the
// targets are drawn from every node that exists so far, so a move can close
// a cycle through anything. A stage of the fix stack or a host that cannot
// handle a move leaves it out.
const moves = [
  'link',
  'self',
  'mutual',
  'duplicate',
  'map key',
  'promise',
  'rejected promise',
  'stream',
  'canceled stream',
  'byte stream',
  'iterable',
  'iterator',
  'element',
  'props',
  'component',
  'failing component',
  'bound function',
  'error',
  'aggregate error',
  'fragment',
  'failing module',
  'after eof',
  'root promise',
];

function generateGraph(seed, {without = []} = {}) {
  const pick = random(seed + '/graph');
  const pickFrom = list => list[pick(list.length)];
  const allowed = moves.filter(move => !without.includes(move));
  const names = [];
  const nodes = {};
  // Every node a move may point at. Streams, iterables and iterators are
  // held once: the writer reads them once and does not record where it
  // first wrote one. Stream items are left out: an item that reaches itself
  // overflows the writer, which has no row of its own for an item to refer
  // back to.
  const targets = [];
  const single = [];
  const containers = [];
  // Nodes are named by kind: set0, promise1, module2 …
  const counts = {};
  const add = (node, {target = true, kind = kindOf(node)} = {}) => {
    counts[kind] = (counts[kind] || 0) + 1;
    const name = kind + (counts[kind] - 1);
    names.push(name);
    nodes[name] = node;
    if (target) {
      targets.push(name);
    }
    return name;
  };
  const addContainer = kind => {
    const name = add({[kind]: []});
    containers.push(name);
    return name;
  };
  const errors = [];
  const addError = () => {
    const name = add({error: 'error ' + errors.length});
    errors.push(name);
    return name;
  };
  const insert = (container, item) => {
    const node = nodes[container];
    if ('map' in node) {
      // A key used twice would drop the earlier value from the Map, and with
      // it anything only that value reaches.
      const used = node.map.map(entry => entry[0]);
      const free = targets.filter(name => !used.includes(name));
      const key =
        free.length > 0
          ? pickFrom(free)
          : add({value: 'key ' + used.length}, {target: false});
      node.map.push([key, item]);
    } else {
      node[kindOf(node)].push(item);
    }
  };
  // A stream item is written inline, with no reference for a container inside
  // it to break a cycle with, so items hold leaves and handles.
  const item = () =>
    add(
      {array: [pickFrom(targets.filter(name => !containers.includes(name)))]},
      {target: false, kind: 'item'},
    );

  add({value: 'value'});
  add({value: 'other value'});
  add({value: ''});
  add({value: 42});
  add({value: -1.5});
  add({value: 0});
  add({value: true});
  add({value: false});
  add({value: null});
  add({date: 1700000000000 + pick(100000)});
  add({binary: pick(256)});
  add({text: 'text-' + pick(1000)});
  add({blob: 'blob-' + pick(1000)});
  const specials = Object.keys(specialAtoms).filter(
    name => !without.includes(name),
  );
  add({special: pickFrom(specials)});
  add({special: pickFrom(specials)});
  if (!without.includes('host')) {
    add({host: 'atom'});
  }
  const moduleCount = without.includes('module') ? 0 : 2 + pick(2);
  for (let i = 0; i < moduleCount; i++) {
    const node = {module: 'export-' + i};
    if (pick(3) === 0) {
      node.async = true;
    }
    add(node);
  }
  ['array', 'object', 'set', 'map'].forEach(addContainer);
  if (!without.includes('colon')) {
    containers.push(add({object: [], colon: true}));
  }
  const options = {};

  const steps = 8 + pick(16);
  for (let step = 0; step < steps; step++) {
    const before = names.length;
    const existing = containers.slice();
    switch (pickFrom(allowed)) {
      case 'link': {
        insert(pickFrom(containers), pickFrom(targets));
        break;
      }
      case 'self': {
        const container = pickFrom(containers);
        insert(container, container);
        break;
      }
      case 'mutual': {
        const a = pickFrom(containers);
        const b = pickFrom(containers);
        insert(a, b);
        insert(b, a);
        break;
      }
      case 'duplicate': {
        const container = pickFrom(containers);
        const target = pickFrom(targets);
        insert(container, target);
        insert(container, target);
        break;
      }
      case 'map key': {
        const map = addContainer('map');
        const key = pickFrom(targets);
        nodes[map].map.push([key, key]);
        break;
      }
      case 'promise': {
        // A Promise may not resolve to a client reference: awaiting one
        // reads its `then`, which the reference refuses on the server.
        add({
          promise: pickFrom(targets.filter(name => !('module' in nodes[name]))),
        });
        break;
      }
      case 'rejected promise': {
        add({promise: addError(), reject: true});
        break;
      }
      case 'stream': {
        single.push(add({stream: [item(), item()]}, {target: false}));
        break;
      }
      case 'canceled stream': {
        single.push(add({stream: [item()], cancel: true}, {target: false}));
        break;
      }
      case 'byte stream': {
        single.push(add({bytes: 1 + pick(3)}, {target: false}));
        break;
      }
      case 'iterable': {
        single.push(
          add({iterable: [item(), item()], returns: item()}, {target: false}),
        );
        break;
      }
      case 'iterator': {
        single.push(
          add(
            {iterator: [pickFrom(targets), pickFrom(targets)]},
            {target: false},
          ),
        );
        break;
      }
      case 'element': {
        add({
          element:
            pick(2) === 0
              ? pickFrom(targets)
              : [pickFrom(targets), pickFrom(targets)],
        });
        break;
      }
      case 'props': {
        const elements = names.filter(name => 'element' in nodes[name]);
        if (elements.length === 0) {
          add({props: add({element: pickFrom(targets)})});
        } else {
          add({props: pickFrom(elements)});
        }
        break;
      }
      case 'component': {
        add({component: pickFrom(targets)});
        break;
      }
      case 'failing component': {
        add({component: addError(), throw: true});
        break;
      }
      case 'bound function': {
        add({
          bound: pick(3) === 0 ? [] : [pickFrom(targets), pickFrom(targets)],
        });
        break;
      }
      case 'error': {
        // In DEV the writer outlines a cause every time the Error is written,
        // so a cause that reaches the Error again recurses; causes are leaves.
        const leaves = targets.filter(name =>
          leafKinds.includes(kindOf(nodes[name])),
        );
        nodes[addError()].cause = pickFrom(leaves);
        break;
      }
      case 'aggregate error': {
        // The errors are copied into the AggregateError when it is built, so
        // it cannot be among them itself.
        const aggregated = [pickFrom(targets), pickFrom(targets)];
        nodes[addError()].errors = aggregated;
        break;
      }
      case 'fragment': {
        const hosts = names.filter(name => 'host' in nodes[name]);
        if (hosts.length > 0) {
          add({fragment: [pickFrom(hosts), pickFrom(hosts)]});
        }
        break;
      }
      case 'failing module': {
        const modules = names.filter(
          name => 'module' in nodes[name] && nodes[name].fail === undefined,
        );
        if (modules.length > 0) {
          const node = nodes[pickFrom(modules)];
          node.fail = node.async && pick(2) === 0 ? 'evaluate' : 'load';
        }
        break;
      }
      case 'after eof': {
        options.afterEof = true;
        break;
      }
      case 'root promise': {
        options.rootPromise = true;
        break;
      }
      default:
        break;
    }
    // Each node a move adds is put into a container that already existed,
    // so that the graph stays connected and the node is actually sent.
    for (let i = before; i < names.length; i++) {
      if (targets.includes(names[i]) || single.includes(names[i])) {
        insert(pickFrom(existing), names[i]);
      }
    }
  }
  const roots = {entry: pickFrom(containers), other: pickFrom(containers)};
  // Everything is reachable from the roots, so that every failure the graph
  // promises is one the writer gets to report. An Error's cause does not
  // count: it is only sent in DEV.
  for (;;) {
    const reached = new Set();
    const todo = [roots.entry, roots.other];
    while (todo.length) {
      const name = todo.pop();
      if (!reached.has(name)) {
        reached.add(name);
        if (!('error' in nodes[name])) {
          todo.push(...referencesOf(nodes[name]));
        }
      }
    }
    const missing = targets.filter(name => !reached.has(name));
    if (missing.length === 0) {
      break;
    }
    insert(
      pickFrom(containers.filter(name => reached.has(name))),
      pickFrom(missing),
    );
  }
  return {nodes, roots, ...options};
}

// Builds the graph's values with the plan's helpers and sets its model.
// Leaves and empty containers are created first, so that anything may refer
// to them; handles and functions are created once what they point at
// exists; containers are filled last.
async function buildGraph(plan, graph) {
  const {nodes} = graph;
  // A node the roots do not reach is never sent, and a failure it promises
  // would be reported as missing for that reason alone.
  const reached = new Set();
  const todo = [graph.roots.entry, graph.roots.other];
  while (todo.length) {
    const name = todo.pop();
    if (!reached.has(name) && nodes[name] !== undefined) {
      reached.add(name);
      todo.push(...referencesOf(nodes[name]));
    }
  }
  Object.keys(nodes).forEach(name => {
    if (!reached.has(name)) {
      throw new Error(name + ' is not reachable from the roots');
    }
  });
  const values = {};
  const ref = name => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error('The graph refers to ' + name + ', which is not a node');
    }
    return values[name];
  };
  const gates = new Map();
  const errorOf = name => {
    const error = ref(name);
    if (!(error instanceof Error)) {
      throw new Error(name + ' is used as an Error but is not an error node');
    }
    return error;
  };
  for (const name in nodes) {
    const node = nodes[name];
    switch (kindOf(node)) {
      case 'value':
        values[name] = node.value;
        break;
      case 'date':
        values[name] = new Date(node.date);
        break;
      case 'binary':
        values[name] = new Uint8Array([node.binary, 10, 255]);
        plan.bytes.set(values[name], bytesOf(values[name]));
        break;
      case 'text':
        values[name] = node.text + '🙂'.repeat(400);
        break;
      case 'blob':
        values[name] = new Blob([node.blob], {type: 'text/plain'});
        break;
      case 'special':
        values[name] = specialAtoms[node.special]();
        if (
          values[name] instanceof ArrayBuffer ||
          ArrayBuffer.isView(values[name])
        ) {
          plan.bytes.set(values[name], bytesOf(values[name]));
        }
        break;
      case 'host':
        values[name] = plan.hostElement(
          'span',
          {title: node.host},
          '<span title="' + node.host + '"></span>',
        );
        break;
      case 'module':
        values[name] = (
          await plan.clientReference(node.module, {
            name,
            asynchronous: node.async === true,
            loadError:
              node.fail === 'load'
                ? new Error('module ' + name + ' failed to load')
                : undefined,
            evaluationError:
              node.fail === 'evaluate'
                ? new Error('module ' + name + ' failed to evaluate')
                : undefined,
          })
        ).reference;
        break;
      case 'error':
        if (node.errors === undefined) {
          values[name] = plan.error(node.error);
        }
        break;
      case 'array':
        values[name] = [];
        break;
      case 'object':
        values[name] = {};
        break;
      case 'set':
        values[name] = new Set();
        break;
      case 'map':
        values[name] = new Map();
        break;
      case 'promise': {
        const gate = plan.promise(name);
        gates.set(name, gate);
        values[name] = gate.promise;
        break;
      }
      default:
        break;
    }
  }
  // Handles and functions need the identity of what they point at, which
  // may itself be a handle or an element's props, so they are built on
  // demand in dependency order.
  const building = new Set();
  const build = name => {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      return values[name];
    }
    if (!Object.prototype.hasOwnProperty.call(nodes, name)) {
      return ref(name);
    }
    if (building.has(name)) {
      throw new Error(name + ' refers to itself through handles only');
    }
    building.add(name);
    const node = nodes[name];
    switch (kindOf(node)) {
      case 'iterator':
        values[name] = plan.iterator(node.iterator.map(build));
        break;
      case 'error':
        values[name] = plan.aggregateError(node.error, node.errors.map(build));
        break;
      case 'fragment':
        values[name] = plan.fragment(node.fragment.map(build), {key: name});
        break;
      case 'bound':
        values[name] = plan.serverFunction((...args) => args, {
          bound: node.bound.map(build),
          label: name,
        }).fn;
        break;
      case 'element': {
        // Elements are keyed: a keyless element in an array is a warning.
        const props = Array.isArray(node.element)
          ? {value: build(node.element[0]), other: build(node.element[1])}
          : {value: build(node.element)};
        values[name] = plan.clientElement(props, {name, key: name});
        break;
      }
      case 'stream':
        values[name] = node.cancel
          ? plan.canceledStream(node.stream.map(build), {label: name})
          : plan.stream(node.stream.map(build), {label: name});
        break;
      case 'bytes':
        values[name] = plan.byteStream(
          Array.from({length: node.bytes}, (_, i) => new Uint8Array([i, 7])),
          {label: name},
        );
        break;
      case 'iterable':
        values[name] = plan.asyncIterable(
          node.iterable.map(build),
          node.returns === undefined ? undefined : build(node.returns),
          {label: name},
        );
        break;
      case 'component': {
        if (node.throw) {
          const error = errorOf(node.component);
          values[name] = plan.serverElement(
            undefined,
            () => {
              throw error;
            },
            {label: name, failure: error, key: name},
          );
        } else {
          const rendered = plan.clientElement(
            {value: build(node.component)},
            {name: name + ' body'},
          );
          values[name] = plan.serverElement(
            plan.kinds.get(rendered).html,
            () => rendered,
            {label: name, key: name},
          );
          // Rendering the component renders its body, so the body's module
          // has to load first, and so does whatever the body's props refer
          // to once the containers are filled.
          plan.need(values[name], ...(plan.needs.get(rendered) || []));
          plan.kinds.get(values[name]).body = rendered;
        }
        break;
      }
      case 'props': {
        const element = build(node.props);
        const kind = plan.kinds.get(element);
        if (kind === undefined || kind.type !== 'element') {
          throw new Error(node.props + ' is not an element node');
        }
        values[name] = element.props;
        break;
      }
      default:
        break;
    }
    building.delete(name);
    return values[name];
  };
  for (const name in nodes) {
    build(name);
  }
  for (const name in nodes) {
    const node = nodes[name];
    switch (kindOf(node)) {
      case 'array':
        node.array.forEach(item => values[name].push(ref(item)));
        break;
      case 'object':
        node.object.forEach((item, i) => {
          values[name]['field' + (node.colon ? ':' : '') + i] = ref(item);
        });
        break;
      case 'set':
        node.set.forEach(item => values[name].add(ref(item)));
        break;
      case 'map':
        node.map.forEach(([key, item]) =>
          values[name].set(ref(key), ref(item)),
        );
        break;
      case 'error':
        if (node.cause !== undefined) {
          values[name].cause = ref(node.cause);
        }
        break;
      case 'promise': {
        const gate = gates.get(name);
        if (node.reject) {
          const error = errorOf(node.promise);
          plan.event('reject ' + name, () => plan.reject(gate, error, name));
        } else {
          const target = ref(node.promise);
          plan.event('resolve ' + name + ' to ' + node.promise, () =>
            gate.resolve(target),
          );
        }
        break;
      }
      default:
        break;
    }
  }
  plan.afterEof = graph.afterEof === true;
  const unrelated = plan.promise('unrelated');
  plan.unrelated = plan.event('resolve an unrelated Promise', () =>
    unrelated.resolve('end'),
  );
  plan.model = {
    entry: ref(graph.roots.entry),
    other: ref(graph.roots.other),
    outcomes: Array.from(gates.keys(), ref),
    unrelated: unrelated.promise,
  };
  if (graph.rootPromise) {
    // The root itself is a Promise, observed through native adoption.
    const gate = plan.promise('root');
    plan.rootPromise = gate.promise;
    plan.rootModel = plan.model;
    plan.model = gate.promise;
    plan.events.unshift({
      label: 'resolve the root Promise',
      run: () => gate.resolve(plan.rootModel),
      released: false,
    });
  }
}

const literal = value =>
  JSON.stringify(value)
    .replace(/"(\w+)":/g, '$1: ')
    .replace(/"/g, "'")
    .replace(/,/g, ', ');

// The event order, packet sizes and demand a run used, as lines of the case.
function formatGraphSettings(graph, demand) {
  return ['events', 'packetSizes', 'yieldBetweenPackets']
    .filter(key => graph[key] !== undefined)
    .map(key => '    ' + key + ': ' + literal(graph[key]) + ',')
    .concat("    demand: '" + demand + "',")
    .join('\n');
}

// The case as a test to paste into this file, one node per line.
function formatGraphTest(graph, demand) {
  const lines = ["it('pasted', () =>", '  runGraph({', '    nodes: {'];
  for (const name in graph.nodes) {
    lines.push('      ' + name + ': ' + literal(graph.nodes[name]) + ',');
  }
  lines.push('    },');
  for (const key in graph) {
    if (
      !['nodes', 'events', 'packetSizes', 'yieldBetweenPackets'].includes(key)
    ) {
      lines.push('    ' + key + ': ' + literal(graph[key]) + ',');
    }
  }
  lines.push(formatGraphSettings(graph, demand), '  }),', ');');
  return lines.join('\n');
}

describe.each(['node', 'edge'])('ReactFlightReaderFuzz (%s)', host => {
  let input;

  // Fresh modules for every run: the module mock registers chunks by id, so
  // a second run in the same test would find the first run's already loaded.
  function loadModules() {
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
    ({
      assertConsoleErrorDev,
      assertConsoleWarnDev,
    } = require('internal-test-utils'));
  }

  beforeEach(loadModules);

  afterEach(async () => {
    if (input) {
      await input.dispose();
      input = null;
    }
  });

  function render(element) {
    return ReactDOMServer.renderToReadableStream(element, {
      onError() {},
    }).then(stream => new Response(stream).text());
  }

  // Releases the plan's events one at a time. After each one, every value
  // whose inputs are now all available must arrive before the next release;
  // a missed wakeup cannot be rescued by an unrelated later event.
  async function run(plan, demand) {
    const watched = observer(plan, {render});
    plan.observeProps = watched.observeProps;
    const reported = [];
    input = roundTrip({
      host,
      model: plan.model,
      packetSizes: plan.packetSizes,
      yieldBetweenPackets: plan.yieldBetweenPackets,
      onError(error) {
        const digest = plan.expectedErrors.has(error)
          ? plan.kinds.get(error).digest
          : undefined;
        if (digest === undefined) {
          throw error;
        }
        reported.push(error);
        return digest;
      },
    });
    const adopted = plan.rootPromise !== null;
    const source = adopted ? plan.rootModel : plan.model;
    const root = adopted ? Promise.resolve(input.root) : input.root;
    // A failure says which release it followed.
    const progress = async stage => {
      let overdue = [];
      try {
        await input.drain(
          () => {
            overdue = watched.overdue();
            return overdue.length === 0;
          },
          () =>
            stage +
            ': due ' +
            overdue.map(entry => entry.path).join(', ') +
            '; not yet released: ' +
            plan.events
              .filter(event => !event.released)
              .map(event => event.label)
              .join(', '),
        );
      } catch (error) {
        if (!error.message.startsWith('No progress')) {
          error.message = stage + ': ' + error.message;
        }
        throw error;
      }
    };
    if (demand === 'early') {
      watched.attachRoot(root, source, true);
    }
    await input.flush();
    if (demand === 'late') {
      watched.attachRoot(root, source, true);
    }
    await progress('after the first packets');
    const release = async event => {
      await fromIO(() => plan.release(event));
      await progress('after ' + event.label);
    };
    let events = plan.events.slice();
    if (plan.afterEof) {
      // The writer finishes, and the client sees EOF, before any client-side
      // event is released. EOF must not cancel work on values whose rows
      // have all arrived.
      for (let i = 0; i < events.length; i++) {
        if (!events[i].client) {
          await release(events[i]);
        }
      }
      await input.finish();
      input.close();
      await input.flush();
      await progress('after EOF');
      events = events.filter(s => s.client);
    }
    for (let i = 0; i < events.length; i++) {
      await release(events[i]);
    }
    await input.finish();
    if (demand === 'after-eof') {
      input.close();
      await tick();
    }
    if (demand === 'after-events' || demand === 'after-eof') {
      watched.attachRoot(root, source, true);
    }
    await progress('after all events');
    await input.drain(
      () => watched.settled(),
      () => 'every outcome, render and stream item',
    );
    plan.expectedErrors.forEach((thrower, error) => {
      if (!reported.includes(error)) {
        throw new Error(
          'The writer never reported "' +
            error.message +
            '", ' +
            thrower +
            '. Was it sent?',
        );
      }
    });
    watched.recheck();
    // A second observation of the settled response sees the same values.
    watched.attachRoot(root, source, false);
    await input.drain(
      () => watched.settled(),
      () => 'the second root observation',
    );
    watched.recheck();
  }

  async function runCase({family, seed, demand, variant, graph}) {
    if (process.env.FLIGHT_FUZZ_PRINT) {
      // For a case that fails outside its own assertions, such as by an
      // unhandled rejection, which has no report to print the graph in.
      process.stdout.write(formatGraphTest(graph, demand) + '\n');
    }
    loadModules();
    const plan = createPlan(seed);
    await buildGraph(plan, graph);
    // `events` replays by label, so labels must be unique.
    const labels = new Set();
    plan.events.forEach(event => {
      if (labels.has(event.label)) {
        throw new Error('Two events are labeled "' + event.label + '"');
      }
      labels.add(event.label);
    });
    // The event order comes from its own generator so that another variant
    // leaves the graph itself unchanged.
    const order = random(seed + '/order/' + variant);
    if (graph.events !== undefined) {
      const position = label => {
        const index = graph.events.indexOf(label);
        return index === -1 ? graph.events.length : index;
      };
      plan.events.sort((a, b) => position(a.label) - position(b.label));
    } else {
      shuffle(plan.events, order);
    }
    // An event nothing depends on is released last. Nothing may wait for it.
    plan.events.splice(plan.events.indexOf(plan.unrelated), 1);
    plan.events.push(plan.unrelated);
    const packetSizes = [1 + order(8), 17 + order(100), 1024 + order(4096)];
    const yieldBetweenPackets = order(2) === 0;
    plan.packetSizes = graph.packetSizes || packetSizes;
    plan.yieldBetweenPackets =
      graph.yieldBetweenPackets !== undefined
        ? graph.yieldBetweenPackets
        : yieldBetweenPackets;
    try {
      await run(plan, demand);
      // A console error is a failure of the case, reported with its graph. A
      // writer on a Node below 22 warns once that it copies a binary chunk
      // larger than its buffer, since ArrayBuffer.prototype.detached is
      // missing there; that is the environment's, not the case's.
      assertConsoleErrorDev(
        global.__loggedErrors
          .map(entry => entry[0])
          .filter(message =>
            message.includes('ArrayBuffer.prototype.detached'),
          ),
        {withoutStack: true},
      );
      assertConsoleWarnDev([]);
    } catch (error) {
      const settings = {
        ...graph,
        events: plan.events.map(event => event.label),
        packetSizes: plan.packetSizes,
        yieldBetweenPackets: plan.yieldBetweenPackets,
      };
      const testName = expect.getState().currentTestName;
      const report =
        family === 'graph'
          ? 'Replay with FUZZ_TEST_SEED=' +
            seed +
            ' FLIGHT_FUZZ_CASES=1 -t "' +
            caseName(family, seed, demand, variant) +
            '"\nTo work on it, paste this next to the generated graphs and ' +
            'run it with -t pasted:\n\n' +
            formatGraphTest(settings, demand)
          : 'Failed under demand "' +
            demand +
            '". Rerun with -t "' +
            testName +
            '". To pin this run, add to the case:\n\n' +
            formatGraphSettings(settings, demand);
      throw new Error(report + '\n\n' + error.stack);
    } finally {
      // The next run must not see this one's pending work.
      if (input) {
        await input.dispose();
        input = null;
      }
    }
  }

  const caseName = (family, seed, demand, variant) =>
    family + ' seed=' + seed + ' demand=' + demand + ' variant=' + variant;

  // Runs a graph literal, under every demand unless one is given. A failure
  // report prints a test that calls this with the failing graph; paste it
  // next to the generated graphs.
  async function runGraph({
    demand,
    family = 'pasted',
    seed = SEED,
    variant = 0,
    ...graph
  }) {
    const each = demand === undefined ? demands : [demand];
    for (let i = 0; i < each.length; i++) {
      await runCase({family, seed, demand: each[i], variant, graph});
    }
  }

  // Two writer bugs in DEV keep server components and sync iterators out of
  // the random graphs: a suspended server component that occurs twice waits
  // for its render, and debug info drains an iterator before the model is
  // written.
  // These leaves wait for fixes further up the stack: a large typed array held
  // in two places arrives empty the second time, an object key whose value is
  // undefined is dropped, and a cycle through a property name with a colon
  // overflows the writer's stack.
  const unsupportedMoves = [
    'component',
    'failing component',
    'iterator',
    'large binary',
    'undefined',
    'colon',
  ];

  describe('generated graphs', () => {
    seeds.forEach(seed => {
      for (let variant = 0; variant < 2; variant++) {
        const demandCount = sweep ? demands.length : 1;
        for (let d = 0; d < demandCount; d++) {
          // eslint-disable-next-line jest/valid-title
          it(caseName('graph', seed, demands[d], variant), () =>
            runGraph({
              ...generateGraph(seed, {without: unsupportedMoves}),
              family: 'graph',
              seed,
              demand: demands[d],
              variant,
            }),
          );
        }
      }
    });
  });

  // Paste a failing graph's test here.

  // Cases with names. The generator can produce all of them. A skipped one
  // fails today; the comment above it says whether the reader or the writer
  // is at fault.
  describe('known cases', () => {
    it('Set containing itself', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          set: {set: ['set', 'ready']},
        },
        roots: {entry: 'set', other: 'set'},
      }));

    it('Map containing itself', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          key: {value: 'value'},
          map: {
            map: [
              ['map', 'map'],
              ['key', 'ready'],
            ],
          },
        },
        roots: {entry: 'map', other: 'map'},
      }));

    it('two collections containing each other', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          key: {value: 'a'},
          a: {set: ['b', 'ready']},
          b: {map: [['key', 'a']]},
        },
        roots: {entry: 'a', other: 'b'},
      }));

    it('function bound to its array', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['container']},
          container: {array: ['fn', 'container', 'ready']},
        },
        roots: {entry: 'container', other: 'container'},
      }));

    it('function bound to its Map', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['container']},
          container: {
            map: [
              ['fn', 'ready'],
              ['container', 'container'],
            ],
          },
        },
        roots: {entry: 'container', other: 'container'},
      }));

    it('cycle first exposed through a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {set: ['fn', 'region', 'ready']},
        },
        roots: {entry: 'fn', other: 'fn'},
      }));

    it('cycle first exposed through a Promise of a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {object: ['fn', 'region', 'ready']},
          exposure: {promise: 'fn'},
        },
        roots: {entry: 'exposure', other: 'exposure'},
      }));

    it('cycle first exposed through a stream item with a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {array: ['fn', 'region', 'ready']},
          item: {array: ['fn']},
          exposure: {stream: ['item']},
        },
        roots: {entry: 'exposure', other: 'exposure'},
      }));

    it('async module failing to evaluate after loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0', async: true, fail: 'evaluate'},
          other: {module: 'export-1'},
          broken: {object: ['ready']},
          fine: {object: ['other']},
        },
        roots: {entry: 'broken', other: 'fine'},
      }));

    it('module failing to load after eof', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0', fail: 'load'},
          other: {module: 'export-1'},
          broken: {object: ['ready']},
          fine: {object: ['other']},
        },
        roots: {entry: 'broken', other: 'fine'},
        afterEof: true,
      }));

    // Writer bug.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('streamed array containing itself', () =>
      runGraph({
        nodes: {
          item: {array: ['item']},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('stream item with a failing module', () =>
      runGraph({
        nodes: {
          broken: {module: 'export-0', fail: 'load'},
          item: {array: ['broken']},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('byte stream read with a BYOB reader', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          bytes: {bytes: 2},
          data: {object: ['ready']},
        },
        roots: {entry: 'bytes', other: 'data'},
      }));

    it('byte stream closed while a read is waiting', () =>
      runGraph({
        nodes: {array: {array: ['bytes']}, bytes: {bytes: 3}},
        roots: {entry: 'array', other: 'array'},
        packetSizes: [21, 100000],
        yieldBetweenPackets: true,
      }));

    it('stream canceled while the writer is still producing', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          shared: {object: ['ready']},
          stream: {stream: ['shared'], cancel: true},
        },
        roots: {entry: 'stream', other: 'shared'},
      }));

    it('cycle first exposed through two Promises', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          member: {object: ['ready', 'set']},
          set: {set: ['member']},
          first: {promise: 'member'},
          second: {promise: 'set'},
        },
        roots: {entry: 'first', other: 'second'},
      }));

    it('two stream items each waiting on a module', () =>
      runGraph({
        nodes: {
          first: {module: 'export-0'},
          second: {module: 'export-1'},
          item0: {set: ['first']},
          item1: {set: ['second']},
          stream: {stream: ['item0', 'item1']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    // Writer bug, DEV only.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('iterator resolved by a Promise', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          shared: {object: ['ready']},
          iterator: {iterator: ['shared', 'ready']},
          later: {promise: 'iterator'},
        },
        roots: {entry: 'later', other: 'shared'},
      }));

    it('iterator over values still loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          shared: {object: ['ready']},
          iterator: {iterator: ['shared', 'ready']},
          holder: {object: ['shared', 'iterator']},
        },
        roots: {entry: 'holder', other: 'holder'},
      }));

    it('Blob beside a cycle', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          blob: {blob: 'blob'},
          array: {array: ['blob', 'ready', 'array']},
        },
        roots: {entry: 'array', other: 'blob'},
      }));

    it('module loading after eof', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0', async: true},
          region: {object: ['ready', 'region']},
        },
        roots: {entry: 'region', other: 'region'},
        afterEof: true,
      }));
  });

  describe('known cases with elements, components or Errors', () => {
    it('props object referenced again while a prop is loading', () =>
      runGraph({
        nodes: {
          payload: {module: 'export-0'},
          data: {object: ['props']},
          value: {array: ['payload', 'data']},
          element: {element: 'value'},
          props: {props: 'element'},
        },
        roots: {entry: 'element', other: 'props'},
      }));

    it('props sub-object referenced while a sibling prop is loading', () =>
      runGraph({
        nodes: {
          payload: {module: 'export-0'},
          sibling: {module: 'export-1'},
          selected: {object: ['payload']},
          value: {array: ['selected', 'sibling']},
          element: {element: 'value'},
        },
        roots: {entry: 'element', other: 'selected'},
      }));

    it('element reaching itself through its props', () =>
      runGraph({
        nodes: {
          payload: {module: 'export-0'},
          data: {object: ['element']},
          value: {array: ['payload', 'data']},
          element: {element: 'value'},
        },
        roots: {entry: 'element', other: 'data'},
      }));

    it('waits that loop before the check that merges them', () =>
      runGraph({
        nodes: {
          value1: {value: 'other value'},
          value2: {value: ''},
          value3: {value: 42},
          text0: {text: 'text-898'},
          blob0: {blob: 'blob-116'},
          host0: {host: 'atom'},
          module1: {module: 'export-1', async: true},
          array0: {array: ['array0']},
          set0: {set: ['map1']},
          map0: {
            map: [
              ['blob0', 'bytes0'],
              ['value3', 'props0'],
              ['module1', 'iterable0'],
              ['set0', 'value2'],
              ['array0', 'value1'],
            ],
          },
          map1: {
            map: [
              ['host0', 'host0'],
              ['element0', 'host0'],
              ['array0', 'host0'],
              ['blob0', 'text0'],
            ],
          },
          bytes0: {bytes: 2},
          element0: {element: 'host0'},
          props0: {props: 'element0'},
          iterable0: {iterable: []},
        },
        roots: {entry: 'map0', other: 'array0'},
        afterEof: true,
        rootPromise: true,
        events: [
          'bytes0 chunk 1',
          'load module1',
          'bytes0 chunk 0',
          'start iterable0',
          'load element0',
          'evaluate module1',
          'resolve the root Promise',
          'resolve an unrelated Promise',
        ],
        packetSizes: [3, 89, 2624],
        yieldBetweenPackets: false,
        demand: 'early',
      }));

    it('all leaf kinds beside a cycle and a loading module', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          nothing: {value: null},
          flag: {value: true},
          bigint: {special: 'bigint'},
          nan: {special: 'nan'},
          negativeZero: {special: 'negative zero'},
          infinity: {special: 'infinity'},
          symbol: {special: 'symbol'},
          escaped: {special: 'escaped'},
          text: {text: 'text'},
          date: {date: 1700000000000},
          buffer: {special: 'buffer'},
          binary: {binary: 3},
          typed: {special: 'typed array'},
          view: {special: 'data view'},
          bigints: {special: 'bigint array'},
          blob: {blob: 'blob'},
          form: {special: 'form data'},
          host: {host: 'atom'},
          atoms: {
            array: [
              'nothing',
              'flag',
              'bigint',
              'nan',
              'negativeZero',
              'infinity',
              'symbol',
              'escaped',
              'text',
              'date',
              'buffer',
              'binary',
              'typed',
              'view',
              'bigints',
              'blob',
              'form',
              'host',
              'ready',
              'cycle',
            ],
          },
          cycle: {object: ['atoms', 'cycle']},
        },
        roots: {entry: 'cycle', other: 'cycle'},
      }));

    it('server component rendering after the rest of the response', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          body: {value: 'body'},
          component: {component: 'body'},
          data: {object: ['ready']},
        },
        roots: {entry: 'component', other: 'data'},
      }));

    it('failing server component', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          error: {error: 'component failed'},
          component: {component: 'error', throw: true},
          data: {object: ['ready']},
        },
        roots: {entry: 'component', other: 'data'},
      }));

    // Writer bug, DEV only.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('suspended server component element used twice', () =>
      runGraph({
        nodes: {
          body: {value: 'shared'},
          component: {component: 'body'},
          pair: {array: ['component', 'component']},
        },
        roots: {entry: 'pair', other: 'pair'},
      }));

    it('server error through a rejected Promise', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          error: {error: 'expected failure'},
          failing: {promise: 'error', reject: true},
          fine: {object: ['ready']},
        },
        roots: {entry: 'failing', other: 'fine'},
      }));

    it('Error whose cause is still loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          error: {error: 'cause loading', cause: 'ready'},
          holder: {set: ['error']},
        },
        roots: {entry: 'holder', other: 'holder'},
      }));

    it('Error with cyclic cause', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          cell: {object: ['ready', 'error']},
          error: {error: 'cyclic cause', cause: 'cell'},
        },
        roots: {entry: 'error', other: 'cell'},
      }));
  });
});

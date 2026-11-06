/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {
  getNodeType,
  getReachableNodes,
  specialValueFactories,
} = require('./FlightReaderFuzzGraph');

async function createFixture(
  graph,
  {React, ReactServer, WebpackMock, observeProps},
) {
  checkReachability(graph);
  const {nodes} = graph;
  const serializedNodes = getReachableNodes(graph, {
    // All Promises are also sent through model.outcomes below.
    roots: Object.values(graph.roots).concat(
      Object.keys(nodes).filter(name => getNodeType(nodes[name]) === 'promise'),
    ),
    includeErrorProperties: __DEV__,
  });
  const events = [];
  const requiredEvents = new Map();
  const valueMetadata = new Map();
  const bytes = new Map();
  const expectedErrors = new Map();

  const values = {};
  const getValue = name => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error('The graph refers to ' + name + ', which is not a node');
    }
    return values[name];
  };
  const deferredPromises = new Map();
  const getError = name => {
    const error = getValue(name);
    if (!(error instanceof Error)) {
      throw new Error(name + ' is used as an Error but is not an error node');
    }
    return error;
  };
  // Allocate containers before filling them so references can form cycles.
  for (const name in nodes) {
    const node = nodes[name];
    switch (getNodeType(node)) {
      case 'value':
        values[name] = node.value;
        break;
      case 'date':
        values[name] = new Date(node.date);
        break;
      case 'binary':
        values[name] = new Uint8Array([node.binary, 10, 255]);
        saveBytes(values[name]);
        break;
      case 'text':
        values[name] = node.text + '🙂'.repeat(400);
        break;
      case 'blob':
        values[name] = new Blob([node.blob], {type: 'text/plain'});
        break;
      case 'special':
        values[name] = specialValueFactories[node.special]();
        if (
          values[name] instanceof ArrayBuffer ||
          ArrayBuffer.isView(values[name])
        ) {
          saveBytes(values[name]);
        }
        break;
      case 'host':
        values[name] = createHostElement(
          'span',
          {title: node.host},
          '<span title="' + node.host + '"></span>',
        );
        break;
      case 'module': {
        const load = createResolvablePromise();
        const evaluate = node.async === true ? createResolvablePromise() : null;
        const loadError =
          node.fail === 'load'
            ? new Error('module ' + name + ' failed to load')
            : undefined;
        const evaluationError =
          node.fail === 'evaluate'
            ? new Error('module ' + name + ' failed to evaluate')
            : undefined;
        let exports = WebpackMock.clientExports(
          evaluate === null ? {value: node.module} : evaluate.promise,
          name,
          name + '.js',
          load.promise,
        );
        let evaluateEvent = null;
        if (evaluate !== null) {
          // Awaiting the module proxy marks this as an async import.
          exports = await exports;
          evaluateEvent = createEvent(
            'evaluate ' + name,
            () =>
              evaluationError !== undefined
                ? evaluate.reject(evaluationError)
                : evaluate.resolve({value: node.module}),
            {error: evaluationError, isClient: true},
          );
          events.push(evaluateEvent);
        }
        const reference = exports.value;
        values[name] = reference;
        valueMetadata.set(reference, {type: 'module', value: node.module});
        const loadEvent = createEvent(
          (loadError !== undefined ? 'reject ' : 'load ') + name,
          () =>
            loadError !== undefined ? load.reject(loadError) : load.resolve(),
          {error: loadError, isClient: true},
        );
        events.push(loadEvent);
        if (evaluateEvent !== null) {
          evaluateEvent.after = loadEvent;
        }
        requiredEvents.set(
          reference,
          evaluateEvent === null ? [loadEvent] : [loadEvent, evaluateEvent],
        );
        break;
      }
      case 'error':
        if (node.errors === undefined) {
          values[name] = createError(node.error);
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
        const deferred = createResolvablePromise();
        trackPromise(deferred.promise);
        deferredPromises.set(name, deferred);
        values[name] = deferred.promise;
        break;
      }
      default:
        break;
    }
  }
  // Build values that need existing arguments, props, or stream items.
  const buildingValues = new Set();
  const buildValue = name => {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      return values[name];
    }
    if (!Object.prototype.hasOwnProperty.call(nodes, name)) {
      return getValue(name);
    }
    if (buildingValues.has(name)) {
      throw new Error(
        name + ' must be constructed before its own dependencies',
      );
    }
    buildingValues.add(name);
    const node = nodes[name];
    switch (getNodeType(node)) {
      case 'iterator':
        values[name] = createIterator(node.iterator.map(buildValue));
        break;
      case 'error':
        values[name] = createAggregateError(
          node.error,
          node.errors.map(buildValue),
        );
        break;
      case 'fragment':
        values[name] = createFragment(node.fragment.map(buildValue), {
          key: name,
        });
        break;
      case 'bound':
        values[name] = createServerFunction((...args) => args, {
          bound: node.bound.map(buildValue),
          label: name,
          loaded: node.loaded === true,
          loadError: node.reject
            ? new Error('module ' + name + ' failed to load')
            : undefined,
        });
        break;
      case 'element': {
        // Give generated elements keys to avoid array-key warnings.
        const props = Array.isArray(node.element)
          ? {
              value: buildValue(node.element[0]),
              other: buildValue(node.element[1]),
            }
          : {value: buildValue(node.element)};
        values[name] = createClientElement(props, {name, key: name});
        break;
      }
      case 'stream':
        values[name] = node.cancel
          ? createCanceledStream(node.stream.map(buildValue), {label: name})
          : createStream(node.stream.map(buildValue), {
              label: name,
              failure:
                node.fail === undefined ? undefined : getError(node.fail),
            });
        break;
      case 'bytes':
        values[name] = createByteStream(
          Array.from({length: node.bytes}, (_, i) => new Uint8Array([i, 7])),
          {label: name},
        );
        break;
      case 'iterable':
        values[name] = createAsyncIterable(
          node.iterable.map(buildValue),
          node.returns === undefined ? undefined : buildValue(node.returns),
          {label: name, single: node.single === true},
        );
        break;
      case 'component': {
        if (node.throw) {
          const error = getError(node.component);
          values[name] = createServerElement(
            undefined,
            () => {
              throw error;
            },
            {label: name, failure: error, key: name},
          );
        } else {
          const renderedElement = createClientElement(
            {value: buildValue(node.component)},
            {name: name + ' body'},
          );
          values[name] = createServerElement(
            valueMetadata.get(renderedElement).html,
            () => renderedElement,
            {label: name, key: name, renderedElement},
          );
        }
        break;
      }
      case 'props': {
        const element = buildValue(node.props);
        const metadata = valueMetadata.get(element);
        if (metadata === undefined || metadata.type !== 'element') {
          throw new Error(node.props + ' is not an element node');
        }
        values[name] = element.props;
        break;
      }
      default:
        break;
    }
    buildingValues.delete(name);
    return values[name];
  };
  for (const name in nodes) {
    buildValue(name);
  }
  for (const name in nodes) {
    const node = nodes[name];
    switch (getNodeType(node)) {
      case 'array':
        node.array.forEach(item => values[name].push(getValue(item)));
        break;
      case 'object':
        Object.keys(node.object).forEach(key => {
          values[name][key] = getValue(node.object[key]);
        });
        break;
      case 'set':
        node.set.forEach(item => values[name].add(getValue(item)));
        break;
      case 'map':
        node.map.forEach(([key, item]) => {
          if (values[name].has(getValue(key))) {
            throw new Error(
              name + ' has two entries for the same source Map key',
            );
          }
          values[name].set(getValue(key), getValue(item));
        });
        break;
      case 'error':
        if (node.cause !== undefined) {
          values[name].cause = getValue(node.cause);
        }
        break;
      case 'stream':
        if (
          node.fail !== undefined &&
          !node.cancel &&
          serializedNodes.has(name)
        ) {
          expectedErrors.set(getError(node.fail), 'failing ' + name);
        }
        break;
      case 'component':
        if (node.throw && serializedNodes.has(name)) {
          expectedErrors.set(getError(node.component), 'thrown by ' + name);
        }
        break;
      case 'promise': {
        const deferred = deferredPromises.get(name);
        if (node.reject) {
          const error = getError(node.promise);
          events.push(
            createEvent('reject ' + name, () => {
              expectedErrors.set(error, 'rejecting ' + name);
              deferred.reject(error);
            }),
          );
        } else {
          const target = getValue(node.promise);
          events.push(
            createEvent('resolve ' + name + ' to ' + node.promise, () =>
              deferred.resolve(target),
            ),
          );
        }
        break;
      }
      default:
        break;
    }
  }

  // Other results must be able to finish while this Promise is still pending.
  const unrelated = createResolvablePromise();
  trackPromise(unrelated.promise);
  const unrelatedEvent = createEvent('resolve an unrelated Promise', () =>
    unrelated.resolve('end'),
  );
  events.push(unrelatedEvent);
  const model = {
    entry: getValue(graph.roots.entry),
    other: getValue(graph.roots.other),
    // Include all Promises so a rejected parent can't hide their results.
    outcomes: Array.from(
      deferredPromises.values(),
      deferred => deferred.promise,
    ),
    unrelated: unrelated.promise,
  };
  let rootPromise = null;
  if (graph.rootPromise) {
    const root = createResolvablePromise();
    trackPromise(root.promise);
    rootPromise = root.promise;
    events.unshift(
      createEvent('resolve the root Promise', () => root.resolve(model)),
    );
  }
  const fixture = {
    model: rootPromise === null ? model : rootPromise,
    events,
    requiredEvents,
    valueMetadata,
    bytes,
    expectedErrors,
    unrelatedEvent,
    rootPromise,
    resolvedModel: rootPromise === null ? null : model,
  };

  function trackPromise(promise) {
    // Track native settlement without relying on React's thenable fields.
    const metadata = {
      type: 'promise',
      state: 'pending',
      value: undefined,
      reason: undefined,
    };
    valueMetadata.set(promise, metadata);
    promise.then(
      value => {
        metadata.state = 'fulfilled';
        metadata.value = value;
      },
      reason => {
        metadata.state = 'rejected';
        metadata.reason = reason;
      },
    );
  }

  function createServerFunction(
    implementation,
    {bound = [], label, loadError, loaded = false} = {},
  ) {
    const ready = loaded ? null : createResolvablePromise();
    const exported = WebpackMock.serverExports(
      {fn: implementation},
      ready === null ? undefined : ready.promise,
    );
    const reference = exported.fn;
    const fn = bound.length ? reference.bind(null, ...bound) : reference;
    const result = implementation(...bound);
    valueMetadata.set(fn, {type: 'function', bound, args: [], result});
    if (ready === null) {
      return fn;
    }
    const event = createEvent(
      (loadError !== undefined ? 'reject ' : 'load ') +
        (label || 'server function'),
      () =>
        loadError !== undefined ? ready.reject(loadError) : ready.resolve(),
      {isClient: true, error: loadError},
    );
    events.push(event);
    requiredEvents.set(fn, [event]);
    return fn;
  }

  function createClientElement(props, {name, key} = {}) {
    const id = name || 'component-' + valueMetadata.size;
    const load = createResolvablePromise();
    const Component = receivedProps => {
      observeProps(element, receivedProps);
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
    valueMetadata.set(element, {
      type: 'element',
      html: '<span>' + id + '</span>',
    });
    const loadEvent = createEvent('load ' + id, () => load.resolve(), {
      isClient: true,
    });
    events.push(loadEvent);
    requiredEvents.set(element, [loadEvent]);
    return element;
  }

  // Suspend the Server Component until the test releases its render event.
  function createServerElement(
    html,
    render,
    {label = 'server component', failure, key, renderedElement} = {},
  ) {
    const deferred = createResolvablePromise();
    async function Body() {
      await deferred.promise;
      return render();
    }
    const element = ReactServer.createElement(
      Body,
      key === undefined ? null : {key},
    );
    const renderEvent = createEvent('render ' + label, () =>
      deferred.resolve(),
    );
    events.push(renderEvent);
    valueMetadata.set(element, {
      type: 'element',
      html,
      failure,
      renderEvent,
      renderedElement,
    });
    requiredEvents.set(element, [
      renderEvent,
      ...(renderedElement === undefined
        ? []
        : requiredEvents.get(renderedElement) || []),
    ]);
    return element;
  }

  function createByteStream(chunks, {label = 'bytes'} = {}) {
    let controller;
    let produced = 0;
    const stream = new ReadableStream({
      type: 'bytes',
      start: c => (controller = c),
    });
    const streamEvents = [];
    const pump = () => {
      while (produced < chunks.length && streamEvents[produced].released) {
        controller.enqueue(chunks[produced++].slice());
      }
      if (produced === chunks.length) {
        controller.close();
      }
    };
    for (let i = 0; i < chunks.length; i++) {
      streamEvents.push(createEvent(label + ' chunk ' + i, pump));
    }
    events.push(...streamEvents);
    valueMetadata.set(stream, {type: 'bytes', chunks, events: streamEvents});
    return stream;
  }

  // Client-side cancellation must not break later server writes.
  function createCanceledStream(items, {label = 'canceled stream'} = {}) {
    let controller;
    const stream = new ReadableStream({
      start(c) {
        controller = c;
        controller.enqueue(items[0]);
      },
    });
    events.push(
      createEvent('enqueue into ' + label + ' after cancellation', () => {
        controller.enqueue({discarded: true});
        controller.close();
      }),
    );
    valueMetadata.set(stream, {type: 'canceled', first: items[0]});
    return stream;
  }

  function createHostElement(type, props, html) {
    const element = ReactServer.createElement(type, props);
    valueMetadata.set(element, {type: 'element', html});
    return element;
  }

  function createFragment(children, {key}) {
    const element = ReactServer.createElement(
      ReactServer.Fragment,
      {key},
      ...children,
    );
    valueMetadata.set(element, {
      type: 'element',
      html: children.map(child => valueMetadata.get(child).html).join(''),
    });
    return element;
  }

  // Events can be released out of order, but stream items must be enqueued
  // in order. The last event closes or errors the stream.
  function createStream(items, {label = 'stream', failure} = {}) {
    let controller;
    let produced = 0;
    const stream = new ReadableStream({start: c => (controller = c)});
    const streamEvents = [];
    const pump = () => {
      while (produced < items.length && streamEvents[produced].released) {
        controller.enqueue(items[produced++]);
      }
      if (produced === items.length && streamEvents[items.length].released) {
        if (failure === undefined) {
          controller.close();
        } else {
          controller.error(failure);
        }
      }
    };
    for (let i = 0; i < items.length; i++) {
      streamEvents.push(createEvent(label + ' item ' + i, pump));
    }
    streamEvents.push(
      createEvent((failure === undefined ? 'close ' : 'fail ') + label, pump),
    );
    events.push(...streamEvents);
    valueMetadata.set(stream, {
      type: 'stream',
      items,
      events: streamEvents,
      failure,
    });
    return stream;
  }

  function createAsyncIterable(
    items,
    returnValue,
    {label = 'iterable', single = false} = {},
  ) {
    const deferredResults = Array.from({length: items.length + 1}, () =>
      createResolvablePromise(),
    );
    const iterationEvents = deferredResults.map((deferred, i) =>
      createEvent(
        i === items.length
          ? 'return ' + label
          : i === 0
            ? 'start ' + label
            : label + ' item ' + i,
        () => deferred.resolve(),
      ),
    );
    const iterableSource = {
      async *[Symbol.asyncIterator]() {
        for (let i = 0; i < items.length; i++) {
          await deferredResults[i].promise;
          yield items[i];
        }
        await deferredResults[items.length].promise;
        return returnValue;
      },
    };
    const iterable = single
      ? iterableSource[Symbol.asyncIterator]()
      : iterableSource;
    events.push(...iterationEvents);
    valueMetadata.set(iterable, {
      type: 'iterable',
      items,
      returnValue,
      events: iterationEvents,
      single,
    });
    return iterable;
  }

  // The writer copies a sync iterator into an array, so its return value is
  // not transmitted.
  function createIterator(items) {
    const iterator = items[Symbol.iterator]();
    valueMetadata.set(iterator, {type: 'iterator', items});
    return iterator;
  }

  function createError(message, options) {
    const error = new Error(message, options);
    // Server rejections are matched by digest in both modes.
    const digest = 'digest:' + message;
    valueMetadata.set(error, {type: 'error', digest});
    return error;
  }

  function createAggregateError(message, errors) {
    const error = new AggregateError(errors, message);
    valueMetadata.set(error, {
      type: 'error',
      digest: 'digest:' + message,
    });
    return error;
  }

  function saveBytes(value) {
    // The writer may detach ArrayBuffers. Keep a copy of their bytes.
    const view =
      value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    bytes.set(value, Array.from(view));
  }

  return fixture;
}

function checkReachability(graph) {
  const {nodes} = graph;
  // Keep source references valid even when production omits Error properties.
  const reached = getReachableNodes(graph);
  Object.keys(nodes).forEach(name => {
    if (!reached.has(name)) {
      throw new Error(name + ' is not reachable from the roots');
    }
  });
}

function createEvent(label, run, {error, isClient = false} = {}) {
  return {label, run, released: false, error, isClient, after: undefined};
}

function createResolvablePromise() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  // Prevent unhandled rejections before the reader has subscribed.
  promise.then(undefined, () => {});
  return {promise, resolve, reject};
}

module.exports = {createFixture};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const nodeTypes = [
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

function getNodeType(node) {
  const type = nodeTypes.find(candidate => candidate in node);
  if (type === undefined) {
    throw new Error('A graph node has none of: ' + nodeTypes.join(', '));
  }
  return type;
}

function getReferencedNodes(node) {
  switch (getNodeType(node)) {
    case 'array':
    case 'set':
    case 'iterator':
    case 'bound':
    case 'stream':
      return node[getNodeType(node)]
        .concat('returns' in node ? [node.returns] : [])
        .concat(typeof node.fail === 'string' ? [node.fail] : []);
    case 'object':
      return Object.values(node.object);
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
      return [node[getNodeType(node)]];
    case 'error':
      return (node.cause === undefined ? [] : [node.cause]).concat(
        node.errors === undefined ? [] : node.errors,
      );
    default:
      return [];
  }
}

function getReachableNodes(
  graph,
  {roots = Object.values(graph.roots), includeErrorProperties = true} = {},
) {
  const reached = new Set();
  const todo = roots.slice();
  while (todo.length > 0) {
    const name = todo.pop();
    const node = graph.nodes[name];
    if (!reached.has(name) && node !== undefined) {
      reached.add(name);
      if (includeErrorProperties || getNodeType(node) !== 'error') {
        todo.push(...getReferencedNodes(node));
      }
    }
  }
  return reached;
}

const specialValueFactories = {
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
  // Larger than a packet, to exercise fragmented binary data.
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

async function createFixture(
  graph,
  {React, ReactServer, WebpackMock, observeProps},
) {
  checkReachability(graph);
  const {nodes} = graph;
  const serializedNodes = getReachableNodes(graph, {
    roots: Object.values(graph.roots).concat(
      Object.keys(nodes).filter(name => getNodeType(nodes[name]) === 'promise'),
    ),
    includeErrorProperties: __DEV__,
  });
  const values = {};
  const events = [];
  const valueMetadata = new Map();
  const requiredEvents = new Map();
  const deferredPromises = new Map();
  const expectedErrors = new Map();
  const bytes = new Map();

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

  const getValue = name => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error('The graph refers to ' + name + ', which is not a node');
    }
    return values[name];
  };

  // Allocate containers first so named references share the source object.
  for (const name in nodes) {
    const node = nodes[name];
    if (Object.prototype.hasOwnProperty.call(node, 'value')) {
      values[name] = node.value;
    } else if (node.date !== undefined) {
      values[name] = new Date(node.date);
    } else if (node.binary !== undefined) {
      values[name] = new Uint8Array([node.binary, 10, 255]);
      saveBytes(values[name]);
    } else if (node.text !== undefined) {
      values[name] = node.text + '🙂'.repeat(400);
    } else if (node.blob !== undefined) {
      values[name] = new Blob([node.blob], {type: 'text/plain'});
    } else if (node.special !== undefined) {
      const factory = specialValueFactories[node.special];
      if (
        !Object.prototype.hasOwnProperty.call(
          specialValueFactories,
          node.special,
        )
      ) {
        throw new Error('Unsupported special value: ' + node.special);
      }
      values[name] = factory();
      if (
        values[name] instanceof ArrayBuffer ||
        ArrayBuffer.isView(values[name])
      ) {
        saveBytes(values[name]);
      }
    } else if (node.host !== undefined) {
      values[name] = createHostElement(
        'span',
        {title: node.host},
        '<span title="' + node.host + '"></span>',
      );
    } else if (node.module !== undefined) {
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
    } else if (node.error !== undefined) {
      if (node.errors === undefined) {
        values[name] = createError(node.error);
      }
    } else if (node.object !== undefined) {
      values[name] = {};
    } else if (node.array !== undefined) {
      values[name] = [];
    } else if (node.set !== undefined) {
      values[name] = new Set();
    } else if (node.map !== undefined) {
      values[name] = new Map();
    } else if (node.promise !== undefined) {
      const deferred = createResolvablePromise();
      trackPromise(deferred.promise);
      deferredPromises.set(name, deferred);
      values[name] = deferred.promise;
    } else if (
      node.iterator === undefined &&
      node.stream === undefined &&
      node.iterable === undefined &&
      node.bytes === undefined &&
      node.bound === undefined &&
      node.element === undefined &&
      node.fragment === undefined &&
      node.props === undefined &&
      node.component === undefined
    ) {
      throw new Error('Unsupported node: ' + name);
    }
  }
  // Sequences need their items, but containers may refer back to them.
  const buildingValues = new Set();
  function buildValue(name) {
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
    if (node.errors !== undefined) {
      values[name] = createAggregateError(
        node.error,
        node.errors.map(buildValue),
      );
    } else if (node.component !== undefined) {
      if (node.throw) {
        const error = buildValue(node.component);
        if (!(error instanceof Error)) {
          throw new Error(
            node.component + ' is used as an Error but is not an error node',
          );
        }
        values[name] = createServerElement(
          undefined,
          () => {
            expectedErrors.set(error, 'thrown by ' + name);
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
    } else if (node.element !== undefined) {
      const props = Array.isArray(node.element)
        ? {
            value: buildValue(node.element[0]),
            other: buildValue(node.element[1]),
          }
        : {value: buildValue(node.element)};
      values[name] = createClientElement(props, {name, key: name});
    } else if (node.fragment !== undefined) {
      values[name] = createFragment(node.fragment.map(buildValue), {key: name});
    } else if (node.props !== undefined) {
      const element = buildValue(node.props);
      const metadata = valueMetadata.get(element);
      if (metadata === undefined || metadata.type !== 'element') {
        throw new Error(node.props + ' is not an element node');
      }
      values[name] = element.props;
    } else if (node.bound !== undefined) {
      values[name] = createServerFunction((...args) => args, {
        bound: node.bound.map(buildValue),
        label: name,
        loaded: node.loaded === true,
        loadError: node.reject
          ? new Error('module ' + name + ' failed to load')
          : undefined,
      });
    } else if (node.iterator !== undefined) {
      const items = node.iterator.map(buildValue);
      const iterator = items[Symbol.iterator]();
      values[name] = iterator;
      valueMetadata.set(iterator, {type: 'iterator', items});
    } else if (node.stream !== undefined) {
      const failure =
        node.fail === undefined ? undefined : buildValue(node.fail);
      if (failure !== undefined && !(failure instanceof Error)) {
        throw new Error(
          node.fail + ' is used as an Error but is not an error node',
        );
      }
      values[name] = node.cancel
        ? createCanceledStream(node.stream.map(buildValue), {label: name})
        : createStream(node.stream.map(buildValue), {label: name, failure});
    } else if (node.bytes !== undefined) {
      values[name] = createByteStream(
        Array.from({length: node.bytes}, (_, i) => new Uint8Array([i, 7])),
        {label: name},
      );
    } else if (node.iterable !== undefined) {
      values[name] = createAsyncIterable(
        node.iterable.map(buildValue),
        node.returns === undefined ? undefined : buildValue(node.returns),
        {label: name, single: node.single === true},
      );
    }
    buildingValues.delete(name);
    return values[name];
  }
  for (const name in nodes) {
    buildValue(name);
  }
  for (const name in nodes) {
    const node = nodes[name];
    if (node.object !== undefined) {
      Object.keys(node.object).forEach(key => {
        values[name][key] = getValue(node.object[key]);
      });
    } else if (node.array !== undefined) {
      node.array.forEach(item => values[name].push(getValue(item)));
    } else if (node.set !== undefined) {
      node.set.forEach(item => values[name].add(getValue(item)));
    } else if (node.map !== undefined) {
      node.map.forEach(([key, value]) => {
        if (values[name].has(getValue(key))) {
          throw new Error(
            name + ' has two entries for the same source Map key',
          );
        }
        values[name].set(getValue(key), getValue(value));
      });
    } else if (node.error !== undefined && node.cause !== undefined) {
      values[name].cause = getValue(node.cause);
    } else if (node.promise !== undefined) {
      const deferred = deferredPromises.get(name);
      if (node.reject) {
        const error = getValue(node.promise);
        if (!(error instanceof Error)) {
          throw new Error(
            node.promise + ' is used as an Error but is not an error node',
          );
        }
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
    }
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
          if (serializedNodes.has(label)) {
            expectedErrors.set(failure, 'failing ' + label);
          }
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
    // The writer may detach source buffers. Save only the exposed view bytes.
    const view =
      value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    bytes.set(value, Array.from(view));
  }

  // Ready results must arrive while this independent source keeps EOF open.
  const unrelated = createResolvablePromise();
  trackPromise(unrelated.promise);
  const unrelatedEvent = createEvent('resolve an unrelated Promise', () =>
    unrelated.resolve('end'),
  );
  events.push(unrelatedEvent);
  const model = {
    entry: getValue(graph.roots.entry),
    other: getValue(graph.roots.other),
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
  return {
    model: rootPromise === null ? model : rootPromise,
    resolvedModel: rootPromise === null ? null : model,
    rootPromise,
    events,
    valueMetadata,
    requiredEvents,
    unrelatedEvent,
    expectedErrors,
    bytes,
  };
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
  // The source may fail before the reader has subscribed.
  promise.then(undefined, () => {});
  return {promise, resolve, reject};
}

module.exports = {createFixture};

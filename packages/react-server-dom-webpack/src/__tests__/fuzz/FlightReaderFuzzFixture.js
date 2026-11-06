/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

async function createFixture(graph, {WebpackMock}) {
  const {nodes} = graph;
  const values = {};
  const events = [];
  const valueMetadata = new Map();
  const requiredEvents = new Map();
  const deferredPromises = new Map();
  const expectedErrors = new Map();

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
      const error = new Error(node.error);
      values[name] = error;
      valueMetadata.set(error, {type: 'error', digest: 'digest:' + node.error});
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
    } else if (node.iterator === undefined) {
      throw new Error('Unsupported node: ' + name);
    }
  }
  // Iterators need their arguments, but containers may refer back to them.
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
    const items = nodes[name].iterator.map(buildValue);
    const iterator = items[Symbol.iterator]();
    values[name] = iterator;
    valueMetadata.set(iterator, {type: 'iterator', items});
    buildingValues.delete(name);
    return iterator;
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
  };
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

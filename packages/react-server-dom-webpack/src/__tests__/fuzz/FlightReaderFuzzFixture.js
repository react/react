/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

function createFixture(graph, {WebpackMock}) {
  const {nodes} = graph;
  const values = {};
  const events = [];
  const valueMetadata = new Map();
  const requiredEvents = new Map();
  const deferredPromises = new Map();

  function trackPromise(promise) {
    // Track native settlement without relying on React's thenable fields.
    const metadata = {type: 'promise', state: 'pending', value: undefined};
    valueMetadata.set(promise, metadata);
    promise.then(value => {
      metadata.state = 'fulfilled';
      metadata.value = value;
    });
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
    if (node.module !== undefined) {
      const load = createResolvablePromise();
      const error =
        node.fail === 'load'
          ? new Error('module ' + name + ' failed to load')
          : undefined;
      const {value} = WebpackMock.clientExports(
        {value: node.module},
        name,
        name + '.js',
        load.promise,
      );
      values[name] = value;
      valueMetadata.set(value, {type: 'module', value: node.module});
      const event = createEvent(
        (error !== undefined ? 'reject ' : 'load ') + name,
        () => (error !== undefined ? load.reject(error) : load.resolve()),
        {error, isClient: true},
      );
      events.push(event);
      requiredEvents.set(value, [event]);
    } else if (node.object !== undefined) {
      values[name] = {};
    } else if (node.promise !== undefined) {
      const deferred = createResolvablePromise();
      trackPromise(deferred.promise);
      deferredPromises.set(name, deferred);
      values[name] = deferred.promise;
    } else {
      throw new Error('Unsupported node: ' + name);
    }
  }
  for (const name in nodes) {
    const node = nodes[name];
    if (node.object !== undefined) {
      Object.keys(node.object).forEach(key => {
        values[name][key] = getValue(node.object[key]);
      });
    } else if (node.promise !== undefined) {
      const target = getValue(node.promise);
      events.push(
        createEvent('resolve ' + name + ' to ' + node.promise, () =>
          deferredPromises.get(name).resolve(target),
        ),
      );
    }
  }

  // Ready results must arrive while this independent source keeps EOF open.
  const unrelated = createResolvablePromise();
  trackPromise(unrelated.promise);
  const unrelatedEvent = createEvent('resolve an unrelated Promise', () =>
    unrelated.resolve('end'),
  );
  events.push(unrelatedEvent);
  return {
    model: {
      entry: getValue(graph.roots.entry),
      other: getValue(graph.roots.other),
      outcomes: Array.from(
        deferredPromises.values(),
        deferred => deferred.promise,
      ),
      unrelated: unrelated.promise,
    },
    events,
    valueMetadata,
    requiredEvents,
    unrelatedEvent,
  };
}

function createEvent(label, run, {error, isClient = false} = {}) {
  return {label, run, released: false, error, isClient};
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

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

// These controls exercise the shared checker without running React.
const {createOracle} = require('./fuzz/FlightReaderOracle');

const tick = () => new Promise(resolve => setImmediate(resolve));

// Control client delivery independently of source readiness so a broken reader
// can be reproduced even when the real reader handles the graph correctly.
function createTestOracle(source, options = {}) {
  const oracle = createOracle({
    model: source,
    valueMetadata: new Map(),
    requiredEvents: new Map(),
    ...options,
  });
  let resolve;
  let reject;
  oracle.subscribeToRoot(
    {
      then(onFulfill, onReject) {
        resolve = onFulfill;
        reject = onReject;
      },
    },
    source,
  );
  return {oracle, resolve, reject};
}

describe('FlightReaderOracle', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  // Visiting source identities only would miss corruption in a later copy.
  it('rechecks every received copy of a source cycle', async () => {
    const source = {value: 'expected'};
    source.next = source;
    const copy = {value: 'expected'};
    copy.next = copy;
    const received = {value: 'expected', next: copy};
    const oracle = createOracle();
    oracle.observeValue(source, received);
    await oracle.checkForMutations();

    copy.value = 'changed';
    await expect(oracle.checkForMutations()).rejects.toThrow('.next.value');
    expect(() => createOracle().observeValue(source, received)).toThrow();
  });

  // Equal contents must not allow one received identity to merge two sources.
  it('rejects merging equal but distinct source objects', () => {
    const source = {a: {value: 1}, b: {value: 1}};
    createOracle().observeValue(source, {a: {value: 1}, b: {value: 1}});

    const merged = {value: 1};
    expect(() =>
      createOracle().observeValue(source, {a: merged, b: merged}),
    ).toThrow('two distinct source objects');
  });

  // Eventual value equality alone accepts both early delivery and missing
  // wakeups. Two inputs distinguish partial readiness from full readiness.
  it('requires delivery only after all inputs arrive', () => {
    const first = {};
    const second = {};
    const firstLoad = {released: false};
    const secondLoad = {released: false};
    const source = {first, second};
    const options = {
      valueMetadata: new Map([
        [first, {type: 'module', value: 'first'}],
        [second, {type: 'module', value: 'second'}],
      ]),
      requiredEvents: new Map([
        [first, [firstLoad]],
        [second, [secondLoad]],
      ]),
    };
    const {oracle, resolve} = createTestOracle(source, options);
    expect(oracle.getMissingResults()).toEqual([]);
    expect(oracle.isComplete()).toBe(false);
    firstLoad.released = true;
    expect(oracle.getMissingResults()).toEqual([]);

    const early = createTestOracle(source, options);
    early.resolve({first: 'first', second: 'second'});
    expect(() => early.oracle.throwIfFailed()).toThrow(
      'Delivered before its inputs arrived',
    );

    const rejected = createTestOracle(source, options);
    const reason = new TypeError('decoding failed');
    rejected.reject(reason);
    expect(() => rejected.oracle.throwIfFailed()).toThrow(
      'unexpected rejection: TypeError: decoding failed',
    );
    expect(() => rejected.oracle.throwIfFailed()).toThrow(
      expect.objectContaining({cause: reason}),
    );

    secondLoad.released = true;
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root',
    ]);
    resolve({first: 'first', second: 'second'});
    expect(oracle.isComplete()).toBe(true);
  });

  // Waiting for all inputs hides an error wakeup. Matching only its message
  // also accepts a different local error that the failed module never threw.
  it('requires the actual input error without waiting for other inputs', () => {
    const first = {};
    const second = {};
    const error = new Error('load failed');
    const source = {first, second};
    const options = {
      valueMetadata: new Map([
        [first, {type: 'module', value: 'first'}],
        [second, {type: 'module', value: 'second'}],
      ]),
      requiredEvents: new Map([
        [first, [{released: true, error}]],
        [second, [{released: false}]],
      ]),
    };
    const {oracle, reject} = createTestOracle(source, options);
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root',
    ]);
    reject(error);
    expect(oracle.isComplete()).toBe(true);

    const wrongError = createTestOracle(source, options);
    wrongError.reject(new Error('load failed'));
    expect(() => wrongError.oracle.throwIfFailed()).toThrow('root: rejected');

    const fulfilled = createTestOracle(source, options);
    fulfilled.resolve({first: 'first', second: 'second'});
    expect(() => fulfilled.oracle.throwIfFailed()).toThrow(
      'expected a rejection',
    );
  });

  // A reason of undefined must not be treated as a fulfilled undefined value.
  it('distinguishes rejection with undefined from fulfillment', () => {
    const valid = createTestOracle(undefined);
    valid.resolve(undefined);
    expect(valid.oracle.isComplete()).toBe(true);

    const invalid = createTestOracle(undefined);
    invalid.reject(undefined);
    expect(() => invalid.oracle.throwIfFailed()).toThrow(
      'unexpected rejection: undefined',
    );
  });

  // Server messages and identities can change across the transport. A matching
  // digest is required, and rejection cannot pass as undefined fulfillment.
  it('matches a rejected source Promise by its recorded server digest', async () => {
    const source = {};
    const reason = new Error('expected failure');
    const metadata = {
      type: 'promise',
      state: 'pending',
      value: undefined,
      reason: undefined,
    };
    const options = {
      valueMetadata: new Map([
        [source, metadata],
        [reason, {type: 'error', digest: 'digest:expected failure'}],
      ]),
    };
    const {oracle, resolve} = createTestOracle(source, options);
    let rejectPromise;
    resolve(new Promise((unused, reject) => (rejectPromise = reject)));
    expect(oracle.getMissingResults()).toEqual([]);
    const clientError = Object.assign(new Error('different client message'), {
      digest: 'digest:expected failure',
    });

    const early = createTestOracle(source, options);
    early.resolve(Promise.reject(clientError));
    await tick();
    expect(() => early.oracle.throwIfFailed()).toThrow('unexpected rejection');

    metadata.state = 'rejected';
    metadata.reason = reason;
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.then',
    ]);
    rejectPromise(clientError);
    await tick();
    expect(oracle.isComplete()).toBe(true);

    const wrongDigest = createTestOracle(source, options);
    wrongDigest.resolve(
      Promise.reject(
        Object.assign(new Error('expected failure'), {
          digest: 'wrong',
        }),
      ),
    );
    await tick();
    expect(() => wrongDigest.oracle.throwIfFailed()).toThrow(
      'expected digest digest:expected failure',
    );

    const fulfilled = createTestOracle(source, options);
    fulfilled.resolve(Promise.resolve(undefined));
    await tick();
    expect(() => fulfilled.oracle.throwIfFailed()).toThrow(
      'expected a rejection',
    );
  });

  // A single subscription cannot deliver twice, even with the same value.
  it('rejects a second call to a settlement callback', () => {
    const {oracle, resolve} = createTestOracle('value');
    resolve('value');
    expect(oracle.isComplete()).toBe(true);
    resolve('value');
    expect(() => oracle.throwIfFailed()).toThrow();
  });

  // Structural equality would miss a thenable returning a new object later.
  it('requires repeated subscriptions to receive the same object', () => {
    const source = {value: 'expected'};
    let result = {value: 'expected'};
    const thenable = {then: onFulfill => onFulfill(result)};
    const {oracle, resolve} = createTestOracle(source);
    resolve(result);
    oracle.subscribeToRoot(thenable, source, {subscribeAgain: true});
    expect(oracle.isComplete()).toBe(true);

    result = {value: 'expected'};
    oracle.subscribeToRoot(thenable, source);
    expect(() => oracle.throwIfFailed()).toThrow('changed its settlement');
  });

  // A root can be correct while its nested Promise never wakes up, resolves
  // too early, or hands out an object that is corrupted after delivery.
  it('requires a Promise result when ready and rechecks it after delivery', async () => {
    const source = {};
    const metadata = {
      type: 'promise',
      state: 'pending',
      value: {value: 'expected'},
    };
    const options = {valueMetadata: new Map([[source, metadata]])};
    const {oracle, resolve} = createTestOracle(source, options);
    let resolvePromise;
    resolve(new Promise(done => (resolvePromise = done)));
    expect(oracle.getMissingResults()).toEqual([]);
    expect(oracle.isComplete()).toBe(false);

    const early = createTestOracle(source, options);
    early.resolve(Promise.resolve({value: 'expected'}));
    await tick();
    expect(() => early.oracle.throwIfFailed()).toThrow(
      'Delivered before its inputs arrived: root.then',
    );

    metadata.state = 'fulfilled';
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.then',
    ]);
    const received = {value: 'expected'};
    resolvePromise(received);
    await tick();
    expect(oracle.isComplete()).toBe(true);

    received.value = 'changed';
    await expect(oracle.checkForMutations()).rejects.toThrow('root.then');
  });

  // The graph's root also waits for its module, which can hide a checker that
  // ignores a nested module after the containing object has already arrived.
  it('waits for a fulfilled Promise result to finish loading its nested module', async () => {
    const promise = {};
    const module = {};
    const load = {released: false};
    const source = {promise};
    const options = {
      valueMetadata: new Map([
        [promise, {type: 'promise', state: 'fulfilled', value: {module}}],
        [module, {type: 'module', value: 'ready'}],
      ]),
      requiredEvents: new Map([[module, [load]]]),
    };
    const {oracle, resolve} = createTestOracle(source, options);
    let resolvePromise;
    resolve({promise: new Promise(done => (resolvePromise = done))});
    expect(oracle.getMissingResults()).toEqual([]);
    expect(oracle.isComplete()).toBe(false);

    const early = createTestOracle(source, options);
    early.resolve({promise: Promise.resolve({module: 'ready'})});
    await tick();
    expect(() => early.oracle.throwIfFailed()).toThrow(
      'Delivered before its inputs arrived: root.promise.then',
    );

    load.released = true;
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.promise.then',
    ]);
    resolvePromise({module: 'ready'});
    await tick();
    expect(oracle.isComplete()).toBe(true);
    await expect(oracle.checkForMutations()).resolves.toBeUndefined();
  });

  // Rechecking must reject a replacement instead of silently subscribing and
  // accepting the replacement's eventual equal result.
  it('rejects replacing an observed Promise without subscribing to the replacement', async () => {
    const promise = {};
    const {oracle, resolve} = createTestOracle(
      {promise},
      {
        valueMetadata: new Map([
          [promise, {type: 'promise', state: 'fulfilled', value: 'value'}],
        ]),
      },
    );
    const received = {promise: Promise.resolve('value')};
    resolve(received);
    await tick();
    expect(oracle.isComplete()).toBe(true);
    await expect(oracle.checkForMutations()).resolves.toBeUndefined();

    received.promise = Promise.resolve('value');
    const then = jest.spyOn(received.promise, 'then');
    await expect(oracle.checkForMutations()).rejects.toThrow('was replaced');
    expect(then).not.toHaveBeenCalled();
  });
  // A future result cannot lend its error. Once produced, that same owner can
  // legitimately reject a reference even while a local module is still loading.
  it('accepts a produced owner error while local inputs are still pending', () => {
    const shared = {};
    const ready = {};
    const failed = {};
    const loading = {};
    const failing = {};
    const error = new Error('owner failed');
    const failure = {released: true, error};
    const failingMetadata = {
      type: 'promise',
      state: 'pending',
      value: {shared, failed},
    };
    const source = [loading, failing];
    const options = {
      valueMetadata: new Map([
        [
          loading,
          {type: 'promise', state: 'fulfilled', value: {shared, ready}},
        ],
        [failing, failingMetadata],
        [ready, {type: 'module', value: 'ready'}],
        [failed, {type: 'module', value: 'failed'}],
      ]),
      requiredEvents: new Map([
        [ready, [{released: false}]],
        [failed, [failure]],
      ]),
    };
    const rejectWithError = () => ({
      then(onFulfill, onReject) {
        onReject(error);
      },
    });
    const early = createTestOracle(source, options);
    early.resolve([rejectWithError(), {then() {}}]);
    expect(() => early.oracle.throwIfFailed()).toThrow('unexpected rejection');

    failingMetadata.state = 'fulfilled';
    const valid = createTestOracle(source, options);
    valid.resolve([rejectWithError(), rejectWithError()]);
    expect(valid.oracle.isComplete()).toBe(true);
  });

  // An eligible owner does not authorize delivery to a consumer whose source
  // has not produced that value yet, even when its future value is known.
  it('waits for a source Promise before accepting errors from an eligible owner', () => {
    const owner = {};
    const consumer = {};
    const module = {};
    const shared = {module};
    const error = new Error('shared module failed');
    const consumerMetadata = {type: 'promise', state: 'pending', value: shared};
    const source = [owner, consumer];
    const options = {
      valueMetadata: new Map([
        [owner, {type: 'promise', state: 'fulfilled', value: shared}],
        [consumer, consumerMetadata],
        [module, {type: 'module', value: 'ready'}],
      ]),
      requiredEvents: new Map([[module, [{released: true, error}]]]),
    };
    const rejectWithError = () => ({
      then(onFulfill, onReject) {
        onReject(error);
      },
    });
    const early = createTestOracle(source, options);
    early.resolve([rejectWithError(), rejectWithError()]);
    expect(() => early.oracle.throwIfFailed()).toThrow(
      'root[1].then: unexpected rejection',
    );

    consumerMetadata.state = 'fulfilled';
    const valid = createTestOracle(source, options);
    valid.resolve([rejectWithError(), rejectWithError()]);
    expect(valid.oracle.isComplete()).toBe(true);
  });

  // Knowing the future root does not make it an error source. The same local
  // module error is legitimate only after the native root source produces it.
  it('waits for root source production before accepting its model error', async () => {
    const module = {};
    const source = {module};
    const error = new Error('future root module failed');
    let resolveSource;
    const rootPromise = new Promise(resolve => (resolveSource = resolve));
    const metadata = {type: 'promise', state: 'pending', value: undefined};
    rootPromise.then(value => {
      metadata.state = 'fulfilled';
      metadata.value = value;
    });
    const options = {
      model: rootPromise,
      resolvedModel: source,
      rootPromise,
      valueMetadata: new Map([
        [rootPromise, metadata],
        [module, {type: 'module', value: 'ready'}],
      ]),
      requiredEvents: new Map([[module, [{released: true, error}]]]),
    };
    const early = createTestOracle(source, options);
    expect(early.oracle.getMissingResults()).toEqual([]);
    early.reject(error);
    expect(() => early.oracle.throwIfFailed()).toThrow('unexpected rejection');

    resolveSource(source);
    await rootPromise;
    const valid = createTestOracle(source, options);
    expect(valid.oracle.getMissingResults().map(check => check.path)).toEqual([
      'root',
    ]);
    valid.reject(error);
    expect(valid.oracle.isComplete()).toBe(true);
  });

  // Requiring every locally ready result would hide the writer's valid choice
  // to reference a shared object from another still-loading result.
  it('keeps a shared value blocked while one possible containing model is loading', () => {
    const shared = {};
    const ready = {};
    const failed = {};
    const loading = {};
    const failing = {};
    const last = {};
    const load = {released: false};
    const failure = {released: true, error: new Error('module failed')};
    const {oracle, resolve} = createTestOracle([loading, failing, last], {
      valueMetadata: new Map([
        [
          loading,
          {type: 'promise', state: 'fulfilled', value: {shared, ready}},
        ],
        [
          failing,
          {type: 'promise', state: 'fulfilled', value: {shared, failed}},
        ],
        [last, {type: 'promise', state: 'fulfilled', value: shared}],
        [ready, {type: 'module', value: 'ready'}],
        [failed, {type: 'module', value: 'failed'}],
      ]),
      requiredEvents: new Map([
        [ready, [load]],
        [failed, [failure]],
      ]),
    });
    resolve([{then() {}}, {then() {}}, {then() {}}]);
    // Only the failing model must settle. shared could have been serialized
    // in the loading model, so the last Promise may still wait for it.
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root[1].then',
    ]);
    load.released = true;
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root[0].then',
      'root[1].then',
      'root[2].then',
    ]);
  });
});

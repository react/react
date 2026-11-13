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

// These controls check the shared checker and failure reproduction without React.
const {createOracle} = require('./fuzz/FlightReaderOracle');
const {
  shrinkGraph,
  formatGraphTest,
  formatReplayCommand,
} = require('./fuzz/FlightReaderFuzzGraph');

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

  it('rejects omitting an own property whose value is undefined', () => {
    const {oracle, resolve} = createTestOracle({value: undefined});
    resolve({});
    expect(() => oracle.throwIfFailed()).toThrow();
  });

  // A shared source object may decode to several copies. Visiting source
  // identities only would miss corruption in a later copy.
  it('rechecks every received copy of a shared source', async () => {
    const shared = {value: 'expected'};
    const source = {first: shared, second: shared};
    const copy = {value: 'expected'};
    const received = {first: {value: 'expected'}, second: copy};
    const oracle = createOracle();
    oracle.observeValue(source, received);
    await oracle.checkForMutations();

    copy.value = 'changed';
    await expect(oracle.checkForMutations()).rejects.toThrow('.second.value');
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

  // A cycle must decode to a structure that contains itself; a copy in its own
  // place is a correctness bug (it is how the Set-containing-null class shows up).
  it('rejects a self-cycle delivered as a copy by default', () => {
    const source = {};
    source.self = source;
    const copy = {};
    copy.self = copy;
    const received = {self: copy};
    expect(() => createOracle().observeValue(source, received)).toThrow(
      'cyclic source value decoded as a copy',
    );
  });

  it('rejects a Set that contains itself delivered as a copy by default', () => {
    const source = new Set();
    source.add(source);
    const copy = new Set();
    copy.add(copy);
    const received = new Set([copy]);
    expect(() => createOracle().observeValue(source, received)).toThrow(
      'cyclic source value decoded as a copy',
    );
  });

  it('rejects a Map that contains itself delivered as a copy by default', () => {
    const source = new Map();
    source.set('self', source);
    const copy = new Map();
    copy.set('self', copy);
    const received = new Map([['self', copy]]);
    expect(() => createOracle().observeValue(source, received)).toThrow(
      'cyclic source value decoded as a copy',
    );
  });

  // The props of a client element rendered by a Server Component serialize in
  // that component's output row, not the main model row. A cyclic value reachable
  // from another row may arrive there split: the outer prop is a copy whose inner
  // reference points back at the self-contained original. Like other sub-rows,
  // that split is tolerated by default and only rejected under strict identity.
  it('tolerates a cyclic prop split in a Server Component output row', () => {
    const cyclic = {};
    cyclic.self = cyclic;
    const renderedElement = {type: {name: 'Body'}, props: {value: cyclic}};
    const serverElement = {};
    const makeOracle = options =>
      createOracle(
        {
          model: serverElement,
          valueMetadata: new Map([
            [serverElement, {type: 'element', html: '', renderedElement}],
          ]),
          requiredEvents: new Map(),
        },
        options,
      );
    // The outer prop is a copy; following its cycle reaches the self-contained
    // original received object, not the copy itself.
    const original = {};
    original.self = original;
    const copy = {self: original};
    const oracle = makeOracle();
    oracle.observeProps(renderedElement, {value: copy});
    expect(() => oracle.throwIfFailed()).not.toThrow();
    const strict = makeOracle({strictIdentity: true});
    strict.observeProps(renderedElement, {value: copy});
    expect(() => strict.throwIfFailed()).toThrow(
      'cyclic source value decoded as a copy',
    );
  });

  // A client element that sits in the main model row keeps the strict cycle
  // guarantee: its props must still decode to a structure that contains itself.
  it('still rejects a cyclic prop split for a main model element', () => {
    const cyclic = {};
    cyclic.self = cyclic;
    const element = {type: {name: 'Component'}, props: {value: cyclic}};
    const oracle = createOracle({
      model: element,
      valueMetadata: new Map([[element, {type: 'element', html: ''}]]),
      requiredEvents: new Map(),
    });
    const original = {};
    original.self = original;
    const copy = {self: original};
    oracle.observeProps(element, {value: copy});
    expect(() => oracle.throwIfFailed()).toThrow(
      'cyclic source value decoded as a copy',
    );
  });

  // A client element carried in a tolerant sub-row (here a Promise result)
  // serializes its props in that sub-row, so a cyclic prop split is tolerated
  // there too. The element's props callback inherits the tolerance of the row in
  // which the element was observed.
  it('tolerates a cyclic prop split for an element in a Promise result row', async () => {
    const cyclic = {};
    cyclic.self = cyclic;
    const element = {type: {name: 'Comp'}, props: {value: cyclic}};
    const promise = {};
    const source = {promise};
    const original = {};
    original.self = original;
    const copy = {self: original};
    // Deliver the Promise's result (the element) so traverse records that the
    // element lives in a tolerant row, then run its props callback.
    const run = async strictIdentity => {
      const oracle = createOracle(
        {
          model: source,
          valueMetadata: new Map([
            [promise, {type: 'promise', state: 'fulfilled', value: element}],
            [element, {type: 'element', html: ''}],
          ]),
          requiredEvents: new Map(),
        },
        {render: () => new Promise(() => {}), strictIdentity},
      );
      let resolveRoot;
      oracle.subscribeToRoot(
        {then: onFulfill => (resolveRoot = onFulfill)},
        source,
      );
      let resolveInner;
      resolveRoot({promise: new Promise(d => (resolveInner = d))});
      await tick();
      resolveInner({type: {name: 'Comp'}, props: {}});
      await tick();
      oracle.observeProps(element, {value: copy});
      return oracle;
    };
    const lenient = await run(false);
    expect(() => lenient.throwIfFailed()).not.toThrow();
    const strict = await run(true);
    expect(() => strict.throwIfFailed()).toThrow(
      'cyclic source value decoded as a copy',
    );
  });

  // Flight may split a shared object into copies across rows, so this is allowed
  // by default and only rejected when hunting with strict identity.
  it('accepts a shared source object delivered as two copies by default', () => {
    const shared = {value: 'x'};
    const source = {first: shared, second: shared};
    const received = {first: {value: 'x'}, second: {value: 'x'}};
    expect(() => createOracle().observeValue(source, received)).not.toThrow();
  });

  it('rejects a shared source object delivered as two copies under strict identity', () => {
    const shared = {value: 'x'};
    const source = {first: shared, second: shared};
    const received = {first: {value: 'x'}, second: {value: 'x'}};
    const oracle = createOracle(undefined, {strictIdentity: true});
    expect(() => oracle.observeValue(source, received)).toThrow(
      'strict identity',
    );
  });

  // A Set member aliased elsewhere in the same row must stay the same object, or
  // set.has(alias) fails. The reply decoder splits some, so this is enforced
  // under strict identity for now and reported as a finding.
  it('rejects a split Set member aliased in the same row under strict identity', () => {
    const member = {value: 'm'};
    const source = {set: new Set([member]), alias: member};
    const received = {set: new Set([{value: 'm'}]), alias: {value: 'm'}};
    expect(() => createOracle().observeValue(source, received)).not.toThrow();
    const strict = createOracle(undefined, {strictIdentity: true});
    expect(() => strict.observeValue(source, received)).toThrow();
  });

  // The class name is part of a DEV Error's identity, not just its message.
  it('rejects an Error whose class name changed', () => {
    if (!__DEV__) {
      return;
    }
    const source = new TypeError('boom');
    const received = new Error('boom');
    const oracle = createOracle({
      model: source,
      valueMetadata: new Map([[source, {type: 'error', digest: 'd'}]]),
      requiredEvents: new Map(),
    });
    expect(() => oracle.observeValue(source, received)).toThrow();
  });

  // Compare entries in iteration order; membership equality misses reordering.
  it('checks collection iteration order', () => {
    expect(() =>
      createOracle().observeValue(
        new Map([
          ['first', 1],
          ['second', 2],
        ]),
        new Map([
          ['second', 2],
          ['first', 1],
        ]),
      ),
    ).toThrow('.key0');
    expect(() =>
      createOracle().observeValue(new Set([1, 2]), new Set([2, 1])),
    ).toThrow('.item0');
  });

  // Map normalizes -0 to 0. Reject a recipe whose entries would silently merge.
  it('rejects a Map recipe with duplicate source keys', async () => {
    const {createFixture} = require('./fuzz/FlightReaderFuzzFixture');
    await expect(
      createFixture(
        {
          nodes: {
            zero: {value: 0},
            negativeZero: {value: -0},
            map: {
              map: [
                ['zero', 'zero'],
                ['negativeZero', 'negativeZero'],
              ],
            },
          },
          roots: {entry: 'map', other: 'map'},
        },
        {},
      ),
    ).rejects.toThrow('map has two entries for the same source Map key');
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

  // An early evaluation release must not lend its error through either local
  // inputs or owner models until chunk loading makes that module observable.
  it('waits for module loading before accepting an evaluation error', () => {
    const module = {};
    const source = {module};
    const error = new Error('evaluation failed');
    const load = {released: false};
    const evaluate = {released: true, error, after: load};
    const options = {
      valueMetadata: new Map([[module, {type: 'module', value: 'ready'}]]),
      requiredEvents: new Map([[module, [load, evaluate]]]),
    };
    const early = createTestOracle(source, options);
    expect(early.oracle.getMissingResults()).toEqual([]);
    early.reject(error);
    expect(() => early.oracle.throwIfFailed()).toThrow('unexpected rejection');

    load.released = true;
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

  it('rechecks delivered iterator items without consuming the iterator again', async () => {
    const source = {};
    const item = {value: 'expected'};
    const received = [item].values();
    const next = jest.spyOn(received, 'next');
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [source, {type: 'iterator', items: [{value: 'expected'}]}],
      ]),
    });
    resolve(received);
    expect(oracle.isComplete()).toBe(true);
    await expect(oracle.checkForMutations()).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledTimes(2);

    item.value = 'changed';
    await expect(oracle.checkForMutations()).rejects.toThrow('.item0.value');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('does not accept errors from unproduced repeated stream items', async () => {
    const source = {};
    const shared = {};
    const currentModule = {};
    const futureModule = {};
    const currentError = new Error('current item failed');
    const futureError = new Error('future item failed');
    const options = {
      valueMetadata: new Map([
        [
          source,
          {
            type: 'stream',
            // Only the first two items have been produced. The later copy of
            // shared must not make the future model's error observable yet.
            items: [shared, currentModule, shared, {shared, futureModule}],
            events: [true, true, false, false, false].map(released => ({
              released,
            })),
          },
        ],
        [currentModule, {type: 'module', value: 'current'}],
        [futureModule, {type: 'module', value: 'future'}],
      ]),
      requiredEvents: new Map([
        [currentModule, [{released: true, error: currentError}]],
        [futureModule, [{released: true, error: futureError}]],
      ]),
    };
    for (let i = 0; i < 2; i++) {
      const error = i === 0 ? currentError : futureError;
      const {oracle, resolve} = createTestOracle(source, options);
      let first = true;
      resolve({
        getReader: () => ({
          async read() {
            if (first) {
              first = false;
              return {done: false, value: {}};
            }
            throw error;
          },
        }),
      });
      await tick();
      if (error === currentError) {
        expect(oracle.isComplete()).toBe(true);
      } else {
        expect(() => oracle.throwIfFailed()).toThrow(
          'expected "current item failed"',
        );
      }
    }
  });

  it.each(['stream', 'iterable'])(
    'rejects a module error before its %s item is produced',
    async type => {
      for (let i = 0; i < 2; i++) {
        const produced = i === 1;
        const source = {};
        const module = {};
        const item = {module};
        const error = new Error('item module failed');
        const {oracle, resolve} = createTestOracle(source, {
          valueMetadata: new Map([
            [
              source,
              {
                type,
                items: [item],
                events: [{released: produced}, {released: false}],
                single: true,
              },
            ],
            [module, {type: 'module', value: 'loaded'}],
          ]),
          requiredEvents: new Map([[module, [{released: true, error}]]]),
        });
        if (type === 'stream') {
          resolve({
            getReader: () => ({
              async read() {
                throw error;
              },
            }),
          });
        } else {
          let first = true;
          resolve({
            [Symbol.asyncIterator]() {
              return this;
            },
            next() {
              if (first) {
                first = false;
                return Promise.reject(error);
              }
              return new Promise(() => {});
            },
          });
        }
        await tick();
        if (produced) {
          oracle.throwIfFailed();
        } else {
          expect(() => oracle.throwIfFailed()).toThrow('unexpected rejection');
        }
      }
    },
  );

  // A reader that silently drops the terminal error must leave a due result.
  it('requires the end read after a source stream failure', async () => {
    const source = {};
    const failure = new Error('source failed');
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [
          source,
          {type: 'stream', items: [], events: [{released: true}], failure},
        ],
        [failure, {type: 'error', digest: 'stream failure'}],
      ]),
    });
    resolve({getReader: () => ({read: () => new Promise(() => {})})});
    await tick();
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.end',
    ]);
    expect(oracle.isComplete()).toBe(false);
  });

  // The future-owner probe: a later model may lend an error only after its
  // source item is produced. Then that error may discard a queued earlier read.
  it('borrows a later stream model error only after its source is produced', async () => {
    for (let i = 0; i < 2; i++) {
      const futureProduced = i === 1;
      const source = {};
      const shared = {};
      const module = {};
      const error = new Error('future item module failed');
      const {oracle, resolve} = createTestOracle(source, {
        valueMetadata: new Map([
          [
            source,
            {
              type: 'stream',
              items: [shared, {shared, module}],
              events: [
                {released: true},
                {released: futureProduced},
                {released: false},
              ],
            },
          ],
          [module, {type: 'module', value: 'future'}],
        ]),
        requiredEvents: new Map([[module, [{released: true, error}]]]),
      });
      resolve({
        getReader: () => ({
          async read() {
            throw error;
          },
        }),
      });
      await tick();
      if (futureProduced) {
        expect(oracle.isComplete()).toBe(true);
      } else {
        expect(() => oracle.throwIfFailed()).toThrow('unexpected rejection');
      }
    }
  });

  it('requires an independent iterable item while an earlier item is blocked', async () => {
    const source = {};
    const module = {};
    const load = {released: false};
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [
          source,
          {
            type: 'iterable',
            items: [module, 'ready'],
            events: Array.from({length: 3}, () => ({released: true})),
            returnValue: 'end',
            single: true,
          },
        ],
        [module, {type: 'module', value: 'loaded'}],
      ]),
      requiredEvents: new Map([[module, [load]]]),
    });
    let resolveFirst;
    let resolveSecond;
    const results = [
      new Promise(done => (resolveFirst = done)),
      new Promise(done => (resolveSecond = done)),
      Promise.resolve({done: true, value: 'end'}),
    ];
    let index = 0;
    resolve({
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return (
          results[index++] || Promise.resolve({done: true, value: undefined})
        );
      },
    });
    await tick();
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.ahead.next1',
    ]);

    resolveSecond({done: false, value: 'ready'});
    await tick();
    expect(oracle.getMissingResults()).toEqual([]);
    expect(oracle.isComplete()).toBe(false);

    load.released = true;
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.ahead.next0',
    ]);
    resolveFirst({done: false, value: 'loaded'});
    await tick();
    expect(oracle.isComplete()).toBe(true);
  });

  // A future iterable item or return cannot have serialized the shared value.
  it.each(['item', 'return'])(
    'borrows a produced iterable %s model error',
    async kind => {
      for (let i = 0; i < 2; i++) {
        const produced = i === 1;
        const source = {};
        const shared = {};
        const module = {};
        const error = new Error('owner failed');
        const owner = {shared, module};
        const {oracle, resolve} = createTestOracle(source, {
          valueMetadata: new Map([
            [
              source,
              {
                type: 'iterable',
                items: kind === 'item' ? [shared, owner] : [shared],
                returnValue: kind === 'return' ? owner : undefined,
                events: (kind === 'item'
                  ? [true, produced, false]
                  : [true, produced]
                ).map(released => ({released})),
                single: true,
              },
            ],
            [module, {type: 'module', value: 'failed'}],
          ]),
          requiredEvents: new Map([[module, [{released: true, error}]]]),
        });
        let index = 0;
        resolve({
          [Symbol.asyncIterator]() {
            return this;
          },
          next() {
            const current = index++;
            if (current < 2) {
              return Promise.reject(error);
            }
            return kind === 'return' && produced
              ? Promise.resolve({done: true, value: undefined})
              : new Promise(() => {});
          },
        });
        await tick();
        if (produced) {
          oracle.throwIfFailed();
          expect(oracle.isComplete()).toBe(kind === 'return');
        } else {
          expect(() => oracle.throwIfFailed()).toThrow('unexpected rejection');
        }
      }
    },
  );

  // Even an already produced owner cannot lend its error to a future consumer.
  it.each(['stream', 'iterable'])(
    'waits for the consuming %s item before consulting eligible owners',
    async type => {
      for (let i = 0; i < 2; i++) {
        const produced = i === 1;
        const sequence = {};
        const promise = {};
        const shared = {};
        const module = {};
        const error = new Error('eligible owner failed');
        const source = {promise, sequence};
        const {oracle, resolve} = createTestOracle(source, {
          valueMetadata: new Map([
            [
              promise,
              {type: 'promise', state: 'fulfilled', value: {shared, module}},
            ],
            [
              sequence,
              {
                type,
                items: [shared],
                events: [{released: produced}, {released: false}],
                single: true,
              },
            ],
            [module, {type: 'module', value: 'failed'}],
          ]),
          requiredEvents: new Map([[module, [{released: true, error}]]]),
        });
        const rejectOwner = {
          then(onFulfill, onReject) {
            onReject(error);
          },
        };
        let first = true;
        resolve({
          promise: rejectOwner,
          sequence:
            type === 'stream'
              ? {
                  getReader: () => ({
                    async read() {
                      throw error;
                    },
                  }),
                }
              : {
                  [Symbol.asyncIterator]() {
                    return this;
                  },
                  next() {
                    if (first) {
                      first = false;
                      return Promise.reject(error);
                    }
                    return new Promise(() => {});
                  },
                },
        });
        await tick();
        if (produced) {
          oracle.throwIfFailed();
          expect(oracle.isComplete()).toBe(type === 'stream');
        } else {
          expect(() => oracle.throwIfFailed()).toThrow('unexpected rejection');
        }
      }
    },
  );

  it('compares the type and saved bytes of a detached source view', () => {
    const source = new Uint8Array([0, 1, 2, 3]).subarray(1, 3);
    const options = {bytes: new Map([[source, [1, 2]]])};
    structuredClone(source.buffer, {transfer: [source.buffer]});
    expect(source.byteLength).toBe(0);

    const valid = createTestOracle(source, options);
    valid.resolve(new Uint8Array([9, 1, 2, 9]).subarray(1, 3));
    expect(valid.oracle.isComplete()).toBe(true);

    [new Uint8Array([1, 3]), new Int8Array([1, 2])].forEach(incorrect => {
      const invalid = createTestOracle(source, options);
      invalid.resolve(incorrect);
      expect(() => invalid.oracle.throwIfFailed()).toThrow();
    });
  });

  it('waits for Blob contents before completing a mutation check', async () => {
    const source = new Blob([new Uint8Array([1])]);
    const received = new Blob([new Uint8Array([1])]);
    const {oracle, resolve} = createTestOracle(source);
    resolve(received);
    await tick();
    expect(oracle.isComplete()).toBe(true);

    let resolveRead;
    received.arrayBuffer = () => new Promise(done => (resolveRead = done));
    const recheck = oracle.checkForMutations();
    await tick();
    expect(oracle.isComplete()).toBe(false);
    resolveRead(new Uint8Array([2]).buffer);
    await expect(recheck).rejects.toThrow();
  });

  it('checks prop readiness even when an unloaded module exports undefined', () => {
    const module = {};
    const element = {type: {name: 'Component'}, props: {value: module}};
    const load = {released: false};
    const options = {
      valueMetadata: new Map([
        [element, {type: 'element', html: ''}],
        [module, {type: 'module', value: undefined}],
      ]),
      requiredEvents: new Map([[module, [load]]]),
    };
    const early = createTestOracle(element, options);
    early.oracle.observeProps(element, {value: undefined});
    expect(() => early.oracle.throwIfFailed()).toThrow(
      'before their inputs arrived',
    );

    load.released = true;
    const valid = createTestOracle(element, options);
    valid.oracle.observeProps(element, {value: undefined});
    valid.oracle.throwIfFailed();
  });

  it('requires available bytes without waiting for the stream to close', async () => {
    const source = {};
    const produced = {released: false};
    const remaining = {released: false};
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [
          source,
          {
            type: 'bytes',
            chunks: [new Uint8Array([1]), new Uint8Array([2])],
            events: [produced, remaining],
          },
        ],
      ]),
    });
    resolve({getReader: () => ({read: () => new Promise(() => {})})});
    await tick();
    expect(oracle.getMissingResults()).toEqual([]);
    produced.released = true;
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.byte0',
    ]);
  });

  it('calls Server Functions again to check that their bound arguments are stable', async () => {
    const source = () => {};
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [
          source,
          {
            type: 'function',
            bound: ['bound'],
            args: ['argument'],
            result: ['bound', 'argument'],
          },
        ],
      ]),
    });
    let bound = 'bound';
    resolve(argument => [bound, argument]);
    expect(oracle.isComplete()).toBe(true);
    await expect(oracle.checkForMutations()).resolves.toBeUndefined();

    bound = 'changed';
    await expect(oracle.checkForMutations()).rejects.toThrow('changed');
  });

  // Equal replacement objects must not conceal a changed bound identity.
  it('allows fresh function result arrays but rejects replaced bound objects', async () => {
    const source = () => {};
    const argument = {value: 'expected'};
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [
          source,
          {type: 'function', bound: [argument], args: [], result: [argument]},
        ],
      ]),
    });
    let bound = {value: 'expected'};
    resolve(() => [bound]);
    expect(oracle.isComplete()).toBe(true);
    await expect(oracle.checkForMutations()).resolves.toBeUndefined();
    bound = {value: 'expected'};
    await expect(oracle.checkForMutations()).rejects.toThrow(
      'changed a bound argument',
    );
  });

  it('does not borrow errors from unrendered Server Component output', async () => {
    const shared = {};
    const module = {};
    const element = {props: {}};
    const promise = {};
    const source = {element, promise};
    const failure = new Error('future output failed');
    const oracle = createOracle(
      {
        model: source,
        valueMetadata: new Map([
          [module, {type: 'module', value: 'failed'}],
          [promise, {type: 'promise', state: 'fulfilled', value: shared}],
          [
            element,
            {
              type: 'element',
              renderEvent: {released: false},
              renderedElement: {props: {shared, module}},
            },
          ],
        ]),
        requiredEvents: new Map([[module, [{released: true, error: failure}]]]),
      },
      {render: () => new Promise(() => {})},
    );
    oracle.subscribeToRoot(
      {
        then(resolve) {
          resolve({
            element: {},
            promise: {
              then(onFulfill, reject) {
                reject(failure);
              },
            },
          });
        },
      },
      source,
    );
    await tick();
    expect(() => oracle.throwIfFailed()).toThrow('unexpected rejection');
  });

  it('waits for the consuming Server Component before accepting or requiring its error', async () => {
    const module = {};
    const props = {module};
    const element = {props: {}};
    const promise = {};
    const source = {element, promise};
    const failure = new Error('produced owner failed');
    const renderEvent = {released: false};
    const fixture = {
      model: source,
      valueMetadata: new Map([
        [module, {type: 'module', value: 'failed'}],
        [promise, {type: 'promise', state: 'fulfilled', value: props}],
        [element, {type: 'element', renderEvent, renderedElement: {props}}],
      ]),
      requiredEvents: new Map([
        [element, [renderEvent]],
        [module, [{released: true, error: failure}]],
      ]),
    };
    const root = {
      then(resolve) {
        resolve({
          element: {},
          promise: {
            then(onFulfill, reject) {
              reject(failure);
            },
          },
        });
      },
    };
    const early = createOracle(fixture, {
      render: () => Promise.reject(failure),
    });
    early.subscribeToRoot(root, source);
    await tick();
    expect(() => early.throwIfFailed()).toThrow('unexpected rejection');

    let rejectRender;
    const oracle = createOracle(fixture, {
      render: () => new Promise((resolve, reject) => (rejectRender = reject)),
    });
    oracle.subscribeToRoot(root, source);
    await tick();
    expect(oracle.getMissingResults()).toEqual([]);
    renderEvent.released = true;
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.element.render',
    ]);
    rejectRender(failure);
    await tick();
    expect(oracle.isComplete()).toBe(true);
  });

  // Comparing only the expected entries would miss extra received ones; the
  // size check is what catches a collection that grew.
  it('rejects a collection with extra received entries', () => {
    expect(() =>
      createOracle().observeValue(new Set([1]), new Set([1, 2])),
    ).toThrow();
    expect(() =>
      createOracle().observeValue(
        new Map([['a', 1]]),
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
      ),
    ).toThrow();
  });

  // Equal keys and values do not make an object plain; a non-plain prototype
  // must still be rejected.
  it('rejects a received object with a non-plain prototype', () => {
    const received = Object.assign(Object.create(null), {value: 1});
    expect(() => createOracle().observeValue({value: 1}, received)).toThrow();
  });

  // Two Dates are both Dates; only their time distinguishes them.
  it('rejects a Date with a different time', () => {
    expect(() =>
      createOracle().observeValue(new Date(1000), new Date(2000)),
    ).toThrow();
  });

  // The message is part of a DEV Error's contents, not just its class.
  it('rejects an Error whose message changed', () => {
    if (!__DEV__) {
      return;
    }
    const source = new Error('expected message');
    const received = new Error('different message');
    const oracle = createOracle({
      model: source,
      valueMetadata: new Map([[source, {type: 'error', digest: 'd'}]]),
      requiredEvents: new Map(),
    });
    expect(() => oracle.observeValue(source, received)).toThrow(
      'expected message',
    );
  });

  // An iterator that keeps yielding never signals completion; the terminal
  // done check is what rejects it.
  it('rejects an iterator that never reports completion', () => {
    const source = {};
    let calls = 0;
    const received = {
      next: () =>
        calls++ === 0
          ? {done: false, value: 'expected'}
          : {done: false, value: undefined},
    };
    const oracle = createOracle({
      model: source,
      valueMetadata: new Map([
        [source, {type: 'iterator', items: ['expected']}],
      ]),
      requiredEvents: new Map(),
    });
    expect(() => oracle.observeValue(source, received)).toThrow();
  });

  // The incremental byte checks pass for a prefix; the final equality is what
  // catches a byte stream that ends short of its contents.
  it('rejects a byte stream that ends with the wrong bytes', async () => {
    const source = {};
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [
          source,
          {
            type: 'bytes',
            chunks: [new Uint8Array([1]), new Uint8Array([2])],
            events: [{released: true}, {released: true}],
          },
        ],
      ]),
    });
    let ended = false;
    resolve({
      getReader: () => ({
        read(view) {
          if (ended) {
            return Promise.resolve({done: true, value: undefined});
          }
          ended = true;
          view[0] = 1;
          return Promise.resolve({done: false, value: view.subarray(0, 1)});
        },
      }),
    });
    await tick();
    await tick();
    expect(() => oracle.throwIfFailed()).toThrow();
  });

  // A stream that reports completion with the right value, but before the item
  // was due, is still wrong; the ended-early check rejects it.
  it('rejects a stream that reports completion before delivering an item', async () => {
    const source = {};
    const {oracle, resolve} = createTestOracle(source, {
      valueMetadata: new Map([
        [
          source,
          {
            type: 'stream',
            items: ['expected'],
            events: [{released: true}, {released: true}],
          },
        ],
      ]),
    });
    let first = true;
    resolve({
      getReader: () => ({
        read() {
          if (first) {
            first = false;
            return Promise.resolve({done: true, value: 'expected'});
          }
          return Promise.resolve({done: true, value: undefined});
        },
      }),
    });
    await tick();
    expect(() => oracle.throwIfFailed()).toThrow('ended early');
  });

  describe('failure reproduction', () => {
    const graph = {
      nodes: {
        root: {array: ['cycle', 'noise']},
        cycle: {set: ['cycle', 'load']},
        load: {module: 'loaded'},
        noise: {value: 'not needed'},
      },
      roots: {entry: 'root', other: 'root'},
      events: ['load load'],
      packetSizes: [1, 3, 17],
      yieldBetweenPackets: true,
    };

    it('reduces a failure without changing its schedule or its original graph', async () => {
      const original = JSON.stringify(graph);
      const attempts = [];
      const failure = {error: 'cycle with a loading member'};
      const reproduces = async candidate => {
        const cycle = candidate.nodes.cycle;
        const reproduced =
          cycle !== undefined &&
          Array.isArray(cycle.set) &&
          cycle.set.includes('cycle') &&
          cycle.set.includes('load') &&
          candidate.nodes.load.module === 'loaded';
        attempts.push({key: JSON.stringify(candidate), reproduced});
        return reproduced ? failure : false;
      };
      const result = await shrinkGraph(graph, reproduces, 100);
      expect(Object.keys(result.graph.nodes)).toEqual(['cycle', 'load']);
      expect(result.graph.events).toEqual(graph.events);
      expect(result.graph.packetSizes).toEqual(graph.packetSizes);
      expect(result.graph.yieldBetweenPackets).toBe(true);
      expect(result.reproduction).toBe(failure);
      expect(result.attempts).toBe(attempts.length);
      expect(JSON.stringify(graph)).toBe(original);
      // Successful candidates are always replayed again before acceptance.
      for (let i = 0; i < attempts.length; i++) {
        if (attempts[i].reproduced) {
          expect(attempts[++i]).toEqual(attempts[i - 1]);
        }
      }
    });

    it('does not accept a flaky candidate or exceed the replay budget', async () => {
      let calls = 0;
      const result = await shrinkGraph(graph, async () => ++calls % 2 === 1, 2);
      expect(calls).toBe(2);
      expect(result.attempts).toBe(2);
      expect(result.graph).toEqual(graph);
      expect(result.reproduction).toBe(null);
      const withUnreachableNode = {
        ...graph,
        nodes: {...graph.nodes, unreachable: {value: 'leave it alone'}},
      };
      const noBudget = await shrinkGraph(
        withUnreachableNode,
        () => {
          throw new Error('not enough budget to confirm a candidate');
        },
        1,
      );
      expect(noBudget.attempts).toBe(0);
      expect(noBudget.graph).toBe(withUnreachableNode);
    });

    it('prints a graph literal without corrupting quotes, escapes, or names', () => {
      const name = 'a "node" with an apostrophe\' and a slash\\';
      const original = {
        nodes: {[name]: {value: 'quotes: "\'\\\n🙂 and looksLikeKey: value'}},
        roots: {entry: name, other: name},
        events: ['event "\'\\\n'],
        packetSizes: [1, 19],
        yieldBetweenPackets: false,
        rootPromise: true,
      };
      let printed;
      require('vm').runInNewContext(formatGraphTest(original, 'after-eof'), {
        it(title, run) {
          run();
        },
        runGraph(value) {
          printed = value;
        },
      });
      expect(printed).toEqual({...original, readTiming: 'after-eof'});
    });

    it('replays the exact host, timing, schedule, seed, build, channel, and mode', () => {
      const seed = "a'b $(literal)";
      const name =
        'ReactFlightReaderFuzz (node) generated graphs graph seed=' +
        seed +
        ' readTiming=after-eof schedule=1';
      const command = formatReplayCommand(seed, name, false);
      expect(command).toContain("FUZZ_TEST_SEED='a'\\''b $(literal)'");
      expect(command).toContain('FLIGHT_FUZZ_CASES=1');
      expect(command).toContain('ReactFlightReaderFuzz --prod --runInBand');
      const quoted = command.slice(command.lastIndexOf(' -t ') + 4);
      const pattern = quoted.slice(1, -1).replace(/'\\''/g, "'");
      const expression = new RegExp(pattern);
      expect(expression.test(name)).toBe(true);
      expect(expression.test(name.replace('(node)', '(edge)'))).toBe(false);
      expect(expression.test(name.replace('after-eof', 'early'))).toBe(false);
      expect(expression.test(name.replace('schedule=1', 'schedule=0'))).toBe(
        false,
      );
      expect(expression.test(name + ' more')).toBe(false);
      expect(formatReplayCommand(seed, name, true)).not.toContain('--prod');
      [false, true].forEach(build => {
        ['experimental', 'stable'].forEach(releaseChannel => {
          [false, true].forEach(development => {
            const replay = formatReplayCommand(seed, name, development, {
              build,
              releaseChannel,
            });
            expect(replay.includes(' --build')).toBe(build);
            expect(replay.includes(' --release-channel=stable')).toBe(
              releaseChannel === 'stable',
            );
            expect(replay.includes(' --prod')).toBe(!development);
          });
        });
      });
    });
  });
});

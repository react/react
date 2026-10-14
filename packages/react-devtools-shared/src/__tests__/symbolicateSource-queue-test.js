/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createSourceMapTaskQueue} from '../symbolicateSource';

const deferred = () => {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return {promise, resolve};
};
const tick = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('source map task queue', () => {
  it('bounds waiting work and settles overflow without starting it', async () => {
    const queue = createSourceMapTaskQueue(2);
    const gate = deferred();
    const started = [];
    const running = queue.enqueue(async () => {
      started.push('running');
      return gate.promise;
    });
    await tick();
    const first = queue.enqueue(async () => {
      started.push('first');
      return 1;
    });
    const second = queue.enqueue(async () => {
      started.push('second');
      return 2;
    });
    const dropped = queue.enqueue(async () => {
      started.push('dropped');
      return 3;
    });
    await expect(dropped).resolves.toBe(null);
    expect(started).toEqual(['running']);
    gate.resolve(0);
    await expect(running).resolves.toBe(0);
    await expect(first).resolves.toBe(1);
    await expect(second).resolves.toBe(2);
    expect(started).toEqual(['running', 'first', 'second']);
  });
  it('cancels an old selection and starts current work without waiting for its fetch', async () => {
    const queue = createSourceMapTaskQueue(2);
    const gate = deferred();
    const finished = [];
    const running = queue.enqueue(async isCurrent => {
      await gate.promise;
      if (isCurrent()) finished.push('old');
      return 'old';
    });
    await tick();
    const waiting = queue.enqueue(async () => {
      finished.push('waiting');
      return 'waiting';
    });
    queue.cancel();
    await expect(running).resolves.toBe(null);
    await expect(waiting).resolves.toBe(null);
    await expect(
      queue.enqueue(async () => {
        finished.push('new');
        return 'new';
      }),
    ).resolves.toBe('new');
    gate.resolve();
    await tick();
    expect(finished).toEqual(['new']);
  });
  it('keeps the selected component source ahead of owner frames when full', async () => {
    const queue = createSourceMapTaskQueue(1);
    const gate = deferred();
    const running = queue.enqueue(async () => gate.promise);
    await tick();
    const owner = queue.enqueue(async () => 'owner');
    const selected = queue.enqueue(async () => 'selected', true);
    gate.resolve('running');
    await running;
    await expect(selected).resolves.toBe('selected');
    await expect(owner).resolves.toBe(null);
  });
  it('recovers from failures and does not run work inline in enqueue', async () => {
    const queue = createSourceMapTaskQueue(2);
    let ran = false;
    const failed = queue.enqueue(async () => {
      ran = true;
      throw Error('bad map');
    });
    expect(ran).toBe(false);
    await expect(failed).resolves.toBe(null);
    await expect(queue.enqueue(async () => 'ok')).resolves.toBe('ok');
  });
  it('starts the selected source before owner effects queued in the same commit', async () => {
    const queue = createSourceMapTaskQueue(2);
    const started = [];
    const owner = queue.enqueue(async () => {
      started.push('owner');
      return 'owner';
    });
    const source = queue.enqueue(async () => {
      started.push('source');
      return 'source';
    }, true);
    await Promise.all([owner, source]);
    expect(started).toEqual(['source', 'owner']);
  });
});

describe('selected source cache priority and lifecycle', () => {
  const map = JSON.stringify({
    version: 3,
    sources: ['original.js'],
    names: [],
    mappings: 'AAAA',
  });
  let resolver;
  beforeEach(() => {
    jest.resetModules();
    resolver = require('../symbolicateSource');
  });
  afterEach(() => resolver.clearSourceCaches());
  it('promotes a selected source already waiting behind owner frames', async () => {
    const started = [];
    const fetch = async url => {
      if (url.endsWith('.map')) return map;
      started.push(url);
      return 'a();\n//# sourceMappingURL=app.map';
    };
    resolver.beginSourceSelection(fetch, 1);
    const frames = Array.from({length: 33}, (_, i) =>
      resolver.symbolicateSourceWithCache(
        fetch,
        'https://example.com/' + i + '.js',
        1,
        1,
      ),
    );
    const selected = resolver.symbolicateSourceWithCache(
      fetch,
      'https://example.com/32.js',
      1,
      1,
      true,
    );
    expect((await selected).location[1]).toBe(
      'https://example.com/original.js',
    );
    await Promise.all(frames);
    expect(started[0]).toBe('https://example.com/32.js');
  });
  it('rescues a selected source just dropped by overflow in the same commit', async () => {
    const started = [];
    const fetch = async url => {
      if (url.endsWith('.map')) return map;
      started.push(url);
      return 'a();\n//# sourceMappingURL=app.map';
    };
    resolver.beginSourceSelection(fetch, 1);
    const frames = Array.from({length: 40}, (_, i) =>
      resolver.symbolicateSourceWithCache(
        fetch,
        'https://example.com/' + i + '.js',
        1,
        1,
      ),
    );
    const selected = resolver.symbolicateSourceWithCache(
      fetch,
      'https://example.com/39.js',
      1,
      1,
      true,
    );
    expect(await selected).not.toBeNull();
    await Promise.all(frames);
    expect(started[0]).toBe('https://example.com/39.js');
    expect(started).toHaveLength(33);
  });
  it('cancels enrichment on unmount after a source edit invalidation', async () => {
    const gate = deferred();
    const fetch = async url => (url.endsWith('.map') ? map : gate.promise);
    resolver.beginSourceSelection(fetch, 1);
    resolver.clearSourceCaches();
    const task = resolver.symbolicateSourceWithCache(
      fetch,
      'https://example.com/app.js',
      1,
      1,
    );
    await tick();
    resolver.beginSourceSelection(fetch, null);
    gate.resolve('a();\n//# sourceMappingURL=app.map');
    expect(await task).toBeNull();
  });
});

describe('source queue progress', () => {
  it('reports pending reads, completed maps and unavailable mappings', async () => {
    const queue = createSourceMapTaskQueue(2);
    const gate = deferred();
    const first = queue.enqueue(async () => gate.promise);
    const unavailable = queue.enqueue(async () => null);
    expect(queue.getStatus?.()).toEqual({
      pending: 2,
      completed: 0,
      mapped: 0,
      unmapped: 0,
      dropped: 0,
    });
    await tick();
    expect(queue.getStatus?.().pending).toBe(2);
    gate.resolve('mapped');
    await Promise.all([first, unavailable]);
    expect(queue.getStatus?.()).toEqual({
      pending: 0,
      completed: 2,
      mapped: 1,
      unmapped: 1,
      dropped: 0,
    });
  });
  it('shows overflow separately from accepted tasks and resets on cancellation', async () => {
    const queue = createSourceMapTaskQueue(1);
    const gate = deferred();
    const first = queue.enqueue(async () => gate.promise);
    await tick();
    const waiting = queue.enqueue(async () => 'waiting');
    const overflow = queue.enqueue(async () => 'dropped');
    await overflow;
    expect(queue.getStatus?.()).toEqual({
      pending: 2,
      completed: 0,
      mapped: 0,
      unmapped: 0,
      dropped: 1,
    });
    queue.cancel();
    await Promise.all([first, waiting]);
    expect(queue.getStatus?.()).toEqual({
      pending: 0,
      completed: 0,
      mapped: 0,
      unmapped: 0,
      dropped: 0,
    });
    gate.resolve('old');
    await tick();
    expect(queue.getStatus?.().completed).toBe(0);
  });
});

// These tests exercise real asynchronous resource and UI scheduling.
beforeEach(() => jest.useRealTimers());

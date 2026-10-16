/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('getHostInstanceKey', () => {
  let DevToolsNativeHost;

  beforeEach(() => {
    jest.resetModules();
    DevToolsNativeHost =
      require('react-devtools-shared/src/backend/DevToolsNativeHost');
  });

  it('reproduces the Fabric acquire/release key mismatch (react/react#37752)', () => {
    const {getHostInstanceKey, getPublicInstance} = DevToolsNativeHost;

    // Fabric host instance wrapper before React Native lazily creates
    // canonical.publicInstance (ReactFabric-dev.js:getPublicInstance).
    const canonical = {nativeTag: 42, publicInstance: null};
    const wrapper = {node: {}, canonical};

    // getHostInstanceKey returns the canonical object even before the
    // public instance exists, so aquireHostInstance can key by it.
    const acquireKey = getHostInstanceKey(wrapper);
    expect(acquireKey).toBe(canonical);

    const map = new Map();
    map.set(acquireKey, 'devtools-instance');

    // React Native lazily initializes canonical.publicInstance, e.g. when a
    // ref is read or measure() is called.
    canonical.publicInstance = {
      __internalInstanceHandle: {stateNode: wrapper},
    };

    // The old keying misses: getPublicInstance, which this PR leaves
    // unchanged, now returns canonical.publicInstance instead of the
    // wrapper it returned before lazy creation, so a lookup through it
    // returns undefined rather than 'devtools-instance'. Acquire/release
    // keyed that way on main, leaking the unmounted instance.
    expect(map.get(getPublicInstance(wrapper))).toBeUndefined();

    // The new helper returns the same canonical key after the assignment,
    // so releaseHostInstance finds and removes the acquire entry.
    expect(getHostInstanceKey(wrapper)).toBe(acquireKey);
    expect(map.get(getHostInstanceKey(wrapper))).toBe('devtools-instance');
    map.delete(getHostInstanceKey(wrapper));
    expect(map.has(acquireKey)).toBe(false);
  });

  it('keys Fabric host instances by the stable canonical object', () => {
    const {getHostInstanceKey} = DevToolsNativeHost;

    const canonical = {nativeTag: 42, publicInstance: null};
    const wrapper = {node: {}, canonical};

    const acquireKey = getHostInstanceKey(wrapper);
    expect(acquireKey).toBe(canonical);

    // After React Native lazily creates the public instance...
    canonical.publicInstance = {
      __internalInstanceHandle: {stateNode: wrapper},
    };

    // ...the same wrapper still maps to the same key...
    expect(getHostInstanceKey(wrapper)).toBe(acquireKey);
    // ...and a lookup by the public instance normalizes to the same key.
    expect(getHostInstanceKey(canonical.publicInstance)).toBe(acquireKey);
  });

  it('keeps Paper and DOM key behavior unchanged', () => {
    const {getHostInstanceKey} = DevToolsNativeHost;

    // React Web: the host instance is the key.
    const domElement = {nodeType: 1};
    expect(getHostInstanceKey(domElement)).toBe(domElement);

    // React Native Paper: the native tag is the key.
    const paperInstance = {_nativeTag: 7};
    expect(getHostInstanceKey(paperInstance)).toBe(7);
  });
});

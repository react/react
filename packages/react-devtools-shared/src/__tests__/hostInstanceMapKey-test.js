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
    const {getPublicInstance} = DevToolsNativeHost;

    // Fabric host instance wrapper before React Native lazily creates
    // canonical.publicInstance (ReactFabric-dev.js:getPublicInstance).
    const canonical = {nativeTag: 42, publicInstance: null};
    const wrapper = {node: {}, canonical};

    // What aquireHostInstance does: key the map by getPublicInstance().
    const map = new Map();
    map.set(getPublicInstance(wrapper), 'devtools-instance');

    // React Native lazily initializes canonical.publicInstance, e.g. when a
    // ref is read or measure() is called.
    canonical.publicInstance = {
      __internalInstanceHandle: {stateNode: wrapper},
    };

    // What releaseHostInstance does: look the entry up with the current key.
    // On current main this misses, leaking the unmounted instance.
    expect(map.get(getPublicInstance(wrapper))).toBe('devtools-instance');
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

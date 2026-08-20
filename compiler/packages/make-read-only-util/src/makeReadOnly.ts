/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

type ROViolationType =
  | 'FORGET_MUTATE_IMMUT'
  | 'FORGET_DELETE_PROP_IMMUT'
  | 'FORGET_CHANGE_PROP_IMMUT'
  | 'FORGET_ADD_PROP_IMMUT';
type ROViolationLogger = (
  violation: ROViolationType,
  source: string,
  key: string,
  value?: any,
) => void;

/**
 * Represents a "proxy" of a read-only object property
 *   savedVal: underlying "source of truth" for a property value
 *   getter: hack, this lets us check whether we have already saved this property
 * */
type SavedEntry = {
  savedVal: unknown;
  getter: () => unknown;
};
type SavedROObject = Map<string, SavedEntry>;
type SavedROObjects = WeakMap<Object, SavedROObject>;

// Utility functions
function isWriteable(desc: PropertyDescriptor) {
  return (desc.writable || desc.set) && desc.configurable;
}

function getOrInsertDefault(
  m: SavedROObjects,
  k: object,
): {existed: boolean; entry: SavedROObject} {
  const entry = m.get(k);
  if (entry) {
    return {existed: true, entry};
  } else {
    const newEntry: SavedROObject = new Map();
    m.set(k, newEntry);
    return {existed: false, entry: newEntry};
  }
}

function buildMakeReadOnly(
  logger: ROViolationLogger,
  skippedClasses: string[],
): <T>(val: T, source: string) => T {
  // All saved proxys
  const savedROObjects: SavedROObjects = new WeakMap();

  // Overwrites an object property with its proxy and saves its original value
  function addProperty(
    obj: Object,
    source: string,
    key: string,
    prop: PropertyDescriptor,
    savedEntries: Map<string, SavedEntry>,
  ) {
    const proxy: PropertyDescriptor & {get(): unknown} = {
      get() {
        // read from backing cache entry
        return makeReadOnly(savedEntries.get(key)!.savedVal, source);
      },
      set(newVal: unknown) {
        logger('FORGET_MUTATE_IMMUT', source, key, newVal);
        // update backing cache entry
        savedEntries.get(key)!.savedVal = newVal;
      },
    };
    if (prop.configurable != null) {
      proxy.configurable = prop.configurable;
    }
    if (prop.enumerable != null) {
      proxy.enumerable = prop.enumerable;
    }

    savedEntries.set(key, {savedVal: (obj as any)[key], getter: proxy.get});
    Object.defineProperty(obj, key, proxy);
  }

  // Changes an object to be read-only, returns its input
  function makeReadOnly<T>(o: T, source: string): T {
    if (typeof o !== 'object' || o == null) {
      return o;
    } else if (
      o.constructor?.name != null &&
      skippedClasses.includes(o.constructor.name)
    ) {
      return o;
    }

    const {existed, entry: cache} = getOrInsertDefault(savedROObjects, o);

    for (const [k, entry] of cache.entries()) {
      const currentProp = Object.getOwnPropertyDescriptor(o, k);
      if (currentProp && !isWriteable(currentProp)) {
        continue;
      }
      const currentPropGetter = currentProp?.get;
      const cachedGetter = entry.getter;

      if (currentPropGetter !== cachedGetter) {
        // cache is currently holding an old property
        //  - it may have been deleted
        //  - it may have been deleted + re-set
        //    (meaning that new value is not proxied,
        //     and the current proxied value is stale)
        cache.delete(k);
        if (!currentProp) {
          logger('FORGET_DELETE_PROP_IMMUT', source, k);
        } else if (currentProp) {
          logger('FORGET_CHANGE_PROP_IMMUT', source, k);
          addProperty(o, source, k, currentProp, cache);
        }
      }
    }
    for (const [k, prop] of Object.entries(
      Object.getOwnPropertyDescriptors(o),
    )) {
      if (!cache.has(k) && isWriteable(prop)) {
        if (
          prop.hasOwnProperty('set') ||
          prop.hasOwnProperty('get') ||
          k === 'current'
        ) {
          // - we currently don't handle accessor properties
          // - we currently have no other way of checking whether an object
          // is a `ref` (i.e. returned by useRef).
          continue;
        }

        if (existed) {
          logger('FORGET_ADD_PROP_IMMUT', source, k);
        }
        addProperty(o, source, k, prop, cache);
      }
    }
    return o;
  }

  return makeReadOnly;
}

export default buildMakeReadOnly;

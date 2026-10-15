/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {BlockedChunk, FlightStreamController} from './ReactFlightClient';
import type {ReactDebugInfo} from 'shared/ReactTypes';

import isArray from 'shared/isArray';
import getPrototypeOf from 'shared/getPrototypeOf';
import hasOwnProperty from 'shared/hasOwnProperty';

const ObjectPrototype = Object.prototype;

export type DebugInfoSource = {+_debugInfo: ReactDebugInfo, ...};

export type PendingInitializationHandler = {
  parent: null | InitializationHandler,
  chunk: null | BlockedChunk<any>,
  value: any,
  // The controller of a stream whose chunk is blocked on its debug info. Null
  // for every other model.
  reason: null | FlightStreamController,
  deps: number,
  debugSources: null | Array<DebugInfoSource>,
  errored: false,
};
export type ErroredInitializationHandler = {
  parent: null | InitializationHandler,
  chunk: null | BlockedChunk<any>,
  value: null,
  // The error the handler was rejected with.
  reason: mixed,
  deps: number,
  debugSources: null | Array<DebugInfoSource>,
  errored: true,
};
export type InitializationHandler =
  | PendingInitializationHandler
  | ErroredInitializationHandler;

export function createInitializationHandler(
  parent: null | InitializationHandler,
  deps: number,
): PendingInitializationHandler {
  return {
    parent,
    chunk: null,
    value: null,
    reason: null,
    deps,
    debugSources: null,
    errored: false,
  };
}

export const CONSTRUCTION_REFERENCE = 0;
export const CONSTRUCTION_PUBLICATION = 1;
export const CONSTRUCTION_BINDING = 2;

export const CONSTRUCTION_PENDING = 0;
export const CONSTRUCTION_INSTALLED = 1;
export const CONSTRUCTION_FAILED = 2;

// An object can be available before the references in its fields resolve.
// A field fact records the result its path readers are waiting for, separately
// from the placeholder currently in the object. Installing the field removes
// its pending entry, so later readers use the property directly. Failed entries
// remain so those readers receive the failure instead of the placeholder.
export type ConstructionFact<Listener> = {
  status: 0 | 1 | 2, // pending, installed, failed
  value: any,
  listeners: null | Array<Listener>,
  inputs: any,
  // Some producers install both a transport tuple and its native view.
  aliases: null | Array<{object: Object, key: string}>,
};

// Reserving a collection makes its identity available, but its carrier can
// still be loading. Record whether its entries have been installed separately
// from the identity. This does not describe the entries' reachable contents.
export type ConstructionCollection<Listener> = {
  value: Set<any> | Map<any, any>,
  entries: ConstructionFact<Listener>,
  inputs: null | Array<any>,
};

// Keep all known inputs while a constructor waits. Subscribe to every missing
// field so failure is reported even if another input is still loading.
export type ConstructionInputs<Listener> = {
  values: any,
  pairs: boolean,
  waiting: null | Set<ConstructionFact<Listener>>,
};

export type ConstructionSequence = {
  values: Array<any>,
  output: Array<any>,
  published: number,
};

export type ConstructionState<Listener> = {
  fields: WeakMap<Object, Map<string, ConstructionFact<Listener>>>,
  collections: null | WeakMap<Object, ConstructionCollection<Listener>>,
  heads: null | WeakMap<Object, ConstructionFact<Listener>>,
  publications: null | WeakMap<Object, Listener>,
  sequences: null | WeakMap<Object, ConstructionSequence>,
  captures: null | WeakMap<Object, Array<any>>,
  debugLazies: null | WeakMap<Object, boolean>,
  debugReferences: null | WeakMap<Object, Set<string>>,
  operationQueue: Array<Listener>,
  publicationQueue: Array<Listener>,
  draining: boolean,
  waking: number,
  unfinished: number,
};

export function createConstructionState<
  Listener,
>(): ConstructionState<Listener> {
  return {
    fields: new WeakMap(),
    collections: null,
    heads: null,
    publications: null,
    sequences: null,
    captures: null,
    debugLazies: null,
    debugReferences: null,
    operationQueue: [],
    publicationQueue: [],
    draining: false,
    waking: 0,
    unfinished: 0,
  };
}

// Installed fields are read directly. A pending producer must be waited on,
// and a failed producer must throw instead of exposing its placeholder.
export function getPendingConstructionField<Listener>(
  state: null | ConstructionState<Listener>,
  parentObject: Object,
  key: string,
): void | ConstructionFact<Listener> {
  if (state === null) {
    return undefined;
  }
  const fields = state.fields.get(parentObject);
  const fact = fields === undefined ? undefined : fields.get(key);
  if (fact !== undefined && fact.status === CONSTRUCTION_FAILED) {
    throw fact.value;
  }
  return fact;
}

function createConstructionFact<Listener>(): ConstructionFact<Listener> {
  return {
    status: CONSTRUCTION_PENDING,
    value: null,
    listeners: null,
    inputs: null,
    aliases: null,
  };
}

export function registerConstructionField<Listener>(
  state: ConstructionState<Listener>,
  parentObject: Object,
  key: string,
): ConstructionFact<Listener> {
  let fields = state.fields.get(parentObject);
  if (fields === undefined) {
    fields = new Map();
    state.fields.set(parentObject, fields);
  }
  if (fields.has(key)) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('Two producers for one model field.');
  }
  const fact = createConstructionFact<Listener>();
  fields.set(key, fact);
  state.unfinished++;
  return fact;
}

// An alias uses the same producer and settlement, not a second obligation.
// The adapter must install every physical destination before settling it.
export function aliasConstructionField<Listener>(
  state: ConstructionState<Listener>,
  source: Object,
  sourceKey: string,
  object: Object,
  key: string,
): void {
  const sourceFields = state.fields.get(source);
  const fact =
    sourceFields === undefined ? undefined : sourceFields.get(sourceKey);
  if (fact === undefined) {
    return;
  }
  let fields = state.fields.get(object);
  if (fields === undefined) {
    fields = new Map();
    state.fields.set(object, fields);
  }
  fields.set(key, fact);
  if (fact.aliases === null) {
    fact.aliases = [{object, key}];
  } else {
    fact.aliases.push({object, key});
  }
}

function removeConstructionField<Listener>(
  state: ConstructionState<Listener>,
  object: Object,
  key: string,
): void {
  const fields = state.fields.get(object);
  if (fields !== undefined) {
    fields.delete(key);
    if (fields.size === 0) {
      state.fields.delete(object);
    }
  }
}

export function subscribeConstructionFact<Listener>(
  fact: ConstructionFact<Listener>,
  listener: Listener,
): void {
  if (fact.listeners === null) {
    fact.listeners = [listener];
  } else {
    fact.listeners.push(listener);
  }
}

// The caller has checked that this fact is still pending.
function settleConstructionFact<Listener>(
  fact: ConstructionFact<Listener>,
  status: 1 | 2,
  value: any,
): null | Array<Listener> {
  fact.status = status;
  fact.value = value;
  if (status === CONSTRUCTION_INSTALLED) {
    fact.inputs = null;
  }
  const listeners = fact.listeners;
  fact.listeners = null;
  return listeners;
}

export function settleConstructionField<Listener>(
  state: ConstructionState<Listener>,
  parentObject: Object,
  key: string,
  fact: ConstructionFact<Listener>,
  status: 1 | 2,
  value: any,
): null | Array<Listener> {
  if (fact.status !== CONSTRUCTION_PENDING) {
    return null;
  }
  const listeners = settleConstructionFact(fact, status, value);
  if (status === CONSTRUCTION_INSTALLED) {
    state.unfinished--;
    // The producer has installed the value. Later readers can use the field
    // directly instead of going through this fact.
    removeConstructionField(state, parentObject, key);
    const aliases = fact.aliases;
    if (aliases !== null) {
      for (let i = 0; i < aliases.length; i++) {
        removeConstructionField(state, aliases[i].object, aliases[i].key);
      }
      fact.aliases = null;
    }
  }
  // Failed assignments remain visible to later selected-path readers.
  return listeners;
}

export function reserveConstructionCollection<Listener>(
  state: ConstructionState<Listener>,
  value: Set<any> | Map<any, any>,
): ConstructionCollection<Listener> {
  const collection: ConstructionCollection<Listener> = {
    value,
    entries: createConstructionFact<Listener>(),
    inputs: null,
  };
  let collections = state.collections;
  if (collections === null) {
    collections = state.collections = new WeakMap();
  }
  collections.set(value, collection);
  state.unfinished++;
  return collection;
}

export function settleConstructionEntries<Listener>(
  state: ConstructionState<Listener>,
  collection: ConstructionCollection<Listener>,
  status: 1 | 2,
  value: any,
): null | Array<Listener> {
  const fact = collection.entries;
  if (fact.status !== CONSTRUCTION_PENDING) {
    return null;
  }
  const listeners = settleConstructionFact(fact, status, value);
  if (status === CONSTRUCTION_INSTALLED) {
    state.unfinished--;
    const collections = state.collections;
    if (collections !== null) {
      collections.delete(collection.value);
    }
    collection.inputs = null;
  }
  // The identity has already been installed. Retain a failed entries fact
  // instead of replacing the identity's successful result with an error.
  return listeners;
}

export function createConstructionInputs<Listener>(
  values: any,
  pairs: boolean,
): ConstructionInputs<Listener> {
  return {values, pairs, waiting: null};
}

export function readConstructionInputs<Listener>(
  state: null | ConstructionState<Listener>,
  inputs: ConstructionInputs<Listener>,
): null | Array<ConstructionFact<Listener>> {
  const values = inputs.values;
  let pending: null | Array<ConstructionFact<Listener>> = null;
  const fields = state === null ? undefined : state.fields.get(values);
  if (fields !== undefined) {
    const iterator = fields.values();
    let entry = iterator.next();
    while (!entry.done) {
      const fact = entry.value;
      if (fact.status === CONSTRUCTION_FAILED) {
        throw fact.value;
      }
      if (pending === null) {
        pending = [];
      }
      pending.push(fact);
      entry = iterator.next();
    }
  }
  if (inputs.pairs) {
    for (let i = 0; i < values.length; i++) {
      if (getPendingConstructionField(state, values, '' + i) !== undefined) {
        continue;
      }
      const pair = values[i];
      for (let j = 0; j < 2; j++) {
        const fact = getPendingConstructionField(
          state,
          pair,
          j === 0 ? '0' : '1',
        );
        if (fact !== undefined) {
          if (pending === null) {
            pending = [];
          }
          pending.push(fact);
        }
      }
    }
  }
  return pending;
}

export function subscribeConstructionFacts<Listener>(
  waiting: null | Set<ConstructionFact<Listener>>,
  pending: Array<ConstructionFact<Listener>>,
  listener: Listener,
): Set<ConstructionFact<Listener>> {
  if (waiting === null) {
    waiting = new Set();
  }
  for (let i = 0; i < pending.length; i++) {
    const fact = pending[i];
    if (!waiting.has(fact)) {
      waiting.add(fact);
      subscribeConstructionFact(fact, listener);
    }
  }
  return waiting;
}

// A parsed model can have a usable identity while some of its fields load.
// This record is private availability, not permission to publish its contents.
export function installConstructionHead<Listener>(
  state: ConstructionState<Listener>,
  chunk: Object,
  value: any,
): void {
  let heads = state.heads;
  if (heads === null) {
    heads = state.heads = new WeakMap();
  }
  if (!heads.has(chunk)) {
    const fact = createConstructionFact<Listener>();
    settleConstructionFact(fact, CONSTRUCTION_INSTALLED, value);
    heads.set(chunk, fact);
  }
}

export function getConstructionHead<Listener>(
  state: null | ConstructionState<Listener>,
  chunk: Object,
): void | ConstructionFact<Listener> {
  if (state === null || state.heads === null) {
    return undefined;
  }
  return state.heads.get(chunk);
}

export function getConstructionSequence<Listener>(
  state: ConstructionState<Listener>,
  owner: Object,
  output: Array<any>,
): ConstructionSequence {
  let sequences = state.sequences;
  if (sequences === null) {
    sequences = state.sequences = new WeakMap();
  }
  let sequence = sequences.get(owner);
  if (sequence === undefined) {
    sequence = {values: [], output, published: 0};
    sequences.set(owner, sequence);
    sequences.set(sequence.values, sequence);
  }
  return sequence;
}

// Native iterators and bound functions retain model values without exposing
// them as enumerable properties. Publication follows those same inputs.
export function captureConstructionValue<Listener>(
  state: null | ConstructionState<Listener>,
  value: Object,
  inputs: Array<any>,
): void {
  if (state !== null) {
    let captures = state.captures;
    if (captures === null) {
      captures = state.captures = new WeakMap();
    }
    captures.set(value, inputs);
  }
}

// Each reserved slot has a producer before any work runs. Only a contiguous
// installed prefix is visible; an out-of-order completion never creates holes.
export function publishConstructionSequence<Listener>(
  state: ConstructionState<Listener>,
  sequence: ConstructionSequence,
): void {
  while (sequence.published < sequence.values.length) {
    const i = sequence.published;
    if (
      getPendingConstructionField(state, sequence.values, '' + i) !== undefined
    ) {
      return;
    }
    sequence.output.push(sequence.values[i]);
    sequence.published++;
  }
}

// Follow ordinary contents, including known inputs behind a reserved identity.
// Cycles add no obligation by themselves: each identity is examined once, and
// every pending field or entries fact remains part of the missing frontier.
export function readConstructionContents<Listener>(
  state: ConstructionState<Listener>,
  root: any,
  isBoundary: any => boolean,
): null | Array<ConstructionFact<Listener>> {
  if (state.unfinished === 0) {
    return null;
  }
  const todo: Array<any> = [root];
  const seen = new Set<Object>();
  let pending: null | Array<ConstructionFact<Listener>> = null;
  for (let i = 0; i < todo.length; i++) {
    const value = todo[i];
    if (
      value === null ||
      (typeof value !== 'object' && typeof value !== 'function') ||
      seen.has(value) ||
      isBoundary(value)
    ) {
      continue;
    }
    seen.add(value);
    const collection =
      state.collections === null ? undefined : state.collections.get(value);
    if (collection !== undefined) {
      const fact = collection.entries;
      if (fact.status === CONSTRUCTION_FAILED) {
        throw fact.value;
      }
      if (pending === null) {
        pending = [];
      }
      pending.push(fact);
      if (collection.inputs !== null) {
        todo.push(collection.inputs);
      }
    }
    const captured =
      state.captures === null ? undefined : state.captures.get(value);
    if (captured !== undefined) {
      todo.push(captured);
    } else if (value instanceof Set) {
      const iterator = value.values();
      let entry = iterator.next();
      while (!entry.done) {
        todo.push(entry.value);
        entry = iterator.next();
      }
    } else if (value instanceof Map) {
      const iterator = value.entries();
      let entry = iterator.next();
      while (!entry.done) {
        todo.push(entry.value[0], entry.value[1]);
        entry = iterator.next();
      }
    } else if (isArray(value) || getPrototypeOf(value) === ObjectPrototype) {
      const keys = Object.keys(value);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const fact = getPendingConstructionField(state, value, key);
        if (fact === undefined) {
          const field = Object.getOwnPropertyDescriptor(value, key);
          if (field !== undefined && hasOwnProperty.call(field, 'value')) {
            todo.push(field.value);
          }
        } else {
          if (pending === null) {
            pending = [];
          }
          pending.push(fact);
          if (fact.inputs !== null) {
            todo.push(fact.inputs);
          }
        }
      }
    }
  }
  return pending;
}

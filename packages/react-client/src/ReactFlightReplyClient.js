/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Thenable,
  PendingThenable,
  FulfilledThenable,
  RejectedThenable,
  ReactCustomFormAction,
  ReactFunctionLocation,
} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {TemporaryReferenceSet} from './ReactFlightTemporaryReferences';

import {
  REACT_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_CONTEXT_TYPE,
  getIteratorFn,
  ASYNC_ITERATOR,
} from 'shared/ReactSymbols';

import {
  describeObjectForErrorMessage,
  isSimpleObject,
  objectName,
} from 'shared/ReactSerializationErrors';

import {writeTemporaryReference} from './ReactFlightTemporaryReferences';

import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';
import getPrototypeOf from 'shared/getPrototypeOf';

const ObjectPrototype = Object.prototype;

import {
  usedWithSSR,
  checkEvalAvailabilityOnceDev,
} from './ReactFlightClientConfig';

type ReactJSONValue =
  | string
  | boolean
  | number
  | null
  | $ReadOnlyArray<ReactJSONValue>
  | ReactServerObject;

export opaque type ServerReference<T> = T;

export type CallServerCallback = <A, T>(id: any, args: A) => Promise<T>;

export type EncodeFormActionCallback = <A>(
  id: any,
  args: Promise<A>,
) => ReactCustomFormAction;

export type ServerReferenceId = any;

type ServerReferenceClosure = {
  id: ServerReferenceId,
  originalBind: Function,
  bound: null | Thenable<Array<any>>,
};

const knownServerReferences: WeakMap<Function, ServerReferenceClosure> =
  new WeakMap();

// Serializable values
export type ReactServerValue =
  // References are passed by their value
  | ServerReference<any>
  // The rest are passed as is. Sub-types can be passed in but lose their
  // subtype, so the receiver can only accept once of these.
  | string
  | boolean
  | number
  | null
  | void
  | bigint
  | $AsyncIterable<ReactServerValue, ReactServerValue, void>
  | $AsyncIterator<ReactServerValue, ReactServerValue, void>
  | Iterable<ReactServerValue>
  | Iterator<ReactServerValue>
  | Array<ReactServerValue>
  | Map<ReactServerValue, ReactServerValue>
  | Set<ReactServerValue>
  | FormData
  | Date
  | ReactServerObject
  | Promise<ReactServerValue>; // Thenable<ReactServerValue>

type ReactServerObject = {+[key: string]: ReactServerValue};

const __PROTO__ = '__proto__';

function serializeByValueID(id: number): string {
  return '$' + id.toString(16);
}

function serializePromiseID(id: number): string {
  return '$@' + id.toString(16);
}

function serializeServerReferenceID(id: number): string {
  return '$h' + id.toString(16);
}

function serializeTemporaryReferenceMarker(): string {
  return '$T';
}

function serializeFormDataReference(id: number): string {
  return '$K' + id.toString(16);
}

function serializeNumber(number: number): string | number {
  if (Number.isFinite(number)) {
    if (number === 0 && 1 / number === -Infinity) {
      return '$-0';
    } else {
      return number;
    }
  } else {
    if (number === Infinity) {
      return '$Infinity';
    } else if (number === -Infinity) {
      return '$-Infinity';
    } else {
      return '$NaN';
    }
  }
}

function serializeUndefined(): string {
  return '$undefined';
}

function serializeDateFromDateJSON(dateJSON: string): string {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  return '$D' + dateJSON;
}

function serializeBigInt(n: bigint): string {
  return '$n' + n.toString(10);
}

function serializeMapID(id: number): string {
  return '$Q' + id.toString(16);
}

function serializeSetID(id: number): string {
  return '$W' + id.toString(16);
}

function serializeNullPrototypeObjectID(id: number): string {
  return '$p' + id.toString(16);
}

function serializeBlobID(id: number): string {
  return '$B' + id.toString(16);
}

function serializeIteratorID(id: number): string {
  return '$i' + id.toString(16);
}

function escapeStringValue(value: string): string {
  if (value[0] === '$') {
    // We need to escape $ prefixed strings since we use those to encode
    // references to IDs and as special symbol values.
    return '$' + value;
  } else {
    return value;
  }
}

interface Reference {}

export function processReply(
  root: ReactServerValue,
  formFieldPrefix: string,
  temporaryReferences: void | TemporaryReferenceSet,
  resolve: (string | FormData) => void,
  reject: (error: mixed) => void,
): (reason: mixed) => void {
  let nextPartId = 1;
  let pendingParts = 0;
  let formData: null | FormData = null;
  const writtenObjects: WeakMap<Reference, string> = new WeakMap();
  let modelRoot: null | ReactServerValue = root;

  if (__DEV__) {
    // We use eval to create fake function stacks which includes Component stacks.
    // A warning would be noise if you used Flight without Components and don't encounter
    // errors. We're warning eagerly so that you configure your environment accordingly
    // before you encounter an error.
    checkEvalAvailabilityOnceDev();
  }

  function serializeTypedArray(
    tag: string,
    typedArray: $ArrayBufferView,
  ): string {
    const blob = new Blob([
      // We should be able to pass the buffer straight through but Node < 18 treat
      // multi-byte array blobs differently so we first convert it to single-byte.
      new Uint8Array(
        typedArray.buffer,
        typedArray.byteOffset,
        typedArray.byteLength,
      ),
    ]);
    const blobId = nextPartId++;
    if (formData === null) {
      formData = new FormData();
    }
    formData.append(formFieldPrefix + blobId, blob);
    return '$' + tag + blobId.toString(16);
  }

  function serializeNullPrototypeObject(object: any): string {
    const objectId = nextPartId++;
    const entries: Array<[string, ReactServerValue]> = [];
    for (const key in object) {
      if (hasOwnProperty.call(object, key)) {
        entries.push([key, object[key]]);
      }
    }
    const partJSON = serializeModel(entries, objectId);
    if (formData === null) {
      formData = new FormData();
    }
    formData.append(formFieldPrefix + objectId, partJSON);
    return serializeNullPrototypeObjectID(objectId);
  }

  function serializeBinaryReader(reader: any): string {
    if (formData === null) {
      // Upgrade to use FormData to allow us to stream this value.
      formData = new FormData();
    }
    const data = formData;

    pendingParts++;
    const streamId = nextPartId++;

    const buffer = [];

    function progress(entry: {done: boolean, value: ReactServerValue, ...}) {
      if (entry.done) {
        const blobId = nextPartId++;
        data.append(formFieldPrefix + blobId, new Blob(buffer));
        data.append(
          formFieldPrefix + streamId,
          '"$o' + blobId.toString(16) + '"',
        );
        data.append(formFieldPrefix + streamId, 'C'); // Close signal
        pendingParts--;
        if (pendingParts === 0) {
          resolve(data);
        }
      } else {
        buffer.push(entry.value);
        reader.read(new Uint8Array(1024)).then(progress, reject);
      }
    }
    reader.read(new Uint8Array(1024)).then(progress, reject);

    return '$r' + streamId.toString(16);
  }

  function serializeReader(reader: ReadableStreamReader): string {
    if (formData === null) {
      // Upgrade to use FormData to allow us to stream this value.
      formData = new FormData();
    }
    const data = formData;

    pendingParts++;
    const streamId = nextPartId++;

    function progress(entry: {done: boolean, value: ReactServerValue, ...}) {
      if (entry.done) {
        data.append(formFieldPrefix + streamId, 'C'); // Close signal
        pendingParts--;
        if (pendingParts === 0) {
          resolve(data);
        }
      } else {
        try {
          // $FlowFixMe[incompatible-type]: While plain JSON can return undefined we never do here.
          const partJSON: string = JSON.stringify(entry.value, resolveToJSON);
          data.append(formFieldPrefix + streamId, partJSON);
          reader.read().then(progress, reject);
        } catch (x) {
          reject(x);
        }
      }
    }
    reader.read().then(progress, reject);

    return '$R' + streamId.toString(16);
  }

  function serializeReadableStream(stream: ReadableStream): string {
    // Detect if this is a BYOB stream. BYOB streams should be able to be read as bytes on the
    // receiving side. For binary streams, we serialize them as plain Blobs.
    let binaryReader;
    try {
      // $FlowFixMe[extra-arg]: This argument is accepted.
      binaryReader = stream.getReader({mode: 'byob'});
    } catch (x) {
      return serializeReader(stream.getReader());
    }
    return serializeBinaryReader(binaryReader);
  }

  function serializeAsyncIterable(
    iterable: $AsyncIterable<ReactServerValue, ReactServerValue, void>,
    iterator: $AsyncIterator<ReactServerValue, ReactServerValue, void>,
  ): string {
    if (formData === null) {
      // Upgrade to use FormData to allow us to stream this value.
      formData = new FormData();
    }
    const data = formData;

    pendingParts++;
    const streamId = nextPartId++;

    // Generators/Iterators are Iterables but they're also their own iterator
    // functions. If that's the case, we treat them as single-shot. Otherwise,
    // we assume that this iterable might be a multi-shot and allow it to be
    // iterated more than once on the receiving server.
    const isIterator = iterable === iterator;

    // There's a race condition between when the stream is aborted and when the promise
    // resolves so we track whether we already aborted it to avoid writing twice.
    function progress(
      entry:
        | {done: false, +value: ReactServerValue, ...}
        | {done: true, +value: ReactServerValue, ...},
    ) {
      if (entry.done) {
        if (entry.value === undefined) {
          data.append(formFieldPrefix + streamId, 'C'); // Close signal
        } else {
          // Unlike streams, the last value may not be undefined. If it's not
          // we outline it and encode a reference to it in the closing instruction.
          try {
            // $FlowFixMe[incompatible-type]: While plain JSON can return undefined we never do here.
            const partJSON: string = JSON.stringify(entry.value, resolveToJSON);
            data.append(formFieldPrefix + streamId, 'C' + partJSON); // Close signal
          } catch (x) {
            reject(x);
            return;
          }
        }
        pendingParts--;
        if (pendingParts === 0) {
          resolve(data);
        }
      } else {
        try {
          // $FlowFixMe[incompatible-type]: While plain JSON can return undefined we never do here.
          const partJSON: string = JSON.stringify(entry.value, resolveToJSON);
          data.append(formFieldPrefix + streamId, partJSON);
          iterator.next().then(progress, reject);
        } catch (x) {
          reject(x);
          return;
        }
      }
    }

    iterator.next().then(progress, reject);
    return '$' + (isIterator ? 'x' : 'X') + streamId.toString(16);
  }

  function resolveToJSON(
    this:
      | {+[key: string | number]: ReactServerValue}
      | $ReadOnlyArray<ReactServerValue>,
    key: string,
    value: ReactServerValue,
  ): ReactJSONValue {
    const parent = this;

    if (__DEV__) {
      if (key === __PROTO__) {
        console.error(
          'Expected not to serialize an object with own property `__proto__`. When parsed this property will be omitted.%s',
          describeObjectForErrorMessage(parent, key),
        );
      }
    }

    // Make sure that `parent[key]` wasn't JSONified before `value` was passed to us
    if (__DEV__) {
      // $FlowFixMe[incompatible-use]
      const originalValue = parent[key];
      if (
        typeof originalValue === 'object' &&
        originalValue !== value &&
        !(originalValue instanceof Date)
      ) {
        if (objectName(originalValue) !== 'Object') {
          console.error(
            'Only plain objects can be passed to Server Functions from the Client. ' +
              '%s objects are not supported.%s',
            objectName(originalValue),
            describeObjectForErrorMessage(parent, key),
          );
        } else {
          console.error(
            'Only plain objects can be passed to Server Functions from the Client. ' +
              'Objects with toJSON methods are not supported. Convert it manually ' +
              'to a simple value before passing it to props.%s',
            describeObjectForErrorMessage(parent, key),
          );
        }
      }
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'object') {
      switch ((value as any).$$typeof) {
        case REACT_ELEMENT_TYPE: {
          if (temporaryReferences !== undefined && key.indexOf(':') === -1) {
            // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
            const parentReference = writtenObjects.get(parent);
            if (parentReference !== undefined) {
              // If the parent has a reference, we can refer to this object indirectly
              // through the property name inside that parent.
              const reference = parentReference + ':' + key;
              // Store this object so that the server can refer to it later in responses.
              writeTemporaryReference(temporaryReferences, reference, value);
              return serializeTemporaryReferenceMarker();
            }
          }
          // This element is the root of a serializeModel call (e.g. JSX
          // passed directly to encodeReply, or a promise that resolved to
          // JSX). It was already registered as a temporary reference by
          // serializeModel so we just need to emit the marker.
          if (temporaryReferences !== undefined && modelRoot === value) {
            modelRoot = null;
            return serializeTemporaryReferenceMarker();
          }
          throw new Error(
            'React Element cannot be passed to Server Functions from the Client without a ' +
              'temporary reference set. Pass a TemporaryReferenceSet to the options.' +
              (__DEV__ ? describeObjectForErrorMessage(parent, key) : ''),
          );
        }
        case REACT_LAZY_TYPE: {
          // Resolve lazy as if it wasn't here. In the future this will be encoded as a Promise.
          const lazy: LazyComponent<any, any> = value as any;
          const payload = lazy._payload;
          const init = lazy._init;
          if (formData === null) {
            // Upgrade to use FormData to allow us to stream this value.
            formData = new FormData();
          }
          pendingParts++;
          try {
            const resolvedModel = init(payload);
            // We always outline this as a separate part even though we could inline it
            // because it ensures a more deterministic encoding.
            const lazyId = nextPartId++;
            const partJSON = serializeModel(resolvedModel, lazyId);
            // $FlowFixMe[incompatible-type] We know it's not null because we assigned it above.
            const data: FormData = formData;
            data.append(formFieldPrefix + lazyId, partJSON);
            return serializeByValueID(lazyId);
          } catch (x) {
            if (
              typeof x === 'object' &&
              x !== null &&
              typeof x.then === 'function'
            ) {
              // Suspended
              pendingParts++;
              const lazyId = nextPartId++;
              const thenable: Thenable<any> = x as any;
              const retry = function () {
                // While the first promise resolved, its value isn't necessarily what we'll
                // resolve into because we might suspend again.
                try {
                  const partJSON = serializeModel(value, lazyId);
                  // $FlowFixMe[incompatible-type] We know it's not null because we assigned it above.
                  const data: FormData = formData;
                  data.append(formFieldPrefix + lazyId, partJSON);
                  pendingParts--;
                  if (pendingParts === 0) {
                    resolve(data);
                  }
                } catch (reason) {
                  reject(reason);
                }
              };
              thenable.then(retry, retry);
              return serializeByValueID(lazyId);
            } else {
              // In the future we could consider serializing this as an error
              // that throws on the server instead.
              reject(x);
              return null;
            }
          } finally {
            pendingParts--;
          }
        }
      }

      const existingReference = writtenObjects.get(value);

      // $FlowFixMe[method-unbinding]
      if (typeof value.then === 'function') {
        if (existingReference !== undefined) {
          if (modelRoot === value) {
            // This is the ID we're currently emitting so we need to write it
            // once but if we discover it again, we refer to it by id.
            modelRoot = null;
          } else {
            // We've already emitted this as an outlined object, so we can
            // just refer to that by its existing ID.
            return existingReference;
          }
        }

        // We assume that any object with a .then property is a "Thenable" type,
        // or a Promise type. Either of which can be represented by a Promise.
        if (formData === null) {
          // Upgrade to use FormData to allow us to stream this value.
          formData = new FormData();
        }
        pendingParts++;
        const promiseId = nextPartId++;
        const promiseReference = serializePromiseID(promiseId);
        writtenObjects.set(value, promiseReference);
        const thenable: Thenable<any> = value as any;
        thenable.then(
          partValue => {
            try {
              const previousReference = writtenObjects.get(partValue);
              let partJSON;
              if (previousReference !== undefined) {
                partJSON = JSON.stringify(previousReference);
              } else {
                partJSON = serializeModel(partValue, promiseId);
              }
              // $FlowFixMe[incompatible-type] We know it's not null because we assigned it above.
              const data: FormData = formData;
              data.append(formFieldPrefix + promiseId, partJSON);
              pendingParts--;
              if (pendingParts === 0) {
                resolve(data);
              }
            } catch (reason) {
              reject(reason);
            }
          },
          // In the future we could consider serializing this as an error
          // that throws on the server instead.
          reject,
        );
        return promiseReference;
      }

      if (existingReference !== undefined) {
        if (modelRoot === value) {
          // This is the ID we're currently emitting so we need to write it
          // once but if we discover it again, we refer to it by id.
          modelRoot = null;
        } else {
          // We've already emitted this as an outlined object, so we can
          // just refer to that by its existing ID.
          return existingReference;
        }
      } else if (key.indexOf(':') === -1) {
        // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
        const parentReference = writtenObjects.get(parent);
        if (parentReference !== undefined) {
          // If the parent has a reference, we can refer to this object indirectly
          // through the property name inside that parent.
          const reference = parentReference + ':' + key;
          writtenObjects.set(value, reference);
          if (temporaryReferences !== undefined) {
            // Store this object so that the server can refer to it later in responses.
            writeTemporaryReference(temporaryReferences, reference, value);
          }
        }
      }

      if (isArray(value)) {
        // $FlowFixMe[incompatible-type]
        return value;
      }
      // TODO: Should we the Object.prototype.toString.call() to test for cross-realm objects?
      if (value instanceof FormData) {
        if (formData === null) {
          // Upgrade to use FormData to allow us to use rich objects as its values.
          formData = new FormData();
        }
        const data: FormData = formData;
        const refId = nextPartId++;
        // Copy all the form fields with a prefix for this reference.
        // These must come first in the form order because we assume that all the
        // fields are available before this is referenced.
        // We include a special marker so that the Server can detect FormData entries
        // that are values in referenced FormData objects.
        const prefix = formFieldPrefix + '_' + refId + '_';
        // $FlowFixMe[prop-missing]: FormData has forEach.
        value.forEach((originalValue: string | File, originalKey: string) => {
          // $FlowFixMe[incompatible-type]
          data.append(prefix + originalKey, originalValue);
        });
        return serializeFormDataReference(refId);
      }
      if (value instanceof Map) {
        const mapId = nextPartId++;
        const partJSON = serializeModel(Array.from(value), mapId);
        if (formData === null) {
          formData = new FormData();
        }
        formData.append(formFieldPrefix + mapId, partJSON);
        return serializeMapID(mapId);
      }
      if (value instanceof Set) {
        const setId = nextPartId++;
        const partJSON = serializeModel(Array.from(value), setId);
        if (formData === null) {
          formData = new FormData();
        }
        formData.append(formFieldPrefix + setId, partJSON);
        return serializeSetID(setId);
      }

      if (value instanceof ArrayBuffer) {
        const blob = new Blob([value]);
        const blobId = nextPartId++;
        if (formData === null) {
          formData = new FormData();
        }
        formData.append(formFieldPrefix + blobId, blob);
        return '$' + 'A' + blobId.toString(16);
      }
      if (value instanceof Int8Array) {
        // char
        return serializeTypedArray('O', value);
      }
      if (value instanceof Uint8Array) {
        // unsigned char
        return serializeTypedArray('o', value);
      }
      if (value instanceof Uint8ClampedArray) {
        // unsigned clamped char
        return serializeTypedArray('U', value);
      }
      if (value instanceof Int16Array) {
        // sort
        return serializeTypedArray('S', value);
      }
      if (value instanceof Uint16Array) {
        // unsigned short
        return serializeTypedArray('s', value);
      }
      if (value instanceof Int32Array) {
        // long
        return serializeTypedArray('L', value);
      }
      if (value instanceof Uint32Array) {
        // unsigned long
        return serializeTypedArray('l', value);
      }
      if (value instanceof Float32Array) {
        // float
        return serializeTypedArray('G', value);
      }
      if (value instanceof Float64Array) {
        // double
        return serializeTypedArray('g', value);
      }
      if (value instanceof BigInt64Array) {
        // number
        return serializeTypedArray('M', value);
      }
      if (value instanceof BigUint64Array) {
        // unsigned number
        // We use "m" instead of "n" since JSON can start with "null"
        return serializeTypedArray('m', value);
      }
      if (value instanceof DataView) {
        return serializeTypedArray('V', value);
      }
      // TODO: Blob is not available in old Node/browsers. Remove the typeof check later.
      if (typeof Blob === 'function' && value instanceof Blob) {
        if (formData === null) {
          formData = new FormData();
        }
        const blobId = nextPartId++;
        formData.append(formFieldPrefix + blobId, value);
        return serializeBlobID(blobId);
      }

      const iteratorFn = getIteratorFn(value);
      if (iteratorFn) {
        const iterator = iteratorFn.call(value);
        // $FlowFixMe[invalid-compare]
        if (iterator === value) {
          // Iterator, not Iterable
          const iteratorId = nextPartId++;
          const partJSON = serializeModel(
            Array.from(iterator as any),
            iteratorId,
          );
          if (formData === null) {
            formData = new FormData();
          }
          formData.append(formFieldPrefix + iteratorId, partJSON);
          return serializeIteratorID(iteratorId);
        }
        return Array.from(iterator as any);
      }

      // TODO: ReadableStream is not available in old Node. Remove the typeof check later.
      if (
        typeof ReadableStream === 'function' &&
        value instanceof ReadableStream
      ) {
        return serializeReadableStream(value);
      }
      const getAsyncIterator: void | (() => $AsyncIterator<any, any, any>) = (
        value as any
      )[ASYNC_ITERATOR];
      if (typeof getAsyncIterator === 'function') {
        // We treat AsyncIterables as a Fragment and as such we might need to key them.
        return serializeAsyncIterable(
          value as any,
          getAsyncIterator.call(value as any),
        );
      }

      // Verify that this is a simple plain object.
      const proto = getPrototypeOf(value);
      if (proto === null) {
        if (__DEV__) {
          if (Object.getOwnPropertySymbols) {
            const symbols = Object.getOwnPropertySymbols(value);
            if (symbols.length > 0) {
              console.error(
                'Only plain objects can be passed to Server Functions from the Client. ' +
                  'Objects with symbol properties like %s are not supported.%s',
                symbols[0].description,
                describeObjectForErrorMessage(parent, key),
              );
            }
          }
        }
        return serializeNullPrototypeObject(value);
      }
      if (proto !== ObjectPrototype && getPrototypeOf(proto) !== null) {
        if (temporaryReferences === undefined) {
          throw new Error(
            'Only plain objects, and a few built-ins, can be passed to Server Functions. ' +
              'Classes are not supported.' +
              (__DEV__ ? describeObjectForErrorMessage(parent, key) : ''),
          );
        }
        // We will have written this object to the temporary reference set above
        // so we can replace it with a marker to refer to this slot later.
        return serializeTemporaryReferenceMarker();
      }
      if (__DEV__) {
        if ((value as any).$$typeof === REACT_CONTEXT_TYPE) {
          console.error(
            'React Context Providers cannot be passed to Server Functions from the Client.%s',
            describeObjectForErrorMessage(parent, key),
          );
        } else if (objectName(value) !== 'Object') {
          console.error(
            'Only plain objects can be passed to Server Functions from the Client. ' +
              '%s objects are not supported.%s',
            objectName(value),
            describeObjectForErrorMessage(parent, key),
          );
        } else if (!isSimpleObject(value)) {
          console.error(
            'Only plain objects can be passed to Server Functions from the Client. ' +
              'Classes or other objects with methods are not supported.%s',
            describeObjectForErrorMessage(parent, key),
          );
        } else if (Object.getOwnPropertySymbols) {
          const symbols = Object.getOwnPropertySymbols(value);
          if (symbols.length > 0) {
            console.error(
              'Only plain objects can be passed to Server Functions from the Client. ' +
                'Objects with symbol properties like %s are not supported.%s',
              symbols[0].description,
              describeObjectForErrorMessage(parent, key),
            );
          }
        }
      }

      // $FlowFixMe[incompatible-return]
      return value;
    }

    if (typeof value === 'string') {
      // TODO: Maybe too clever. If we support URL there's no similar trick.
      if (value[value.length - 1] === 'Z') {
        // Possibly a Date, whose toJSON automatically calls toISOString
        // $FlowFixMe[incompatible-use]
        const originalValue = parent[key];
        if (originalValue instanceof Date) {
          return serializeDateFromDateJSON(value);
        }
      }

      return escapeStringValue(value);
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return serializeNumber(value);
    }

    if (typeof value === 'undefined') {
      return serializeUndefined();
    }

    if (typeof value === 'function') {
      const referenceClosure = knownServerReferences.get(value);
      if (referenceClosure !== undefined) {
        const existingReference = writtenObjects.get(value);
        if (existingReference !== undefined) {
          return existingReference;
        }
        const {id, bound} = referenceClosure;
        const referenceClosureJSON = JSON.stringify({id, bound}, resolveToJSON);
        if (formData === null) {
          // Upgrade to use FormData to allow us to stream this value.
          formData = new FormData();
        }
        // The reference to this function came from the same client so we can pass it back.
        const refId = nextPartId++;
        formData.set(formFieldPrefix + refId, referenceClosureJSON);
        const serverReferenceId = serializeServerReferenceID(refId);
        // Store the server reference ID for deduplication.
        writtenObjects.set(value, serverReferenceId);
        return serverReferenceId;
      }
      if (temporaryReferences !== undefined && key.indexOf(':') === -1) {
        // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
        const parentReference = writtenObjects.get(parent);
        if (parentReference !== undefined) {
          // If the parent has a reference, we can refer to this object indirectly
          // through the property name inside that parent.
          const reference = parentReference + ':' + key;
          // Store this object so that the server can refer to it later in responses.
          writeTemporaryReference(temporaryReferences, reference, value);
          return serializeTemporaryReferenceMarker();
        }
      }
      throw new Error(
        'Client Functions cannot be passed directly to Server Functions. ' +
          'Only Functions passed from the Server can be passed back again.',
      );
    }

    if (typeof value === 'symbol') {
      if (temporaryReferences !== undefined && key.indexOf(':') === -1) {
        // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
        const parentReference = writtenObjects.get(parent);
        if (parentReference !== undefined) {
          // If the parent has a reference, we can refer to this object indirectly
          // through the property name inside that parent.
          const reference = parentReference + ':' + key;
          // Store this object so that the server can refer to it later in responses.
          writeTemporaryReference(temporaryReferences, reference, value);
          return serializeTemporaryReferenceMarker();
        }
      }
      throw new Error(
        'Symbols cannot be passed to a Server Function without a ' +
          'temporary reference set. Pass a TemporaryReferenceSet to the options.' +
          (__DEV__ ? describeObjectForErrorMessage(parent, key) : ''),
      );
    }

    if (typeof value === 'bigint') {
      return serializeBigInt(value);
    }

    throw new Error(
      `Type ${typeof value} is not supported as an argument to a Server Function.`,
    );
  }

  function serializeModel(model: ReactServerValue, id: number): string {
    if (typeof model === 'object' && model !== null) {
      const reference = serializeByValueID(id);
      writtenObjects.set(model, reference);
      if (temporaryReferences !== undefined) {
        // Store this object so that the server can refer to it later in responses.
        writeTemporaryReference(temporaryReferences, reference, model);
      }
    }
    modelRoot = model;
    // $FlowFixMe[incompatible-type] it's not going to be undefined because we'll encode it.
    return JSON.stringify(model, resolveToJSON);
  }

  function abort(reason: mixed): void {
    if (pendingParts > 0) {
      pendingParts = 0; // Don't resolve again later.
      // Resolve with what we have so far, which may have holes at this point.
      // They'll error when the stream completes on the server.
      if (formData === null) {
        resolve(json);
      } else {
        resolve(formData);
      }
    }
  }

  const json = serializeModel(root, 0);

  if (formData === null) {
    // If it's a simple data structure, we just use plain JSON.
    resolve(json);
  } else {
    // Otherwise, we use FormData to let us stream in the result.
    formData.set(formFieldPrefix + '0', json);
    if (pendingParts === 0) {
      // $FlowFixMe[incompatible-type] this has already been refined.
      resolve(formData);
    }
  }

  return abort;
}

const boundCache: WeakMap<
  ServerReferenceClosure,
  Thenable<FormData>,
> = new WeakMap();

function encodeFormData(reference: any): Thenable<FormData> {
  let resolve, reject;
  // We need to have a handle on the thenable so that we can synchronously set
  // its status from processReply, when it can complete synchronously.
  const thenable: Thenable<FormData> = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  processReply(
    reference,
    '',
    undefined, // TODO: This means React Elements can't be used as state in progressive enhancement.
    (body: string | FormData) => {
      if (typeof body === 'string') {
        const data = new FormData();
        data.append('0', body);
        body = data;
      }
      const fulfilled: FulfilledThenable<FormData> = thenable as any;
      fulfilled.status = 'fulfilled';
      fulfilled.value = body;
      resolve(body);
    },
    e => {
      const rejected: RejectedThenable<FormData> = thenable as any;
      rejected.status = 'rejected';
      rejected.reason = e;
      reject(e);
    },
  );
  return thenable;
}

function defaultEncodeFormAction(
  this: any => Promise<any>,
  identifierPrefix: string,
): ReactCustomFormAction {
  const referenceClosure = knownServerReferences.get(this);
  if (!referenceClosure) {
    throw new Error(
      'Tried to encode a Server Action from a different instance than the encoder is from. ' +
        'This is a bug in React.',
    );
  }
  let data: null | FormData = null;
  let name;
  const boundPromise = referenceClosure.bound;
  if (boundPromise !== null) {
    let thenable = boundCache.get(referenceClosure);
    if (!thenable) {
      const {id, bound} = referenceClosure;
      thenable = encodeFormData({id, bound});
      boundCache.set(referenceClosure, thenable);
    }
    if (thenable.status === 'rejected') {
      throw thenable.reason;
    } else if (thenable.status !== 'fulfilled') {
      throw thenable;
    }
    const encodedFormData = thenable.value;
    // This is hacky but we need the identifier prefix to be added to
    // all fields but the suspense cache would break since we might get
    // a new identifier each time. So we just append it at the end instead.
    const prefixedData = new FormData();
    // $FlowFixMe[prop-missing]
    encodedFormData.forEach((value: string | File, key: string) => {
      // $FlowFixMe[incompatible-type]
      prefixedData.append('$ACTION_' + identifierPrefix + ':' + key, value);
    });
    data = prefixedData;
    // We encode the name of the prefix containing the data.
    name = '$ACTION_REF_' + identifierPrefix;
  } else {
    // This is the simple case so we can just encode the ID.
    name = '$ACTION_ID_' + referenceClosure.id;
  }
  return {
    name: name,
    method: 'POST',
    encType: 'multipart/form-data',
    data: data,
  };
}

function customEncodeFormAction(
  reference: any => Promise<any>,
  identifierPrefix: string,
  encodeFormAction: EncodeFormActionCallback,
): ReactCustomFormAction {
  const referenceClosure = knownServerReferences.get(reference);
  if (!referenceClosure) {
    throw new Error(
      'Tried to encode a Server Action from a different instance than the encoder is from. ' +
        'This is a bug in React.',
    );
  }
  let boundPromise: Promise<Array<any>> = referenceClosure.bound as any;
  // $FlowFixMe[invalid-compare]
  if (boundPromise === null) {
    boundPromise = Promise.resolve([]);
  }
  return encodeFormAction(referenceClosure.id, boundPromise);
}

function isSignatureEqual(
  this: any => Promise<any>,
  referenceId: ServerReferenceId,
  numberOfBoundArgs: number,
): boolean {
  const referenceClosure = knownServerReferences.get(this);
  if (!referenceClosure) {
    throw new Error(
      'Tried to encode a Server Action from a different instance than the encoder is from. ' +
        'This is a bug in React.',
    );
  }
  if (referenceClosure.id !== referenceId) {
    // These are different functions.
    return false;
  }
  // Now check if the number of bound arguments is the same.
  const boundPromise = referenceClosure.bound;
  if (boundPromise === null) {
    // No bound arguments.
    return numberOfBoundArgs === 0;
  }
  // Unwrap the bound arguments array by suspending, if necessary. As with
  // encodeFormData, this means isSignatureEqual can only be called while React
  // is rendering.
  switch (boundPromise.status) {
    case 'fulfilled': {
      const boundArgs = boundPromise.value;
      return boundArgs.length === numberOfBoundArgs;
    }
    case 'pending': {
      throw boundPromise;
    }
    case 'rejected': {
      throw boundPromise.reason;
    }
    default: {
      if (typeof boundPromise.status === 'string') {
        // Only instrument the thenable if the status if not defined.
      } else {
        const pendingThenable: PendingThenable<Array<any>> =
          boundPromise as any;
        pendingThenable.status = 'pending';
        pendingThenable.then(
          (boundArgs: Array<any>) => {
            const fulfilledThenable: FulfilledThenable<Array<any>> =
              boundPromise as any;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = boundArgs;
          },
          (error: mixed) => {
            const rejectedThenable: RejectedThenable<number> =
              boundPromise as any;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          },
        );
      }
      throw boundPromise;
    }
  }
}

let fakeServerFunctionIdx = 0;

function createFakeServerFunction<A: Iterable<any>, T>(
  name: string,
  filename: string,
  sourceMap: null | string,
  line: number,
  col: number,
  environmentName: string,
  innerFunction: (...A) => Promise<T>,
): (...A) => Promise<T> {
  // This creates a fake copy of a Server Module. It represents the Server Action on the server.
  // We use an eval so we can source map it to the original location.

  const comment =
    '/* This module is a proxy to a Server Action. Turn on Source Maps to see the server source. */';

  if (!name) {
    // An eval:ed function with no name gets the name "eval". We give it something more descriptive.
    name = '<anonymous>';
  }
  const encodedName = JSON.stringify(name);
  // We generate code where both the beginning of the function and its parenthesis is at the line
  // and column of the server executed code. We use a method form since that lets us name it
  // anything we want and because the beginning of the function and its parenthesis is the same
  // column. Because Chrome inspects the location of the parenthesis and Firefox inspects the
  // location of the beginning of the function. By not using a function expression we avoid the
  // ambiguity.
  let code;
  if (line <= 1) {
    const minSize = encodedName.length + 7;
    code =
      's=>({' +
      encodedName +
      ' '.repeat(col < minSize ? 0 : col - minSize) +
      ':' +
      '(...args) => s(...args)' +
      '})\n' +
      comment;
  } else {
    code =
      comment +
      '\n'.repeat(line - 2) +
      'server=>({' +
      encodedName +
      ':\n' +
      ' '.repeat(col < 1 ? 0 : col - 1) +
      // The function body can get printed so we make it look nice.
      // This "calls the server with the arguments".
      '(...args) => server(...args)' +
      '})';
  }

  if (filename.startsWith('/')) {
    // If the filename starts with `/` we assume that it is a file system file
    // rather than relative to the current host. Since on the server fully qualified
    // stack traces use the file path.
    // TODO: What does this look like on Windows?
    filename = 'file://' + filename;
  }

  if (sourceMap) {
    // We use the prefix about://React/ to separate these from other files listed in
    // the Chrome DevTools. We need a "host name" and not just a protocol because
    // otherwise the group name becomes the root folder. Ideally we don't want to
    // show these at all but there's two reasons to assign a fake URL.
    // 1) A printed stack trace string needs a unique URL to be able to source map it.
    // 2) If source maps are disabled or fails, you should at least be able to tell
    //    which file it was.
    code +=
      '\n//# sourceURL=about://React/' +
      encodeURIComponent(environmentName) +
      '/' +
      encodeURI(filename) +
      '?s' + // We add an extra s here to distinguish from the fake stack frames
      fakeServerFunctionIdx++;
    code += '\n//# sourceMappingURL=' + sourceMap;
  } else if (filename) {
    code += '\n//# sourceURL=' + filename;
  }

  try {
    // Eval a factory and then call it to create a closure over the inner function.
    // eslint-disable-next-line no-eval
    return (0, eval)(code)(innerFunction)[name];
  } catch (x) {
    // If eval fails, such as if in an environment that doesn't support it,
    // we fallback to just returning the inner function.
    return innerFunction;
  }
}

export function registerBoundServerReference<T: Function>(
  reference: T,
  id: ServerReferenceId,
  bound: null | Thenable<Array<any>>,
  encodeFormAction: void | EncodeFormActionCallback,
): void {
  if (knownServerReferences.has(reference)) {
    return;
  }

  knownServerReferences.set(reference, {
    id,
    originalBind: reference.bind,
    bound,
  });

  // Expose encoder for use by SSR, as well as a special bind that can be used to
  // keep server capabilities.
  // $FlowFixMe[constant-condition]
  if (usedWithSSR) {
    // Only expose this in builds that would actually use it. Not needed in the browser.
    const $$FORM_ACTION =
      encodeFormAction === undefined
        ? defaultEncodeFormAction
        : function (
            this: any => Promise<any>,
            identifierPrefix: string,
          ): ReactCustomFormAction {
            return customEncodeFormAction(
              this,
              identifierPrefix,
              encodeFormAction,
            );
          };
    Object.defineProperties(reference as any, {
      $$FORM_ACTION: {value: $$FORM_ACTION},
      $$IS_SIGNATURE_EQUAL: {value: isSignatureEqual},
      bind: {value: bind},
    });
  }
}

export function registerServerReference<T: Function>(
  reference: T,
  id: ServerReferenceId,
  encodeFormAction?: EncodeFormActionCallback,
): ServerReference<T> {
  registerBoundServerReference(reference, id, null, encodeFormAction);
  return reference;
}

// $FlowFixMe[method-unbinding]
const FunctionBind = Function.prototype.bind;
// $FlowFixMe[method-unbinding]
const ArraySlice = Array.prototype.slice;
function bind(this: Function): Function {
  const referenceClosure = knownServerReferences.get(this);

  if (!referenceClosure) {
    // $FlowFixMe[incompatible-type]
    return FunctionBind.apply(this, arguments);
  }

  const newFn = referenceClosure.originalBind.apply(this, arguments);

  if (__DEV__) {
    const thisBind = arguments[0];
    if (thisBind != null) {
      // This doesn't warn in browser environments since it's not instrumented outside
      // usedWithSSR. This makes this an SSR only warning which we don't generally do.
      // TODO: Consider a DEV only instrumentation in the browser.
      console.error(
        'Cannot bind "this" of a Server Action. Pass null or undefined as the first argument to .bind().',
      );
    }
  }

  const args = ArraySlice.call(arguments, 1);
  let boundPromise = null;
  if (referenceClosure.bound !== null) {
    boundPromise = Promise.resolve(referenceClosure.bound as any).then(
      boundArgs => boundArgs.concat(args),
    );
  } else {
    boundPromise = Promise.resolve(args);
  }

  knownServerReferences.set(newFn, {
    id: referenceClosure.id,
    originalBind: newFn.bind,
    bound: boundPromise,
  });

  // Expose encoder for use by SSR, as well as a special bind that can be used to
  // keep server capabilities.
  // $FlowFixMe[constant-condition]
  if (usedWithSSR) {
    // Only expose this in builds that would actually use it. Not needed on the client.
    Object.defineProperties(newFn as any, {
      $$FORM_ACTION: {value: this.$$FORM_ACTION},
      $$IS_SIGNATURE_EQUAL: {value: isSignatureEqual},
      bind: {value: bind},
    });
  }

  return newFn;
}

export type FindSourceMapURLCallback = (
  fileName: string,
  environmentName: string,
) => null | string;

export function createBoundServerReference<A: Iterable<any>, T>(
  metaData: {
    id: ServerReferenceId,
    bound: null | Thenable<Array<any>>,
    name?: string, // DEV-only
    env?: string, // DEV-only
    location?: ReactFunctionLocation, // DEV-only
  },
  callServer: CallServerCallback,
  encodeFormAction?: EncodeFormActionCallback,
  findSourceMapURL?: FindSourceMapURLCallback, // DEV-only
): (...A) => Promise<T> {
  const id = metaData.id;
  const bound = metaData.bound;
  let action = function (): Promise<T> {
    // $FlowFixMe[method-unbinding]
    const args = Array.prototype.slice.call(arguments);
    const p = bound;
    if (!p) {
      return callServer(id, args);
    }
    if (p.status === 'fulfilled') {
      const boundArgs = p.value;
      return callServer(id, boundArgs.concat(args));
    }
    // Since this is a fake Promise whose .then doesn't chain, we have to wrap it.
    // TODO: Remove the wrapper once that's fixed.
    return (Promise.resolve(p) as any as Promise<Array<any>>).then(
      function (boundArgs) {
        return callServer(id, boundArgs.concat(args));
      },
    );
  };
  if (__DEV__) {
    const location = metaData.location;
    if (location) {
      const functionName = metaData.name || '';
      const [, filename, line, col] = location;
      const env = metaData.env || 'Server';
      const sourceMap =
        findSourceMapURL == null ? null : findSourceMapURL(filename, env);
      action = createFakeServerFunction(
        functionName,
        filename,
        sourceMap,
        line,
        col,
        env,
        action,
      );
    }
  }
  registerBoundServerReference(action, id, bound, encodeFormAction);
  return action;
}

// This matches either of these V8 formats.
//     at name (filename:0:0)
//     at filename:0:0
//     at async filename:0:0
const v8FrameRegExp =
  /^ {3} at (?:(.+) \((.+):(\d+):(\d+)\)|(?:async )?(.+):(\d+):(\d+))$/;
// This matches either of these JSC/SpiderMonkey formats.
// name@filename:0:0
// filename:0:0
const jscSpiderMonkeyFrameRegExp = /(?:(.*)@)?(.*):(\d+):(\d+)/;

function parseStackLocation(error: Error): null | ReactFunctionLocation {
  // This parsing is special in that we know that the calling function will always
  // be a module that initializes the server action. We also need this part to work
  // cross-browser so not worth a Config. It's DEV only so not super code size
  // sensitive but also a non-essential feature.
  let stack = error.stack;
  if (stack.startsWith('Error: react-stack-top-frame\n')) {
    // V8's default formatting prefixes with the error message which we
    // don't want/need.
    stack = stack.slice(29);
  }
  const endOfFirst = stack.indexOf('\n');
  let secondFrame;
  if (endOfFirst !== -1) {
    // Skip the first frame.
    const endOfSecond = stack.indexOf('\n', endOfFirst + 1);
    if (endOfSecond === -1) {
      secondFrame = stack.slice(endOfFirst + 1);
    } else {
      secondFrame = stack.slice(endOfFirst + 1, endOfSecond);
    }
  } else {
    secondFrame = stack;
  }

  let parsed = v8FrameRegExp.exec(secondFrame);
  if (!parsed) {
    parsed = jscSpiderMonkeyFrameRegExp.exec(secondFrame);
    if (!parsed) {
      return null;
    }
  }

  let name = parsed[1] || '';
  if (name === '<anonymous>') {
    name = '';
  }
  let filename = parsed[2] || parsed[5] || '';
  if (filename === '<anonymous>') {
    filename = '';
  }
  // This is really the enclosingLine/Column.
  const line = +(parsed[3] || parsed[6]);
  const col = +(parsed[4] || parsed[7]);

  return [name, filename, line, col];
}

export function createServerReference<A: Iterable<any>, T>(
  id: ServerReferenceId,
  callServer: CallServerCallback,
  encodeFormAction?: EncodeFormActionCallback,
  findSourceMapURL?: FindSourceMapURLCallback, // DEV-only
  functionName?: string,
): (...A) => Promise<T> {
  let action = function (): Promise<T> {
    // $FlowFixMe[method-unbinding]
    const args = Array.prototype.slice.call(arguments);
    return callServer(id, args);
  };
  if (__DEV__) {
    // Let's see if we can find a source map for the file which contained the
    // server action. We extract it from the runtime so that it's resilient to
    // multiple passes of compilation as long as we can find the final source map.
    const location = parseStackLocation(new Error('react-stack-top-frame'));
    if (location !== null) {
      const [, filename, line, col] = location;
      // While the environment that the Server Reference points to can be
      // in any environment, what matters here is where the compiled source
      // is from and that's in the currently executing environment. We hard
      // code that as the value "Client" in case the findSourceMapURL helper
      // needs it.
      const env = 'Client';
      const sourceMap =
        findSourceMapURL == null ? null : findSourceMapURL(filename, env);
      action = createFakeServerFunction(
        functionName || '',
        filename,
        sourceMap,
        line,
        col,
        env,
        action,
      );
    }
  }
  registerBoundServerReference(action, id, null, encodeFormAction);
  return action;
}

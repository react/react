/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  getDataType,
  getDisplayNameForReactElement,
  getAllEnumerableKeys,
  getInObject,
  formatDataForPreview,
  setInObject,
} from 'react-devtools-shared/src/utils';

import {REACT_LEGACY_ELEMENT_TYPE} from 'shared/ReactSymbols';

import type {
  DehydratedData,
  InspectedElementPath,
} from 'react-devtools-shared/src/frontend/types';

import noop from 'shared/noop';

export const meta = {
  inspectable: Symbol('inspectable') as symbol,
  inspected: Symbol('inspected') as symbol,
  name: Symbol('name') as symbol,
  preview_long: Symbol('preview_long') as symbol,
  preview_short: Symbol('preview_short') as symbol,
  readonly: Symbol('readonly') as symbol,
  size: Symbol('size') as symbol,
  type: Symbol('type') as symbol,
  unserializable: Symbol('unserializable') as symbol,
};

export type Dehydrated = {
  inspectable: boolean,
  name: string | null,
  preview_long: string | null,
  preview_short: string | null,
  readonly?: boolean,
  size?: number,
  type: string,
};

// Typed arrays, other complex iteratable objects (e.g. Map, Set, ImmutableJS) or Promises need special handling.
// These objects can't be serialized without losing type information,
// so a "Unserializable" type wrapper is used (with meta-data keys) to send nested values-
// while preserving the original type and name.
export type Unserializable = {
  name: string | null,
  preview_long: string | null,
  preview_short: string | null,
  readonly?: boolean,
  size?: number,
  type: string,
  unserializable: boolean,
  [string | number]: any,
};

// This threshold determines the depth at which the bridge "dehydrates" nested data.
// Dehydration means that we don't serialize the data for e.g. postMessage or stringify,
// unless the frontend explicitly requests it (e.g. a user clicks to expand a props object).
//
// Reducing this threshold will improve the speed of initial component inspection,
// but may decrease the responsiveness of expanding objects/arrays to inspect further.
const LEVEL_THRESHOLD = 2;

/**
 * Generate the dehydrated metadata for complex object instances
 */
function createDehydrated(
  type: string,
  inspectable: boolean,
  data: Object,
  cleaned: Array<Array<string | number>>,
  path: Array<string | number>,
): Dehydrated {
  cleaned.push(path);

  const dehydrated: Dehydrated = {
    inspectable,
    type,
    preview_long: formatDataForPreview(data, true),
    preview_short: formatDataForPreview(data, false),
    name:
      typeof data.constructor !== 'function' ||
      typeof data.constructor.name !== 'string' ||
      data.constructor.name === 'Object'
        ? ''
        : data.constructor.name,
  };

  if (type === 'array' || type === 'typed_array') {
    dehydrated.size = data.length;
  } else if (type === 'object') {
    dehydrated.size = Object.keys(data).length;
  }

  if (type === 'iterator' || type === 'typed_array') {
    dehydrated.readonly = true;
  }

  return dehydrated;
}

/**
 * Strip out complex data (instances, functions, and data nested > LEVEL_THRESHOLD levels deep).
 * The paths of the stripped out objects are appended to the `cleaned` list.
 * On the other side of the barrier, the cleaned list is used to "re-hydrate" the cleaned representation into
 * an object with symbols as attributes, so that a sanitized object can be distinguished from a normal object.
 *
 * Input: {"some": {"attr": fn()}, "other": AnInstance}
 * Output: {
 *   "some": {
 *     "attr": {"name": the fn.name, type: "function"}
 *   },
 *   "other": {
 *     "name": "AnInstance",
 *     "type": "object",
 *   },
 * }
 * and cleaned = [["some", "attr"], ["other"]]
 */
export function dehydrate(
  data: Object,
  cleaned: Array<Array<string | number>>,
  unserializable: Array<Array<string | number>>,
  path: Array<string | number>,
  isPathAllowed: (path: Array<string | number>) => boolean,
  level: number = 0,
): DehydratedData['data'] {
  const type = getDataType(data);

  let isPathAllowedCheck;

  switch (type) {
    case 'html_element':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: data.tagName,
        type,
      };

    case 'function':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name:
          typeof data.name === 'function' || !data.name
            ? 'function'
            : data.name,
        type,
      };

    case 'string':
      isPathAllowedCheck = isPathAllowed(path);
      if (isPathAllowedCheck) {
        return data;
      } else {
        return data.length <= 500 ? data : data.slice(0, 500) + '...';
      }

    case 'bigint':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: data.toString(),
        type,
      };

    case 'symbol':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: data.toString(),
        type,
      };

    case 'react_element': {
      isPathAllowedCheck = isPathAllowed(path);

      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        cleaned.push(path);
        return {
          inspectable: true,
          preview_short: formatDataForPreview(data, false),
          preview_long: formatDataForPreview(data, true),
          name: getDisplayNameForReactElement(data) || 'Unknown',
          type,
        };
      }

      const unserializableValue: Unserializable = {
        unserializable: true,
        type,
        readonly: true,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: getDisplayNameForReactElement(data) || 'Unknown',
      };
      // TODO: We can't expose type because that name is already taken on Unserializable.
      unserializableValue.key = dehydrate(
        data.key,
        cleaned,
        unserializable,
        path.concat(['key']),
        isPathAllowed,
        isPathAllowedCheck ? 1 : level + 1,
      );
      if (data.$$typeof === REACT_LEGACY_ELEMENT_TYPE) {
        unserializableValue.ref = dehydrate(
          data.ref,
          cleaned,
          unserializable,
          path.concat(['ref']),
          isPathAllowed,
          isPathAllowedCheck ? 1 : level + 1,
        );
      }
      unserializableValue.props = dehydrate(
        data.props,
        cleaned,
        unserializable,
        path.concat(['props']),
        isPathAllowed,
        isPathAllowedCheck ? 1 : level + 1,
      );

      unserializable.push(path);
      return unserializableValue;
    }
    case 'react_lazy': {
      isPathAllowedCheck = isPathAllowed(path);

      const payload = data._payload;

      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        cleaned.push(path);
        const inspectable =
          payload !== null &&
          typeof payload === 'object' &&
          (payload._status === 1 ||
            payload._status === 2 ||
            payload.status === 'fulfilled' ||
            payload.status === 'rejected');
        return {
          inspectable,
          preview_short: formatDataForPreview(data, false),
          preview_long: formatDataForPreview(data, true),
          name: 'lazy()',
          type,
        };
      }

      const unserializableValue: Unserializable = {
        unserializable: true,
        type: type,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: 'lazy()',
      };
      // Ideally we should alias these properties to something more readable but
      // unfortunately because of how the hydration algorithm uses a single concept of
      // "path" we can't alias the path.
      unserializableValue._payload = dehydrate(
        payload,
        cleaned,
        unserializable,
        path.concat(['_payload']),
        isPathAllowed,
        isPathAllowedCheck ? 1 : level + 1,
      );
      unserializable.push(path);
      return unserializableValue;
    }
    // ArrayBuffers error if you try to inspect them.
    case 'array_buffer':
    case 'data_view':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: type === 'data_view' ? 'DataView' : 'ArrayBuffer',
        size: data.byteLength,
        type,
      };

    case 'array':
      isPathAllowedCheck = isPathAllowed(path);
      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        return createDehydrated(type, true, data, cleaned, path);
      }
      const arr: Array<Object> = [];
      for (let i = 0; i < data.length; i++) {
        arr[i] = dehydrateKey(
          data,
          i,
          cleaned,
          unserializable,
          path.concat([i]),
          isPathAllowed,
          isPathAllowedCheck ? 1 : level + 1,
        );
      }
      return arr;

    case 'html_all_collection':
    case 'typed_array':
    case 'iterator':
      isPathAllowedCheck = isPathAllowed(path);
      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        return createDehydrated(type, true, data, cleaned, path);
      } else {
        const unserializableValue: Unserializable = {
          unserializable: true,
          type: type,
          readonly: true,
          size: type === 'typed_array' ? data.length : undefined,
          preview_short: formatDataForPreview(data, false),
          preview_long: formatDataForPreview(data, true),
          name:
            typeof data.constructor !== 'function' ||
            typeof data.constructor.name !== 'string' ||
            data.constructor.name === 'Object'
              ? ''
              : data.constructor.name,
        };

        // TRICKY
        // Don't use [...spread] syntax for this purpose.
        // This project uses @babel/plugin-transform-spread in "loose" mode which only works with Array values.
        // Other types (e.g. typed arrays, Sets) will not spread correctly.
        Array.from(data).forEach(
          (item, i) =>
            (unserializableValue[i] = dehydrate(
              item,
              cleaned,
              unserializable,
              path.concat([i]),
              isPathAllowed,
              isPathAllowedCheck ? 1 : level + 1,
            )),
        );

        unserializable.push(path);

        return unserializableValue;
      }

    case 'opaque_iterator':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: data[Symbol.toStringTag],
        type,
      };

    case 'date':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: data.toString(),
        type,
      };

    case 'regexp':
      cleaned.push(path);
      return {
        inspectable: false,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: data.toString(),
        type,
      };

    case 'thenable':
      isPathAllowedCheck = isPathAllowed(path);

      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        cleaned.push(path);
        return {
          inspectable:
            data.status === 'fulfilled' || data.status === 'rejected',
          preview_short: formatDataForPreview(data, false),
          preview_long: formatDataForPreview(data, true),
          name: data.toString(),
          type,
        };
      }

      if (
        data.status === 'resolved_model' ||
        data.status === 'resolve_module'
      ) {
        // This looks it's a lazy initialization pattern such in Flight.
        // Since we're about to inspect it. Let's eagerly initialize it.
        data.then(noop);
      }

      switch (data.status) {
        case 'fulfilled': {
          const unserializableValue: Unserializable = {
            unserializable: true,
            type: type,
            preview_short: formatDataForPreview(data, false),
            preview_long: formatDataForPreview(data, true),
            name: 'fulfilled Thenable',
          };

          unserializableValue.value = dehydrate(
            data.value,
            cleaned,
            unserializable,
            path.concat(['value']),
            isPathAllowed,
            isPathAllowedCheck ? 1 : level + 1,
          );

          unserializable.push(path);

          return unserializableValue;
        }
        case 'rejected': {
          const unserializableValue: Unserializable = {
            unserializable: true,
            type: type,
            preview_short: formatDataForPreview(data, false),
            preview_long: formatDataForPreview(data, true),
            name: 'rejected Thenable',
          };

          unserializableValue.reason = dehydrate(
            data.reason,
            cleaned,
            unserializable,
            path.concat(['reason']),
            isPathAllowed,
            isPathAllowedCheck ? 1 : level + 1,
          );

          unserializable.push(path);

          return unserializableValue;
        }
        default:
          cleaned.push(path);
          return {
            inspectable: false,
            preview_short: formatDataForPreview(data, false),
            preview_long: formatDataForPreview(data, true),
            name: data.toString(),
            type,
          };
      }

    case 'object':
      isPathAllowedCheck = isPathAllowed(path);

      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        return createDehydrated(type, true, data, cleaned, path);
      } else {
        const object: {
          [string]: DehydratedData['data'],
        } = {};
        getAllEnumerableKeys(data).forEach(key => {
          const name = key.toString();
          object[name] = dehydrateKey(
            data,
            key,
            cleaned,
            unserializable,
            path.concat([name]),
            isPathAllowed,
            isPathAllowedCheck ? 1 : level + 1,
          );
        });
        return object;
      }

    case 'class_instance': {
      isPathAllowedCheck = isPathAllowed(path);

      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        return createDehydrated(type, true, data, cleaned, path);
      }

      const value: Unserializable = {
        unserializable: true,
        type,
        readonly: true,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name:
          typeof data.constructor !== 'function' ||
          typeof data.constructor.name !== 'string'
            ? ''
            : data.constructor.name,
      };

      getAllEnumerableKeys(data).forEach(key => {
        const keyAsString = key.toString();

        value[keyAsString] = dehydrate(
          data[key],
          cleaned,
          unserializable,
          path.concat([keyAsString]),
          isPathAllowed,
          isPathAllowedCheck ? 1 : level + 1,
        );
      });

      unserializable.push(path);

      return value;
    }
    case 'error': {
      isPathAllowedCheck = isPathAllowed(path);

      if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
        return createDehydrated(type, true, data, cleaned, path);
      }

      const value: Unserializable = {
        unserializable: true,
        type,
        readonly: true,
        preview_short: formatDataForPreview(data, false),
        preview_long: formatDataForPreview(data, true),
        name: data.name,
      };

      // name, message, stack and cause are not enumerable yet still interesting.
      value.message = dehydrate(
        data.message,
        cleaned,
        unserializable,
        path.concat(['message']),
        isPathAllowed,
        isPathAllowedCheck ? 1 : level + 1,
      );
      value.stack = dehydrate(
        data.stack,
        cleaned,
        unserializable,
        path.concat(['stack']),
        isPathAllowed,
        isPathAllowedCheck ? 1 : level + 1,
      );

      if ('cause' in data) {
        value.cause = dehydrate(
          data.cause,
          cleaned,
          unserializable,
          path.concat(['cause']),
          isPathAllowed,
          isPathAllowedCheck ? 1 : level + 1,
        );
      }

      getAllEnumerableKeys(data).forEach(key => {
        const keyAsString = key.toString();

        value[keyAsString] = dehydrate(
          data[key],
          cleaned,
          unserializable,
          path.concat([keyAsString]),
          isPathAllowed,
          isPathAllowedCheck ? 1 : level + 1,
        );
      });

      unserializable.push(path);

      return value;
    }
    case 'infinity':
    case '-infinity':
    case 'nan':
    case 'undefined':
      // Some values are lossy when sent through a WebSocket.
      // We dehydrate+rehydrate them to preserve their type.
      cleaned.push(path);
      return {type};

    default:
      return data;
  }
}

function dehydrateKey(
  parent: Object,
  key: number | string | symbol,
  cleaned: Array<Array<string | number>>,
  unserializable: Array<Array<string | number>>,
  path: Array<string | number>,
  isPathAllowed: (path: Array<string | number>) => boolean,
  level: number = 0,
): DehydratedData['data'] {
  try {
    return dehydrate(
      parent[key],
      cleaned,
      unserializable,
      path,
      isPathAllowed,
      level,
    );
  } catch (error) {
    let preview = '';
    if (
      typeof error === 'object' &&
      error !== null &&
      typeof error.stack === 'string'
    ) {
      preview = error.stack;
    } else if (typeof error === 'string') {
      preview = error;
    }
    cleaned.push(path);
    return {
      inspectable: false,
      preview_short: '[Exception]',
      preview_long: preview ? '[Exception: ' + preview + ']' : '[Exception]',
      name: preview,
      type: 'unknown',
    };
  }
}

export function fillInPath(
  object: Object,
  data: DehydratedData,
  path: InspectedElementPath,
  value: any,
) {
  const target = getInObject(object, path);
  if (target != null) {
    if (!target[meta.unserializable]) {
      delete target[meta.inspectable];
      delete target[meta.inspected];
      delete target[meta.name];
      delete target[meta.preview_long];
      delete target[meta.preview_short];
      delete target[meta.readonly];
      delete target[meta.size];
      delete target[meta.type];
    }
  }

  if (value !== null && data.unserializable.length > 0) {
    const unserializablePath = data.unserializable[0];
    let isMatch = unserializablePath.length === path.length;
    for (let i = 0; i < path.length; i++) {
      if (path[i] !== unserializablePath[i]) {
        isMatch = false;
        break;
      }
    }
    if (isMatch) {
      upgradeUnserializable(value, value);
    }
  }

  setInObject(object, path, value);
}

export function hydrate(
  object: any,
  cleaned: Array<Array<string | number>>,
  unserializable: Array<Array<string | number>>,
): Object {
  cleaned.forEach((path: Array<string | number>) => {
    const length = path.length;
    const last = path[length - 1];
    const parent = getInObject(object, path.slice(0, length - 1));
    if (!parent || !parent.hasOwnProperty(last)) {
      return;
    }

    const value = parent[last];

    if (!value) {
      return;
    } else if (value.type === 'infinity') {
      parent[last] = Infinity;
    } else if (value.type === '-infinity') {
      parent[last] = -Infinity;
    } else if (value.type === 'nan') {
      parent[last] = NaN;
    } else if (value.type === 'undefined') {
      parent[last] = undefined;
    } else {
      // Replace the string keys with Symbols so they're non-enumerable.
      const replaced: {[key: symbol]: boolean | string} = {};
      replaced[meta.inspectable] = !!value.inspectable;
      replaced[meta.inspected] = false;
      replaced[meta.name] = value.name;
      replaced[meta.preview_long] = value.preview_long;
      replaced[meta.preview_short] = value.preview_short;
      replaced[meta.size] = value.size;
      replaced[meta.readonly] = !!value.readonly;
      replaced[meta.type] = value.type;

      parent[last] = replaced;
    }
  });
  unserializable.forEach((path: Array<string | number>) => {
    const length = path.length;
    const last = path[length - 1];
    const parent = getInObject(object, path.slice(0, length - 1));
    if (!parent || !parent.hasOwnProperty(last)) {
      return;
    }

    const node = parent[last];

    const replacement = {
      ...node,
    };

    upgradeUnserializable(replacement, node);

    parent[last] = replacement;
  });
  return object;
}

function upgradeUnserializable(destination: Object, source: Object) {
  Object.defineProperties(destination, {
    // $FlowFixMe[invalid-computed-prop]
    [meta.inspected]: {
      configurable: true,
      enumerable: false,
      value: !!source.inspected,
    },
    // $FlowFixMe[invalid-computed-prop]
    [meta.name]: {
      configurable: true,
      enumerable: false,
      value: source.name,
    },
    // $FlowFixMe[invalid-computed-prop]
    [meta.preview_long]: {
      configurable: true,
      enumerable: false,
      value: source.preview_long,
    },
    // $FlowFixMe[invalid-computed-prop]
    [meta.preview_short]: {
      configurable: true,
      enumerable: false,
      value: source.preview_short,
    },
    // $FlowFixMe[invalid-computed-prop]
    [meta.size]: {
      configurable: true,
      enumerable: false,
      value: source.size,
    },
    // $FlowFixMe[invalid-computed-prop]
    [meta.readonly]: {
      configurable: true,
      enumerable: false,
      value: !!source.readonly,
    },
    // $FlowFixMe[invalid-computed-prop]
    [meta.type]: {
      configurable: true,
      enumerable: false,
      value: source.type,
    },
    // $FlowFixMe[invalid-computed-prop]
    [meta.unserializable]: {
      configurable: true,
      enumerable: false,
      value: !!source.unserializable,
    },
  });

  delete destination.inspected;
  delete destination.name;
  delete destination.preview_long;
  delete destination.preview_short;
  delete destination.size;
  delete destination.readonly;
  delete destination.type;
  delete destination.unserializable;
}

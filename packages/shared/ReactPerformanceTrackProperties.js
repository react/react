/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {OMITTED_PROP_ERROR} from 'shared/ReactFlightPropertyAccess';

import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';
import {REACT_ELEMENT_TYPE} from './ReactSymbols';
import getComponentNameFromType from './getComponentNameFromType';

const EMPTY_ARRAY = 0;
const COMPLEX_ARRAY = 1;
const PRIMITIVE_ARRAY = 2; // Primitive values only that are accepted by JSON.stringify
const ENTRIES_ARRAY = 3; // Tuple arrays of string and value (like Headers, Map, etc)

// Showing wider objects in the devtools is not useful.
const OBJECT_WIDTH_LIMIT = 100;

function getArrayKind(array: Object): 0 | 1 | 2 | 3 {
  let kind: 0 | 1 | 2 | 3 = EMPTY_ARRAY;
  for (let i = 0; i < array.length && i < OBJECT_WIDTH_LIMIT; i++) {
    const value = array[i];
    if (typeof value === 'object' && value !== null) {
      if (
        isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string'
      ) {
        // Key value tuple
        if (kind !== EMPTY_ARRAY && kind !== ENTRIES_ARRAY) {
          return COMPLEX_ARRAY;
        }
        kind = ENTRIES_ARRAY;
      } else {
        return COMPLEX_ARRAY;
      }
    } else if (typeof value === 'function') {
      return COMPLEX_ARRAY;
    } else if (typeof value === 'string' && value.length > 50) {
      return COMPLEX_ARRAY;
    } else if (kind !== EMPTY_ARRAY && kind !== PRIMITIVE_ARRAY) {
      return COMPLEX_ARRAY;
    } else if (typeof value === 'bigint') {
      return COMPLEX_ARRAY;
    } else {
      kind = PRIMITIVE_ARRAY;
    }
  }
  return kind;
}

export function addObjectToProperties(
  object: Object,
  properties: Array<[string, string]>,
  indent: number,
  prefix: string,
): void {
  if (ArrayBuffer.isView(object)) {
    // Typed arrays (e.g. Uint8Array, Float32Array) can hold millions of
    // elements. Enumerating them with for...in forces the engine to
    // materialize a key for every index, which can freeze the page. Their
    // contents aren't useful to show here so we skip them. DataView has no
    // enumerable properties to show anyway.
    return;
  }
  let addedProperties = 0;
  try {
    for (const key in object) {
      if (hasOwnProperty.call(object, key) && key[0] !== '_') {
        addedProperties++;
        const value = object[key];
        addValueToProperties(key, value, properties, indent, prefix);
        if (addedProperties >= OBJECT_WIDTH_LIMIT) {
          properties.push([
            prefix +
              '\xa0\xa0'.repeat(indent) +
              'Only ' +
              OBJECT_WIDTH_LIMIT +
              ' properties are shown. React will not log more properties of this object.',
            '',
          ]);
          break;
        }
      }
    }
  } catch (e) {
    // Cross-origin objects (e.g. a Window from a cross-origin iframe) throw
    // SecurityError when their properties are enumerated. Treat the object as
    // opaque so the render-logger never corrupts the fiber tree.
    if (addedProperties === 0) {
      properties.push([
        prefix + '\xa0\xa0'.repeat(indent) + '[CrossOriginObject]',
        '',
      ]);
    }
  }
}

function readReactElementTypeof(value: Object): mixed {
  try {
    // Prevents dotting into $$typeof in opaque origin windows.
    return '$$typeof' in value && hasOwnProperty.call(value, '$$typeof')
      ? value.$$typeof
      : undefined;
  } catch (e) {
    // Cross-origin objects (e.g. a Window from a cross-origin iframe) throw
    // SecurityError on any property access. Treat as non-React-element.
    return undefined;
  }
}

export function addValueToProperties(
  propertyName: string,
  value: mixed,
  properties: Array<[string, string]>,
  indent: number,
  prefix: string,
): void {
  let desc;
  switch (typeof value) {
    case 'object':
      if (value === null) {
        desc = 'null';
        break;
      } else {
        if (readReactElementTypeof(value) === REACT_ELEMENT_TYPE) {
          // JSX
          const typeName = getComponentNameFromType(value.type) || '\u2026';
          const key = value.key;
          const props: any = value.props;
          const propsKeys = Object.keys(props);
          const propsLength = propsKeys.length;
          if (key == null && propsLength === 0) {
            desc = '<' + typeName + ' />';
            break;
          }
          if (
            indent < 3 ||
            (propsLength === 1 && propsKeys[0] === 'children' && key == null)
          ) {
            desc = '<' + typeName + ' \u2026 />';
            break;
          }
          properties.push([
            prefix + '\xa0\xa0'.repeat(indent) + propertyName,
            '<' + typeName,
          ]);
          if (key !== null) {
            addValueToProperties('key', key, properties, indent + 1, prefix);
          }
          let hasChildren = false;
          let addedProperties = 0;
          for (const propKey in props) {
            addedProperties++;
            if (propKey === 'children') {
              if (
                props.children != null &&
                (!isArray(props.children) || props.children.length > 0)
              ) {
                hasChildren = true;
              }
            } else if (
              hasOwnProperty.call(props, propKey) &&
              propKey[0] !== '_'
            ) {
              addValueToProperties(
                propKey,
                props[propKey],
                properties,
                indent + 1,
                prefix,
              );
            }

            if (addedProperties >= OBJECT_WIDTH_LIMIT) {
              break;
            }
          }
          properties.push([
            '',
            hasChildren ? '>\u2026</' + typeName + '>' : '/>',
          ]);
          return;
        }
        // $FlowFixMe[method-unbinding]
        const objectToString = Object.prototype.toString.call(value);
        let objectName = objectToString.slice(8, objectToString.length - 1);
        if (ArrayBuffer.isView(value)) {
          // Typed arrays can hold millions of elements. Showing the type and
          // length is more useful than enumerating every index (which is also
          // prohibitively slow, see addObjectToProperties). DataView is the
          // only view without a length; show just its type.
          const length = (value as any).length;
          desc =
            typeof length === 'number'
              ? objectName + '(' + length + ')'
              : objectName;
          break;
        }
        if (objectName === 'Array') {
          const array: Array<any> = value as any;
          const didTruncate = array.length > OBJECT_WIDTH_LIMIT;
          const kind = getArrayKind(array);
          if (kind === PRIMITIVE_ARRAY || kind === EMPTY_ARRAY) {
            desc = JSON.stringify(
              didTruncate
                ? array.slice(0, OBJECT_WIDTH_LIMIT).concat('…')
                : array,
            );
            break;
          } else if (kind === ENTRIES_ARRAY) {
            properties.push([
              prefix + '\xa0\xa0'.repeat(indent) + propertyName,
              '',
            ]);
            for (let i = 0; i < array.length && i < OBJECT_WIDTH_LIMIT; i++) {
              const entry = array[i];
              addValueToProperties(
                entry[0],
                entry[1],
                properties,
                indent + 1,
                prefix,
              );
            }
            if (didTruncate) {
              addValueToProperties(
                OBJECT_WIDTH_LIMIT.toString(),
                '…',
                properties,
                indent + 1,
                prefix,
              );
            }
            return;
          }
        }
        if (objectName === 'Promise') {
          if (value.status === 'fulfilled') {
            // Print the inner value
            const idx = properties.length;
            addValueToProperties(
              propertyName,
              value.value,
              properties,
              indent,
              prefix,
            );
            if (properties.length > idx) {
              // Wrap the value or type in Promise descriptor.
              const insertedEntry = properties[idx];
              insertedEntry[1] =
                'Promise<' + (insertedEntry[1] || 'Object') + '>';
              return;
            }
          } else if (value.status === 'rejected') {
            // Print the inner error
            const idx = properties.length;
            addValueToProperties(
              propertyName,
              value.reason,
              properties,
              indent,
              prefix,
            );
            if (properties.length > idx) {
              // Wrap the value or type in Promise descriptor.
              const insertedEntry = properties[idx];
              insertedEntry[1] = 'Rejected Promise<' + insertedEntry[1] + '>';
              return;
            }
          }
          properties.push([
            '\xa0\xa0'.repeat(indent) + propertyName,
            'Promise',
          ]);
          return;
        }
        if (objectName === 'Object') {
          const proto: any = Object.getPrototypeOf(value);
          if (proto && typeof proto.constructor === 'function') {
            objectName = proto.constructor.name;
          }
        }
        properties.push([
          prefix + '\xa0\xa0'.repeat(indent) + propertyName,
          objectName === 'Object' ? (indent < 3 ? '' : '\u2026') : objectName,
        ]);
        if (indent < 3) {
          addObjectToProperties(value, properties, indent + 1, prefix);
        }
        return;
      }
    case 'function':
      const functionName = value.name;
      if (
        functionName === '' ||
        // e.g. proxied functions or classes with a static property "name" that's not a string
        typeof functionName !== 'string'
      ) {
        desc = '() => {}';
      } else {
        desc = functionName + '() {}';
      }
      break;
    case 'string':
      if (value === OMITTED_PROP_ERROR) {
        desc = '\u2026'; // ellipsis
      } else {
        desc = JSON.stringify(
          value.length >= 1024
            ? value.slice(0, 1023) + '\u2026' // ellipsis
            : value,
        );
      }
      break;
    case 'undefined':
      desc = 'undefined';
      break;
    case 'boolean':
      desc = value ? 'true' : 'false';
      break;
    default:
      // eslint-disable-next-line react-internal/safe-string-coercion
      desc = String(value);
  }
  properties.push([prefix + '\xa0\xa0'.repeat(indent) + propertyName, desc]);
}

const REMOVED = '-\xa0';
const ADDED = '+\xa0';
const UNCHANGED = '\u2007\xa0';

export function addObjectDiffToProperties(
  prev: Object,
  next: Object,
  properties: Array<[string, string]>,
  indent: number,
): boolean {
  // Note: We diff even non-owned properties here but things that are shared end up just the same.
  // If a property is added or removed, we just emit the property name and omit the value it had.
  // Mainly for performance. We need to minimize to only relevant information.
  let isDeeplyEqual = true;
  let prevPropertiesChecked = 0;
  for (const key in prev) {
    if (prevPropertiesChecked > OBJECT_WIDTH_LIMIT) {
      properties.push([
        'Previous object has more than ' +
          OBJECT_WIDTH_LIMIT +
          ' properties. React will not attempt to diff objects with too many properties.',
        '',
      ]);
      isDeeplyEqual = false;
      break;
    }

    if (!(key in next)) {
      properties.push([REMOVED + '\xa0\xa0'.repeat(indent) + key, '\u2026']);
      isDeeplyEqual = false;
    }
    prevPropertiesChecked++;
  }

  let nextPropertiesChecked = 0;
  for (const key in next) {
    if (nextPropertiesChecked > OBJECT_WIDTH_LIMIT) {
      properties.push([
        'Next object has more than ' +
          OBJECT_WIDTH_LIMIT +
          ' properties. React will not attempt to diff objects with too many properties.',
        '',
      ]);
      isDeeplyEqual = false;
      break;
    }

    if (key in prev) {
      const prevValue = prev[key];
      const nextValue = next[key];
      if (prevValue !== nextValue) {
        if (indent === 0 && key === 'children') {
          // Omit any change inside the top level children prop since it's expected to change
          // with any change to children of the component and their props will be logged
          // elsewhere but still mark it as a cause of render.
          const line = '\xa0\xa0'.repeat(indent) + key;
          properties.push([REMOVED + line, '\u2026'], [ADDED + line, '\u2026']);
          isDeeplyEqual = false;
          continue;
        }
        if (indent >= 3) {
          // Just fallthrough to print the two values if we're deep.
          // This will skip nested properties of the objects.
        } else if (
          typeof prevValue === 'object' &&
          typeof nextValue === 'object' &&
          prevValue !== null &&
          nextValue !== null &&
          readReactElementTypeof(prevValue) ===
            readReactElementTypeof(nextValue)
        ) {
          if (readReactElementTypeof(nextValue) === REACT_ELEMENT_TYPE) {
            if (
              prevValue.type === nextValue.type &&
              prevValue.key === nextValue.key
            ) {
              // If the only thing that has changed is the props of a nested element, then
              // we omit the props because it is likely to be represented as a diff elsewhere.
              const typeName =
                getComponentNameFromType(nextValue.type) || '\u2026';
              const line = '\xa0\xa0'.repeat(indent) + key;
              const desc = '<' + typeName + ' \u2026 />';
              properties.push([REMOVED + line, desc], [ADDED + line, desc]);
              isDeeplyEqual = false;
              continue;
            }
          } else {
            // $FlowFixMe[method-unbinding]
            const prevKind = Object.prototype.toString.call(prevValue);
            // $FlowFixMe[method-unbinding]
            const nextKind = Object.prototype.toString.call(nextValue);
            if (
              prevKind === nextKind &&
              (nextKind === '[object Object]' || nextKind === '[object Array]')
            ) {
              // Diff nested object
              const entry = [
                UNCHANGED + '\xa0\xa0'.repeat(indent) + key,
                nextKind === '[object Array]' ? 'Array' : '',
              ];
              properties.push(entry);
              const prevLength = properties.length;
              const nestedEqual = addObjectDiffToProperties(
                prevValue,
                nextValue,
                properties,
                indent + 1,
              );
              if (!nestedEqual) {
                isDeeplyEqual = false;
              } else if (prevLength === properties.length) {
                // Nothing notably changed inside the nested object. So this is only a change in reference
                // equality. Let's note it.
                entry[1] =
                  'Referentially unequal but deeply equal objects. Consider memoization.';
              }
              continue;
            }
          }
        } else if (
          typeof prevValue === 'function' &&
          typeof nextValue === 'function' &&
          prevValue.name === nextValue.name &&
          prevValue.length === nextValue.length
        ) {
          // $FlowFixMe[method-unbinding]
          const prevSrc = Function.prototype.toString.call(prevValue);
          // $FlowFixMe[method-unbinding]
          const nextSrc = Function.prototype.toString.call(nextValue);
          if (prevSrc === nextSrc) {
            // This looks like it might be the same function but different closures.
            let desc;
            if (nextValue.name === '') {
              desc = '() => {}';
            } else {
              desc = nextValue.name + '() {}';
            }
            properties.push([
              UNCHANGED + '\xa0\xa0'.repeat(indent) + key,
              desc +
                ' Referentially unequal function closure. Consider memoization.',
            ]);
            continue;
          }
        }

        // Otherwise, emit the change in property and the values.
        addValueToProperties(key, prevValue, properties, indent, REMOVED);
        addValueToProperties(key, nextValue, properties, indent, ADDED);
        isDeeplyEqual = false;
      }
    } else {
      properties.push([ADDED + '\xa0\xa0'.repeat(indent) + key, '\u2026']);
      isDeeplyEqual = false;
    }

    nextPropertiesChecked++;
  }
  return isDeeplyEqual;
}

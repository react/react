/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  REACT_ELEMENT_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_LAZY_TYPE,
  REACT_MEMO_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
} from 'shared/ReactSymbols';

import type {LazyComponent} from 'react/src/ReactLazy';

import isArray from 'shared/isArray';
import getPrototypeOf from 'shared/getPrototypeOf';

import {enableViewTransition} from 'shared/ReactFeatureFlags';

// Used for DEV messages to keep track of which parent rendered some props,
// in case they error.
export const jsxPropsParents: WeakMap<any, any> = new WeakMap();
export const jsxChildrenParents: WeakMap<any, any> = new WeakMap();

function isObjectPrototype(object: any): boolean {
  if (!object) {
    return false;
  }
  const ObjectPrototype = Object.prototype;
  if (object === ObjectPrototype) {
    return true;
  }
  // It might be an object from a different Realm which is
  // still just a plain simple object.
  if (getPrototypeOf(object)) {
    return false;
  }
  const names = Object.getOwnPropertyNames(object);
  for (let i = 0; i < names.length; i++) {
    if (!(names[i] in ObjectPrototype)) {
      return false;
    }
  }
  return true;
}

export function isGetter(object: any, name: string): boolean {
  const ObjectPrototype = Object.prototype;
  if (object === ObjectPrototype || object === null) {
    return false;
  }
  const descriptor = Object.getOwnPropertyDescriptor(object, name);
  if (descriptor === undefined) {
    return isGetter(getPrototypeOf(object), name);
  }
  return typeof descriptor.get === 'function';
}

export function isSimpleObject(object: any): boolean {
  if (!isObjectPrototype(getPrototypeOf(object))) {
    return false;
  }
  const names = Object.getOwnPropertyNames(object);
  for (let i = 0; i < names.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(object, names[i]);
    if (!descriptor) {
      return false;
    }
    if (!descriptor.enumerable) {
      if (
        (names[i] === 'key' || names[i] === 'ref') &&
        typeof descriptor.get === 'function'
      ) {
        // React adds key and ref getters to props objects to issue warnings.
        // Those getters will not be transferred to the client, but that's ok,
        // so we'll special case them.
        continue;
      }
      return false;
    }
  }
  return true;
}

export function objectName(object: mixed): string {
  // $FlowFixMe[method-unbinding]
  const name = Object.prototype.toString.call(object);
  // Extract 'Object' from '[object Object]':
  return name.slice(8, name.length - 1);
}

function describeKeyForErrorMessage(key: string): string {
  const encodedKey = JSON.stringify(key);
  return '"' + key + '"' === encodedKey ? key : encodedKey;
}

export function describeValueForErrorMessage(value: mixed): string {
  switch (typeof value) {
    case 'string': {
      return JSON.stringify(
        value.length <= 10 ? value : value.slice(0, 10) + '...',
      );
    }
    case 'object': {
      if (isArray(value)) {
        return '[...]';
      }
      if (value !== null && value.$$typeof === CLIENT_REFERENCE_TAG) {
        return describeClientReference(value);
      }
      const name = objectName(value);
      if (name === 'Object') {
        return '{...}';
      }
      return name;
    }
    case 'function': {
      if ((value as any).$$typeof === CLIENT_REFERENCE_TAG) {
        return describeClientReference(value);
      }
      const name = (value as any).displayName || value.name;
      return name ? 'function ' + name : 'function';
    }
    default:
      // eslint-disable-next-line react-internal/safe-string-coercion
      return String(value);
  }
}

function describeElementType(type: any): string {
  if (typeof type === 'string') {
    return type;
  }
  switch (type) {
    case REACT_SUSPENSE_TYPE:
      return 'Suspense';
    case REACT_SUSPENSE_LIST_TYPE:
      return 'SuspenseList';
    case REACT_VIEW_TRANSITION_TYPE:
      if (enableViewTransition) {
        return 'ViewTransition';
      }
  }
  if (typeof type === 'object') {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeElementType(type.render);
      case REACT_MEMO_TYPE:
        return describeElementType(type.type);
      case REACT_LAZY_TYPE: {
        const lazyComponent: LazyComponent<any, any> = type as any;
        const payload = lazyComponent._payload;
        const init = lazyComponent._init;
        try {
          // Lazy may contain any component type so we recursively resolve it.
          return describeElementType(init(payload));
        } catch (x) {}
      }
    }
  }
  return '';
}

const CLIENT_REFERENCE_TAG = Symbol.for('react.client.reference');

function describeClientReference(ref: any) {
  return 'client';
}

export function describeObjectForErrorMessage(
  objectOrArray: {+[key: string | number]: mixed, ...} | $ReadOnlyArray<mixed>,
  expandedName?: string,
): string {
  const objKind = objectName(objectOrArray);
  if (objKind !== 'Object' && objKind !== 'Array') {
    return objKind;
  }
  let str = '';
  let start = -1;
  let length = 0;
  if (isArray(objectOrArray)) {
    if (__DEV__ && jsxChildrenParents.has(objectOrArray)) {
      // Print JSX Children
      const type = jsxChildrenParents.get(objectOrArray);
      str = '<' + describeElementType(type) + '>';
      const array: $ReadOnlyArray<mixed> = objectOrArray;
      for (let i = 0; i < array.length; i++) {
        const value = array[i];
        let substr;
        if (typeof value === 'string') {
          substr = value;
        } else if (typeof value === 'object' && value !== null) {
          substr = '{' + describeObjectForErrorMessage(value) + '}';
        } else {
          substr = '{' + describeValueForErrorMessage(value) + '}';
        }
        if ('' + i === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 15 && str.length + substr.length < 40) {
          str += substr;
        } else {
          str += '{...}';
        }
      }
      str += '</' + describeElementType(type) + '>';
    } else {
      // Print Array
      str = '[';
      const array: $ReadOnlyArray<mixed> = objectOrArray;
      for (let i = 0; i < array.length; i++) {
        if (i > 0) {
          str += ', ';
        }
        const value = array[i];
        let substr;
        if (typeof value === 'object' && value !== null) {
          substr = describeObjectForErrorMessage(value);
        } else {
          substr = describeValueForErrorMessage(value);
        }
        if ('' + i === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 10 && str.length + substr.length < 40) {
          str += substr;
        } else {
          str += '...';
        }
      }
      str += ']';
    }
  } else {
    if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE) {
      str = '<' + describeElementType(objectOrArray.type) + '/>';
    } else if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG) {
      return describeClientReference(objectOrArray);
    } else if (__DEV__ && jsxPropsParents.has(objectOrArray)) {
      // Print JSX
      const type = jsxPropsParents.get(objectOrArray);
      str = '<' + (describeElementType(type) || '...');
      const object: {+[key: string | number]: mixed, ...} = objectOrArray;
      const names = Object.keys(object);
      for (let i = 0; i < names.length; i++) {
        str += ' ';
        const name = names[i];
        str += describeKeyForErrorMessage(name) + '=';
        const value = object[name];
        let substr;
        if (
          name === expandedName &&
          typeof value === 'object' &&
          value !== null
        ) {
          substr = describeObjectForErrorMessage(value);
        } else {
          substr = describeValueForErrorMessage(value);
        }
        if (typeof value !== 'string') {
          substr = '{' + substr + '}';
        }
        if (name === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 10 && str.length + substr.length < 40) {
          str += substr;
        } else {
          str += '...';
        }
      }
      str += '>';
    } else {
      // Print Object
      str = '{';
      const object: {+[key: string | number]: mixed, ...} = objectOrArray;
      const names = Object.keys(object);
      for (let i = 0; i < names.length; i++) {
        if (i > 0) {
          str += ', ';
        }
        const name = names[i];
        str += describeKeyForErrorMessage(name) + ': ';
        const value = object[name];
        let substr;
        if (typeof value === 'object' && value !== null) {
          substr = describeObjectForErrorMessage(value);
        } else {
          substr = describeValueForErrorMessage(value);
        }
        if (name === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 10 && str.length + substr.length < 40) {
          str += substr;
        } else {
          str += '...';
        }
      }
      str += '}';
    }
  }
  if (expandedName === undefined) {
    return str;
  }
  if (start > -1 && length > 0) {
    const highlight = ' '.repeat(start) + '^'.repeat(length);
    return '\n  ' + str + '\n  ' + highlight;
  }
  return '\n  ' + str;
}

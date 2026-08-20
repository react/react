/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {InternalInstance} from './renderer';

export function decorate(object: Object, attr: string, fn: Function): Function {
  const old = object[attr];
  // $FlowFixMe[missing-this-annot] webpack config needs to be updated to allow `this` type annotations
  object[attr] = function (instance: InternalInstance) {
    return fn.call(this, old, arguments);
  };
  return old;
}

export function decorateMany(
  source: Object,
  fns: {[attr: string]: Function, ...},
): Object {
  const olds: {[string]: $FlowFixMe} = {};
  for (const name in fns) {
    olds[name] = decorate(source, name, fns[name]);
  }
  return olds;
}

export function restoreMany(source: Object, olds: Object): void {
  for (const name in olds) {
    source[name] = olds[name];
  }
}

// $FlowFixMe[missing-this-annot] webpack config needs to be updated to allow `this` type annotations
export function forceUpdate(instance: InternalInstance): void {
  if (typeof instance.forceUpdate === 'function') {
    instance.forceUpdate();
  } else if (
    instance.updater != null &&
    typeof instance.updater.enqueueForceUpdate === 'function'
  ) {
    instance.updater.enqueueForceUpdate(this, () => {}, 'forceUpdate');
  }
}

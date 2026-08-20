/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {IntlVariations, IntlViewerContext, init} from 'fbt';
import React, {FunctionComponent} from 'react';

/**
 * This file is meant for use by `runner-evaluator` and fixture tests.
 *
 * Any fixture test can import constants or functions exported here.
 * However, the import path must be the relative path from `runner-evaluator`
 * (which calls `eval` on each fixture) to this file.
 *
 * ```js
 * // test.js
 * import {CONST_STRING0} from './shared-runtime';
 *
 * // ...
 * ```
 */

export type StringKeyedObject = {[key: string]: unknown};

export const CONST_STRING0 = 'global string 0';
export const CONST_STRING1 = 'global string 1';
export const CONST_STRING2 = 'global string 2';

export const CONST_NUMBER0 = 0;
export const CONST_NUMBER1 = 1;
export const CONST_NUMBER2 = 2;

export const CONST_TRUE = true;
export const CONST_FALSE = false;

export function initFbt(): void {
  const viewerContext: IntlViewerContext = {
    GENDER: IntlVariations.GENDER_UNKNOWN,
    locale: 'en_US',
  };

  init({
    translations: {},
    hooks: {
      getViewerContext: () => viewerContext,
    },
  });
}

export function mutate(arg: any): void {
  // don't mutate primitive
  if (arg == null || typeof arg !== 'object') {
    return;
  } else if (Array.isArray(arg)) {
    arg.push('joe');
  }

  let count: number = 0;
  let key;
  while (true) {
    key = 'wat' + count;
    if (!Object.hasOwn(arg, key)) {
      arg[key] = 'joe';
      return;
    }
    count++;
  }
}

export function mutateAndReturn<T>(arg: T): T {
  mutate(arg);
  return arg;
}

export function mutateAndReturnNewValue<T>(arg: T): string {
  mutate(arg);
  return 'hello!';
}

export function setProperty(arg: any, property: any): void {
  // don't mutate primitive
  if (arg == null || typeof arg !== 'object') {
    return arg;
  }

  let count: number = 0;
  let key;
  while (true) {
    key = 'wat' + count;
    if (!Object.hasOwn(arg, key)) {
      arg[key] = property;
      return arg;
    }
    count++;
  }
}

export function setPropertyByKey<
  T,
  TKey extends keyof T,
  TProperty extends T[TKey],
>(arg: T, key: TKey, property: TProperty): T {
  arg[key] = property;
  return arg;
}

export function arrayPush<T>(arr: Array<T>, ...values: Array<T>): Array<T> {
  arr.push(...values);
  return arr;
}

export function graphql(value: string): string {
  return value;
}

export function identity<T>(x: T): T {
  return x;
}

export function getNumber(): number {
  return 4;
}

export function getNull(): null {
  return null;
}

export function getTrue(): true {
  return true;
}

export function getFalse(): false {
  return false;
}

export function calculateExpensiveNumber(x: number): number {
  return x;
}

/**
 * Functions that do not mutate their parameters
 */
export function shallowCopy<T extends object>(obj: T): T {
  return Object.assign({}, obj);
}

export function makeObject_Primitives(): StringKeyedObject {
  return {a: 0, b: 'value1', c: true};
}

export function makeArray<T>(...values: Array<T>): Array<T> {
  return [...values];
}

export function addOne(value: number): number {
  return value + 1;
}

/*
 * Alias console.log, as it is defined as a global and may have
 * different compiler handling than unknown functions
 */
export function print(...args: Array<unknown>): void {
  console.log(...args);
}

export function sum(...args: Array<number>): number {
  return args.reduce((result, arg) => result + arg, 0);
}

export function throwErrorWithMessage(message: string): never {
  throw new Error(message);
}

export function throwInput(x: object): never {
  throw x;
}

export function throwErrorWithMessageIf(cond: boolean, message: string): void {
  if (cond) {
    throw new Error(message);
  }
}

export function logValue<T>(value: T): void {
  console.log(value);
}

export function useHook(): object {
  return makeObject_Primitives();
}

const noAliasObject = Object.freeze({});
export function useNoAlias(..._args: Array<any>): object {
  return noAliasObject;
}

export function useIdentity<T>(arg: T): T {
  return arg;
}

export function invoke<T extends Array<any>, ReturnType>(
  fn: (...input: T) => ReturnType,
  ...params: T
): ReturnType {
  return fn(...params);
}

export function conditionalInvoke<T extends Array<any>, ReturnType>(
  shouldInvoke: boolean,
  fn: (...input: T) => ReturnType,
  ...params: T
): ReturnType | null {
  if (shouldInvoke) {
    return fn(...params);
  } else {
    return null;
  }
}

/**
 * React Components
 */
export function Text(props: {
  value: string;
  children?: Array<React.ReactNode>;
}): React.ReactElement {
  return React.createElement('div', null, props.value, props.children);
}

export function StaticText1(props: {
  children?: Array<React.ReactNode>;
}): React.ReactElement {
  return React.createElement('div', null, 'StaticText1', props.children);
}

export function StaticText2(props: {
  children?: Array<React.ReactNode>;
}): React.ReactElement {
  return React.createElement('div', null, 'StaticText2', props.children);
}

export function RenderPropAsChild(props: {
  items: Array<() => React.ReactNode>;
}): React.ReactElement {
  return React.createElement(
    'div',
    null,
    'HigherOrderComponent',
    props.items.map(item => item()),
  );
}

export function Stringify(props: any): React.ReactElement {
  return React.createElement(
    'div',
    null,
    toJSON(props, props?.shouldInvokeFns),
  );
}
export function Throw() {
  throw new Error();
}

export function ValidateMemoization({
  inputs,
  output: rawOutput,
  onlyCheckCompiled = false,
}: {
  inputs: Array<any>;
  output: any;
  onlyCheckCompiled?: boolean;
}): React.ReactElement {
  'use no forget';
  // Wrap rawOutput as it might be a function, which useState would invoke.
  const output = {value: rawOutput};
  const [previousInputs, setPreviousInputs] = React.useState(inputs);
  const [previousOutput, setPreviousOutput] = React.useState(output);
  if (
    !onlyCheckCompiled ||
    (onlyCheckCompiled &&
      (globalThis as any).__SNAP_EVALUATOR_MODE === 'forget')
  ) {
    if (
      inputs.length !== previousInputs.length ||
      inputs.some((item, i) => item !== previousInputs[i])
    ) {
      // Some input changed, we expect the output to change
      setPreviousInputs(inputs);
      setPreviousOutput(output);
    } else if (output.value !== previousOutput.value) {
      // Else output should be stable
      throw new Error('Output identity changed but inputs did not');
    }
  }
  return React.createElement(Stringify, {inputs, output: rawOutput});
}

export function createHookWrapper<TProps, TRet>(
  useMaybeHook: (props: TProps) => TRet,
): FunctionComponent<TProps> {
  return function Component(props: TProps): React.ReactElement {
    const result = useMaybeHook(props);
    return Stringify({
      result: result,
      shouldInvokeFns: true,
    });
  };
}

// helper functions
export function toJSON(value: any, invokeFns: boolean = false): string {
  const seen = new Map();

  return JSON.stringify(value, (_key: string, val: any) => {
    if (typeof val === 'function') {
      if (val.length === 0 && invokeFns) {
        return {
          kind: 'Function',
          result: val(),
        };
      } else {
        return `[[ function params=${val.length} ]]`;
      }
    } else if (typeof val === 'object') {
      let id = seen.get(val);
      if (id != null) {
        return `[[ cyclic ref *${id} ]]`;
      } else if (val instanceof Map) {
        return {
          kind: 'Map',
          value: Array.from(val.entries()),
        };
      } else if (val instanceof Set) {
        return {
          kind: 'Set',
          value: Array.from(val.values()),
        };
      }
      seen.set(val, seen.size);
    }
    return val;
  });
}
export class Builder {
  vals: Array<any> = [];
  static makeBuilder(isNull: boolean, ...args: Array<any>): Builder | null {
    if (isNull) {
      return null;
    } else {
      const builder = new Builder();
      builder.push(...args);
      return builder;
    }
  }
  push(...args: Array<any>): Builder {
    this.vals.push(...args);
    return this;
  }
}

export const ObjectWithHooks = {
  useFoo(): number {
    return 0;
  },
  useMakeArray(): Array<number> {
    return [1, 2, 3];
  },
  useIdentity<T>(arg: T): T {
    return arg;
  },
};

export function useFragment(..._args: Array<any>): object {
  return {
    a: [1, 2, 3],
    b: {c: {d: 4}},
  };
}

export function useSpecialEffect(
  fn: () => any,
  _secondArg: any,
  deps: Array<any>,
) {
  React.useEffect(fn, deps);
}

export function typedArrayPush<T>(array: Array<T>, item: T): void {
  array.push(item);
}

export function typedLog(...values: Array<any>): void {
  console.log(...values);
}

export function typedIdentity<T>(value: T): T {
  return value;
}

export function typedAssign<T>(x: T): T {
  return x;
}

export function typedAlias<T>(x: T): T {
  return x;
}

export function typedCapture<T>(x: T): Array<T> {
  return [x];
}

export function typedCreateFrom<T>(array: Array<T>): T {
  return array[0];
}

export function typedMutate(x: any, v: any = null): void {
  x.property = v;
}

export const PanResponder = {
  create(obj: any): any {
    return obj;
  },
};

export default typedLog;

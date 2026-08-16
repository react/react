/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * TypeScript compile-time tests for React 19.2 API type definitions.
 *
 * These tests exercise the type declarations added in testDefinitions/React.d.ts
 * for: Activity, use(), useActionState, useOptimistic, ViewTransition,
 * addTransitionType, captureOwnerStack, and concurrent-mode hooks.
 *
 * If this file compiles without errors, the type definitions are correct.
 */

import * as React from 'react';

// ---------------------------------------------------------------------------
// use() — accepts Promise and Context
// ---------------------------------------------------------------------------

// use() with a Context
const ThemeContext = {
  Provider: null as any,
  Consumer: null as any,
};

function ComponentUsingContext() {
  // TypeScript should infer `theme` as `string`
  const theme: string = React.use<string>(ThemeContext as React.Context<string>);
  return theme;
}

// use() with a Promise
function ComponentUsingPromise(promise: Promise<number>) {
  const value: number = React.use(promise);
  return value;
}

// ---------------------------------------------------------------------------
// useActionState — typed state and payload
// ---------------------------------------------------------------------------

type FormState = {message: string; error: boolean};

function FormComponent() {
  // Overload 1: no payload
  const [stateA, dispatchA, isPendingA]: [
    FormState,
    () => void,
    boolean,
  ] = React.useActionState<FormState>(
    async (prev: FormState) => ({message: 'done', error: false}),
    {message: '', error: false},
  );

  // Overload 2: with payload
  const [stateB, dispatchB, isPendingB]: [
    FormState,
    (payload: string) => void,
    boolean,
  ] = React.useActionState<FormState, string>(
    async (prev: FormState, payload: string) => ({
      message: payload,
      error: false,
    }),
    {message: '', error: false},
  );

  return {stateA, dispatchA, isPendingA, stateB, dispatchB, isPendingB};
}

// ---------------------------------------------------------------------------
// useOptimistic — with and without reducer
// ---------------------------------------------------------------------------

function OptimisticComponent() {
  const initialMessages: string[] = [];

  // Overload 1: no reducer
  const [optimisticA, addOptimisticA] = React.useOptimistic<string[]>(
    initialMessages,
  );
  addOptimisticA(['new message']);

  // Overload 2: with reducer
  const [optimisticB, addOptimisticB] = React.useOptimistic<string[], string>(
    initialMessages,
    (state: string[], newMessage: string) => [...state, newMessage],
  );
  addOptimisticB('hello');

  return {optimisticA, optimisticB};
}

// ---------------------------------------------------------------------------
// Activity — with mode prop
// ---------------------------------------------------------------------------

function ActivityComponent() {
  const visibleProps: React.ActivityProps = {
    mode: 'visible',
    children: null,
  };

  const hiddenProps: React.ActivityProps = {
    mode: 'hidden',
  };

  // mode is only 'visible' | 'hidden' — the next line would be a type error:
  // const badProps: React.ActivityProps = { mode: 'invalid' }; // ❌

  return {visibleProps, hiddenProps};
}

// ---------------------------------------------------------------------------
// Concurrent mode hooks
// ---------------------------------------------------------------------------

function ConcurrentComponent() {
  const [isPending, startTransitionLocal] = React.useTransition();
  const _isPending: boolean = isPending;
  startTransitionLocal(() => {});

  React.startTransition(() => {});

  const deferred: number = React.useDeferredValue(42);

  const id: string = React.useId();

  return {deferred, id};
}

// ---------------------------------------------------------------------------
// addTransitionType / captureOwnerStack
// ---------------------------------------------------------------------------

function UtilityAPIs() {
  React.addTransitionType('fade');
  React.addTransitionType('slide');

  const stack: string | null = React.captureOwnerStack();
  return stack;
}

// ---------------------------------------------------------------------------
// Standard hooks — type-check the declarations added for completeness
// ---------------------------------------------------------------------------

function StandardHooksComponent() {
  const [count, setCount] = React.useState<number>(0);
  const _count: number = count;
  setCount(1);
  setCount(prev => prev + 1);

  const cb = React.useCallback((x: number) => x * 2, []);
  const _cb: (x: number) => number = cb;

  const val = React.useMemo(() => 'hello', []);
  const _val: string = val;

  const ref = React.useRef<number>(0);
  const _ref: {current: number} = ref;

  const [state, dispatch] = React.useReducer(
    (s: number, a: number) => s + a,
    0,
  );
  const _state: number = state;
  dispatch(5);

  return {count, cb, val, ref, state};
}

// ---------------------------------------------------------------------------
// Compile-time validation test
// If this file compiles and runs without errors, all type definitions are valid.
// ---------------------------------------------------------------------------

test('React 19.2 TypeScript type definitions are structurally correct', () => {
  // Activity props are typed correctly — compile-time shape check
  const activityProps: React.ActivityProps = {mode: 'hidden', children: null};
  expect(activityProps.mode).toBe('hidden');

  // addTransitionType is exported and is a function
  // (must be called inside startTransition at runtime; we only type-check here)
  expect(typeof React.addTransitionType).toBe('function');

  // captureOwnerStack is exported and returns string | null
  // (returns null outside a render, which is the expected value here)
  const stack = React.captureOwnerStack();
  expect(stack === null || typeof stack === 'string').toBe(true);
});

// This export satisfies the TypeScript module requirement.
export {};

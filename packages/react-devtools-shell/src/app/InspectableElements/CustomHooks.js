/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {
  createContext,
  forwardRef,
  Fragment,
  memo,
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useOptimistic,
  useState,
  use,
} from 'react';
import {useFormState, useFormStatus} from 'react-dom';

const object = {
  string: 'abc',
  number: 123,
  boolean: true,
  null: null,
  undefined: undefined,
  array: ['a', 'b', 'c'],
  object: {foo: 1, bar: 2, baz: 3},
};

function useNestedInnerHook() {
  return useState(123);
}
function useNestedOuterHook() {
  return useNestedInnerHook();
}

function useCustomObject() {
  useDebugValue(object);
  return useState(123);
}

function useDeepHookA() {
  useDebugValue('useDeepHookA');
  useDeepHookB();
}
function useDeepHookB() {
  useDebugValue('useDeepHookB');
  useDeepHookC();
}
function useDeepHookC() {
  useDebugValue('useDeepHookC');
  useDeepHookD();
}
function useDeepHookD() {
  useDebugValue('useDeepHookD');
  useDeepHookE();
}
function useDeepHookE() {
  useDebugValue('useDeepHookE');
  useDeepHookF();
}
function useDeepHookF() {
  useDebugValue('useDeepHookF');
}

const ContextA = createContext('A');
const ContextB = createContext('B');

function FunctionWithHooks(props: any, ref: React.RefSetter<any>) {
  const [count, updateCount] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const contextValueA = useContext(ContextA);
  useOptimistic<number, mixed>(1);
  use(ContextA);

  // eslint-disable-next-line no-unused-vars
  const [_, __] = useState(object);

  // Custom hook with a custom debug label
  const debouncedCount = useDebounce(count, 1000);

  useCustomObject();

  const onClick = useCallback(
    function onClick() {
      updateCount(count + 1);
    },
    [count],
  );

  // Tests nested custom hooks
  useNestedOuterHook();

  // eslint-disable-next-line no-unused-vars
  const contextValueB = useContext(ContextB);

  // Verify deep nesting doesn't break
  useDeepHookA();

  return <button onClick={onClick}>Count: {debouncedCount}</button>;
}
const MemoWithHooks = memo(FunctionWithHooks);
const ForwardRefWithHooks = forwardRef(FunctionWithHooks);

function wrapWithHoc(
  Component: (props: any, ref: React.RefSetter<any>) => any,
) {
  function Hoc() {
    return <Component />;
  }
  // $FlowFixMe[prop-missing]
  const displayName = Component.displayName || Component.name;
  // $FlowFixMe[incompatible-type] found when upgrading Flow
  Hoc.displayName = `withHoc(${displayName})`;
  return Hoc;
}
const HocWithHooks = wrapWithHoc(FunctionWithHooks);

const Suspendender = React.lazy<() => React.Node>(() => {
  return new Promise<{default: () => React.Node, ...}>(resolve => {
    setTimeout(() => {
      resolve({
        default: () => 'Finished!',
      });
    }, 3000);
  });
});
function Transition() {
  const [show, setShow] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  return (
    <div>
      <React.Suspense fallback="Loading">
        {isPending ? 'Pending' : null}
        {show ? <Suspendender /> : null}
      </React.Suspense>
      {!show && (
        <button onClick={() => startTransition(() => setShow(true))}>
          Transition
        </button>
      )}
    </div>
  );
}

function incrementWithDelay(previousState: number, formData: FormData) {
  const incrementDelay = +formData.get('incrementDelay');
  const shouldReject = formData.get('shouldReject');
  const reason = formData.get('reason');

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldReject) {
        reject(reason);
      } else {
        resolve(previousState + 1);
      }
    }, incrementDelay);
  });
}

function FormStatus() {
  const status = useFormStatus();

  return <pre>{JSON.stringify(status)}</pre>;
}

function Forms() {
  const [state, formAction] = useFormState<any, any>(incrementWithDelay, 0);
  return (
    <form>
      State: {state}&nbsp;
      <label>
        delay:
        <input
          name="incrementDelay"
          defaultValue={5000}
          type="text"
          inputMode="numeric"
        />
      </label>
      <label>
        Reject:
        <input name="reason" type="text" />
        <input name="shouldReject" type="checkbox" />
      </label>
      <button formAction={formAction}>Increment</button>
      <FormStatus />
    </form>
  );
}

class ErrorBoundary extends React.Component<{children?: React$Node}> {
  state: {error: any} = {error: null};
  static getDerivedStateFromError(error: mixed): {error: any} {
    return {error};
  }
  componentDidCatch(error: any, info: any) {
    console.error(error, info);
  }
  render(): any {
    if (this.state.error) {
      return <div>Error: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

export default function CustomHooks(): React.Node {
  return (
    <Fragment>
      <FunctionWithHooks />
      <MemoWithHooks />
      <ForwardRefWithHooks />
      <HocWithHooks />
      <Transition />
      <ErrorBoundary>
        <Forms />
      </ErrorBoundary>
    </Fragment>
  );
}

// Below copied from https://usehooks.com/
function useDebounce(value: number, delay: number) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Show the value in DevTools
  useDebugValue(debouncedValue);

  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay], // Only re-call effect if value or delay changes
  );

  return debouncedValue;
}
// Above copied from https://usehooks.com/

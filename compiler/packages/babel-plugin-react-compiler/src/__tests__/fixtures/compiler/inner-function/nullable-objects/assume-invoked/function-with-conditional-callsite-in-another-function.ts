import {createHookWrapper} from 'shared-runtime';

/**
 * The returned lambda is not assumed to be invoked (see return-function), so
 * neither lambda below has hoistable property loads.
 *
 * If lambda A conditionally calls lambda B, optimistically assume that property
 * loads from lambda B has the same hoistability of ones from lambda A. This
 * helps optimize components / hooks that create and chain many helper
 * functions.
 *
 * Type systems and code readability encourage developers to colocate length and
 * null checks values in the same function as where values are used. i.e.
 * developers are unlikely to write the following code.
 * ```js
 * function useFoo(obj, objNotNullAndHasElements) {
 *   // ...
 *   const get0th = () => obj.arr[0].value;
 *   return () => objNotNullAndHasElements ? get0th : undefined;
 * }
 * ```
 *
 * In Meta code, this assumption helps reduce the number of memo dependency
 * deopts.
 */
function useMakeCallback({
  obj,
  cond,
  setState,
}: {
  obj: {value: number};
  cond: boolean;
  setState: (newState: number) => void;
}) {
  const cb = () => setState(obj.value);
  return () => (cond ? cb() : undefined);
}

const setState = (arg: number) => {
  'use no memo';
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useMakeCallback),
  params: [{obj: {value: 1}, cond: true, setState}],
  sequentialRenders: [
    {obj: {value: 1}, cond: true, setState},
    {obj: {value: 2}, cond: true, setState},
  ],
};

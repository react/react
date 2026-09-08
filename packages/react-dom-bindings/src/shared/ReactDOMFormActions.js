/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Dispatcher} from 'react-reconciler/src/ReactInternalTypes';
import type {Awaited} from 'shared/ReactTypes';

import ReactSharedInternals from 'shared/ReactSharedInternals';
import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';

type FormStatusNotPending = {|
  pending: false,
  data: null,
  method: null,
  action: null,
|};

type FormStatusPending = {|
  pending: true,
  data: FormData,
  method: string,
  action: string | (FormData => void | Promise<void>) | null,
|};

export type FormStatus = FormStatusPending | FormStatusNotPending;

// Since the "not pending" value is always the same, we can reuse the
// same object across all transitions.
const sharedNotPendingObject: FormStatusNotPending = {
  pending: false,
  data: null,
  method: null,
  action: null,
};

export const NotPending: FormStatus = __DEV__
  ? Object.freeze(sharedNotPendingObject)
  : sharedNotPendingObject;

function resolveDispatcher() {
  // Copied from react/src/ReactHooks.js. It's the same thing but in a
  // different package.
  const dispatcher = ReactSharedInternals.H;
  if (__DEV__) {
    if (dispatcher === null) {
      console.error(
        'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
          ' one of the following reasons:\n' +
          '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
          '2. You might be breaking the Rules of Hooks\n' +
          '3. You might have more than one copy of React in the same app\n' +
          'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
      );
    }
  }
  // Will result in a null access error if accessed outside render phase. We
  // intentionally don't throw our own error because this is in a hot path.
  // Also helps ensure this is inlined.
  return dispatcher as any as Dispatcher;
}

export function useFormStatus(): FormStatus {
  const dispatcher = resolveDispatcher();
  return dispatcher.useHostTransitionStatus();
}

export function useFormState<S, P>(
  action: (Awaited<S>, P) => S,
  initialState: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  const dispatcher = resolveDispatcher();
  return dispatcher.useFormState(action, initialState, permalink);
}

export function requestFormReset(form: HTMLFormElement) {
  ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
    .r(/* requestFormReset */ form);
}

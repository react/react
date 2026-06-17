/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'

// The Symbol used to tag the ReactElement-like types.
export const REACT_LEGACY_ELEMENT_TYPE: symbol = Symbol.for('react.element');
export const REACT_ELEMENT_TYPE: symbol = Symbol.for(
  'react.transitional.element',
);
export const REACT_PORTAL_TYPE: symbol = Symbol.for('react.portal');
export const REACT_FRAGMENT_TYPE: symbol = Symbol.for('react.fragment');
export const REACT_STRICT_MODE_TYPE: symbol = Symbol.for('react.strict_mode');
export const REACT_PROFILER_TYPE: symbol = Symbol.for('react.profiler');
export const REACT_CONSUMER_TYPE: symbol = Symbol.for('react.consumer');
export const REACT_CONTEXT_TYPE: symbol = Symbol.for('react.context');
export const REACT_FORWARD_REF_TYPE: symbol = Symbol.for('react.forward_ref');
export const REACT_SUSPENSE_TYPE: symbol = Symbol.for('react.suspense');
export const REACT_SUSPENSE_LIST_TYPE: symbol = Symbol.for(
  'react.suspense_list',
);
export const REACT_MEMO_TYPE: symbol = Symbol.for('react.memo');
export const REACT_LAZY_TYPE: symbol = Symbol.for('react.lazy');
export const REACT_SCOPE_TYPE: symbol = Symbol.for('react.scope');
export const REACT_ACTIVITY_TYPE: symbol = Symbol.for('react.activity');
export const REACT_LEGACY_HIDDEN_TYPE: symbol = Symbol.for(
  'react.legacy_hidden',
);
export const REACT_TRACING_MARKER_TYPE: symbol = Symbol.for(
  'react.tracing_marker',
);

export const REACT_MEMO_CACHE_SENTINEL: symbol = Symbol.for(
  'react.memo_cache_sentinel',
);

export const REACT_VIEW_TRANSITION_TYPE: symbol = Symbol.for(
  'react.view_transition',
);

const MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';

export function getIteratorFn(maybeIterable: ?any): ?() => ?Iterator<any> {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}

export const ASYNC_ITERATOR = Symbol.asyncIterator;

export const REACT_OPTIMISTIC_KEY: ReactOptimisticKey = Symbol.for(
  'react.optimistic_key',
) as any;

// This is actually a symbol but Flow doesn't support comparison of symbols to refine.
// We use a boolean since in our code we often expect string (key) or number (index),
// so by pretending to be a boolean we cover a lot of cases that don't consider this case.
export type ReactOptimisticKey = true;

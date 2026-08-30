// @flow
import {useState} from 'react';

/**
 * Test that match expressions with tuple patterns don't produce overly
 * conservative mutation effects on the matched values. Without the fix
 * for ModuleLocal global type resolution, Array.isArray inside the match
 * IIFE body would not get its signature resolved, causing
 * MutateTransitiveConditionally on the match argument and wider mutable
 * ranges that prevent fine-grained memoization.
 */
function useFoo(data: {status: string, priority: string}) {
  const [count] = useState(0);
  const active = count > 0;

  if (data.status === 'closed') {
    return active ? 'closed_active' : 'closed';
  }

  return match ([data.priority, active]) {
    ['high', true] => 'high_active',
    ['high', false] => 'high_inactive',
    ['medium', true] => 'medium_active',
    ['medium', false] => 'medium_inactive',
    ['low', true] => 'low_active',
    ['low', false] => 'low_inactive',
    [_, true] => 'other_active',
    [_, false] => 'other_inactive',
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{status: 'open', priority: 'high'}],
};

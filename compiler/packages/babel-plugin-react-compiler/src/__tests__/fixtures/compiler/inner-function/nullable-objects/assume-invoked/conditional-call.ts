import {useState} from 'react';
import {useIdentity} from 'shared-runtime';

/**
 * Assume that conditionally called functions can be invoked and that their
 * property loads are hoistable to the function declaration site.
 */
function useMakeCallback({obj}: {obj: {value: number}}) {
  const [state, setState] = useState(0);
  const cb = () => {
    if (obj.value !== 0) setState(obj.value);
  };
  useIdentity(null);
  if (state === 0) {
    cb();
  }
  return {cb};
}
export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{obj: {value: 1}}],
  sequentialRenders: [{obj: {value: 1}}, {obj: {value: 2}}],
};

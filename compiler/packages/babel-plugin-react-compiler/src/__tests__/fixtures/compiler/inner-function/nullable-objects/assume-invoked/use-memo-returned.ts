// @validateExhaustiveMemoizationDependencies:false
import {useState, useMemo} from 'react';
import {useIdentity} from 'shared-runtime';

/**
 * Assume that conditionally called functions can be invoked and that their
 * property loads are hoistable to the function declaration site.
 */
function useMakeCallback({
  obj,
  shouldSynchronizeState,
}: {
  obj: {value: number};
  shouldSynchronizeState: boolean;
}) {
  const [state, setState] = useState(0);
  const cb = useMemo(() => {
    return () => {
      if (obj.value !== 0) setState(obj.value);
    };
  }, [obj.value, shouldSynchronizeState]);
  useIdentity(null);
  return cb;
}
export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{obj: {value: 1}}],
  sequentialRenders: [{obj: {value: 1}}, {obj: {value: 2}}],
};

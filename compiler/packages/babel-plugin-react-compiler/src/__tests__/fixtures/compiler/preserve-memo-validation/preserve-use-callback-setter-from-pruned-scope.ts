// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';

/**
 * Repro from https://github.com/react/react/issues/35118
 *
 * `setObservable` comes out of a pruned scope, but it is still stable, so
 * `restart` only depends on `observable`.
 */
function useSubscription(options) {
  const {skip} = options;
  const recreate = () => (skip ? undefined : {});
  let [observable, setObservable] = useState(options.skip ? null : recreate);
  const recreateRef = useRef(recreate);
  useLayoutEffect(() => {
    recreateRef.current = recreate;
  });
  if (!skip && !observable) {
    setObservable((observable = recreate()));
  }
  const restart = useCallback(() => {
    if (observable) {
      setObservable(recreateRef.current());
    }
  }, [observable]);
  return useMemo(() => ({restart}), [restart]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useSubscription,
  params: [{skip: false}],
};

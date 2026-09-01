// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useCallback, useRef} from 'react';

function useFoo({cond}) {
  const ref1 = useRef<undefined | (() => undefined)>();
  const ref2 = useRef<undefined | (() => undefined)>();
  const ref = cond ? ref1 : ref2;

  return useCallback(() => {
    if (ref != null) {
      ref.current();
    }
  }, []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

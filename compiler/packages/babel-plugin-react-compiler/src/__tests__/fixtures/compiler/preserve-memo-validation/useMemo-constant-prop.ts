// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useFoo(cond) {
  const sourceDep = 0;
  const derived1 = useMemo(() => {
    return identity(sourceDep);
  }, [sourceDep]);
  const derived2 = (cond ?? Math.min(sourceDep, 1)) ? 1 : 2;
  const derived3 = useMemo(() => {
    return identity(sourceDep);
  }, [sourceDep]);
  const derived4 = (Math.min(sourceDep, -1) ?? cond) ? 1 : 2;
  return [derived1, derived2, derived3, derived4];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

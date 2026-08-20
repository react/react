import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useHook({a, b}) {
  const valA = useMemo(() => identity({a}), [a]);
  const valB = useMemo(() => identity([b]), [b]);
  return [valA, valB];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{a: 2, b: 3}],
};

import {useMemo} from 'react';
import {
  makeObject_Primitives,
  mutate,
  Stringify,
  ValidateMemoization,
} from 'shared-runtime';

function Component({cond}) {
  const memoized = useMemo(() => {
    const value = makeObject_Primitives();
    if (cond) {
      return value;
    } else {
      mutate(value);
      return value;
    }
  }, [cond]);
  return <ValidateMemoization inputs={[cond]} output={memoized} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false}],
  sequentialRenders: [
    {cond: false},
    {cond: false},
    {cond: true},
    {cond: true},
    {cond: false},
    {cond: true},
    {cond: false},
    {cond: true},
  ],
};

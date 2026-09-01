import {useMemo} from 'react';
import {
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  const x = useMemo(() => [{a}], [a]);
  const y = typedCreateFrom(x);
  const z = typedCapture(y);
  // does not mutate x, so x should not depend on b
  typedMutate(z, b);

  return <ValidateMemoization inputs={[a]} output={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 0, b: 0},
    {a: 0, b: 1},
    {a: 1, b: 1},
    {a: 0, b: 0},
  ],
};

// @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  const x = useMemo(() => [{a}], [a]);
  const f = () => {
    const y = typedCreateFrom(x);
    const z = typedCapture(y);
    return z;
  };
  const z = f();
  // does not mutate x, so x should not depend on b
  typedMutate(z, b);

  // TODO: this *should* only depend on `a`
  return <ValidateMemoization inputs={[a, b]} output={x} />;
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

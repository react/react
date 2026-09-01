// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({a, b}) {
  const x = useMemo(() => ({a}), [a, b]);
  const f = () => {
    return identity(x);
  };
  const x2 = f();
  x2.b = b;

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

// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  const o: any = useMemo(() => ({a}), [a]);
  const x: Array<any> = useMemo(() => [o], [o, b]);
  const y = typedCapture(x);
  const z = typedCapture(y);
  x.push(z);
  x.push(b);

  return (
    <>
      <ValidateMemoization inputs={[a]} output={o} />;
      <ValidateMemoization inputs={[a, b]} output={x} />;
    </>
  );
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

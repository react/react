// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {
  mutate,
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b, c}: {a: number; b: number; c: number}) {
  const x = useMemo(() => [{value: a}], [a, b, c]);
  if (b === 0) {
    // This object should only depend on c, it cannot be affected by the later mutation
    x.push({value: c});
  } else {
    // This mutation shouldn't affect the object in the consequent
    mutate(x);
  }

  return (
    <>
      <ValidateMemoization inputs={[a, b, c]} output={x} />;
      {/* TODO: should only depend on c */}
      <ValidateMemoization inputs={[a, b, c]} output={x[0]} />;
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0, c: 0}],
  sequentialRenders: [
    {a: 0, b: 0, c: 0},
    {a: 0, b: 1, c: 0},
    {a: 1, b: 1, c: 0},
    {a: 1, b: 1, c: 1},
    {a: 1, b: 1, c: 0},
    {a: 1, b: 0, c: 0},
    {a: 0, b: 0, c: 0},
  ],
};

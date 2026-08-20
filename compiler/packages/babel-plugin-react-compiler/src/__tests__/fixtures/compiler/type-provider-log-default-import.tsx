import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';
import typedLog from 'shared-runtime';

export function Component({a, b}) {
  const item1 = useMemo(() => ({a}), [a]);
  const item2 = useMemo(() => ({b}), [b]);
  typedLog(item1, item2);

  return (
    <>
      <ValidateMemoization inputs={[a]} output={item1} />
      <ValidateMemoization inputs={[b]} output={item2} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 0, b: 0},
    {a: 1, b: 0},
    {a: 1, b: 1},
    {a: 1, b: 2},
    {a: 2, b: 2},
    {a: 3, b: 2},
    {a: 0, b: 0},
  ],
};

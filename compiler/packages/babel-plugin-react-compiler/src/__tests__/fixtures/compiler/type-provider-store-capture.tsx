import {useMemo} from 'react';
import {typedArrayPush, ValidateMemoization} from 'shared-runtime';

export function Component({a, b}) {
  const item1 = useMemo(() => ({a}), [a]);
  const item2 = useMemo(() => ({b}), [b]);
  const items = useMemo(() => {
    const items = [];
    typedArrayPush(items, item1);
    typedArrayPush(items, item2);
    return items;
  }, [item1, item2]);

  return (
    <>
      <ValidateMemoization inputs={[a]} output={items[0]} />
      <ValidateMemoization inputs={[b]} output={items[1]} />
      <ValidateMemoization inputs={[a, b]} output={items} />
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

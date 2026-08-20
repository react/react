import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({a, b}) {
  const x = useMemo(() => {
    return [a];
  }, [a]);
  const y = useMemo(() => {
    const items = [b];
    for (const i of x) {
      items.push(i);
    }
    return items;
  }, [x, b]);
  return (
    <>
      <ValidateMemoization inputs={[a]} output={x} />
      <ValidateMemoization inputs={[x, b]} output={y} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 1, b: 0},
    {a: 1, b: 1},
    {a: 0, b: 1},
  ],
};

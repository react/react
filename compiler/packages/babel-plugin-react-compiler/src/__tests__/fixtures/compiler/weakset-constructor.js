import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({a, b, c}) {
  const set = new WeakSet();
  const setAlias = set.add(a);
  setAlias.add(c);

  const hasB = set.has(b);

  return (
    <>
      <ValidateMemoization
        inputs={[a, c]}
        output={set}
        onlyCheckCompiled={true}
      />
      <ValidateMemoization
        inputs={[a, c]}
        output={setAlias}
        onlyCheckCompiled={true}
      />
      <ValidateMemoization
        inputs={[b]}
        output={[hasB]}
        onlyCheckCompiled={true}
      />
    </>
  );
}

const v1 = {value: 1};
const v2 = {value: 2};
const v3 = {value: 3};
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: v1, b: v1, c: v1}],
  sequentialRenders: [
    {a: v1, b: v1, c: v1},
    {a: v2, b: v1, c: v1},
    {a: v1, b: v1, c: v1},
    {a: v1, b: v2, c: v1},
    {a: v1, b: v1, c: v1},
    {a: v3, b: v3, c: v1},
    {a: v3, b: v3, c: v1},
    {a: v1, b: v1, c: v1},
  ],
};

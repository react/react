// @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies @enablePropagateDepsInHIR
import {ValidateMemoization} from 'shared-runtime';
import {useMemo} from 'react';
function Component({arg}) {
  const data = useMemo(() => {
    const x = [];
    x.push(arg?.items);
    return x;
  }, [arg?.items]);
  return <ValidateMemoization inputs={[arg?.items]} output={data} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{arg: {items: 2}}],
  sequentialRenders: [
    {arg: {items: 2}},
    {arg: {items: 2}},
    {arg: null},
    {arg: null},
  ],
};

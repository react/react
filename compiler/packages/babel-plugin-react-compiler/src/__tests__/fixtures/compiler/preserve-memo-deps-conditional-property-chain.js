// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({x}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        return identity(x.y.z);
      },
    });
  }, [x.y.z]);
  const result = useMemo(() => {
    return [object.callback()];
  }, [object]);
  return <ValidateMemoization inputs={[x.y.z]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: {y: {z: 42}}}],
  sequentialRenders: [
    {x: {y: {z: 42}}},
    {x: {y: {z: 42}}},
    {x: {y: {z: 3.14}}},
    {x: {y: {z: 42}}},
    {x: {y: {z: 3.14}}},
    {x: {y: {z: 42}}},
  ],
};

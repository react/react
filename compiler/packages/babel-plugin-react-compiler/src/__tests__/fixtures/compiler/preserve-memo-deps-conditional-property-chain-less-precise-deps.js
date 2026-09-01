// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({x}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        return identity(x.y.z); // accesses more levels of properties than the manual memo
      },
    });
    // x.y as a manual dep only tells us that x is non-nullable, not that x.y is non-nullable
    // we can only take a dep on x.y, not x.y.z
  }, [x.y]);
  const result = useMemo(() => {
    return [object.callback()];
  }, [object]);
  return <ValidateMemoization inputs={[x.y]} output={result} />;
}

const input1 = {x: {y: {z: 42}}};
const input1b = {x: {y: {z: 42}}};
const input2 = {x: {y: {z: 3.14}}};
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [input1],
  sequentialRenders: [
    input1,
    input1,
    input1b, // should reset even though .z didn't change
    input1,
    input2,
  ],
};

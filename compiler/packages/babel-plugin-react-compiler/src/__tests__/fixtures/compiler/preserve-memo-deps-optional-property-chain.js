// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({x, y, z}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        return identity(x?.y?.z, y.a?.b, z.a.b?.c);
      },
    });
  }, [x?.y?.z, y.a?.b, z.a.b?.c]);
  const result = useMemo(() => {
    return [object.callback()];
  }, [object]);
  return <Inner x={x} result={result} />;
}

function Inner({x, result}) {
  'use no memo';
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

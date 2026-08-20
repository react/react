// @compilationMode:"infer"
import {useEffect, useMemo, useState} from 'react';
import {ValidateMemoization} from 'shared-runtime';

let pretendConst = 0;

function unsafeResetConst() {
  pretendConst = 0;
}

function unsafeUpdateConst() {
  pretendConst += 1;
}

function Component() {
  useState(() => {
    // unsafe: reset the constant when first rendering the instance
    unsafeResetConst();
  });
  // UNSAFE! changing a module variable that is read by a component is normally
  // unsafe, but in this case we're simulating a fast refresh between each render
  unsafeUpdateConst();

  // In production mode (no @enableResetCacheOnSourceFileChanges) memo caches are not
  // reset unless the deps change
  const value = useMemo(() => [{pretendConst}], []);

  return <ValidateMemoization inputs={[]} output={value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

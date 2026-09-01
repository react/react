// @compilationMode:"infer" @enableResetCacheOnSourceFileChanges @validateExhaustiveMemoizationDependencies:false
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

  // TODO: In fast refresh mode (@enableResetCacheOnSourceFileChanges) Forget should
  // reset on changes to globals that impact the component/hook, effectively memoizing
  // as if value was reactive. However, we don't want to actually treat globals as
  // reactive (though that would be trivial) since it could change compilation too much
  // btw dev and prod. Instead, we should reset the cache via a secondary mechanism.
  const value = useMemo(() => [{pretendConst}], [pretendConst]);

  return <ValidateMemoization inputs={[pretendConst]} output={value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

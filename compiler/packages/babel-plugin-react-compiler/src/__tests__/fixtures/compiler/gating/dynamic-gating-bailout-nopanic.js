// @dynamicGating:{"source":"shared-runtime"} @validatePreserveExistingMemoizationGuarantees @panicThreshold:"none" @loggerTestOnly @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function Foo({value}) {
  'use memo if(getTrue)';

  const initialValue = useMemo(() => identity(value), []);
  return (
    <>
      <div>initial value {initialValue}</div>
      <div>current value {value}</div>
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 1}],
  sequentialRenders: [{value: 1}, {value: 2}],
};

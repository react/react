// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({value}: {value: {label: string}}) {
  const result = useMemo(() => value, [value]);

  return <ValidateMemoization inputs={[value]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {label: 'first'}}],
  sequentialRenders: [{value: {label: 'first'}}, {value: {label: 'second'}}],
};

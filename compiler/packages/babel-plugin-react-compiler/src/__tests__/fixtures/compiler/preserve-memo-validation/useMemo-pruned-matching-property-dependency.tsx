// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({value}: {value: {label: string}}) {
  const alias = value;
  const result = useMemo(() => alias.label, [alias.label]);

  return <ValidateMemoization inputs={[alias.label]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {label: 'first'}}],
  sequentialRenders: [{value: {label: 'first'}}, {value: {label: 'second'}}],
};

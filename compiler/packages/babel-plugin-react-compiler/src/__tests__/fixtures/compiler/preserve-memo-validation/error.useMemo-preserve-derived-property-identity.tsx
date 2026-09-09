// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

type Value = {
  id: number;
  label: string;
};

function getIdentity(value: Value): number {
  return value.id;
}

function Component({value}: {value: Value}) {
  const alias = value;
  const identity = getIdentity(value);
  const result = useMemo(() => alias.label, [identity]);

  return <ValidateMemoization inputs={[identity]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {id: 1, label: 'first'}}],
  sequentialRenders: [
    {value: {id: 1, label: 'first'}},
    {value: {id: 1, label: 'second'}},
    {value: {id: 2, label: 'third'}},
  ],
};

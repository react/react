import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number}}) {
  const assertedDependency = useMemo(() => data.id, [data!.id]);
  const assertedCallback = useMemo(() => data!.id, [data.id]);
  const repeatedAssertions = useMemo(() => data!!.id, [data!!.id]);
  return (
    <Stringify
      assertedDependency={assertedDependency}
      assertedCallback={assertedCallback}
      repeatedAssertions={repeatedAssertions}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: {id: 1}}],
  sequentialRenders: [{data: {id: 1}}, {data: {id: 2}}],
};

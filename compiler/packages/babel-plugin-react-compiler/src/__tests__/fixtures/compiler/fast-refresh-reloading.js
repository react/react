// @enableResetCacheOnSourceFileChanges
import {useMemo, useState} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component(props) {
  const [state, setState] = useState(0);
  const doubled = useMemo(() => [state * 2], [state]);
  return <ValidateMemoization inputs={[state]} output={doubled} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

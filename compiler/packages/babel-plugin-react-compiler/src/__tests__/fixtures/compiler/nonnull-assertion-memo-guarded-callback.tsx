import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number} | null}) {
  const onClick = useCallback(() => data!.id, [data]);
  return data ? <Stringify onClick={onClick} /> : 'empty';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: null}],
  sequentialRenders: [{data: null}, {data: {id: 1}}],
};

import {identity, Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number} | null}) {
  const id = identity(data!.id);
  return <Stringify id={id} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: {id: 1}}],
  sequentialRenders: [{data: {id: 1}}, {data: {id: 2}}],
};

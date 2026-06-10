import {Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number} | null}) {
  const handleClick = () => {
    console.log(data!.id);
  };
  return (
    <div>{data ? <Stringify onClick={handleClick} /> : 'empty'}</div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: null}],
  sequentialRenders: [{data: null}, {data: {id: 1}}],
};

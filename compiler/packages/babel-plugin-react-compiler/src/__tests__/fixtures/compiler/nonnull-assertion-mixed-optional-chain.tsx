import {Stringify} from 'shared-runtime';

function Component({data}: {data: {nested: {id: number} | null} | null}) {
  const onClick = () => {
    console.log(data!.nested?.id);
  };
  return <div>{data ? <Stringify onClick={onClick} /> : 'empty'}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: null}],
  sequentialRenders: [
    {data: null},
    {data: {nested: null}},
    {data: {nested: {id: 1}}},
  ],
};

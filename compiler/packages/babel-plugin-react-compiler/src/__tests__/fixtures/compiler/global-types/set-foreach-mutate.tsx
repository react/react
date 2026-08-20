import {mutateAndReturn, Stringify, useIdentity} from 'shared-runtime';

function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity();
  const derived = new Set(arr).forEach(mutateAndReturn);
  return <Stringify>{[...derived]}</Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 5}],
  sequentialRenders: [{value: 5}, {value: 6}, {value: 6}, {value: 7}],
};

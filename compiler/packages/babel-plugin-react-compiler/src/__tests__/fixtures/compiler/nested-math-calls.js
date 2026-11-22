import {identity} from 'shared-runtime';

function Component({value}) {
  const x = identity(value);
  return <div>{Math.floor(Math.abs(x))}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: -2.5}],
  sequentialRenders: [{value: -2.5}, {value: -2.5}, {value: 3.7}],
};

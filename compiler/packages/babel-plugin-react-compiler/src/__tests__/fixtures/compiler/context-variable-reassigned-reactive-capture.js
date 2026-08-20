import {invoke} from 'shared-runtime';

function Component({value}) {
  let x = null;
  const reassign = () => {
    x = value;
  };
  invoke(reassign);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 2}],
  sequentialRenders: [{value: 2}, {value: 4}],
};

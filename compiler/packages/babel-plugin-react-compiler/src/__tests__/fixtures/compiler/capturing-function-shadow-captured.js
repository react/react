import {mutate, Stringify} from 'shared-runtime';
function Component({a}) {
  let z = {a};
  let x = function () {
    let z;
    mutate(z);
    return z;
  };
  return <Stringify fn={x} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1}],
  sequentialRenders: [{a: 1}, {a: 1}, {a: 2}],
};

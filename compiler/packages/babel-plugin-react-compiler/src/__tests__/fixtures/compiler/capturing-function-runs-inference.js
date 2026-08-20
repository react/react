import {Stringify} from 'shared-runtime';
function Component({a, b}) {
  let z = {a};
  let p = () => <Stringify>{z}</Stringify>;
  return p();
}
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1}],
  sequentialRenders: [{a: 1}, {a: 1}, {a: 2}],
};

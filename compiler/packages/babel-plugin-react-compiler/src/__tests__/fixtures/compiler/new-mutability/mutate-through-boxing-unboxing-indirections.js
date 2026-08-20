// @enableNewMutationAliasingModel
import {Stringify} from 'shared-runtime';

function Component({a, b}) {
  const x = {a, b};
  const y = [x];
  const x0 = y[0];
  const z = [x0];
  const x1 = z[0];
  x1.key = 'value';
  return <Stringify x={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 1}],
};

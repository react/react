import {identity, Stringify} from 'shared-runtime';

function Component({x, ...rest}) {
  const z = rest.z;
  identity(z);
  return <Stringify x={x} z={z} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 'Hello', z: 'World'}],
};

import {identity, Stringify, useIdentity} from 'shared-runtime';

function Component(props) {
  const {x, ...rest} = useIdentity(props);
  const z = rest.z;
  identity(z);
  return <Stringify x={x} z={z} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 'Hello', z: 'World'}],
};

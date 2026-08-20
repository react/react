import {identity, Stringify} from 'shared-runtime';

function Component({x, ...rest}) {
  return <Stringify {...rest} x={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 'Hello', z: 'World'}],
};

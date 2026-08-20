import {Stringify} from 'shared-runtime';
function Component(props) {
  const cb = (x, y, z) => x + y + z;

  return <Stringify cb={cb} id={props.id} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{id: 0}],
};

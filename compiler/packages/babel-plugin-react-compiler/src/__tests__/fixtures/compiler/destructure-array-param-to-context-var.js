import {identity} from 'shared-runtime';

function Component([x]) {
  x = identity(x);
  const read = () => x;
  return read();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [[42]],
};

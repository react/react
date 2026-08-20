import {identity} from 'shared-runtime';

function Component(props) {
  let x;
  ({x} = props);
  const foo = () => {
    x = identity(props.x);
  };
  foo();
  return {x};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 42}],
};

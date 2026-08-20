import {identity} from 'shared-runtime';

function Component(props) {
  let x;
  [x] = props.value;
  const foo = () => {
    x = identity(props.value[0]);
  };
  foo();
  return {x};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [42]}],
};

import {useHook, identity} from 'shared-runtime';

function Component(props) {
  let x = 42;
  if (props.cond) {
    x = [];
  }
  useHook(); // intersperse a hook call to prevent memoization of x
  identity(x);

  const y = [x];

  return [y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'sathya'}],
};

import {mutate, useNoAlias} from 'shared-runtime';

function Component(props) {
  // Here `x` cannot be memoized bc its mutable range spans a hook call:
  const x = [];
  useNoAlias();
  mutate(x);

  // However, `x` is non-reactive. It cannot semantically change, so we
  // exclude it as a dependency of the JSX element:
  return <div>{x}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

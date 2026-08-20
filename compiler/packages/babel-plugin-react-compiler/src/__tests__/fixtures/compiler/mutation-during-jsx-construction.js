import {identity, mutate, mutateAndReturnNewValue} from 'shared-runtime';

function Component(props) {
  const key = {};
  // Key is modified by the function, but key itself is not frozen
  const element = <div key={mutateAndReturnNewValue(key)}>{props.value}</div>;
  // Key is later mutated here: this mutation must be grouped with the
  // jsx construction above
  mutate(key);
  return element;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

import {identity, mutate, mutateAndReturn} from 'shared-runtime';

function Component(props) {
  const key = {a: 'key'};
  const context = {
    [key.a]: identity([props.value]),
  };
  mutate(key);
  return context;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

import {identity, mutate} from 'shared-runtime';

function Component(props) {
  const key = {};
  const context = {
    [key]: identity([props.value]),
  };
  mutate(key);
  return context;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

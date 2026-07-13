import {identity, mutate, mutateAndReturn} from 'shared-runtime';

function Component(props) {
  const obj = {mutateAndReturn};
  const key = {};
  const context = {
    [obj.mutateAndReturn(key)]: identity([props.value]),
  };
  mutate(key);
  return context;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

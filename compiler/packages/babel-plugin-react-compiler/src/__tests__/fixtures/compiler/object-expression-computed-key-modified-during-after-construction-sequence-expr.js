import {identity, mutate, mutateAndReturn} from 'shared-runtime';

function Component(props) {
  const key = {};
  const context = {
    [(mutate(key), key)]: identity([props.value]),
  };
  mutate(key);
  return [context, key];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
  sequentialRenders: [{value: 42}, {value: 42}],
};

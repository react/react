import {identity} from 'shared-runtime';

function Component(props) {
  const key = 'KeyName';
  const context = {
    [key]: identity([props.value]),
  };
  return context;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

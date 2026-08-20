import {identity} from 'shared-runtime';

const SCALE = 2;

function Component(props) {
  const {key} = props;
  const context = {
    [key]: identity([props.value, SCALE]),
  };
  return context;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{key: 'Sathya', value: 'Compiler'}],
};

import {identity} from 'shared-runtime';

const SCALE = 2;
function Component(props) {
  const {[props.name]: value} = props;
  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Sathya'}],
};

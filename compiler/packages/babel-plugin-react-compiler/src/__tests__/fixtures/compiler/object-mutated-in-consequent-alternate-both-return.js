import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const object = makeObject_Primitives();
  if (props.cond) {
    object.value = 1;
    return object;
  } else {
    object.value = props.value;
    return object;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, value: [0, 1, 2]}],
};

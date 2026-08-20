import {useFragment as readFragment} from 'shared-runtime';

function Component(props) {
  let data;
  if (props.cond) {
    data = readFragment();
  }
  return data;
}

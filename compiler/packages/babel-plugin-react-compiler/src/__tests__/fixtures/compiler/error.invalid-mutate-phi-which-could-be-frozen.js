import {useHook} from 'shared-runtime';

function Component(props) {
  const frozen = useHook();
  let x;
  if (props.cond) {
    x = frozen;
  } else {
    x = {};
  }
  x.property = true;
}

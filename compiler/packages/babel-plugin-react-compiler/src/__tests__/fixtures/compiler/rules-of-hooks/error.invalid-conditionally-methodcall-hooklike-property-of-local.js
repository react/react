import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const local = makeObject_Primitives();
  if (props.cond) {
    local.useFoo();
  }
}

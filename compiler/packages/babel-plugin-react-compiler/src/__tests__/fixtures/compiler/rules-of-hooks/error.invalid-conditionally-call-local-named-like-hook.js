import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const useFoo = makeObject_Primitives();
  if (props.cond) {
    useFoo();
  }
}

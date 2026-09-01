import {useRef} from 'react';

function Component() {
  const ref = useRef(null);
  const object = {};
  object.foo = () => ref.current;
  const refValue = object.foo();
  return <div>{refValue}</div>;
}

import {useRef} from 'react';

function Component() {
  const ref = useRef(null);
  const obj = {ref};
  return <div>{obj.ref.current}</div>;
}

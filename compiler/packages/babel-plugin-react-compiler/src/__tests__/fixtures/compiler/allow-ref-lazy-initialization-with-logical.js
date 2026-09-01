// @validateRefAccessDuringRender

import {useRef} from 'react';

function Component(props) {
  const ref = useRef(null);
  if (ref.current == null) {
    // the logical means the ref write is in a different block
    // from the if consequent. this tests that the "safe" blocks
    // extend up to the if's fallthrough
    ref.current = props.unknownKey ?? props.value;
  }
  return <Child ref={ref} />;
}

function Child({ref}) {
  'use no memo';
  return ref.current;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

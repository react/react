// @validateRefAccessDuringRender
import {useEffect, useRef, useState} from 'react';

function Component() {
  const ref = useRef(null);
  const [state, setState] = useState(false);
  useEffect(() => {
    const callback = () => {
      ref.current = 'Ok';
    };
  }, []);

  useEffect(() => {
    setState(true);
  }, []);

  // We use state to force a re-render and observe whether the
  // ref updated. This lets us check that the effect actually ran
  // and wasn't DCE'd
  return <Child key={String(state)} ref={ref} />;
}

function Child({ref}) {
  'use no memo';
  // This violates the rules of React, so we access the ref in a child
  // component
  return ref.current;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @outputMode:"lint"
import {useState, useRef, useEffect} from 'react';

function Component() {
  const ref = useRef([1, 2, 3, 4, 5]);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const index = 2;
    setValue(ref.current[index]);
  }, []);

  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

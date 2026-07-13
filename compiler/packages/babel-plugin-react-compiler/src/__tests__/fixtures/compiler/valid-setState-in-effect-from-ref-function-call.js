// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @outputMode:"lint"
import {useState, useRef, useEffect} from 'react';

function Component() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    function getBoundingRect(ref) {
      if (ref.current) {
        return ref.current.getBoundingClientRect?.()?.width ?? 100;
      }
      return 100;
    }

    setWidth(getBoundingRect(ref));
  }, []);

  return width;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

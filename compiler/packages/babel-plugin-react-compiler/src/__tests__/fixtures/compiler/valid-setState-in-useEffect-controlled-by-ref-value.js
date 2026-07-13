// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @loggerTestOnly @compilationMode:"infer" @outputMode:"lint"
import {useState, useRef, useEffect} from 'react';

function Component({x, y}) {
  const previousXRef = useRef(null);
  const previousYRef = useRef(null);

  const [data, setData] = useState(null);

  useEffect(() => {
    const previousX = previousXRef.current;
    previousXRef.current = x;
    const previousY = previousYRef.current;
    previousYRef.current = y;
    if (!areEqual(x, previousX) || !areEqual(y, previousY)) {
      const data = load({x, y});
      setData(data);
    }
  }, [x, y]);

  return data;
}

function areEqual(a, b) {
  return a === b;
}

function load({x, y}) {
  return x * y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 0, y: 0}],
  sequentialRenders: [
    {x: 0, y: 0},
    {x: 1, y: 0},
    {x: 1, y: 1},
  ],
};

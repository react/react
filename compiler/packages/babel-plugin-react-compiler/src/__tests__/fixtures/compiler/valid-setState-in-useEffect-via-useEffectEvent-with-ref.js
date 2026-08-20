// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @loggerTestOnly @compilationMode:"infer"
import {useState, useRef, useEffect, useEffectEvent} from 'react';

function Component({x, y}) {
  const previousXRef = useRef(null);
  const previousYRef = useRef(null);

  const [data, setData] = useState(null);

  const effectEvent = useEffectEvent(() => {
    const data = load({x, y});
    setData(data);
  });

  useEffect(() => {
    const previousX = previousXRef.current;
    previousXRef.current = x;
    const previousY = previousYRef.current;
    previousYRef.current = y;
    if (!areEqual(x, previousX) || !areEqual(y, previousY)) {
      effectEvent();
    }
  }, [x, y]);

  const effectEvent2 = useEffectEvent((xx, yy) => {
    const previousX = previousXRef.current;
    previousXRef.current = xx;
    const previousY = previousYRef.current;
    previousYRef.current = yy;
    if (!areEqual(xx, previousX) || !areEqual(yy, previousY)) {
      const data = load({x: xx, y: yy});
      setData(data);
    }
  });

  useEffect(() => {
    effectEvent2(x, y);
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

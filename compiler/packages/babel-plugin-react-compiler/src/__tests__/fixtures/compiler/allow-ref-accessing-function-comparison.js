// @validateRefAccessDuringRender
import {useCallback, useRef} from 'react';

function Component({previous, choose}) {
  const ref = useRef(0);
  const callback = () => ++ref.current;
  const memoized = useCallback(() => ++ref.current, []);
  const alias = callback;
  const selected = choose ? callback : memoized;

  return [
    callback === previous,
    previous !== callback,
    memoized !== previous,
    previous === memoized,
    alias === previous,
    previous !== alias,
    selected !== previous,
    previous === selected,
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{previous: null, choose: true}],
  sequentialRenders: [
    {previous: null, choose: true},
    {previous: null, choose: false},
  ],
};

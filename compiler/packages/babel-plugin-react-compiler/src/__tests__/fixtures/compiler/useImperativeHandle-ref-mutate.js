// @flow

import {useImperativeHandle, useRef} from 'react';

component Component(prop: number) {
  const ref1 = useRef(null);
  const ref2 = useRef(1);
  useImperativeHandle(ref1, () => {
    const precomputed = prop + ref2.current;
    return {
      foo: () => prop + ref2.current + precomputed,
    };
  }, [prop]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop: 1}],
};

// @enableTransitivelyFreezeFunctionExpressions
import {mutate, Stringify, useIdentity} from 'shared-runtime';

function Foo({count}) {
  const x = {value: 0};
  /**
   * After this custom hook call, it's no longer valid to mutate x.
   */
  const cb = useIdentity(() => {
    x.value++;
  });

  x.value += count;
  return <Stringify x={x} cb={cb} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{count: 1}],
};

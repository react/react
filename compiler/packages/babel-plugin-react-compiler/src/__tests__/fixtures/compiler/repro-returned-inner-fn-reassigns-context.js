import {makeArray, Stringify, useIdentity} from 'shared-runtime';

/**
 * Example showing that returned inner function expressions should not be
 * typed with `freeze` effects.
 * Also see repro-returned-inner-fn-mutates-context
 */
function Foo({b}) {
  'use memo';

  const fnFactory = () => {
    /**
     * This returned function expression *is* a local value. But it might (1)
     * capture and mutate its context environment and (2) be called during
     * render.
     * Typing it with `freeze` effects would be incorrect as it would mean
     * inferring that calls to updaterFactory()() do not mutate its captured
     * context.
     */
    return () => {
      myVar = () => console.log('a');
    };
  };
  let myVar = () => console.log('b');
  useIdentity();

  const fn = fnFactory();
  const arr = makeArray(b);
  fn(arr);
  return <Stringify cb={myVar} value={arr} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{b: 1}],
  sequentialRenders: [{b: 1}, {b: 2}],
};

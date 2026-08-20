import {Stringify} from 'shared-runtime';

/**
 * Example showing that returned inner function expressions should not be
 * typed with `freeze` effects.
 */
function Foo({a, b}) {
  'use memo';
  const obj = {};
  const updaterFactory = () => {
    /**
     * This returned function expression *is* a local value. But it might (1)
     * capture and mutate its context environment and (2) be called during
     * render.
     * Typing it with `freeze` effects would be incorrect as it would mean
     * inferring that calls to updaterFactory()() do not mutate its captured
     * context.
     */
    return newValue => {
      obj.value = newValue;
      obj.a = a;
    };
  };

  const updater = updaterFactory();
  updater(b);
  return <Stringify cb={obj} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{a: 1, b: 2}],
  sequentialRenders: [
    {a: 1, b: 2},
    {a: 1, b: 3},
  ],
};

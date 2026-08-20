import {identity, makeObject_Primitives} from 'shared-runtime';

function useHook() {}

function useTest({cond}) {
  const val = makeObject_Primitives();

  useHook();
  /**
   * We don't technically need a reactive scope for this ternary as
   * it cannot produce newly allocated values.
   * While identity(...) may allocate, we can teach the compiler that
   * its result is only used as as a test condition
   */
  const result = identity(cond) ? val : null;
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [{cond: true}],
};

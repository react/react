// @enablePropagateDepsInHIR
import {identity, useIdentity} from 'shared-runtime';

function useFoo({arg, cond}: {arg: number; cond: boolean}) {
  const maybeObj = useIdentity({value: arg});
  const {value} = maybeObj;
  useIdentity(null);
  /**
   * maybeObj.value should be inferred as the dependency of this scope
   * since we know that maybeObj is safe to read from (i.e. non-null)
   * due to the above destructuring instruction
   */
  const arr = [];
  if (cond) {
    arr.push(identity(maybeObj.value));
  }
  return {arr, value};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{arg: 2, cond: false}],
};

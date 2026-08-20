import {identity, sum} from 'shared-runtime';

// Check that we correctly resolve type and effect lookups on the javascript
// global object.
function Component(props) {
  let neverAliasedOrMutated = identity(props.b);
  let primitiveVal1 = Math.max(props.a, neverAliasedOrMutated);
  let primitiveVal2 = Infinity;
  let primitiveVal3 = globalThis.globalThis.NaN;

  // Even though we don't know the function signature of sum,
  // we should be able to infer that it does not mutate its inputs.
  sum(primitiveVal1, primitiveVal2, primitiveVal3);
  return {primitiveVal1, primitiveVal2, primitiveVal3};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 2}],
  isComponent: false,
};

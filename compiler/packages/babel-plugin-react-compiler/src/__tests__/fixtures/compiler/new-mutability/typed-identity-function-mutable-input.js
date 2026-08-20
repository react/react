// @enableNewMutationAliasingModel

import {
  identity,
  makeObject_Primitives,
  typedIdentity,
  useIdentity,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  // create a mutable value with input `a`
  const x = makeObject_Primitives(a);

  // known to pass-through via aliasing signature
  const x2 = typedIdentity(x);

  // Unknown function so we assume it conditionally mutates,
  // and x is still mutable so
  identity(x2, b);

  return <ValidateMemoization inputs={[a, b]} output={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 0, b: 0},
    {a: 1, b: 0},
    {a: 1, b: 1},
    {a: 0, b: 1},
    {a: 0, b: 0},
  ],
};

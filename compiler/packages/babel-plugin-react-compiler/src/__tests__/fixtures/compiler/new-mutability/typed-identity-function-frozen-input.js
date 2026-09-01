// @enableNewMutationAliasingModel

import {useMemo} from 'react';
import {
  identity,
  makeObject_Primitives,
  typedIdentity,
  useIdentity,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  // create a mutable value with input `a`
  const x = useMemo(() => makeObject_Primitives(a), [a]);

  // freeze the value
  useIdentity(x);

  // known to pass-through via aliasing signature
  const x2 = typedIdentity(x);

  // Unknown function so we assume it conditionally mutates,
  // but x2 is frozen so this downgrades to a read.
  // x should *not* take b as a dependency
  identity(x2, b);

  return <ValidateMemoization inputs={[a]} output={x} />;
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

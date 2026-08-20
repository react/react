// @loggerTestOnly
import {createContext, use, useState} from 'react';
import {
  Stringify,
  identity,
  makeObject_Primitives,
  useHook,
} from 'shared-runtime';

function Component() {
  const w = use(Context);

  // The scopes for x and x2 are interleaved, so this is one scope with two values
  const x = makeObject_Primitives();
  const x2 = makeObject_Primitives();
  useState(null);
  identity(x);
  identity(x2);

  // We create a scope for all call expressions, but prune those with hook calls
  // in this case it's _just_ a hook call, so we don't count this as pruned
  const y = useHook();

  const z = [];
  for (let i = 0; i < 10; i++) {
    // The scope for obj is pruned bc it's in a loop
    const obj = makeObject_Primitives();
    z.push(obj);
  }

  // Overall we expect two pruned scopes (for x+x2, and obj), with 3 pruned scope values.
  return <Stringify items={[w, x, x2, y, z]} />;
}

const Context = createContext();

function Wrapper() {
  return (
    <Context value={42}>
      <Component />
    </Context>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Wrapper,
  params: [{}],
};

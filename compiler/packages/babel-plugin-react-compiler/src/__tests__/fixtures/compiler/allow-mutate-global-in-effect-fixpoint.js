import {useEffect, useState} from 'react';

let someGlobal = {value: null};

function Component() {
  const [state, setState] = useState(someGlobal);

  // NOTE: if we initialize to eg null or a local, then it won't be a definitively global
  // mutation below when we modify `y`. The point of this is example is that if all control
  // flow paths produce a global, we allow the mutation in an effect
  let x = someGlobal;
  while (x == null) {
    x = someGlobal;
  }

  // capture into a separate variable that is not a context variable.
  const y = x;
  /**
   * Note that this fixture currently produces a stale effect closure if `y = x
   * = someGlobal` changes between renders. Under current compiler assumptions,
   * that would be a rule of react violation.
   */
  useEffect(() => {
    y.value = 'hello';
  });

  useEffect(() => {
    setState(someGlobal.value);
  }, [someGlobal]);

  return <div>{String(state)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

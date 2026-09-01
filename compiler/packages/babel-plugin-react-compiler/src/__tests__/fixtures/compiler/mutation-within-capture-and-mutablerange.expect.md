
## Input

```javascript
import {mutate} from 'shared-runtime';

/**
 * This test fixture is similar to mutation-within-jsx. The only difference
 * is that there is no `freeze` effect here, which means that `z` may be
 * mutated after its memo block through mutating `y`.
 *
 * While this is technically correct (as `z` is a nested memo block), it
 * is an edge case as we believe that values are not mutated after their
 * memo blocks (which may lead to 'tearing', i.e. mutating one render's
 * values in a subsequent render.
 */
function useFoo({a, b}) {
  // x and y's scopes start here
  const x = {a};
  const y = [b];
  mutate(x);
  // z captures the result of `mutate(y)`, which may be aliased to `y`.
  const z = [mutate(y)];
  // the following line may also mutate z
  mutate(y);
  // and end here
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: 2, b: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutate } from "shared-runtime";

/**
 * This test fixture is similar to mutation-within-jsx. The only difference
 * is that there is no `freeze` effect here, which means that `z` may be
 * mutated after its memo block through mutating `y`.
 *
 * While this is technically correct (as `z` is a nested memo block), it
 * is an edge case as we believe that values are not mutated after their
 * memo blocks (which may lead to 'tearing', i.e. mutating one render's
 * values in a subsequent render.
 */
function useFoo(t0) {
  const $ = _c(3);
  const { a, b } = t0;
  let z;
  if ($[0] !== a || $[1] !== b) {
    const x = { a };
    const y = [b];
    mutate(x);
    z = [mutate(y)];

    mutate(y);
    $[0] = a;
    $[1] = b;
    $[2] = z;
  } else {
    z = $[2];
  }

  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ a: 2, b: 3 }],
};

```
      
### Eval output
(kind: ok) [null]
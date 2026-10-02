
## Input

```javascript
// @compilationMode:"all"

/**
 * Regression test for a compiler crash on a named function expression that
 * references its own name recursively from within a lambda:
 *
 *   Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized
 *
 * The self-reference (`recur` below) is bound in the function's own scope, so
 * it is neither a parameter nor a captured context variable and was never
 * seeded in the mutation/aliasing inference state.
 */
function Component(props) {
  const run = () => {
    const apply = fn => fn(props.count);
    return apply(function recur(n) {
      if (n <= 0) {
        return 0;
      }
      return n + recur(n - 1);
    });
  };
  return run();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 4}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"all"

/**
 * Regression test for a compiler crash on a named function expression that
 * references its own name recursively from within a lambda:
 *
 *   Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized
 *
 * The self-reference (`recur` below) is bound in the function's own scope, so
 * it is neither a parameter nor a captured context variable and was never
 * seeded in the mutation/aliasing inference state.
 */
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.count) {
    const run = () => {
      const apply = (fn) => fn(props.count);
      return apply(function recur(n) {
        if (n <= 0) {
          return 0;
        }
        return n + recur(n - 1);
      });
    };
    t0 = run();
    $[0] = props.count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ count: 4 }],
};

```
      
### Eval output
(kind: ok) 10
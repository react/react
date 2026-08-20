
## Input

```javascript
// writing to primitives is not a 'mutate' or 'store' to context references,
// under current analysis in AnalyzeFunctions.
// <unknown> $23:TFunction = Function @deps[<unknown>
//   $21:TPrimitive,<unknown> $22:TPrimitive]:

function Component() {
  let x = 40;

  const fn = function () {
    x = x + 1;
  };
  fn();
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // writing to primitives is not a 'mutate' or 'store' to context references,
// under current analysis in AnalyzeFunctions.
// <unknown> $23:TFunction = Function @deps[<unknown>
//   $21:TPrimitive,<unknown> $22:TPrimitive]:

function Component() {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = 40;

    const fn = function () {
      x = x + 1;
    };

    fn();
    $[0] = x;
  } else {
    x = $[0];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 41
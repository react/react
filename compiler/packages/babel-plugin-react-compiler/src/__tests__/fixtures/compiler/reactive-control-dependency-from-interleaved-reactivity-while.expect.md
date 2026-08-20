
## Input

```javascript
function Component(props) {
  // a and b are independent but their mutations are interleaved, so
  // they get grouped in a reactive scope. this means that a becomes
  // reactive since it will effectively re-evaluate based on a reactive
  // input
  const a = [];
  const b = [];
  b.push(props.cond);
  a.push(null);

  // Downstream consumer of a, which initially seems non-reactive except
  // that a becomes reactive, per above
  const c = [a];

  let x;
  while (c[0][0]) {
    x = 1;
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" value `c[0]` which becomes reactive via
  // being interleaved with `b`.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(1);

  const a = [];
  const b = [];
  b.push(props.cond);
  a.push(null);

  const c = [a];

  let x;
  while (c[0][0]) {
    x = 1;
  }
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [x];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true }],
};

```
      
### Eval output
(kind: ok) [null]
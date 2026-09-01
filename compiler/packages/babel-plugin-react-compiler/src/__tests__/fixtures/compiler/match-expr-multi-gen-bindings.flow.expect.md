
## Input

```javascript
// @flow
// Match expression with multiple match arms that generate separate $$gen$m
// bindings ($$gen$m0, $$gen$m1). Hermes match desugar places all synthetic
// identifiers at position 0. The scope resolver must not corrupt bindings
// when multiple $$gen$m names share the same source position.

export default component MatchExprMultiGenBindings(
  x: ?{v: string},
  y: ?{w: number}
) {
  const a = match (x?.v) {
    'yes' => 1,
    _ => 0,
  };
  const b = match (y?.w) {
    42 => 'found',
    _ => 'not found',
  };
  return (
    <div>
      {a}
      {b}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

export default function MatchExprMultiGenBindings(t0) {
  const $ = _c(3);
  const { x, y } = t0;

  const a = _temp(x?.v);

  const b = _temp2(y?.w);
  let t1;
  if ($[0] !== a || $[1] !== b) {
    t1 = (
      <div>
        {a}
        {b}
      </div>
    );
    $[0] = a;
    $[1] = b;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}
function _temp2($$gen$m1) {
  if ($$gen$m1 === 42) {
    return "found";
  }
  return "not found";
}
function _temp($$gen$m0) {
  if ($$gen$m0 === "yes") {
    return 1;
  }
  return 0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
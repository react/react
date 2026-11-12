
## Input

```javascript
// Constant propagation can produce NaN/Infinity from arithmetic.
// These must be emitted as Identifier("NaN")/Identifier("Infinity"),
// not NumericLiteral(NaN) which serializes to null in JSON.

function Component({x}) {
  const nan = 0 / 0;
  const inf = 1 / 0;
  const negInf = -1 / 0;
  return (
    <div>
      {x ? nan : inf}
      {negInf}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Constant propagation can produce NaN/Infinity from arithmetic.
// These must be emitted as Identifier("NaN")/Identifier("Infinity"),
// not NumericLiteral(NaN) which serializes to null in JSON.

function Component(t0) {
  const $ = _c(2);
  const { x } = t0;

  const t1 = x ? NaN : Infinity;
  let t2;
  if ($[0] !== t1) {
    t2 = (
      <div>
        {t1}
        {-Infinity}
      </div>
    );
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: true }],
};

```
      
### Eval output
(kind: ok) <div>NaN-Infinity</div>
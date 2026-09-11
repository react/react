
## Input

```javascript
function Component({sign}) {
  let x;
  if (sign) {
    x = 0;
  } else {
    x = -0;
  }
  // `1 / x` reveals the sign of zero: `Infinity` for `0`, `-Infinity` for
  // `-0`. This lets us assert (via the eval fixture harness comparing the
  // compiled and uncompiled output) that Object.is(x, -0) parity is
  // preserved through the compiler's constant propagation and codegen.
  return <div>{`1/x=${1 / x}`}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{sign: true}],
  sequentialRenders: [
    {sign: true},
    {sign: false},
    {sign: false},
    {sign: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(2);
  const { sign } = t0;
  let x;
  if (sign) {
    x = 0;
  } else {
    x = -0;
  }

  const t1 = `1/x=${1 / x}`;
  let t2;
  if ($[0] !== t1) {
    t2 = <div>{t1}</div>;
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ sign: true }],
  sequentialRenders: [
    { sign: true },
    { sign: false },
    { sign: false },
    { sign: true },
  ],
};

```
      
### Eval output
(kind: ok) <div>1/x=Infinity</div>
<div>1/x=-Infinity</div>
<div>1/x=-Infinity</div>
<div>1/x=Infinity</div>
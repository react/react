
## Input

```javascript
// @compilationMode:"annotation"
'use memo';

function Component({a, b}) {
  return <div>{a + b}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 2}],
};

```

## Code

```javascript
// @compilationMode:"annotation"
"use memo";
import { c as _c } from "react/compiler-runtime";

function Component(t0) {
  const $ = _c(2);
  const { a, b } = t0;
  const t1 = a + b;
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
  params: [{ a: 1, b: 2 }],
};

```
      
### Eval output
(kind: ok) <div>3</div>
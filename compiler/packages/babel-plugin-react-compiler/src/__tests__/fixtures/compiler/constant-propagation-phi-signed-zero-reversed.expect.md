
## Input

```javascript
function Component({condition}) {
  let value;
  if (condition) {
    value = -0;
  } else {
    value = 0;
  }
  return <div>{1 / value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{condition: true}],
  sequentialRenders: [{condition: true}, {condition: false}, {condition: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(2);
  const { condition } = t0;
  let value;
  if (condition) {
    value = -0;
  } else {
    value = 0;
  }

  const t1 = 1 / value;
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
  params: [{ condition: true }],
  sequentialRenders: [
    { condition: true },
    { condition: false },
    { condition: true },
  ],
};

```
      
### Eval output
(kind: ok) <div>-Infinity</div>
<div>Infinity</div>
<div>-Infinity</div>
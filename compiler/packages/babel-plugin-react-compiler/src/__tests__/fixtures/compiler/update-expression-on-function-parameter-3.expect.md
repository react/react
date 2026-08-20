
## Input

```javascript
function Component({c}) {
  let h = c++;
  let i = --c;
  return [c, h, i];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{c: 4}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(4);
  let { c } = t0;
  const h = c++;
  const i = --c;
  let t1;
  if ($[0] !== c || $[1] !== h || $[2] !== i) {
    t1 = [c, h, i];
    $[0] = c;
    $[1] = h;
    $[2] = i;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ c: 4 }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [4,4,4]
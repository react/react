
## Input

```javascript
function Component({a = 1}) {
  return <div>{a}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(2);
  const { a: t1 } = t0;
  const a = t1 === undefined ? 1 : t1;
  let t2;
  if ($[0] !== a) {
    t2 = <div>{a}</div>;
    $[0] = a;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div>1</div>
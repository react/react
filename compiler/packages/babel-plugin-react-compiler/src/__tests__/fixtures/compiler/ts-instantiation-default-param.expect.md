
## Input

```javascript
function id<T>(x: T): T {
  return x;
}

export function Component<T = string>({fn = id<T>}: {fn?: (x: T) => T}) {
  const value = fn('hi' as T);
  return <div>{String(value)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function id(x) {
  return x;
}

export function Component(t0) {
  const $ = _c(4);
  const { fn: t1 } = t0;
  const fn = t1 === undefined ? id : t1;
  let t2;
  if ($[0] !== fn) {
    t2 = fn("hi" as T);
    $[0] = fn;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const value = t2;
  const t3 = String(value);
  let t4;
  if ($[2] !== t3) {
    t4 = <div>{t3}</div>;
    $[2] = t3;
    $[3] = t4;
  } else {
    t4 = $[3];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>hi</div>
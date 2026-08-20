
## Input

```javascript
function foo(a, b, c) {
  let d, g, n, o;
  [
    d,
    [
      {
        e: {f: g},
      },
    ],
  ] = a;
  ({
    l: {
      m: [[n]],
    },
    o,
  } = b);
  return {d, g, n, o};
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(a, b, c) {
  const $ = _c(5);
  let d;
  let g;
  let n;
  let o;
  const [t0, t1] = a;
  d = t0;
  const [t2] = t1;
  const { e: t3 } = t2;
  ({ f: g } = t3);
  const { l: t4, o: t5 } = b;
  const { m: t6 } = t4;
  const [t7] = t6;
  [n] = t7;
  o = t5;
  let t8;
  if ($[0] !== d || $[1] !== g || $[2] !== n || $[3] !== o) {
    t8 = { d, g, n, o };
    $[0] = d;
    $[1] = g;
    $[2] = n;
    $[3] = o;
    $[4] = t8;
  } else {
    t8 = $[4];
  }
  return t8;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      

## Input

```javascript
function Foo({obj}) {
  const keys = [];
  try {
    for (const key in obj) {
      keys.push(key);
    }
  } catch (e) {
    return <span>Error</span>;
  }
  return <span>{keys.join(', ')}</span>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{obj: {a: 1, b: 2}}],
  sequentialRenders: [
    {obj: {a: 1, b: 2}},
    {obj: {a: 1, b: 2}},
    {obj: {x: 'hello', y: 'world'}},
    {obj: {}},
    {obj: {single: 'value'}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo(t0) {
  const $ = _c(6);
  const { obj } = t0;
  let keys;
  let t1;
  if ($[0] !== obj) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      keys = [];
      try {
        for (const key in obj) {
          keys.push(key);
        }
      } catch (t2) {
        let t3;
        if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
          t3 = <span>Error</span>;
          $[3] = t3;
        } else {
          t3 = $[3];
        }
        t1 = t3;
        break bb0;
      }
    }
    $[0] = obj;
    $[1] = keys;
    $[2] = t1;
  } else {
    keys = $[1];
    t1 = $[2];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }

  const t2 = keys.join(", ");
  let t3;
  if ($[4] !== t2) {
    t3 = <span>{t2}</span>;
    $[4] = t2;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ obj: { a: 1, b: 2 } }],
  sequentialRenders: [
    { obj: { a: 1, b: 2 } },
    { obj: { a: 1, b: 2 } },
    { obj: { x: "hello", y: "world" } },
    { obj: {} },
    { obj: { single: "value" } },
  ],
};

```
      
### Eval output
(kind: ok) <span>a, b</span>
<span>a, b</span>
<span>x, y</span>
<span></span>
<span>single</span>
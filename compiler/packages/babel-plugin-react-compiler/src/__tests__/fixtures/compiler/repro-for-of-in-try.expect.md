
## Input

```javascript
function Foo({obj}) {
  const items = [];
  try {
    for (const [key, value] of Object.entries(obj)) {
      items.push(`${key}: ${value}`);
    }
  } catch (e) {
    return <span>Error</span>;
  }
  return <span>{items.join(', ')}</span>;
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
  let items;
  let t1;
  if ($[0] !== obj) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      items = [];
      try {
        for (const [key, value] of Object.entries(obj)) {
          items.push(`${key}: ${value}`);
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
    $[1] = items;
    $[2] = t1;
  } else {
    items = $[1];
    t1 = $[2];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }

  const t2 = items.join(", ");
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
(kind: ok) <span>a: 1, b: 2</span>
<span>a: 1, b: 2</span>
<span>x: hello, y: world</span>
<span></span>
<span>single: value</span>
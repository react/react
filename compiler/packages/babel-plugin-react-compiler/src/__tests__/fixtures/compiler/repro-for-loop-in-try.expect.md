
## Input

```javascript
function Foo({items}) {
  const results = [];
  try {
    for (let i = 0; i < items.length; i++) {
      results.push(items[i]);
    }
  } catch (e) {
    return <span>Error</span>;
  }
  return <span>{results.join(', ')}</span>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{items: ['a', 'b', 'c']}],
  sequentialRenders: [
    {items: ['a', 'b', 'c']},
    {items: ['a', 'b', 'c']},
    {items: ['x', 'y']},
    {items: []},
    {items: ['single']},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo(t0) {
  const $ = _c(5);
  const { items } = t0;
  let results;
  let t1;
  if ($[0] !== items) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      results = [];
      try {
        for (let i = 0; i < items.length; i++) {
          results.push(items[i]);
        }
      } catch (t2) {
        t1 = <span>Error</span>;
        break bb0;
      }
    }
    $[0] = items;
    $[1] = results;
    $[2] = t1;
  } else {
    results = $[1];
    t1 = $[2];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }

  const t2 = results.join(", ");
  let t3;
  if ($[3] !== t2) {
    t3 = <span>{t2}</span>;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ items: ["a", "b", "c"] }],
  sequentialRenders: [
    { items: ["a", "b", "c"] },
    { items: ["a", "b", "c"] },
    { items: ["x", "y"] },
    { items: [] },
    { items: ["single"] },
  ],
};

```
      
### Eval output
(kind: ok) <span>a, b, c</span>
<span>a, b, c</span>
<span>x, y</span>
<span></span>
<span>single</span>
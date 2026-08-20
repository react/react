
## Input

```javascript
function Component({a, b, cond, items}) {
  try {
    const x = a?.value;
    // items.length is accessed WITHIN the ternary expression - throws if items is null
    const y = cond ? b?.first : items.length;
    const z = x && y;
    return (
      <div>
        {String(x)}-{String(y)}-{String(z)}
      </div>
    );
  } catch {
    return <div>error</div>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3],
    },
  ],
  sequentialRenders: [
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3],
    },
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3],
    },
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: false,
      items: [1, 2],
    },
    {a: null, b: {first: 'B1', second: 'B2'}, cond: true, items: [1, 2, 3]},
    {a: {value: 'A'}, b: null, cond: true, items: [1, 2, 3]}, // b?.first is safe (returns undefined)
    {a: {value: 'A'}, b: {first: 'B1', second: 'B2'}, cond: false, items: null}, // errors because items.length throws when cond=false
    {
      a: {value: ''},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3, 4],
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(5);
  const { a, b, cond, items } = t0;
  try {
    const x = a?.value;

    const y = cond ? b?.first : items.length;
    const z = x && y;

    const t1 = String(x);
    const t2 = String(y);
    const t3 = String(z);
    let t4;
    if ($[0] !== t1 || $[1] !== t2 || $[2] !== t3) {
      t4 = (
        <div>
          {t1}-{t2}-{t3}
        </div>
      );
      $[0] = t1;
      $[1] = t2;
      $[2] = t3;
      $[3] = t4;
    } else {
      t4 = $[3];
    }
    return t4;
  } catch {
    let t1;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <div>error</div>;
      $[4] = t1;
    } else {
      t1 = $[4];
    }
    return t1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      a: { value: "A" },
      b: { first: "B1", second: "B2" },
      cond: true,
      items: [1, 2, 3],
    },
  ],

  sequentialRenders: [
    {
      a: { value: "A" },
      b: { first: "B1", second: "B2" },
      cond: true,
      items: [1, 2, 3],
    },
    {
      a: { value: "A" },
      b: { first: "B1", second: "B2" },
      cond: true,
      items: [1, 2, 3],
    },
    {
      a: { value: "A" },
      b: { first: "B1", second: "B2" },
      cond: false,
      items: [1, 2],
    },
    { a: null, b: { first: "B1", second: "B2" }, cond: true, items: [1, 2, 3] },
    { a: { value: "A" }, b: null, cond: true, items: [1, 2, 3] }, // b?.first is safe (returns undefined)
    {
      a: { value: "A" },
      b: { first: "B1", second: "B2" },
      cond: false,
      items: null,
    }, // errors because items.length throws when cond=false
    {
      a: { value: "" },
      b: { first: "B1", second: "B2" },
      cond: true,
      items: [1, 2, 3, 4],
    },
  ],
};

```
      
### Eval output
(kind: ok) <div>A-B1-B1</div>
<div>A-B1-B1</div>
<div>A-2-2</div>
<div>undefined-B1-undefined</div>
<div>A-undefined-undefined</div>
<div>error</div>
<div>-B1-</div>
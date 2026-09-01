
## Input

```javascript
function Component({cond, obj, items}) {
  try {
    // items.length is accessed WITHIN the && expression
    const result = cond && obj?.value && items.length;
    return <div>{String(result)}</div>;
  } catch {
    return <div>error</div>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, obj: {value: 'hello'}, items: [1, 2]}],
  sequentialRenders: [
    {cond: true, obj: {value: 'hello'}, items: [1, 2]},
    {cond: true, obj: {value: 'hello'}, items: [1, 2]},
    {cond: true, obj: {value: 'world'}, items: [1, 2, 3]},
    {cond: false, obj: {value: 'hello'}, items: [1]},
    {cond: true, obj: null, items: [1]},
    {cond: true, obj: {value: 'test'}, items: null}, // errors because items.length throws WITHIN the && chain
    {cond: null, obj: {value: 'test'}, items: [1]},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(3);
  const { cond, obj, items } = t0;
  try {
    const result = cond && obj?.value && items.length;
    const t1 = String(result);
    let t2;
    if ($[0] !== t1) {
      t2 = <div>{t1}</div>;
      $[0] = t1;
      $[1] = t2;
    } else {
      t2 = $[1];
    }
    return t2;
  } catch {
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <div>error</div>;
      $[2] = t1;
    } else {
      t1 = $[2];
    }
    return t1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true, obj: { value: "hello" }, items: [1, 2] }],
  sequentialRenders: [
    { cond: true, obj: { value: "hello" }, items: [1, 2] },
    { cond: true, obj: { value: "hello" }, items: [1, 2] },
    { cond: true, obj: { value: "world" }, items: [1, 2, 3] },
    { cond: false, obj: { value: "hello" }, items: [1] },
    { cond: true, obj: null, items: [1] },
    { cond: true, obj: { value: "test" }, items: null }, // errors because items.length throws WITHIN the && chain
    { cond: null, obj: { value: "test" }, items: [1] },
  ],
};

```
      
### Eval output
(kind: ok) <div>2</div>
<div>2</div>
<div>3</div>
<div>false</div>
<div>undefined</div>
<div>error</div>
<div>null</div>

## Input

```javascript
function Component({data, fallback}) {
  try {
    // fallback.default is accessed WITHIN the optional chain via nullish coalescing
    const value = data?.nested?.deeply?.value ?? fallback.default;
    return <div>{value}</div>;
  } catch {
    return <div>error</div>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {data: {nested: {deeply: {value: 'found'}}}, fallback: {default: 'none'}},
  ],
  sequentialRenders: [
    {data: {nested: {deeply: {value: 'found'}}}, fallback: {default: 'none'}},
    {data: {nested: {deeply: {value: 'found'}}}, fallback: {default: 'none'}},
    {data: {nested: {deeply: {value: 'changed'}}}, fallback: {default: 'none'}},
    {data: {nested: {deeply: null}}, fallback: {default: 'none'}}, // uses fallback.default
    {data: {nested: null}, fallback: {default: 'none'}}, // uses fallback.default
    {data: null, fallback: null}, // errors because fallback.default throws
    {data: {nested: {deeply: {value: 42}}}, fallback: {default: 'none'}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(3);
  const { data, fallback } = t0;
  try {
    const value = data?.nested?.deeply?.value ?? fallback.default;
    let t1;
    if ($[0] !== value) {
      t1 = <div>{value}</div>;
      $[0] = value;
      $[1] = t1;
    } else {
      t1 = $[1];
    }
    return t1;
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
  params: [
    {
      data: { nested: { deeply: { value: "found" } } },
      fallback: { default: "none" },
    },
  ],

  sequentialRenders: [
    {
      data: { nested: { deeply: { value: "found" } } },
      fallback: { default: "none" },
    },
    {
      data: { nested: { deeply: { value: "found" } } },
      fallback: { default: "none" },
    },
    {
      data: { nested: { deeply: { value: "changed" } } },
      fallback: { default: "none" },
    },
    { data: { nested: { deeply: null } }, fallback: { default: "none" } }, // uses fallback.default
    { data: { nested: null }, fallback: { default: "none" } }, // uses fallback.default
    { data: null, fallback: null }, // errors because fallback.default throws
    {
      data: { nested: { deeply: { value: 42 } } },
      fallback: { default: "none" },
    },
  ],
};

```
      
### Eval output
(kind: ok) <div>found</div>
<div>found</div>
<div>changed</div>
<div>none</div>
<div>none</div>
<div>error</div>
<div>42</div>

## Input

```javascript
function Component({a, b, fallback}) {
  try {
    // fallback.value is accessed WITHIN the ?? chain
    const result = a ?? b ?? fallback.value;
    return <span>{result}</span>;
  } catch {
    return <span>error</span>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 'first', b: 'second', fallback: {value: 'default'}}],
  sequentialRenders: [
    {a: 'first', b: 'second', fallback: {value: 'default'}},
    {a: 'first', b: 'second', fallback: {value: 'default'}},
    {a: null, b: 'second', fallback: {value: 'default'}},
    {a: null, b: null, fallback: {value: 'fallback'}},
    {a: undefined, b: undefined, fallback: {value: 'fallback'}},
    {a: 0, b: 'not zero', fallback: {value: 'default'}},
    {a: null, b: null, fallback: null}, // errors because fallback.value throws WITHIN the ?? chain
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(3);
  const { a, b, fallback } = t0;
  try {
    const result = a ?? b ?? fallback.value;
    let t1;
    if ($[0] !== result) {
      t1 = <span>{result}</span>;
      $[0] = result;
      $[1] = t1;
    } else {
      t1 = $[1];
    }
    return t1;
  } catch {
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <span>error</span>;
      $[2] = t1;
    } else {
      t1 = $[2];
    }
    return t1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: "first", b: "second", fallback: { value: "default" } }],
  sequentialRenders: [
    { a: "first", b: "second", fallback: { value: "default" } },
    { a: "first", b: "second", fallback: { value: "default" } },
    { a: null, b: "second", fallback: { value: "default" } },
    { a: null, b: null, fallback: { value: "fallback" } },
    { a: undefined, b: undefined, fallback: { value: "fallback" } },
    { a: 0, b: "not zero", fallback: { value: "default" } },
    { a: null, b: null, fallback: null }, // errors because fallback.value throws WITHIN the ?? chain
  ],
};

```
      
### Eval output
(kind: ok) <span>first</span>
<span>first</span>
<span>second</span>
<span>fallback</span>
<span>fallback</span>
<span>0</span>
<span>error</span>
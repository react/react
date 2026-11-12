
## Input

```javascript
// @compilationMode:"infer"
import {useState} from 'react';
const wrap = (...x) => x[x.length - 1];
const useThing = () => 1;
const Foo = wrap(() => {
  const [s, setS] = useState(0);
  return <div onClick={() => setS(1)}>{s}</div>;
});
const Bar = wrap(useThing(), function () {
  const [s] = useState(0);
  return <span>{s}</span>;
});
const baz = wrap(() => {
  const [s] = useState(0);
  return <span>{s}</span>;
});
export const FIXTURE_ENTRYPOINT = {fn: Foo, params: [{}]};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { useState } from "react";
const wrap = (...x) => x[x.length - 1];
const useThing = () => 1;
const Foo = wrap(() => {
  const $ = _c(3);
  const [s, setS] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => setS(1);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] !== s) {
    t1 = <div onClick={t0}>{s}</div>;
    $[1] = s;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
});
const Bar = wrap(useThing(), function () {
  const $ = _c(2);
  const [s] = useState(0);
  let t0;
  if ($[0] !== s) {
    t0 = <span>{s}</span>;
    $[0] = s;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
});
const baz = wrap(() => {
  const [s] = useState(0);
  return <span>{s}</span>;
});
export const FIXTURE_ENTRYPOINT = { fn: Foo, params: [{}] };

```
      
### Eval output
(kind: ok) <div>0</div>
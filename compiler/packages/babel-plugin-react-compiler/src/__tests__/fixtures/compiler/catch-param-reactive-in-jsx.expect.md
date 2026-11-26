
## Input

```javascript
// The catch param is a source of reactivity: here the caught error depends on
// `prop` (via the TypeError message), so JSX derived from `e` must be
// recreated when `e` changes rather than memoized once and reused forever.
// The throw site is a property load, not a call, so `e` is not an alias of any
// reactive value and only becomes reactive because it is a catch binding.
function Component({obj, prop}) {
  let message = 'none';
  try {
    message = 'value:' + obj[prop];
  } catch (e) {
    message = <span>{e.message}</span>;
  }
  return <div>{message}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: null, prop: 'a'}],
  sequentialRenders: [
    {obj: null, prop: 'a'},
    {obj: null, prop: 'a'},
    {obj: null, prop: 'b'},
    {obj: {b: 'ok'}, prop: 'b'},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // The catch param is a source of reactivity: here the caught error depends on
// `prop` (via the TypeError message), so JSX derived from `e` must be
// recreated when `e` changes rather than memoized once and reused forever.
// The throw site is a property load, not a call, so `e` is not an alias of any
// reactive value and only becomes reactive because it is a catch binding.
function Component(t0) {
  const $ = _c(4);
  const { obj, prop } = t0;
  let message;
  try {
    message = "value:" + obj[prop];
  } catch (t1) {
    const e = t1;
    let t2;
    if ($[0] !== e.message) {
      t2 = <span>{e.message}</span>;
      $[0] = e.message;
      $[1] = t2;
    } else {
      t2 = $[1];
    }
    message = t2;
  }
  let t2;
  if ($[2] !== message) {
    t2 = <div>{message}</div>;
    $[2] = message;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ obj: null, prop: "a" }],
  sequentialRenders: [
    { obj: null, prop: "a" },
    { obj: null, prop: "a" },
    { obj: null, prop: "b" },
    { obj: { b: "ok" }, prop: "b" },
  ],
};

```
      
### Eval output
(kind: ok) <div><span>Cannot read properties of null (reading 'a')</span></div>
<div><span>Cannot read properties of null (reading 'a')</span></div>
<div><span>Cannot read properties of null (reading 'b')</span></div>
<div>value:ok</div>
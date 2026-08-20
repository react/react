
## Input

```javascript
function Component(props) {
  const x = {};
  let y;
  if (props.cond) {
    y = [props.value];
  } else {
    y = [];
  }
  // This should be inferred as `<store> y` s.t. `x` can still
  // be independently memoized. *But* this also must properly
  // extend the mutable range of the array literals in the
  // if/else branches
  y.push(x);

  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, value: 42}],
  sequentialRenders: [
    {cond: true, value: 3.14},
    {cond: false, value: 3.14},
    {cond: true, value: 42},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  let t1;
  if ($[1] !== props.cond || $[2] !== props.value) {
    let y;
    if (props.cond) {
      y = [props.value];
    } else {
      y = [];
    }
    y.push(x);
    t1 = [x, y];
    $[1] = props.cond;
    $[2] = props.value;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true, value: 42 }],
  sequentialRenders: [
    { cond: true, value: 3.14 },
    { cond: false, value: 3.14 },
    { cond: true, value: 42 },
  ],
};

```
      
### Eval output
(kind: ok) [{},[3.14,"[[ cyclic ref *1 ]]"]]
[{},["[[ cyclic ref *1 ]]"]]
[{},[42,"[[ cyclic ref *1 ]]"]]
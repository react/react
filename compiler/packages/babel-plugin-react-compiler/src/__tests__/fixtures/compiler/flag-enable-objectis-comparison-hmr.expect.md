
## Input

```javascript
// @enableObjectIsComparison @enableResetCacheOnSourceFileChanges
function Component(props) {
  const x = [props.x];
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 42}],
  sequentialRenders: [{x: 42}, {x: 42}, {x: 3.14}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const is = Object.is; // @enableObjectIsComparison @enableResetCacheOnSourceFileChanges
function Component(props) {
  const $ = _c(3);
  if (
    !is(
      $[0],
      "eb2ec56d8fdd083c203a119ff37576dc8782330598640f725524102ae79e8b5c",
    )
  ) {
    for (let $i = 0; $i < 3; $i += 1) {
      $[$i] = Symbol.for("react.memo_cache_sentinel");
    }
    $[0] = "eb2ec56d8fdd083c203a119ff37576dc8782330598640f725524102ae79e8b5c";
  }
  let t0;
  if (!is($[1], props.x)) {
    t0 = [props.x];
    $[1] = props.x;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  const x = t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 42 }],
  sequentialRenders: [{ x: 42 }, { x: 42 }, { x: 3.14 }],
};

```
      
### Eval output
(kind: ok) [42]
[42]
[3.14]
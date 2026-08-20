
## Input

```javascript
function Component(props) {
  const start = performance.now();
  const now = Date.now();
  const time = performance.now() - start;
  return (
    <div>
      rendering took {time} at {now}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  const start = performance.now();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = Date.now();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const now = t0;
  const time = performance.now() - start;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (
      <div>
        rendering took
        {time} at {now}
      </div>
    );
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
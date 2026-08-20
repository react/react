
## Input

```javascript
function Component(props) {
  const ref = useRef(null);
  return <Foo ref={ref} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(1);
  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Foo ref={ref} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
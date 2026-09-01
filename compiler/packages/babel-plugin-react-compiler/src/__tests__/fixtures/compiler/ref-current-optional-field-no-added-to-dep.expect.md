
## Input

```javascript
function VideoTab() {
  const ref = useRef();
  let x = () => {
    ref.current?.x;
  };

  return <VideoList videos={x} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function VideoTab() {
  const $ = _c(1);
  const ref = useRef();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = () => {
      ref.current?.x;
    };
    t0 = <VideoList videos={x} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      

## Input

```javascript
// @validateRefAccessDuringRender false
function VideoTab() {
  const ref = useRef();
  const t = ref.current;
  let x = () => {
    console.log(t);
  };

  return <VideoList videos={x} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender false
function VideoTab() {
  const $ = _c(1);
  const ref = useRef();
  const t = ref.current;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = () => {
      console.log(t);
    };
    t0 = <VideoList videos={x} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
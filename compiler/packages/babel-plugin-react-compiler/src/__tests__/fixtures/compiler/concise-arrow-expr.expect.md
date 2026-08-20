
## Input

```javascript
function component() {
  let [x, setX] = useState(0);
  const handler = v => setX(v);
  return <Foo handler={handler}></Foo>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component() {
  const $ = _c(1);
  const [, setX] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const handler = (v) => setX(v);
    t0 = <Foo handler={handler} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
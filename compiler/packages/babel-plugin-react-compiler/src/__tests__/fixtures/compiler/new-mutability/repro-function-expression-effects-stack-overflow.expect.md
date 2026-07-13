
## Input

```javascript
function Component() {
  const x = {};
  const fn = () => {
    new Object()
      .build(x)
      .build({})
      .build({})
      .build({})
      .build({})
      .build({})
      .build({});
  };
  return <Stringify x={x} fn={fn} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    const fn = () => {
      new Object()
        .build(x)
        .build({})
        .build({})
        .build({})
        .build({})
        .build({})
        .build({});
    };
    t1 = <Stringify x={x} fn={fn} />;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
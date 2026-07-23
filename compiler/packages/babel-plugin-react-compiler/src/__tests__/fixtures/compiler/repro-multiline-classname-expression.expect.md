
## Input

```javascript
function Component() {
  return (
    <div
      className={"foo\nbar"}
    >
      Hello
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div className={"foo\nbar"}>Hello</div>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
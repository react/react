
## Input

```javascript
// @enableNewMutationAliasingModel:false
function Component() {
  const foo = () => {
    someGlobal = true;
  };
  // spreading a function is weird, but it doesn't call the function so this is allowed
  return <div {...foo} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel:false
function Component() {
  const $ = _c(1);
  const foo = _temp;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div {...foo} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  someGlobal = true;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
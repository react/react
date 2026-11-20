
## Input

```javascript
let pending = 'value';

function Component() {
  const handleClick = () => {
    const copy = pending;
    pending = null;
    console.log(copy);
  };
  return <button onClick={handleClick}>Click</button>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
let pending = "value";

function Component() {
  const $ = _c(1);
  const handleClick = _temp;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <button onClick={handleClick}>Click</button>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  const copy = pending;
  pending = null;
  console.log(copy);
}

```
      
### Eval output
(kind: exception) Fixture not implemented
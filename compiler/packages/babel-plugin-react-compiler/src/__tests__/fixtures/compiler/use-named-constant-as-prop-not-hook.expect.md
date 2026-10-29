
## Input

```javascript
const useCases = ['Going to the store', 'Picking up the kids'];

function List() {
  return <Items items={useCases} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const useCases = ["Going to the store", "Picking up the kids"];

function List() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Items items={useCases} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
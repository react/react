
## Input

```javascript
// When a function with a known aliasing signature definitively mutates its
// argument (Mutate/MutateTransitive effect), the argument and result should
// remain in the same reactive scope.
import {mutate} from 'shared-runtime';

function Component(props) {
  const x = {};
  mutate(x);
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // When a function with a known aliasing signature definitively mutates its
// argument (Mutate/MutateTransitive effect), the argument and result should
// remain in the same reactive scope.
import { mutate } from "shared-runtime";

function Component(props) {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = {};
    $[0] = x;
  } else {
    x = $[0];
  }
  mutate(x);
  return x;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
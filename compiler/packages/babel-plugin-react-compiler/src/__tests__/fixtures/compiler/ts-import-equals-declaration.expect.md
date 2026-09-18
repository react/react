
## Input

```javascript
import lib = require('shared-runtime');

function useValue(value: number) {
  return lib.identity(value);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import lib = require("shared-runtime");

function useValue(value) {
  const $ = _c(2);
  let t0;
  if ($[0] !== value) {
    t0 = lib.identity(value);
    $[0] = value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
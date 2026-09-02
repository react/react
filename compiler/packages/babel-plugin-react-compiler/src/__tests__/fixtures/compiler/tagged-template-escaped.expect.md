
## Input

```javascript
function component(value) {
  return tag`line one\nline two: ${value}\t`;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(value) {
  const $ = _c(2);
  let t0;
  if ($[0] !== value) {
    t0 = tag`line one\nline two: ${value}\t`;
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
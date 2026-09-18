
## Input

```javascript
function useValue(value: number) {
  return [value + 1];
}

export = useValue;

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useValue(value) {
  const $ = _c(2);
  const t0 = value + 1;
  let t1;
  if ($[0] !== t0) {
    t1 = [t0];
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export = useValue;

```
      
### Eval output
(kind: exception) Fixture not implemented
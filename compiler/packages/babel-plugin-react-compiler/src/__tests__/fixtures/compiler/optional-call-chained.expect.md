
## Input

```javascript
function Component(props) {
  return call?.(props.a)?.(props.b)?.(props.c);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    t0 = call?.(props.a)?.(props.b)?.(props.c);
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
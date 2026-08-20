
## Input

```javascript
function component(props) {
  // NOTE: the temporary for the leading space was previously dropped
  const x = isMenuShown ? <Bar> {props.a ? props.b : props.c}</Bar> : null;
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    t0 = isMenuShown ? <Bar> {props.a ? props.b : props.c}</Bar> : null;
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  return x;
}

```
      

## Input

```javascript
function Component(props) {
  let x = [0, 1, 2, 3];
  do {
    if (x === 0) {
      break;
    }
    mutate(x);
  } while (props.cond);
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props) {
    x = [0, 1, 2, 3];
    do {
      if (x === 0) {
        break;
      }

      mutate(x);
    } while (props.cond);
    $[0] = props;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

```
      
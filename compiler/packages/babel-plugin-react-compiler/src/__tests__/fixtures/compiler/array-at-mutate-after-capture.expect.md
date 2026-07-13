
## Input

```javascript
// x's mutable range should extend to `mutate(y)`

function Component(props) {
  let x = [42, {}];
  const idx = foo(props.b);
  let y = x.at(idx);
  mutate(y);

  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // x's mutable range should extend to `mutate(y)`

function Component(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.b) {
    x = [42, {}];
    const idx = foo(props.b);
    const y = x.at(idx);
    mutate(y);
    $[0] = props.b;
    $[1] = x;
  } else {
    x = $[1];
  }

  return x;
}

```
      
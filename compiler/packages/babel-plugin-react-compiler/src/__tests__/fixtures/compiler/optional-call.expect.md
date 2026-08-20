
## Input

```javascript
function Component(props) {
  const x = makeOptionalFunction(props);
  const y = makeObject(props);
  const z = x?.(y.a, props.a, foo(y.b), bar(props.b));
  return z;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    const x = makeOptionalFunction(props);
    const y = makeObject(props);
    t0 = x?.(y.a, props.a, foo(y.b), bar(props.b));
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const z = t0;
  return z;
}

```
      
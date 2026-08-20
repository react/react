
## Input

```javascript
function Foo(props) {
  let x = bar(props.a);
  let y = x?.b;

  let z = useBar(y);
  return z;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.a) {
    t0 = bar(props.a);
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  const y = x?.b;

  const z = useBar(y);
  return z;
}

```
      
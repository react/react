
## Input

```javascript
function Component(props) {
  const x = {};
  const y = [];
  x.y = y;
  const child = <Component data={y} />;
  x.y.push(props.p0);
  return <Component data={x}>{child}</Component>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.p0) {
    const x = {};
    const y = [];
    x.y = y;
    const child = <Component data={y} />;
    x.y.push(props.p0);
    t0 = <Component data={x}>{child}</Component>;
    $[0] = props.p0;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
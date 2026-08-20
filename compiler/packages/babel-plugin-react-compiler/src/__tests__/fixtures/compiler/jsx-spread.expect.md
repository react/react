
## Input

```javascript
function Component(props) {
  return (
    <Component {...props} {...{bar: props.cond ? props.foo : props.bar}} />
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(5);

  const t0 = props.cond ? props.foo : props.bar;
  let t1;
  if ($[0] !== t0) {
    t1 = { bar: t0 };
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== props || $[3] !== t1) {
    t2 = <Component {...props} {...t1} />;
    $[2] = props;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

```
      
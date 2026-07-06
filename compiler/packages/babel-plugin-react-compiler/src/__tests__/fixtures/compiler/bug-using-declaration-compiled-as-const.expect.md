
## Input

```javascript
/**
 * `using` declarations (explicit resource management) are currently lowered
 * as plain `const`: the compiled output memoizes the resource and drops the
 * implicit `[Symbol.dispose]()` call at scope exit. The compiler should bail
 * out on this unsupported syntax instead of changing program semantics.
 */
function Component(props) {
  using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * `using` declarations (explicit resource management) are currently lowered
 * as plain `const`: the compiled output memoizes the resource and drops the
 * implicit `[Symbol.dispose]()` call at scope exit. The compiler should bail
 * out on this unsupported syntax instead of changing program semantics.
 */
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.id) {
    t0 = getResource(props.id);
    $[0] = props.id;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const resource = t0;
  let t1;
  if ($[2] !== resource.data) {
    t1 = <div>{resource.data}</div>;
    $[2] = resource.data;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      
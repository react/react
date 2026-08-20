
## Input

```javascript
async function Component(props) {
  const user = await load(props.id);
  return <div>{user.name}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
async function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.id) {
    t0 = await load(props.id);
    $[0] = props.id;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const user = t0;
  let t1;
  if ($[2] !== user.name) {
    t1 = <div>{user.name}</div>;
    $[2] = user.name;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      
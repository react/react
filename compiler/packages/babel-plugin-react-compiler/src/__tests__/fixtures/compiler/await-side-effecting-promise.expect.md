
## Input

```javascript
async function Component(props) {
  const x = [];
  await populateData(props.id, x);
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
async function Component(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.id) {
    x = [];
    await populateData(props.id, x);
    $[0] = props.id;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

```
      
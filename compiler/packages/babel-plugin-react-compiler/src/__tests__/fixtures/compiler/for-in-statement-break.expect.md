
## Input

```javascript
function Component(props) {
  let x;
  const object = {...props.value};
  for (const y in object) {
    if (y === 'break') {
      break;
    }
    x = object[y];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  // should return 'a'
  params: [{a: 'a', break: null, c: 'C!'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.value) {
    const object = { ...props.value };
    for (const y in object) {
      if (y === "break") {
        break;
      }

      x = object[y];
    }
    $[0] = props.value;
    $[1] = x;
  } else {
    x = $[1];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  // should return 'a'
  params: [{ a: "a", break: null, c: "C!" }],
};

```
      
### Eval output
(kind: ok) 
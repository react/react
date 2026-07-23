
## Input

```javascript
function Component(props) {
  const computedKey = props.computedKey;
  return {
    [computedKey]() {
      return props.value;
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{computedKey: 'readValue', value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(3);
  const computedKey = props.computedKey;
  let t0;
  if ($[0] !== computedKey || $[1] !== props.value) {
    t0 = {
      [computedKey]() {
        return props.value;
      },
    };
    $[0] = computedKey;
    $[1] = props.value;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ computedKey: "readValue", value: 42 }],
};

```
      
### Eval output
(kind: ok) {"readValue":"[[ function params=0 ]]"}
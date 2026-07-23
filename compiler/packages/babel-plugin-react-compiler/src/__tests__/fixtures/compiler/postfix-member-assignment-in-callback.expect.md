
## Input

```javascript
function Component(props) {
  const agg = {itemCounter: props.start};
  const next = () => {
    const count = agg.itemCounter++;
    return count;
  };
  return [next(), agg.itemCounter];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{start: 1}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(6);
  let agg;
  let t0;
  if ($[0] !== props.start) {
    agg = { itemCounter: props.start };
    const next = () => {
      const t0 = agg.itemCounter;
      agg.itemCounter = t0 + 1;
      const count = t0;
      return count;
    };
    t0 = next();
    $[0] = props.start;
    $[1] = agg;
    $[2] = t0;
  } else {
    agg = $[1];
    t0 = $[2];
  }
  let t1;
  if ($[3] !== agg.itemCounter || $[4] !== t0) {
    t1 = [t0, agg.itemCounter];
    $[3] = agg.itemCounter;
    $[4] = t0;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ start: 1 }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [1,2]
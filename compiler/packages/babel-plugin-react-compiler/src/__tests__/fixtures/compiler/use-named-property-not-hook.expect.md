
## Input

```javascript
function Component(props) {
  const useItems = props.items;
  const a = useItems.map(x => x);
  const b = props.useItems.map(x => x);
  const c = props.cond ? props.useItems.map(x => x) : null;
  return (
    <div>
      {a}
      {b}
      {c}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(11);
  const useItems = props.items;
  let t0;
  if ($[0] !== useItems) {
    t0 = useItems.map(_temp);
    $[0] = useItems;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const a = t0;
  let t1;
  if ($[2] !== props.useItems) {
    t1 = props.useItems.map(_temp2);
    $[2] = props.useItems;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const b = t1;
  let t2;
  if ($[4] !== props.cond || $[5] !== props.useItems) {
    t2 = props.cond ? props.useItems.map(_temp3) : null;
    $[4] = props.cond;
    $[5] = props.useItems;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  const c = t2;
  let t3;
  if ($[7] !== a || $[8] !== b || $[9] !== c) {
    t3 = (
      <div>
        {a}
        {b}
        {c}
      </div>
    );
    $[7] = a;
    $[8] = b;
    $[9] = c;
    $[10] = t3;
  } else {
    t3 = $[10];
  }
  return t3;
}
function _temp3(x_1) {
  return x_1;
}
function _temp2(x_0) {
  return x_0;
}
function _temp(x) {
  return x;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
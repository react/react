
## Input

```javascript
function useFoo(props: {
  x?: string;
  y?: string;
  z?: string;
  doDestructure: boolean;
}) {
  let x = null;
  let y = null;
  let z = null;
  const myList = [];
  if (props.doDestructure) {
    ({x, y, z} = props);

    myList.push(z);
  }
  return {
    x,
    y,
    myList,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{x: 'hello', y: 'world', doDestructure: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useFoo(props) {
  const $ = _c(9);

  let x = null;
  let y = null;
  let z;
  let myList;
  if ($[0] !== props) {
    myList = [];
    if (props.doDestructure) {
      ({ x, y, z } = props);

      myList.push(z);
    }
    $[0] = props;
    $[1] = myList;
    $[2] = x;
    $[3] = y;
    $[4] = z;
  } else {
    myList = $[1];
    x = $[2];
    y = $[3];
    z = $[4];
  }
  let t0;
  if ($[5] !== myList || $[6] !== x || $[7] !== y) {
    t0 = { x, y, myList };
    $[5] = myList;
    $[6] = x;
    $[7] = y;
    $[8] = t0;
  } else {
    t0 = $[8];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ x: "hello", y: "world", doDestructure: true }],
};

```
      
### Eval output
(kind: ok) {"x":"hello","y":"world","myList":[null]}
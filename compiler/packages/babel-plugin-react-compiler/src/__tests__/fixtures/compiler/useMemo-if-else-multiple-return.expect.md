
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => {
    if (props.cond) {
      return makeObject(props.a);
    }
    return makeObject(props.b);
  });
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const $ = _c(4);
  let t0;
  bb0: {
    if (props.cond) {
      let t1;
      if ($[0] !== props.a) {
        t1 = makeObject(props.a);
        $[0] = props.a;
        $[1] = t1;
      } else {
        t1 = $[1];
      }
      t0 = t1;
      break bb0;
    }
    let t1;
    if ($[2] !== props.b) {
      t1 = makeObject(props.b);
      $[2] = props.b;
      $[3] = t1;
    } else {
      t1 = $[3];
    }
    t0 = t1;
  }
  const x = t0;

  return x;
}

```
      
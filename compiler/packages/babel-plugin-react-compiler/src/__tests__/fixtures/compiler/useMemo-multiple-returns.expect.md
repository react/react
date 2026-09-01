
## Input

```javascript
// @validateNoVoidUseMemo
function Component({items}) {
  const value = useMemo(() => {
    for (let item of items) {
      if (item.match) return item;
    }
    return null;
  }, [items]);
  return <div>{value}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoVoidUseMemo
function Component(t0) {
  const $ = _c(2);
  const { items } = t0;
  let t1;
  bb0: {
    for (const item of items) {
      if (item.match) {
        t1 = item;
        break bb0;
      }
    }

    t1 = null;
  }
  const value = t1;
  let t2;
  if ($[0] !== value) {
    t2 = <div>{value}</div>;
    $[0] = value;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
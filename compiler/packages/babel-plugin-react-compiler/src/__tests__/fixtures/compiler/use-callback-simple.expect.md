
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
function component() {
  const [count, setCount] = useState(0);
  const increment = useCallback(() => setCount(count + 1));

  return <Foo onClick={increment}></Foo>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies:false
function component() {
  const $ = _c(4);
  const [count, setCount] = useState(0);
  let t0;
  if ($[0] !== count) {
    t0 = () => setCount(count + 1);
    $[0] = count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const increment = t0;
  let t1;
  if ($[2] !== increment) {
    t1 = <Foo onClick={increment} />;
    $[2] = increment;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      
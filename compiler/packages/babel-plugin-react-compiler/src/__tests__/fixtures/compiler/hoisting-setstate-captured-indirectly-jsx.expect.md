
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
function useFoo() {
  const onClick = response => {
    setState(DISABLED_FORM);
  };

  const [state, setState] = useState();
  const handleLogout = useCallback(() => {
    setState(DISABLED_FORM);
  }, [setState]);
  const getComponent = () => {
    return <ColumnItem onPress={() => handleLogout()} />;
  };

  // this `getComponent` call should not be inferred as mutating setState
  return [getComponent(), onClick]; // pass onClick to avoid dce
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
function useFoo() {
  const $ = _c(4);
  const onClick = (response) => {
    setState(DISABLED_FORM);
  };

  const [, t0] = useState();
  const setState = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      setState(DISABLED_FORM);
    };
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  setState;
  const handleLogout = t1;
  let t2;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    const getComponent = () => <ColumnItem onPress={() => handleLogout()} />;
    t2 = getComponent();
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  let t3;
  if ($[2] !== onClick) {
    t3 = [t2, onClick];
    $[2] = onClick;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
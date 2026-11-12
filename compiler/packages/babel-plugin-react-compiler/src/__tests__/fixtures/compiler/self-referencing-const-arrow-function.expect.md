
## Input

```javascript
function Component(props) {
  useEffect(() => {
    const pathMap = new Map();
    const collectPaths = obj => {
      if (obj != null && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach(item => collectPaths(item));
        } else {
          Object.values(obj).forEach(value => collectPaths(value));
        }
      }
    };
    collectPaths(props.data);
  }, [props.data]);
  return <div />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  let t1;
  if ($[0] !== props.data) {
    t0 = () => {
      new Map();
      const collectPaths = (obj) => {
        if (obj != null && typeof obj === "object") {
          if (Array.isArray(obj)) {
            obj.forEach((item) => collectPaths(item));
          } else {
            Object.values(obj).forEach((value) => collectPaths(value));
          }
        }
      };
      collectPaths(props.data);
    };
    t1 = [props.data];
    $[0] = props.data;
    $[1] = t0;
    $[2] = t1;
  } else {
    t0 = $[1];
    t1 = $[2];
  }
  useEffect(t0, t1);
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <div />;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
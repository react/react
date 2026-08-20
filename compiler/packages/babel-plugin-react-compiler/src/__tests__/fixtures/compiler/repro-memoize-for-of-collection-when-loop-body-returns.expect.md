
## Input

```javascript
function useHook(nodeID, condition) {
  const graph = useContext(GraphContext);
  const node = nodeID != null ? graph[nodeID] : null;

  for (const key of Object.keys(node?.fields ?? {})) {
    if (condition) {
      return new Class(node.fields?.[field]);
    }
  }
  return new Class();
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useHook(nodeID, condition) {
  const $ = _c(7);
  const graph = useContext(GraphContext);
  const node = nodeID != null ? graph[nodeID] : null;
  let t0;
  if ($[0] !== node?.fields) {
    t0 = Object.keys(node?.fields ?? {});
    $[0] = node?.fields;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== condition || $[3] !== node || $[4] !== t0) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: for (const key of t0) {
      if (condition) {
        t1 = new Class(node.fields?.[field]);
        break bb0;
      }
    }
    $[2] = condition;
    $[3] = node;
    $[4] = t0;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }
  let t2;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = new Class();
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
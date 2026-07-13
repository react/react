
## Input

```javascript
function useHook(nodeID, condition) {
  const graph = useContext(GraphContext);
  const node = nodeID != null ? graph[nodeID] : null;

  // (2) Instead we can create a scope around the loop since the loop produces an escaping value
  let value;
  for (const key of Object.keys(node?.fields ?? {})) {
    if (condition) {
      // (1) We currently create a scope just for this instruction, then later prune the scope because
      // it's inside a loop
      value = new Class(node.fields?.[field]);
      break;
    }
  }
  return value;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useHook(nodeID, condition) {
  const $ = _c(6);
  const graph = useContext(GraphContext);
  const node = nodeID != null ? graph[nodeID] : null;

  let value;
  let t0;
  if ($[0] !== node?.fields) {
    t0 = Object.keys(node?.fields ?? {});
    $[0] = node?.fields;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  if ($[2] !== condition || $[3] !== node || $[4] !== t0) {
    for (const key of t0) {
      if (condition) {
        value = new Class(node.fields?.[field]);
        break;
      }
    }
    $[2] = condition;
    $[3] = node;
    $[4] = t0;
    $[5] = value;
  } else {
    value = $[5];
  }

  return value;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
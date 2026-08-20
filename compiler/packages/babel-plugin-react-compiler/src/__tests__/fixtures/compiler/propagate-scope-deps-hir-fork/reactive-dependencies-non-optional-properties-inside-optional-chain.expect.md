
## Input

```javascript
// @enablePropagateDepsInHIR
function Component(props) {
  return props.post.feedback.comments?.edges?.map(render);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.post.feedback.comments?.edges) {
    t0 = props.post.feedback.comments?.edges?.map(render);
    $[0] = props.post.feedback.comments?.edges;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
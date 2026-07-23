
## Input

```javascript
// @validateRefAccessDuringRender @compilationMode:"infer"
function TextArea(props) {
  return <TextInput ref={props.ref} type="body" />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender @compilationMode:"infer"
function TextArea(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.ref) {
    t0 = <TextInput ref={props.ref} type="body" />;
    $[0] = props.ref;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
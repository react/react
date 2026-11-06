
## Input

```javascript
function Component(props) {
  return <div ref={props.myRef} className={props.className} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.className || $[1] !== props.myRef) {
    t0 = <div ref={props.myRef} className={props.className} />;
    $[0] = props.className;
    $[1] = props.myRef;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
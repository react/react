
## Input

```javascript
function Component(props) {
  function hasErrors() {
    let hasErrors = false;
    if (props.items == null) {
      hasErrors = true;
    }
    return hasErrors;
  }
  return hasErrors();
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.items) {
    t0 = function hasErrors() {
      let hasErrors = false;
      if (props.items == null) {
        hasErrors = true;
      }

      return hasErrors;
    };
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const hasErrors_0 = t0;

  return hasErrors_0();
}

```
      
### Eval output
(kind: exception) Fixture not implemented
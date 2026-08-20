
## Input

```javascript
function Component(props) {
  return () => {
    let str;
    if (arguments.length) {
      str = arguments[0];
    } else {
      str = props.str;
    }
    global.log(str);
  };
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    t0 = () => {
      let str;
      if (arguments.length) {
        str = arguments[0];
      } else {
        str = props.str;
      }

      global.log(str);
    };
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
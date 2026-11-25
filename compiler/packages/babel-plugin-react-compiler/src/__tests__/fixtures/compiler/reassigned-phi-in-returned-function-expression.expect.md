
## Input

```javascript
function Component(props, ...args) {
  return () => {
    let str;
    if (args.length) {
      str = args[0];
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
function Component(props, ...t0) {
  const $ = _c(3);
  const args = t0;
  let t1;
  if ($[0] !== args || $[1] !== props) {
    t1 = () => {
      let str;
      if (args.length) {
        str = args[0];
      } else {
        str = props.str;
      }

      global.log(str);
    };
    $[0] = args;
    $[1] = props;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      
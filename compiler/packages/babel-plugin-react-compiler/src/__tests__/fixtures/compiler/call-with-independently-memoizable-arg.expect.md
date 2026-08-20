
## Input

```javascript
function Component(props) {
  const x = makeFunction(props);
  const y = x(
    <div>
      <span>{props.text}</span>
    </div>
  );
  return y;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props) {
    const x = makeFunction(props);
    let t1;
    if ($[2] !== props.text) {
      t1 = (
        <div>
          <span>{props.text}</span>
        </div>
      );
      $[2] = props.text;
      $[3] = t1;
    } else {
      t1 = $[3];
    }
    t0 = x(t1);
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const y = t0;
  return y;
}

```
      
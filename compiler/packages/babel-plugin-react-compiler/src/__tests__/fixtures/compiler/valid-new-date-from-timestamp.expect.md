
## Input

```javascript
// @validateNoImpureFunctionsInRender

function Component({timestamp}) {
  const date = new Date(timestamp);
  return <Foo date={date} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoImpureFunctionsInRender

function Component(t0) {
  const $ = _c(4);
  const { timestamp } = t0;
  let t1;
  if ($[0] !== timestamp) {
    t1 = new Date(timestamp);
    $[0] = timestamp;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const date = t1;
  let t2;
  if ($[2] !== date) {
    t2 = <Foo date={date} />;
    $[2] = date;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
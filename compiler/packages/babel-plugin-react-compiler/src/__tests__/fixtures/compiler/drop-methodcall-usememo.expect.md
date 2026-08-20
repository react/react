
## Input

```javascript
import * as React from 'react';

function Component(props) {
  const x = React.useMemo(() => {
    const x = [];
    x.push(props.value);
    return x;
  }, [props.value]);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import * as React from "react";

function Component(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.value) {
    x = [];
    x.push(props.value);
    $[0] = props.value;
    $[1] = x;
  } else {
    x = $[1];
  }
  const x_0 = x;

  return x_0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) [42]
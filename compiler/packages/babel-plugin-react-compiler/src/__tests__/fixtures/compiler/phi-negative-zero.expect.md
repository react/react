
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component(props) {
  let value;
  if (props.neg) {
    value = -0;
  } else {
    value = 0;
  }
  return <Stringify recip={String(1 / value)} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{neg: false}],
  sequentialRenders: [{neg: false}, {neg: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  let value;
  if (props.neg) {
    value = -0;
  } else {
    value = 0;
  }

  const t0 = String(1 / value);
  let t1;
  if ($[0] !== t0) {
    t1 = <Stringify recip={t0} />;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ neg: false }],
  sequentialRenders: [{ neg: false }, { neg: true }],
};

```
      
### Eval output
(kind: ok) <div>{"recip":"Infinity"}</div>
<div>{"recip":"-Infinity"}</div>
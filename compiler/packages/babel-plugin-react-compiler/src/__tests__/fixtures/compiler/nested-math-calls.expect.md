
## Input

```javascript
import {identity} from 'shared-runtime';

function Component({value}) {
  const x = identity(value);
  return <div>{Math.floor(Math.abs(x))}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: -2.5}],
  sequentialRenders: [{value: -2.5}, {value: -2.5}, {value: 3.7}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    const x = identity(value);
    t1 = Math.floor(Math.abs(x));
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== t1) {
    t2 = <div>{t1}</div>;
    $[2] = t1;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: -2.5 }],
  sequentialRenders: [{ value: -2.5 }, { value: -2.5 }, { value: 3.7 }],
};

```
      
### Eval output
(kind: ok) <div>2</div>
<div>2</div>
<div>3</div>

## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({count}) {
  let a = 0;
  const items = [];
  for (let i = 0; i < count; i++) {
    a = a + 1;
    items.push(a);
  }
  return <Stringify items={items} a={a} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 2}],
  sequentialRenders: [{count: 2}, {count: 2}, {count: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(2);
  const { count } = t0;
  let t1;
  if ($[0] !== count) {
    let a = 0;
    const items = [];
    for (let i = 0; i < count; i++) {
      a = a + 1;
      items.push(a);
    }
    t1 = <Stringify items={items} a={a} />;
    $[0] = count;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ count: 2 }],
  sequentialRenders: [{ count: 2 }, { count: 2 }, { count: 3 }],
};

```
      
### Eval output
(kind: ok) <div>{"items":[1,2],"a":2}</div>
<div>{"items":[1,2],"a":2}</div>
<div>{"items":[1,2,3],"a":3}</div>
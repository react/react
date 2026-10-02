
## Input

```javascript
import {identity, Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number} | null}) {
  const id = identity(data!.id);
  return <Stringify id={id} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: {id: 1}}],
  sequentialRenders: [{data: {id: 1}}, {data: {id: 2}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { data } = t0;
  const t1 = data!;
  let t2;
  if ($[0] !== t1.id) {
    t2 = identity(t1.id);
    $[0] = t1.id;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const id = t2;
  let t3;
  if ($[2] !== id) {
    t3 = <Stringify id={id} />;
    $[2] = id;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ data: { id: 1 } }],
  sequentialRenders: [{ data: { id: 1 } }, { data: { id: 2 } }],
};

```
      
### Eval output
(kind: ok) <div>{"id":1}</div>
<div>{"id":2}</div>
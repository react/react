
## Input

```javascript
import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number} | null}) {
  const onClick = useCallback(() => data!.id, [data]);
  return data ? <Stringify onClick={onClick} /> : 'empty';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: null}],
  sequentialRenders: [{data: null}, {data: {id: 1}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useCallback } from "react";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(5);
  const { data } = t0;
  let t1;
  if ($[0] !== data) {
    t1 = () => data!.id;
    $[0] = data;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const onClick = t1;
  let t2;
  if ($[2] !== data || $[3] !== onClick) {
    t2 = data ? <Stringify onClick={onClick} /> : "empty";
    $[2] = data;
    $[3] = onClick;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ data: null }],
  sequentialRenders: [{ data: null }, { data: { id: 1 } }],
};

```
      
### Eval output
(kind: ok) "empty"
<div>{"onClick":"[[ function params=0 ]]"}</div>
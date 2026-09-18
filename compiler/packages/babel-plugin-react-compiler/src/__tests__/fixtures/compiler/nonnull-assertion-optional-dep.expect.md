
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({data}: {data: {id: number} | null}) {
  const handleClick = () => {
    console.log(data!.id);
  };
  return <div>{data ? <Stringify onClick={handleClick} /> : 'empty'}</div>;
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
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(7);
  const { data } = t0;
  let t1;
  if ($[0] !== data) {
    t1 = () => {
      console.log(data!.id);
    };
    $[0] = data;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const handleClick = t1;
  let t2;
  if ($[2] !== data || $[3] !== handleClick) {
    t2 = data ? <Stringify onClick={handleClick} /> : "empty";
    $[2] = data;
    $[3] = handleClick;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== t2) {
    t3 = <div>{t2}</div>;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ data: null }],
  sequentialRenders: [{ data: null }, { data: { id: 1 } }],
};

```
      
### Eval output
(kind: ok) <div>empty</div>
<div><div>{"onClick":"[[ function params=0 ]]"}</div></div>
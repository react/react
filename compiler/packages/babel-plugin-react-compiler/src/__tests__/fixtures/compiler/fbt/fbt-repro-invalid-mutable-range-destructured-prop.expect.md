
## Input

```javascript
import {fbt} from 'fbt';
import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({data}) {
  const el = useMemo(
    () => (
      <fbt desc="user name">
        <fbt:param name="name">{data.name ?? ''}</fbt:param>
      </fbt>
    ),
    [data.name]
  );
  return <ValidateMemoization inputs={[data.name]} output={el} />;
}

const props1 = {data: {name: 'Mike'}};
const props2 = {data: {name: 'Mofei'}};
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [props1],
  sequentialRenders: [props1, props2, props2, props1, {...props1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { fbt } from "fbt";
import { useMemo } from "react";
import { ValidateMemoization } from "shared-runtime";

function Component(t0) {
  const $ = _c(7);
  const { data } = t0;
  let t1;
  if ($[0] !== data.name) {
    t1 = fbt._("{name}", [fbt._param("name", data.name ?? "")], {
      hk: "csQUH",
    });
    $[0] = data.name;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const el = t1;
  let t2;
  if ($[2] !== data.name) {
    t2 = [data.name];
    $[2] = data.name;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== el || $[5] !== t2) {
    t3 = <ValidateMemoization inputs={t2} output={el} />;
    $[4] = el;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

const props1 = { data: { name: "Mike" } };
const props2 = { data: { name: "Mofei" } };
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [props1],
  sequentialRenders: [props1, props2, props2, props1, { ...props1 }],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":["Mike"],"output":"Mike"}</div>
<div>{"inputs":["Mofei"],"output":"Mofei"}</div>
<div>{"inputs":["Mofei"],"output":"Mofei"}</div>
<div>{"inputs":["Mike"],"output":"Mike"}</div>
<div>{"inputs":["Mike"],"output":"Mike"}</div>
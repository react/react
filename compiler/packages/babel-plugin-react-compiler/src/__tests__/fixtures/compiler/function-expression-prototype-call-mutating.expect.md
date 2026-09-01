
## Input

```javascript
import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component(props) {
  const a = useMemo(() => {
    const a = [];
    const f = function () {
      a.push(props.name);
    };
    f.call();
    return a;
  }, [props.name]);
  return <ValidateMemoization inputs={[props.name]} output={a} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Jason'}],
  sequentialRenders: [{name: 'Lauren'}, {name: 'Lauren'}, {name: 'Jason'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { ValidateMemoization } from "shared-runtime";

function Component(props) {
  const $ = _c(7);
  let a;
  if ($[0] !== props.name) {
    a = [];
    const f = function () {
      a.push(props.name);
    };

    f.call();
    $[0] = props.name;
    $[1] = a;
  } else {
    a = $[1];
  }
  const a_0 = a;
  let t0;
  if ($[2] !== props.name) {
    t0 = [props.name];
    $[2] = props.name;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  let t1;
  if ($[4] !== a_0 || $[5] !== t0) {
    t1 = <ValidateMemoization inputs={t0} output={a_0} />;
    $[4] = a_0;
    $[5] = t0;
    $[6] = t1;
  } else {
    t1 = $[6];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Jason" }],
  sequentialRenders: [
    { name: "Lauren" },
    { name: "Lauren" },
    { name: "Jason" },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":["Lauren"],"output":["Lauren"]}</div>
<div>{"inputs":["Lauren"],"output":["Lauren"]}</div>
<div>{"inputs":["Jason"],"output":["Jason"]}</div>
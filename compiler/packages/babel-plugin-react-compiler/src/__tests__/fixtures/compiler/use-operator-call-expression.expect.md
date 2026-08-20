
## Input

```javascript
import {ValidateMemoization} from 'shared-runtime';
import {use, useMemo} from 'react';

const FooContext = React.createContext(null);
function Component(props) {
  return (
    <FooContext.Provider value={props.value}>
      <Inner />
    </FooContext.Provider>
  );
}

function Inner(props) {
  const input = use(FooContext);
  const output = useMemo(() => [input], [input]);
  return <ValidateMemoization inputs={[input]} output={output} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
  sequentialRenders: [
    {value: null},
    {value: 42},
    {value: 42},
    {value: null},
    {value: null},
    {value: 42},
    {value: null},
    {value: 42},
    {value: null},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { ValidateMemoization } from "shared-runtime";
import { use, useMemo } from "react";

const FooContext = React.createContext(null);
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Inner />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] !== props.value) {
    t1 = <FooContext.Provider value={props.value}>{t0}</FooContext.Provider>;
    $[1] = props.value;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

function Inner(props) {
  const $ = _c(7);
  const input = use(FooContext);
  let t0;
  if ($[0] !== input) {
    t0 = [input];
    $[0] = input;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const output = t0;
  let t1;
  if ($[2] !== input) {
    t1 = [input];
    $[2] = input;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  let t2;
  if ($[4] !== output || $[5] !== t1) {
    t2 = <ValidateMemoization inputs={t1} output={output} />;
    $[4] = output;
    $[5] = t1;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
  sequentialRenders: [
    { value: null },
    { value: 42 },
    { value: 42 },
    { value: null },
    { value: null },
    { value: 42 },
    { value: null },
    { value: 42 },
    { value: null },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[null],"output":["[[ cyclic ref *2 ]]"]}</div>
<div>{"inputs":[42],"output":[42]}</div>
<div>{"inputs":[42],"output":[42]}</div>
<div>{"inputs":[null],"output":["[[ cyclic ref *2 ]]"]}</div>
<div>{"inputs":[null],"output":["[[ cyclic ref *2 ]]"]}</div>
<div>{"inputs":[42],"output":[42]}</div>
<div>{"inputs":[null],"output":["[[ cyclic ref *2 ]]"]}</div>
<div>{"inputs":[42],"output":[42]}</div>
<div>{"inputs":[null],"output":["[[ cyclic ref *2 ]]"]}</div>
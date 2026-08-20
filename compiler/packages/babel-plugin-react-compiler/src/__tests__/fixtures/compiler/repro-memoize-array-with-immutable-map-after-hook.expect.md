
## Input

```javascript
import {useEffect, useState} from 'react';

function Component(props) {
  const x = [props.value];
  useEffect(() => {}, []);
  const onClick = () => {
    console.log(x.length);
  };
  return (
    <div onClick={onClick}>
      {x.map(item => {
        return <span key={item}>{item}</span>;
      })}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect, useState } from "react";

function Component(props) {
  const $ = _c(10);
  let t0;
  if ($[0] !== props.value) {
    t0 = [props.value];
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [];
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  useEffect(_temp, t1);
  let t2;
  if ($[3] !== x.length) {
    t2 = () => {
      console.log(x.length);
    };
    $[3] = x.length;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  const onClick = t2;
  let t3;
  if ($[5] !== x) {
    t3 = x.map(_temp2);
    $[5] = x;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  let t4;
  if ($[7] !== onClick || $[8] !== t3) {
    t4 = <div onClick={onClick}>{t3}</div>;
    $[7] = onClick;
    $[8] = t3;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  return t4;
}
function _temp2(item) {
  return <span key={item}>{item}</span>;
}
function _temp() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div><span>42</span></div>
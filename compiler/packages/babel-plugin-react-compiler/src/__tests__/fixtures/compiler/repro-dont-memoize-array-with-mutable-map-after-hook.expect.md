
## Input

```javascript
import {useEffect, useState} from 'react';
import {mutate} from 'shared-runtime';

function Component(props) {
  const x = [{...props.value}];
  useEffect(() => {}, []);
  const onClick = () => {
    console.log(x.length);
  };
  let y;
  return (
    <div onClick={onClick}>
      {x.map(item => {
        item.flag = true;
        return <span key={item.id}>{item.text}</span>;
      })}
      {mutate(y)}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {id: 0, text: 'Hello', flag: false}}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect, useState } from "react";
import { mutate } from "shared-runtime";

function Component(props) {
  const $ = _c(7);
  const x = [{ ...props.value }];
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  useEffect(_temp, t0);
  const onClick = () => {
    console.log(x.length);
  };

  let y;

  const t1 = x.map(_temp2);
  let t2;
  if ($[1] !== y) {
    t2 = mutate(y);
    $[1] = y;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  let t3;
  if ($[3] !== onClick || $[4] !== t1 || $[5] !== t2) {
    t3 = (
      <div onClick={onClick}>
        {t1}
        {t2}
      </div>
    );
    $[3] = onClick;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}
function _temp2(item) {
  item.flag = true;
  return <span key={item.id}>{item.text}</span>;
}
function _temp() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: { id: 0, text: "Hello", flag: false } }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div><span>Hello</span></div>

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
        y = item;
        return <span key={item.id}>{item.text}</span>;
      })}
      {mutate(y)}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {id: 0, text: 'Hello!'}}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect, useState } from "react";
import { mutate } from "shared-runtime";

function Component(props) {
  const $ = _c(5);
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

  const t1 = x.map((item) => {
    y = item;
    return <span key={item.id}>{item.text}</span>;
  });
  const t2 = mutate(y);
  let t3;
  if ($[1] !== onClick || $[2] !== t1 || $[3] !== t2) {
    t3 = (
      <div onClick={onClick}>
        {t1}
        {t2}
      </div>
    );
    $[1] = onClick;
    $[2] = t1;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}
function _temp() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: { id: 0, text: "Hello!" } }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div><span>Hello!</span></div>

## Input

```javascript
// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Component({items}) {
  const [last, setLast] = useState(0);
  function open(item) {
    setLast(Date.now() + item.length);
  }
  return (
    <div>
      {items.map(item => (
        <button key={item} onClick={() => open(item)}>
          {last}
        </button>
      ))}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoImpureFunctionsInRender
import { useState } from "react";

function Component(t0) {
  const $ = _c(5);
  const { items } = t0;
  const [last, setLast] = useState(0);
  let t1;
  if ($[0] !== items || $[1] !== last) {
    const open = function open(item) {
      setLast(Date.now() + item.length);
    };
    t1 = items.map((item_0) => (
      <button key={item_0} onClick={() => open(item_0)}>
        {last}
      </button>
    ));
    $[0] = items;
    $[1] = last;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t1) {
    t2 = <div>{t1}</div>;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
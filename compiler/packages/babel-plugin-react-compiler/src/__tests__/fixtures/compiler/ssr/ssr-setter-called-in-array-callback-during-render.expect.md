
## Input

```javascript
// @outputMode:"ssr"
import {useState} from 'react';

function Component({items}) {
  // The callback runs during render, so it is not an event handler even though
  // it calls a setter
  const [max, setMax] = useState(0);
  items.forEach(item => {
    if (item > max) {
      setMax(item);
    }
  });
  return <div>{max}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [1, 3, 2]}],
};

```

## Code

```javascript
// @outputMode:"ssr"
import { useState } from "react";

function Component(t0) {
  const { items } = t0;

  const [max, setMax] = useState(0);
  items.forEach((item) => {
    if (item > max) {
      setMax(item);
    }
  });
  return <div>{max}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [1, 3, 2] }],
};

```
      
### Eval output
(kind: ok) <div>3</div>
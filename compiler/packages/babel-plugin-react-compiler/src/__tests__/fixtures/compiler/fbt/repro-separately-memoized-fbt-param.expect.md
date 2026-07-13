
## Input

```javascript
import {fbt} from 'fbt';
import {useState} from 'react';

const MIN = 10;

function Component() {
  const [count, setCount] = useState(0);

  return fbt(
    'Expected at least ' +
      fbt.param('min', MIN, {number: true}) +
      ' items, but got ' +
      fbt.param('count', count, {number: true}) +
      ' items.',
    'Error description'
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { fbt } from "fbt";
import { useState } from "react";

const MIN = 10;

function Component() {
  const $ = _c(2);
  const [count] = useState(0);
  let t0;
  if ($[0] !== count) {
    t0 = fbt._(
      { "*": { "*": "Expected at least {min} items, but got {count} items." } },
      [
        fbt._param(
          "min",

          MIN,
          [0],
        ),
        fbt._param(
          "count",

          count,
          [0],
        ),
      ],
      { hk: "36gbz8" },
    );
    $[0] = count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) Expected at least 10 items, but got 0 items.
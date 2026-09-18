
## Input

```javascript
// useMemo imported from 'react' should be detected and dropped.
// The module name matching must handle 'react' correctly.

import {useMemo} from 'react';

function Component({items}) {
  const sorted = useMemo(() => [...items].sort(), [items]);
  return <div>{sorted}</div>;
}

export default Component;

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // useMemo imported from 'react' should be detected and dropped.
// The module name matching must handle 'react' correctly.

import { useMemo } from "react";

function Component(t0) {
  const $ = _c(4);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = [...items].sort();
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const sorted = t1;
  let t2;
  if ($[2] !== sorted) {
    t2 = <div>{sorted}</div>;
    $[2] = sorted;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export default Component;

```
      
### Eval output
(kind: exception) Fixture not implemented
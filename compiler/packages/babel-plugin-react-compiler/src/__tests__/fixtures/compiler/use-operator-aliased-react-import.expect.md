
## Input

```javascript
import ReactAlias from 'react';

const Context = ReactAlias.createContext(null);

function Component() {
  const value = ReactAlias.use(Context);
  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import ReactAlias from "react";

const Context = ReactAlias.createContext(null);

function Component() {
  const $ = _c(2);
  const value = ReactAlias.use(Context);
  let t0;
  if ($[0] !== value) {
    t0 = <div>{value}</div>;
    $[0] = value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div></div>
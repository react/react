
## Input

```javascript
// @compilationMode:"infer"
import {use} from 'react';

const MyContext = React.createContext(null);

function useMyContext() {
  const context = use(MyContext);
  return [context];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyContext,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { use } from "react";

const MyContext = React.createContext(null);

function useMyContext() {
  const $ = _c(2);
  const context = use(MyContext);
  let t0;
  if ($[0] !== context) {
    t0 = [context];
    $[0] = context;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyContext,
  params: [],
};

```
      
### Eval output
(kind: ok) [null]
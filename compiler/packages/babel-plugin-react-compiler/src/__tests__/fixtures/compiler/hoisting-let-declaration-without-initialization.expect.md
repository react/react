
## Input

```javascript
import {CONST_NUMBER1, Stringify} from 'shared-runtime';

function useHook({cond}) {
  'use memo';
  const getX = () => x;

  let x;
  if (cond) {
    x = CONST_NUMBER1;
  }
  return <Stringify getX={getX} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: () => {},
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: true}, {cond: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { CONST_NUMBER1, Stringify } from "shared-runtime";

function useHook(t0) {
  "use memo";
  const $ = _c(2);
  const { cond } = t0;
  let t1;
  if ($[0] !== cond) {
    const getX = () => x;
    let x;
    if (cond) {
      x = CONST_NUMBER1;
    }
    t1 = <Stringify getX={getX} shouldInvokeFns={true} />;
    $[0] = cond;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: () => {},
  params: [{ cond: true }],
  sequentialRenders: [{ cond: true }, { cond: true }, { cond: false }],
};

```
      
### Eval output
(kind: ok) 



## Input

```javascript
import * as SharedRuntime from 'shared-runtime';
function Component({name}) {
  return <SharedRuntime.Stringify>hello world {name}</SharedRuntime.Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'sathya'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import * as SharedRuntime from "shared-runtime";
function Component(t0) {
  const $ = _c(2);
  const { name } = t0;
  let t1;
  if ($[0] !== name) {
    t1 = <SharedRuntime.Stringify>hello world {name}</SharedRuntime.Stringify>;
    $[0] = name;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "sathya" }],
};

```
      
### Eval output
(kind: ok) <div>{"children":["hello world ","sathya"]}</div>

## Input

```javascript
import * as SharedRuntime from 'shared-runtime';
import {invoke} from 'shared-runtime';
function useComponentFactory({name}) {
  const localVar = SharedRuntime;
  const cb = () => <localVar.Stringify>hello world {name}</localVar.Stringify>;
  return invoke(cb);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useComponentFactory,
  params: [{name: 'sathya'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import * as SharedRuntime from "shared-runtime";
import { invoke } from "shared-runtime";
function useComponentFactory(t0) {
  const $ = _c(2);
  const { name } = t0;
  let t1;
  if ($[0] !== name) {
    const cb = () => (
      <SharedRuntime.Stringify>hello world {name}</SharedRuntime.Stringify>
    );
    t1 = invoke(cb);
    $[0] = name;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useComponentFactory,
  params: [{ name: "sathya" }],
};

```
      
### Eval output
(kind: ok) <div>{"children":["hello world ","sathya"]}</div>
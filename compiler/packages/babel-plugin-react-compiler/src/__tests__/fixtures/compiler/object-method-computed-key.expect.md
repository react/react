
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({keyName}) {
  const obj = {
    [keyName]() {
      return 42;
    },
  };
  return <Stringify keys={Object.keys(obj)} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{keyName: 'dynamic'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { keyName } = t0;
  let t1;
  if ($[0] !== keyName) {
    t1 = {
      [keyName]() {
        return 42;
      },
    };
    $[0] = keyName;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const obj = t1;
  let t2;
  if ($[2] !== obj) {
    t2 = <Stringify keys={Object.keys(obj)} />;
    $[2] = obj;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ keyName: "dynamic" }],
};

```
      
### Eval output
(kind: ok) <div>{"keys":["dynamic"]}</div>
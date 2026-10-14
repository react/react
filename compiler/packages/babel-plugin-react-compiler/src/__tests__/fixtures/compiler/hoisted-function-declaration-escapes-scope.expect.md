
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({x}) {
  const unused = () => submit();
  function submit() {
    return x;
  }
  return <Stringify onClick={submit} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { x } = t0;
  let submit;
  if ($[0] !== x) {
    submit = function submit() {
      return x;
    };
    $[0] = x;
    $[1] = submit;
  } else {
    submit = $[1];
  }
  let t1;
  if ($[2] !== submit) {
    t1 = <Stringify onClick={submit} />;
    $[2] = submit;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"onClick":"[[ function params=0 ]]"}</div>
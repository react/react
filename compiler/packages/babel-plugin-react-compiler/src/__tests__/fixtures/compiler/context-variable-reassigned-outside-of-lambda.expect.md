
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component(props) {
  let x = null;
  const callback = () => {
    console.log(x);
  };
  x = {};
  return <Stringify callback={callback} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let x = null;
    const callback = () => {
      console.log(x);
    };
    x = {};
    t0 = <Stringify callback={callback} shouldInvokeFns={true} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"callback":{"kind":"Function"},"shouldInvokeFns":true}</div>
logs: [{}]

## Input

```javascript
// @enableNameAnonymousFunctions
import {Stringify} from 'shared-runtime';

function Component(props) {
  const onClick = () => {
    console.log('hello!');
  };
  return <div onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNameAnonymousFunctions
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(1);
  const onClick = _ComponentOnClick;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div onClick={onClick} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _ComponentOnClick() {
  console.log("hello!");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) <div></div>

## Input

```javascript
import {Stringify} from 'shared-runtime';

function hoisting() {
  function onClick() {
    return bar['baz'];
  }
  function onClick2() {
    return bar[baz];
  }
  const baz = 'baz';
  const bar = {baz: 1};

  return (
    <Stringify onClick={onClick} onClick2={onClick2} shouldInvokeFns={true} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function hoisting() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const onClick = function onClick() {
      return bar.baz;
    };
    const onClick2 = function onClick2() {
      return bar[baz];
    };
    const baz = "baz";
    const bar = { baz: 1 };
    t0 = (
      <Stringify onClick={onClick} onClick2={onClick2} shouldInvokeFns={true} />
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>{"onClick":{"kind":"Function","result":1},"onClick2":{"kind":"Function","result":1},"shouldInvokeFns":true}</div>
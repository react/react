
## Input

```javascript
// @compilationMode:"infer"

import {Stringify} from 'shared-runtime';

function Test() {
  const context = {
    testFn() {
      // if it is an arrow function its work
      return () => 'test'; // it will break compile if returns an arrow fn
    },
  };

  return <Stringify value={context} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"

import { Stringify } from "shared-runtime";

function Test() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const context = {
      testFn() {
        return _temp;
      },
    };
    t0 = <Stringify value={context} shouldInvokeFns={true} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  return "test";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"value":{"testFn":{"kind":"Function","result":{"kind":"Function","result":"test"}}},"shouldInvokeFns":true}</div>
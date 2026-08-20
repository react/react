
## Input

```javascript
// @gating
import * as React from 'react';

let Foo;
const MemoFoo = React.memo(Foo);
Foo = () => <div>hello world!</div>;

/**
 * Evaluate this fixture module to assert that compiler + original have the same
 * runtime error message.
 */
export const FIXTURE_ENTRYPOINT = {
  fn: () => {},
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating
import * as React from "react";

let Foo;
const MemoFoo = React.memo(Foo);
Foo = isForgetEnabled_Fixtures()
  ? () => {
      const $ = _c(1);
      let t0;
      if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = <div>hello world!</div>;
        $[0] = t0;
      } else {
        t0 = $[0];
      }
      return t0;
    }
  : () => <div>hello world!</div>;

/**
 * Evaluate this fixture module to assert that compiler + original have the same
 * runtime error message.
 */
export const FIXTURE_ENTRYPOINT = {
  fn: isForgetEnabled_Fixtures() ? () => {} : () => {},
  params: [],
};

```
      
### Eval output
(kind: ok) 
logs: ['memo: The first argument must be a component. Instead received: %s','undefined']
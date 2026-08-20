
## Input

```javascript
// @gating @compilationMode:"infer"
import React from 'react';
export default React.forwardRef(function notNamedLikeAComponent(props) {
  return <div />;
});

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating @compilationMode:"infer"
import React from "react";
export default React.forwardRef(
  isForgetEnabled_Fixtures()
    ? function notNamedLikeAComponent(props) {
        const $ = _c(1);
        let t0;
        if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
          t0 = <div />;
          $[0] = t0;
        } else {
          t0 = $[0];
        }
        return t0;
      }
    : function notNamedLikeAComponent(props) {
        return <div />;
      },
);

```
      
### Eval output
(kind: exception) Fixture not implemented
logs: ['forwardRef render functions accept exactly two parameters: props and ref. %s','Did you forget to use the ref parameter?']
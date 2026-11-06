
## Input

```javascript
// @dynamicGating:{"source":"shared-runtime"} @compilationMode:"annotation"

function foo() {
  'use memo if(getTrue)';
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { getTrue } from "shared-runtime"; // @dynamicGating:{"source":"shared-runtime"} @compilationMode:"annotation"
const foo = getTrue()
  ? function foo() {
      "use memo if(getTrue)";
      const $ = _c(1);
      let t0;
      if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = <div>hello world</div>;
        $[0] = t0;
      } else {
        t0 = $[0];
      }
      return t0;
    }
  : function foo() {
      "use memo if(getTrue)";
      return <div>hello world</div>;
    };

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>hello world</div>
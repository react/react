
## Input

```javascript
// @gating
function Component() {
  const name = Component.name;
  return <div>{name}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating
const Component = isForgetEnabled_Fixtures()
  ? function Component() {
      const $ = _c(1);
      const name = Component.name;
      let t0;
      if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = <div>{name}</div>;
        $[0] = t0;
      } else {
        t0 = $[0];
      }
      return t0;
    }
  : function Component() {
      const name = Component.name;
      return <div>{name}</div>;
    };

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>Component</div>

## Input

```javascript
// @enableFunctionOutlining
// Minimized repro for C5: outlined function naming divergence.
// When source code has variables named _temp/_temp2, Babel's generateUid
// skips those names, but the Rust compiler's blind counter doesn't.
function Component(props) {
  const _temp = props.a;
  const _temp2 = props.b;
  return props.items.map(() => <div />);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableFunctionOutlining
// Minimized repro for C5: outlined function naming divergence.
// When source code has variables named _temp/_temp2, Babel's generateUid
// skips those names, but the Rust compiler's blind counter doesn't.
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.map(_temp3);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp3() {
  return <div />;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
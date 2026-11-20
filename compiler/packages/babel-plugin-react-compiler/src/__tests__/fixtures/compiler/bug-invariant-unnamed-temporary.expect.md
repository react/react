
## Input

```javascript
const displayValue = 'text';

function Bar({renderer}) {
  return renderer();
}

export function Foo() {
  return (
    <Bar
      renderer={(...props) => {
        return <span {...props}>{displayValue}</span>;
      }}
    />
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const displayValue = "text";

function Bar(t0) {
  const $ = _c(2);
  const { renderer } = t0;
  let t1;
  if ($[0] !== renderer) {
    t1 = renderer();
    $[0] = renderer;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export function Foo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Bar renderer={_temp} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp(...t0) {
  const props = t0;
  return <span {...props}>{displayValue}</span>;
}

```
      
### Eval output
(kind: exception) Fixture not implemented

## Input

```javascript
import Bar from './Bar';

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
import Bar from "./Bar";

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
      
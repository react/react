
## Input

```javascript
// @flow @enableNewMutationAliasingModel

import fbt from 'fbt';

component Component() {
  const sections = Object.keys(items);

  for (let i = 0; i < sections.length; i += 3) {
    chunks.push(
      sections.slice(i, i + 3).map(section => {
        return <Child />;
      })
    );
  }

  return <Child />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

import fbt from "fbt";

function Component() {
  const $ = _c(1);
  const sections = Object.keys(items);

  for (let i = 0; i < sections.length; i = i + 3, i) {
    chunks.push(sections.slice(i, i + 3).map(_temp));
  }
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Child />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp(section) {
  return <Child />;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
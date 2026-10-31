
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef, useState} from "react";
function Component() {
  const inputRef = useRef(null);
  const [files] = useState([]);
  const ctx = { inputRef, files };
  return (
    <div>
      <input ref={ctx.inputRef} />
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useRef, useState } from "react";
function Component() {
  const $ = _c(10);
  const inputRef = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const [files] = useState(t0);
  let t1;
  if ($[1] !== files) {
    t1 = { inputRef, files };
    $[1] = files;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const ctx = t1;
  let t2;
  if ($[3] !== ctx.inputRef) {
    t2 = <input ref={ctx.inputRef} />;
    $[3] = ctx.inputRef;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== ctx.files.length) {
    t3 = ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null;
    $[5] = ctx.files.length;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  let t4;
  if ($[7] !== t2 || $[8] !== t3) {
    t4 = (
      <div>
        {t2}
        {t3}
      </div>
    );
    $[7] = t2;
    $[8] = t3;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  return t4;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
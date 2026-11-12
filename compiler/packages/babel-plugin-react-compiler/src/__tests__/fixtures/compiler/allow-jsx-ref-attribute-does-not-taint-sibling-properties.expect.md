
## Input

```javascript
// @validateRefAccessDuringRender
function Component({ctx}) {
  return (
    <div>
      <input ref={ctx.foo} />
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
function Component(t0) {
  const $ = _c(7);
  const { ctx } = t0;
  let t1;
  if ($[0] !== ctx.foo) {
    t1 = <input ref={ctx.foo} />;
    $[0] = ctx.foo;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== ctx.files.length) {
    t2 = ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null;
    $[2] = ctx.files.length;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = (
      <div>
        {t1}
        {t2}
      </div>
    );
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
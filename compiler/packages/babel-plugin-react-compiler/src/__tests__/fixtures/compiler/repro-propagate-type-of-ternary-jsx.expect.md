
## Input

```javascript
function V0({v1, v2}: V3<{v1: any, v2: V4}>): V12.V11 {
  const v5 = v1.v6?.v7;
  return (
    <Component8 c9={va} cb="apqjx">
      {v5 != null ? (
        <ComponentC cd={v5}>
          <ComponentE cf={v1} c10={v2} />
        </ComponentC>
      ) : (
        <ComponentE cf={v1} c10={v2} />
      )}
    </Component8>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function V0(t0) {
  const $ = _c(4);
  const { v1, v2 } = t0;
  const v5 = v1.v6?.v7;
  let t1;
  if ($[0] !== v1 || $[1] !== v2 || $[2] !== v5) {
    t1 = (
      <Component8 c9={va} cb="apqjx">
        {v5 != null ? (
          <ComponentC cd={v5}>
            <ComponentE cf={v1} c10={v2} />
          </ComponentC>
        ) : (
          <ComponentE cf={v1} c10={v2} />
        )}
      </Component8>
    );
    $[0] = v1;
    $[1] = v2;
    $[2] = v5;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
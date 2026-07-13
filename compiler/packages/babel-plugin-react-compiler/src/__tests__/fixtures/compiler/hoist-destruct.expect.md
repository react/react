
## Input

```javascript
//@flow
component Foo() {
  function foo() {
    return (
      <div>
        {a} {z} {y}
      </div>
    );
  }
  const [a, {x: z, y = 10}] = [1, {x: 2}];
  return foo();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const foo = function foo() {
      return (
        <div>
          {a} {z} {y}
        </div>
      );
    };
    const [t1, t2] = [1, { x: 2 }];
    const a = t1;
    const { x: t3, y: t4 } = t2;
    const z = t3;
    const y = t4 === undefined ? 10 : t4;
    t0 = foo();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>1 2 10</div>
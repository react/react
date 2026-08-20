
## Input

```javascript
function Foo() {
  const x = () => {
    window.href = 'foo';
  };
  const y = {x};
  return <Bar y={y} />;
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
  const x = _temp;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const y = { x };
    t0 = <Bar y={y} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  window.href = "foo";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: exception) Bar is not defined
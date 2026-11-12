
## Input

```javascript
// Should print A, arg, original

function Component() {
  const changeF = o => {
    o.f = () => console.log('new');
  };
  const x = {
    f: () => console.log('original'),
  };

  (console.log('A'), x).f((changeF(x), console.log('arg'), 1));
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Should print A, arg, original

function Component() {
  const $ = _c(1);
  const changeF = _temp;
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = { f: _temp2 };

    (console.log("A"), x).f((changeF(x), console.log("arg"), 1));
    $[0] = x;
  } else {
    x = $[0];
  }
  return x;
}
function _temp2() {
  return console.log("original");
}
function _temp(o) {
  o.f = () => console.log("new");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"f":"[[ function params=0 ]]"}
logs: ['A','arg','original']
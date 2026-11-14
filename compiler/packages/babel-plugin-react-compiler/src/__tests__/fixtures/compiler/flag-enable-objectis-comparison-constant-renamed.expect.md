
## Input

```javascript
// @enableObjectIsComparison
const is = null;

function Component(props) {
  const x = [props.x];
  console.log(is);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 42}],
  sequentialRenders: [{x: 42}, {x: 42}, {x: 3.14}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const _is = Object.is; // @enableObjectIsComparison
const is = null;

function Component(props) {
  const $ = _c(2);
  let t0;
  if (!_is($[0], props.x)) {
    t0 = [props.x];
    $[0] = props.x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  console.log(is);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 42 }],
  sequentialRenders: [{ x: 42 }, { x: 42 }, { x: 3.14 }],
};

```
      
### Eval output
(kind: ok) [42]
[42]
[3.14]
logs: [null,null,null]
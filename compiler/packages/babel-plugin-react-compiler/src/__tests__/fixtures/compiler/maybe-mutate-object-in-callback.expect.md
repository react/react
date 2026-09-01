
## Input

```javascript
const {mutate} = require('shared-runtime');

function Component(props) {
  const object = {};
  // We optimistically assume function calls within callbacks don't mutate (unless the function
  // is known to be called during render), so this should get memoized
  const onClick = () => {
    mutate(object);
  };
  return <Foo callback={onClick}>{props.children}</Foo>;
}

function Foo({children}) {
  return children;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{children: <div>Hello</div>}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { mutate } = require("shared-runtime");

function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const object = {};
    t0 = () => {
      mutate(object);
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const onClick = t0;
  let t1;
  if ($[1] !== props.children) {
    t1 = <Foo callback={onClick}>{props.children}</Foo>;
    $[1] = props.children;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

function Foo(t0) {
  const { children } = t0;
  return children;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ children: <div>Hello</div> }],
};

```
      
### Eval output
(kind: ok) <div>Hello</div>
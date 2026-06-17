
## Input

```javascript
// When multiple functions in the same file generate UIDs, they should not
// collide. Babel's generateUid accumulates names at the program scope, so
// the second function's UIDs start where the first function left off.

function Component1({items}) {
  const mapped = items.map(x => x.id);
  return <div>{mapped}</div>;
}

function Component2({items}) {
  const mapped = items.map(x => x.name);
  return <span>{mapped}</span>;
}

export {Component1, Component2};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // When multiple functions in the same file generate UIDs, they should not
// collide. Babel's generateUid accumulates names at the program scope, so
// the second function's UIDs start where the first function left off.

function Component1(t0) {
  const $ = _c(4);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = items.map(_temp);
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const mapped = t1;
  let t2;
  if ($[2] !== mapped) {
    t2 = <div>{mapped}</div>;
    $[2] = mapped;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}
function _temp(x) {
  return x.id;
}

function Component2(t0) {
  const $ = _c(4);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = items.map(_temp2);
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const mapped = t1;
  let t2;
  if ($[2] !== mapped) {
    t2 = <span>{mapped}</span>;
    $[2] = mapped;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}
function _temp2(x) {
  return x.name;
}

export { Component1, Component2 };

```
      
### Eval output
(kind: exception) Fixture not implemented
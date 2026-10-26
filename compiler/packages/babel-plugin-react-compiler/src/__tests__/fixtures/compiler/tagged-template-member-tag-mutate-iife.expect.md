
## Input

```javascript
import {identity, makeArray} from 'shared-runtime';

function Component(props) {
  const obj = {tag: props.a};
  return obj.tag`${(function () {
    obj.tag = props.b;
  })()}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: makeArray, b: identity}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, makeArray } from "shared-runtime";

function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.a || $[1] !== props.b) {
    const obj = { tag: props.a };
    const t1 = obj.tag;
    obj.tag = props.b;
    t0 = t1.bind(obj)`${undefined}`;
    $[0] = props.a;
    $[1] = props.b;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: makeArray, b: identity }],
};

```
      
### Eval output
(kind: ok) [["",""],null]

## Input

```javascript
import {useRef} from 'react';
import {Stringify} from 'shared-runtime';

function Component(props) {
  const ref = useRef(props.value);
  const object = {};
  object.foo = () => ref.current;
  return <Stringify object={object} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from "react";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(1);
  const ref = useRef(props.value);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const object = {};
    object.foo = () => ref.current;
    t0 = <Stringify object={object} shouldInvokeFns={true} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"object":{"foo":{"kind":"Function","result":42}},"shouldInvokeFns":true}</div>

## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component(props) {
  const {a} = props;
  const {b, ...rest} = a;
  // Local mutation of `rest` is allowed since it is a newly allocated object
  rest.value = props.value;
  return <Stringify rest={rest} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {b: 0, other: 'other'}, value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(5);
  const { a } = props;
  let rest;
  if ($[0] !== a || $[1] !== props.value) {
    const { b, ...t0 } = a;
    rest = t0;

    rest.value = props.value;
    $[0] = a;
    $[1] = props.value;
    $[2] = rest;
  } else {
    rest = $[2];
  }
  let t0;
  if ($[3] !== rest) {
    t0 = <Stringify rest={rest} />;
    $[3] = rest;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: { b: 0, other: "other" }, value: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"rest":{"other":"other","value":42}}</div>
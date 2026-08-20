
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({kind, ...props}) {
  switch (kind) {
    default:
      return <Stringify {...props} />;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{kind: 'foo', a: 1, b: true, c: 'sathya'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(5);
  let kind;
  let props;
  if ($[0] !== t0) {
    ({ kind, ...props } = t0);
    $[0] = t0;
    $[1] = kind;
    $[2] = props;
  } else {
    kind = $[1];
    props = $[2];
  }
  switch (kind) {
    default: {
      let t1;
      if ($[3] !== props) {
        t1 = <Stringify {...props} />;
        $[3] = props;
        $[4] = t1;
      } else {
        t1 = $[4];
      }
      return t1;
    }
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ kind: "foo", a: 1, b: true, c: "sathya" }],
};

```
      
### Eval output
(kind: ok) <div>{"a":1,"b":true,"c":"sathya"}</div>
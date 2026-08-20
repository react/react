
## Input

```javascript
import {useNoAlias} from 'shared-runtime';

function Component(props) {
  const item = {a: props.a};
  const x = useNoAlias(item, () => {
    console.log(props);
  }, [props.a]);
  return [x, item];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {id: 42}}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useNoAlias } from "shared-runtime";

function Component(props) {
  const $ = _c(5);
  let t0;
  if ($[0] !== props.a) {
    t0 = { a: props.a };
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const item = t0;
  const x = useNoAlias(item, () => {
    console.log(props);
  }, [props.a]);
  let t1;
  if ($[2] !== item || $[3] !== x) {
    t1 = [x, item];
    $[2] = item;
    $[3] = x;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: { id: 42 } }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) [{},{"a":{"id":42}}]
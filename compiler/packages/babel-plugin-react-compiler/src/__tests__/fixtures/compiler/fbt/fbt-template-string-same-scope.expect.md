
## Input

```javascript
import fbt from 'fbt';
import {Stringify} from 'shared-runtime';

export function Component(props) {
  let count = 0;
  if (props.items) {
    count = props.items.length;
  }
  return (
    <Stringify>
      {fbt(
        `for ${fbt.param('count', count)} experiences`,
        `Label for the number of items`,
        {project: 'public'}
      )}
    </Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [1, 2, 3]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";
import { Stringify } from "shared-runtime";

export function Component(props) {
  const $ = _c(4);
  let count = 0;
  if (props.items) {
    count = props.items.length;
  }
  let t0;
  if ($[0] !== count) {
    t0 = fbt._("for {count} experiences", [fbt._param("count", count)], {
      hk: "nmYpm",
    });
    $[0] = count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0) {
    t1 = <Stringify>{t0}</Stringify>;
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [1, 2, 3] }],
};

```
      
### Eval output
(kind: ok) <div>{"children":"for 3 experiences"}</div>
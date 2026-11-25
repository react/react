
## Input

```javascript
import {Stringify} from 'shared-runtime';

/**
 * The handler only runs on click, and the button is disabled while the list is
 * empty. Reading `items[0].id` during render would throw on the first render.
 */
function Component({items}: {items: Array<{id: number}>}) {
  return (
    <Stringify disabled={items.length === 0} onClick={() => items[0].id} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: []}],
  sequentialRenders: [{items: []}, {items: [{id: 1}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

/**
 * The handler only runs on click, and the button is disabled while the list is
 * empty. Reading `items[0].id` during render would throw on the first render.
 */
function Component(t0) {
  const $ = _c(5);
  const { items } = t0;

  const t1 = items.length === 0;
  let t2;
  if ($[0] !== items[0]) {
    t2 = () => items[0].id;
    $[0] = items[0];
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  let t3;
  if ($[2] !== t1 || $[3] !== t2) {
    t3 = <Stringify disabled={t1} onClick={t2} />;
    $[2] = t1;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [] }],
  sequentialRenders: [{ items: [] }, { items: [{ id: 1 }] }],
};

```
      
### Eval output
(kind: ok) <div>{"disabled":true,"onClick":"[[ function params=0 ]]"}</div>
<div>{"disabled":false,"onClick":"[[ function params=0 ]]"}</div>
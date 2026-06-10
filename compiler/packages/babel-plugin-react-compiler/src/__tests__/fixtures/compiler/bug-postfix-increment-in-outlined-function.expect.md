
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({items}) {
  const result = items.reduce(
    (acc, item) => {
      const id = acc.counter++;
      acc.rows.push(`${id}:${item}`);
      return acc;
    },
    {counter: 0, rows: []},
  );
  return <Stringify rows={result.rows} counter={result.counter} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: ['a', 'b', 'c']}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(5);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = items.reduce(
      _temp,

      { counter: 0, rows: [] },
    );
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const result = t1;
  let t2;
  if ($[2] !== result.counter || $[3] !== result.rows) {
    t2 = <Stringify rows={result.rows} counter={result.counter} />;
    $[2] = result.counter;
    $[3] = result.rows;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}
function _temp(acc, item) {
  acc.counter = acc.counter + 1;
  const id = acc.counter;
  acc.rows.push(`${id}:${item}`);
  return acc;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: ["a", "b", "c"] }],
};

```
      
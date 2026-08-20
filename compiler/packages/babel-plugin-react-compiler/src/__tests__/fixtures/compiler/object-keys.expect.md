
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

// derived from https://github.com/facebook/react/issues/32261
function Component({items}) {
  const record = useMemo(
    () =>
      Object.fromEntries(
        items.map(item => [item.id, ref => <Stringify ref={ref} {...item} />])
      ),
    [items]
  );

  // Without a declaration for Object.entries(), this would be assumed to mutate
  // `record`, meaning existing memoization couldn't be preserved
  return (
    <div>
      {Object.keys(record).map(id => (
        <Stringify key={id} render={record[id]} />
      ))}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [
        {id: '0', name: 'Hello'},
        {id: '1', name: 'World!'},
      ],
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useMemo } from "react";
import { Stringify } from "shared-runtime";

// derived from https://github.com/facebook/react/issues/32261
function Component(t0) {
  const $ = _c(7);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = Object.fromEntries(items.map(_temp));
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const record = t1;
  let t2;
  if ($[2] !== record) {
    t2 = Object.keys(record);
    $[2] = record;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== record || $[5] !== t2) {
    t3 = (
      <div>
        {t2.map((id) => (
          <Stringify key={id} render={record[id]} />
        ))}
      </div>
    );
    $[4] = record;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}
function _temp(item) {
  return [item.id, (ref) => <Stringify ref={ref} {...item} />];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [
        { id: "0", name: "Hello" },
        { id: "1", name: "World!" },
      ],
    },
  ],
};

```
      
### Eval output
(kind: ok) <div><div>{"render":"[[ function params=1 ]]"}</div><div>{"render":"[[ function params=1 ]]"}</div></div>
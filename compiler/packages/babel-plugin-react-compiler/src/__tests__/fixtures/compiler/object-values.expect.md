
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
        items.map(item => [
          item.id,
          {id: item.id, render: ref => <Stringify ref={ref} {...item} />},
        ])
      ),
    [items]
  );

  // Without a declaration for Object.entries(), this would be assumed to mutate
  // `record`, meaning existing memoization couldn't be preserved
  return (
    <div>
      {Object.values(record).map(({id, render}) => (
        <Stringify key={id} render={render} />
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
  const $ = _c(4);
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
    t2 = <div>{Object.values(record).map(_temp2)}</div>;
    $[2] = record;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}
function _temp2(t0) {
  const { id, render } = t0;
  return <Stringify key={id} render={render} />;
}
function _temp(item) {
  return [
    item.id,
    { id: item.id, render: (ref) => <Stringify ref={ref} {...item} /> },
  ];
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
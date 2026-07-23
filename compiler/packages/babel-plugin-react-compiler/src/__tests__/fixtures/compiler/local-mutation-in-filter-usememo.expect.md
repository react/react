
## Input

```javascript
import React from 'react';

export function Component({items}) {
  const stuff = React.useMemo(() => {
    let isCool = false;
    const someItems = items.filter(cause => {
      if (cause.foo) {
        isCool = true;
      }
      return true;
    });

    if (someItems.length > 0) {
      return {someItems, isCool};
    }
  }, [items]);
  return <div>{stuff?.someItems.length}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{foo: true}, {foo: false}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import React from "react";

export function Component(t0) {
  const $ = _c(8);
  const { items } = t0;
  let t1;
  bb0: {
    let isCool;
    let t2;
    if ($[0] !== items) {
      isCool = false;
      t2 = items.filter((cause) => {
        if (cause.foo) {
          isCool = true;
        }

        return true;
      });
      $[0] = items;
      $[1] = isCool;
      $[2] = t2;
    } else {
      isCool = $[1];
      t2 = $[2];
    }
    const someItems = t2;

    if (someItems.length > 0) {
      let t3;
      if ($[3] !== isCool || $[4] !== someItems) {
        t3 = { someItems, isCool };
        $[3] = isCool;
        $[4] = someItems;
        $[5] = t3;
      } else {
        t3 = $[5];
      }
      t1 = t3;
      break bb0;
    }
    t1 = undefined;
  }
  const stuff = t1;

  const t2 = stuff?.someItems.length;
  let t3;
  if ($[6] !== t2) {
    t3 = <div>{t2}</div>;
    $[6] = t2;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [{ foo: true }, { foo: false }] }],
};

```
      
### Eval output
(kind: ok) <div>2</div>
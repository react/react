
## Input

```javascript
// @flow @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {useFragment} from 'shared-runtime';

function Component() {
  const data = useFragment();
  const nodes = data.nodes ?? [];
  const flatMap = nodes.flatMap(node => node.items);
  const filtered = flatMap.filter(item => item != null);
  const map = useMemo(() => filtered.map(), [filtered]);
  const index = filtered.findIndex(x => x === null);

  return (
    <div>
      {map}
      {index}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { useFragment } from "shared-runtime";

function Component() {
  const $ = _c(7);
  const data = useFragment();
  let t0;
  if ($[0] !== data.nodes) {
    const nodes = data.nodes ?? [];
    const flatMap = nodes.flatMap(_temp);
    t0 = flatMap.filter(_temp2);
    $[0] = data.nodes;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const filtered = t0;
  let t1;
  if ($[2] !== filtered) {
    t1 = filtered.map();
    $[2] = filtered;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const map = t1;
  const index = filtered.findIndex(_temp3);
  let t2;
  if ($[4] !== index || $[5] !== map) {
    t2 = (
      <div>
        {map}
        {index}
      </div>
    );
    $[4] = index;
    $[5] = map;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}
function _temp3(x) {
  return x === null;
}
function _temp2(item) {
  return item != null;
}
function _temp(node) {
  return node.items;
}

```
      
### Eval output
(kind: exception) Fixture not implemented

## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function Component({x}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        // Dependency inference should preserve the full mixed optional and
        // non-optional property chain.
        return identity(x.a.b?.c.d?.e);
      },
    });
  }, [x.a.b?.c.d?.e]);
  return object.callback();
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import { useMemo } from "react";
import { identity } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { x } = t0;

  x.a.b?.c.d?.e;
  let t1;
  if ($[0] !== x.a.b?.c.d?.e) {
    t1 = identity({ callback: () => identity(x.a.b?.c.d?.e) });
    $[0] = x.a.b?.c.d?.e;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const object = t1;
  let t2;
  if ($[2] !== object) {
    t2 = object.callback();
    $[2] = object;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

```
      
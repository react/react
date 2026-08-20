
## Input

```javascript
// @flow @enableNewMutationAliasingModel

import {identity, Stringify, useFragment} from 'shared-runtime';

component Example() {
  const data = useFragment();

  const {a, b} = identity(data);

  const el = <Stringify tooltip={b} />;

  identity(a.at(0));

  return <Stringify icon={el} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

import { identity, Stringify, useFragment } from "shared-runtime";

function Example() {
  const $ = _c(2);
  const data = useFragment();
  let t0;
  if ($[0] !== data) {
    const { a, b } = identity(data);
    const el = <Stringify tooltip={b} />;
    identity(a.at(0));
    t0 = <Stringify icon={el} />;
    $[0] = data;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented

## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';

function Component({obj}) {
  const onClick = useCallback(() => {
    if (obj?.id) {
      console.log(obj.id);
    }
  }, [obj?.id]);
  return <button onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: {id: 42}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback } from "react";

function Component(t0) {
  const $ = _c(4);
  const { obj } = t0;
  let t1;
  if ($[0] !== obj) {
    t1 = () => {
      if (obj?.id) {
        console.log(obj.id);
      }
    };
    $[0] = obj;
    $[1] = t1;
  } else {
    t1 = $[1];
  }

  obj?.id;
  const onClick = t1;
  let t2;
  if ($[2] !== onClick) {
    t2 = <button onClick={onClick} />;
    $[2] = onClick;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ obj: { id: 42 } }],
};

```
      
### Eval output
(kind: ok) <button></button>
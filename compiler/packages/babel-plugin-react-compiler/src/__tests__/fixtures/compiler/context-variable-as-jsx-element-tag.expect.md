
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component(props) {
  let Component = Stringify;

  Component = useMemo(() => {
    return Component;
  }, [Component]);

  return <Component {...props} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Sathya'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false
import { useMemo } from "react";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(3);
  let Component;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    Component = Stringify;

    Component;
    Component = Component;
    $[0] = Component;
  } else {
    Component = $[0];
  }
  let t0;
  if ($[1] !== props) {
    t0 = <Component {...props} />;
    $[1] = props;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Sathya" }],
};

```
      
### Eval output
(kind: ok) <div>{"name":"Sathya"}</div>
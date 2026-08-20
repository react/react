
## Input

```javascript
// @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import {useRef} from 'react';

function Component(props) {
  const ref = useRef(null);

  return <Foo>{props.render(ref)}</Foo>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import { useRef } from "react";

function Component(props) {
  const $ = _c(4);
  const ref = useRef(null);
  let t0;
  if ($[0] !== props.render) {
    t0 = props.render(ref);
    $[0] = props.render;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0) {
    t1 = <Foo>{t0}</Foo>;
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
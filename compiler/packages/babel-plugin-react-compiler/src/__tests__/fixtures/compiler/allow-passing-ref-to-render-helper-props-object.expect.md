
## Input

```javascript
// @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import {useRef} from 'react';

function Component(props) {
  const ref = useRef(null);

  return <Foo>{props.render({ref})}</Foo>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import { useRef } from "react";

function Component(props) {
  const $ = _c(3);
  const ref = useRef(null);

  const T0 = Foo;
  const t0 = props.render({ ref });
  let t1;
  if ($[0] !== T0 || $[1] !== t0) {
    t1 = <T0>{t0}</T0>;
    $[0] = T0;
    $[1] = t0;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
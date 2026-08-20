
## Input

```javascript
import {CONST_TRUE, makeObject_Primitives} from 'shared-runtime';

function Foo() {
  try {
    let thing = null;
    if (cond) {
      thing = makeObject_Primitives();
    }
    if (CONST_TRUE) {
      mutate(thing);
    }
    return thing;
  } catch {}
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { CONST_TRUE, makeObject_Primitives } from "shared-runtime";

function Foo() {
  const $ = _c(1);
  try {
    let thing;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      thing = null;
      if (cond) {
        thing = makeObject_Primitives();
      }

      if (CONST_TRUE) {
        mutate(thing);
      }
      $[0] = thing;
    } else {
      thing = $[0];
    }

    return thing;
  } catch {}
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) 
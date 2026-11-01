
## Input

```javascript
// @validateRefAccessDuringRender
import {PanResponder, Stringify} from 'shared-runtime';

function Component() {
  const ref = useRef(0);
  const config = useMemo(
    () => ({
      onPanResponderRelease: () => {
        ref.current = 0;
      },
    }),
    []
  );
  const panResponder = PanResponder.create(config);
  return <Stringify responder={panResponder} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { PanResponder, Stringify } from "shared-runtime";

function Component() {
  const $ = _c(2);
  const ref = useRef(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {
      onPanResponderRelease: () => {
        ref.current = 0;
      },
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const config = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    const panResponder = PanResponder.create(config);
    t1 = <Stringify responder={panResponder} />;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
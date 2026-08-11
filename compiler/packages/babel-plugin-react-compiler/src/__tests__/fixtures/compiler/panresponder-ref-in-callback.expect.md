
## Input

```javascript
// @flow
import {PanResponder, Stringify} from 'shared-runtime';

export default component Playground() {
  const onDragEndRef = useRef(() => {});
  useEffect(() => {
    onDragEndRef.current = () => {
      console.log('drag ended');
    };
  });
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onPanResponderTerminate: () => {
          onDragEndRef.current();
        },
      }),
    []
  );
  return <Stringify responder={panResponder} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { PanResponder, Stringify } from "shared-runtime";

export default function Playground() {
  const $ = _c(3);
  const onDragEndRef = useRef(_temp);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      onDragEndRef.current = _temp2;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  useEffect(t0);
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = PanResponder.create({
      onPanResponderTerminate: () => {
        onDragEndRef.current();
      },
    });
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const panResponder = t1;
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <Stringify responder={panResponder} />;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
}
function _temp2() {
  console.log("drag ended");
}
function _temp() {}

```
      
### Eval output
(kind: exception) Fixture not implemented
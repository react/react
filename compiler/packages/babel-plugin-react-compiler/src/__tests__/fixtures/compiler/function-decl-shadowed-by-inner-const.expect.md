
## Input

```javascript
function Component(props) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      init(el, props.data);
    }
    function init(el, data) {
      const init = makeInit(data);
      init.start();
    }
  });
  return <div ref={ref} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(3);
  const ref = useRef(null);
  let t0;
  if ($[0] !== props.data) {
    t0 = () => {
      const el = ref.current;
      if (el) {
        init(el, props.data);
      }

      function init(el_0, data) {
        const init_0 = makeInit(data);
        init_0.start();
      }
    };
    $[0] = props.data;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  useEffect(t0);
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div ref={ref} />;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
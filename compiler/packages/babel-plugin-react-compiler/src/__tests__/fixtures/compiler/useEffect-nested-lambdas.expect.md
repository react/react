
## Input

```javascript
// @enableTransitivelyFreezeFunctionExpressions:false

function Component(props) {
  const item = useMutable(props.itemId);
  const dispatch = useDispatch();
  useFreeze(dispatch);

  const exit = useCallback(() => {
    dispatch(createExitAction());
  }, [dispatch]);

  useEffect(() => {
    const cleanup = GlobalEventEmitter.addListener('onInput', () => {
      if (item.value) {
        exit();
      }
    });
    return () => cleanup.remove();
  }, [exit, item]);

  maybeMutate(item);

  return <div />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableTransitivelyFreezeFunctionExpressions:false

function Component(props) {
  const $ = _c(7);
  const item = useMutable(props.itemId);
  const dispatch = useDispatch();
  useFreeze(dispatch);
  let t0;
  if ($[0] !== dispatch) {
    t0 = () => {
      dispatch(createExitAction());
    };
    $[0] = dispatch;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const exit = t0;
  let t1;
  let t2;
  if ($[2] !== exit || $[3] !== item) {
    t1 = () => {
      const cleanup = GlobalEventEmitter.addListener("onInput", () => {
        if (item.value) {
          exit();
        }
      });
      return () => cleanup.remove();
    };
    t2 = [exit, item];
    $[2] = exit;
    $[3] = item;
    $[4] = t1;
    $[5] = t2;
  } else {
    t1 = $[4];
    t2 = $[5];
  }
  useEffect(t1, t2);

  maybeMutate(item);
  let t3;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <div />;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

```
      
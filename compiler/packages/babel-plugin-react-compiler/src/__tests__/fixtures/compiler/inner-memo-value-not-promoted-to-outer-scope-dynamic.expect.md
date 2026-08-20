
## Input

```javascript
function Component(props) {
  const item = useFragment(FRAGMENT, props.item);
  useFreeze(item);

  const count = new MaybeMutable(item);
  return (
    <View>
      <View>
        {<span>Text</span>}
        {<span>{maybeMutate(count)}</span>}
      </View>
    </View>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(15);
  const item = useFragment(FRAGMENT, props.item);
  useFreeze(item);
  let T0;
  let T1;
  let t0;
  let t1;
  if ($[0] !== item) {
    const count = new MaybeMutable(item);
    T1 = View;
    T0 = View;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <span>Text</span>;
      $[5] = t1;
    } else {
      t1 = $[5];
    }
    t0 = maybeMutate(count);
    $[0] = item;
    $[1] = T0;
    $[2] = T1;
    $[3] = t0;
    $[4] = t1;
  } else {
    T0 = $[1];
    T1 = $[2];
    t0 = $[3];
    t1 = $[4];
  }
  let t2;
  if ($[6] !== t0) {
    t2 = <span>{t0}</span>;
    $[6] = t0;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  let t3;
  if ($[8] !== T0 || $[9] !== t1 || $[10] !== t2) {
    t3 = (
      <T0>
        {t1}
        {t2}
      </T0>
    );
    $[8] = T0;
    $[9] = t1;
    $[10] = t2;
    $[11] = t3;
  } else {
    t3 = $[11];
  }
  let t4;
  if ($[12] !== T1 || $[13] !== t3) {
    t4 = <T1>{t3}</T1>;
    $[12] = T1;
    $[13] = t3;
    $[14] = t4;
  } else {
    t4 = $[14];
  }
  return t4;
}

```
      
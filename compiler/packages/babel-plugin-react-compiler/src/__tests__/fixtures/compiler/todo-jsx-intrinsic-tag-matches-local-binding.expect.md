
## Input

```javascript
function Component({items}) {
  const colgroup = useMemo(
    () => (
      <colgroup>
        {items.map(item => (
          <col key={item.id} />
        ))}
      </colgroup>
    ),
    [items]
  );
  return (
    <table>
      {colgroup}
      <tbody />
    </table>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(7);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = items.map(_temp);
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== t1) {
    t2 = <colgroup>{t1}</colgroup>;
    $[2] = t1;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const colgroup = t2;
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <tbody />;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  let t4;
  if ($[5] !== colgroup) {
    t4 = (
      <table>
        {colgroup}
        {t3}
      </table>
    );
    $[5] = colgroup;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  return t4;
}
function _temp(item) {
  return <col key={item.id} />;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
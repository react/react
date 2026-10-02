
## Input

```javascript
function DateComponent({date}) {
  const formatter = new Intl.DateTimeFormat('en-US');

  return <time dateTime={date.toISOString()}>{formatter.format(date)}</time>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: DateComponent,
  params: [{date: new Date('2024-01-01')}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function DateComponent(t0) {
  const $ = _c(6);
  const { date } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = new Intl.DateTimeFormat("en-US");
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const formatter = t1;
  let t2;
  if ($[1] !== date) {
    t2 = date.toISOString();
    $[1] = date;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const t3 = formatter.format(date);
  let t4;
  if ($[3] !== t2 || $[4] !== t3) {
    t4 = <time dateTime={t2}>{t3}</time>;
    $[3] = t2;
    $[4] = t3;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: DateComponent,
  params: [{ date: new Date("2024-01-01") }],
};

```
      
### Eval output
(kind: ok) <time datetime="2024-01-01T00:00:00.000Z">12/31/2023</time>
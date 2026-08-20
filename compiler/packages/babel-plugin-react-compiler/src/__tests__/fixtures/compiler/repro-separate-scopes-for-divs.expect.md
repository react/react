
## Input

```javascript
import {identity} from 'shared-runtime';

const DISPLAY = true;
function Component({cond = false, id}) {
  return (
    <>
      <div className={identity(styles.a, id !== null ? styles.b : {})}></div>

      {cond === false && (
        <div className={identity(styles.c, DISPLAY ? styles.d : {})} />
      )}
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, id: 42}],
  sequentialRenders: [
    {cond: false, id: 4},
    {cond: true, id: 4},
    {cond: true, id: 42},
  ],
};

const styles = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

const DISPLAY = true;
function Component(t0) {
  const $ = _c(9);
  const { cond: t1, id } = t0;
  const cond = t1 === undefined ? false : t1;
  let t2;
  if ($[0] !== id) {
    t2 = identity(styles.a, id !== null ? styles.b : {});
    $[0] = id;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  let t3;
  if ($[2] !== t2) {
    t3 = <div className={t2} />;
    $[2] = t2;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  let t4;
  if ($[4] !== cond) {
    t4 = cond === false && (
      <div className={identity(styles.c, DISPLAY ? styles.d : {})} />
    );
    $[4] = cond;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  let t5;
  if ($[6] !== t3 || $[7] !== t4) {
    t5 = (
      <>
        {t3}
        {t4}
      </>
    );
    $[6] = t3;
    $[7] = t4;
    $[8] = t5;
  } else {
    t5 = $[8];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: false, id: 42 }],
  sequentialRenders: [
    { cond: false, id: 4 },
    { cond: true, id: 4 },
    { cond: true, id: 42 },
  ],
};

const styles = {
  a: "a",
  b: "b",
  c: "c",
  d: "d",
};

```
      
### Eval output
(kind: ok) <div class="a"></div><div class="c"></div>
<div class="a"></div>
<div class="a"></div>
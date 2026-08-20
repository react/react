
## Input

```javascript
// @enableAssumeHooksFollowRulesOfReact
import {Stringify, identity, useHook} from 'shared-runtime';

function Component({index}) {
  const data = useHook();

  const a = identity(data, index);
  const b = identity(data, index);
  const c = identity(data, index);

  return (
    <div>
      <Stringify value={identity(b)} />
      <Stringify value={identity(a)} />
      <Stringify value={identity(c)} />
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{index: 0}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableAssumeHooksFollowRulesOfReact
import { Stringify, identity, useHook } from "shared-runtime";

function Component(t0) {
  const $ = _c(17);
  const { index } = t0;
  const data = useHook();
  let T0;
  let t1;
  let t2;
  let t3;
  if ($[0] !== data || $[1] !== index) {
    const a = identity(data, index);
    const b = identity(data, index);
    const c = identity(data, index);
    const t4 = identity(b);
    if ($[6] !== t4) {
      t2 = <Stringify value={t4} />;
      $[6] = t4;
      $[7] = t2;
    } else {
      t2 = $[7];
    }
    const t5 = identity(a);
    if ($[8] !== t5) {
      t3 = <Stringify value={t5} />;
      $[8] = t5;
      $[9] = t3;
    } else {
      t3 = $[9];
    }
    T0 = Stringify;
    t1 = identity(c);
    $[0] = data;
    $[1] = index;
    $[2] = T0;
    $[3] = t1;
    $[4] = t2;
    $[5] = t3;
  } else {
    T0 = $[2];
    t1 = $[3];
    t2 = $[4];
    t3 = $[5];
  }
  let t4;
  if ($[10] !== T0 || $[11] !== t1) {
    t4 = <T0 value={t1} />;
    $[10] = T0;
    $[11] = t1;
    $[12] = t4;
  } else {
    t4 = $[12];
  }
  let t5;
  if ($[13] !== t2 || $[14] !== t3 || $[15] !== t4) {
    t5 = (
      <div>
        {t2}
        {t3}
        {t4}
      </div>
    );
    $[13] = t2;
    $[14] = t3;
    $[15] = t4;
    $[16] = t5;
  } else {
    t5 = $[16];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ index: 0 }],
};

```
      
### Eval output
(kind: ok) <div><div>{"value":{"a":0,"b":"value1","c":true}}</div><div>{"value":{"a":0,"b":"value1","c":true}}</div><div>{"value":{"a":0,"b":"value1","c":true}}</div></div>

## Input

```javascript
import {Stringify, identity, useIdentity} from 'shared-runtime';

function Foo({}) {
  const x = {};
  const y = {};
  useIdentity(0);
  return (
    <>
      <Stringify value={identity(y)} />
      <Stringify value={identity(x)} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, identity, useIdentity } from "shared-runtime";

function Foo(t0) {
  const $ = _c(9);
  const x = {};
  const y = {};
  useIdentity(0);

  const T0 = Stringify;
  const t1 = identity(y);
  let t2;
  if ($[0] !== T0 || $[1] !== t1) {
    t2 = <T0 value={t1} />;
    $[0] = T0;
    $[1] = t1;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const T1 = Stringify;
  const t3 = identity(x);
  let t4;
  if ($[3] !== T1 || $[4] !== t3) {
    t4 = <T1 value={t3} />;
    $[3] = T1;
    $[4] = t3;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  let t5;
  if ($[6] !== t2 || $[7] !== t4) {
    t5 = (
      <>
        {t2}
        {t4}
      </>
    );
    $[6] = t2;
    $[7] = t4;
    $[8] = t5;
  } else {
    t5 = $[8];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"value":{}}</div><div>{"value":{}}</div>
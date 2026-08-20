
## Input

```javascript
// @enablePropagateDepsInHIR
import {Stringify} from 'shared-runtime';

function Foo({data}) {
  return (
    <Stringify foo={() => data.a.d} bar={data.a?.b.c} shouldInvokeFns={true} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{data: {a: null}}],
  sequentialRenders: [{data: {a: {b: {c: 4}}}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
import { Stringify } from "shared-runtime";

function Foo(t0) {
  const $ = _c(5);
  const { data } = t0;
  let t1;
  if ($[0] !== data.a.d) {
    t1 = () => data.a.d;
    $[0] = data.a.d;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const t2 = data.a?.b.c;
  let t3;
  if ($[2] !== t1 || $[3] !== t2) {
    t3 = <Stringify foo={t1} bar={t2} shouldInvokeFns={true} />;
    $[2] = t1;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ data: { a: null } }],
  sequentialRenders: [{ data: { a: { b: { c: 4 } } } }],
};

```
      
### Eval output
(kind: ok) <div>{"foo":{"kind":"Function"},"bar":4,"shouldInvokeFns":true}</div>
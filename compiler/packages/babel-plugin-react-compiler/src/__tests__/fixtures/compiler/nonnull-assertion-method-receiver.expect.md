
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({receiver}) {
  return (
    <Stringify
      direct={receiver.method!()}
      computed={receiver['method']!!()}
      optional={receiver.method!?.()}
      optionalReceiver={receiver?.method!()}
      tagged={receiver.tag!`value`}
    />
  );
}

const receiver = {
  value: 42,
  method() {
    return this.value;
  },
  tag() {
    return this.value;
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{receiver}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(16);
  const { receiver } = t0;
  let t1;
  if ($[0] !== receiver) {
    t1 = receiver.method();
    $[0] = receiver;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== receiver) {
    t2 = receiver.method();
    $[2] = receiver;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== receiver) {
    t3 = receiver.method?.();
    $[4] = receiver;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  let t4;
  if ($[6] !== receiver) {
    t4 = receiver?.method();
    $[6] = receiver;
    $[7] = t4;
  } else {
    t4 = $[7];
  }
  let t5;
  if ($[8] !== receiver.tag) {
    t5 = receiver.tag`value`;
    $[8] = receiver.tag;
    $[9] = t5;
  } else {
    t5 = $[9];
  }
  let t6;
  if (
    $[10] !== t1 ||
    $[11] !== t2 ||
    $[12] !== t3 ||
    $[13] !== t4 ||
    $[14] !== t5
  ) {
    t6 = (
      <Stringify
        direct={t1}
        computed={t2}
        optional={t3}
        optionalReceiver={t4}
        tagged={t5}
      />
    );
    $[10] = t1;
    $[11] = t2;
    $[12] = t3;
    $[13] = t4;
    $[14] = t5;
    $[15] = t6;
  } else {
    t6 = $[15];
  }
  return t6;
}

const receiver = {
  value: 42,
  method() {
    return this.value;
  },
  tag() {
    return this.value;
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ receiver }],
};

```
      
### Eval output
(kind: ok) <div>{"direct":42,"computed":42,"optional":42,"optionalReceiver":42,"tagged":42}</div>
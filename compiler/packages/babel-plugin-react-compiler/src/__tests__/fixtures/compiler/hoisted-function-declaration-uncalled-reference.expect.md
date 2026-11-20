
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({value}) {
  const unused = () => getValue();
  function getValue() {
    return value;
  }
  return <Stringify getValue={getValue} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 1}],
  sequentialRenders: [{value: 1}, {value: 1}, {value: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { value } = t0;
  let getValue;
  if ($[0] !== value) {
    getValue = function getValue() {
      return value;
    };
    $[0] = value;
    $[1] = getValue;
  } else {
    getValue = $[1];
  }
  let t1;
  if ($[2] !== getValue) {
    t1 = <Stringify getValue={getValue} shouldInvokeFns={true} />;
    $[2] = getValue;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 1 }],
  sequentialRenders: [{ value: 1 }, { value: 1 }, { value: 2 }],
};

```
      
### Eval output
(kind: ok) <div>{"getValue":{"kind":"Function","result":1},"shouldInvokeFns":true}</div>
<div>{"getValue":{"kind":"Function","result":1},"shouldInvokeFns":true}</div>
<div>{"getValue":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>
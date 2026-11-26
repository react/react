
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({prefix}: {prefix: string}) {
  function format(key: string): string;
  function format(key: string | null): string | null;
  function format(key: string | null) {
    return key === null ? null : `${prefix}:${key}`;
  }
  return <Stringify format={format} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prefix: 'a'}],
  sequentialRenders: [{prefix: 'a'}, {prefix: 'a'}, {prefix: 'b'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  const { prefix } = t0;
  let format;
  if ($[0] !== prefix) {
    format = function format(key) {
      return key === null ? null : `${prefix}:${key}`;
    };
    $[0] = prefix;
    $[1] = format;
  } else {
    format = $[1];
  }
  let t1;
  if ($[2] !== format) {
    t1 = <Stringify format={format} />;
    $[2] = format;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ prefix: "a" }],
  sequentialRenders: [{ prefix: "a" }, { prefix: "a" }, { prefix: "b" }],
};

```
      
### Eval output
(kind: ok) <div>{"format":"[[ function params=1 ]]"}</div>
<div>{"format":"[[ function params=1 ]]"}</div>
<div>{"format":"[[ function params=1 ]]"}</div>
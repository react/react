
## Input

```javascript
// @gating
import {memo} from 'react';

export default memo(Foo);
function Foo(a) {
  'use memo';
  return `${arguments.length}:${a}:${arguments[1]}:${arguments[2]}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Foo'),
  params: ['first', 'second', 2],
};

```

## Code

```javascript
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating
import { memo } from "react";

export default memo(Foo);
const isForgetEnabled_Fixtures_result = isForgetEnabled_Fixtures();
function Foo_optimized(a) {
  "use memo";

  return `${arguments.length}:${a}:${arguments[1]}:${arguments[2]}`;
}
function Foo_unoptimized(a) {
  "use memo";
  return `${arguments.length}:${a}:${arguments[1]}:${arguments[2]}`;
}
function Foo(arg0) {
  if (isForgetEnabled_Fixtures_result)
    return Foo_optimized.apply(this, arguments);
  else return Foo_unoptimized.apply(this, arguments);
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval("Foo"),
  params: ["first", "second", 2],
};

```
      
### Eval output
(kind: ok) "3:first:second:2"
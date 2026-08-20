
## Input

```javascript
// @flow @gating
import {Stringify} from 'shared-runtime';
import * as React from 'react';

component Foo(ref: React.RefSetter<Controls>) {
  return <Stringify ref={ref} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('(...args) => React.createElement(Foo, args)'),
  params: [{ref: React.createRef()}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag";
import { Stringify } from "shared-runtime";
import * as React from "react";

const Foo = React.forwardRef(Foo_withRef);
const isForgetEnabled_Fixtures_result = isForgetEnabled_Fixtures();
function Foo_withRef_optimized(_$$empty_props_placeholder$$, ref) {
  const $ = _c(2);
  let t0;
  if ($[0] !== ref) {
    t0 = <Stringify ref={ref} />;
    $[0] = ref;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function Foo_withRef_unoptimized(
  _$$empty_props_placeholder$$: $ReadOnly<{}>,
  ref: React.RefSetter<Controls>,
): React.Node {
  return <Stringify ref={ref} />;
}
function Foo_withRef(arg0, arg1) {
  if (isForgetEnabled_Fixtures_result) return Foo_withRef_optimized(arg0, arg1);
  else return Foo_withRef_unoptimized(arg0, arg1);
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval("(...args) => React.createElement(Foo, args)"),
  params: [{ ref: React.createRef() }],
};

```
      
### Eval output
(kind: ok) <div>{"ref":null}</div>
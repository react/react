
## Input

```javascript
import {CONST_STRING0, Text} from 'shared-runtime';
function useFoo() {
  'use no forget';
  return {tab: CONST_STRING0};
}

function Test() {
  const {tab} = useFoo();
  const currentTab = tab === CONST_STRING0 ? CONST_STRING0 : CONST_STRING0;

  return <Text value={currentTab} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { CONST_STRING0, Text } from "shared-runtime";
function useFoo() {
  "use no forget";
  return { tab: CONST_STRING0 };
}

function Test() {
  const $ = _c(1);
  const { tab } = useFoo();
  tab === CONST_STRING0 ? CONST_STRING0 : CONST_STRING0;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Text value={CONST_STRING0} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div>global string 0</div>

## Input

```javascript
import {CONST_STRING0, CONST_STRING1, Text} from 'shared-runtime';

function useFoo() {
  'use no forget';
  return {tab: CONST_STRING1};
}

function Test() {
  const {tab} = useFoo();
  const currentTab = tab === CONST_STRING0 ? CONST_STRING0 : CONST_STRING1;

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
import { CONST_STRING0, CONST_STRING1, Text } from "shared-runtime";

function useFoo() {
  "use no forget";
  return { tab: CONST_STRING1 };
}

function Test() {
  const $ = _c(2);
  const { tab } = useFoo();
  const currentTab = tab === CONST_STRING0 ? CONST_STRING0 : CONST_STRING1;
  let t0;
  if ($[0] !== currentTab) {
    t0 = <Text value={currentTab} />;
    $[0] = currentTab;
    $[1] = t0;
  } else {
    t0 = $[1];
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
(kind: ok) <div>global string 1</div>
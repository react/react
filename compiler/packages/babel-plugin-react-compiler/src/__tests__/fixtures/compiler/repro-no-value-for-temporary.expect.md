
## Input

```javascript
// @flow @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
function Component(listItem, thread) {
  const isFoo = isFooThread(thread.threadType);
  const body = useBar(listItem, [getBadgeText(listItem, isFoo)]);

  return body;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(listItem, thread) {
  const $ = _c(7);
  let t0;
  let t1;
  let t2;
  if ($[0] !== listItem || $[1] !== thread.threadType) {
    const isFoo = isFooThread(thread.threadType);
    t1 = useBar;
    t2 = listItem;
    t0 = getBadgeText(listItem, isFoo);
    $[0] = listItem;
    $[1] = thread.threadType;
    $[2] = t0;
    $[3] = t1;
    $[4] = t2;
  } else {
    t0 = $[2];
    t1 = $[3];
    t2 = $[4];
  }
  let t3;
  if ($[5] !== t0) {
    t3 = [t0];
    $[5] = t0;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  const body = t1(t2, t3);

  return body;
}

```
      
### Eval output
(kind: exception) Fixture not implemented
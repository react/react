
## Input

```javascript
// Some reactive scopes are created within a conditional. If a child scope
// is within a conditional, its reactive dependencies should be propagated
// as conditionals
//
// In this test:
// ```javascript
// scope @0 (deps=[???] decls=[x]) {
//   const x = {};
//   if (foo) {
//     scope @1 (deps=[props.a.b] decls=[tmp]) {
//       const tmp = bar(props.a.b);
//     }
//     x.a = tmp;
//   }
// }
// return x;
// ```

import {CONST_FALSE, identity} from 'shared-runtime';

function useReactiveDepsInCondScope(props) {
  let x = {};
  if (CONST_FALSE) {
    let tmp = identity(props.a.b);
    x.a = tmp;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useReactiveDepsInCondScope,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Some reactive scopes are created within a conditional. If a child scope
// is within a conditional, its reactive dependencies should be propagated
// as conditionals
//
// In this test:
// ```javascript
// scope @0 (deps=[???] decls=[x]) {
//   const x = {};
//   if (foo) {
//     scope @1 (deps=[props.a.b] decls=[tmp]) {
//       const tmp = bar(props.a.b);
//     }
//     x.a = tmp;
//   }
// }
// return x;
// ```

import { CONST_FALSE, identity } from "shared-runtime";

function useReactiveDepsInCondScope(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props) {
    x = {};
    if (CONST_FALSE) {
      let t0;
      if ($[2] !== props.a.b) {
        t0 = identity(props.a.b);
        $[2] = props.a.b;
        $[3] = t0;
      } else {
        t0 = $[3];
      }
      const tmp = t0;
      x.a = tmp;
    }
    $[0] = props;
    $[1] = x;
  } else {
    x = $[1];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useReactiveDepsInCondScope,
  params: [{}],
};

```
      
### Eval output
(kind: ok) {}
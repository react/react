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

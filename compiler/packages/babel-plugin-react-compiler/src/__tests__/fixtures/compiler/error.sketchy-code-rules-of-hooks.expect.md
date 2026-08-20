
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
/* eslint-disable react-hooks/rules-of-hooks */
function lowercasecomponent() {
  const x = [];
  return <div>{x}</div>;
}
/* eslint-enable react-hooks/rules-of-hooks */

export const FIXTURE_ENTRYPOINT = {
  fn: lowercasecomponent,
  params: [],
  isComponent: false,
};

```


## Error

```
Found 1 error:

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `eslint-disable react-hooks/rules-of-hooks`.

error.sketchy-code-rules-of-hooks.ts:2:0
  1 | // @validateExhaustiveMemoizationDependencies:false
> 2 | /* eslint-disable react-hooks/rules-of-hooks */
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  3 | function lowercasecomponent() {
  4 |   const x = [];
  5 |   return <div>{x}</div>;
```
          
      
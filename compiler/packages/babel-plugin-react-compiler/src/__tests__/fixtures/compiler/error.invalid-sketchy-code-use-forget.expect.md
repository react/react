
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
/* eslint-disable react-hooks/rules-of-hooks */
function lowercasecomponent() {
  'use forget';
  const x = [];
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return <div>{x}</div>;
}
/* eslint-enable react-hooks/rules-of-hooks */

```


## Error

```
Found 2 errors:

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `eslint-disable react-hooks/rules-of-hooks`.

error.invalid-sketchy-code-use-forget.ts:2:0
  1 | // @validateExhaustiveMemoizationDependencies:false
> 2 | /* eslint-disable react-hooks/rules-of-hooks */
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  3 | function lowercasecomponent() {
  4 |   'use forget';
  5 |   const x = [];

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `eslint-disable-next-line react-hooks/rules-of-hooks`.

error.invalid-sketchy-code-use-forget.ts:6:2
  4 |   'use forget';
  5 |   const x = [];
> 6 |   // eslint-disable-next-line react-hooks/rules-of-hooks
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  7 |   return <div>{x}</div>;
  8 | }
  9 | /* eslint-enable react-hooks/rules-of-hooks */
```
          
      

## Input

```javascript
// @eslintSuppressionRules:["my-app","react-rule"] @validateExhaustiveMemoizationDependencies:false

/* eslint-disable my-app/react-rule */
function lowercasecomponent() {
  'use forget';
  const x = [];
  // eslint-disable-next-line my-app/react-rule
  return <div>{x}</div>;
}
/* eslint-enable my-app/react-rule */

```


## Error

```
Found 2 errors:

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `eslint-disable my-app/react-rule`.

error.bailout-on-suppression-of-custom-rule.ts:3:0
  1 | // @eslintSuppressionRules:["my-app","react-rule"] @validateExhaustiveMemoizationDependencies:false
  2 |
> 3 | /* eslint-disable my-app/react-rule */
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  4 | function lowercasecomponent() {
  5 |   'use forget';
  6 |   const x = [];

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `eslint-disable-next-line my-app/react-rule`.

error.bailout-on-suppression-of-custom-rule.ts:7:2
   5 |   'use forget';
   6 |   const x = [];
>  7 |   // eslint-disable-next-line my-app/react-rule
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
   8 |   return <div>{x}</div>;
   9 | }
  10 | /* eslint-enable my-app/react-rule */
```
          
      
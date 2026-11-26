
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false

function Component(props) {
  /**
   * eslint-disable react-hooks/rules-of-hooks
   */
  const x = [props.a];
  return <div>{x}</div>;
}

```


## Error

```
Found 1 error:

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `*
   * eslint-disable react-hooks/rules-of-hooks`.

error.bailout-on-eslint-disable-in-jsdoc-comment.ts:4:2
  2 |
  3 | function Component(props) {
> 4 |   /**
    |   ^^^
> 5 |    * eslint-disable react-hooks/rules-of-hooks
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 6 |    */
    | ^^^^^^ Found React rule suppression
  7 |   const x = [props.a];
  8 |   return <div>{x}</div>;
  9 | }
```
          
      
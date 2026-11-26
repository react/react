
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false

function Component(props) {
  // prettier-ignore eslint-disable-next-line react-hooks/rules-of-hooks
  const x = [props.a];
  return <div>{x}</div>;
}

```


## Error

```
Found 1 error:

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `prettier-ignore eslint-disable-next-line react-hooks/rules-of-hooks`.

error.bailout-on-eslint-suppression-not-at-comment-start.ts:4:2
  2 |
  3 | function Component(props) {
> 4 |   // prettier-ignore eslint-disable-next-line react-hooks/rules-of-hooks
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  5 |   const x = [props.a];
  6 |   return <div>{x}</div>;
  7 | }
```
          
      
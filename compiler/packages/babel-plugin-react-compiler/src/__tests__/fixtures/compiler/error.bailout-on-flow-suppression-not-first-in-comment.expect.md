
## Input

```javascript
function Component(props) {
  // $FlowFixMe[incompatible-type] $FlowFixMe[react-rule-hook]
  const x = [props.a];
  return <div>{x}</div>;
}

```


## Error

```
Found 1 error:

Error: React Compiler has skipped optimizing this component because one or more React rule violations were reported by Flow

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `$FlowFixMe[incompatible-type] $FlowFixMe[react-rule-hook]`.

error.bailout-on-flow-suppression-not-first-in-comment.ts:2:2
  1 | function Component(props) {
> 2 |   // $FlowFixMe[incompatible-type] $FlowFixMe[react-rule-hook]
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  3 |   const x = [props.a];
  4 |   return <div>{x}</div>;
  5 | }
```
          
      
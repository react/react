
## Input

```javascript
// @enableFlowSuppressions

function Foo(props) {
  // $FlowFixMe[react-rule-hook]
  useX();
  return null;
}

```


## Error

```
Found 1 error:

Error: React Compiler has skipped optimizing this component because one or more React rule violations were reported by Flow

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `$FlowFixMe[react-rule-hook]`.

error.bailout-on-flow-suppression.ts:4:2
  2 |
  3 | function Foo(props) {
> 4 |   // $FlowFixMe[react-rule-hook]
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  5 |   useX();
  6 |   return null;
  7 | }
```
          
      

## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const [state, setState] = useState(null);
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  if (props.cond) useEffect(() => setState(props.value));
  return <div>{state}</div>;
}

```


## Error

```
Found 1 error:

Error: React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled

React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression `oxlint-disable-next-line react-hooks/rules-of-hooks`.

error.invalid-oxlint-suppression.ts:4:2
  2 | function Component(props) {
  3 |   const [state, setState] = useState(null);
> 4 |   // oxlint-disable-next-line react-hooks/rules-of-hooks
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Found React rule suppression
  5 |   if (props.cond) useEffect(() => setState(props.value));
  6 |   return <div>{state}</div>;
  7 | }
```
          
      
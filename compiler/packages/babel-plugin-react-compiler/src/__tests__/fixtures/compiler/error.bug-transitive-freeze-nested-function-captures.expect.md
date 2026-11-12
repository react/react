
## Input

```javascript
// @enableTransitivelyFreezeFunctionExpressions
function Component(props) {
  let x = {value: 0};
  const inner = () => {
    return x.value;
  };
  const outer = () => {
    return inner();
  };
  // Freezing outer should transitively freeze inner AND x (two levels deep).
  // x is only reachable through the function chain, not directly in JSX.
  const element = <Child fn={outer} />;
  // Mutating x after the freeze — TS should detect MutateFrozen,
  // Rust may not if transitive freeze didn't reach x.
  x.value = 1;
  return element;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value used previously in JSX is not allowed. Consider moving the modification before the JSX.

error.bug-transitive-freeze-nested-function-captures.ts:15:2
  13 |   // Mutating x after the freeze — TS should detect MutateFrozen,
  14 |   // Rust may not if transitive freeze didn't reach x.
> 15 |   x.value = 1;
     |   ^ value cannot be modified
  16 |   return element;
  17 | }
  18 |
```
          
      
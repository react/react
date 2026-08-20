
## Input

```javascript
let renderCount = 0;

function NoHooks() {
  renderCount++;
  return <div />;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerExpression) Support UpdateExpression where argument is a global

error.mutate-global-increment-op-invalid-react.ts:4:2
  2 |
  3 | function NoHooks() {
> 4 |   renderCount++;
    |   ^^^^^^^^^^^^^ (BuildHIR::lowerExpression) Support UpdateExpression where argument is a global
  5 |   return <div />;
  6 | }
  7 |
```
          
      
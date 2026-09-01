
## Input

```javascript
function useFoo() {
  let counter = 2;
  const fn = () => {
    return counter++;
  };

  return fn();
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerExpression) Handle UpdateExpression to variables captured within lambdas.

error.todo-handle-update-context-identifiers.ts:4:11
  2 |   let counter = 2;
  3 |   const fn = () => {
> 4 |     return counter++;
    |            ^^^^^^^^^ (BuildHIR::lowerExpression) Handle UpdateExpression to variables captured within lambdas.
  5 |   };
  6 |
  7 |   return fn();
```
          
      
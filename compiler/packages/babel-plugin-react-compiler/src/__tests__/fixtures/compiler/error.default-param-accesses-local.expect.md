
## Input

```javascript
function Component(
  x,
  y = () => {
    return x;
  }
) {
  return y();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```


## Error

```
Found 1 error:

Todo: (BuildHIR::node.lowerReorderableExpression) Expression type `ArrowFunctionExpression` cannot be safely reordered

error.default-param-accesses-local.ts:3:6
  1 | function Component(
  2 |   x,
> 3 |   y = () => {
    |       ^^^^^^^
> 4 |     return x;
    | ^^^^^^^^^^^^^
> 5 |   }
    | ^^^^ (BuildHIR::node.lowerReorderableExpression) Expression type `ArrowFunctionExpression` cannot be safely reordered
  6 | ) {
  7 |   return y();
  8 | }
```
          
      
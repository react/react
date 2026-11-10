
## Input

```javascript
const route = {path: '/home'};

function Component(replacement) {
  return (route &&= replacement());
}

```


## Error

```
Found 1 error:

Todo: Logical assignment to a `const` variable is not supported

error.todo-immutable-module-target.ts:4:10
  2 |
  3 | function Component(replacement) {
> 4 |   return (route &&= replacement());
    |           ^^^^^ Logical assignment to a `const` variable is not supported
  5 | }
  6 |
```
          
      
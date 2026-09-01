
## Input

```javascript
async function Component({items}) {
  const x = [];
  for await (const item of items) {
    x.push(item);
  }
  return x;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle for-await loops

error.todo-for-await-loops.ts:3:2
  1 | async function Component({items}) {
  2 |   const x = [];
> 3 |   for await (const item of items) {
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 4 |     x.push(item);
    | ^^^^^^^^^^^^^^^^^
> 5 |   }
    | ^^^^ (BuildHIR::lowerStatement) Handle for-await loops
  6 |   return x;
  7 | }
  8 |
```
          
      
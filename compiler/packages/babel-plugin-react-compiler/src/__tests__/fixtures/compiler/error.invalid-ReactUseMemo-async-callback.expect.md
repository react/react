
## Input

```javascript
function component(a, b) {
  let x = React.useMemo(async () => {
    await a;
  }, []);
  return x;
}

```


## Error

```
Found 2 errors:

Error: useMemo() callbacks may not be async or generator functions

useMemo() callbacks are called once and must synchronously return a value.

error.invalid-ReactUseMemo-async-callback.ts:2:24
  1 | function component(a, b) {
> 2 |   let x = React.useMemo(async () => {
    |                         ^^^^^^^^^^^^^
> 3 |     await a;
    | ^^^^^^^^^^^^
> 4 |   }, []);
    | ^^^^ Async and generator functions are not supported
  5 |   return x;
  6 | }
  7 |

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

error.invalid-ReactUseMemo-async-callback.ts:3:10
  1 | function component(a, b) {
  2 |   let x = React.useMemo(async () => {
> 3 |     await a;
    |           ^ Missing dependency `a`
  4 |   }, []);
  5 |   return x;
  6 | }

Inferred dependencies: `[a]`
```
          
      
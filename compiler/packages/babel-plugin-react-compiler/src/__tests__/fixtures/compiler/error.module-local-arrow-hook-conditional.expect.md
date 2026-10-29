
## Input

```javascript
const useFoo = () => 1;

function Component(props) {
  if (props.cond) {
    useFoo();
  }
  return null;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.module-local-arrow-hook-conditional.ts:5:4
  3 | function Component(props) {
  4 |   if (props.cond) {
> 5 |     useFoo();
    |     ^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  6 |   }
  7 |   return null;
  8 | }
```
          
      
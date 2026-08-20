
## Input

```javascript
function Component(props) {
  let x = null;
  if (props.cond) {
  } else {
    x = useHook();
  }
  return x;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-hook-if-alternate.ts:5:8
  3 |   if (props.cond) {
  4 |   } else {
> 5 |     x = useHook();
    |         ^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  6 |   }
  7 |   return x;
  8 | }
```
          
      
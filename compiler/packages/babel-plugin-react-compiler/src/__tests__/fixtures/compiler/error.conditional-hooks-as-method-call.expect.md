
## Input

```javascript
function Component(props) {
  let x = null;
  if (props.cond) {
    x = Foo.useFoo();
  }
  return x;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.conditional-hooks-as-method-call.ts:4:8
  2 |   let x = null;
  3 |   if (props.cond) {
> 4 |     x = Foo.useFoo();
    |         ^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  5 |   }
  6 |   return x;
  7 | }
```
          
      
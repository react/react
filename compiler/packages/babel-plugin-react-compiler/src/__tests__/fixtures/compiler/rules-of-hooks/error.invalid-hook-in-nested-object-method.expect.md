
## Input

```javascript
// @compilationMode:"infer"
function Component() {
  'use memo';
  const x = {
    outer() {
      const y = {
        inner() {
          return useFoo();
        },
      };
      return y;
    },
  };
  return x;
}

```


## Error

```
Found 1 error:

Error: Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

Cannot call hook within a function expression.

error.invalid-hook-in-nested-object-method.ts:8:17
   6 |       const y = {
   7 |         inner() {
>  8 |           return useFoo();
     |                  ^^^^^^ Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   9 |         },
  10 |       };
  11 |       return y;
```
          
      